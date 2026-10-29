import { execSync } from "child_process";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { assertSafeTestDatabase, databaseName, testDatabaseUrl } from "./testDatabase";

const SERVER_DIR = path.resolve(__dirname, "../..");

// Vitest globalSetup (Lab 4 #55): recreate the test database, apply all migrations and run the
// idempotent seed, so every run starts from the same clean state. Runs once before all test files.
export default async function setup() {
  const devUrl = process.env.DEV_DATABASE_URL;
  const testUrl = testDatabaseUrl({ ...process.env, DATABASE_URL: devUrl ?? process.env.DATABASE_URL });
  assertSafeTestDatabase(testUrl, devUrl);
  const name = databaseName(testUrl);

  // Connect to the server's maintenance database to (re)create the test database.
  const maintenanceUrl = new URL(testUrl);
  maintenanceUrl.pathname = "/postgres";
  const admin = new PrismaClient({ datasources: { db: { url: maintenanceUrl.toString() } } });
  try {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${name}"`);
  } finally {
    await admin.$disconnect();
  }

  const env = { ...process.env, DATABASE_URL: testUrl };
  execSync("npx prisma migrate deploy", { cwd: SERVER_DIR, env, stdio: "pipe" });
  execSync("npx tsx prisma/seed.ts", { cwd: SERVER_DIR, env, stdio: "pipe" });
  console.log(`[test setup] using fresh test database "${name}" (migrated and seeded)`);
}
