/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    globals: true,
    // Lab 4 STYLE-01 reads lab4.css as text, so Vitest must not blank it.
    css: { include: [/lab4\.css/] },
  },
});
