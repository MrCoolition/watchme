import type { Atmosphere, WatchDesign, WatchFamily } from "./types";

export const UNREAL_FAMILIES = ["flux", "whiteout"] as const satisfies readonly WatchFamily[];
export const UNREAL_TEXTURES = ["liquid", "snow"] as const;
export const ATMOSPHERE_GRAVITIES = ["down", "float", "up"] as const;

export function isUnrealFamily(family: string): boolean {
  return (UNREAL_FAMILIES as readonly string[]).includes(family);
}

export function isUnrealTexture(texture: string): boolean {
  return (UNREAL_TEXTURES as readonly string[]).includes(texture);
}

function validColor(value: unknown): value is string {
  return typeof value === "string" && value.length === 7 && /^#[a-f\d]{6}$/i.test(value);
}

/** Strict persistence guard. Normalization is deliberately a separate operation. */
export function isValidAtmosphere(value: unknown): value is Atmosphere {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  if (Object.keys(item).length !== 5 || Object.keys(item).some(key => !["intensity", "density", "gravity", "color", "calm"].includes(key))) return false;
  return typeof item.intensity === "number" && Number.isFinite(item.intensity) && item.intensity >= 0 && item.intensity <= 100
    && typeof item.density === "number" && Number.isFinite(item.density) && item.density >= 0 && item.density <= 100
    && (ATMOSPHERE_GRAVITIES as readonly unknown[]).includes(item.gravity)
    && validColor(item.color) && typeof item.calm === "boolean";
}

/** Resolve without mutating or materializing optional settings on legacy v1 designs. */
export function getAtmosphere(design: Pick<WatchDesign, "family" | "texture" | "atmosphere">): Atmosphere {
  const stored: unknown = design.atmosphere;
  const value = stored && typeof stored === "object" && !Array.isArray(stored) ? stored as Record<string, unknown> : {};
  const percent = (input: unknown, fallback: number) => typeof input === "number" && Number.isFinite(input) ? Math.max(0, Math.min(100, input)) : fallback;
  const defaultGravity = design.texture === "liquid" || design.texture !== "snow" && design.family === "flux" ? "float" : "down";
  return {
    intensity: percent(value.intensity, 65), density: percent(value.density, 60),
    gravity: (ATMOSPHERE_GRAVITIES as readonly unknown[]).includes(value.gravity) ? value.gravity as Atmosphere["gravity"] : defaultGravity,
    color: validColor(value.color) ? value.color : "#9BE7FF",
    calm: typeof value.calm === "boolean" ? value.calm : false,
  };
}
