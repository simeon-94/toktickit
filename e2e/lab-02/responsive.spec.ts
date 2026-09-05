import { test, expect } from "@playwright/test";

test.describe("Responsive check", () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("My Tickets has no horizontal scroll on a mobile viewport", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("requester-dropdown").waitFor();
    await page.getByTestId("requester-dropdown").selectOption({ label: "Jennifer Anderson" });
    await page.getByTestId("continue-btn").click();

    await page.getByTestId("nav-my-tickets").click();
    await page.getByTestId("my-tickets-cards").waitFor();

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });

    expect(hasHorizontalScroll).toBe(false);
  });
});