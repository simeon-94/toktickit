import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";

// MIG-01 / MIG-02 run against a throw-away scratch database so the shared dev/test DB is never
// migrated, rolled back or reseeded by this file.
const SERVER_DIR = path.resolve(__dirname, "../..");
const MIGRATIONS_DIR = path.join(SERVER_DIR, "prisma/migrations");
const ROLLBACK_SQL = path.resolve(SERVER_DIR, "../docs/lab-04/rollback.sql");
const SCRATCH_DB = "toktickit_l4_scratch";

const baseUrl = new URL(process.env.DATABASE_URL as string);
const scratchUrl = new URL(baseUrl.toString());
scratchUrl.pathname = `/${SCRATCH_DB}`;
const SCRATCH_URL = scratchUrl.toString();

const admin = new PrismaClient();
let scratch: PrismaClient;

const migrationDirs = fs
  .readdirSync(MIGRATIONS_DIR)
  .filter((d) => fs.statSync(path.join(MIGRATIONS_DIR, d)).isDirectory())
  .sort();
const lab4Dir = migrationDirs.find((d) => d.endsWith("_lab4_actions_taken"));
const lab3Dirs = migrationDirs.filter((d) => d !== lab4Dir);

function execSqlFile(file: string) {
  execSync(`npx prisma db execute --file "${file}" --url "${SCRATCH_URL}"`, { cwd: SERVER_DIR, stdio: "pipe" });
}

function runSeed() {
  execSync("npx tsx prisma/seed.ts", {
    cwd: SERVER_DIR,
    stdio: "pipe",
    env: { ...process.env, DATABASE_URL: SCRATCH_URL },
  });
}

async function tableCounts() {
  const tables = ["User", "Category", "RelatedSystem", "Ticket", "PublicComment", "InternalNote", "Attachment"];
  const counts: Record<string, number> = {};
  for (const t of tables) {
    const rows = await scratch.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM "${t}"`);
    counts[t] = rows[0].n;
  }
  return counts;
}

async function lab3Snapshot() {
  return {
    counts: await tableCounts(),
    tickets: await scratch.$queryRawUnsafe(
      `SELECT "id","ticketNumber","requesterId","ticketOwnerId","summary","currentStatus"::text AS "currentStatus","itPriority"::text AS "itPriority","requesterIndicatedResolved","updatedAt" FROM "Ticket" ORDER BY "id"`
    ),
    comments: await scratch.$queryRawUnsafe(`SELECT "id","ticketId","authorId","content" FROM "PublicComment" ORDER BY "id"`),
    notes: await scratch.$queryRawUnsafe(`SELECT "id","ticketId","authorId","content" FROM "InternalNote" ORDER BY "id"`),
    attachments: await scratch.$queryRawUnsafe(`SELECT "id","ticketId","fileName","isRemoved" FROM "Attachment" ORDER BY "id"`),
  };
}

async function columnExists(table: string, column: string) {
  const rows = await scratch.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(*)::int AS n FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    table,
    column
  );
  return rows[0].n > 0;
}

async function tableExists(table: string) {
  const rows = await scratch.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    table
  );
  return rows[0].n > 0;
}

async function enumExists(name: string) {
  const rows = await scratch.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM pg_type WHERE typname = $1`, name);
  return rows[0].n > 0;
}

