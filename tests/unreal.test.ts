import { describe, expect, it } from "vitest";
import type { Atmosphere, WatchDesign } from "../src/lib/types";
import { FLAGSHIP_PRESETS, isCompatibleDesign, isUnrealFamily, isUnrealTexture, normalizeDesign, PARTS, PRESETS, UNREAL_FAMILIES, UNREAL_PRESETS } from "../src/lib/presets";
import { getAtmosphere, isValidAtmosphere } from "../src/lib/unreal";
import { designSchema, preferencesSchema, watchInputSchema } from "../src/lib/validation";
import { DEFAULT_PREFERENCES } from "../src/lib/types";
import { buildEditionCardSvg, editionFilename, editionFingerprint, escapeXml } from "../src/lib/edition-card";
import { getEditionAtmosphereDetails, getEditionDetails, getEditionPages } from "../src/lib/edition-details";
import { applyAtelierLook } from "../src/lib/atelier";

const flux = UNREAL_PRESETS.find(preset => preset.id === "flux")!.design;
const whiteout = UNREAL_PRESETS.find(preset => preset.id === "whiteout")!.design;
const base = PRESETS[0].design;

describe("UNREAL design persistence", () => {
  it("registers two distinct original watches without folding them into Black Label", () => {
    expect(UNREAL_FAMILIES).toEqual(["flux", "whiteout"]);
    expect(UNREAL_PRESETS.map(preset => preset.name)).toEqual(["FLUX", "WHITEOUT"]);
    expect(FLAGSHIP_PRESETS).toHaveLength(6);
    expect(flux).toMatchObject({ family: "flux", texture: "liquid", metal: "sapphire", caseShape: "round", strap: "mesh", complication: "none" });
    expect(whiteout).toMatchObject({ family: "whiteout", texture: "snow", metal: "titanium", caseShape: "cushion", strap: "rubber", complication: "date" });
    expect(PARTS.textures).toContain("liquid");
    expect(PARTS.textures).toContain("snow");
    expect(isUnrealFamily("reactor")).toBe(false);
    expect(isUnrealTexture("snow")).toBe(true);
    expect(isUnrealTexture("aventurine")).toBe(false);
  });

  it("resolves defaults by texture without adding atmosphere to old v1 designs", () => {
    const absent = { ...flux }; delete absent.atmosphere;
    expect(getAtmosphere(absent)).toEqual({ intensity: 65, density: 60, gravity: "float", color: "#9BE7FF", calm: false });
    expect(getAtmosphere({ ...absent, texture: "snow" }).gravity).toBe("down");
    expect(getAtmosphere({ ...whiteout, atmosphere: undefined, texture: "liquid" }).gravity).toBe("float");
    const original = JSON.stringify(base);
    expect(normalizeDesign(base)).toEqual(base);
    expect(normalizeDesign(base)).not.toHaveProperty("atmosphere");
    expect(normalizeDesign(absent)).not.toHaveProperty("atmosphere");
    getAtmosphere(base);
    expect(JSON.stringify(base)).toBe(original);
  });

  it("round trips both presets and noninteger custom settings through the actual save schema and normalization", () => {
    for (const preset of UNREAL_PRESETS) {
      const input = { name: preset.name, design: preset.design };
      expect(watchInputSchema.parse(JSON.parse(JSON.stringify(input)))).toEqual(input);
      expect(normalizeDesign(preset.design)).toEqual(preset.design);
      expect(isCompatibleDesign(preset.design)).toBe(true);
      expect(preferencesSchema.parse({ ...DEFAULT_PREFERENCES, activeWatchId: preset.id, favoritePresets: [preset.id] }).activeWatchId).toBe(preset.id);
    }
    const custom: WatchDesign = { ...whiteout, atmosphere: { intensity: 12.5, density: 0, gravity: "up", color: "#Aa66bb", calm: true } };
    expect(designSchema.parse(JSON.parse(JSON.stringify(custom)))).toEqual(custom);
    expect(normalizeDesign(custom)).toEqual(custom);
    expect(normalizeDesign({ ...custom, texture: "lacquer" }).atmosphere).toEqual(custom.atmosphere);
    expect(applyAtelierLook(custom, "after-hours").atmosphere).toEqual(custom.atmosphere);
  });

  it("strictly rejects malformed atmosphere instead of coercing unsafe saved values", () => {
    const valid = getAtmosphere(flux);
    const invalid: unknown[] = [null, [], "liquid", {},
      { ...valid, intensity: NaN }, { ...valid, intensity: Infinity }, { ...valid, intensity: -1 }, { ...valid, intensity: 101 },
      { ...valid, density: -Infinity }, { ...valid, density: 101 }, { ...valid, density: "60" },
      { ...valid, gravity: "sideways" }, { ...valid, color: "url(https://example.com)" }, { ...valid, color: "#123456\n" },
      { ...valid, calm: "false" }, { ...valid, arbitrary: "not a design field" },
    ];
    for (const atmosphere of invalid) {
      expect(isValidAtmosphere(atmosphere)).toBe(false);
      const malformed = { ...flux, atmosphere } as WatchDesign;
      expect(designSchema.safeParse(malformed).success).toBe(false);
      expect(isCompatibleDesign(malformed)).toBe(false);
    }
    for (const intensity of [0, 100]) for (const density of [0, 100]) {
      expect(designSchema.safeParse({ ...flux, atmosphere: { ...valid, intensity, density } }).success).toBe(true);
    }
  });

  it("repairs corrupt local drafts deterministically, removes unknown keys and never mutates input", () => {
    const input = { ...flux, atmosphere: { intensity: Infinity, density: -20, gravity: "broken", color: "#ABCDEF\n", calm: 1, extra: "remove" } } as unknown as WatchDesign;
    const normalized = normalizeDesign(input);
    expect(normalized.atmosphere).toEqual({ intensity: 65, density: 0, gravity: "float", color: "#9BE7FF", calm: false });
    expect(isCompatibleDesign(normalized)).toBe(true);
    expect(designSchema.safeParse(normalized).success).toBe(true);
    expect(input.atmosphere!.intensity).toBe(Infinity);
    expect(normalizeDesign({ ...whiteout, atmosphere: { ...getAtmosphere(whiteout), intensity: 150, density: NaN } }).atmosphere).toMatchObject({ intensity: 100, density: 60 });
    expect(normalizeDesign({ ...whiteout, atmosphere: null as unknown as Atmosphere }).atmosphere).toEqual(getAtmosphere(whiteout));
  });
});

