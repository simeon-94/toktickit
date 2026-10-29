import { test, expect, request, type APIRequestContext, type Page } from "@playwright/test";
import {
  E2E_PASSWORD,
  WIDTHS,
  login,
  logout,
  openRequesterTicket,
  openStaffTicket,
  resetFixtures,
  shot,
} from "./helpers";

// #68 evidence completion: E2E-04 (Actions Taken edit / cancel / assign / follow-up) and REG-04
// (Lab 1-3 UI regression screens) at 1280 / 768 / 320 px. Uses the e2e.* fixture accounts and the
// clean seeded database; screenshots go to artifacts/lab-04/screenshots/<name>-<width>.png.
test.describe.configure({ mode: "serial" });

const API = "http://localhost:4000";
const PLANNED = "Update the VPN client profile on the laptop";
const INACTIVE_STAFF = "Mark Diaz"; // seeded IT_STAFF with isActive = false (server/prisma/seed.ts)

type ConsoleEntry = { text: string; url: string };

// Records every console error with the URL it came from, from the first page load on.
function trackConsole(page: Page) {
  const errors: ConsoleEntry[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push({ text: msg.text(), url: msg.location().url });
  });
  page.on("pageerror", (err) => errors.push({ text: err.message, url: "" }));
  return errors;
}

// Before each screenshot: no horizontal scroll (checked in shot()) and no console errors, except the
// browser's own "Failed to load resource" line for an HTTP error the screen is meant to show.
async function capture(page: Page, errors: ConsoleEntry[], name: string, width: number, expected?: { status: number; path: string }) {
  const unexpected = errors.filter(
    (e) => !(expected && e.text.includes(`status of ${expected.status}`) && e.url.includes(expected.path))
  );
  expect(unexpected, `console errors before ${name}-${width}`).toEqual([]);
  await shot(page, name, width);
  errors.length = 0;
}

async function apiAs(email: string): Promise<APIRequestContext> {
  const ctx = await request.newContext({ baseURL: API });
  const res = await ctx.post("/api/auth/login", { data: { email, password: E2E_PASSWORD } });
  expect(res.status()).toBe(200);
  return ctx;
}

async function inactiveStaffId() {
  const admin = await apiAs("e2e.admin@example.com");
  const users: { id: number; name: string; role: string; isActive: boolean }[] = await (await admin.get("/api/admin/users")).json();
  await admin.dispose();
  const mark = users.find((u) => u.name === INACTIVE_STAFF);
  expect(mark, "seeded inactive IT Staff user").toMatchObject({ role: "IT_STAFF", isActive: false });
  return mark!.id;
}

