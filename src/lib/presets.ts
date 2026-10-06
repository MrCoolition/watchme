import type { ActiveComplication, Complication, WatchDesign, WatchFamily, WatchPreset } from "./types";
import { ATMOSPHERE_GRAVITIES, getAtmosphere, isUnrealFamily, isValidAtmosphere, UNREAL_FAMILIES, UNREAL_TEXTURES } from "./unreal";
export { isUnrealFamily, isUnrealTexture, UNREAL_FAMILIES } from "./unreal";

export const FLAGSHIP_FAMILIES = ["reactor", "phantom", "helios", "abyss", "prism", "nocturne"] as const;
export function isFlagshipFamily(family: string): boolean {
  return (FLAGSHIP_FAMILIES as readonly string[]).includes(family);
}

export const WATCH_FAMILIES = ["monolith", "pelagic", "apex", "vesper", "meridian", "orbit", ...FLAGSHIP_FAMILIES, ...UNREAL_FAMILIES] as const satisfies readonly WatchFamily[];

export const ACTIVE_COMPLICATIONS = ["date", "gmt", "chronograph", "weather", "regulator", "daynight", "moonphase", "daydate", "calendar"] as const satisfies readonly ActiveComplication[];
export const MAX_ACTIVE_COMPLICATIONS = 4;

export const PARTS = {
  caseShapes: ["octagonal", "cushion", "tonneau", "round", "square", "rectangle", "hexagonal", "oval", "shield"],
  metals: ["steel", "titanium", "gold", "rose", "graphite", "ceramic", "bronze", "platinum", "silver", "whitegold", "carbon", "sapphire"],
  textures: ["grid", "horizontal", "sunburst", "lacquer", "skeleton", "carbon", "meteorite", "guilloche", "mechanical", "turbine", "solar", "abyssal", "prismatic", "aventurine", "motherofpearl", "malachite", "lapis", "marble", "linen", "honeycomb", "wave", "fume", "enamel", "sand", ...UNREAL_TEXTURES],
  atmosphereGravities: ATMOSPHERE_GRAVITIES,
  bezels: ["polished", "fluted", "iced", "ceramic", "coined", "scalloped", "screws"],
  secondsMotions: ["sweep", "tick", "stepped"],
  secondsIndications: ["running", "chronograph", "none"],
  secondsPlacements: ["central", "small", "off-center", "peripheral"],
  secondsAdvances: [4, 5, 6, 8, 10, 16],
  secondsSettings: ["hacking", "non-hacking", "zero-reset"],
  chronographBehaviors: ["standard", "flyback", "split"],
  hands: ["baton", "sword", "dauphine", "skeleton", "leaf", "breguet", "syringe", "cathedral", "arrow", "lollipop", "snowflake", "mercedes"],
  markers: ["baton", "roman", "arabic", "minimal", "dots", "triangles", "diamonds", "explorer", "california", "breguet", "none"],
  straps: ["bracelet", "leather", "rubber", "nato", "mesh", "rally", "alligator", "sailcloth", "braided"],
  caseFinishes: ["polished", "brushed", "blasted", "hammered", "damascus"],
  braceletStyles: ["three-link", "five-link", "beads-of-rice", "engineer"],
  chapterRings: ["minute", "railroad", "dots", "tachymeter", "none"],
  crystalStyles: ["clear", "domed", "smoked", "faceted"],
  lumeStyles: ["standard", "full-dial", "hands-only", "none"],
  complications: [...ACTIVE_COMPLICATIONS, "none"],
} as const;

