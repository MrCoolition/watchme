import { describe, expect, it } from "vitest";
import { ATELIER_LOOKS, LUME_COLORS, applyAtelierLook } from "../src/lib/atelier";
import { PARTS, PRESETS, isCompatibleDesign, isValidSignature, normalizeDesign } from "../src/lib/presets";
import { designSchema, watchInputSchema } from "../src/lib/validation";
import type { WatchDesign } from "../src/lib/types";

describe("backwards-compatible atelier design data", () => {
  it("keeps all existing version-one presets unchanged, without materializing new defaults", () => {
    for (const preset of PRESETS.slice(0, 6)) {
      expect(normalizeDesign(preset.design)).toEqual(preset.design);
      expect(designSchema.parse(preset.design)).toEqual(preset.design);
      for (const key of ["bezel", "lumeColor", "signature", "secondsMotion"]) {
        expect(normalizeDesign(preset.design)).not.toHaveProperty(key);
      }
    }
  });

  it("round-trips every new field through normalization, JSON, and server validation", () => {
    const design: WatchDesign = { ...PRESETS[0].design, metal: "ceramic", texture: "meteorite", bezel: "iced", lumeColor: "#BA9AFF", signature: "COOLITION", secondsMotion: "tick" };
    expect(normalizeDesign(design)).toEqual(design);
    const saved = watchInputSchema.parse({ name: "My atelier watch", design: JSON.parse(JSON.stringify(design)) });
    expect(saved.design).toEqual(design);
    for (const texture of ["carbon", "meteorite", "guilloche"] as const) {
      expect(designSchema.safeParse({ ...design, texture }).success).toBe(true);
    }
    for (const bezel of PARTS.bezels) expect(designSchema.safeParse({ ...design, bezel }).success).toBe(true);
    for (const secondsMotion of PARTS.secondsMotions) expect(designSchema.safeParse({ ...design, secondsMotion }).success).toBe(true);
  });

  it("rejects malformed optional fields on the server and discards them when restoring a draft", () => {
    for (const extra of [{ bezel: "unknown" }, { lumeColor: "red" }, { lumeColor: { value: "#ffffff" } }, { secondsMotion: "fast" }, { signature: "More than fourteen" }, { signature: "hello\nworld" }, { signature: "hidden\u202Etext" }]) {
      const design = { ...PRESETS[0].design, ...extra } as unknown as WatchDesign;
      expect(isCompatibleDesign(design)).toBe(false);
      expect(designSchema.safeParse(design).success).toBe(false);
      expect(normalizeDesign(design)).toEqual(PRESETS[0].design);
    }
  });

  it("supports short visible personal signatures without invisible controls or multiline layout", () => {
    expect(isValidSignature("" )).toBe(true);
    expect(isValidSignature("COOLITION / 01")).toBe(true);
    expect(isValidSignature("Étoile ✦" )).toBe(true);
    expect(isValidSignature("⌚".repeat(14))).toBe(true);
    expect(isValidSignature("⌚".repeat(15))).toBe(false);
    for (const signature of ["A\tB", "A\rB", "A\u0000B", "A\u2028B", "A\u2029B", "A\u200DB"]) expect(isValidSignature(signature)).toBe(false);
    expect(designSchema.parse({ ...PRESETS[0].design, signature: "" }).signature).toBe("");
  });
});

describe("curated atelier recipes", () => {
  it("offers six distinct looks that work with every launch design without changing its architecture or function", () => {
    expect(ATELIER_LOOKS).toHaveLength(6);
    expect(new Set(ATELIER_LOOKS.map(look => look.id)).size).toBe(6);
    expect(new Set(ATELIER_LOOKS.map(look => JSON.stringify(look.parts))).size).toBe(6);
    for (const preset of PRESETS) for (const look of ATELIER_LOOKS) {
      const source = { ...preset.design, signature: "MY SIGNATURE" };
      const result = applyAtelierLook(source, look.id);
      expect(result).toMatchObject({ version: 1, family: source.family, caseShape: source.caseShape, complication: source.complication, signature: source.signature });
      expect(isCompatibleDesign(result)).toBe(true);
      expect(designSchema.safeParse(result).success).toBe(true);
      expect(source).toEqual({ ...preset.design, signature: "MY SIGNATURE" });
    }
  });

  it("handles a stale recipe id without erasing the wearer's design", () => {
    const design: WatchDesign = { ...PRESETS[2].design, bezel: "fluted", signature: "APEX ONE", lumeColor: "#84EAFF" };
    expect(applyAtelierLook(design, "removed-look")).toEqual(design);
  });

  it("provides five distinct valid luminous colors", () => {
    expect(LUME_COLORS).toHaveLength(5);
    expect(new Set(LUME_COLORS.map(color => color.value)).size).toBe(5);
    for (const color of LUME_COLORS) expect(designSchema.safeParse({ ...PRESETS[0].design, lumeColor: color.value }).success).toBe(true);
  });
});
