export type WatchFamily = "monolith" | "pelagic" | "apex" | "vesper" | "meridian" | "orbit" | "reactor";
export type CaseShape = "octagonal" | "cushion" | "tonneau" | "round";
export type Metal = "steel" | "titanium" | "gold" | "rose" | "graphite" | "ceramic";
export type DialTexture = "grid" | "horizontal" | "sunburst" | "lacquer" | "skeleton" | "carbon" | "meteorite" | "guilloche" | "mechanical";
export type Bezel = "polished" | "fluted" | "iced" | "ceramic";
export type SecondsMotion = "sweep" | "tick";
export type Hands = "baton" | "sword" | "dauphine" | "skeleton";
export type Markers = "baton" | "roman" | "arabic" | "minimal";
export type Strap = "bracelet" | "leather" | "rubber";
export type Complication = "date" | "gmt" | "chronograph" | "weather" | "regulator" | "none";
export interface WatchDesign {
  version: 1;
  family: WatchFamily;
  caseShape: CaseShape;
  metal: Metal;
  dialColor: string;
  texture: DialTexture;
  hands: Hands;
  markers: Markers;
  strap: Strap;
  accentColor: string;
  complication: Complication;
  bezel?: Bezel;
  lumeColor?: string;
  signature?: string;
  initials?: string;
  secondsMotion?: SecondsMotion;
}
export interface WatchPreset { id: WatchFamily; name: string; edition: string; description: string; category: string; design: WatchDesign; }
export interface SavedWatch { id: string; name: string; design: WatchDesign; favorite: boolean; createdAt: string; updatedAt: string; }
export interface LocationChoice { name: string; latitude: number; longitude: number; timezone: string; country?: string; }
export interface Preferences { primaryTimezone: string; secondaryTimezone: string; unit: "fahrenheit" | "celsius"; location: LocationChoice | null; activeWatchId: string; favoritePresets: string[]; }
export interface WeatherData { temperature: number; feelsLike: number; high: number; low: number; code: number; description: string; isDay: boolean; observedAt: string; fetchedAt: string; }
export interface StudioData { watches: SavedWatch[]; preferences: Preferences; }
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
export const DEFAULT_PREFERENCES: Preferences = { primaryTimezone: "", secondaryTimezone: "Europe/London", unit: "fahrenheit", location: null, activeWatchId: "monolith", favoritePresets: [] };
