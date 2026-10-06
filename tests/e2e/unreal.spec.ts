import { expect, test, type Download, type Page } from "@playwright/test";

async function selectUnreal(page: Page, name: "FLUX" | "WHITEOUT") {
  await page.goto("/");
  await page.getByRole("button", { name: "UNREAL", exact: true }).click();
  await expect(page.locator(".watch-card-main")).toHaveCount(2);
  await page.getByRole("button", { name: `Select ${name}`, exact: true }).click();
  return page.locator(".watch-stage > svg");
}
async function downloadBytes(download: Download) {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
function zipFiles(bytes: Buffer) {
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (bytes.readUInt32LE(offset) === 0x04034b50) {
    const length = bytes.readUInt32LE(offset + 18), names = bytes.readUInt16LE(offset + 26), extra = bytes.readUInt16LE(offset + 28);
    const name = bytes.subarray(offset + 30, offset + 30 + names).toString("utf8");
    const start = offset + 30 + names + extra;
    files.set(name, bytes.subarray(start, start + length)); offset = start + length;
  }
  return files;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { Element.prototype.requestFullscreen = async () => { throw new Error("In-page focus"); }; });
});

for (const [name, texture] of [["FLUX", "liquid"], ["WHITEOUT", "snow"]] as const) {
  test(`${name} moves, responds to interaction, and keeps phone focus controls usable`, async ({ page }, info) => {
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    const face = await selectUnreal(page, name);
    const layer = face.locator(`[data-unreal-layer="${texture}"]`);
    await expect(layer).toBeVisible();
    const frame = await layer.getAttribute("data-unreal-frame");
    await expect(layer).not.toHaveAttribute("data-unreal-frame", frame!);
    await face.press("ArrowRight");
    await expect.poll(async () => Number(await layer.getAttribute("data-unreal-interactions"))).toBeGreaterThan(0);
    await page.screenshot({ path: info.outputPath(`${texture}-desktop.png`), fullPage: true });
    for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 740 }, { width: 844, height: 390 }]) {
      await page.setViewportSize(viewport);
      await page.getByRole("button", { name: "Front & center", exact: true }).click();
      await expect(face).toHaveAttribute("data-framing", "dial");
      await expect(page.getByRole("button", { name: "Atmosphere", exact: true })).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: info.outputPath(`${texture}-focus-${viewport.width}.png`) });
      await page.getByRole("button", { name: "Lume", exact: true }).click();
      await page.screenshot({ path: info.outputPath(`${texture}-lume-${viewport.width}.png`) });
      await page.getByRole("button", { name: "Lume", exact: true }).click();
      await page.getByRole("button", { name: "Back to the studio", exact: true }).click();
    }
    expect(errors).toEqual([]);
  });
}

