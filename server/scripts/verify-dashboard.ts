// Verifies every dashboard metric against an independent raw SQL query (spec section 10 DoD, AC-14).
// Usage (from server/): npx tsx scripts/verify-dashboard.ts [staffEmail] [requesterEmail]
// Defaults use seeded users. Exits 1 if any metric differs.
import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { requesterDashboard, staffDashboard } from "../src/services/dashboard";

const prisma = new PrismaClient();
const OPEN_SET = `('NEW','OPEN','IN_PROGRESS','WAITING_FOR_REQUESTER','REOPENED')`;
const RECENT = `NOW() - INTERVAL '7 days'`;

async function sql(query: string, ...params: unknown[]) {
  const rows = await prisma.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM ${query}`, ...params);
  return rows[0].n;
}

async function userId(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`User not found: ${email}`);
  return user;
}

async function main() {
  const staffEmail = process.argv[2] ?? "priya.nair@example.com";
  const requesterEmail = process.argv[3] ?? "jennifer.anderson@example.com";
  const staff = await userId(staffEmail);
  const requester = await userId(requesterEmail);

  const rows: Array<[string, number, number]> = [];
  const check = (name: string, api: number, raw: number) => rows.push([name, api, raw]);

  const s: any = await staffDashboard(prisma, staff.id, Role.ADMINISTRATOR);
  check("staff.unassignedOpen", s.counts.unassignedOpen, await sql(`"Ticket" WHERE "currentStatus"::text IN ${OPEN_SET} AND "ticketOwnerId" IS NULL`));
  check("staff.ownedByMeOpen", s.counts.ownedByMeOpen, await sql(`"Ticket" WHERE "currentStatus"::text IN ${OPEN_SET} AND "ticketOwnerId" = $1`, staff.id));
  check("staff.urgentOpen", s.counts.urgentOpen, await sql(`"Ticket" WHERE "currentStatus"::text IN ${OPEN_SET} AND "itPriority" = 'HIGH'`));
  check(
    "staff.openFollowUps",
    s.counts.openFollowUps,
    await sql(`"ActionTaken" a JOIN "Ticket" t ON t."id" = a."ticketId" WHERE a."status" = 'COMPLETED' AND a."followUpRequired" AND t."currentStatus"::text IN ${OPEN_SET}`)
  );
  check(
    "staff.myPlannedActions",
    s.counts.myPlannedActions,
    await sql(
      `"ActionTaken" a JOIN "Ticket" t ON t."id" = a."ticketId" WHERE a."status" = 'PLANNED' AND a."assigneeId" = $1 AND t."currentStatus"::text NOT IN ('CLOSED','CANCELLED')`,
      staff.id
    )
  );
  for (const [status, n] of Object.entries<number>(s.counts.byStatus)) {
    check(`staff.byStatus.${status}`, n, await sql(`"Ticket" WHERE "currentStatus"::text = $1`, status));
  }
  for (const [p, n] of Object.entries<number>(s.counts.byItPriority)) {
    check(`staff.byItPriority.${p}`, n, await sql(`"Ticket" WHERE "currentStatus"::text IN ${OPEN_SET} AND COALESCE("itPriority", "requestedPriority")::text = $1`, p));
  }
  check("admin.userCounts.active", s.userCounts.active, await sql(`"User" WHERE "isActive"`));
  check("admin.userCounts.inactive", s.userCounts.inactive, await sql(`"User" WHERE NOT "isActive"`));
  for (const [role, n] of Object.entries<number>(s.userCounts.byRole)) {
    check(`admin.userCounts.byRole.${role}`, n, await sql(`"User" WHERE "role"::text = $1`, role));
  }

  const r = await requesterDashboard(prisma, requester.id);
  check("requester.openTickets", r.counts.openTickets, await sql(`"Ticket" WHERE "requesterId" = $1 AND "currentStatus"::text IN ${OPEN_SET}`, requester.id));
  check("requester.waitingForRequester", r.counts.waitingForRequester, await sql(`"Ticket" WHERE "requesterId" = $1 AND "currentStatus" = 'WAITING_FOR_REQUESTER'`, requester.id));
  check(
    "requester.recentlyResolved",
    r.counts.recentlyResolved,
    await sql(`"Ticket" WHERE "requesterId" = $1 AND "currentStatus"::text IN ('RESOLVED','CLOSED') AND "updatedAt" >= ${RECENT}`, requester.id)
  );

  console.log(`Dashboard verification - staff: ${staffEmail}, requester: ${requesterEmail}, at ${new Date().toISOString()}`);
  console.log(`${"metric".padEnd(36)} ${"api".padStart(6)} ${"sql".padStart(6)}  result`);
  let failures = 0;
  for (const [name, api, raw] of rows) {
    const ok = api === raw;
    if (!ok) failures++;
    console.log(`${name.padEnd(36)} ${String(api).padStart(6)} ${String(raw).padStart(6)}  ${ok ? "OK" : "MISMATCH"}`);
  }
  console.log(`\n${rows.length - failures}/${rows.length} metrics match raw SQL.`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main()
  .catch((err) => {
    console.error("verify-dashboard failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
