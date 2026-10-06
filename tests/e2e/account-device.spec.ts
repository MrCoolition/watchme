import { expect, test } from "@playwright/test";

test("switching accounts on one device separates drafts, timers and focus preferences", async ({ page }) => {
  await page.addInitScript(() => { Element.prototype.requestFullscreen = async () => { throw new Error("Use in-page focus"); }; });
  await page.goto("/");
  await page.getByRole("button", { name: "Select Apex", exact: true }).click();
  await page.getByRole("button", { name: "Design studio", exact: true }).first().click();
  await page.getByRole("button", { name: "Rose gold", exact: true }).click();
  await page.getByRole("button", { name: "Start chronograph", exact: true }).click();
  await page.getByRole("button", { name: "Front & center", exact: true }).click();
  await page.getByRole("button", { name: "Digital time", exact: true }).click();
  await expect(page.locator(".focus-time")).toHaveCount(0);
  const previous = await page.evaluate(() => localStorage.getItem("watchme.fixture.studio.v1")!);
  await page.evaluate(() => {
    const fixture = JSON.parse(localStorage.getItem("watchme.fixture.studio.v1")!);
    fixture.account = { id: "11111111-1111-4111-8111-111111111111", username: "visitor", isOwner: false, hasRecoveryCode: true };
    fixture.watches = [];
    localStorage.setItem("watchme.fixture.studio.v1", JSON.stringify(fixture));
  });
  await page.reload();
  await expect(page.locator(".watch-stage > svg")).toHaveAttribute("data-metal", "graphite");
  await expect(page.getByRole("button", { name: "Start chronograph", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Front & center", exact: true }).click();
  await expect(page.locator(".focus-time")).toBeVisible();
  await page.evaluate(value => localStorage.setItem("watchme.fixture.studio.v1", value), previous);
  await page.reload();
  await expect(page.locator(".watch-stage > svg")).toHaveAttribute("data-metal", "rose");
  await expect(page.getByRole("button", { name: "Pause chronograph", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Front & center", exact: true }).click();
  await expect(page.locator(".focus-time")).toHaveCount(0);
});
