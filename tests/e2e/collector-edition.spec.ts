import { expect, test, type Download, type Page } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { PRESETS } from "../../src/lib/presets";
import { WATCH_CATALOG_SUPPLEMENT } from "../../src/lib/watch-catalog-supplement";
import { DEFAULT_PREFERENCES, type WatchDesign } from "../../src/lib/types";

const workbook = JSON.parse(readFileSync(new URL("../../src/lib/watch-catalog-data.json", import.meta.url), "utf8")) as { entries: { id: string; option: string }[] };
const references = [...workbook.entries, ...WATCH_CATALOG_SUPPLEMENT].sort((a, b) => b.option.length - a.option.length).slice(0, 40).map(entry => entry.id);
const design: WatchDesign = {
  ...PRESETS.find(preset => preset.id === "reactor")!.design,
  caseShape: "hexagonal", metal: "bronze", caseFinish: "hammered", bezel: "coined", crystalStyle: "domed",
  texture: "mechanical", dialColor: "#061D2A", accentColor: "#6EE7CE", hands: "cathedral", markers: "california", chapterRing: "railroad",
  strap: "nato", strapColor: "#273B40", braceletStyle: "engineer", lumeColor: "#B5F7CB", lumeStyle: "hands-only",
  complication: "chronograph", additionalComplications: ["date", "moonphase", "gmt"],
  secondsIndication: "chronograph", secondsPlacement: "peripheral", secondsMotion: "stepped", secondsAdvances: 16,
  secondsSetting: "zero-reset", chronographBehavior: "flyback", signature: "NIGHT & OCEAN", initials: "WM", catalogReferences: references,
};
const watchName = "NIGHTFALL / The collector’s mechanical constellation";
async function openEdition(page: Page) {
  const id = "00000000-0000-4000-8000-000000000001";
  await page.addInitScript(data => localStorage.setItem("watchme.fixture.studio.v1", JSON.stringify(data)), {
    watches: [{ id, name: watchName, design, favorite: false, createdAt: "2026-10-04T00:00:00Z", updatedAt: "2026-10-04T00:00:00Z" }],
    preferences: { ...DEFAULT_PREFERENCES, primaryTimezone: "America/New_York", secondaryTimezone: "Asia/Tokyo", activeWatchId: id },
  });
  await page.goto("/");
  if ((page.viewportSize()?.width ?? 1440) < 680) {
    await page.getByRole("button", { name: "Enter focus mode", exact: true }).first().click();
  }
  await page.getByRole("button", { name: "Download edition card", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Your edition card", exact: true });
  await expect(dialog.getByRole("button", { name: "Download PNG", exact: true })).toBeEnabled();
  return dialog;
}
async function bytes(download: Download) {
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}
function storedZipFiles(archive: Buffer) {
  const files = new Map<string, Buffer>();
  let offset = 0;
  while (archive.readUInt32LE(offset) === 0x04034b50) {
    expect(archive.readUInt16LE(offset + 8)).toBe(0);
    const size = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const name = archive.subarray(offset + 30, offset + 30 + nameLength).toString("utf8");
    const start = offset + 30 + nameLength + extraLength;
    files.set(name, archive.subarray(start, start + size));
    offset = start + size;
  }
  expect(archive.readUInt32LE(offset)).toBe(0x02014b50);
  expect(archive.readUInt16LE(archive.length - 12)).toBe(files.size);
  return files;
}

test("collector set exports every customization and all forty references without clipping the page count", async ({ page }, info) => {
  test.setTimeout(60000);
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  const dialog = await openEdition(page);
  await expect(dialog.getByRole("tab", { name: "References 4", exact: true })).toBeVisible();
  await dialog.getByRole("tab", { name: "Build sheet", exact: true }).click();
  const downloadButton = dialog.getByRole("button", { name: "Download PNG", exact: true });
  await expect(downloadButton).toBeEnabled();
  const preview = await dialog.locator("canvas").evaluate(node => (node as HTMLCanvasElement).toDataURL());
  const [build] = await Promise.all([page.waitForEvent("download"), downloadButton.click()]);
  const buildBytes = await bytes(build);
  expect(build.suggestedFilename()).toContain("build");
  expect(buildBytes.equals(Buffer.from(preview.split(",")[1], "base64"))).toBe(true);
  await build.saveAs(info.outputPath("collector-build.png"));
  await dialog.getByRole("tab", { name: "References 4", exact: true }).click();
  await expect(downloadButton).toBeEnabled();
  const [pack] = await Promise.all([page.waitForEvent("download"), dialog.getByRole("button", { name: "Download complete edition", exact: true }).click()]);
  expect(pack.suggestedFilename()).toMatch(/-collector-edition\.zip$/);
  const zip = await bytes(pack);
  await pack.saveAs(info.outputPath("collector-complete.zip"));
  const files = storedZipFiles(zip);
  expect(files.size).toBe(7);
  const manifest = JSON.parse(files.get("design.json")!.toString("utf8"));
  expect(manifest.design).toEqual(design);
  expect(manifest.name).toBe(watchName);
  expect(manifest.references.map((item: { id: string }) => item.id)).toEqual(references);
  expect(manifest.timezone).toBe("America/New_York");
  expect(manifest.secondaryTimezone).toBe("Asia/Tokyo");
  let index = 0;
  for (const [name, file] of files) {
    if (!name.endsWith(".png")) continue;
    expect(file.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(file.readUInt32BE(16)).toBe(1080); expect(file.readUInt32BE(20)).toBe(1350);
    await writeFile(info.outputPath(`collector-page-${index++}.png`), file);
  }
  expect(index).toBe(6);
  expect(errors).toEqual([]);
});

test("phone edition tabs, zoom, and downloads remain usable on the narrowest viewport", async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 740 });
  const dialog = await openEdition(page);
  await dialog.getByRole("tab", { name: "Build sheet", exact: true }).click();
  await page.keyboard.press("End");
  await expect(dialog.getByRole("tab", { name: "References 4", exact: true })).toBeFocused();
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  await expect(dialog.getByRole("tab", { name: "Build sheet", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(dialog.getByRole("button", { name: "Download PNG", exact: true })).toBeEnabled();
  await dialog.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(dialog.getByRole("button", { name: "Zoom out", exact: true })).toBeVisible();
  expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
  await page.screenshot({ path: info.outputPath("collector-phone-zoom.png") });
  await dialog.getByRole("button", { name: "Zoom out", exact: true }).click();
  await dialog.getByRole("button", { name: "Download complete edition", exact: true }).scrollIntoViewIfNeeded();
  await expect(dialog.getByRole("button", { name: "Download complete edition", exact: true })).toBeInViewport();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
