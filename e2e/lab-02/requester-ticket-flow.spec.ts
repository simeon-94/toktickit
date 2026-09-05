import { test, expect } from "@playwright/test";

test.describe("Requester and ticket flow", () => {
  test("select a requester, create a ticket, and find it in My Tickets", async ({ page }) => {
    const uniqueSummary = `E2E test ticket ${Date.now()}`;

    await page.goto("/");

    await page.getByTestId("requester-dropdown").waitFor();
    await page.getByTestId("requester-dropdown").selectOption({ label: "Jennifer Anderson" });
    await page.getByTestId("continue-btn").click();

    await page.getByTestId("nav-create-ticket").click();

    await page.getByTestId("create-ticket-category").selectOption({ index: 1 });
    await page.getByTestId("create-ticket-related-system").selectOption({ index: 1 });
    await page.getByTestId("create-ticket-summary").fill(uniqueSummary);
    await page.getByTestId("create-ticket-description").fill(
      "This is an automated end-to-end test description, long enough to pass validation."
    );
    await page.getByTestId("create-ticket-submit").click();

    await expect(page.getByTestId("create-ticket-success")).toBeVisible();
    const successText = await page.getByTestId("create-ticket-success").textContent();
    expect(successText).toMatch(/TKT-\d{4}-\d{6}/);

    await page.getByTestId("nav-my-tickets").click();
    await page.getByTestId("my-tickets-search").fill(uniqueSummary);

    await expect(
    page.getByTestId("my-tickets-row").filter({ hasText: uniqueSummary })
    ).toBeVisible({ timeout: 5000 });
  });

  test("a ticket created by one requester does not appear for another", async ({ page }) => {
    const uniqueSummary = `E2E isolation test ${Date.now()}`;

    await page.goto("/");
    await page.getByTestId("requester-dropdown").waitFor();
    await page.getByTestId("requester-dropdown").selectOption({ label: "Jennifer Anderson" });
    await page.getByTestId("continue-btn").click();

    await page.getByTestId("nav-create-ticket").click();
    await page.getByTestId("create-ticket-category").selectOption({ index: 1 });
    await page.getByTestId("create-ticket-related-system").selectOption({ index: 1 });
    await page.getByTestId("create-ticket-summary").fill(uniqueSummary);
    await page.getByTestId("create-ticket-description").fill(
      "This is an automated end-to-end test description, long enough to pass validation."
    );
    await page.getByTestId("create-ticket-submit").click();
    await expect(page.getByTestId("create-ticket-success")).toBeVisible();

    await page.getByTestId("change-requester-btn").click();
    await page.getByTestId("requester-dropdown").waitFor();
    await page.getByTestId("requester-dropdown").selectOption({ label: "Michael Brown" });
    await page.getByTestId("continue-btn").click();

    await page.getByTestId("nav-my-tickets").click();
    await page.getByTestId("my-tickets-search").fill(uniqueSummary);

    await expect(page.getByTestId("my-tickets-no-results")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(uniqueSummary)).not.toBeVisible();
  });
});