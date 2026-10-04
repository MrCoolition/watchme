import { describe, expect, it } from "vitest";
import { elapsedAt, formatDuration, INITIAL_TIMERS, remainingAt, restoreTimers, toggleChronograph, toggleCountdown } from "../src/lib/timers";

describe("timestamp based instruments", () => {
  it("restores chronograph elapsed across page closures instead of relying on ticks", () => {
    const running = toggleChronograph(INITIAL_TIMERS.chronograph, 1000);
    const restored = restoreTimers(JSON.parse(JSON.stringify({ ...INITIAL_TIMERS, chronograph: running })));
    expect(elapsedAt(restored.chronograph, 361000)).toBe(360000);
    const paused = toggleChronograph(restored.chronograph, 361000);
    expect(elapsedAt(paused, 1000000)).toBe(360000);
    expect(elapsedAt(toggleChronograph(paused, 1000000), 1001000)).toBe(361000);
  });
  it("preserves recorded cumulative laps through pause, reload and resume", () => {
    const paused = { elapsed: 18500, startedAt: null, laps: [6000, 12500] };
    const restored = restoreTimers({ ...INITIAL_TIMERS, chronograph: paused });
    const resumed = toggleChronograph(restored.chronograph, 90000);
    expect(elapsedAt(resumed, 95000)).toBe(23500);
    expect(resumed.laps).toEqual([6000, 12500]);
  });
  it("preserves countdown time when paused and counts background time when running", () => {
    const running = toggleCountdown(INITIAL_TIMERS.countdown, 10000);
    expect(running.endsAt).toBe(310000);
    expect(remainingAt(running, 70000)).toBe(240000);
    const paused = toggleCountdown(running, 70000);
    expect(remainingAt(paused, 900000)).toBe(240000);
    const resumed = toggleCountdown(paused, 900000);
    expect(remainingAt(resumed, 960000)).toBe(180000);
    expect(remainingAt(resumed, 2000000)).toBe(0);
  });
  it("restarts a completed countdown with the original duration", () => {
    const completed = { ...INITIAL_TIMERS.countdown, completed: true, remaining: 0 };
    const restarted = toggleCountdown(completed, 8000);
    expect(restarted.completed).toBe(false);
    expect(restarted.endsAt).toBe(308000);
    expect(remainingAt(restarted, 8000)).toBe(300000);
  });
  it("discards malformed persistent timer data and caps lap storage", () => {
    expect(restoreTimers(null)).toEqual(INITIAL_TIMERS);
    expect(restoreTimers({ ...INITIAL_TIMERS, chronograph: { elapsed: -2, startedAt: null, laps: [] } })).toEqual(INITIAL_TIMERS);
    expect(restoreTimers({ ...INITIAL_TIMERS, countdown: { remaining: 5, endsAt: Infinity } })).toEqual(INITIAL_TIMERS);
    expect(restoreTimers({ ...INITIAL_TIMERS, chronograph: { elapsed: 10, startedAt: null, laps: Array(150).fill(1) } }).chronograph.laps).toHaveLength(100);
  });
  it("formats subsecond precision, hour rollover and expiration", () => {
    expect(formatDuration(65230, true)).toBe("01:05.23");
    expect(formatDuration(3601230, true)).toBe("01:00:01.23");
    expect(formatDuration(-100)).toBe("00:00");
  });
});