describe("UNREAL edition documentation", () => {
  it("adds one atmosphere page before references while leaving ordinary builds at six sections", () => {
    expect(getEditionPages(base).map(page => page.id)).toEqual(["portrait", "build"]);
    const custom = { ...flux, catalogReferences: Array.from({ length: 13 }, (_, index) => `spec-${index + 1}`) };
    expect(getEditionPages(custom).map(page => page.id)).toEqual(["portrait", "build", "atmosphere", "references-1", "references-2"]);
    expect(getEditionDetails(custom)).toHaveLength(6);
    expect(getEditionPages({ ...base, texture: "liquid" }).map(page => page.id)).toContain("atmosphere");
    expect(getEditionPages({ ...base, atmosphere: getAtmosphere(flux) }).map(page => page.id)).toContain("atmosphere");
  });

  it("prints every atmosphere setting, preserves its color and describes calm and inactive states accurately", () => {
    const design: WatchDesign = { ...flux, atmosphere: { intensity: 77, density: 23, gravity: "up", color: "#ab12cd", calm: true } };
    const details = getEditionAtmosphereDetails(design);
    expect(details.rows).toHaveLength(6);
    expect(details.rows.find(row => row.label === "Atmosphere color")).toMatchObject({ value: "#AB12CD", color: "#AB12CD" });
    expect(details.rows.find(row => row.label === "Calm mode")?.note).toContain("Automatic motion paused; direct interaction remains available");
    const page = getEditionPages(design).find(item => item.kind === "atmosphere")!;
    const svg = buildEditionCardSvg({ design, name: "My FLUX", watchSvg: '<svg><path id="actual-frozen-atmosphere"/></svg>', page });
    expect(svg).toContain('data-edition-page="atmosphere"');
    expect(svg).toContain('id="actual-frozen-atmosphere"');
    for (const row of details.rows) {
      expect(svg).toContain(row.value);
      if (row.note) expect(svg.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).toContain(escapeXml(row.note));
    }
    expect(svg).toContain(">UNREAL</text>");
    expect(svg).not.toContain("BLACK LABEL");
    expect(editionFilename("My FLUX", design, page)).toMatch(/-atmosphere\.png$/);
    const inactive = getEditionAtmosphereDetails({ ...design, texture: "lacquer" });
    expect(inactive.rows[0].value).toBe("Inactive");
    expect(inactive.rows.slice(1).every(row => row.note?.includes("Saved / inactive"))).toBe(true);
    expect(inactive.rows.find(row => row.label === "Intensity")?.value).toBe("77%");
  });

  it("fingerprints nested atmosphere independently of key order while retaining saved option differences", () => {
    const atmosphere = getAtmosphere(flux);
    const reversed = Object.fromEntries(Object.entries(atmosphere).reverse()) as unknown as Atmosphere;
    expect(editionFingerprint({ ...flux, atmosphere: reversed })).toBe(editionFingerprint(flux));
    expect(editionFingerprint({ ...flux, atmosphere: { ...atmosphere, density: 99 } })).not.toBe(editionFingerprint(flux));
    expect(editionFingerprint({ ...base, atmosphere: undefined })).toBe(editionFingerprint(base));
  });
});
