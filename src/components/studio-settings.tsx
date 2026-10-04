"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpRight, Check, CloudSun, LoaderCircle, LocateFixed, LockKeyhole, MapPin, Search, Sun } from "lucide-react";
import type { LocationChoice, Preferences, WeatherData } from "@/lib/types";
const COMMON_ZONES = ["America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles", "America/Toronto", "America/Sao_Paulo", "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore", "Asia/Hong_Kong", "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland", "UTC"];
export function StudioSettings({ preferences, onSave, busy, onLock }: { preferences: Preferences; onSave: (value: Preferences) => void; busy: boolean; onLock: () => void }) {
  const [settings, setSettings] = useState(preferences);
  const zones = useMemo(() => Array.from(new Set(["UTC", ...("supportedValuesOf" in Intl ? Intl.supportedValuesOf("timeZone") : COMMON_ZONES), preferences.primaryTimezone, preferences.secondaryTimezone])).filter(Boolean), [preferences.primaryTimezone, preferences.secondaryTimezone]);
  const [query, setQuery] = useState(""); const [results, setResults] = useState<LocationChoice[]>([]); const [searching, setSearching] = useState(false); const [locationError, setLocationError] = useState(""); const search = useRef<AbortController | null>(null);
  useEffect(() => () => search.current?.abort(), []);
  async function findCity(event: React.FormEvent) {
    event.preventDefault(); if (query.trim().length < 2) return;
    search.current?.abort(); const controller = new AbortController(); search.current = controller;
    setSearching(true); setLocationError(""); setResults([]);
    try { const response = await fetch(`/api/locations?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal }); const result = await response.json(); if (!result.ok) throw new Error(result.error); setResults(result.data); if (!result.data.length) setLocationError("No cities found. Try a nearby city or a longer name."); }
    catch (error) { if (!controller.signal.aborted) setLocationError(error instanceof Error ? error.message : "City search is unavailable."); }
    finally { if (!controller.signal.aborted) setSearching(false); }
  }
  function locate() {
    if (!navigator.geolocation) { setLocationError("Location is unavailable in this browser. Search for your city instead."); return; }
    setSearching(true); setLocationError("");
    navigator.geolocation.getCurrentPosition(position => { setSettings(current => ({ ...current, location: { name: "Current location", latitude: position.coords.latitude, longitude: position.coords.longitude, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } })); setSearching(false); }, () => { setLocationError("Location access was declined or unavailable. You can still choose a city."); setSearching(false); }, { timeout: 15000, maximumAge: 300000 });
  }
  return <div className="settings-body">
    <p className="muted">Your time, wherever you are. Preferences follow your collection across devices.</p>
    <div className="settings-grid"><label>Local time zone<select value={settings.primaryTimezone} onChange={event => setSettings({ ...settings, primaryTimezone: event.target.value })}>{zones.map(zone => <option key={zone} value={zone}>{zone.replaceAll("_", " ").replace("/", " · ")}</option>)}</select></label><label>Second time zone<select value={settings.secondaryTimezone} onChange={event => setSettings({ ...settings, secondaryTimezone: event.target.value })}>{zones.map(zone => <option key={zone} value={zone}>{zone.replaceAll("_", " ").replace("/", " · ")}</option>)}</select></label></div>
    <div className="section-rule" /><p className="eyebrow">WEATHER</p>
    <div className="field-line"><span>Temperature units</span><div className="segmented"><button className={settings.unit === "fahrenheit" ? "selected" : ""} onClick={() => setSettings({ ...settings, unit: "fahrenheit" })}>°F</button><button className={settings.unit === "celsius" ? "selected" : ""} onClick={() => setSettings({ ...settings, unit: "celsius" })}>°C</button></div></div>
    {settings.location && <div className="location-selected"><MapPin size={16}/><div><strong>{settings.location.name}</strong><small>{settings.location.country || "Your weather location"}</small></div><Check size={16}/></div>}
    <form className="city-search" onSubmit={findCity}><label className="search-field"><Search size={17} /><input placeholder="Find a city" aria-label="Search for a city" value={query} onChange={event => setQuery(event.target.value)} minLength={2} maxLength={80} /></label><button className="button-secondary" type="submit" disabled={searching || query.trim().length < 2}>{searching ? <LoaderCircle size={17} className="spin"/> : "Find"}</button></form>
    {locationError && <p role="alert" className="inline-error">{locationError}</p>}
    {results.length > 0 && <div className="city-results">{results.map((city, index) => <button key={`${city.latitude}-${city.longitude}-${index}`} onClick={() => { setSettings({ ...settings, location: city }); setResults([]); setQuery(""); }}><MapPin size={15}/><span>{city.name}<small>{city.country} · {city.timezone}</small></span><ArrowUpRight size={16}/></button>)}</div>}
    <button className="text-button location-button" onClick={locate} disabled={searching}><LocateFixed size={16}/> Use my current location</button>
    <p className="fine-print">Location is requested only when you choose it. Weather is provided by Open-Meteo and refreshes every 15 minutes while visible.</p>
    <div className="dialog-actions settings-actions"><button className="text-button" onClick={onLock} disabled={busy}><LockKeyhole size={14}/> Lock the studio</button><button className="button-primary" onClick={() => onSave(settings)} disabled={busy}>{busy ? <LoaderCircle size={16} className="spin"/> : <Check size={16}/>} Save preferences</button></div>
  </div>;
}
export function WeatherPanel({ location, weather, loading, error, stale, unit, onSettings, onRefresh }: { location: LocationChoice | null; weather: WeatherData | null; loading: boolean; error: string | null; stale: boolean; unit: Preferences["unit"]; onSettings: () => void; onRefresh: () => void }) {
  return <section className="weather-panel"><div className="inspector-section-heading"><span className="eyebrow">OUTSIDE, RIGHT NOW</span><CloudSun size={16}/></div>
    {weather ? <><div className="weather-temperature"><span>{Math.round(weather.temperature)}<sup>°{unit === "fahrenheit" ? "F" : "C"}</sup></span><Sun size={31} strokeWidth={1}/></div><p className="weather-description">{weather.description}</p><button className="location-link" onClick={onSettings}><MapPin size={12}/>{location?.name}<ArrowUpRight size={12}/></button><div className="weather-stats"><span>Feels {Math.round(weather.feelsLike)}°</span><span>H {Math.round(weather.high)}° / L {Math.round(weather.low)}°</span></div>{(stale || error) && <button onClick={onRefresh} className="weather-stale" title={error || undefined}>Last available reading · retry</button>}</> : <><p className="muted small">{loading ? "Finding your forecast…" : error || "A little perspective beyond the dial."}</p><button className="text-button" onClick={location ? onRefresh : onSettings}>{location ? "Refresh weather" : "Set your location"}<ArrowUpRight size={14}/></button></>}
  </section>;
}
