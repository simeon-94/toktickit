import { execSync } from "child_process";
import path from "path";
import { expect, type Page } from "@playwright/test";

export const E2E_PASSWORD = "TestPass123!"; // same fixture password as server/tests/helpers/testAuth.ts
export const WIDTHS = [1280, 768, 320] as const;
export const SCREENSHOT_DIR = path.resolve(__dirname, "../../artifacts/lab-04/screenshots");
const SERVER_DIR = path.resolve(__dirname, "../../server");

// Recreates the e2e.* users and E2E-L4-* Tickets/actions (server/scripts/e2e-lab4-fixtures.ts).
export function resetFixtures() {
  execSync("npx tsx scripts/e2e-lab4-fixtures.ts", { cwd: SERVER_DIR, stdio: "pipe" });
}

export async function login(page: Page, email: string) {
  await page.goto("/");
  await page.getByTestId("login-email").waitFor();
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(E2E_PASSWORD);
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("current-user")).toBeVisible();
}

export async function openStaffTicket(page: Page, ticketNumber: string) {
  await page.getByTestId("nav-staff-queue").click();
  await page.getByTestId("staff-queue-search").fill(ticketNumber);
  const row = page.getByTestId("staff-queue-row").filter({ hasText: ticketNumber });
  await row.first().click();
  await expect(page.getByTestId("staff-ticket-detail")).toBeVisible();
}

export async function openRequesterTicket(page: Page, ticketNumber: string) {
  await page.getByTestId("nav-my-tickets").click();
  await page.getByTestId("my-tickets-search").fill(ticketNumber);
  // My Tickets shows a table at >= 768px and cards below (Lab 2 layout); click whichever is visible.
  const row = page
    .getByTestId("my-tickets-row")
    .or(page.getByTestId("my-tickets-card"))
    .filter({ hasText: ticketNumber })
    .filter({ visible: true });
  await row.first().click();
  await expect(page.getByTestId("ticket-detail")).toBeVisible();
}

// RESP-01: the page itself must never scroll horizontally.
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow, "horizontal page overflow in px").toBeLessThanOrEqual(0);
}

export async function shot(page: Page, name: string, width: number) {
  await expectNoHorizontalScroll(page);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${name}-${width}.png`), fullPage: true });
}

export function collectConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}
