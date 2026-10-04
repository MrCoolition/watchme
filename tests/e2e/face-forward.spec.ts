import { expect, test } from "@playwright/test";

test("phones open face first, expand the dial, and remember display choices", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    document.documentElement.requestFullscreen = async () => { throw new Error("In-page focus"); };
  });
  await page.goto("/");
  const face = page.locator(".watch-stage svg");
  await expect(face).toHaveAttribute("data-framing", "face");
  const initialBounds = await face.boundingBox();
  expect(initialBounds!.width).toBeGreaterThan(320);
  await page.getByRole("button", { name: "Front & center", exact: true }).click();
  await expect(page.getByRole("button", { name: "Back to the studio", exact: true })).toBeVisible();
  await expect(face).toHaveAttribute("data-framing", "dial");
  await page.getByRole("button", { name: "Edge-to-edge dial", exact: true }).click();
  await expect(face).toHaveAttribute("data-framing", "face");
  await page.getByRole("button", { name: "Edge-to-edge dial", exact: true }).click();
  await expect(page.getByRole("button", { name: "Digital time", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next watch", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Pelagic", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Previous watch", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Monolith", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Back to the studio", exact: true }).click();
  await page.getByRole("button", { name: "Full watch", exact: true }).click();
  await expect(face).toHaveAttribute("data-framing", "watch");
  await page.reload();
  await expect(face).toHaveAttribute("data-framing", "watch");
  await page.getByRole("button", { name: "Face only", exact: true }).click();
  await expect(face).toHaveAttribute("data-framing", "face");
});

test("atelier finishes, inscription, lume, and movement survive save and reopen", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Design studio", exact: true }).first().click();
  await page.getByRole("button", { name: "Atelier looks", exact: true }).first().click();
  await page.getByRole("button", { name: "Apply After Hours look", exact: true }).click();
  await page.getByRole("button", { name: "Edit details", exact: true }).click();
  await expect(page.getByRole("button", { name: "Black ceramic", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Undo change", exact: true }).click();
  await expect(page.getByRole("button", { name: "Brushed steel", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Redo change", exact: true }).click();
  await expect(page.getByRole("button", { name: "Black ceramic", exact: true })).toHaveAttribute("aria-pressed", "true");
  const signatureSection = page.locator("details").filter({ has: page.locator("summary").filter({ hasText: "Signature & light" }) });
  if (!await signatureSection.evaluate(element => (element as HTMLDetailsElement).open)) await signatureSection.locator(":scope > summary").click();
  await page.getByRole("combobox", { name: "Bezel", exact: true }).selectOption("iced");
  await page.getByLabel("Dial signature", { exact: true }).fill("NIGHT SHIFT");
  await page.getByRole("combobox", { name: "Seconds motion", exact: true }).selectOption("tick");
  await page.getByRole("button", { name: "Add to collection", exact: true }).click();
  await page.getByLabel("Watch name", { exact: true }).fill("After hours custom");
  await page.getByRole("button", { name: "Save watch", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "After hours custom", exact: true })).toBeVisible();
  const design = await page.evaluate(() => JSON.parse(localStorage.getItem("watchme.fixture.studio.v1")!).watches[0].design);
  expect(design).toMatchObject({ metal: "ceramic", bezel: "iced", signature: "NIGHT SHIFT", secondsMotion: "tick" });
  expect(design.lumeColor).toMatch(/^#[a-f\d]{6}$/i);
  await expect(page.locator(".watch-stage svg")).toContainText("NIGHT SHIFT");
  expect(errors).toEqual([]);
});

test("all originals stay readable on the narrowest phone and in landscape", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const name of ["Monolith", "Pelagic", "Apex", "Vesper", "Meridian", "Orbit"]) {
    await page.getByRole("button", { name: `Select ${name}`, exact: true }).click();
    await expect(page.locator(".watch-stage svg")).toHaveAttribute("data-framing", "face");
    const box = await page.locator(".watch-stage svg").boundingBox();
    expect(box!.width).toBeGreaterThan(270);
    expect(box!.x).toBeGreaterThanOrEqual(-1);
    expect(box!.x + box!.width).toBeLessThanOrEqual(321);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "Front & center", exact: true }).click();
  await expect(page.getByRole("button", { name: "Back to the studio", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
