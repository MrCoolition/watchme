"use client";
import { useCallback, useEffect, useState } from "react";

export type WatchFraming = "watch" | "face";
interface DisplayPreferences { version: 1; mobileFraming: WatchFraming; desktopFraming: WatchFraming; digitalTime: boolean; edgeToEdge: boolean }
const DEFAULT_DISPLAY: DisplayPreferences = { version: 1, mobileFraming: "face", desktopFraming: "watch", digitalTime: true, edgeToEdge: true };
const DISPLAY_KEY = "watchme.display.v1";
function readDisplay(): DisplayPreferences {
  try {
    const raw = localStorage.getItem(DISPLAY_KEY); if (!raw) return DEFAULT_DISPLAY;
    const value = JSON.parse(raw);
    if (value.version !== 1) return DEFAULT_DISPLAY;
    return { version: 1, mobileFraming: value.mobileFraming === "watch" ? "watch" : "face", desktopFraming: value.desktopFraming === "face" ? "face" : "watch", digitalTime: value.digitalTime !== false, edgeToEdge: value.edgeToEdge !== false };
  } catch { return DEFAULT_DISPLAY; }
}
export function useDisplayPreferences() {
  const [preferences, setPreferences] = useState<DisplayPreferences>(DEFAULT_DISPLAY);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    // Read device-local display preferences only after hydration; they never enter the saved watch design.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferences(readDisplay()); setIsMobile(media.matches);
    const resize = () => setIsMobile(media.matches);
    const storage = (event: StorageEvent) => { if (event.key === DISPLAY_KEY) setPreferences(readDisplay()); };
    media.addEventListener("change", resize); window.addEventListener("storage", storage);
    return () => { media.removeEventListener("change", resize); window.removeEventListener("storage", storage); };
  }, []);
  const update = useCallback((patch: Partial<DisplayPreferences>) => {
    setPreferences(current => {
      const next = { ...current, ...patch };
      try { localStorage.setItem(DISPLAY_KEY, JSON.stringify(next)); } catch { /* The display remains usable without device storage. */ }
      return next;
    });
  }, []);
  return { isMobile, framing: isMobile ? preferences.mobileFraming : preferences.desktopFraming, digitalTime: preferences.digitalTime, edgeToEdge: preferences.edgeToEdge, setFraming: (value: WatchFraming) => update(isMobile ? { mobileFraming: value } : { desktopFraming: value }), setDigitalTime: (value: boolean) => update({ digitalTime: value }), setEdgeToEdge: (value: boolean) => update({ edgeToEdge: value }) };
}
