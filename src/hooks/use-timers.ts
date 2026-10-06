"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { elapsedAt, INITIAL_TIMERS, remainingAt, restoreTimers, toggleChronograph, toggleCountdown, type TimerState } from "@/lib/timers";
import { accountStorageKey, readAccountStorage } from "@/lib/device-storage";

const KEY = "watchme.timers.v1";
export function useTimers(accountId: string, isOwner: boolean) {
  const storageKey = accountStorageKey(accountId, KEY);
  const [state, setState] = useState<TimerState>(INITIAL_TIMERS);
  const [now, setNow] = useState(0);
  const [ready, setReady] = useState(false);
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const notified = useRef(false);
  useEffect(() => {
    // Hydration must happen after the server render: browser storage is the timer's external source of truth.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { const saved = readAccountStorage(accountId, isOwner, KEY); setState(saved ? restoreTimers(JSON.parse(saved)) : INITIAL_TIMERS); } catch { /* Private browsing still supports in-memory timers. */ }
    setNow(Date.now()); setReady(true);
  }, [accountId, isOwner]);
  useEffect(() => { if (ready) { try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch { /* Keep the live timer usable if storage is unavailable. */ } } }, [state, ready, storageKey]);
  const completeCountdown = useCallback(() => {
    setState(current => ({ ...current, countdown: { ...current.countdown, endsAt: null, remaining: 0, completed: true } }));
    if (sound && audio.current && !notified.current) {
      notified.current = true;
      const context = audio.current;
      for (let i = 0; i < 3; i++) {
        const oscillator = context.createOscillator(); const gain = context.createGain();
        oscillator.connect(gain); gain.connect(context.destination); oscillator.frequency.value = 880;
        gain.gain.setValueAtTime(0, context.currentTime + i * .3); gain.gain.linearRampToValueAtTime(.12, context.currentTime + i * .3 + .01); gain.gain.exponentialRampToValueAtTime(.001, context.currentTime + i * .3 + .22);
        oscillator.start(context.currentTime + i * .3); oscillator.stop(context.currentTime + i * .3 + .25);
      }
    }
  }, [sound]);
  useEffect(() => {
    if (!ready || (state.chronograph.startedAt === null && state.countdown.endsAt === null)) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const tick = () => { const currentTime = Date.now(); setNow(currentTime); if (state.countdown.endsAt !== null && currentTime >= state.countdown.endsAt) completeCountdown(); };
    const update = () => { clearInterval(interval); if (!document.hidden) { tick(); interval = setInterval(tick, state.chronograph.startedAt !== null ? 50 : 250); } };
    update(); document.addEventListener("visibilitychange", update);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", update); };
  }, [state.chronograph.startedAt, state.countdown.endsAt, ready, completeCountdown]);
  useEffect(() => () => { void audio.current?.close(); }, []);
  const enableSound = useCallback(async () => { if (!sound) { try { audio.current ??= new AudioContext(); await audio.current.resume(); setSound(true); } catch { setSound(false); } } else setSound(false); }, [sound]);
  const chronoToggle = useCallback(() => setState(current => ({ ...current, chronograph: toggleChronograph(current.chronograph, Date.now()) })), []);
  const chronoReset = useCallback(() => setState(current => ({ ...current, chronograph: { elapsed: 0, startedAt: null, laps: [] } })), []);
  const lap = useCallback(() => setState(current => current.chronograph.startedAt === null ? current : { ...current, chronograph: { ...current.chronograph, laps: [...current.chronograph.laps, elapsedAt(current.chronograph, Date.now())].slice(-100) } }), []);
  const countdownToggle = useCallback(() => { notified.current = false; setState(current => ({ ...current, countdown: toggleCountdown(current.countdown, Date.now()) })); }, []);
  const countdownReset = useCallback(() => { notified.current = false; setState(current => ({ ...current, countdown: { ...current.countdown, remaining: current.countdown.duration, endsAt: null, completed: false } })); }, []);
  const setDuration = useCallback((minutes: number) => { if (Number.isFinite(minutes) && minutes >= 1 && minutes <= 1440) setState(current => ({ ...current, countdown: { duration: minutes * 60000, remaining: minutes * 60000, endsAt: null, completed: false } })); }, []);
  return { state, elapsed: ready ? elapsedAt(state.chronograph, now) : 0, remaining: ready ? remainingAt(state.countdown, now) : 300000, chronoToggle, chronoReset, lap, countdownToggle, countdownReset, setDuration, sound, enableSound };
}
