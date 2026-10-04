import { expect, test, type Page } from "@playwright/test";

// Actual WatchStudio, renderer, hooks, dialogs and CSS with test-only persistence doubles.
// These are UI integration tests, not proof of deployed authentication or Neon persistence.
async function openStudio(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Monolith", exact: true })).toBeVisible();
}
async function edit(page: Page) { await page.getByRole("button", { name: "Design studio", exact: true }).first().click(); }
async function collection(page: Page) { await page.getByRole("button", { name: "Collection", exact: true }).first().click(); }
async function save(page: Page, name: string) {
  await page.getByRole("button", { name: "Add to collection", exact: true }).click();
  await page.getByLabel("Watch name").fill(name);
  await page.getByRole("button", { name: "Save watch", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Sign your creation.", exact: true })).toHaveCount(0);
}

test("six originals select without runtime errors and preserve the active selection", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await openStudio(page);
  for (const name of ["Pelagic", "Apex", "Vesper", "Meridian", "Orbit", "Monolith"]) {
    await page.getByRole("button", { name: `Select ${name}`, exact: true }).click();
    await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: `Select ${name}`, exact: true })).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "Select Orbit", exact: true }).click();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Orbit", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test("customize, save, reopen, favorite, duplicate, rename, and remove a creation", async ({ page }) => {
  await openStudio(page); await edit(page);
  await page.getByRole("button", { name: "Rose gold", exact: true }).click();
  await page.getByRole("button", { name: "Ultraviolet dial", exact: true }).click();
  await save(page, "Midnight Atelier");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Midnight Atelier", exact: true })).toBeVisible();
  await expect(page.getByText("Rose gold", { exact: true }).first()).toBeVisible();
  await page.getByRole("button", { name: "Favorite", exact: true }).click();
  await expect(page.getByRole("button", { name: "Favorited", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Midnight Atelier II", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Rename", exact: true }).click();
  await page.getByLabel("Watch name").fill("Atelier Two");
  await page.getByRole("button", { name: "Rename watch", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Atelier Two", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.getByRole("button", { name: "Remove watch", exact: true }).click();
  await expect(page.getByRole("button", { name: "Select Atelier Two", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Select Midnight Atelier", exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: /My creations/ }).click();
  await expect(page.getByRole("button", { name: "Unfavorite Midnight Atelier", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("undo, redo, reload recovery, and failed saves preserve the unfinished design", async ({ page }) => {
  await openStudio(page); await edit(page);
  await page.getByRole("button", { name: "Burgundy dial", exact: true }).click();
  await page.getByRole("button", { name: "Undo change", exact: true }).click();
  await expect(page.getByRole("button", { name: "Jade dial", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Redo change", exact: true }).click();
  await expect(page.getByRole("button", { name: "Burgundy dial", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "Burgundy dial", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => localStorage.setItem("watchme.fixture.failWrites", "1"));
  await page.getByRole("button", { name: "Add to collection", exact: true }).click();
  await page.getByLabel("Watch name").fill("Unfinished original");
  await page.getByRole("button", { name: "Save watch", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Your draft is still on this device");
  await page.reload();
  await expect(page.getByRole("button", { name: "Burgundy dial", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("focus mode works without fullscreen and reports denied keep-awake", async ({ page }) => {
  await page.addInitScript(() => {
    document.documentElement.requestFullscreen = async () => { throw new Error("Fullscreen declined"); };
    Object.defineProperty(navigator, "wakeLock", { configurable: true, value: { request: async () => { throw new Error("Permission declined"); } } });
  });
  await openStudio(page);
  await page.getByRole("button", { name: "Enter focus mode", exact: true }).first().click();
  await expect(page.getByRole("button", { name: "Back to the studio", exact: true })).toBeVisible();
  const lume = page.getByRole("button", { name: "Lume", exact: true });
  await lume.click(); await expect(lume).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Keep awake", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Keep awake was declined");
  await expect(page.getByRole("button", { name: "Staying awake", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Back to the studio", exact: true }).click();
  await expect(page.getByRole("button", { name: "Select Monolith", exact: true })).toBeVisible();
});

test("chronograph laps survive reload and countdown reaches a visible completion state", async ({ page }) => {
  await page.clock.install();
  await openStudio(page);
  await page.getByRole("button", { name: "Chronograph and countdown", exact: true }).click();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.clock.fastForward(4200);
  await page.getByRole("button", { name: "Record lap", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator(".lap-list")).toContainText("01");
  await page.reload();
  await page.getByRole("button", { name: "Chronograph and countdown", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await expect(page.locator(".lap-list")).toContainText("01");
  await page.getByRole("button", { name: "Countdown", exact: true }).click();
  await page.getByLabel("Duration", { exact: true }).fill("1");
  await page.getByLabel("Duration", { exact: true }).blur();
  await page.getByRole("button", { name: "Start", exact: true }).click();
  await page.clock.fastForward(61_000);
  await expect(page.getByText("Time’s up.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset countdown", exact: true }).click();
  await expect(page.getByText("Time’s up.", { exact: true })).toHaveCount(0);
});

test("narrow mobile layout remains inside viewport while editing and saving", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openStudio(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Watch customization", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Midnight dial", exact: true }).click();
  await save(page, "Pocket midnight");
  await page.getByRole("button", { name: "Close customization", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pocket midnight", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("a case change prevents a chronograph from overlapping an incompatible round layout", async ({ page }) => {
  await openStudio(page);
  await page.getByRole("button", { name: "Select Apex", exact: true }).click(); await edit(page);
  await page.getByRole("combobox", { name: "Architecture", exact: true }).selectOption("round");
  await page.locator("summary").filter({ hasText: "Strap & function" }).click();
  await expect(page.getByRole("combobox", { name: "Complication", exact: true })).toHaveValue("none");
  await expect(page.getByRole("combobox", { name: "Complication", exact: true }).getByRole("option", { name: /Chronograph/ })).toHaveJSProperty("disabled", true);
  await collection(page);
  await expect(page.getByText("Time only", { exact: true })).toBeVisible();
});