export const PRESETS: WatchPreset[] = [
  {
    id: "monolith", name: "Monolith", edition: "JADE / 01", category: "SPORT AUTOMATIC",
    description: "Architectural steel. A dial cut from the deep end of green.",
    design: { version: 1, family: "monolith", caseShape: "octagonal", metal: "steel", dialColor: "#104D3B", texture: "grid", hands: "baton", markers: "baton", strap: "bracelet", accentColor: "#B8F7D4", complication: "date" },
  },
  {
    id: "pelagic", name: "Pelagic", edition: "MIDNIGHT / 02", category: "SPORT ELEGANCE",
    description: "Midnight tides in brushed steel. Quietly impossible to ignore.",
    design: { version: 1, family: "pelagic", caseShape: "cushion", metal: "steel", dialColor: "#173F65", texture: "horizontal", hands: "baton", markers: "baton", strap: "bracelet", accentColor: "#A3D5FA", complication: "date" },
  },
  {
    id: "apex", name: "Apex", edition: "SIGNAL / 03", category: "CHRONOGRAPH",
    description: "Exposed architecture. Carbon tones. A pulse of electric orange.",
    design: { version: 1, family: "apex", caseShape: "tonneau", metal: "graphite", dialColor: "#21272B", texture: "skeleton", hands: "skeleton", markers: "arabic", strap: "rubber", accentColor: "#FF783B", complication: "chronograph" },
  },
  {
    id: "vesper", name: "Vesper", edition: "OBSIDIAN / 04", category: "DRESS WATCH",
    description: "Rose gold at the edge of darkness. Less, beautifully considered.",
    design: { version: 1, family: "vesper", caseShape: "round", metal: "rose", dialColor: "#141114", texture: "lacquer", hands: "dauphine", markers: "roman", strap: "leather", accentColor: "#EFC6AC", complication: "none" },
  },
  {
    id: "meridian", name: "Meridian", edition: "ICE / 05", category: "DUAL TIME",
    description: "Titanium, silver and a flash of blue. Two places. Your time.",
    design: { version: 1, family: "meridian", caseShape: "octagonal", metal: "titanium", dialColor: "#B8C3CB", texture: "sunburst", hands: "sword", markers: "baton", strap: "bracelet", accentColor: "#3884EC", complication: "gmt" },
  },
  {
    id: "orbit", name: "Orbit", edition: "ECLIPSE / 06", category: "REGULATOR",
    description: "Hours above. Seconds below. Time, in a different constellation.",
    design: { version: 1, family: "orbit", caseShape: "round", metal: "titanium", dialColor: "#101D3C", texture: "sunburst", hands: "sword", markers: "minimal", strap: "leather", accentColor: "#91ADFF", complication: "regulator" },
  },
  {
    id: "reactor", name: "REACTOR", edition: "BLACK LABEL / 07", category: "BLACK LABEL · MECHANICAL CHRONOGRAPH",
    description: "A machine in motion. Open mechanics, cut ceramic, and a pulse of electric mint.",
    design: { version: 1, family: "reactor", caseShape: "octagonal", metal: "ceramic", dialColor: "#101D20", texture: "mechanical", hands: "skeleton", markers: "baton", strap: "rubber", accentColor: "#79E8C5", complication: "chronograph", bezel: "ceramic", lumeColor: "#9FFFD0", secondsMotion: "sweep" },
  },
  {
    id: "phantom", name: "PHANTOM", edition: "VIOLET VELOCITY / 08", category: "BLACK LABEL · TURBINE CHRONOGRAPH",
    description: "A violet pulse inside a graphite machine. Cutaway turbines. Every second under control.",
    design: { version: 1, family: "phantom", caseShape: "tonneau", metal: "graphite", dialColor: "#19112D", texture: "turbine", hands: "skeleton", markers: "baton", strap: "rubber", accentColor: "#BB8CFF", complication: "chronograph", bezel: "ceramic", lumeColor: "#CFABFF", secondsMotion: "sweep" },
  },
  {
    id: "helios", name: "HELIOS", edition: "SOLAR SOVEREIGN / 09", category: "BLACK LABEL · SOLAR REGULATOR",
    description: "Sculpted gold radiating from the dark. Hours and seconds in their own orbits.",
    design: { version: 1, family: "helios", caseShape: "round", metal: "gold", dialColor: "#291B0C", texture: "solar", hands: "dauphine", markers: "minimal", strap: "leather", accentColor: "#FFD078", complication: "regulator", bezel: "fluted", lumeColor: "#FFE4A0", secondsMotion: "sweep" },
  },
  {
    id: "abyss", name: "ABYSS", edition: "PRESSURE BLUE / 10", category: "BLACK LABEL · DEEP-SEA GMT",
    description: "A pool of electric cyan in brushed titanium. Two time zones. Uncharted depths.",
    design: { version: 1, family: "abyss", caseShape: "cushion", metal: "titanium", dialColor: "#052B3C", texture: "abyssal", hands: "sword", markers: "baton", strap: "rubber", accentColor: "#43DFFA", complication: "gmt", bezel: "ceramic", lumeColor: "#83F2FF", secondsMotion: "sweep" },
  },
  {
    id: "prism", name: "PRISM", edition: "CHROMATIC ICE / 11", category: "BLACK LABEL · FACETED SPORT",
    description: "Cut light. Glacial facets. A spectrum locked inside polished steel.",
    design: { version: 1, family: "prism", caseShape: "octagonal", metal: "steel", dialColor: "#B8CEDC", texture: "prismatic", hands: "sword", markers: "baton", strap: "bracelet", accentColor: "#6250D8", complication: "date", bezel: "iced", lumeColor: "#9BDEFF", secondsMotion: "sweep" },
  },
  {
    id: "nocturne", name: "NOCTURNE", edition: "CELESTIAL HOURS / 12", category: "BLACK LABEL · CELESTIAL DAY / NIGHT",
    description: "Rose gold under a sky of stars. A living 24-hour horizon, wherever you are.",
    design: { version: 1, family: "nocturne", caseShape: "round", metal: "rose", dialColor: "#111733", texture: "aventurine", hands: "dauphine", markers: "roman", strap: "leather", accentColor: "#C5ADFF", complication: "daynight", bezel: "polished", lumeColor: "#D8C5FF", secondsMotion: "sweep" },
  },
  {
    id: "flux", name: "FLUX", edition: "UNREAL / 01", category: "UNREAL · LIQUID TIME",
    description: "Liquid light suspended in sapphire. A mirrored mesh bracelet. Time without a fixed state.",
    design: { version: 1, family: "flux", caseShape: "round", metal: "sapphire", dialColor: "#091722", texture: "liquid", hands: "sword", markers: "minimal", strap: "mesh", accentColor: "#C1F1FF", complication: "none", bezel: "polished", caseFinish: "polished", crystalStyle: "domed", lumeColor: "#C1F1FF", secondsMotion: "sweep", atmosphere: { intensity: 65, density: 60, gravity: "float", color: "#9BE7FF", calm: false } },
  },
  {
    id: "whiteout", name: "WHITEOUT", edition: "UNREAL / 02", category: "UNREAL · SNOW FIELD",
    description: "A private snowstorm beneath domed crystal. Brushed titanium, glacial light, and an ice-white strap.",
    design: { version: 1, family: "whiteout", caseShape: "cushion", metal: "titanium", dialColor: "#152531", texture: "snow", hands: "sword", markers: "baton", strap: "rubber", strapColor: "#DCECF1", accentColor: "#BCEAFF", complication: "date", bezel: "polished", caseFinish: "brushed", crystalStyle: "domed", lumeColor: "#D9F6FF", secondsMotion: "sweep", atmosphere: { intensity: 65, density: 60, gravity: "down", color: "#9BE7FF", calm: false } },
  },
];

