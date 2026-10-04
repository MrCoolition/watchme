import { expect, test, type Page } from "@playwright/test";

async function useMoonPhase(page: Page, name = "NOCTURNE") {
  await page.getByRole("button", { name: `Select ${name}`, exact: true }).click();
  await page.getByRole("button", { name: "Design studio", exact: true }).first().click();
  await page.locator("summary").filter({ hasText: "Strap & function" }).click();
  await page.getByRole("combobox", { name: "Complication", exact: true }).selectOption("moonphase");
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { Element.prototype.requestFullscreen = async () => { throw new Error("In-page focus"); }; });
});

test("focus independently hides digital time and the timer panel, preserves a running timer and remembers choices", async ({ page }) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Select Apex", exact: true }).click();
  await page.getByRole("button", { name: "Front & center", exact: true }).click();
  await page.getByRole("button", { name: "Start chronograph", exact: true }).click();
  await page.clock.fastForward(3100);
  const face = page.locator(".watch-stage svg");
  const before = (await face.boundingBox())!;
  await page.getByRole("button", { name: "Chronograph panel", exact: true }).click();
  await expect(page.locator(".chronograph-deck.is-immersive")).toHaveCount(0);
  await expect(page.locator(".focus-time")).toBeVisible();
  await page.getByRole("button", { name: "Digital time", exact: true }).click();
  await expect(page.locator(".focus-time")).toHaveCount(0);
  expect((await face.boundingBox())!.width).toBeGreaterThan(before.width);
  const seconds = face.locator('[data-chronograph-hand="seconds"]');
  const initialAngle = await seconds.getAttribute("transform");
  await page.clock.fastForward(5000);
  await expect(seconds).not.toHaveAttribute("transform", initialAngle!);
  await page.getByRole("button", { name: "Edge-to-edge dial", exact: true }).click();
  await page.getByRole("button", { name: "Chronograph pusher: start/pause", exact: true }).click();
  await page.getByRole("button", { name: "Chronograph panel", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume chronograph", exact: true })).toBeVisible();
  const readout = page.getByLabel("Chronograph elapsed", { exact: true });
  const pausedTime = (await readout.textContent())!;
  const [minutes, secondsElapsed] = pausedTime.split(":").map(Number);
  expect(minutes * 60 + secondsElapsed).toBeGreaterThanOrEqual(8.1);
  await page.clock.fastForward(2000);
  await expect(readout).toHaveText(pausedTime);
  await page.getByRole("button", { name: "Chronograph panel", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Front & center", exact: true }).click();
  await expect(page.getByRole("button", { name: "Digital time", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "Chronograph panel", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".chronograph-deck.is-immersive, .focus-time")).toHaveCount(0);
});

test("five focus switches fit narrow phones and landscape with the panel shown or hidden", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Select Apex", exact: true }).click();
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 740 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.getByRole("button", { name: "Front & center", exact: true }).click();
    for (const name of ["Edge-to-edge dial", "Digital time", "Chronograph panel", "Lume", "Keep awake", "Start chronograph"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeInViewport({ ratio: 1 });
    }
    await page.getByRole("button", { name: "Chronograph panel", exact: true }).click();
    await page.getByRole("button", { name: "Digital time", exact: true }).click();
    await expect(page.locator(".chronograph-deck.is-immersive, .focus-time")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`clean-focus-${viewport.width}.png`) });
    await page.getByRole("button", { name: "Chronograph panel", exact: true }).click();
    await page.getByRole("button", { name: "Digital time", exact: true }).click();
    await page.getByRole("button", { name: "Back to the studio", exact: true }).click();
  }
});

test("old display preferences keep timer controls available and non-chronographs omit the panel switch", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("watchme.display.v1", JSON.stringify({ version: 1, digitalTime: false, mobileFraming: "face", desktopFraming: "watch", edgeToEdge: true })));
  await page.goto("/");
  await page.getByRole("button", { name: "Select Apex", exact: true }).click();
  await page.getByRole("button", { name: "Front & center", exact: true }).click();
  await expect(page.getByRole("button", { name: "Chronograph panel", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Start chronograph", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next watch", exact: true }).click();
  await expect(page.getByRole("button", { name: "Chronograph panel", exact: true })).toHaveCount(0);
});

test("moon phase changes with the real date, survives save/reopen, and exports a rendered moon", async ({ page }, testInfo) => {
  await page.clock.install({ time: new Date("2026-01-03T10:03:00Z") });
  await page.goto("/");
  await useMoonPhase(page);
  const moon = page.locator(".watch-stage [data-moon-disc]");
  await expect(moon).toHaveAttribute("data-moon-name", "Full moon");
  expect(Number(await moon.getAttribute("data-moon-illumination"))).toBeGreaterThan(.997);
  await page.getByRole("button", { name: "Add to collection", exact: true }).click();
  await page.getByLabel("Watch name", { exact: true }).fill("Lunar Nocturne");
  await page.getByRole("button", { name: "Save watch", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Lunar Nocturne", exact: true })).toBeVisible();
  await expect(moon).toHaveAttribute("data-moon-name", "Full moon");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Front & center", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("lunar-full.png") });
  await page.clock.setSystemTime(new Date("2026-01-10T15:48:00Z"));
  await page.clock.fastForward(1000);
  await expect(moon).toHaveAttribute("data-moon-name", "Last quarter");
  await page.screenshot({ path: testInfo.outputPath("lunar-last-quarter.png") });
  await page.clock.setSystemTime(new Date("2026-01-18T19:52:00Z"));
  await page.clock.fastForward(1000);
  await expect(moon).toHaveAttribute("data-moon-name", "New moon");
  expect(Number(await moon.getAttribute("data-moon-illumination"))).toBeLessThan(.003);
  await page.screenshot({ path: testInfo.outputPath("lunar-new.png") });
  await page.clock.setSystemTime(new Date("2026-01-26T04:47:00Z"));
  await page.clock.fastForward(1000);
  await expect(moon).toHaveAttribute("data-moon-name", "First quarter");
  await page.screenshot({ path: testInfo.outputPath("lunar-first-quarter.png") });
  await page.getByRole("button", { name: "Eclipse", exact: true }).click();
  await page.screenshot({ path: testInfo.outputPath("lunar-eclipse.png") });
  await page.getByRole("button", { name: "Download edition card", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("dialog").getByRole("button", { name: "Download PNG", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("lunar-nocturne");
  await download.saveAs(testInfo.outputPath("lunar-edition.png"));
});
