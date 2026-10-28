import { PrismaClient, Role, Priority, TicketStatus, ActionStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const CATEGORY_NAMES = ["Account and Access", "Hardware", "Software", "Network"];

// Local development only — never a real password, documented in README/ai-use.md.
const DEV_INITIAL_PASSWORD = "ChangeMe123!";

async function main() {
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded ${CATEGORY_NAMES.length} categories.`);

  const passwordHash = await bcrypt.hash(DEV_INITIAL_PASSWORD, 10);

  const users = [
    // Requesters: 4 active + 1 inactive
    { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", role: Role.REQUESTER, isActive: true },
    { name: "Michael Brown", email: "michael.brown@example.com", role: Role.REQUESTER, isActive: true },
    { name: "Sarah Johnson", email: "sarah.johnson@example.com", role: Role.REQUESTER, isActive: true },
    { name: "David Lee", email: "david.lee@example.com", role: Role.REQUESTER, isActive: true },
    { name: "Alex Turner", email: "alex.turner@example.com", role: Role.REQUESTER, isActive: false },
    // IT Staff: 3 active + 1 inactive
    { name: "Priya Nair", email: "priya.nair@example.com", role: Role.IT_STAFF, isActive: true },
    { name: "Tom Walker", email: "tom.walker@example.com", role: Role.IT_STAFF, isActive: true },
    { name: "Lisa Chen", email: "lisa.chen@example.com", role: Role.IT_STAFF, isActive: true },
    { name: "Mark Diaz", email: "mark.diaz@example.com", role: Role.IT_STAFF, isActive: false },
    // Administrator: 1 active
    { name: "Olivia Grant", email: "olivia.grant@example.com", role: Role.ADMINISTRATOR, isActive: true },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash, mustChangePassword: true },
    });
  }
  console.log(`Seeded ${users.length} users (Requester/IT Staff/Administrator).`);
  console.log(`Local dev initial password for all seeded users: ${DEV_INITIAL_PASSWORD}`);

  const relatedSystems = [
    { name: "Corporate Laptop", isActive: true },
    { name: "Company Email", isActive: true },
    { name: "VPN", isActive: true },
    { name: "Shared Drive", isActive: true },
    { name: "Old Intranet Portal", isActive: false },
  ];

  for (const s of relatedSystems) {
    await prisma.relatedSystem.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
  }
  console.log(`Seeded ${relatedSystems.length} related systems.`);

  // --- Realistic seed Tickets, spread across requesters/statuses/priorities/ownership ---
  const category = await prisma.category.findMany();
  const catByName = (n: string) => category.find((c) => c.name === n)!.id;
  const system = await prisma.relatedSystem.findMany();
  const sysByName = (n: string) => system.find((s) => s.name === n)!.id;
  const userByEmail = async (email: string) => (await prisma.user.findUnique({ where: { email } }))!.id;

  const jennifer = await userByEmail("jennifer.anderson@example.com");
  const michael = await userByEmail("michael.brown@example.com");
  const sarah = await userByEmail("sarah.johnson@example.com");
  const priya = await userByEmail("priya.nair@example.com");
  const tom = await userByEmail("tom.walker@example.com");

  const tickets = [
    { ticketNumber: "TKT-2026-100001", requesterId: jennifer, ticketOwnerId: null, categoryId: catByName("Hardware"), relatedSystemId: sysByName("Corporate Laptop"), summary: "Laptop battery drains quickly", description: "Battery drains within 2 hours even when idle.", requestedPriority: Priority.MEDIUM, itPriority: Priority.MEDIUM, currentStatus: TicketStatus.NEW },
    { ticketNumber: "TKT-2026-100002", requesterId: michael, ticketOwnerId: priya, categoryId: catByName("Network"), relatedSystemId: sysByName("VPN"), summary: "Cannot connect to VPN", description: "VPN client fails to connect since this morning.", requestedPriority: Priority.HIGH, itPriority: Priority.HIGH, currentStatus: TicketStatus.OPEN },
    { ticketNumber: "TKT-2026-100003", requesterId: sarah, ticketOwnerId: tom, categoryId: catByName("Software"), relatedSystemId: sysByName("Company Email"), summary: "Outlook freezing intermittently", description: "Outlook freezes for ~10 seconds every few minutes.", requestedPriority: Priority.MEDIUM, itPriority: Priority.LOW, currentStatus: TicketStatus.IN_PROGRESS },
    { ticketNumber: "TKT-2026-100004", requesterId: jennifer, ticketOwnerId: tom, categoryId: catByName("Account and Access"), relatedSystemId: sysByName("Shared Drive"), summary: "Request access to shared folder", description: "Need read access to the Finance shared drive.", requestedPriority: Priority.LOW, itPriority: Priority.LOW, currentStatus: TicketStatus.WAITING_FOR_REQUESTER },
    { ticketNumber: "TKT-2026-100005", requesterId: michael, ticketOwnerId: priya, categoryId: catByName("Hardware"), relatedSystemId: sysByName("Corporate Laptop"), summary: "Docking station not detected", description: "Second monitor doesn't come on through the dock.", requestedPriority: Priority.MEDIUM, itPriority: Priority.MEDIUM, currentStatus: TicketStatus.RESOLVED },
    { ticketNumber: "TKT-2026-100006", requesterId: sarah, ticketOwnerId: tom, categoryId: catByName("Software"), relatedSystemId: sysByName("Company Email"), summary: "Software installation request", description: "Need Adobe Acrobat Pro installed.", requestedPriority: Priority.LOW, itPriority: Priority.LOW, currentStatus: TicketStatus.CLOSED },
    { ticketNumber: "TKT-2026-100007", requesterId: jennifer, ticketOwnerId: null, categoryId: catByName("Network"), relatedSystemId: sysByName("VPN"), summary: "VPN disconnects randomly", description: "VPN drops every 30-40 minutes, has to reconnect manually.", requestedPriority: Priority.HIGH, itPriority: Priority.HIGH, currentStatus: TicketStatus.REOPENED },
    { ticketNumber: "TKT-2026-100008", requesterId: michael, ticketOwnerId: priya, categoryId: catByName("Hardware"), relatedSystemId: sysByName("Corporate Laptop"), summary: "Duplicate ticket, opened by mistake", description: "Accidentally submitted this twice.", requestedPriority: Priority.LOW, itPriority: Priority.LOW, currentStatus: TicketStatus.CANCELLED },
  ];

  for (const t of tickets) {
    await prisma.ticket.upsert({
      where: { ticketNumber: t.ticketNumber },
      update: {},
      create: t,
    });
  }
  console.log(`Seeded ${tickets.length} tickets across requesters/statuses/priorities/ownership.`);

  const ticket2 = await prisma.ticket.findUnique({ where: { ticketNumber: "TKT-2026-100002" } });
  if (ticket2) {
    const existingComments = await prisma.publicComment.count({ where: { ticketId: ticket2.id } });
    if (existingComments === 0) {
      await prisma.publicComment.create({
        data: { ticketId: ticket2.id, authorId: michael, content: "Still happening as of this morning, please advise." },
      });
      await prisma.publicComment.create({
        data: { ticketId: ticket2.id, authorId: priya, content: "Looking into it now, will update shortly." },
      });
      await prisma.internalNote.create({
        data: { ticketId: ticket2.id, authorId: priya, content: "Checked firewall logs — likely a stale VPN profile on the client side." },
      });
      console.log("Seeded example Public Comments and an Internal Note on TKT-2026-100002.");
    }
  }

  // --- Lab 4 Actions Taken (idempotent: upsert by fixed clientRequestId) ---
  // Coverage: TKT-100001/100004/100006/100008 have 0 actions, TKT-100003 has 1, the others have
  // several; PLANNED/COMPLETED/CANCELLED with and without follow-up. The RESOLVED Ticket has a
  // completed action and no planned one (L4-BR-13); CLOSED TKT-100006 stays a legacy Ticket with
  // 0 actions. David Lee is the Requester with zero Tickets.
  const lisa = await userByEmail("lisa.chen@example.com");
  const olivia = await userByEmail("olivia.grant@example.com");
  const ticketId = async (ticketNumber: string) => (await prisma.ticket.findUnique({ where: { ticketNumber } }))!.id;
  const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

  const actions = [
    { clientRequestId: "6f1c2a10-0000-4000-8000-000000000001", ticketNumber: "TKT-2026-100002", actionAt: daysAgo(2), description: "Checked VPN gateway logs for the user's account", result: "Found repeated auth failures from an old VPN profile", status: ActionStatus.COMPLETED, performedById: priya, assigneeId: priya, followUpRequired: false, followUpNote: null, attachmentNotes: "Screenshot of gateway log saved in the internal share" },
    { clientRequestId: "6f1c2a10-0000-4000-8000-000000000002", ticketNumber: "TKT-2026-100002", actionAt: daysAgo(1), description: "Remove stale VPN profile and reinstall client", result: null, status: ActionStatus.PLANNED, performedById: priya, assigneeId: lisa, followUpRequired: false, followUpNote: null, attachmentNotes: null },
    { clientRequestId: "6f1c2a10-0000-4000-8000-000000000003", ticketNumber: "TKT-2026-100002", actionAt: daysAgo(1), description: "Escalate to network vendor", result: null, status: ActionStatus.CANCELLED, performedById: tom, assigneeId: tom, followUpRequired: false, followUpNote: null, attachmentNotes: null },
    { clientRequestId: "6f1c2a10-0000-4000-8000-000000000004", ticketNumber: "TKT-2026-100003", actionAt: daysAgo(3), description: "Rebuild Outlook profile", result: null, status: ActionStatus.PLANNED, performedById: tom, assigneeId: tom, followUpRequired: true, followUpNote: "Confirm with requester after one day of use", attachmentNotes: null },
    { clientRequestId: "6f1c2a10-0000-4000-8000-000000000005", ticketNumber: "TKT-2026-100005", actionAt: daysAgo(4), description: "Updated dock firmware and display drivers", result: "Second monitor detected after firmware update", status: ActionStatus.COMPLETED, performedById: priya, assigneeId: priya, followUpRequired: true, followUpNote: "Check again after next Windows update", attachmentNotes: null },
    { clientRequestId: "6f1c2a10-0000-4000-8000-000000000006", ticketNumber: "TKT-2026-100005", actionAt: daysAgo(3), description: "Replace docking station cable", result: null, status: ActionStatus.CANCELLED, performedById: lisa, assigneeId: lisa, followUpRequired: false, followUpNote: null, attachmentNotes: null },
    { clientRequestId: "6f1c2a10-0000-4000-8000-000000000007", ticketNumber: "TKT-2026-100007", actionAt: daysAgo(5), description: "Reset VPN session timeout policy", result: "Timeout raised, issue came back two days later", status: ActionStatus.COMPLETED, performedById: olivia, assigneeId: olivia, followUpRequired: true, followUpNote: "Monitor disconnects for one week", attachmentNotes: null },
    { clientRequestId: "6f1c2a10-0000-4000-8000-000000000008", ticketNumber: "TKT-2026-100007", actionAt: daysAgo(0), description: "Capture packet trace during next disconnect", result: null, status: ActionStatus.PLANNED, performedById: olivia, assigneeId: priya, followUpRequired: false, followUpNote: null, attachmentNotes: "Attach the .pcap summary when available" },
  ];

  for (const a of actions) {
    const { ticketNumber, ...data } = a;
    await prisma.actionTaken.upsert({
      where: { clientRequestId: a.clientRequestId },
      update: {},
      create: { ...data, ticketId: await ticketId(ticketNumber) },
    });
  }
  console.log(`Seeded ${actions.length} Actions Taken (0/1/many per Ticket, all action statuses).`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });