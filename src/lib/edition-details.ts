import { getComplications, hasComplication } from "@/lib/presets";
import type { ActiveComplication, WatchDesign } from "@/lib/types";
import { getAtmosphere, isUnrealFamily, isUnrealTexture, WHITEOUT_SCENES } from "@/lib/unreal";

export interface EditionReference {
  id: string;
  category: string;
  option: string;
  description?: string;
  sourceLabel?: string;
  sourceUrl?: string;
}

/** Structural input keeps the complete catalog out of the edition bundle. */
export interface EditionReferenceSource {
  id: string;
  category: string;
  option: string;
  description: string;
  sourceRow?: number;
  sourceLabel?: string;
  sourceUrl?: string;
}

export interface EditionDetailRow { label: string; value: string; color?: string; note?: string; }
export interface EditionDetailSection { id: string; title: string; rows: EditionDetailRow[]; }
export type EditionPage =
  | { id: "portrait"; label: "Portrait"; kind: "portrait" }
  | { id: "build"; label: "Build sheet"; kind: "build" }
  | { id: "atmosphere"; label: "Atmosphere"; kind: "atmosphere" }
  | { id: `references-${number}`; label: string; kind: "references"; index: number };

export const EDITION_REFERENCES_PER_PAGE = 12;

/** Keep saved order, including missing entries, so references never silently disappear. */
export function resolveEditionReferences(design: WatchDesign, entries: readonly EditionReferenceSource[]): EditionReference[] {
  const lookup = new Map(entries.map(entry => [entry.id, entry]));
  return (design.catalogReferences ?? []).map(id => {
    const entry = lookup.get(id);
    if (!entry) return {
      id, category: "Unavailable reference", option: `Missing reference: ${id}`,
      description: "This saved reference is unavailable in the current catalog.", sourceLabel: "Saved reference",
    };
    return {
      id, category: entry.category, option: entry.option, description: entry.description,
      sourceLabel: entry.sourceLabel || (entry.sourceRow !== undefined ? `Master catalog · row ${entry.sourceRow}` : "Catalog reference"),
      ...(entry.sourceUrl ? { sourceUrl: entry.sourceUrl } : {}),
    };
  });
}

export function getEditionPages(design: WatchDesign): EditionPage[] {
  const pages: EditionPage[] = [
    { id: "portrait", label: "Portrait", kind: "portrait" },
    { id: "build", label: "Build sheet", kind: "build" },
  ];
  if (isUnrealFamily(design.family) || isUnrealTexture(design.texture) || design.atmosphere !== undefined) {
    pages.push({ id: "atmosphere", label: "Atmosphere", kind: "atmosphere" });
  }
  for (let index = 0; index < Math.ceil((design.catalogReferences?.length ?? 0) / EDITION_REFERENCES_PER_PAGE); index++) {
    pages.push({ id: `references-${index + 1}`, label: `References ${index + 1}`, kind: "references", index });
  }
  return pages;
}

