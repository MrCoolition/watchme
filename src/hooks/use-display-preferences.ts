"use client";
import { useCallback, useEffect, useState } from "react";
import { accountStorageKey, readAccountStorage } from "@/lib/device-storage";

export type WatchFraming = "watch" | "face";
interface DisplayPreferences { version: 1; mobileFraming: WatchFraming; desktopFraming: WatchFraming; digitalTime: boolean; chronographPanel: boolean; edgeToEdge: boolean }
const DEFAULT_DISPLAY: DisplayPreferences = { version: 1, mobileFraming: "face", desktopFraming: "watch", digitalTime: true, chronographPanel: true, edgeToEdge: true };
const DISPLAY_KEY = "watchme.display.v1";
function readDisplay(accountId: string, isOwner: boolean): DisplayPreferences {
  try {
    const raw = readAccountStorage(accountId, isOwner, DISPLAY_KEY); if (!raw) return DEFAULT_DISPLAY;
    const value = JSON.parse(raw);
    if (value.version !== 1) return DEFAULT_DISPLAY;
    return { version: 1, mobileFraming: value.mobileFraming === "watch" ? "watch" : "face", desktopFraming: value.desktopFraming === "face" ? "face" : "watch", digitalTime: value.digitalTime !== false, chronographPanel: value.chronographPanel !== false, edgeToEdge: value.edgeToEdge !== false };
  } catch { return DEFAULT_DISPLAY; }
}
export function useDisplayPreferences(accountId: string, isOwner: boolean) {
  const storageKey = accountStorageKey(accountId, DISPLAY_KEY);
  const [preferences, setPreferences] = useState<DisplayPreferences>(DEFAULT_DISPLAY);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    // Read device-local display preferences only after hydration; they never enter the saved watch design.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPreferences(readDisplay(accountId, isOwner)); setIsMobile(media.matches);
    const resize = () => setIsMobile(media.matches);
    const storage = (event: StorageEvent) => { if (event.key === storageKey) setPreferences(readDisplay(accountId, isOwner)); };
    media.addEventListener("change", resize); window.addEventListener("storage", storage);
    return () => { media.removeEventListener("change", resize); window.removeEventListener("storage", storage); };
  }, [accountId, isOwner, storageKey]);
  const update = useCallback((patch: Partial<DisplayPreferences>) => {
    setPreferences(current => {
      const next = { ...current, ...patch };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* The display remains usable without device storage. */ }
      return next;
    });
  }, [storageKey]);
  return { isMobile, framing: isMobile ? preferences.mobileFraming : preferences.desktopFraming, digitalTime: preferences.digitalTime, chronographPanel: preferences.chronographPanel, edgeToEdge: preferences.edgeToEdge, setFraming: (value: WatchFraming) => update(isMobile ? { mobileFraming: value } : { desktopFraming: value }), setDigitalTime: (value: boolean) => update({ digitalTime: value }), setChronographPanel: (value: boolean) => update({ chronographPanel: value }), setEdgeToEdge: (value: boolean) => update({ edgeToEdge: value }) };
}
