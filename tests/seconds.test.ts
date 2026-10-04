import { describe, expect, it } from "vitest";
import { getSecondsAngle } from "../src/lib/seconds";

describe("timestamp-anchored seconds", () => {
  it("keeps a continuous sweep through arbitrary frame intervals", () => {
    expect(getSecondsAngle(Date.parse("2026-10-04T12:15:23.375Z"), "sweep")).toBe(140.25);
    expect(getSecondsAngle(23_799, "sweep")).toBeCloseTo(142.794);
  });
  it("ticks once per real second and wraps at the minute", () => {
    expect(getSecondsAngle(59_999, "tick")).toBe(354);
    expect(getSecondsAngle(60_000, "tick")).toBe(0);
    expect(getSecondsAngle(60_999, "tick")).toBe(0);
    expect(getSecondsAngle(61_000, "tick")).toBe(6);
  });
  it.each([4, 5, 6, 8, 10, 16] as const)("advances exactly %i times per second", rate => {
    expect(getSecondsAngle(1_000, "stepped", rate)).toBe(6);
    expect(getSecondsAngle(1_000 + 1_000 / rate - .01, "stepped", rate)).toBe(6);
    expect(getSecondsAngle(1_000 + 1_000 / rate + .01, "stepped", rate)).toBeCloseTo(6 + 6 / rate);
  });
  it("gives the same position after backgrounding as direct timestamp evaluation", () => {
    const start = Date.parse("2026-10-04T12:15:23.375Z");
    const resumed = start + 181_234;
    expect(getSecondsAngle(resumed, "stepped", 8)).toBe(getSecondsAngle(resumed % 60_000, "stepped", 8));
    expect(getSecondsAngle(0, "stepped", 8)).toBe(0);
  });
  it("supports dates before the epoch and rejects invalid clocks", () => {
    expect(getSecondsAngle(-500, "sweep")).toBe(357);
    expect(() => getSecondsAngle(Number.NaN)).toThrow(RangeError);
    expect(() => getSecondsAngle(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
