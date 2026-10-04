import "server-only";
import { z } from "zod";
import type { LocationChoice, WeatherData } from "./types";

export const WEATHER_CACHE_MS = 15 * 60 * 1000;
const STALE_LIMIT_MS = 24 * 60 * 60 * 1000;
const cache = new Map<string, WeatherData>();
const pending = new Map<string, Promise<WeatherData>>();
const forecastSchema = z.object({
  current: z.object({ time: z.number(), temperature_2m: z.number(), apparent_temperature: z.number(), weather_code: z.number(), is_day: z.number() }),
  daily: z.object({ temperature_2m_max: z.array(z.number()).min(1), temperature_2m_min: z.array(z.number()).min(1) }),
});
export function weatherDescription(code: number): string {
  if (code === 0) return "Clear sky";
  if (code === 1) return "Mostly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([80, 81, 82].includes(code)) return "Rain showers";
  if ([95, 96, 99].includes(code)) return "Thunderstorms";
  return "Conditions unavailable";
}
export function normalizeForecast(input: unknown, now = Date.now()): WeatherData {
  const data = forecastSchema.parse(input);
  return { temperature: data.current.temperature_2m, feelsLike: data.current.apparent_temperature, high: data.daily.temperature_2m_max[0], low: data.daily.temperature_2m_min[0], code: data.current.weather_code, description: weatherDescription(data.current.weather_code), isDay: data.current.is_day === 1, observedAt: new Date(data.current.time * 1000).toISOString(), fetchedAt: new Date(now).toISOString() };
}
async function fetchWeather(lat: number, lon: number, unit: "fahrenheit" | "celsius"): Promise<WeatherData> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.search = new URLSearchParams({ latitude: String(lat), longitude: String(lon), current: "temperature_2m,apparent_temperature,weather_code,is_day", daily: "temperature_2m_max,temperature_2m_min", temperature_unit: unit, timezone: "auto", forecast_days: "1", timeformat: "unixtime" }).toString();
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Weather provider unavailable.");
  return normalizeForecast(await response.json());
}
export async function getWeather(lat: number, lon: number, unit: "fahrenheit" | "celsius"): Promise<{ data: WeatherData; stale: boolean }> {
  const key = `${lat.toFixed(3)},${lon.toFixed(3)},${unit}`;
  const cached = cache.get(key);
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < WEATHER_CACHE_MS) return { data: cached, stale: false };
  try {
    let request = pending.get(key);
    if (!request) { request = fetchWeather(lat, lon, unit); pending.set(key, request); }
    const data = await request;
    // Bound memory across warm serverless instances. Browser keeps its own last result across cold starts.
    if (cache.size >= 100 && !cache.has(key)) cache.delete(cache.keys().next().value!);
    cache.set(key, data);
    return { data, stale: false };
  } catch {
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < STALE_LIMIT_MS) return { data: cached, stale: true };
    throw new Error("Weather is unavailable right now. Try again shortly.");
  } finally { pending.delete(key); }
}
const geocodingSchema = z.object({ results: z.array(z.object({ name: z.string(), latitude: z.number(), longitude: z.number(), timezone: z.string().optional(), country: z.string().optional(), admin1: z.string().optional() })).optional() });
export async function searchLocations(query: string): Promise<LocationChoice[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name: query, count: "6", language: "en", format: "json" }).toString();
  const response = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("Location search is unavailable. Try again shortly.");
  const result = geocodingSchema.parse(await response.json());
  return (result.results ?? []).map((place) => ({ name: [place.name, place.admin1].filter(Boolean).join(", "), latitude: place.latitude, longitude: place.longitude, timezone: place.timezone ?? "UTC", ...(place.country ? { country: place.country } : {}) }));
}
