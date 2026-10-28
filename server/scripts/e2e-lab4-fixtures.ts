// Idempotent Lab 4 E2E / screenshot fixtures. Run before each E2E scenario:
//   npx tsx scripts/e2e-lab4-fixtures.ts
// Creates dedicated e2e.* users (test password from tests/helpers/testAuth.ts) and E2E-L4-* Tickets,
// and resets the Actions Taken of those fixture Tickets only. Never touches other data.
import "dotenv/config";
import bcrypt from "bcryptjs";
import { ActionStatus, PrismaClient, Priority, Role, TicketStatus } from "@prisma/client";

const prisma = new PrismaClient();
export const E2E_PASSWORD = "TestPass123!";

const USERS = [
  { email: "e2e.staff@example.com", name: "Erin Staff", role: Role.IT_STAFF },
  { email: "e2e.staff2@example.com", name: "Sam Second", role: Role.IT_STAFF },
  { email: "e2e.admin@example.com", name: "Ada Admin", role: Role.ADMINISTRATOR },
  { email: "e2e.requester@example.com", name: "Riley Requester", role: Role.REQUESTER },
  { email: "e2e.requester.empty@example.com", name: "Zoe NoTickets", role: Role.REQUESTER },
];

async function main() {
  const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10);
  const ids: Record<string, number> = {};
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, passwordHash, isActive: true, mustChangePassword: false },
      create: { ...u, passwordHash, isActive: true, mustChangePassword: false },
    });
    ids[u.email] = user.id;
  }
  const staff = ids["e2e.staff@example.com"];
  const staff2 = ids["e2e.staff2@example.com"];
  const requester = ids["e2e.requester@example.com"];

  const category = await prisma.category.findFirstOrThrow({ where: { name: "Network" } });
  const system = await prisma.relatedSystem.findFirstOrThrow({ where: { name: "VPN" } });

  const tickets = [
    { ticketNumber: "E2E-L4-ACTIONS", summary: "VPN drops every hour (E2E)", currentStatus: TicketStatus.IN_PROGRESS, ticketOwnerId: staff, itPriority: Priority.HIGH },
    { ticketNumber: "E2E-L4-EMPTY", summary: "New printer request (E2E)", currentStatus: TicketStatus.NEW, ticketOwnerId: null, itPriority: null },
  ];
  const ticketIds: Record<string, number> = {};
  for (const t of tickets) {
    const data = {
      requesterId: requester,
      categoryId: category.id,
      relatedSystemId: system.id,
      summary: t.summary,
      description: "Fixture Ticket for Lab 4 E2E tests and screenshots.",
      requestedPriority: Priority.MEDIUM,
      itPriority: t.itPriority,
      currentStatus: t.currentStatus,
      ticketOwnerId: t.ticketOwnerId,
      requesterIndicatedResolved: false,
      version: 1,
    };
    const ticket = await prisma.ticket.upsert({ where: { ticketNumber: t.ticketNumber }, update: data, create: { ticketNumber: t.ticketNumber, ...data } });
    ticketIds[t.ticketNumber] = ticket.id;
  }

  // Reset fixture actions so every scenario starts from the same state.
  await prisma.actionTaken.deleteMany({ where: { ticketId: { in: Object.values(ticketIds) } } });
  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const actionsTicket = ticketIds["E2E-L4-ACTIONS"];
  await prisma.actionTaken.createMany({
    data: [
      { ticketId: actionsTicket, actionAt: new Date(now - 2 * day), description: "Checked VPN gateway logs for the account", result: "Repeated re-key failures every 60 minutes", status: ActionStatus.COMPLETED, performedById: staff, assigneeId: staff, followUpRequired: true, followUpNote: "Confirm with the requester after the next re-key", attachmentNotes: "Gateway log excerpt saved in the team share" },
      { ticketId: actionsTicket, actionAt: new Date(now - 1 * day), description: "Escalate to the network vendor", status: ActionStatus.CANCELLED, performedById: staff2, assigneeId: staff2 },
      { ticketId: actionsTicket, actionAt: new Date(now + 2 * 60 * 60 * 1000), description: "Update the VPN client profile on the laptop", status: ActionStatus.PLANNED, performedById: staff, assigneeId: staff2 },
    ],
  });

  console.log(`E2E fixtures ready: users ${Object.keys(ids).length}, tickets ${JSON.stringify(ticketIds)}`);
}

main()
  .catch((err) => {
    console.error("E2E fixtures failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
