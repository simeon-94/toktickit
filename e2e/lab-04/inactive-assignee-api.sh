#!/usr/bin/env bash
# #68 evidence: produces artifacts/lab-04/logs/inactive-assignee-api.log. Needs the API on :4000 and the E2E fixtures.
# Real API calls: an IT Staff user tries to create an action assigned to an inactive IT Staff user.
API=http://localhost:4000
JAR_S=$(mktemp); JAR_A=$(mktemp)
pw='TestPass123!'   # E2E fixture password (server/tests/helpers/testAuth.ts), not a real credential
curl -s -c "$JAR_A" -H 'Content-Type: application/json' -d "{\"email\":\"e2e.admin@example.com\",\"password\":\"$pw\"}" $API/api/auth/login -o /dev/null
curl -s -c "$JAR_S" -H 'Content-Type: application/json' -d "{\"email\":\"e2e.staff@example.com\",\"password\":\"$pw\"}" $API/api/auth/login -o /dev/null
echo '## 1. Precondition (as e2e.admin): the assignee is an inactive IT Staff user'
echo '$ curl -b <admin session> GET /api/admin/users  | filter name = "Mark Diaz"'
MARK=$(curl -s -b "$JAR_A" $API/api/admin/users | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const u=JSON.parse(s).find(x=>x.name==="Mark Diaz");console.log(JSON.stringify({id:u.id,name:u.name,role:u.role,isActive:u.isActive}))})')
echo "$MARK"
MARK_ID=$(echo "$MARK" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).id))')
TICKET_ID=$(curl -s -b "$JAR_S" "$API/api/staff/tickets?search=E2E-L4-ACTIONS" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).items[0].id))')
BEFORE=$(curl -s -b "$JAR_S" $API/api/tickets/$TICKET_ID/actions | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).items.length))')
echo
echo "## 2. Request (as e2e.staff, IT_STAFF) on Ticket E2E-L4-ACTIONS (id $TICKET_ID); actions before: $BEFORE"
BODY="{\"clientRequestId\":\"$(node -e 'console.log(crypto.randomUUID())')\",\"actionAt\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"description\":\"Hand the follow-up to a colleague\",\"assigneeId\":$MARK_ID,\"followUpRequired\":false}"
echo "\$ curl -i -b <staff session> -H 'Content-Type: application/json' -X POST $API/api/tickets/$TICKET_ID/actions -d '$BODY'"
echo
echo '## 3. Response'
curl -s -i -b "$JAR_S" -H 'Content-Type: application/json' -X POST $API/api/tickets/$TICKET_ID/actions -d "$BODY" | grep -iv '^\(set-cookie\|etag\|date\|access-control\|vary\|keep-alive\|connection\|x-powered-by\)' 
echo
AFTER=$(curl -s -b "$JAR_S" $API/api/tickets/$TICKET_ID/actions | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s).items.length))')
echo "## 4. Nothing stored: actions after = $AFTER (before = $BEFORE)"
rm -f "$JAR_S" "$JAR_A"
[ "$BEFORE" = "$AFTER" ]