export const FLAGSHIP_PRESETS = PRESETS.filter(preset => isFlagshipFamily(preset.id));
export const UNREAL_PRESETS = PRESETS.filter(preset => isUnrealFamily(preset.id));

export const COMPLICATIONS_BY_FAMILY = PRESETS.reduce((registry, preset) => {
  registry[preset.id] = PARTS.complications.filter((complication) => isComplicationCompatible(preset.design.caseShape, complication));
  return registry;
}, {} as Record<WatchDesign["family"], readonly Complication[]>);

export function isComplicationCompatible(caseShape: WatchDesign["caseShape"], complication: Complication): boolean {
  if (complication === "regulator") return caseShape === "round";
  if (complication === "chronograph") return caseShape !== "round";
  return true;
}

function isActiveComplication(value: unknown): value is ActiveComplication {
  return typeof value === "string" && (ACTIVE_COMPLICATIONS as readonly string[]).includes(value);
}

const LOWER_DIAL_COMPLICATIONS: readonly ActiveComplication[] = ["weather", "daynight", "moonphase", "calendar"];

/** Primary first, followed by additional functions in their saved order. */
export function getComplications(design: WatchDesign): ActiveComplication[] {
  if (!isActiveComplication(design.complication)) return [];
  const extras = Array.isArray(design.additionalComplications) ? design.additionalComplications.filter(isActiveComplication) : [];
  return [...new Set([design.complication, ...extras])];
}

export function hasComplication(design: WatchDesign, type: Complication): boolean {
  return type !== "none" && getComplications(design).includes(type);
}

