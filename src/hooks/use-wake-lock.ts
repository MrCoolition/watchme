"use client";
import { useEffect, useRef, useState } from "react";
export function useWakeLock(enabled: boolean) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef<WakeLockSentinel | null>(null);
  useEffect(() => {
    let canceled = false;
    async function requestLock() {
      if (!enabled || document.hidden || lock.current) return;
      if (!("wakeLock" in navigator)) { setError("Keep awake is unavailable in this browser."); return; }
      try {
        const sentinel = await navigator.wakeLock.request("screen");
        if (canceled) { await sentinel.release(); return; }
        lock.current = sentinel; setActive(true); setError(null);
        sentinel.addEventListener("release", () => { if (lock.current === sentinel) lock.current = null; setActive(false); });
      } catch { if (!canceled) { setActive(false); setError("Keep awake was declined. Check your battery settings."); } }
    }
    void requestLock();
    const visibility = () => { if (!document.hidden) void requestLock(); };
    document.addEventListener("visibilitychange", visibility);
    return () => { canceled = true; document.removeEventListener("visibilitychange", visibility); if (lock.current) { void lock.current.release(); lock.current = null; } setActive(false); };
  }, [enabled]);
  return { active: enabled && active, error: enabled ? error : null };
}