const MATERIALS: Record<WatchDesign["metal"], string> = {
  steel: "Stainless steel", titanium: "Titanium", gold: "Gold tone", rose: "Rose gold tone", graphite: "Graphite",
  ceramic: "Black ceramic", bronze: "Bronze tone", platinum: "Platinum tone", silver: "Silver tone",
  whitegold: "White gold tone", carbon: "Carbon composite", sapphire: "Sapphire crystal",
};
const TEXTURES: Record<WatchDesign["texture"], string> = {
  grid: "Clous de Paris", horizontal: "Horizontal relief", sunburst: "Sunburst", lacquer: "Lacquer", skeleton: "Open architecture",
  carbon: "Carbon weave", meteorite: "Meteorite", guilloche: "Guilloché", mechanical: "Mechanical layers", turbine: "Sculpted turbine",
  solar: "Solar sculpture", abyssal: "Abyssal contours", prismatic: "Iridescent facets", aventurine: "Aventurine sky",
  motherofpearl: "Mother-of-pearl", malachite: "Malachite", lapis: "Lapis lazuli", marble: "Marble", linen: "Linen weave",
  honeycomb: "Honeycomb", wave: "Wave relief", fume: "Fumé gradient", enamel: "Enamel", sand: "Sand grain", snow: "Snow atmosphere",
};
const SHAPES: Record<WatchDesign["caseShape"], string> = { octagonal: "Octagonal", cushion: "Cushion", tonneau: "Tonneau", round: "Round", square: "Square", rectangle: "Rectangular", hexagonal: "Hexagonal", oval: "Oval", shield: "Shield" };
const FINISHES: Record<NonNullable<WatchDesign["caseFinish"]>, string> = { polished: "Polished", brushed: "Brushed", blasted: "Blasted", hammered: "Hammered", damascus: "Damascus pattern" };
const BEZELS: Record<NonNullable<WatchDesign["bezel"]>, string> = { polished: "Polished", fluted: "Fluted", iced: "Iced", ceramic: "Ceramic", coined: "Coin-edge", scalloped: "Scalloped", screws: "Exposed screws" };
const CRYSTALS: Record<NonNullable<WatchDesign["crystalStyle"]>, string> = { clear: "Clear", domed: "Domed", smoked: "Smoked", faceted: "Faceted" };
const HANDS: Record<WatchDesign["hands"], string> = { baton: "Baton", sword: "Sword", dauphine: "Dauphine", skeleton: "Skeleton", leaf: "Leaf", breguet: "Breguet", syringe: "Syringe", cathedral: "Cathedral", arrow: "Arrow", lollipop: "Lollipop", snowflake: "Snowflake", mercedes: "Mercedes-style" };
const MARKERS: Record<WatchDesign["markers"], string> = { baton: "Baton indices", roman: "Roman numerals", arabic: "Arabic numerals", minimal: "Minimal indices", dots: "Dot indices", triangles: "Triangle indices", diamonds: "Diamond indices", explorer: "3-6-9 numerals", california: "California numerals", breguet: "Breguet numerals", none: "No indices" };
const TRACKS: Record<NonNullable<WatchDesign["chapterRing"]>, string> = { minute: "Minute track", railroad: "Railroad track", dots: "Dot track", tachymeter: "Tachymeter scale", none: "No chapter markings" };
const STRAPS: Record<WatchDesign["strap"], string> = { bracelet: "Metal bracelet", leather: "Leather pattern", rubber: "Rubber pattern", nato: "NATO-style textile", mesh: "Woven metal mesh", rally: "Rally strap", alligator: "Alligator pattern", sailcloth: "Sailcloth pattern", braided: "Braided strap" };
const LINKS: Record<NonNullable<WatchDesign["braceletStyle"]>, string> = { "three-link": "Three-link", "five-link": "Five-link", "beads-of-rice": "Beads-of-rice", engineer: "Engineer" };
const MOTIONS: Record<NonNullable<WatchDesign["secondsMotion"]>, string> = { sweep: "Continuous glide", tick: "One-second tick", stepped: "Multiple steps per second" };
const PLACEMENTS: Record<NonNullable<WatchDesign["secondsPlacement"]>, string> = { central: "Central", small: "Small seconds", "off-center": "Off-center", peripheral: "Peripheral" };
const SETTINGS: Record<NonNullable<WatchDesign["secondsSetting"]>, string> = { hacking: "Hacking", "non-hacking": "Non-hacking", "zero-reset": "Zero-reset" };
const CHRONOGRAPH_BEHAVIORS: Record<NonNullable<WatchDesign["chronographBehavior"]>, string> = { standard: "Ordinary reset", flyback: "Flyback", split: "Split seconds" };
const FUNCTIONS: Record<ActiveComplication, string> = { date: "Date", daydate: "Day / date", calendar: "Calendar", gmt: "GMT", chronograph: "Chronograph", weather: "Weather", regulator: "Regulator", daynight: "Day / night", moonphase: "Moon phase" };
const LUME: Record<NonNullable<WatchDesign["lumeStyle"]>, string> = { standard: "Hands + markers", "full-dial": "Full-dial lume", "hands-only": "Hands only", none: "No lume" };

function colorRow(label: string, value: string, note?: string): EditionDetailRow {
  return { label, value: value.toUpperCase(), color: value.toUpperCase(), ...(note ? { note } : {}) };
}

function dialColorNote(design: WatchDesign): string {
  if (isUnrealTexture(design.texture)) return "Saved / inactive on the main dial; used when counters are present.";
  if (["motherofpearl", "malachite", "lapis", "marble"].includes(design.texture)) {
    return "Saved base; inactive on the texture-led main dial, used by counters.";
  }
  if (design.texture === "mechanical") return "Base and counters; mechanical artwork has its own palette.";
  if (["turbine", "solar", "abyssal", "prismatic", "aventurine"].includes(design.texture)) return "Tint within the texture's layered palette.";
  return "Base color; texture, shading and light alter its appearance.";
}

