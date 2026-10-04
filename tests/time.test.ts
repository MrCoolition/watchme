import { describe, expect, it } from "vitest";
import { getClockParts, getHandAngles } from "../src/lib/time";

describe("watch time", () => {
  it("shows the selected zone's date across midnight", () => {
    const timestamp = Date.parse("2026-10-05T01:30:45.250Z");
    expect(getClockParts(timestamp, "America/New_York")).toMatchObject({ hour: 21, minute: 30, second: 45, millisecond: 250, day: 4, month: 10, year: 2026, weekday: "Sun" });
    expect(getClockParts(timestamp, "Asia/Tokyo")).toMatchObject({ hour: 10, day: 5, weekday: "Mon" });
  });
  it("skips the missing hour during spring daylight saving", () => {
    expect(getClockParts(Date.parse("2026-03-08T06:59:59Z"), "America/New_York")).toMatchObject({ hour: 1, minute: 59 });
    expect(getClockParts(Date.parse("2026-03-08T07:00:00Z"), "America/New_York")).toMatchObject({ hour: 3, minute: 0 });
  });
  it("repeats the correct local hour during autumn daylight saving", () => {
    expect(getClockParts(Date.parse("2026-11-01T05:59:59Z"), "America/New_York")).toMatchObject({ hour: 1, minute: 59 });
    expect(getClockParts(Date.parse("2026-11-01T06:00:00Z"), "America/New_York")).toMatchObject({ hour: 1, minute: 0 });
  });
  it("uses hour zero at midnight and supports fractional offsets", () => {
    expect(getClockParts(Date.parse("2026-01-01T00:00:00Z"), "UTC")).toMatchObject({ hour: 0, day: 1, month: 1, year: 2026 });
    expect(getClockParts(Date.parse("2026-01-01T00:00:00Z"), "Asia/Kathmandu")).toMatchObject({ hour: 5, minute: 45 });
  });
  it("derives smoothly advancing angles from absolute time", () => {
    const angles = getHandAngles(getClockParts(Date.parse("2026-01-01T15:30:30.500Z"), "UTC"));
    expect(angles.second).toBe(183);
    expect(angles.minute).toBeCloseTo(183.05);
    expect(angles.hour).toBeCloseTo(105.2541667);
    expect(angles.gmt).toBeCloseTo(232.6270833);
  });
  it("rejects invalid timestamps and zones rather than displaying plausible incorrect time", () => {
    expect(() => getClockParts(Number.NaN, "UTC")).toThrow(RangeError);
    expect(() => getClockParts(0, "Not/A_Zone")).toThrow(RangeError);
  });
});
