import { test, expect } from "@playwright/test";
import {
  WIDTHS,
  collectConsoleErrors,
  login,
  logout,
  openRequesterTicket,
  openStaffTicket,
  resetFixtures,
  shot,
} from "./helpers";

// RESP-01 evidence for Actions Taken (#52): every UI state at 1280 / 768 / 320 px.
// Screenshots go to artifacts/lab-04/screenshots/actions-<state>-<width>.png.
test.describe.configure({ mode: "serial" });

for (const width of WIDTHS) {
  test.describe(`Actions Taken screens at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.beforeEach(() => resetFixtures());

    test(`staff list, empty, loading and error states (${width})`, async ({ page }) => {
      await login(page, "e2e.staff@example.com");
      // Collected after login: the logged-out /api/auth/me probe logs a 401 (Lab 3 behaviour, see #55).
      const consoleErrors = collectConsoleErrors(page);

      await openStaffTicket(page, "E2E-L4-ACTIONS");
      const panel = page.getByTestId("actions-panel");
      await expect(panel.getByTestId("action-row")).toHaveCount(3);
      await expect(panel.getByTestId("action-status")).toHaveText(["Planned", "Cancelled", "Completed"]);
      await shot(page, "actions-staff-list", width);

      await openStaffTicket(page, "E2E-L4-EMPTY");
      await expect(page.getByTestId("actions-empty")).toHaveText("No actions recorded yet.");
      await shot(page, "actions-staff-empty", width);
      expect(consoleErrors, "console errors on happy path").toEqual([]);

      // Loading: hold the actions request until the screenshot is taken.
      let release: () => void = () => {};
      const held = new Promise<void>((resolve) => (release = resolve));
      await page.route("**/api/tickets/*/actions", async (route) => {
        await held;
        await route.continue();
      });
      await openStaffTicket(page, "E2E-L4-ACTIONS");
      await expect(page.getByTestId("actions-loading")).toBeVisible();
      await shot(page, "actions-staff-loading", width);
      release();
      await expect(page.getByTestId("action-row")).toHaveCount(3);
      await page.unroute("**/api/tickets/*/actions");

      // Failure: the API returns 500; the UI shows a safe message and Retry.
      await page.route("**/api/tickets/*/actions", (route) =>
        route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Something went wrong.", code: "INTERNAL" }) })
      );
      await openStaffTicket(page, "E2E-L4-EMPTY");
      await expect(page.getByTestId("actions-error")).toContainText("Could not load actions.");
      await shot(page, "actions-staff-error", width);
      await page.unroute("**/api/tickets/*/actions");
      await page.getByTestId("actions-retry").click();
      await expect(page.getByTestId("actions-empty")).toBeVisible();
    });

    test(`staff create form: validation, then success (${width})`, async ({ page }) => {
      await login(page, "e2e.staff@example.com");
      await openStaffTicket(page, "E2E-L4-ACTIONS");
      await page.getByTestId("action-add-btn").click();
      await expect(page.getByTestId("action-form")).toContainText("Performed by: Erin Staff");

      await page.getByTestId("action-description").fill("ab");
      await page.getByTestId("action-followup-required").check();
      await page.getByTestId("action-submit").click();
      await expect(page.getByTestId("action-error-description")).toBeVisible();
      await expect(page.getByTestId("action-error-followUpNote")).toBeVisible();
      await expect(page.getByTestId("action-description")).toHaveAttribute("aria-invalid", "true");
      await shot(page, "actions-staff-validation", width);

      await page.getByTestId("action-description").fill("Re-imaged the VPN client and re-entered the certificate");
      await page.getByTestId("action-followup-note").fill("Ask the requester tomorrow if drops continue");
      await page.getByTestId("action-submit").click();
      await expect(page.getByTestId("actions-success")).toHaveText(/Action added\./);
      await expect(page.getByTestId("action-row")).toHaveCount(4);
      await shot(page, "actions-staff-created", width);
    });

    test(`staff complete form and stale-update conflict (${width})`, async ({ page }) => {
      await login(page, "e2e.staff@example.com");
      await openStaffTicket(page, "E2E-L4-ACTIONS");
      const plannedRow = page.getByTestId("action-row").filter({ hasText: "Update the VPN client profile" });

      await plannedRow.getByTestId("action-complete-btn").click();
      await page.getByTestId("action-complete-confirm").click();
      await expect(page.getByTestId("action-error-result")).toBeVisible();
      await page.getByTestId("action-result").fill("Profile updated, no drops in a 2-hour test");
      await shot(page, "actions-staff-complete-form", width);
      await plannedRow.getByRole("button", { name: "Back" }).click();

      // Another user edits the same action between our read and our save.
      await plannedRow.getByTestId("action-edit-btn").click();
      await page.getByTestId("action-description").fill("My draft: update profile and reboot");
      const ticketId = await page.evaluate(async () => {
        const res = await fetch("http://localhost:4000/api/staff/tickets?search=E2E-L4-ACTIONS", { credentials: "include" });
        return (await res.json()).items[0].id as number;
      });
      const list = await (await page.request.get(`http://localhost:4000/api/tickets/${ticketId}/actions`)).json();
      const planned = list.items.find((a: { status: string }) => a.status === "PLANNED");
      const bump = await page.request.patch(`http://localhost:4000/api/tickets/${ticketId}/actions/${planned.id}`, {
        data: { expectedVersion: planned.version, attachmentNotes: "Changed by a colleague" },
      });
      expect(bump.status()).toBe(200);

      await page.getByTestId("action-submit").click();
      await expect(page.getByTestId("conflict-banner")).toContainText("This item was changed by someone else");
      await expect(page.getByTestId("action-description")).toHaveValue("My draft: update profile and reboot");
      await shot(page, "actions-staff-conflict", width);
    });

    test(`requester read-only list (${width})`, async ({ page }) => {
      await login(page, "e2e.requester@example.com");
      const consoleErrors = collectConsoleErrors(page);
      await openRequesterTicket(page, "E2E-L4-ACTIONS");
      const panel = page.getByTestId("actions-panel");
      await expect(panel.getByTestId("action-row")).toHaveCount(3);
      await expect(panel.locator("button")).toHaveCount(0);
      await expect(page.getByTestId("action-add-btn")).toHaveCount(0);
      await shot(page, "actions-requester-readonly", width);
      expect(consoleErrors).toEqual([]);
    });
  });
}

