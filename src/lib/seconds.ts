import type { SecondsAdvances, SecondsMotion } from "./types";

/** Accepts a timestamp or elapsed duration; stepping is anchored to time, never frame counts. */
export function getSecondsAngle(milliseconds: number, motion: SecondsMotion = "sweep", advances: SecondsAdvances = 8): number {
  if (!Number.isFinite(milliseconds)) throw new RangeError("Seconds require a finite timestamp or duration.");
  const inMinute = ((milliseconds % 60_000) + 60_000) % 60_000;
  if (motion === "sweep") return inMinute / 1000 * 6;
  const rate = motion === "tick" ? 1 : advances;
  return Math.floor(inMinute * rate / 1000) / rate * 6;
}
