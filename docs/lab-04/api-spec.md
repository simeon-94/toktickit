# Lab 4 API Specification

All endpoints require the session cookie (401 if missing/invalid, or if the account was deactivated after login). Base path `/api`. JSON in/out. Timestamps are ISO-8601 UTC.
While `mustChangePassword` is true, every endpoint except `GET /api/auth/me` and `POST /api/auth/change-password` returns 403 `PASSWORD_CHANGE_REQUIRED` (#55).
`GET /api/auth/me?optional=1` returns 200 `null` when logged out (plain `/api/auth/me` keeps its 401), so the client's start-up check logs no console error.

## Conventions
- Error body: `{ "error": "<safe message>", "code": "<MACHINE_CODE>", "fields"?: { "<field>": "<message>" } }`
  (the existing `{ error }` shape is kept; `code` and `fields` are additions).
- Status codes: 200 OK, 201 Created, 400 validation, 401 unauthenticated, 403 forbidden role,
  404 not found / not owned (no existence leak for other Requesters), 409 stale update,
  422 business-rule violation. 500 returns `{ error: "Something went wrong.", code: "INTERNAL" }` with no stack trace.
- Codes: `VALIDATION`, `FORBIDDEN`, `NOT_FOUND`, `STALE_UPDATE`, `INVALID_TRANSITION`,
  `RESOLUTION_GATE`, `ACTION_LOCKED`, `TICKET_TERMINAL`.
- Ticket list filters (#69, CL-07): `GET /api/tickets?status=&priority=` and `GET /api/staff/tickets?status=&requestedPriority=&itPriority=`
  accept only enum values (`NEW`... / `LOW|MEDIUM|HIGH`); anything else is 400 `VALIDATION` with `fields.<param>: "invalid"`.
  A rejected async handler is answered with the 500 `INTERNAL` body above and never stops the API process.
- Ticket `version` is returned by `GET /api/tickets/:id` and `GET /api/staff/tickets` items.

## Action object
```json
{
  "id": 12, "ticketId": 5,
  "actionAt": "2026-10-20T08:30:00.000Z",
  "description": "Replaced faulty switch port",
  "result": null,
  "status": "PLANNED",
  "performedById": 2, "performedByName": "Jen Staff",
  "assigneeId": 3, "assigneeName": "Sam Staff",
  "followUpRequired": true, "followUpNote": "Check cable next week",
  "attachmentNotes": "Look for photo of the patch panel",
  "version": 1,
  "createdAt": "...", "updatedAt": "..."
}
```

## 1. List Actions Taken
`GET /api/tickets/:id/actions`
- Roles: REQUESTER (own Ticket only), IT_STAFF, ADMINISTRATOR.
- 200 `{ items: Action[] }` ordered by `actionAt desc, id desc`. Empty array if none.
- 404 if Ticket missing or (Requester) not owned.

## 2. Create Action Taken
`POST /api/tickets/:id/actions` - IT_STAFF, ADMINISTRATOR only (Requester 403).
Body: `{ description, actionAt?, assigneeId?, followUpRequired?, followUpNote?, attachmentNotes?, clientRequestId? }`
- `performedBy` always = authenticated user; `assigneeId` default = authenticated user; status starts PLANNED; `result` is not accepted at creation.
- 201 Action. If `clientRequestId` already exists for this Ticket -> 200 with the existing Action.
  `clientRequestId` is unique across all Tickets: reusing it on a different Ticket -> 400 `VALIDATION`
  with `fields.clientRequestId`.
- 400 `VALIDATION` (fields: description, actionAt, assigneeId, followUpNote, attachmentNotes);
  400 for inactive/non-staff assignee (`fields.assigneeId`).
- 404 Ticket missing; 422 `TICKET_TERMINAL` if Ticket is CLOSED or CANCELLED. `TICKET_TERMINAL` blocks
  create only; edit/complete/cancel of an existing PLANNED action are not blocked by Ticket status.
- Side effect: parent Ticket `updatedAt` touched.

## 3. Update Action Taken
`PATCH /api/tickets/:id/actions/:actionId` - IT_STAFF, ADMINISTRATOR.
Body: `{ expectedVersion (required), description?, actionAt?, assigneeId?, followUpRequired?, followUpNote?, attachmentNotes? }`
- 200 updated Action (`version` +1). 400 validation; 400 `expectedVersion` missing;
  404 not found (action not under that Ticket also 404); 409 `STALE_UPDATE`; 422 `ACTION_LOCKED` if status != PLANNED.

## 4. Complete Action Taken
`POST /api/tickets/:id/actions/:actionId/complete` - IT_STAFF, ADMINISTRATOR.
Body: `{ expectedVersion, result }` - `result` required, 1-1000 chars.
- 200 Action with `status: "COMPLETED"`. 400 missing result; 404; 409; 422 `ACTION_LOCKED`.

## 5. Cancel Action Taken
`POST /api/tickets/:id/actions/:actionId/cancel` - IT_STAFF, ADMINISTRATOR.
Body: `{ expectedVersion }` -> 200 Action with `status: "CANCELLED"`. 404; 409; 422 `ACTION_LOCKED`.
(There is no DELETE endpoint; DELETE returns 404/405.)

## 6. Change Ticket Status (changed from Lab 3)
`PATCH /api/tickets/:id/status` - IT_STAFF, ADMINISTRATOR (Requester 403).
Body: `{ currentStatus, expectedVersion (required) }`
- 200 `{ id, currentStatus, version, requesterIndicatedResolved }`.
- 400 invalid status value or missing `expectedVersion`; 404;
  409 `STALE_UPDATE` (`expectedVersion` != stored version);
  422 `INVALID_TRANSITION` (not in matrix, same status, from CANCELLED), body adds `allowed: string[]`;
  422 `RESOLUTION_GATE` body adds `reasons: ["NO_OWNER" | "NO_COMPLETED_ACTION" | "PLANNED_ACTIONS_PENDING"]`.
- Check order: auth/role -> 404 -> 400 -> 409 -> 422 transition -> 422 gate.
- Moving to REOPENED sets `requesterIndicatedResolved=false`. Successful change bumps `version`.

## 7. Owner and Priority (changed from Lab 3)
`PATCH /api/tickets/:id/owner`, `PATCH /api/tickets/:id/priority` - behaviour unchanged, plus:
optional `expectedVersion` (409 if supplied and stale), response gains `version`, `version` always bumps.

## 8. Requester Dashboard
`GET /api/dashboard/requester` - REQUESTER only (others 403). Scope: `requesterId = auth.userId`.
```json
{
  "generatedAt": "...",
  "counts": { "openTickets": 4, "waitingForRequester": 1, "recentlyResolved": 2 },
  "needsAttention": [ { "id": 3, "ticketNumber": "TT-...", "summary": "...", "currentStatus": "WAITING_FOR_REQUESTER", "updatedAt": "..." } ],
  "recentlyUpdated": [ { "...same fields..." } ],
  "recentlyResolved": [ { "...same fields..." } ]
}
```
| Metric | Definition | Empty | Drill-down |
| --- | --- | --- | --- |
| openTickets | own Tickets with status in open set (L4-BR-18) | 0 | `/tickets?statusGroup=open` |
| waitingForRequester | own Tickets status WAITING_FOR_REQUESTER | 0 | `/tickets?status=WAITING_FOR_REQUESTER` |
| recentlyResolved | own Tickets status RESOLVED or CLOSED with `updatedAt` >= now-7d | 0 | `/tickets?statusGroup=resolvedRecent` |
| needsAttention list | up to 5 WAITING_FOR_REQUESTER, oldest `updatedAt` first | [] | Ticket Detail |
| recentlyUpdated list | up to 5 own Tickets, `updatedAt desc`, any status | [] | Ticket Detail |
| recentlyResolved list | up to 5 RESOLVED/CLOSED within 7d, `updatedAt desc` | [] | Ticket Detail |

> `statusGroup=resolvedRecent` (RESOLVED or CLOSED, `updatedAt` >= now-7d) keeps L4-BR-21 true;
> the single-valued `status` filter is unchanged. Client route paths in drill-downs follow the existing router.

## 9. IT Staff Dashboard
`GET /api/staff/dashboard` - IT_STAFF, ADMINISTRATOR (Requester 403).
```json
{
  "generatedAt": "...",
  "counts": {
    "unassignedOpen": 3, "ownedByMeOpen": 2, "urgentOpen": 1, "openFollowUps": 2,
    "myPlannedActions": 2,
    "byStatus": { "NEW": 1, "OPEN": 2, "IN_PROGRESS": 1, "WAITING_FOR_REQUESTER": 0, "RESOLVED": 0, "CLOSED": 0, "REOPENED": 0, "CANCELLED": 0 },
    "byItPriority": { "HIGH": 1, "MEDIUM": 3, "LOW": 1 }
  },
  "urgent": [ { "id": 1, "ticketNumber": "...", "summary": "...", "currentStatus": "OPEN", "itPriority": "HIGH", "ticketOwnerName": null, "updatedAt": "..." } ],
  "recentlyUpdated": [ { "...same fields..." } ],
  "myActions": [ { "id": 7, "ticketId": 4, "ticketNumber": "...", "description": "...", "actionAt": "...", "status": "PLANNED" } ],
  "followUps": [ { "...myActions fields, status COMPLETED...", "followUpNote": "...", "assigneeName": "..." } ],
  "userCounts": { "active": 6, "inactive": 1, "byRole": { "REQUESTER": 3, "IT_STAFF": 2, "ADMINISTRATOR": 1 } }
}
```
`userCounts` is present only for ADMINISTRATOR; `byRole` counts all users (active and inactive).

| Metric | Definition | Empty | Drill-down |
| --- | --- | --- | --- |
| unassignedOpen | open-set Tickets with `ticketOwnerId` null | 0 | `/staff/queue?unassigned=true&statusGroup=open` |
| ownedByMeOpen | open-set Tickets owned by current user | 0 | `/staff/queue?ownerId=me&statusGroup=open` |
| urgentOpen | open-set Tickets with `itPriority = HIGH` | 0 | `/staff/queue?itPriority=HIGH&statusGroup=open` |
| openFollowUps | COMPLETED actions with `followUpRequired` on open-set Tickets | 0 | `GET /api/staff/actions?view=openFollowUps` (CL-02) |
| myPlannedActions | PLANNED actions where assignee = current user, on non-terminal (not CLOSED/CANCELLED) Tickets | 0 | `GET /api/staff/actions?view=myPlanned` (CL-02) |
| byStatus.X | all Tickets in status X (all 8 keys always present) | 0 | `/staff/queue?status=X` |
| byItPriority.P | open-set Tickets with effective priority P = `COALESCE(itPriority, requestedPriority)` | 0 | `/staff/queue?effectivePriority=P&statusGroup=open` (CL-01) |
| urgent list | up to 5 open-set HIGH Tickets, oldest `updatedAt` first | [] | Ticket Detail |
| recentlyUpdated list | up to 5 Tickets by `updatedAt desc` within 7d | [] | Ticket Detail |
| myActions list | up to 5 PLANNED actions assigned to me, `actionAt asc` | [] | Ticket Detail |
| followUps list | up to 5 open follow-ups (same filter as openFollowUps), `actionAt desc` | [] | Ticket Detail |

## 10. Queue/List filters added for drill-down
- `GET /api/staff/tickets`: `ownerId=me` (current user), `statusGroup=open` (L4-BR-18 set),
  `effectivePriority=LOW|MEDIUM|HIGH` (matches `COALESCE(itPriority, requestedPriority)`, CL-01);
  existing `status`, `unassigned`, `itPriority` (exact match, unchanged), etc.; combinable. Response includes `version` per item.
- `GET /api/tickets` (My Tickets): `statusGroup=open` and `statusGroup=resolvedRecent`.
- Invalid `statusGroup`, `ownerId` or `effectivePriority` -> 400 `VALIDATION`.
- `GET /api/staff/actions?view=myPlanned|openFollowUps&page&pageSize` (CL-02) - IT_STAFF, ADMINISTRATOR (Requester 403).
  Same filters as the dashboard action metrics; 200 `{ items, total, page, pageSize }`; items =
  `{ id, ticketId, ticketNumber, description, actionAt, status, followUpNote, assigneeName }`. Invalid `view` -> 400.

## 11. Unchanged from Labs 2-3
Auth (`/api/auth/*`), categories, related systems, Ticket create/list/detail, attachments,
comments, notes, indicate-resolved, admin users. `GET /api/health` still returns 200.
