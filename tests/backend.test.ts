import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { hashPassword, isPasswordHash, verifyPassword } from "../src/lib/password";
import { getSchemaName } from "../src/lib/schema";
import { PRESETS } from "../src/lib/presets";
import { DEFAULT_PREFERENCES } from "../src/lib/types";
import { designSchema, locationQuerySchema, preferencesSchema, watchInputSchema, weatherQuerySchema } from "../src/lib/validation";
import { getWeather, normalizeForecast } from "../src/lib/weather";

describe("private passphrase", () => {
  it("uses unique salts and verifies only the matching passphrase", async () => {
    const first = await hashPassword("test-only long passphrase");
    const second = await hashPassword("test-only long passphrase");
    expect(first).not.toBe(second);
    expect(isPasswordHash(first)).toBe(true);
    expect(await verifyPassword("test-only long passphrase", first)).toBe(true);
    expect(await verifyPassword("a different passphrase", first)).toBe(false);
    expect(await verifyPassword("anything", "invalid-format")).toBe(false);
  });
  it("rejects weak setup passphrases and malformed encoded hashes", async () => {
    await expect(hashPassword("short")).rejects.toThrow();
    expect(isPasswordHash("scrypt:aa:bb")).toBe(false);
    expect(isPasswordHash(undefined)).toBe(false);
  });
});
describe("environment isolation", () => {
  it("defaults each deployment to the correct schema", () => {
    expect(getSchemaName({})).toBe("watchme_dev");
    expect(getSchemaName({ VERCEL_ENV: "preview" })).toBe("watchme_preview");
    expect(getSchemaName({ VERCEL_ENV: "production" })).toBe("watchme");
  });
  it("rejects identifiers outside the explicit allowlist", () => {
    expect(getSchemaName({ WATCHME_SCHEMA: "watchme_dev" })).toBe("watchme_dev");
    expect(() => getSchemaName({ WATCHME_SCHEMA: "public" })).toThrow();
    expect(() => getSchemaName({ WATCHME_SCHEMA: 'watchme"; DROP TABLE watches;' })).toThrow();
  });
});
describe("server validation", () => {
  it("accepts launch presets while blocking incompatible or injected parts", () => {
    for (const preset of PRESETS) expect(designSchema.safeParse(preset.design).success).toBe(true);
    expect(designSchema.safeParse({ ...PRESETS[0].design, caseShape: "round", complication: "chronograph" }).success).toBe(false);
    expect(designSchema.safeParse({ ...PRESETS[0].design, dialColor: "url(javascript:alert(1))" }).success).toBe(false);
    expect(designSchema.safeParse({ ...PRESETS[0].design, version: 2 }).success).toBe(false);
    expect(watchInputSchema.safeParse({ name: " ", design: PRESETS[0].design }).success).toBe(false);
    expect(watchInputSchema.parse({ name: "  My watch  ", design: PRESETS[0].design }).name).toBe("My watch");
  });
  it("checks timezones, ids, favorites, and location ranges", () => {
    expect(preferencesSchema.safeParse(DEFAULT_PREFERENCES).success).toBe(true);
    expect(preferencesSchema.safeParse({ ...DEFAULT_PREFERENCES, primaryTimezone: "Not/AZone" }).success).toBe(false);
    expect(preferencesSchema.safeParse({ ...DEFAULT_PREFERENCES, activeWatchId: "unknown" }).success).toBe(false);
    expect(preferencesSchema.parse({ ...DEFAULT_PREFERENCES, favoritePresets: ["apex", "apex"] }).favoritePresets).toEqual(["apex"]);
    expect(weatherQuerySchema.safeParse({ lat: "91", lon: "10" }).success).toBe(false);
    expect(weatherQuerySchema.safeParse({ lat: "", lon: "10" }).success).toBe(false);
    expect(weatherQuerySchema.safeParse({ lat: " ", lon: "10" }).success).toBe(false);
    expect(weatherQuerySchema.safeParse({ lat: "1", lon: "Infinity" }).success).toBe(false);
    expect(weatherQuerySchema.parse({ lat: "40.7", lon: "-74" }).unit).toBe("fahrenheit");
    expect(locationQuerySchema.safeParse(" ").success).toBe(false);
  });
});

const forecast = { current: { time: 1791108000, temperature_2m: 72, apparent_temperature: 71, weather_code: 2, is_day: 1 }, daily: { temperature_2m_max: [78], temperature_2m_min: [61] } };
describe("weather provider handling", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
  it("normalizes UTC observation time, conditions, and daily temperatures", () => {
    const weather = normalizeForecast(forecast, 1791108010000);
    expect(weather.description).toBe("Partly cloudy");
    expect(weather.temperature).toBe(72);
    expect(weather.high).toBe(78);
    expect(weather.observedAt).toBe(new Date(forecast.current.time * 1000).toISOString());
    expect(weather.fetchedAt).toBe(new Date(1791108010000).toISOString());
    expect(() => normalizeForecast({ current: {} })).toThrow();
  });
  it("reuses fresh results and labels cached results stale after provider failure", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-04T12:00:00Z"));
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => forecast });
    vi.stubGlobal("fetch", fetchMock);
    const first = await getWeather(31.543, -72.321, "fahrenheit");
    expect(first.stale).toBe(false);
    await getWeather(31.543, -72.321, "fahrenheit");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date("2026-10-04T12:16:00Z"));
    fetchMock.mockRejectedValue(new Error("offline"));
    const stale = await getWeather(31.543, -72.321, "fahrenheit");
    expect(stale.stale).toBe(true);
    expect(stale.data.fetchedAt).toBe(first.data.fetchedAt);
    vi.setSystemTime(new Date("2026-10-05T13:00:00Z"));
    await expect(getWeather(31.543, -72.321, "fahrenheit")).rejects.toThrow("unavailable");
  });
  it("does not manufacture observations when an uncached location fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(getWeather(11.101, 20.204, "celsius")).rejects.toThrow("unavailable");
  });
});
