import { test, expect } from "@playwright/test";

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/");
  await page.getByTestId("login-email").waitFor();
  await page.getByTestId("login-email").fill(email);
  await page.getByTestId("login-password").fill(password);
  await page.getByTestId("login-submit").click();
}

test.describe("Authentication and role-based access", () => {
  test("unauthenticated user is shown the Login screen", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("login-form")).toBeVisible();
  });

  test("requester can log in, create a ticket, and find it in My Tickets", async ({ page }) => {
    const uniqueSummary = `E2E test ticket ${Date.now()}`;

    await login(page, "jennifer.anderson@example.com", "JenniferSecure2026!");

    await expect(page.getByTestId("current-user")).toContainText("REQUESTER");
    await expect(page.getByTestId("nav-staff-queue")).not.toBeVisible();

    await page.getByTestId("nav-create-ticket").click();
    await page.getByTestId("create-ticket-category").selectOption({ index: 1 });
    await page.getByTestId("create-ticket-related-system").selectOption({ index: 1 });
    await page.getByTestId("create-ticket-summary").fill(uniqueSummary);
    await page.getByTestId("create-ticket-description").fill(
      "This is an automated end-to-end test description, long enough to pass validation."
    );
    await page.getByTestId("create-ticket-submit").click();

    await expect(page.getByTestId("create-ticket-success")).toBeVisible();

    await page.getByTestId("nav-my-tickets").click();
    await page.getByTestId("my-tickets-search").fill(uniqueSummary);

    await expect(
      page.getByTestId("my-tickets-row").filter({ hasText: uniqueSummary })
    ).toBeVisible({ timeout: 5000 });

    await page.getByTestId("logout-btn").click();
    await expect(page.getByTestId("login-form")).toBeVisible();
  });

  test("IT staff sees the Ticket Queue but not Requester screens, and can open a ticket", async ({ page }) => {
    await login(page, "priya.nair@example.com", "12345678");

    await expect(page.getByTestId("current-user")).toContainText("IT_STAFF");
    await expect(page.getByTestId("nav-staff-queue")).toBeVisible();
    await expect(page.getByTestId("nav-create-ticket")).not.toBeVisible();
    await expect(page.getByTestId("nav-admin-users")).not.toBeVisible();

    await page.getByTestId("nav-staff-queue").click(); // CHG-06: Lab 4 lands on the Dashboard
    await expect(page.getByTestId("staff-queue-table")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("staff-queue-row").first().click();

    await expect(page.getByTestId("staff-ticket-detail")).toBeVisible();
    await expect(page.getByTestId("public-comments-panel")).toBeVisible();
    await expect(page.getByTestId("internal-notes-panel")).toBeVisible();
  });

  test("administrator sees User Management and can create a new user", async ({ page }) => {
    const uniqueEmail = `e2e.user.${Date.now()}@example.com`;

    await login(page, "olivia.grant@example.com", "OliviaSecure2026!");

    await expect(page.getByTestId("current-user")).toContainText("ADMINISTRATOR");
    await expect(page.getByTestId("nav-admin-users")).toBeVisible();

    await page.getByTestId("nav-admin-users").click();
    await expect(page.getByTestId("admin-users-table")).toBeVisible();

    await page.getByTestId("admin-create-name").fill("E2E Created User");
    await page.getByTestId("admin-create-email").fill(uniqueEmail);
    await page.getByTestId("admin-create-role").selectOption("REQUESTER");
    await page.getByTestId("admin-create-submit").click();

    await expect(page.getByTestId("admin-users-temp-password")).toBeVisible();
    await expect(page.getByTestId("admin-users-table")).toContainText(uniqueEmail);
  });
});