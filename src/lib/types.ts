export type WatchFamily = "monolith" | "pelagic" | "apex" | "vesper" | "meridian" | "orbit" | "reactor" | "phantom" | "helios" | "abyss" | "prism" | "nocturne";
export type CaseShape = "octagonal" | "cushion" | "tonneau" | "round" | "square" | "rectangle" | "hexagonal" | "oval" | "shield";
export type Metal = "steel" | "titanium" | "gold" | "rose" | "graphite" | "ceramic" | "bronze" | "platinum" | "silver" | "whitegold" | "carbon" | "sapphire";
export type DialTexture = "grid" | "horizontal" | "sunburst" | "lacquer" | "skeleton" | "carbon" | "meteorite" | "guilloche" | "mechanical" | "turbine" | "solar" | "abyssal" | "prismatic" | "aventurine" | "motherofpearl" | "malachite" | "lapis" | "marble" | "linen" | "honeycomb" | "wave" | "fume" | "enamel" | "sand";
export type Bezel = "polished" | "fluted" | "iced" | "ceramic" | "coined" | "scalloped" | "screws";
export type SecondsMotion = "sweep" | "tick" | "stepped";
export type SecondsIndication = "running" | "chronograph" | "none";
export type SecondsPlacement = "central" | "small" | "off-center" | "peripheral";
export type SecondsAdvances = 4 | 5 | 6 | 8 | 10 | 16;
export type SecondsSetting = "hacking" | "non-hacking" | "zero-reset";
export type ChronographBehavior = "standard" | "flyback" | "split";
export type Hands = "baton" | "sword" | "dauphine" | "skeleton" | "leaf" | "breguet" | "syringe" | "cathedral" | "arrow" | "lollipop" | "snowflake" | "mercedes";
export type Markers = "baton" | "roman" | "arabic" | "minimal" | "dots" | "triangles" | "diamonds" | "explorer" | "california" | "breguet" | "none";
export type Strap = "bracelet" | "leather" | "rubber" | "nato" | "mesh" | "rally" | "alligator" | "sailcloth" | "braided";
export type CaseFinish = "polished" | "brushed" | "blasted" | "hammered" | "damascus";
export type BraceletStyle = "three-link" | "five-link" | "beads-of-rice" | "engineer";
export type ChapterRing = "minute" | "railroad" | "dots" | "tachymeter" | "none";
export type CrystalStyle = "clear" | "domed" | "smoked" | "faceted";
export type LumeStyle = "standard" | "full-dial" | "hands-only" | "none";
export type Complication = "date" | "gmt" | "chronograph" | "weather" | "regulator" | "daynight" | "moonphase" | "daydate" | "calendar" | "none";
export type ActiveComplication = Exclude<Complication, "none">;
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
  additionalComplications?: ActiveComplication[];
  bezel?: Bezel;
  lumeColor?: string;
  signature?: string;
  initials?: string;
  secondsMotion?: SecondsMotion;
  secondsIndication?: SecondsIndication;
  secondsPlacement?: SecondsPlacement;
  secondsAdvances?: SecondsAdvances;
  /** Physical setting specification; device time remains authoritative. */
  secondsSetting?: SecondsSetting;
  /** Mechanism reference; the implemented stopwatch uses ordinary start/pause/reset. */
  chronographBehavior?: ChronographBehavior;
  caseFinish?: CaseFinish;
  strapColor?: string;
  braceletStyle?: BraceletStyle;
  chapterRing?: ChapterRing;
  crystalStyle?: CrystalStyle;
  lumeStyle?: LumeStyle;
  /** Source catalog references, not claims of physical hardware or certification. */
  catalogReferences?: string[];
}
export interface WatchPreset { id: WatchFamily; name: string; edition: string; description: string; category: string; design: WatchDesign; }
export interface SavedWatch { id: string; name: string; design: WatchDesign; favorite: boolean; createdAt: string; updatedAt: string; }
export interface LocationChoice { name: string; latitude: number; longitude: number; timezone: string; country?: string; }
export interface Preferences { primaryTimezone: string; secondaryTimezone: string; unit: "fahrenheit" | "celsius"; location: LocationChoice | null; activeWatchId: string; favoritePresets: string[]; }
export interface WeatherData { temperature: number; feelsLike: number; high: number; low: number; code: number; description: string; isDay: boolean; observedAt: string; fetchedAt: string; }
export interface StudioData { watches: SavedWatch[]; preferences: Preferences; }
export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string };
export const DEFAULT_PREFERENCES: Preferences = { primaryTimezone: "", secondaryTimezone: "Europe/London", unit: "fahrenheit", location: null, activeWatchId: "monolith", favoritePresets: [] };