test("atmosphere settings survive undo, draft recovery, save, reload, and duplication", async ({ page }) => {
  await selectUnreal(page, "WHITEOUT");
  await page.getByRole("button", { name: "Atmosphere", exact: true }).first().click();
  const intensity = page.getByLabel("Atmosphere intensity", { exact: true });
  await intensity.focus(); await intensity.press("End");
  await page.getByLabel("Atmosphere density", { exact: true }).focus();
  await page.getByLabel("Atmosphere density", { exact: true }).press("Home");
  await page.getByLabel("Atmosphere color", { exact: true }).fill("#CC88FF");
  await page.getByLabel("Atmosphere gravity", { exact: true }).selectOption("up");
  await page.getByRole("button", { name: "Calm mode", exact: true }).click();
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.getByRole("button", { name: "Design studio", exact: true }).first().click();
  await page.getByRole("button", { name: "Undo change", exact: true }).click();
  await page.getByRole("button", { name: "Redo change", exact: true }).click();
  await page.reload();
  await page.getByRole("button", { name: "Atmosphere", exact: true }).first().click();
  await expect(page.getByLabel("Atmosphere intensity", { exact: true })).toHaveValue("100");
  await expect(page.getByLabel("Atmosphere density", { exact: true })).toHaveValue("0");
  await expect(page.getByLabel("Atmosphere gravity", { exact: true })).toHaveValue("up");
  await expect(page.getByRole("button", { name: "Calm mode", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Save creation", exact: true }).click();
  await page.getByLabel("Watch name", { exact: true }).fill("Unreal polar violet");
  await page.getByRole("button", { name: "Save watch", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Unreal polar violet", exact: true })).toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("watchme.fixture.studio.v1")!).watches[0].design);
  expect(saved.atmosphere).toEqual({ intensity: 100, density: 0, gravity: "up", color: "#cc88ff", calm: true });
  await page.getByRole("button", { name: "Collection", exact: true }).first().click();
  await page.getByRole("button", { name: "Duplicate", exact: true }).click();
  const copies = await page.evaluate(() => JSON.parse(localStorage.getItem("watchme.fixture.studio.v1")!).watches);
  expect(copies).toHaveLength(2);
  expect(copies[0].design).toEqual(copies[1].design);
});

test("reduced motion stops the atmosphere but preserves explicit interaction and accurate time", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  const face = await selectUnreal(page, "FLUX");
  const layer = face.locator("[data-unreal-layer]");
  const before = await layer.getAttribute("data-unreal-frame");
  const second = face.locator('[data-seconds-hand], [data-clock-hand="seconds"]').first();
  const secondsBefore = await second.getAttribute("transform");
  await page.clock.fastForward(2000);
  await expect(layer).toHaveAttribute("data-unreal-frame", before!);
  await expect(second).not.toHaveAttribute("transform", secondsBefore!);
  await face.press("Space");
  await expect.poll(async () => Number(await layer.getAttribute("data-unreal-interactions"))).toBeGreaterThan(0);
});

test("UNREAL exports the interacted frozen atmosphere and complete settings", async ({ page }, info) => {
  const face = await selectUnreal(page, "FLUX");
  await face.press("ArrowRight"); await face.press("Space");
  await page.getByRole("button", { name: "Download edition card", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Your edition card", exact: true });
  const pack = dialog.getByRole("button", { name: "Download complete edition", exact: true });
  await expect(pack).toBeEnabled();
  await expect(dialog.getByRole("tab", { name: "Atmosphere", exact: true })).toBeVisible();
  const preview = await dialog.locator("canvas").evaluate(element => (element as HTMLCanvasElement).toDataURL());
  await expect.poll(async () => Number(await face.locator("[data-unreal-layer]").getAttribute("data-unreal-interactions"))).toBeGreaterThanOrEqual(2);
  const [download] = await Promise.all([page.waitForEvent("download"), pack.click()]);
  const files = zipFiles(await downloadBytes(download));
  expect(files.size).toBe(4);
  const manifest = JSON.parse(files.get("design.json")!.toString("utf8"));
  expect(manifest.design.family).toBe("flux");
  expect(manifest.design.atmosphere.gravity).toBe("float");
  expect(manifest.presentation.environment.texture).toBe("liquid");
  expect(Number(manifest.presentation.environment.interactions)).toBeGreaterThanOrEqual(2);
  const portrait = [...files.entries()].find(([name]) => name.endsWith(".png") && !name.includes("-build") && !name.includes("-atmosphere"))![1];
  expect(portrait.equals(Buffer.from(preview.split(",")[1], "base64"))).toBe(true);
  await download.saveAs(info.outputPath("flux-collector-edition.zip"));
  await dialog.getByRole("tab", { name: "Atmosphere", exact: true }).click();
  const [atmosphere] = await Promise.all([page.waitForEvent("download"), dialog.getByRole("button", { name: "Download PNG", exact: true }).click()]);
  await atmosphere.saveAs(info.outputPath("flux-atmosphere.png"));
});

test("real touch stirs the dial horizontally and still allows vertical page scrolling", async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const face = await selectUnreal(page, "WHITEOUT");
  const touch = await page.context().newCDPSession(page);
  await touch.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  async function swipe(x: number, y: number, dx: number, dy: number) {
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
    for (let step = 1; step <= 8; step++) await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + dx * step / 8, y: y + dy * step / 8 }] });
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }
  await page.getByRole("button", { name: "Front & center", exact: true }).click();
  const bounds = (await face.boundingBox())!;
  await swipe(bounds.x + bounds.width / 2 - 75, bounds.y + bounds.height / 2 + 35, 150, 0);
  await expect.poll(async () => Number(await face.locator("[data-unreal-layer]").getAttribute("data-unreal-interactions"))).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Back to the studio", exact: true }).click();
  await page.evaluate(() => scrollTo(0, 0));
  const studioBounds = (await face.boundingBox())!;
  const before = await page.evaluate(() => scrollY);
  await swipe(studioBounds.x + studioBounds.width / 2, Math.min(650, studioBounds.y + studioBounds.height / 2), 0, -170);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before + 30);
  await page.getByRole("button", { name: "Atmosphere", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  await page.getByLabel("Atmosphere intensity", { exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("atmosphere-phone-controls.png") });
  await touch.detach();
});