/** A separate page keeps the complete atmosphere out of the six-column build layout. */
export function getEditionAtmosphereDetails(design: WatchDesign): EditionDetailSection {
  const atmosphere = getAtmosphere(design);
  const active = isUnrealTexture(design.texture);
  const gravity = { down: "Downward", float: "Floating", up: "Upward" } as const;
  const inactive = "Saved / inactive on the selected dial texture.";
  const scene = WHITEOUT_SCENES.find(item => item.id === atmosphere.scene)!;
  return { id: "atmosphere", title: "Atmosphere", rows: [
    { label: "Display", value: active ? "Snow atmosphere" : "Inactive", note: active ? "A miniature winter world beneath the hands." : "Choose a snow texture to use these settings." },
    { label: "Scene", value: scene.name, note: active ? scene.description : inactive },
    { label: "Intensity", value: `${atmosphere.intensity}%`, note: active ? "Strength of the atmosphere's motion." : inactive },
    { label: "Density", value: `${atmosphere.density}%`, note: active ? "Amount of visible material in the dial." : inactive },
    { label: "Gravity", value: gravity[atmosphere.gravity], note: active ? "Direction of the digital atmosphere." : inactive },
    colorRow("Atmosphere color", atmosphere.color, active ? design.atmosphere ? "Selected particle and material color." : "Default atmosphere color." : inactive),
    { label: "Calm mode", value: atmosphere.calm ? "On" : "Off", note: !active ? inactive : atmosphere.calm ? "Automatic motion paused; direct interaction remains available." : "Automatic motion enabled; reduced motion follows your device." },
  ] };
}

function strapColorRow(design: WatchDesign): EditionDetailRow {
  const metallic = design.strap === "bracelet" || design.strap === "mesh";
  if (design.strapColor) return colorRow("Strap color", design.strapColor, metallic ? "Visible tint over the selected case metal." : "Selected base color with material shading.");
  if (metallic) return { label: "Strap color", value: "Follows case metal", note: "Default; no separate color tint." };
  if (design.strap === "rubber") return { label: "Strap color", value: "Charcoal gradient", note: "Default rubber palette; no color override." };
  if (design.strap === "leather") return { label: "Strap color", value: "Black plum gradient", note: "Default leather palette; no color override." };
  return colorRow("Strap color", "#273B40", "Default catalog strap color.");
}

function secondsRows(design: WatchDesign): EditionDetailRow[] {
  const chrono = hasComplication(design, "chronograph");
  const regulator = hasComplication(design, "regulator");
  const custom = design.secondsIndication !== undefined || design.secondsPlacement !== undefined;
  const hidden = design.secondsIndication === "none";
  const legacySmall = !custom && (regulator || design.family === "vesper" && getComplications(design).length === 0);
  const source = design.secondsIndication ?? (chrono ? "chronograph" : "running");
  const motion = design.secondsMotion ?? "sweep";
  const rows: EditionDetailRow[] = [
    { label: "Indication", value: hidden ? "Hidden" : !custom && chrono ? "Elapsed + running seconds" : source === "chronograph" ? "Elapsed stopwatch seconds" : "Running clock seconds", note: custom ? "Selected seconds display." : "Original preset layout." },
    { label: "Placement", value: custom ? PLACEMENTS[design.secondsPlacement ?? "central"] : chrono ? "Central + off-center register" : legacySmall ? "Small seconds register" : "Central", ...(hidden ? { note: "Saved / inactive while seconds are hidden." } : custom && !design.secondsPlacement ? { note: "Default central placement for the selected indication." } : {}) },
    { label: "Motion", value: MOTIONS[motion], note: hidden ? "Saved / inactive while seconds are hidden." : `${design.secondsMotion ? "Selected" : "Default"} software animation; static exports freeze time.` },
    { label: "Advances", value: motion === "stepped" || design.secondsAdvances !== undefined ? `${design.secondsAdvances ?? 8} per second` : motion === "tick" ? "1 per second" : "Continuous", note: design.secondsAdvances !== undefined && (hidden || motion !== "stepped") ? "Saved / inactive outside visible stepped motion." : hidden ? "Inactive while seconds are hidden." : motion === "stepped" ? `${design.secondsAdvances === undefined ? "Default rate. " : ""}Animation rate, not a movement frequency.` : "Software motion, not a physical movement specification." },
    { label: "Setting reference", value: design.secondsSetting ? SETTINGS[design.secondsSetting] : "Not selected", note: design.secondsSetting ? "Saved reference only; device time remains authoritative." : "No physical setting mechanism specified." },
  ];
  return rows;
}

