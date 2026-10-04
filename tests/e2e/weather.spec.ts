import { expect, test } from "@playwright/test";

const weather = { temperature: 72, feelsLike: 70, high: 77, low: 61, code: 2, description: "Partly cloudy", isDay: true, observedAt: new Date().toISOString(), fetchedAt: new Date().toISOString() };

test("city search, time zones, and Celsius settings persist and display weather", async ({ page }) => {
  await page.route("**/api/locations?*", route => route.fulfill({ json: { ok: true, data: [{ name: "London", country: "United Kingdom", latitude: 51.5085, longitude: -0.1257, timezone: "Europe/London" }] } }));
  await page.route("**/api/weather?*", route => route.fulfill({ json: { ok: true, data: { ...weather, temperature: 18, feelsLike: 17, high: 21, low: 12 }, stale: false } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("combobox", { name: "Local time zone", exact: true }).selectOption("Asia/Tokyo");
  await page.getByRole("combobox", { name: "Second time zone", exact: true }).selectOption("Europe/London");
  await page.getByRole("button", { name: "°C", exact: true }).click();
  await page.getByRole("textbox", { name: "Search for a city", exact: true }).fill("London");
  await page.getByRole("button", { name: "Find", exact: true }).click();
  await page.getByRole("button", { name: /London United Kingdom/ }).click();
  await page.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(page.locator(".weather-temperature")).toContainText("18°C");
  await expect(page.getByText("Partly cloudy", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator(".weather-temperature")).toContainText("18°C");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Local time zone", exact: true })).toHaveValue("Asia/Tokyo");
  await expect(page.getByRole("combobox", { name: "Second time zone", exact: true })).toHaveValue("Europe/London");
});

test("weather outage clearly marks the last available observation", async ({ page }) => {
  let offline = false;
  await page.route("**/api/weather?*", route => route.fulfill({ status: offline ? 502 : 200, json: offline ? { ok: false, error: "Weather is unavailable right now." } : { ok: true, data: weather, stale: false } }));
  await page.goto("/?weather=1");
  await expect(page.getByText("Partly cloudy", { exact: true })).toBeVisible();
  offline = true;
  await page.reload();
  await expect(page.getByRole("button", { name: "Last available reading · retry", exact: true })).toBeVisible();
  await expect(page.locator(".weather-temperature")).toContainText("72°F");
});

test("denied geolocation and unavailable city search offer recoverable messages", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (_success: unknown, failure: (value: { code: number; message: string }) => void) => failure({ code: 1, message: "Denied" }) } }));
  await page.route("**/api/locations?*", route => route.fulfill({ status: 502, json: { ok: false, error: "Location search is unavailable. Try again shortly." } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await page.getByRole("button", { name: "Use my current location", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("You can still choose a city");
  await page.getByRole("textbox", { name: "Search for a city", exact: true }).fill("London");
  await page.getByRole("button", { name: "Find", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Location search is unavailable");
});
