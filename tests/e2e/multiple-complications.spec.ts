import { expect, test, type Page } from "@playwright/test";

async function openFunctions(page: Page, watch = "Apex") {
  await page.getByRole("button", { name: `Select ${watch}`, exact: true }).click();
  await page.getByRole("button", { name: "Design studio", exact: true }).first().click();
  await page.locator("summary").filter({ hasText: "Strap & function" }).click();
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { Element.prototype.requestFullscreen = async () => { throw new Error("In-page focus"); }; });
});

test("four complications combine, keep live timing, recover drafts and survive save/reopen", async ({ page }, testInfo) => {
  await page.clock.install({ time: new Date("2026-01-26T04:47:00Z") });
  await page.goto("/");
  await openFunctions(page);
  await page.getByRole("combobox", { name: "Complication", exact: true }).selectOption("moonphase");
  for (const name of ["Add Date", "Add GMT", "Add Chronograph"]) await page.getByRole("checkbox", { name, exact: true }).check();
  for (const type of ["moonphase", "date", "gmt", "chronograph"]) await expect(page.locator(`.watch-stage [data-complication="${type}"]`)).toBeVisible();
  await expect(page.locator('.watch-stage [data-chronograph-hand="hours"]')).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Add Weather", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Undo change", exact: true }).click();
  await expect(page.locator(".watch-stage [data-chrono-ring]")).toHaveCount(0);
  await page.getByRole("button", { name: "Redo change", exact: true }).click();
  await expect(page.locator(".watch-stage [data-chrono-ring]")).toBeVisible();
  await page.evaluate(() => localStorage.setItem("watchme.fixture.failWrites", "1"));
  await page.getByRole("button", { name: "Add to collection", exact: true }).click();
  await page.getByLabel("Watch name", { exact: true }).fill("Lunar Grand Complication");
  await page.getByRole("button", { name: "Save watch", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("save unavailable");
  await page.reload();
  for (const type of ["moonphase", "date", "gmt", "chronograph"]) await expect(page.locator(`.watch-stage [data-complication="${type}"]`)).toBeVisible();
  await page.evaluate(() => localStorage.removeItem("watchme.fixture.failWrites"));
  await page.getByRole("button", { name: "Design studio", exact: true }).first().click();
  await page.getByRole("button", { name: "Add to collection", exact: true }).click();
  await page.getByLabel("Watch name", { exact: true }).fill("Lunar Grand Complication");
  await page.getByRole("button", { name: "Save watch", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Lunar Grand Complication", exact: true })).toBeVisible();
  for (const type of ["moonphase", "date", "gmt", "chronograph"]) await expect(page.locator(`.watch-stage [data-complication="${type}"]`)).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Front & center", exact: true }).click();
  await page.getByRole("button", { name: "Start chronograph", exact: true }).click();
  const hand = page.locator('.watch-stage [data-chronograph-hand="minutes"]');
  const angle = await hand.getAttribute("transform");
  await page.clock.fastForward(65000);
  await expect(hand).not.toHaveAttribute("transform", angle!);
  await page.getByRole("button", { name: "Chronograph panel", exact: true }).click();
  await page.getByRole("button", { name: "Digital time", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("four-complications-phone.png") });
});

test("case changes keep compatible extras and time-only clears the whole complication layout", async ({ page }) => {
  await page.goto("/");
  await openFunctions(page);
  await page.getByRole("checkbox", { name: "Add Date", exact: true }).check();
  await page.getByRole("checkbox", { name: "Add GMT", exact: true }).check();
  await page.getByRole("combobox", { name: "Architecture", exact: true }).selectOption("round");
  await expect(page.locator(".watch-stage [data-chrono-ring]")).toHaveCount(0);
  await expect(page.locator('.watch-stage [data-complication="date"]')).toBeVisible();
  await expect(page.locator('.watch-stage [data-complication="gmt"]')).toBeVisible();
  await page.getByRole("combobox", { name: "Complication", exact: true }).selectOption("regulator");
  await expect(page.getByRole("checkbox", { name: "Add Moon phase", exact: true })).toBeDisabled();
  await page.getByRole("combobox", { name: "Complication", exact: true }).selectOption("none");
  await expect(page.locator(".watch-stage [data-complication]")).toHaveCount(0);
});

test("engravings occupy one clear lower-dial footer across standard, mechanical and lunar watches", async ({ page }, testInfo) => {
  await page.goto("/");
  for (const name of ["Monolith", "REACTOR", "PRISM", "NOCTURNE"]) {
    await page.getByRole("button", { name: `Select ${name}`, exact: true }).click();
    await page.getByRole("button", { name: "Design studio", exact: true }).first().click();
    const section = page.locator("details").filter({ has: page.locator("summary").filter({ hasText: "Signature & light" }) });
    if (!(await section.evaluate(element => element.hasAttribute("open")))) await section.locator(":scope > summary").click();
    await page.getByLabel("Dial signature", { exact: true }).fill("LUNAR EDITION");
    await page.getByLabel("Engraved initials", { exact: true }).fill("WM");
    if (name === "NOCTURNE") {
      await page.locator("summary").filter({ hasText: "Strap & function" }).click();
      await page.getByRole("combobox", { name: "Complication", exact: true }).selectOption("moonphase");
    }
    const svg = page.locator(".watch-stage svg");
    await expect(svg.getByText("LUNAR EDITION", { exact: true })).toHaveCount(1);
    await expect(svg.getByText("WM", { exact: true })).toHaveCount(1);
    await expect(svg).not.toContainText("DESIGNED FOR YOU");
    const footer = svg.locator("[data-watch-engraving]");
    await expect(footer).toContainText("LUNAR EDITION");
    const textY = await footer.evaluate(element => (element as unknown as SVGGraphicsElement).getBBox().y);
    expect(textY).toBeGreaterThan(497);
    await page.getByRole("button", { name: "Front & center", exact: true }).click();
    await page.screenshot({ path: testInfo.outputPath(`engraving-${name.toLowerCase()}.png`) });
    await page.getByRole("button", { name: "Back to the studio", exact: true }).click();
  }
});
