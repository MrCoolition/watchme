import { describe, expect, it } from "vitest";
import { getAtmosphere, getWhiteoutScene, migrateLegacyUnrealDesign, migrateLegacyUnrealPreferences, WHITEOUT_SCENES } from "../src/lib/unreal";
import { normalizeDesign, PRESETS, UNREAL_PRESETS } from "../src/lib/presets";
import { designSchema, preferencesSchema, watchInputSchema } from "../src/lib/validation";
import { DEFAULT_PREFERENCES, type Atmosphere, type WatchDesign } from "../src/lib/types";
import { editionFingerprint } from "../src/lib/edition-card";
import { getEditionAtmosphereDetails } from "../src/lib/edition-details";

const whiteout = UNREAL_PRESETS[0].design;
const oldAtmosphere: Atmosphere = { intensity: 65, density: 60, gravity: "down", color: "#9BE7FF", calm: false };
const legacy = { ...whiteout, family: "flux", texture: "liquid", metal: "sapphire", strap: "mesh", signature: "MY CUSTOM DIAL", atmosphere: { ...oldAtmosphere, gravity: "float", color: "#AA77CC" } };

describe("retired FLUX read migration", () => {
  it("preserves saved identity, names, parts and settings while mapping the retired dial", () => {
    const row = { id: "6f5ca13a-f70a-4a16-a84d-a12bf54a2f01", name: "My custom FLUX", favorite: true, design: legacy };
    const saved = { ...row, design: designSchema.parse(migrateLegacyUnrealDesign(row.design)) };
    expect(saved).toEqual({ ...row, design: { ...legacy, family: "whiteout", texture: "snow" } });
    expect(getWhiteoutScene(saved.design)).toBe("glacier");
    expect(normalizeDesign(legacy as unknown as WatchDesign)).toEqual(saved.design);
    expect(legacy.family).toBe("flux");
    expect(legacy.texture).toBe("liquid");
    expect(designSchema.safeParse(legacy).success).toBe(false);
    expect(designSchema.safeParse({ ...whiteout, family: "flux" }).success).toBe(false);
    expect(designSchema.safeParse({ ...whiteout, texture: "liquid" }).success).toBe(false);
  });

  it("migrates liquid on other families without replacing unrelated custom textures", () => {
    const base = PRESETS[0].design;
    expect(migrateLegacyUnrealDesign({ ...base, texture: "liquid" })).toEqual({ ...base, texture: "snow" });
    expect(migrateLegacyUnrealDesign({ ...legacy, texture: "lacquer" })).toEqual({ ...legacy, family: "whiteout", texture: "lacquer" });
    expect(migrateLegacyUnrealDesign(base)).toBe(base);
    const malformed = { ...legacy, atmosphere: { ...oldAtmosphere, scene: "invented" }, extra: true };
    expect(designSchema.safeParse(migrateLegacyUnrealDesign(malformed)).success).toBe(false);
    for (const invalid of [null, [], 1, "flux"]) expect(migrateLegacyUnrealDesign(invalid)).toBe(invalid);
  });

  it("recovers retired preset preferences without resetting saved-watch selections", () => {
    const old = { ...DEFAULT_PREFERENCES, activeWatchId: "flux", favoritePresets: ["flux", "whiteout", "noel", "flux"] };
    expect(preferencesSchema.parse(migrateLegacyUnrealPreferences(old))).toEqual({ ...old, activeWatchId: "whiteout", favoritePresets: ["whiteout", "noel"] });
    const saved = { ...DEFAULT_PREFERENCES, activeWatchId: "6f5ca13a-f70a-4a16-a84d-a12bf54a2f01", favoritePresets: ["flux"] };
    expect(preferencesSchema.parse(migrateLegacyUnrealPreferences(saved))).toMatchObject({ activeWatchId: saved.activeWatchId, favoritePresets: ["whiteout"] });
    expect(old.favoritePresets).toEqual(["flux", "whiteout", "noel", "flux"]);
    expect(preferencesSchema.safeParse(old).success).toBe(false);
    expect(preferencesSchema.safeParse(migrateLegacyUnrealPreferences({ ...old, activeWatchId: "unknown" })).success).toBe(false);
  });
});

describe("WHITEOUT scene persistence", () => {
  it("resolves all six families with a distinct scene even before an atmosphere is saved", () => {
    expect(UNREAL_PRESETS.map(preset => getWhiteoutScene(preset.design))).toEqual(WHITEOUT_SCENES.map(scene => scene.id));
    for (const preset of UNREAL_PRESETS) {
      const absent = { ...preset.design }; delete absent.atmosphere;
      expect(getAtmosphere(absent).scene).toBe(preset.design.atmosphere!.scene);
      expect(normalizeDesign(absent)).not.toHaveProperty("atmosphere");
      const saved = watchInputSchema.parse(JSON.parse(JSON.stringify({ name: preset.name, design: preset.design })));
      expect(saved.design.atmosphere!.scene).toBe(preset.design.atmosphere!.scene);
    }
  });

  it("preserves five-field v1 configurations and their fingerprints", () => {
    const oldWhiteout = { ...whiteout, atmosphere: oldAtmosphere };
    expect(getAtmosphere(oldWhiteout)).toEqual({ ...oldAtmosphere, scene: "glacier" });
    expect(normalizeDesign(oldWhiteout)).toEqual(oldWhiteout);
    expect(designSchema.parse(oldWhiteout)).toEqual(oldWhiteout);
    expect(editionFingerprint(normalizeDesign(oldWhiteout))).toBe(editionFingerprint(oldWhiteout));
    expect(oldWhiteout.atmosphere).not.toHaveProperty("scene");
  });

  it("saves and documents scene changes independently of the original family", () => {
    for (const scene of WHITEOUT_SCENES) {
      const custom = { ...whiteout, atmosphere: { ...oldAtmosphere, scene: scene.id } };
      const reopened = designSchema.parse(JSON.parse(JSON.stringify(custom)));
      expect(getWhiteoutScene(reopened)).toBe(scene.id);
      expect(getEditionAtmosphereDetails(reopened).rows.find(row => row.label === "Scene")?.value).toBe(scene.name);
      expect(normalizeDesign({ ...reopened, texture: "lacquer" }).atmosphere?.scene).toBe(scene.id);
    }
    expect(new Set(WHITEOUT_SCENES.map(scene => editionFingerprint({ ...whiteout, atmosphere: { ...oldAtmosphere, scene: scene.id } }))).size).toBe(6);
  });
});
