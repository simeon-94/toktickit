import { test, expect } from "@playwright/test";

test.describe("Responsive check", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("My Tickets has no horizontal scroll on a mobile viewport", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("login-email").waitFor();
    await page.getByTestId("login-email").fill("e2e.requester@example.com"); // CHG-07: E2E fixture account
    await page.getByTestId("login-password").fill("TestPass123!"); // CHG-07: fixture password (testAuth.ts)
    await page.getByTestId("login-submit").click();

    await page.getByTestId("nav-my-tickets").click();
    await page.getByTestId("my-tickets-cards").waitFor();

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });
});