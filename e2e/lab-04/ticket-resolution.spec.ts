import { test, expect } from "@playwright/test";
import { WIDTHS, collectConsoleErrors, login, openRequesterTicket, openStaffTicket, resetFixtures, shot } from "./helpers";

// RESP-01 evidence for the ticket workflow UI (#53): every state at 1280 / 768 / 320 px.
// Screenshots go to artifacts/lab-04/screenshots/workflow-<state>-<width>.png.
test.describe.configure({ mode: "serial" });

for (const width of WIDTHS) {
  test.describe(`Ticket workflow screens at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.beforeEach(() => resetFixtures());

    test(`permitted options, success and final status (${width})`, async ({ page }) => {
      await login(page, "e2e.staff@example.com");
      const consoleErrors = collectConsoleErrors(page);

      await openStaffTicket(page, "E2E-L4-ACTIONS");
      const select = page.getByTestId("staff-status-select");
      const options = await select.locator("option").evaluateAll((els) =>
        els.map((e) => ({ value: (e as HTMLOptionElement).value, disabled: (e as HTMLOptionElement).disabled }))
      );
      expect(options).toEqual([
        { value: "IN_PROGRESS", disabled: true },
        { value: "OPEN", disabled: false },
        { value: "WAITING_FOR_REQUESTER", disabled: false },
        { value: "RESOLVED", disabled: false },
        { value: "CANCELLED", disabled: false },
      ]);
      await expect(page.getByTestId("status-submit")).toBeDisabled();
      await shot(page, "workflow-staff-control", width);

      await select.selectOption("WAITING_FOR_REQUESTER");
      await page.getByTestId("status-submit").click();
      await expect(page.getByTestId("ticket-status-badge")).toHaveText("WAITING_FOR_REQUESTER");
      await expect(page.getByTestId("status-success")).toContainText("Status changed to WAITING_FOR_REQUESTER");
      await shot(page, "workflow-staff-success", width);

      await openStaffTicket(page, "E2E-L4-CANCELLED");
      await expect(page.getByTestId("no-further-changes")).toContainText("No further changes");
      await expect(page.getByTestId("staff-status-select")).toHaveCount(0);
      await shot(page, "workflow-staff-final", width);
      expect(consoleErrors).toEqual([]);
    });

    test(`resolution gate and stale-update conflict (${width})`, async ({ page }) => {
      await login(page, "e2e.staff@example.com");

      await openStaffTicket(page, "E2E-L4-GATE");
      await page.getByTestId("staff-status-select").selectOption("RESOLVED");
      await page.getByTestId("status-submit").click();
      await expect(page.getByTestId("status-gate-reasons").locator("li")).toHaveText([
        "Assign a Ticket Owner",
        "Complete at least one action",
      ]);
      await expect(page.getByTestId("ticket-status-badge")).toHaveText("IN_PROGRESS");
      await shot(page, "workflow-staff-gate", width);

      // A colleague changes the IT priority (bumping the version) after this page loaded.
      const ticketId = await page.evaluate(async () => {
        const res = await fetch("http://localhost:4000/api/staff/tickets?search=E2E-L4-GATE", { credentials: "include" });
        return (await res.json()).items[0].id as number;
      });
      const bump = await page.request.patch(`http://localhost:4000/api/tickets/${ticketId}/priority`, { data: { itPriority: "HIGH" } });
      expect(bump.status()).toBe(200);

      await page.getByTestId("staff-status-select").selectOption("WAITING_FOR_REQUESTER");
      await page.getByTestId("status-submit").click();
      await expect(page.getByTestId("conflict-banner")).toContainText("This item was changed by someone else");
      await shot(page, "workflow-staff-conflict", width);

      await page.getByTestId("conflict-reload").click();
      await expect(page.getByTestId("staff-priority-select")).toHaveValue("HIGH");
    });

    test(`requester read-only status and resolved signal (${width})`, async ({ page }) => {
      await login(page, "e2e.requester@example.com");
      const consoleErrors = collectConsoleErrors(page);
      await openRequesterTicket(page, "E2E-L4-ACTIONS");
      await expect(page.getByTestId("ticket-status-badge")).toHaveText("IN_PROGRESS");
      await expect(page.getByTestId("status-select")).toHaveCount(0);
      await expect(page.getByTestId("staff-status-select")).toHaveCount(0);
      await expect(page.getByTestId("indicate-resolved-help")).toContainText("Staff will confirm");
      await shot(page, "workflow-requester-status", width);
      expect(consoleErrors).toEqual([]);
    });
  });
}

test.describe("Ticket resolution flow (#55)", () => {
  test.beforeEach(() => resetFixtures());

  test("E2E-02 (AC-11, AC-18): the gate blocks RESOLVED; complete the planned action; resolve; close; reopen", async ({ page }) => {
    await login(page, "e2e.staff@example.com");
    await openStaffTicket(page, "E2E-L4-ACTIONS");
    const select = page.getByTestId("staff-status-select");
    const submit = page.getByTestId("status-submit");

    await select.selectOption("RESOLVED");
    await submit.click();
    await expect(page.getByTestId("status-gate-reasons").locator("li")).toHaveText(["Complete or cancel planned actions"]);
    await expect(page.getByTestId("ticket-status-badge")).toHaveText("IN_PROGRESS");

    const planned = page.getByTestId("action-row").filter({ hasText: "Update the VPN client profile" });
    await planned.getByTestId("action-complete-btn").click();
    await page.getByTestId("action-result").fill("Profile updated; no drops during a 2-hour test");
    await page.getByTestId("action-complete-confirm").click();
    await expect(planned.getByTestId("action-status")).toHaveText("Completed");

    for (const [target, expectedOptions] of [
      ["RESOLVED", ["RESOLVED", "CLOSED", "REOPENED"]],
      ["CLOSED", ["CLOSED", "REOPENED"]],
      ["REOPENED", ["REOPENED", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]],
    ] as const) {
      await select.selectOption(target);
      await submit.click();
      await expect(page.getByTestId("ticket-status-badge")).toHaveText(target);
      await expect(select.locator("option")).toHaveText([...expectedOptions]);
    }
  });
});
