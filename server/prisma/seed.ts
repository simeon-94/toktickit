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
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });