import { expect, test } from "@playwright/test";

test("phone chronograph controls move the real hands, record laps, pause, restore, and reset", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Select Apex", exact: true }).click();
  const readout = page.getByLabel("Chronograph elapsed", { exact: true });
  const hand = page.locator('.watch-stage [data-chronograph-hand="seconds"]');
  await expect(page.getByRole("button", { name: "Start chronograph", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Start chronograph", exact: true }).click();
  await page.clock.fastForward(8350);
  await expect(readout).toContainText("00:08");
  await expect(hand).not.toHaveAttribute("transform", "rotate(0 320 350)");
  await page.getByRole("button", { name: "Record lap", exact: true }).click();
  await page.getByRole("button", { name: "Pause chronograph", exact: true }).click();
  const pausedTime = await readout.textContent();
  await page.clock.fastForward(4000);
  await expect(readout).toHaveText(pausedTime!);
  const pausedHand = await hand.getAttribute("transform");
  await page.clock.fastForward(4000);
  await expect(hand).toHaveAttribute("transform", pausedHand!);
  await page.reload();
  await expect(page.getByRole("button", { name: "Resume chronograph", exact: true })).toBeVisible();
  await expect(readout).toHaveText(pausedTime!);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("watchme.timers.v1")!));
  expect(stored.chronograph.laps).toHaveLength(1);
  await page.getByRole("button", { name: "Reset chronograph", exact: true }).click();
  await page.clock.fastForward(1000);
  await expect(readout).toContainText("00:00");
  await expect(hand).toHaveAttribute("transform", "rotate(0 320 350)");
});

test("case pushers control the stopwatch and controls remain available in focus", async ({ page }) => {
  await page.addInitScript(() => { document.documentElement.requestFullscreen = async () => { throw new Error("Use in-page display"); }; });
  await page.goto("/");
  await page.getByRole("button", { name: "Select Apex", exact: true }).click();
  await page.getByRole("button", { name: "Chronograph pusher: start/pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause chronograph", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Chronograph pusher: start/pause", exact: true }).press("Enter");
  await expect(page.getByRole("button", { name: "Resume chronograph", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Chronograph pusher: reset", exact: true }).press("Space");
  await expect(page.getByRole("button", { name: "Start chronograph", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Front & center", exact: true }).click();
  await page.getByRole("button", { name: "Start chronograph", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause chronograph", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset chronograph", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start chronograph", exact: true })).toBeVisible();
});

test("REACTOR offers real mechanics, Eclipse, engraving and a valid PNG edition card", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Discover REACTOR", exact: true }).click();
  await expect(page.getByRole("heading", { name: "REACTOR", exact: true })).toBeVisible();
  await expect(page.locator(".watch-stage [data-mechanical-movement]")).toBeVisible();
  await page.getByRole("button", { name: "Eclipse", exact: true }).click();
  await expect(page.locator(".watch-stage svg")).toHaveAttribute("data-eclipse", "true");
  await page.getByRole("button", { name: "Start chronograph", exact: true }).click();
  await expect(page.locator(".watch-stage [data-chrono-ring]")).toBeVisible();
  await page.getByRole("button", { name: "Pause chronograph", exact: true }).click();
  await page.getByRole("button", { name: "Design studio", exact: true }).first().click();
  await page.locator("summary").filter({ hasText: "Signature & light" }).click();
  await page.getByLabel("Engraved initials", { exact: true }).fill("MC");
  await expect(page.locator(".watch-stage svg")).toContainText("MC");
  await page.getByRole("button", { name: "Download edition card", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download PNG", exact: true }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.png$/);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(chunk);
  const bytes = Buffer.concat(chunks);
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(bytes.readUInt32BE(16)).toBe(1080);
  expect(bytes.readUInt32BE(20)).toBe(1350);
  expect(bytes.length).toBeGreaterThan(50000);
  expect(errors).toEqual([]);
});

test("chronograph and Eclipse controls stay on screen in narrow and landscape focus", async ({ page }) => {
  await page.addInitScript(() => { document.documentElement.requestFullscreen = async () => { throw new Error("In-page focus"); }; });
  await page.goto("/");
  await page.getByRole("button", { name: "Discover REACTOR", exact: true }).click();
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 740 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.getByRole("button", { name: "Front & center", exact: true }).click();
    for (const name of ["Start chronograph", "Reset chronograph", "Record lap", "Eclipse", "Back to the studio"]) {
      await expect(page.getByRole("button", { name, exact: true })).toBeInViewport({ ratio: 1 });
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Back to the studio", exact: true }).click();
  }
});

test("REACTOR reflections respond to keyboard and dragging while reduced motion still allows timing", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Discover REACTOR", exact: true }).click();
  const stage = page.locator('.watch-stage[aria-label="Interactive watch lighting"]');
  const reflection = stage.locator('[data-reactive-reflection]');
  const initialX = await reflection.getAttribute("cx");
  await stage.press("ArrowRight");
  await page.clock.fastForward(100);
  await expect(reflection).not.toHaveAttribute("cx", initialX!);
  await stage.press("Home");
  await page.clock.fastForward(100);
  await expect(reflection).toHaveAttribute("cx", initialX!);
  const bounds = (await stage.boundingBox())!;
  await page.mouse.move(bounds.x + bounds.width * .35, bounds.y + bounds.height * .3);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * .7, bounds.y + bounds.height * .4);
  await page.mouse.up();
  await page.clock.fastForward(100);
  await expect(reflection).not.toHaveAttribute("cx", initialX!);
  const gear = stage.locator('[data-mechanical-gear]').first();
  const stillGear = await gear.getAttribute("transform");
  await page.getByRole("button", { name: "Start chronograph", exact: true }).click();
  await page.clock.fastForward(2300);
  await expect(page.getByLabel("Chronograph elapsed", { exact: true })).toContainText("00:02");
  await expect(gear).toHaveAttribute("transform", stillGear!);
});