function conflictWithActive(caseShape: WatchDesign["caseShape"], active: readonly ActiveComplication[], candidate: ActiveComplication): string | null {
  // Already selected functions remain removable, including after an in-progress case change.
  if (active.includes(candidate)) return null;
  if (!isComplicationCompatible(caseShape, candidate)) {
    return candidate === "regulator"
      ? "The regulator requires a round case."
      : "The chronograph requires a non-round case.";
  }
  if (LOWER_DIAL_COMPLICATIONS.includes(candidate)) {
    if (active.includes("regulator")) return "The regulator already occupies the lower dial.";
    if (active.some(type => LOWER_DIAL_COMPLICATIONS.includes(type))) return "Moon phase, day/night, calendar and weather share the lower dial. Choose one.";
  }
  if (candidate === "regulator" && active.some(type => LOWER_DIAL_COMPLICATIONS.includes(type))) {
    return "The regulator needs the lower dial used by moon phase, day/night, calendar or weather.";
  }
  if ((candidate === "date" && active.includes("daydate")) || (candidate === "daydate" && active.includes("date"))) return "Date and day/date share the calendar window. Choose one.";
  if (active.length >= MAX_ACTIVE_COMPLICATIONS) return "A watch supports up to four complications.";
  return null;
}

/** Returns why a new function cannot be added; selected functions and `none` remain selectable. */
export function complicationConflict(design: WatchDesign, candidate: Complication): string | null {
  if (candidate === "none") return null;
  if (!isActiveComplication(candidate)) return "Choose a valid complication.";
  const active = getComplications(design);
  if (!active.includes(candidate) && design.secondsIndication !== "none") {
    if (design.secondsPlacement === "small" && (LOWER_DIAL_COMPLICATIONS.includes(candidate) || candidate === "regulator")) return "Small seconds already occupies the lower dial. Choose central or peripheral seconds first.";
    if (design.secondsPlacement === "off-center" && (candidate === "chronograph" || candidate === "regulator")) return "Off-center seconds shares a register with this function. Choose central or peripheral seconds first.";
  }
  return conflictWithActive(design.caseShape, active, candidate);
}

/** Separate seconds choices still need an available register and a real elapsed-time source. */
export function secondsConflict(design: WatchDesign): string | null {
  if (design.secondsIndication === "none") return null;
  const active = getComplications(design);
  if (design.secondsIndication === "chronograph" && !active.includes("chronograph")) return "Add the chronograph complication before choosing stopwatch seconds.";
  if (design.secondsPlacement === "small" && active.some(type => LOWER_DIAL_COMPLICATIONS.includes(type) || type === "regulator")) return "Small seconds needs the lower dial. Remove its current function or choose another placement.";
  if (design.secondsPlacement === "off-center" && active.some(type => type === "chronograph" || type === "regulator")) return "Off-center seconds shares a register with the chronograph or regulator. Choose another placement.";
  return null;
}

function hasCompatibleComplications(design: WatchDesign): boolean {
  const extras = design.additionalComplications;
  if (extras !== undefined && (!Array.isArray(extras) || extras.length >= MAX_ACTIVE_COMPLICATIONS || !extras.every(isActiveComplication))) return false;
  if (design.complication === "none") return !extras?.length;
  if (!isActiveComplication(design.complication)) return false;
  const active: ActiveComplication[] = [];
  for (const candidate of [design.complication, ...(extras ?? [])]) {
    if (!isActiveComplication(candidate) || active.includes(candidate) || conflictWithActive(design.caseShape, active, candidate)) return false;
    active.push(candidate);
  }
  return true;
}

/** The first compatible item becomes primary; invalid or overlapping later items are dropped. */
export function setComplications(design: WatchDesign, list: readonly Complication[]): WatchDesign {
  const active = list.filter(isActiveComplication);
  const next: WatchDesign = { ...design, complication: active[0] ?? "none" };
  delete next.additionalComplications;
  if (active.length > 1) next.additionalComplications = active.slice(1);
  return normalizeDesign(next);
}

/** Signature is visible dial text: up to 14 Unicode characters, with no invisible controls or line breaks. */
export function isValidSignature(value: unknown): value is string {
  return typeof value === "string" && [...value].length <= 14 && !/[\p{C}\p{Zl}\p{Zp}]/u.test(value);
}

export function isValidInitials(value: unknown): value is string {
  return isValidSignature(value) && [...value].length <= 4;
}

