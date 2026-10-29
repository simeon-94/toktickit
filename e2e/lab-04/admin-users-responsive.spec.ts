import { test, expect } from "@playwright/test";
import { WIDTHS, expectNoHorizontalScroll, login } from "./helpers";

// #71 (CL-08): the Lab 3 Admin Users table must not push the page wider than the viewport; on narrow
// screens only the table scrolls, inside its own container, and every column stays reachable.
for (const width of WIDTHS) {
  test(`RESP-02 (AC-21, AC-22): Admin Users has no page-level horizontal scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await login(page, "e2e.admin@example.com");
    await page.getByTestId("nav-admin-users").click();
    const table = page.getByTestId("admin-users-table");
    await expect(table).toBeVisible();
    await expectNoHorizontalScroll(page);

    // The table sits in a scroll container no wider than the page.
    const container = await table.evaluate((el) => {
      const box = el.parentElement!;
      return { overflowX: getComputedStyle(box).overflowX, right: box.getBoundingClientRect().right, vw: document.documentElement.clientWidth };
    });
    expect(container.overflowX).toBe("auto");
    expect(container.right).toBeLessThanOrEqual(container.vw);

    // The last column can be scrolled into view without moving the page.
    const activeHeader = table.getByRole("columnheader", { name: "Active" });
    await activeHeader.scrollIntoViewIfNeeded();
    await expect(activeHeader).toBeInViewport();
    await expectNoHorizontalScroll(page);

    // Selecting a user (edit panel) keeps the page within the viewport too.
    await page.getByTestId("admin-users-row").filter({ hasText: "e2e.requester.empty@example.com" }).click();
    await expect(page.getByTestId("admin-users-edit-panel")).toBeVisible();
    await expectNoHorizontalScroll(page);
  });
}
