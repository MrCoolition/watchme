import type { Atmosphere, WatchDesign, WatchFamily, WhiteoutScene } from "./types";

export const UNREAL_FAMILIES = ["whiteout", "evergreen", "nightfall", "noel", "borealis", "starfall"] as const satisfies readonly WatchFamily[];
export const UNREAL_TEXTURES = ["snow"] as const;
export const ATMOSPHERE_GRAVITIES = ["down", "float", "up"] as const;
export const WHITEOUT_SCENE_IDS = ["glacier", "forest", "city", "christmas", "aurora", "observatory"] as const satisfies readonly WhiteoutScene[];
export const WHITEOUT_SCENES = [
  { id: "glacier", name: "Glacier", description: "Blue ice, sculpted ridges and a private snowstorm.", color: "#9BE7FF" },
  { id: "forest", name: "Forest", description: "Snow-covered evergreens beneath a moonlit winter sky.", color: "#AEEDD1" },
  { id: "city", name: "City", description: "A midnight skyline, glowing windows and falling snow.", color: "#A9C9FF" },
  { id: "christmas", name: "Christmas", description: "A festive village, a glowing tree and warm holiday lights.", color: "#FFE3B0" },
  { id: "aurora", name: "Aurora", description: "Northern lights drifting above a frozen mountain horizon.", color: "#A3FFE1" },
  { id: "observatory", name: "Observatory", description: "A snowy observatory beneath a field of distant stars.", color: "#CBB9FF" },
] as const satisfies readonly { id: WhiteoutScene; name: string; description: string; color: string }[];
const FAMILY_SCENES: Partial<Record<WatchFamily, WhiteoutScene>> = {
  whiteout: "glacier", evergreen: "forest", nightfall: "city", noel: "christmas", borealis: "aurora", starfall: "observatory",
};
export type ResolvedAtmosphere = Atmosphere & { scene: WhiteoutScene };

export function isUnrealFamily(family: string): boolean {
  return (UNREAL_FAMILIES as readonly string[]).includes(family);
}

export function isUnrealTexture(texture: string): boolean {
  return (UNREAL_TEXTURES as readonly string[]).includes(texture);
}

export function isWhiteoutScene(value: unknown): value is WhiteoutScene {
  return (WHITEOUT_SCENE_IDS as readonly unknown[]).includes(value);
}

export function getWhiteoutScene(design: Pick<WatchDesign, "family" | "atmosphere">): WhiteoutScene {
  return isWhiteoutScene(design.atmosphere?.scene) ? design.atmosphere.scene : FAMILY_SCENES[design.family] ?? "glacier";
}

function validColor(value: unknown): value is string {
  return typeof value === "string" && value.length === 7 && /^#[a-f\d]{6}$/i.test(value);
}

/** Strict persistence guard. Five-field v1 settings remain valid; scene is optional. */
export function isValidAtmosphere(value: unknown): value is Atmosphere {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (Object.keys(item).some(key => !["intensity", "density", "gravity", "color", "calm", "scene"].includes(key))) return false;
  return typeof item.intensity === "number" && Number.isFinite(item.intensity) && item.intensity >= 0 && item.intensity <= 100
    && typeof item.density === "number" && Number.isFinite(item.density) && item.density >= 0 && item.density <= 100
    && (ATMOSPHERE_GRAVITIES as readonly unknown[]).includes(item.gravity)
    && validColor(item.color) && typeof item.calm === "boolean"
    && (item.scene === undefined || isWhiteoutScene(item.scene));
}

/** Resolve without mutating or materializing optional settings on legacy v1 designs. */
export function getAtmosphere(design: Pick<WatchDesign, "family" | "texture" | "atmosphere">): ResolvedAtmosphere {
  const stored: unknown = design.atmosphere;
  const value = stored && typeof stored === "object" && !Array.isArray(stored) ? stored as Record<string, unknown> : {};
  const percent = (input: unknown, fallback: number) => typeof input === "number" && Number.isFinite(input) ? Math.max(0, Math.min(100, input)) : fallback;
  const scene = getWhiteoutScene(design);
  const defaultColor = WHITEOUT_SCENES.find(item => item.id === scene)!.color;
  return {
    intensity: percent(value.intensity, 65), density: percent(value.density, 60),
    gravity: (ATMOSPHERE_GRAVITIES as readonly unknown[]).includes(value.gravity) ? value.gravity as Atmosphere["gravity"] : "down",
    color: validColor(value.color) ? value.color : defaultColor,
    calm: typeof value.calm === "boolean" ? value.calm : false, scene,
  };
}

/** Narrow read migration: keep custom parts and unknown fields for strict validation afterward. */
export function migrateLegacyUnrealDesign(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const design = value as Record<string, unknown>;
  if (design.family !== "flux" && design.texture !== "liquid") return value;
  return { ...design, ...(design.family === "flux" ? { family: "whiteout" } : {}), ...(design.texture === "liquid" ? { texture: "snow" } : {}) };
}

/** Remap retired preset IDs, leaving saved UUID selections and custom names intact. */
export function migrateLegacyUnrealPreferences(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const preferences = value as Record<string, unknown>;
  return {
    ...preferences,
    ...(preferences.activeWatchId === "flux" ? { activeWatchId: "whiteout" } : {}),
    ...(Array.isArray(preferences.favoritePresets) ? { favoritePresets: [...new Set(preferences.favoritePresets.map(id => id === "flux" ? "whiteout" : id))] } : {}),
  };
}