describe("Lab 4 — migration (scratch database)", () => {
  beforeAll(async () => {
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${SCRATCH_DB}" WITH (FORCE)`);
    await admin.$executeRawUnsafe(`CREATE DATABASE "${SCRATCH_DB}"`);
    scratch = new PrismaClient({ datasources: { db: { url: SCRATCH_URL } } });
  }, 60_000);

  afterAll(async () => {
    await scratch?.$disconnect();
    await admin.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${SCRATCH_DB}" WITH (FORCE)`);
    await admin.$disconnect();
  }, 60_000);

  it("the lab4_actions_taken migration exists and is additive only", () => {
    expect(lab4Dir).toBeDefined();
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, lab4Dir!, "migration.sql"), "utf8");
    const statements = sql.replace(/--.*$/gm, "");
    expect(statements).not.toMatch(/\bDROP\b/i);
    expect(statements).not.toMatch(/\bDELETE\b/i);
    expect(statements).not.toMatch(/\bTRUNCATE\b/i);
    expect(statements).not.toMatch(/ALTER\s+COLUMN/i);
    expect(statements).toMatch(/ADD COLUMN\s+"version" INTEGER NOT NULL DEFAULT 1/i);
  });

  it("MIG-01 (AC-20): Lab 3 data is preserved after migrating and every Ticket gets version = 1", async () => {
    for (const dir of lab3Dirs) execSqlFile(path.join(MIGRATIONS_DIR, dir, "migration.sql"));

    // Representative Lab 3 data written with raw SQL against the pre-Lab-4 schema.
    await scratch.$executeRawUnsafe(`INSERT INTO "Category" ("name") VALUES ('Hardware')`);
    await scratch.$executeRawUnsafe(`INSERT INTO "RelatedSystem" ("name") VALUES ('VPN')`);
    await scratch.$executeRawUnsafe(
      `INSERT INTO "User" ("name","email","passwordHash","role") VALUES ('Req One','mig-req@example.com','x','REQUESTER'),('Staff One','mig-staff@example.com','x','IT_STAFF')`
    );
    await scratch.$executeRawUnsafe(
      `INSERT INTO "Ticket" ("ticketNumber","requesterId","ticketOwnerId","categoryId","relatedSystemId","summary","description","requestedPriority","itPriority","currentStatus","requesterIndicatedResolved","updatedAt")
       VALUES ('MIG-0001',1,2,1,1,'Owned ticket','Lab 3 data','HIGH','HIGH','IN_PROGRESS',false,'2026-09-01T10:00:00Z'),
              ('MIG-0002',1,NULL,1,1,'Resolved ticket','Lab 3 data','LOW',NULL,'RESOLVED',true,'2026-09-02T10:00:00Z')`
    );
    await scratch.$executeRawUnsafe(`INSERT INTO "PublicComment" ("ticketId","authorId","content") VALUES (1,1,'Still broken')`);
    await scratch.$executeRawUnsafe(`INSERT INTO "InternalNote" ("ticketId","authorId","content") VALUES (1,2,'Check logs')`);
    await scratch.$executeRawUnsafe(
      `INSERT INTO "Attachment" ("ticketId","fileName","storedFileName","mimeType","sizeBytes") VALUES (1,'shot.png','abc.png','image/png',1234)`
    );

    const before = await lab3Snapshot();
    execSqlFile(path.join(MIGRATIONS_DIR, lab4Dir!, "migration.sql"));
    const after = await lab3Snapshot();

    expect(after).toEqual(before);
    const versions = await scratch.$queryRawUnsafe<{ version: number }[]>(`SELECT "version" FROM "Ticket"`);
    expect(versions).toHaveLength(2);
    expect(versions.every((v) => v.version === 1)).toBe(true);
    expect(await tableExists("ActionTaken")).toBe(true);
    const actions = await scratch.$queryRawUnsafe<{ n: number }[]>(`SELECT COUNT(*)::int AS n FROM "ActionTaken"`);
    expect(actions[0].n).toBe(0);
  }, 120_000);

  it("MIG-02 (AC-20): rollback.sql removes Lab 4 objects cleanly, the migration re-applies, and seeding twice creates no duplicates", async () => {
    expect(fs.existsSync(ROLLBACK_SQL)).toBe(true);
    const before = await lab3Snapshot();

    execSqlFile(ROLLBACK_SQL);
    expect(await tableExists("ActionTaken")).toBe(false);
    expect(await enumExists("ActionStatus")).toBe(false);
    expect(await columnExists("Ticket", "version")).toBe(false);
    expect(await lab3Snapshot()).toEqual(before);

    execSqlFile(path.join(MIGRATIONS_DIR, lab4Dir!, "migration.sql"));
    expect(await tableExists("ActionTaken")).toBe(true);

    runSeed();
    const firstCounts = await tableCounts();
    const firstActions = await scratch.actionTaken.count();
    runSeed();
    const secondCounts = await tableCounts();
    const secondActions = await scratch.actionTaken.count();

    expect(secondCounts).toEqual(firstCounts);
    expect(secondActions).toBe(firstActions);
    expect(firstActions).toBeGreaterThan(0);
  }, 180_000);
});
