import { expect, test, type Page } from "@playwright/test";

async function openCatalog(page: Page) {
  await page.getByRole("button", { name: "Parts catalog", exact: true }).first().click();
  await expect(page.getByRole("dialog", { name: "The parts library.", exact: true })).toBeVisible();
  await expect(page.getByLabel("Search catalog", { exact: true })).toBeVisible();
}
async function choose(page: Page, option: string, category?: string) {
  await page.getByLabel("Search catalog", { exact: true }).fill(option);
  if (category) await page.getByLabel("Catalog category", { exact: true }).selectOption(category);
  await page.getByRole("button", { name: `View ${option}`, exact: true }).click();
}
async function apply(page: Page, option: string) {
  await choose(page, option);
  await page.getByRole("button", { name: "Apply catalog option", exact: true }).click();
  await expect(page.locator(".catalog-success")).toContainText("applied");
}
async function closeCatalog(page: Page) { await page.getByRole("button", { name: "Close dialog", exact: true }).click(); }

test("catalog loads on demand, searches the full source, filters support and preserves references", async ({ page }, info) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  expect(await page.evaluate(() => performance.getEntriesByType("resource").some(entry => /watch-catalog-data/.test(entry.name)))).toBe(false);
  await openCatalog(page);
  await expect(page.getByRole("button", { name: /All entries 1,431/ })).toBeVisible();
  await expect(page.locator(".catalog-entry")).toHaveCount(36);
  await page.getByRole("button", { name: "Next catalog page", exact: true }).click();
  await expect(page.getByRole("button", { name: "Previous catalog page", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Apply now", exact: true }).click();
  await expect(page.locator(".catalog-list .catalog-support-badge.reference")).toHaveCount(0);
  await page.getByRole("button", { name: "Reset filters", exact: true }).click();
  await apply(page, "Malachite dial");
  await expect(page.locator('.catalog-watch-preview [data-part-texture="malachite"]')).toBeVisible();
  await choose(page, "ECG recording app");
  await expect(page.locator(".catalog-reference-note")).toContainText("not provided");
  await expect(page.getByRole("button", { name: "Apply catalog option", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Save catalog reference", exact: true }).click();
  await page.getByRole("button", { name: /Saved references 1/ }).click();
  await expect(page.getByRole("button", { name: "View ECG recording app", exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("catalog-reference-desktop.png") });
  await closeCatalog(page);
  await page.getByRole("button", { name: "Design studio", exact: true }).first().click();
  await page.getByRole("button", { name: "Add to collection", exact: true }).click();
  await page.getByLabel("Watch name", { exact: true }).fill("Malachite catalog edition");
  await page.getByRole("button", { name: "Save watch", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.watch-stage [data-part-texture="malachite"]')).toBeVisible();
  await openCatalog(page);
  await page.getByRole("button", { name: /Saved references 1/ }).click();
  await choose(page, "ECG recording app");
  await page.getByRole("button", { name: "Remove catalog reference", exact: true }).click();
  await expect(page.getByRole("button", { name: /Saved references 0/ })).toBeVisible();
  await page.getByRole("button", { name: /Watch terms 30/ }).click();
  await page.getByLabel("Search catalog", { exact: true }).fill("");
  await expect(page.locator(".catalog-terms article")).toHaveCount(30);
  expect(errors).toEqual([]);
});

test("calendar conflicts explain the occupied window and date rolls over in the watch zone", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-04T03:59:00Z") });
  await page.clock.pauseAt(new Date("2026-10-04T03:59:58Z"));
  await page.goto("/"); await openCatalog(page);
  await choose(page, "Day-date", "Functions and complications");
  await page.getByRole("button", { name: "Apply catalog option", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("share the calendar window");
  await expect(page.locator('.catalog-watch-preview [data-complication="date"]')).toBeVisible();
  await closeCatalog(page);
  await page.getByRole("button", { name: "Design studio", exact: true }).first().click();
  await page.locator("summary").filter({ hasText: "Strap & function" }).click();
  await page.getByRole("combobox", { name: "Complication", exact: true }).selectOption("daydate");
  await page.getByRole("checkbox", { name: "Add Calendar", exact: true }).check();
  const calendar = page.locator('.watch-stage [data-complication="calendar"]');
  await expect(calendar).toHaveAttribute("data-calendar-day", "3");
  await page.clock.fastForward(3100);
  await expect(calendar).toHaveAttribute("data-calendar-day", "4");
  await expect(calendar.locator('[data-calendar-field="weekday"]')).toHaveText("SUN");
  await expect(page.getByRole("checkbox", { name: "Add Moon phase", exact: true })).toBeDisabled();
});

test("catalog on a narrow phone keeps apply and navigation reachable", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/"); await openCatalog(page);
  await choose(page, "Mother-of-pearl dial");
  await page.getByRole("button", { name: "Apply catalog option", exact: true }).click();
  await expect(page.locator(".catalog-success")).toContainText("applied");
  expect(await page.locator("dialog").evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath("catalog-phone-detail.png") });
  await page.getByRole("button", { name: "Back to results", exact: true }).click();
  await expect(page.getByLabel("Search catalog", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('.watch-stage [data-part-texture="motherofpearl"]')).toBeVisible();
});

test("catalog appearance changes take part in undo and local draft recovery", async ({ page }) => {
  await page.goto("/"); await openCatalog(page);
  await apply(page, "Malachite dial"); await closeCatalog(page);
  await page.getByRole("button", { name: "Design studio", exact: true }).first().click();
  await page.getByRole("button", { name: "Undo change", exact: true }).click();
  await expect(page.locator('.watch-stage [data-part-texture="malachite"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Redo change", exact: true }).click();
  await page.reload();
  await expect(page.locator('.watch-stage [data-part-texture="malachite"]')).toBeVisible();
});
