import { normalizeDesign } from "./presets";
import type { WatchDesign } from "./types";

export interface AtelierLook {
  id: string;
  name: string;
  description: string;
  color: string;
  parts: Partial<WatchDesign>;
}

export const LUME_COLORS = [
  { name: "Mint", value: "#9FFFD0" },
  { name: "Ice cyan", value: "#84EAFF" },
  { name: "Ultraviolet", value: "#BA9AFF" },
  { name: "Amber", value: "#FFD179" },
  { name: "Electric pink", value: "#FF8DCD" },
] as const;

export const ATELIER_LOOKS: readonly AtelierLook[] = [
  {
    id: "after-hours", name: "After Hours", color: "#8D58F5",
    description: "Black ceramic. Violet lacquer. An ultraviolet afterglow.",
    parts: { metal: "ceramic", bezel: "ceramic", dialColor: "#342052", texture: "lacquer", hands: "sword", markers: "baton", strap: "rubber", accentColor: "#C5A4FF", lumeColor: "#BA9AFF", secondsMotion: "sweep" },
  },
  {
    id: "icebreaker", name: "Icebreaker", color: "#B8E4F0",
    description: "Faceted ice around a silver dial. Cold, clear and impossible to miss.",
    parts: { metal: "steel", bezel: "iced", dialColor: "#CEDCE3", texture: "sunburst", hands: "sword", markers: "baton", strap: "bracelet", accentColor: "#2585B7", lumeColor: "#84EAFF", secondsMotion: "sweep" },
  },
  {
    id: "solar-flare", name: "Solar Flare", color: "#FF792D",
    description: "Forged carbon and graphite, charged with electric orange.",
    parts: { metal: "graphite", bezel: "ceramic", dialColor: "#251C16", texture: "carbon", hands: "sword", markers: "arabic", strap: "rubber", accentColor: "#FF792D", lumeColor: "#FFD179", secondsMotion: "tick" },
  },
  {
    id: "royal-velvet", name: "Royal Velvet", color: "#AC526A",
    description: "Rose gold, a fluted bezel, and burgundy cut with guilloché.",
    parts: { metal: "rose", bezel: "fluted", dialColor: "#581E35", texture: "guilloche", hands: "dauphine", markers: "roman", strap: "leather", accentColor: "#F4C6AF", lumeColor: "#FF8DCD", secondsMotion: "sweep" },
  },
  {
    id: "deep-space", name: "Deep Space", color: "#548CDA",
    description: "Blue meteorite in titanium. A fragment of somewhere else.",
    parts: { metal: "titanium", bezel: "polished", dialColor: "#122A4C", texture: "meteorite", hands: "sword", markers: "minimal", strap: "bracelet", accentColor: "#89BDFF", lumeColor: "#84EAFF", secondsMotion: "sweep" },
  },
  {
    id: "stealth", name: "Stealth", color: "#737D7B",
    description: "Graphite on black carbon. Quiet surfaces. A mint-green pulse.",
    parts: { metal: "graphite", bezel: "ceramic", dialColor: "#111817", texture: "carbon", hands: "baton", markers: "minimal", strap: "rubber", accentColor: "#C0DDCD", lumeColor: "#9FFFD0", secondsMotion: "tick" },
  },
];

export function applyAtelierLook(design: WatchDesign, id: string): WatchDesign {
  const look = ATELIER_LOOKS.find(candidate => candidate.id === id);
  return normalizeDesign(look ? { ...design, ...look.parts } : design);
}
