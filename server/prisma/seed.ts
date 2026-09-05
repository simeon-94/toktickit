import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const CATEGORY_NAMES = ["Account and Access", "Hardware", "Software", "Network"];

async function main() {
  for (const name of CATEGORY_NAMES) {
    await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`Seeded ${CATEGORY_NAMES.length} categories.`);

  const requesters = [
    { name: "Jennifer Anderson", email: "jennifer.anderson@example.com", isActive: true },
    { name: "Michael Brown", email: "michael.brown@example.com", isActive: true },
    { name: "Sarah Johnson", email: "sarah.johnson@example.com", isActive: true },
    { name: "David Lee", email: "david.lee@example.com", isActive: true },
    { name: "Alex Turner", email: "alex.turner@example.com", isActive: false },
  ];

  for (const r of requesters) {
    await prisma.devRequester.upsert({
      where: { email: r.email },
      update: {},
      create: r,
    });
  }
  console.log(`Seeded ${requesters.length} development requesters.`);

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
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });