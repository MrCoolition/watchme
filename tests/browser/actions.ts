// UI fixture doubles only. Production keeps its real authenticated Neon server actions.
import { DEFAULT_PREFERENCES, type ActionResult, type Preferences, type SavedWatch, type StudioData, type WatchDesign } from "../../src/lib/types";
import { watchInputSchema, preferencesSchema } from "../../src/lib/validation";

const STORAGE_KEY = "watchme.fixture.studio.v1";
export function readFixture(): StudioData {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) return JSON.parse(saved) as StudioData;
  const data: StudioData = { watches: [], preferences: { ...DEFAULT_PREFERENCES, primaryTimezone: "America/New_York", location: new URLSearchParams(location.search).has("weather") ? { name: "New York", latitude: 40.7128, longitude: -74.006, timezone: "America/New_York", country: "United States" } : null } };
  writeFixture(data);
  return data;
}
function writeFixture(data: StudioData) { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function unavailable<T>(): ActionResult<T> | null { return localStorage.getItem("watchme.fixture.failWrites") === "1" ? { ok: false, error: "Test fixture: save unavailable. Your draft is still on this device." } : null; }
export async function loadStudio(): Promise<ActionResult<StudioData>> { return { ok: true, data: readFixture() }; }
export async function saveWatch(input: { id?: string; name: string; design: WatchDesign }): Promise<ActionResult<SavedWatch>> {
  const failure = unavailable<SavedWatch>(); if (failure) return failure;
  const parsed = watchInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const data = readFixture(); const previous = data.watches.find(watch => watch.id === input.id);
  if (input.id && !previous) return { ok: false, error: "This watch no longer exists." };
  const watch: SavedWatch = { id: input.id || crypto.randomUUID(), name: parsed.data.name, design: parsed.data.design, favorite: previous?.favorite ?? false, createdAt: previous?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() };
  data.watches = [watch, ...data.watches.filter(item => item.id !== watch.id)]; writeFixture(data);
  return { ok: true, data: watch };
}
export async function deleteWatch(id: string): Promise<ActionResult<null>> {
  const failure = unavailable<null>(); if (failure) return failure;
  const data = readFixture(); data.watches = data.watches.filter(watch => watch.id !== id);
  if (data.preferences.activeWatchId === id) data.preferences.activeWatchId = "monolith";
  writeFixture(data); return { ok: true, data: null };
}
export async function setFavorite(id: string, favorite: boolean): Promise<ActionResult<SavedWatch>> {
  const failure = unavailable<SavedWatch>(); if (failure) return failure;
  const data = readFixture(); const watch = data.watches.find(item => item.id === id);
  if (!watch) return { ok: false, error: "This watch no longer exists." };
  watch.favorite = favorite; writeFixture(data); return { ok: true, data: watch };
}
export async function savePreferences(preferences: Preferences): Promise<ActionResult<Preferences>> {
  const failure = unavailable<Preferences>(); if (failure) return failure;
  const parsed = preferencesSchema.safeParse(preferences);
  if (!parsed.success) return { ok: false, error: "Invalid preferences." };
  const data = readFixture(); data.preferences = parsed.data; writeFixture(data); return { ok: true, data: parsed.data };
}
export async function logout(): Promise<void> { location.reload(); }