/** All design fields are represented; display state and time zones belong to the caller. */
export function getEditionDetails(design: WatchDesign): EditionDetailSection[] {
  const active = getComplications(design);
  const lumeColor = design.lumeColor || design.accentColor;
  const referenceCount = design.catalogReferences?.length ?? 0;
  return [
    { id: "case", title: "Case & finish", rows: [
      { label: "Family", value: design.family.toUpperCase() },
      { label: "Shape", value: SHAPES[design.caseShape] },
      { label: "Material", value: MATERIALS[design.metal], note: "Digital material appearance." },
      { label: "Finish", value: design.caseFinish ? FINISHES[design.caseFinish] : "Original mixed finish", ...(!design.caseFinish ? { note: "Default layered brushing and polished highlights." } : {}) },
      { label: "Bezel", value: BEZELS[design.bezel ?? "polished"], ...(!design.bezel ? { note: "Default polished treatment." } : {}) },
      { label: "Crystal", value: CRYSTALS[design.crystalStyle ?? "clear"], note: design.crystalStyle ? "Selected visual treatment." : "Default clear reflections." },
    ] },
    { id: "dial", title: "Dial & hands", rows: [
      { label: "Texture", value: TEXTURES[design.texture] },
      colorRow("Dial color", design.dialColor, dialColorNote(design)),
      colorRow("Accent color", design.accentColor, "Hands, scales and details where supported."),
      { label: "Hands", value: HANDS[design.hands], ...(hasComplication(design, "regulator") ? { note: "Minute hand style; regulator hour hand has its own shape." } : {}) },
      { label: "Markers", value: MARKERS[design.markers] },
      { label: "Chapter ring", value: TRACKS[design.chapterRing ?? "minute"], ...(!design.chapterRing ? { note: "Default minute track." } : {}) },
    ] },
    { id: "strap", title: "Strap & bracelet", rows: [
      { label: "Strap", value: STRAPS[design.strap] },
      { label: "Bracelet links", value: design.braceletStyle ? LINKS[design.braceletStyle] : design.strap === "bracelet" ? "Three-link" : "Not selected", note: design.strap !== "bracelet" ? design.braceletStyle ? "Saved / inactive on the selected strap." : "Used only with a metal bracelet." : design.braceletStyle ? "Selected bracelet construction appearance." : "Default bracelet layout." },
      strapColorRow(design),
    ] },
    { id: "seconds", title: "Seconds display", rows: secondsRows(design) },
    { id: "functions", title: "Functions & light", rows: [
      { label: "Primary function", value: design.complication === "none" ? "Time only" : FUNCTIONS[design.complication] },
      { label: "Additional functions", value: active.slice(1).map(type => FUNCTIONS[type]).join(" · ") || "None" },
      { label: "Lume treatment", value: LUME[design.lumeStyle ?? "standard"], note: design.lumeStyle === "none" ? "Luminous treatment disabled." : `${design.lumeStyle ? "Selected" : "Default"} treatment in Lume or Eclipse mode.` },
      colorRow("Lume color", lumeColor, design.lumeStyle === "none" ? `${design.lumeColor ? "Saved" : "Default accent"} / inactive while lume is disabled.` : design.lumeColor ? "Selected luminous color." : "Default: follows accent color."),
      { label: "Chronograph reference", value: design.chronographBehavior ? CHRONOGRAPH_BEHAVIORS[design.chronographBehavior] : "Not selected", note: design.chronographBehavior ? "Saved reference; app stopwatch uses start / pause / reset." : hasComplication(design, "chronograph") ? "App stopwatch uses start / pause / reset." : "No chronograph behavior reference saved." },
    ] },
    { id: "personalization", title: "Signature & references", rows: [
      { label: "Signature", value: design.signature?.trim() || "Not set" },
      { label: "Initials", value: design.initials?.trim().toUpperCase() || "Not set" },
      { label: "Saved references", value: referenceCount ? `${referenceCount} catalog ${referenceCount === 1 ? "reference" : "references"}` : "None", note: referenceCount ? "Design research; no claim of hardware or certification." : "No catalog references saved." },
      { label: "Edition", value: isUnrealFamily(design.family) ? "Original WATCHMÉ UNREAL design" : "Original WATCHMÉ design" },
    ] },
  ];
}
