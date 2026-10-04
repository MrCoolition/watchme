export interface ChronographState { elapsed: number; startedAt: number | null; laps: number[] }
export interface CountdownState { duration: number; remaining: number; endsAt: number | null; completed: boolean }
export interface TimerState { version: 1; chronograph: ChronographState; countdown: CountdownState }
export const INITIAL_TIMERS: TimerState = { version: 1, chronograph: { elapsed: 0, startedAt: null, laps: [] }, countdown: { duration: 300000, remaining: 300000, endsAt: null, completed: false } };
export function elapsedAt(state: ChronographState, now: number): number { return Math.max(0, state.elapsed + (state.startedAt === null ? 0 : now - state.startedAt)); }
export function remainingAt(state: CountdownState, now: number): number { return Math.max(0, state.endsAt === null ? state.remaining : state.endsAt - now); }
export function toggleChronograph(state: ChronographState, now: number): ChronographState { return state.startedAt === null ? { ...state, startedAt: now } : { ...state, elapsed: elapsedAt(state, now), startedAt: null }; }
export function toggleCountdown(state: CountdownState, now: number): CountdownState { return state.endsAt === null ? { ...state, remaining: state.completed ? state.duration : state.remaining, endsAt: now + (state.completed ? state.duration : state.remaining), completed: false } : { ...state, remaining: remainingAt(state, now), endsAt: null }; }
export function restoreTimers(value: unknown): TimerState {
  if (!value || typeof value !== "object") return INITIAL_TIMERS;
  const state = value as TimerState;
  const valid = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0;
  if (state.version !== 1 || !state.chronograph || !state.countdown || !valid(state.chronograph.elapsed) || (state.chronograph.startedAt !== null && !valid(state.chronograph.startedAt)) || !Array.isArray(state.chronograph.laps) || !state.chronograph.laps.every(valid) || !valid(state.countdown.duration) || !valid(state.countdown.remaining) || (state.countdown.endsAt !== null && !valid(state.countdown.endsAt))) return INITIAL_TIMERS;
  return { ...state, chronograph: { ...state.chronograph, laps: state.chronograph.laps.slice(0, 100) } };
}
export function formatDuration(ms: number, hundredths = false): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = totalSeconds % 60;
  return `${hours ? `${String(hours).padStart(2, "0")}:` : ""}${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}${hundredths ? `.${String(Math.floor(ms / 10) % 100).padStart(2, "0")}` : ""}`;
}
