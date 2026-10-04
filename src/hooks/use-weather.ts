"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LocationChoice, Preferences, WeatherData } from "@/lib/types";
export function useWeather(location: LocationChoice | null, unit: Preferences["unit"]) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const request = useRef<AbortController | null>(null);
  const cacheKey = location ? `watchme.weather.v1.${location.latitude}.${location.longitude}.${unit}` : "";
  const latitude = location?.latitude; const longitude = location?.longitude;
  const refresh = useCallback(async () => {
    if (latitude === undefined || longitude === undefined) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}&unit=${unit}`, { signal: controller.signal });
      const result = await response.json();
      if (!result.ok) throw new Error(result.error || "Weather is unavailable.");
      setWeather(result.data); setStale(Boolean(result.stale));
      try { localStorage.setItem(cacheKey, JSON.stringify(result.data)); } catch { /* The current response remains usable. */ }
    } catch (cause) { if (!controller.signal.aborted) { setError(cause instanceof Error ? cause.message : "Weather is unavailable."); setStale(true); } }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [latitude, longitude, unit, cacheKey]);
  useEffect(() => {
    // Synchronize the persisted browser weather cache when its location/unit key changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeather(null); setError(null); setStale(false);
    if (!cacheKey) return;
    try { const stored = localStorage.getItem(cacheKey); if (stored) { const cached = JSON.parse(stored) as WeatherData; if (Number.isFinite(cached.temperature) && cached.fetchedAt) { setWeather(cached); setStale(Date.now() - new Date(cached.fetchedAt).getTime() > 900000); } } } catch { /* Ignore invalid local cache. */ }
    const visibleRefresh = () => { if (!document.hidden) void refresh(); };
    visibleRefresh(); const interval = setInterval(visibleRefresh, 900000);
    document.addEventListener("visibilitychange", visibleRefresh);
    return () => { clearInterval(interval); request.current?.abort(); document.removeEventListener("visibilitychange", visibleRefresh); };
  }, [cacheKey, refresh]);
  return { weather, error, loading, stale, refresh };
}
