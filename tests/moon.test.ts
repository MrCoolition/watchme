import { describe, expect, it, vi } from "vitest";
import { getMoonPhase } from "../src/lib/moon";

// US Naval Observatory, Dates of Primary Phases of the Moon, Universal Time.
// https://aa.usno.navy.mil/calculated/moon/phases?year=2026
// Published values are rounded to a minute. A 0.1-degree longitude tolerance
// allows reference rounding and library ephemeris error without admitting a
// fixed 29.53-day approximation. Illuminated fraction has separate 3-D geometry.
const PRIMARY_PHASES = [
  ["2026-01-03T10:03:00Z", .5, "Full moon"],
  ["2026-01-10T15:48:00Z", .75, "Last quarter"],
  ["2026-01-18T19:52:00Z", 0, "New moon"],
  ["2026-01-26T04:47:00Z", .25, "First quarter"],
  ["2026-07-07T19:29:00Z", .75, "Last quarter"],
  ["2026-07-14T09:43:00Z", 0, "New moon"],
  ["2026-07-21T11:05:00Z", .25, "First quarter"],
  ["2026-07-29T14:36:00Z", .5, "Full moon"],
  ["2026-12-09T00:52:00Z", 0, "New moon"],
  ["2026-12-17T05:42:00Z", .25, "First quarter"],
  ["2026-12-24T01:28:00Z", .5, "Full moon"],
  ["2026-12-30T18:59:00Z", .75, "Last quarter"],
] as const;

describe("astronomical moon-phase complication", () => {
  it.each(PRIMARY_PHASES)("matches the USNO %s primary phase", (instant, expectedPhase, name) => {
    const moon = getMoonPhase(Date.parse(instant));
    const distance = Math.abs(moon.phase - expectedPhase);
    expect(Math.min(distance, 1 - distance) * 360).toBeLessThan(.1);
    expect(moon.name).toBe(name);
    if (expectedPhase === 0) expect(moon.illumination).toBeLessThan(.003);
    else if (expectedPhase === .5) expect(moon.illumination).toBeGreaterThan(.997);
    else expect(Math.abs(moon.illumination - .5)).toBeLessThan(.01);
  });

  it.each([
    ["2026-01-22T00:00:00Z", "Waxing crescent", true, 0, .25],
    ["2026-01-29T00:00:00Z", "Waxing gibbous", true, .25, .5],
    ["2026-01-06T00:00:00Z", "Waning gibbous", false, .5, .75],
    ["2026-01-14T00:00:00Z", "Waning crescent", false, .75, 1],
  ] as const)("identifies continuous waxing or waning at %s", (instant, name, waxing, lower, upper) => {
    const moon = getMoonPhase(Date.parse(instant));
    expect(moon).toMatchObject({ name, waxing });
    expect(moon.phase).toBeGreaterThan(lower);
    expect(moon.phase).toBeLessThan(upper);
    expect(moon.illumination).toBeGreaterThan(0);
    expect(moon.illumination).toBeLessThan(1);
  });

  it("recomputes for each requested UTC minute and safely reuses one minute across watches", () => {
    const instant = Date.parse("2026-10-04T15:42:00Z");
    const first = getMoonPhase(instant);
    expect(getMoonPhase(instant + 59_999)).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    const next = getMoonPhase(instant + 60_000);
    expect(next).not.toBe(first);
    expect(next.phase).not.toBe(first.phase);
    expect(getMoonPhase(Date.parse("2026-01-03T10:03:00Z")).name).toBe("Full moon");
    expect(getMoonPhase(instant)).toEqual(first);
  });

  it("calculates the same geometry independent of the runtime time zone", async () => {
    const instant = Date.parse("2026-10-04T15:42:00Z");
    const expected = getMoonPhase(instant);
    try {
      for (const zone of ["UTC", "America/New_York", "Pacific/Auckland", "Asia/Kolkata"]) {
        vi.stubEnv("TZ", zone);
        vi.resetModules();
        const { getMoonPhase: calculate } = await import("../src/lib/moon");
        expect(calculate(instant)).toEqual(expected);
      }
    } finally { vi.unstubAllEnvs(); }
  });

  it("rejects invalid timestamps instead of emitting a fabricated phase", () => {
    for (const timestamp of [NaN, Infinity, -Infinity, Number.MAX_VALUE, -Number.MAX_VALUE]) {
      expect(() => getMoonPhase(timestamp)).toThrow(RangeError);
    }
  });
});
