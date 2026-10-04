import { expect, test } from "@playwright/test";
import { PRESETS } from "../../src/lib/presets";
import { DEFAULT_PREFERENCES, type WeatherData } from "../../src/lib/types";
import { INITIAL_TIMERS } from "../../src/lib/timers";

test("edition preserves live stopwatch, weather, and lighting after a delay and survives immediate close", async ({ page }) => {
  const weather: WeatherData = { temperature: 73, feelsLike: 75, high: 79, low: 61, code: 0, description: "Clear snapshot", isDay: true, observedAt: "2026-10-04T12:00:00Z", fetchedAt: "2026-10-04T12:00:00Z" };
  const design = { ...PRESETS.find(preset => preset.id === "reactor")!.design, additionalComplications: ["weather" as const] };
  const id = "00000000-0000-4000-8000-000000000009";
  let requests = 0;
  await page.clock.install({ time: new Date("2026-10-04T12:00:00Z") });
  await page.route("**/api/weather?*", route => route.fulfill({ json: { ok: true, data: ++requests === 1 ? weather : { ...weather, temperature: 91, description: "Changed after capture" }, stale: false } }));
  await page.addInitScript(({ design, id, defaults, timers }) => {
    localStorage.setItem("watchme.fixture.studio.v1", JSON.stringify({
      watches: [{ id, name: "Snapshot edition", design, favorite: false, createdAt: "2026-10-04T00:00:00Z", updatedAt: "2026-10-04T00:00:00Z" }],
      preferences: { ...defaults, primaryTimezone: "America/New_York", secondaryTimezone: "Asia/Tokyo", activeWatchId: id, location: { name: "New York", latitude: 40.7, longitude: -74, timezone: "America/New_York" } },
    }));
    localStorage.setItem("watchme.timers.v1", JSON.stringify({ ...timers, chronograph: { elapsed: 18420, startedAt: Date.now(), laps: [] } }));
    const createUrl = URL.createObjectURL.bind(URL);
    URL.createObjectURL = value => {
      const url = createUrl(value);
      if (value instanceof Blob && value.type === "application/zip") document.documentElement.dataset.editionZipUrl = url;
      return url;
    };
  }, { design, id, defaults: DEFAULT_PREFERENCES, timers: INITIAL_TIMERS });

  await page.goto("/");
  const mainWeather = page.locator('.watch-stage [data-complication="weather"]');
  await expect(mainWeather).toContainText("73°");
  const light = page.getByRole("group", { name: "Interactive watch lighting", exact: true });
  await light.press("ArrowRight");
  await page.getByRole("button", { name: "Download edition card", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Your edition card", exact: true });
  const complete = dialog.getByRole("button", { name: "Download complete edition", exact: true });
  await expect(complete).toBeEnabled();
  const capturedWatch = dialog.locator('.edition-capture-source svg');
  const capturedHand = capturedWatch.locator('[data-chronograph-hand="seconds"]');
  const transform = await capturedHand.getAttribute("transform");
  await expect(capturedWatch).toHaveAttribute("data-chronograph-running", "true");
  expect(transform).not.toBe("rotate(0 320 350)");
  const preview = await dialog.locator("canvas").evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL());

  // A real refresh and a running stopwatch continue behind the modal; the export stays at its captured moment.
  await page.clock.fastForward(900_100);
  await expect(mainWeather).toContainText("91°");
  await expect(capturedWatch.locator('[data-complication="weather"]')).toContainText("73°");
  await expect(capturedHand).toHaveAttribute("transform", transform!);
  expect(await dialog.locator("canvas").evaluate(canvas => (canvas as HTMLCanvasElement).toDataURL())).toBe(preview);

  const [download] = await Promise.all([page.waitForEvent("download"), complete.click()]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  // The download URL remains consumable even after the modal unmounts.
  expect(await page.evaluate(async () => {
    const response = await fetch(document.documentElement.dataset.editionZipUrl!);
    return (await response.arrayBuffer()).byteLength;
  })).toBeGreaterThan(100_000);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
  const archive = Buffer.concat(chunks);
  let offset = 0;
  const files = new Map<string, Buffer>();
  while (archive.readUInt32LE(offset) === 0x04034b50) {
    const size = archive.readUInt32LE(offset + 18);
    const nameLength = archive.readUInt16LE(offset + 26);
    const extraLength = archive.readUInt16LE(offset + 28);
    const filename = archive.subarray(offset + 30, offset + 30 + nameLength).toString("utf8");
    const start = offset + 30 + nameLength + extraLength;
    files.set(filename, archive.subarray(start, start + size)); offset = start + size;
  }
  const manifest = JSON.parse(files.get("design.json")!.toString("utf8"));
  expect(manifest.presentation.weather).toEqual(weather);
  expect(manifest.presentation.chronographRunning).toBe(true);
  expect(manifest.presentation.chronographElapsed).toBeGreaterThanOrEqual(18420);
  expect(manifest.presentation.chronographElapsed).toBeLessThan(60000);
  expect(manifest.presentation.lightPosition).toEqual({ x: -0.15, y: -0.45 });
  expect(manifest.capturedAt).toMatch(/^2026-10-04T12:00:/);
  const portrait = [...files.entries()].find(([filename]) => filename.endsWith(".png") && !filename.includes("-build"))![1];
  expect(portrait.equals(Buffer.from(preview.split(",")[1], "base64"))).toBe(true);
});
