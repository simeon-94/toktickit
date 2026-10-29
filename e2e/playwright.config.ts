import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./",
  globalSetup: "./lab-04/global-setup.ts",
  timeout: 30000,
  workers: 1,
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
  },
});