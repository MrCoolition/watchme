import type { Complication, WatchDesign, WatchPreset } from "./types";

export const PARTS = {
  caseShapes: ["octagonal", "cushion", "tonneau", "round"],
  metals: ["steel", "titanium", "gold", "rose", "graphite", "ceramic"],
  textures: ["grid", "horizontal", "sunburst", "lacquer", "skeleton", "carbon", "meteorite", "guilloche", "mechanical"],
  bezels: ["polished", "fluted", "iced", "ceramic"],
  secondsMotions: ["sweep", "tick"],
  hands: ["baton", "sword", "dauphine", "skeleton"],
  markers: ["baton", "roman", "arabic", "minimal"],
  straps: ["bracelet", "leather", "rubber"],
  complications: ["date", "gmt", "chronograph", "weather", "regulator", "none"],
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
];

export const COMPLICATIONS_BY_FAMILY = PRESETS.reduce((registry, preset) => {
  registry[preset.id] = PARTS.complications.filter((complication) => isComplicationCompatible(preset.design.caseShape, complication));
  return registry;
}, {} as Record<WatchDesign["family"], readonly Complication[]>);

export function isComplicationCompatible(caseShape: WatchDesign["caseShape"], complication: Complication): boolean {
  if (complication === "regulator") return caseShape === "round";
  if (complication === "chronograph") return caseShape !== "round";
  return true;
}

/** Signature is visible dial text: up to 14 Unicode characters, with no invisible controls or line breaks. */
export function isValidSignature(value: unknown): value is string {
  return typeof value === "string" && [...value].length <= 14 && !/[\p{C}\p{Zl}\p{Zp}]/u.test(value);
}

export function isValidInitials(value: unknown): value is string {
  return isValidSignature(value) && [...value].length <= 4;
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
    && isComplicationCompatible(design.caseShape, design.complication);
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
  if (!isComplicationCompatible(normalized.caseShape, normalized.complication)) normalized.complication = "none";
  return normalized;
}
