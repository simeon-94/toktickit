import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./lab-02",
  timeout: 30000,
  use: {
    baseURL: "http://localhost:5173",
    screenshot: "only-on-failure",
  },
});