for (const width of WIDTHS) {
  test.describe(`E2E-04 Actions Taken evidence at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    test.beforeEach(() => resetFixtures());

    test(`edit a PLANNED action: pre-filled form, then the saved result (${width})`, async ({ page }) => {
      const errors = trackConsole(page);
      await login(page, "e2e.staff@example.com");
      await openStaffTicket(page, "E2E-L4-ACTIONS");
      const row = page.getByTestId("action-row").filter({ hasText: PLANNED });
      await row.getByTestId("action-edit-btn").click();

      await expect(page.getByTestId("action-description")).toHaveValue(PLANNED);
      await expect(page.getByTestId("action-assignee")).toHaveValue(/\d+/);
      await expect(page.getByTestId("action-assignee").locator("option:checked")).toHaveText("Sam Second");
      await capture(page, errors, "actions-staff-edit", width);

      await page.getByTestId("action-description").fill(`${PLANNED} and reboot it`);
      await page.getByTestId("action-attachment-notes").fill("Profile export saved in the team share");
      await page.getByTestId("action-submit").click();
      await expect(page.getByTestId("actions-success")).toHaveText(/Action updated\./);
      const saved = page.getByTestId("action-row").filter({ hasText: `${PLANNED} and reboot it` });
      await expect(saved).toContainText("Profile export saved in the team share");
      await expect(saved.getByTestId("action-status")).toHaveText("Planned");
      await capture(page, errors, "actions-staff-edit-saved", width);
    });

    test(`assignee select lists only active IT Staff / Administrators (${width})`, async ({ page }) => {
      const errors = trackConsole(page);
      await inactiveStaffId(); // precondition: the inactive staff user exists
      await login(page, "e2e.staff@example.com");
      await openStaffTicket(page, "E2E-L4-ACTIONS");
      await page.getByTestId("action-add-btn").click();

      const select = page.getByTestId("action-assignee");
      const names = (await select.locator("option").allTextContents()).map((t) => t.trim());
      expect(names).toEqual(expect.arrayContaining(["Erin Staff (me)", "Sam Second", "Ada Admin", "Priya Nair", "Olivia Grant"]));
      expect(names).not.toContain(INACTIVE_STAFF);
      expect(names).not.toContain("Riley Requester");
      // A native <select> popup is drawn outside the page and never appears in a headless screenshot,
      // so the test shows the same options as an open list box (size attribute) for the capture only.
      await select.evaluate((el, n) => el.setAttribute("size", String(n)), names.length);
      await capture(page, errors, "actions-staff-assign", width);
    });

    test(`inactive assignee is rejected by the API and shown in the form (${width})`, async ({ page }) => {
      const errors = trackConsole(page);
      const markId = await inactiveStaffId();
      await login(page, "e2e.staff@example.com");
      await openStaffTicket(page, "E2E-L4-ACTIONS");
      await page.getByTestId("action-add-btn").click();
      await page.getByTestId("action-description").fill("Hand the follow-up to a colleague");

      // The UI never offers inactive users, so the test rewrites only assigneeId in the outgoing
      // request; the 400 and its field error below are the real server response.
      await page.route("**/api/tickets/*/actions", async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        const body = JSON.parse(route.request().postData() ?? "{}");
        await route.continue({ postData: JSON.stringify({ ...body, assigneeId: markId }) });
      });
      const responsePromise = page.waitForResponse((r) => r.url().endsWith("/actions") && r.request().method() === "POST");
      await page.getByTestId("action-submit").click();
      const response = await responsePromise;
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.code).toBe("VALIDATION");
      expect(body.fields).toHaveProperty("assigneeId");
      await page.unroute("**/api/tickets/*/actions");

      await expect(page.getByTestId("action-error-assigneeId")).toHaveText(body.fields.assigneeId);
      await expect(page.getByTestId("action-form-error")).toHaveText("Please correct the highlighted fields.");
      await expect(page.getByTestId("action-description")).toHaveValue("Hand the follow-up to a colleague");
      await expect(page.getByTestId("action-row")).toHaveCount(3);
      await capture(page, errors, "actions-staff-inactive-assignee", width, { status: 400, path: "/actions" });
    });

    test(`cancel a PLANNED action: CANCELLED and locked (${width})`, async ({ page }) => {
      const errors = trackConsole(page);
      await login(page, "e2e.staff@example.com");
      await openStaffTicket(page, "E2E-L4-ACTIONS");
      const row = page.getByTestId("action-row").filter({ hasText: PLANNED });
      await expect(row.getByTestId("action-cancel-btn")).toBeVisible();
      // The UI has no confirmation dialog for Cancel action (ui-spec); one click cancels.
      await row.getByTestId("action-cancel-btn").click();

      await expect(page.getByTestId("actions-success")).toHaveText(/Action cancelled\./);
      await expect(row.getByTestId("action-status")).toHaveText("Cancelled");
      await expect(row).toContainText("Locked");
      await expect(row.locator("button")).toHaveCount(0);
      await capture(page, errors, "actions-staff-cancelled", width);
    });

    test(`follow-up required: validation error, then the saved note (${width})`, async ({ page }) => {
      const errors = trackConsole(page);
      await login(page, "e2e.staff@example.com");
      await openStaffTicket(page, "E2E-L4-EMPTY");
      await page.getByTestId("action-add-btn").click();
      await page.getByTestId("action-description").fill("Ordered a replacement toner cartridge");
      await page.getByTestId("action-followup-required").check();
      await page.getByTestId("action-submit").click();

      await expect(page.getByTestId("action-error-followUpNote")).toHaveText("Follow-up note is required (3-500 characters).");
      await expect(page.getByTestId("action-followup-note")).toHaveAttribute("aria-invalid", "true");
      await capture(page, errors, "actions-staff-followup-error", width);

      await page.getByTestId("action-followup-note").fill("Install the cartridge when it arrives on Friday");
      await page.getByTestId("action-submit").click();
      await expect(page.getByTestId("actions-success")).toHaveText(/Action added\./);
      await expect(page.getByTestId("action-row")).toContainText("Yes: Install the cartridge when it arrives on Friday");
      await capture(page, errors, "actions-staff-followup", width);
    });
  });

  test.describe(`REG-04 Lab 1-3 regression screens at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test(`login, wrong password and forced password change (${width})`, async ({ page }) => {
      const errors = trackConsole(page);
      await page.goto("/");
      await expect(page.getByTestId("login-form")).toBeVisible();
      await capture(page, errors, "regression-login", width);

      await page.getByTestId("login-email").fill("e2e.requester@example.com");
      await page.getByTestId("login-password").fill("not-the-password");
      await page.getByTestId("login-submit").click();
      await expect(page.getByTestId("login-error")).toBeVisible();
      await expect(page.getByTestId("current-user")).toHaveCount(0);
      await capture(page, errors, "regression-login-error", width, { status: 401, path: "/api/auth/login" });

      // First login: an Administrator creates the user (Lab 3 flow) and gets a one-time temporary password.
      const admin = await apiAs("e2e.admin@example.com");
      const email = `e2e.firstlogin.${Date.now()}@example.com`;
      const created = await admin.post("/api/admin/users", { data: { name: "Fiona FirstLogin", email, role: "REQUESTER" } });
      expect(created.status()).toBe(201);
      const { tempPassword } = await created.json();
      await admin.dispose();

      await page.getByTestId("login-email").fill(email);
      await page.getByTestId("login-password").fill(tempPassword);
      await page.getByTestId("login-submit").click();
      await expect(page.getByTestId("change-password-form")).toBeVisible();
      await expect(page.getByTestId("nav-my-tickets")).toHaveCount(0);
      await capture(page, errors, "regression-change-password-forced", width);
    });

    test(`requester, staff and admin screens (${width})`, async ({ page }) => {
      const errors = trackConsole(page);
      const summary = `Regression ${width}px: monitor flickers ${Date.now()}`;
      const publicComment = "Staff: please restart the laptop once and tell us if it still flickers.";
      const internalNote = "Internal: likely the dock firmware, same as last month.";

      // Requester: My Tickets with a filter, then Create Ticket with an attachment.
      await login(page, "e2e.requester@example.com");
      await page.getByTestId("nav-my-tickets").click();
      await page.getByTestId("my-tickets-filter-status").selectOption("New");
      await expect(page.getByTestId("my-tickets-row").or(page.getByTestId("my-tickets-card")).filter({ visible: true }).first()).toContainText("New");
      await capture(page, errors, "regression-my-tickets", width);

      await page.getByTestId("nav-create-ticket").click();
      await page.getByTestId("create-ticket-category").selectOption({ label: "Hardware" });
      await page.getByTestId("create-ticket-related-system").selectOption({ label: "Corporate Laptop" });
      await page.getByTestId("create-ticket-priority").selectOption({ index: 2 });
      await page.getByTestId("create-ticket-summary").fill(summary);
      await page.getByTestId("create-ticket-description").fill("The external monitor flickers every few minutes when the laptop is docked.");
      await page.getByTestId("create-ticket-file-input").setInputFiles({
        name: "monitor-flicker.png",
        mimeType: "image/png",
        buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64"),
      });
      await expect(page.getByTestId("create-ticket-selected-files")).toContainText("monitor-flicker.png");
      await capture(page, errors, "regression-create-ticket", width);
      await page.getByTestId("create-ticket-submit").click();
      await expect(page.getByTestId("create-ticket-success")).toBeVisible();
      await capture(page, errors, "regression-create-ticket-success", width);
      await logout(page);

      // Staff: Queue, then Staff Ticket Detail with owner, IT priority, a public comment and an internal note.
      await login(page, "e2e.staff@example.com");
      await page.getByTestId("nav-staff-queue").click();
      await expect(page.getByTestId("staff-queue-row").first()).toBeVisible();
      await capture(page, errors, "regression-staff-queue", width);

      await openStaffTicket(page, summary);
      const owner = page.getByTestId("staff-owner-select");
      await owner.selectOption({ label: "Erin Staff (IT_STAFF)" });
      await expect(owner).toBeEnabled();
      await expect(owner.locator("option:checked")).toHaveText("Erin Staff (IT_STAFF)");
      const priority = page.getByTestId("staff-priority-select");
      await priority.selectOption("HIGH");
      await expect(priority).toBeEnabled();
      await expect(priority).toHaveValue("HIGH");
      await page.getByTestId("staff-comment-input").fill(publicComment);
      await page.getByTestId("staff-comment-submit").click();
      await expect(page.getByTestId("public-comments-panel")).toContainText(publicComment);
      await page.getByTestId("staff-note-input").fill(internalNote);
      await page.getByTestId("staff-note-submit").click();
      await expect(page.getByTestId("internal-notes-panel")).toContainText(internalNote);
      await expect(page.getByTestId("staff-ticket-attachments")).toContainText("monitor-flicker.png");
      await expect(page.getByTestId("staff-action-error")).toHaveCount(0);
      await capture(page, errors, "regression-staff-ticket-detail", width);
      await logout(page);

      // Requester: Ticket Detail with the attachment and public comments; the internal note is not shown.
      await login(page, "e2e.requester@example.com");
      await openRequesterTicket(page, summary);
      await page.getByTestId("ticket-detail-comment-input").fill("Restarted twice, it still flickers after lunch.");
      await page.getByTestId("ticket-detail-comment-submit").click();
      const comments = page.getByTestId("ticket-detail-comments");
      await expect(comments).toContainText("Restarted twice, it still flickers after lunch.");
      await expect(comments).toContainText(publicComment);
      await expect(page.getByTestId("ticket-detail-attachment-row")).toContainText("monitor-flicker.png");
      await expect(page.getByTestId("ticket-detail")).not.toContainText(internalNote);
      await expect(page.getByTestId("internal-notes-panel")).toHaveCount(0);
      await capture(page, errors, "regression-ticket-detail-requester", width);
      await logout(page);

      // Administrator: User Management list, then the self-deactivation protection message.
      await login(page, "e2e.admin@example.com");
      await page.getByTestId("nav-admin-users").click();
      await expect(page.getByTestId("admin-users-table")).toBeVisible();
      await expect(page.getByTestId("admin-users-row").filter({ hasText: INACTIVE_STAFF })).toContainText("Inactive");
      await capture(page, errors, "regression-admin-users", width);

      await page.getByTestId("admin-users-row").filter({ hasText: "e2e.admin@example.com" }).click();
      await page.getByTestId("admin-edit-active").uncheck();
      await page.getByTestId("admin-edit-save").click();
      await expect(page.getByTestId("admin-users-edit-panel")).toContainText("You cannot deactivate your own account.");
      await expect(page.getByTestId("admin-users-row").filter({ hasText: "e2e.admin@example.com" })).toContainText("Active");
      await capture(page, errors, "regression-admin-users-self-protect", width, { status: 409, path: "/api/admin/users" });
    });
  });
}
