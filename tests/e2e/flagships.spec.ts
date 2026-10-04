import { expect, test } from "@playwright/test";

const flagships = [
  ["PHANTOM", "turbine"], ["HELIOS", "solar"], ["ABYSS", "abyssal"], ["PRISM", "prismatic"], ["NOCTURNE", "aventurine"],
] as const;

for (const [name, texture] of flagships) {
  test(`${name} has its own artwork, usable phone focus, Eclipse, and edition export`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => { Element.prototype.requestFullscreen = async () => { throw new Error("In-page focus"); }; });
    const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto("/");
    await page.getByRole("button", { name: `Select ${name}`, exact: true }).click();
    const face = page.locator(".watch-stage svg");
    await expect(face).toHaveAttribute("data-flagship-family", name.toLowerCase());
    await expect(face.locator(`[data-flagship-artwork="${texture}"]`)).toBeVisible();
    if (name === "PHANTOM") await expect(page.getByRole("button", { name: "Start chronograph", exact: true })).toBeInViewport({ ratio: 1 });
    await page.getByRole("button", { name: "Front & center", exact: true }).click();
    await expect(face).toHaveAttribute("data-framing", "dial");
    await page.screenshot({ path: testInfo.outputPath(`${name.toLowerCase()}-phone.png`) });
    await page.getByRole("button", { name: "Eclipse", exact: true }).click();
    await expect(face).toHaveAttribute("data-eclipse", "true");
    await page.screenshot({ path: testInfo.outputPath(`${name.toLowerCase()}-eclipse.png`) });
    await page.getByRole("button", { name: "Eclipse", exact: true }).click();
    await page.getByRole("button", { name: "Download edition card", exact: true }).click();
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("dialog").getByRole("button", { name: "Download PNG", exact: true }).click();
    const download = await downloadEvent;
    expect(download.suggestedFilename()).toContain(name.toLowerCase());
    const stream = await download.createReadStream();
    const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    expect(bytes.readUInt32BE(16)).toBe(1080); expect(bytes.readUInt32BE(20)).toBe(1350);
    expect(bytes.length).toBeGreaterThan(50000);
    expect(errors).toEqual([]);
  });
}

test("Black Label filters the collection and every new flagship saves and reopens intact", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Black Label", exact: true }).click();
  await expect(page.locator(".watch-card-main")).toHaveCount(6);
  for (const [name, texture] of flagships) {
    await page.getByRole("button", { name: "Originals", exact: true }).click();
    await page.getByRole("button", { name: `Select ${name}`, exact: true }).click();
    await page.getByRole("button", { name: "Design studio", exact: true }).first().click();
    await page.getByRole("button", { name: "Add to collection", exact: true }).click();
    await page.getByLabel("Watch name", { exact: true }).fill(`${name} custom`);
    await page.getByRole("button", { name: "Save watch", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("heading", { name: `${name} custom`, exact: true })).toBeVisible();
    await expect(page.locator(`.watch-stage [data-flagship-artwork="${texture}"]`)).toBeVisible();
  }
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("watchme.fixture.studio.v1")!).watches);
  expect(saved).toHaveLength(5);
  for (const [name, texture] of flagships) expect(saved.find((watch: { name: string }) => watch.name === `${name} custom`).design).toMatchObject({ family: name.toLowerCase(), texture });
});

test("NOCTURNE day/night follows the selected time zone and live clock", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-04T16:00:00Z") });
  await page.goto("/");
  await page.getByRole("button", { name: "Select NOCTURNE", exact: true }).click();
  async function zone(value: string) {
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("combobox", { name: "Local time zone", exact: true }).selectOption(value);
    await page.getByRole("button", { name: "Save preferences", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await zone("America/New_York");
  await expect(page.locator(".watch-stage [data-daynight-hour]")).toHaveAttribute("data-daynight-hour", "12");
  await expect(page.locator(".watch-stage [data-daynight-state]")).toHaveAttribute("data-daynight-state", "day");
  await zone("Asia/Tokyo");
  await expect(page.locator(".watch-stage [data-daynight-hour]")).toHaveAttribute("data-daynight-hour", "1");
  await expect(page.locator(".watch-stage [data-daynight-state]")).toHaveAttribute("data-daynight-state", "night");
  await page.clock.setSystemTime(new Date("2026-10-04T21:00:00Z"));
  await page.clock.fastForward(1000);
  await expect(page.locator(".watch-stage [data-daynight-hour]")).toHaveAttribute("data-daynight-hour", "6");
  await expect(page.locator(".watch-stage [data-daynight-state]")).toHaveAttribute("data-daynight-state", "day");
});

test("flagship titles and display controls fit desktop and tablet full-watch layouts", async ({ page }) => {
  await page.goto("/");
  for (const viewport of [{ width: 1440, height: 1050 }, { width: 768, height: 1024 }]) {
    await page.setViewportSize(viewport);
    for (const name of ["PHANTOM", "NOCTURNE"]) {
      await page.getByRole("button", { name: `Select ${name}`, exact: true }).click();
      await page.getByRole("button", { name: "Full watch", exact: true }).click();
      const title = page.getByRole("heading", { name, exact: true });
      expect(await title.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
      const focus = (await page.getByRole("button", { name: "Front & center", exact: true }).boundingBox())!;
      for (const label of ["Eclipse", "Watch controls"]) {
        const control = (await page.getByRole("button", { name: label, exact: true }).boundingBox())!;
        const overlapX = Math.max(0, Math.min(focus.x + focus.width, control.x + control.width) - Math.max(focus.x, control.x));
        const overlapY = Math.max(0, Math.min(focus.y + focus.height, control.y + control.height) - Math.max(focus.y, control.y));
        expect(overlapX * overlapY).toBe(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test("all five flagships expose an unobscured focus button on the narrowest phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  for (const [name] of flagships) {
    await page.getByRole("button", { name: `Select ${name}`, exact: true }).click();
    const focus = page.getByRole("button", { name: "Front & center", exact: true });
    await expect(focus).toBeInViewport({ ratio: 1 });
    await focus.click({ trial: true });
  }
});