test.describe("Actions Taken flows (#55)", () => {
  test.beforeEach(() => resetFixtures());

  test("E2E-01 (AC-01, AC-07, AC-17): two staff members add actions on one Ticket; the Requester sees them read-only", async ({ page }) => {
    await login(page, "e2e.staff@example.com");
    await openStaffTicket(page, "E2E-L4-ACTIONS");
    await page.getByTestId("action-add-btn").click();
    await page.getByTestId("action-description").fill("Erin: reset the VPN token");
    await page.getByTestId("action-submit").click();
    await expect(page.getByTestId("actions-success")).toBeVisible();
    await logout(page);

    await login(page, "e2e.staff2@example.com");
    await openStaffTicket(page, "E2E-L4-ACTIONS");
    await page.getByTestId("action-add-btn").click();
    await expect(page.getByTestId("action-form")).toContainText("Performed by: Sam Second");
    await page.getByTestId("action-description").fill("Sam: replaced the docking cable");
    await page.getByTestId("action-submit").click();
    await expect(page.getByTestId("action-row")).toHaveCount(5);
    await logout(page);

    await login(page, "e2e.requester@example.com");
    await openRequesterTicket(page, "E2E-L4-ACTIONS");
    const rows = page.getByTestId("actions-panel").getByTestId("action-row");
    await expect(rows).toHaveCount(5);
    await expect(rows.filter({ hasText: "Erin: reset the VPN token" })).toContainText("Erin Staff");
    await expect(rows.filter({ hasText: "Sam: replaced the docking cable" })).toContainText("Sam Second");
    await expect(page.getByTestId("actions-panel").locator("button")).toHaveCount(0);
  });

  test("A11Y-01 (AC-22): open a Ticket and add an action with the keyboard only; labels and focus order", async ({ page }) => {
    await login(page, "e2e.staff@example.com");
    await page.getByTestId("nav-staff-queue").click();
    await page.getByTestId("staff-queue-search").fill("E2E-L4-EMPTY");
    const row = page.getByTestId("staff-queue-row").filter({ hasText: "E2E-L4-EMPTY" });
    await row.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("staff-ticket-detail")).toBeVisible();

    await page.getByTestId("action-add-btn").focus();
    await page.keyboard.press("Enter");
    // Chromium gives each segment of a datetime-local input its own Tab stop, so record the
    // sequence of distinct focused elements rather than one entry per key press.
    const focusOrder: string[] = [];
    await page.getByTestId("action-at").focus();
    for (let i = 0; i < 20 && focusOrder.length < 6; i++) {
      const current = (await page.evaluate(() => document.activeElement?.getAttribute("data-testid"))) ?? "";
      if (focusOrder[focusOrder.length - 1] !== current) focusOrder.push(current);
      await page.keyboard.press("Tab");
    }
    expect(focusOrder).toEqual(["action-at", "action-assignee", "action-description", "action-followup-required", "action-attachment-notes", "action-submit"]);

    // Every form field has a label bound to it.
    for (const id of ["action-at", "action-assignee", "action-description", "action-followup-required", "action-attachment-notes"]) {
      const labelled = await page.getByTestId(id).evaluate((el) => (el as HTMLInputElement).labels?.length ?? 0);
      expect(labelled, id).toBeGreaterThan(0);
    }

    await page.getByTestId("action-description").focus();
    await page.keyboard.type("Checked the printer queue from the keyboard");
    const outline = await page.getByTestId("action-description").evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).not.toBe("none");
    await page.getByTestId("action-submit").focus();
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("actions-success")).toBeVisible();
    await expect(page.getByTestId("action-row")).toHaveCount(1);
  });
});
