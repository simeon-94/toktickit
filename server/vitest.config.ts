import "dotenv/config";
import { defineConfig } from "vitest/config";
import { testDatabaseUrl } from "./tests/setup/testDatabase";

// Lab 4 #55: the suite uses its own database (TEST_DATABASE_URL, default "<dev db>_test"), created,
// migrated and seeded by tests/setup/globalSetup.ts. The dev DATABASE_URL is kept only so the setup
// can refuse to touch it.
const devDatabaseUrl = process.env.DEV_DATABASE_URL ?? process.env.DATABASE_URL;
const testUrl = testDatabaseUrl({ ...process.env, DATABASE_URL: devDatabaseUrl });
process.env.DEV_DATABASE_URL = devDatabaseUrl;
process.env.DATABASE_URL = testUrl;

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    globals: true,
    fileParallelism: false,
    globalSetup: ["./tests/setup/globalSetup.ts"],
    env: { DATABASE_URL: testUrl },
  },
});
