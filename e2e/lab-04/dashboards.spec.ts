import { test, expect, type Page } from "@playwright/test";
import { WIDTHS, collectConsoleErrors, login, logout, openRequesterTicket, openStaffTicket, resetFixtures, shot } from "./helpers";

// RESP-01 evidence for the dashboards and navigation (#54): every state at 1280 / 768 / 320 px.
// Screenshots go to artifacts/lab-04/screenshots/dashboard-<state>-<width>.png.
test.describe.configure({ mode: "serial" });

async function cardValue(page: Page, testId: string) {
  return Number((await page.getByTestId(testId).locator(".l4-card-value").textContent())?.trim());
}

for (const width of WIDTHS) {
  test.describe(`Dashboards at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.beforeEach(() => resetFixtures());

    test(`IT Staff dashboard, drill-downs and active nav (${width})`, async ({ page }) => {
      await login(page, "e2e.staff@example.com");
      const consoleErrors = collectConsoleErrors(page);

      await expect(page.getByTestId("staff-dashboard")).toBeVisible();
      await expect(page.getByTestId("nav-dashboard")).toHaveAttribute("aria-current", "page");
      await expect(page.getByTestId("dash-users-card")).toHaveCount(0);
      await shot(page, "dashboard-staff", width);

      // AC-16: the card value equals the total of the list it opens.
      const unassigned = await cardValue(page, "dash-card-unassigned");
      await page.getByTestId("dash-card-unassigned").click();
      await expect(page.getByTestId("drilldown-filter")).toContainText("Unassigned open");
      await expect(page.getByTestId("drilldown-total")).toHaveText(String(unassigned));
      await expect(page.getByTestId("nav-staff-queue")).toHaveAttribute("aria-current", "page");
      await shot(page, "dashboard-staff-drilldown-queue", width);

      await page.getByTestId("nav-dashboard").click();
      const followUps = await cardValue(page, "dash-card-followups");
      expect(followUps).toBeGreaterThan(0);
      await page.getByTestId("dash-card-followups").click();
      await expect(page.getByTestId("staff-actions-list")).toContainText("Open follow-ups");
      await expect(page.getByTestId("drilldown-total")).toHaveText(String(followUps));
      await shot(page, "dashboard-staff-followups-list", width);
      expect(consoleErrors).toEqual([]);
    });

    test(`Administrator dashboard with Users card (${width})`, async ({ page }) => {
      await login(page, "e2e.admin@example.com");
      await expect(page.getByTestId("dash-users-card")).toContainText("active");
      await expect(page.getByTestId("nav-admin-users")).toHaveText("Users");
      await shot(page, "dashboard-admin", width);
    });

    test(`IT Staff dashboard loading, failure and forbidden states (${width})`, async ({ page }) => {
      await login(page, "e2e.staff@example.com");

      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => (release = resolve));
      await page.route("**/api/staff/dashboard", async (route) => {
        await held;
        await route.continue();
      });
      await page.getByTestId("nav-staff-queue").click();
      await page.getByTestId("nav-dashboard").click();
      await expect(page.getByTestId("dash-loading")).toBeVisible();
      await shot(page, "dashboard-staff-loading", width);
      release();
      await expect(page.getByTestId("staff-dashboard")).toBeVisible();
      await page.unroute("**/api/staff/dashboard");

      await page.route("**/api/staff/dashboard", (route) =>
        route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Something went wrong.", code: "INTERNAL" }) })
      );
      await page.getByTestId("nav-staff-queue").click();
      await page.getByTestId("nav-dashboard").click();
      await expect(page.getByTestId("dash-error")).toContainText("Could not load the dashboard.");
      await shot(page, "dashboard-staff-error", width);
      await page.unroute("**/api/staff/dashboard");

      await page.route("**/api/staff/dashboard", (route) =>
        route.fulfill({ status: 403, contentType: "application/json", body: JSON.stringify({ error: "Forbidden", code: "FORBIDDEN" }) })
      );
      await page.getByTestId("nav-staff-queue").click();
      await page.getByTestId("nav-dashboard").click();
      await expect(page.getByTestId("dash-forbidden")).toContainText("You do not have access to this page");
      await shot(page, "dashboard-staff-forbidden", width);
      await page.unroute("**/api/staff/dashboard");
    });

    test(`Requester dashboard, drill-down and Change Password (${width})`, async ({ page }) => {
      await login(page, "e2e.requester@example.com");
      const consoleErrors = collectConsoleErrors(page);

      await expect(page.getByTestId("req-dashboard")).toBeVisible();
      await expect(page.getByTestId("nav-dashboard")).toHaveAttribute("aria-current", "page");
      await shot(page, "dashboard-requester", width);

      const open = await cardValue(page, "req-card-open");
      expect(open).toBeGreaterThan(0);
      await page.getByTestId("req-card-open").click();
      await expect(page.getByTestId("drilldown-filter")).toContainText("Open tickets");
      await expect(page.getByTestId("drilldown-total")).toHaveText(String(open));
      await expect(page.getByTestId("nav-my-tickets")).toHaveAttribute("aria-current", "page");
      await shot(page, "dashboard-requester-drilldown", width);

      await page.getByTestId("nav-change-password").click();
      await expect(page.getByTestId("change-password-form")).toBeVisible();
      await expect(page.getByTestId("nav-change-password")).toHaveAttribute("aria-current", "page");
      await shot(page, "dashboard-change-password", width);
      expect(consoleErrors).toEqual([]);
    });

    test(`Requester with no tickets (${width})`, async ({ page }) => {
      await login(page, "e2e.requester.empty@example.com");
      await expect(page.getByTestId("req-dashboard")).toContainText("No tickets yet");
      await expect(page.getByTestId("req-card-open")).toContainText("0");
      await shot(page, "dashboard-requester-empty", width);
    });
  });
}

test.describe("Dashboards by role and console hygiene (#55)", () => {
  test.beforeEach(() => resetFixtures());

  test("E2E-03 (AC-13..16, AC-19): every card value equals its drill-down total, for each role", async ({ page }) => {
    await login(page, "e2e.staff@example.com");
    const staffCards: Array<[string, string]> = [
      ["dash-card-unassigned", "staff-queue"],
      ["dash-card-owned", "staff-queue"],
      ["dash-card-urgent", "staff-queue"],
      ["dash-card-planned-actions", "staff-actions-list"],
      ["dash-card-followups", "staff-actions-list"],
    ];
    for (const [card, list] of staffCards) {
      await page.getByTestId("nav-dashboard").click();
      const value = await cardValue(page, card);
      await page.getByTestId(card).click();
      await expect(page.getByTestId(list)).toBeVisible();
      await expect(page.getByTestId("drilldown-total"), card).toHaveText(String(value));
    }
    for (const status of ["NEW", "IN_PROGRESS", "CANCELLED"]) {
      await page.getByTestId("nav-dashboard").click();
      const row = page.getByTestId(`dash-status-row-${status}`);
      const value = (await row.getByRole("link").textContent())?.trim();
      await row.getByRole("link").click();
      await expect(page.getByTestId("drilldown-total"), status).toHaveText(String(value));
    }
    await expect(page.getByTestId("dash-users-card")).toHaveCount(0);
    await logout(page);

    await login(page, "e2e.admin@example.com");
    await expect(page.getByTestId("dash-users-card")).toBeVisible();
    await logout(page);

    await login(page, "e2e.requester@example.com");
    for (const card of ["req-card-open", "req-card-waiting", "req-card-resolved"]) {
      await page.getByTestId("nav-dashboard").click();
      const value = await cardValue(page, card);
      await page.getByTestId(card).click();
      await expect(page.getByTestId("my-tickets")).toBeVisible();
      await expect(page.getByTestId("drilldown-total"), card).toHaveText(String(value));
    }
  });

  test("HARD-01 (AC-23): no console errors on the login page or any main screen, for every role", async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page);
    await page.goto("/");
    await expect(page.getByTestId("login-form")).toBeVisible();

    await login(page, "e2e.requester@example.com");
    await expect(page.getByTestId("req-dashboard")).toBeVisible();
    await page.getByTestId("nav-create-ticket").click();
    await expect(page.getByTestId("create-ticket-form")).toBeVisible();
    await openRequesterTicket(page, "E2E-L4-ACTIONS");
    await expect(page.getByTestId("action-row").first()).toBeVisible();
    await page.getByTestId("nav-change-password").click();
    await page.getByTestId("nav-check-system").click();
    await page.getByTestId("check-system-btn").click();
    await expect(page.getByTestId("success-state")).toBeVisible();
    await logout(page);

    await login(page, "e2e.staff@example.com");
    await expect(page.getByTestId("staff-dashboard")).toBeVisible();
    await openStaffTicket(page, "E2E-L4-ACTIONS");
    await expect(page.getByTestId("action-row").first()).toBeVisible();
    await page.getByTestId("nav-dashboard").click();
    await page.getByTestId("dash-card-followups").click();
    await expect(page.getByTestId("staff-actions-list")).toBeVisible();
    await logout(page);

    await login(page, "e2e.admin@example.com");
    await page.getByTestId("nav-admin-users").click();
    await expect(page.getByTestId("admin-users-table")).toBeVisible();
    await logout(page);

    expect(consoleErrors).toEqual([]);
  });
});