export const MAX_CATALOG_REFERENCES = 40;
/** Stable workbook row IDs and the separately versioned user-supplied supplement. */
export function isCatalogReference(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (value.startsWith("spec-")) {
    const item = Number(value.slice(5));
    return Number.isInteger(item) && item >= 1 && item <= 120 && value === `spec-${item}`;
  }
  const row = Number(value.slice(8));
  return Number.isInteger(row) && row >= 9 && row <= 1319 && value === `catalog-${row}`;
}

export function isCompatibleDesign(design: WatchDesign): boolean {
  if (!design || typeof design !== "object" || design.version !== 1) return false;
  return PRESETS.some((preset) => preset.id === design.family)
    && (PARTS.caseShapes as readonly string[]).includes(design.caseShape)
    && (PARTS.metals as readonly string[]).includes(design.metal)
    && (PARTS.textures as readonly string[]).includes(design.texture)
    && (PARTS.hands as readonly string[]).includes(design.hands)
    && (PARTS.markers as readonly string[]).includes(design.markers)
    && (PARTS.straps as readonly string[]).includes(design.strap)
    && (PARTS.complications as readonly string[]).includes(design.complication)
    && /^#[a-f\d]{6}$/i.test(design.dialColor)
    && /^#[a-f\d]{6}$/i.test(design.accentColor)
    && (design.bezel === undefined || (PARTS.bezels as readonly string[]).includes(design.bezel))
    && (design.lumeColor === undefined || (typeof design.lumeColor === "string" && /^#[a-f\d]{6}$/i.test(design.lumeColor)))
    && (design.signature === undefined || isValidSignature(design.signature))
    && (design.initials === undefined || isValidInitials(design.initials))
    && (design.secondsMotion === undefined || (PARTS.secondsMotions as readonly string[]).includes(design.secondsMotion))
    && (design.caseFinish === undefined || (PARTS.caseFinishes as readonly string[]).includes(design.caseFinish))
    && (design.braceletStyle === undefined || (PARTS.braceletStyles as readonly string[]).includes(design.braceletStyle))
    && (design.chapterRing === undefined || (PARTS.chapterRings as readonly string[]).includes(design.chapterRing))
    && (design.crystalStyle === undefined || (PARTS.crystalStyles as readonly string[]).includes(design.crystalStyle))
    && (design.lumeStyle === undefined || (PARTS.lumeStyles as readonly string[]).includes(design.lumeStyle))
    && (design.strapColor === undefined || (typeof design.strapColor === "string" && /^#[a-f\d]{6}$/i.test(design.strapColor)))
    && (design.catalogReferences === undefined || (Array.isArray(design.catalogReferences) && design.catalogReferences.length <= MAX_CATALOG_REFERENCES && Array.from(design.catalogReferences).every(isCatalogReference) && new Set(design.catalogReferences).size === design.catalogReferences.length))
    && (design.secondsIndication === undefined || (PARTS.secondsIndications as readonly string[]).includes(design.secondsIndication))
    && (design.secondsPlacement === undefined || (PARTS.secondsPlacements as readonly string[]).includes(design.secondsPlacement))
    && (design.secondsAdvances === undefined || (PARTS.secondsAdvances as readonly number[]).includes(design.secondsAdvances))
    && (design.secondsSetting === undefined || (PARTS.secondsSettings as readonly string[]).includes(design.secondsSetting))
    && (design.chronographBehavior === undefined || (PARTS.chronographBehaviors as readonly string[]).includes(design.chronographBehavior))
    && (design.atmosphere === undefined || isValidAtmosphere(design.atmosphere))
    && !secondsConflict(design)
    && hasCompatibleComplications(design);
}

export function normalizeDesign(design: WatchDesign): WatchDesign {
  const fallback = PRESETS.find((preset) => preset.id === design?.family)?.design ?? PRESETS[0].design;
  const pick = <T extends string>(value: T, choices: readonly T[], defaultValue: T): T => choices.includes(value) ? value : defaultValue;
  const normalized: WatchDesign = {
    version: 1, family: fallback.family,
    caseShape: pick(design?.caseShape, PARTS.caseShapes, fallback.caseShape),
    metal: pick(design?.metal, PARTS.metals, fallback.metal),
    texture: pick(design?.texture, PARTS.textures, fallback.texture),
    hands: pick(design?.hands, PARTS.hands, fallback.hands),
    markers: pick(design?.markers, PARTS.markers, fallback.markers),
    strap: pick(design?.strap, PARTS.straps, fallback.strap),
    complication: pick(design?.complication, PARTS.complications, fallback.complication),
    dialColor: /^#[a-f\d]{6}$/i.test(design?.dialColor) ? design.dialColor : fallback.dialColor,
    accentColor: /^#[a-f\d]{6}$/i.test(design?.accentColor) ? design.accentColor : fallback.accentColor,
  };
  // Do not materialize defaults for old v1 designs. Absent fields retain their original rendering behavior.
  if (design?.bezel !== undefined && (PARTS.bezels as readonly string[]).includes(design.bezel)) normalized.bezel = design.bezel;
  if (typeof design?.lumeColor === "string" && /^#[a-f\d]{6}$/i.test(design.lumeColor)) normalized.lumeColor = design.lumeColor;
  if (design?.signature !== undefined && isValidSignature(design.signature)) normalized.signature = design.signature;
  if (design?.initials !== undefined && isValidInitials(design.initials)) normalized.initials = design.initials;
  if (design?.secondsMotion !== undefined && (PARTS.secondsMotions as readonly string[]).includes(design.secondsMotion)) normalized.secondsMotion = design.secondsMotion;
  if (design?.secondsIndication !== undefined && (PARTS.secondsIndications as readonly string[]).includes(design.secondsIndication)) normalized.secondsIndication = design.secondsIndication;
  if (design?.secondsPlacement !== undefined && (PARTS.secondsPlacements as readonly string[]).includes(design.secondsPlacement)) normalized.secondsPlacement = design.secondsPlacement;
  if (design?.secondsAdvances !== undefined && (PARTS.secondsAdvances as readonly number[]).includes(design.secondsAdvances)) normalized.secondsAdvances = design.secondsAdvances;
  if (design?.secondsSetting !== undefined && (PARTS.secondsSettings as readonly string[]).includes(design.secondsSetting)) normalized.secondsSetting = design.secondsSetting;
  if (design?.chronographBehavior !== undefined && (PARTS.chronographBehaviors as readonly string[]).includes(design.chronographBehavior)) normalized.chronographBehavior = design.chronographBehavior;
  if (design?.caseFinish !== undefined && (PARTS.caseFinishes as readonly string[]).includes(design.caseFinish)) normalized.caseFinish = design.caseFinish;
  if (design?.braceletStyle !== undefined && (PARTS.braceletStyles as readonly string[]).includes(design.braceletStyle)) normalized.braceletStyle = design.braceletStyle;
  if (design?.chapterRing !== undefined && (PARTS.chapterRings as readonly string[]).includes(design.chapterRing)) normalized.chapterRing = design.chapterRing;
  if (design?.crystalStyle !== undefined && (PARTS.crystalStyles as readonly string[]).includes(design.crystalStyle)) normalized.crystalStyle = design.crystalStyle;
  if (design?.lumeStyle !== undefined && (PARTS.lumeStyles as readonly string[]).includes(design.lumeStyle)) normalized.lumeStyle = design.lumeStyle;
  if (typeof design?.strapColor === "string" && /^#[a-f\d]{6}$/i.test(design.strapColor)) normalized.strapColor = design.strapColor;
  if (Array.isArray(design?.catalogReferences)) normalized.catalogReferences = [...new Set(design.catalogReferences.filter(isCatalogReference))].slice(0, MAX_CATALOG_REFERENCES);
  if (design?.atmosphere !== undefined) normalized.atmosphere = getAtmosphere({ ...normalized, atmosphere: design.atmosphere });
  const active: ActiveComplication[] = [];
  // Selecting None clears the full layout. If only the case changed, preserve valid extras
  // and promote the first surviving function when the old primary no longer fits.
  if (normalized.complication !== "none") {
    const extras = Array.isArray(design?.additionalComplications) ? design.additionalComplications : [];
    for (const candidate of [normalized.complication, ...extras]) {
      if (isActiveComplication(candidate) && !active.includes(candidate) && !conflictWithActive(normalized.caseShape, active, candidate)) active.push(candidate);
    }
  }
  normalized.complication = active[0] ?? "none";
  if (active.length > 1) normalized.additionalComplications = active.slice(1);
  else if (Array.isArray(design?.additionalComplications) && design.additionalComplications.length === 0) normalized.additionalComplications = [];
  if (normalized.secondsIndication === "chronograph" && !active.includes("chronograph")) normalized.secondsIndication = "running";
  if (secondsConflict(normalized)) normalized.secondsPlacement = "central";
  return normalized;
}
