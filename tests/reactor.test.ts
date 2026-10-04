import { describe, expect, it } from "vitest";
import { PRESETS, normalizeDesign } from "../src/lib/presets";
import { applyAtelierLook } from "../src/lib/atelier";
import { designSchema, preferencesSchema } from "../src/lib/validation";
import { DEFAULT_PREFERENCES } from "../src/lib/types";

describe("REACTOR personal editions", () => {
  const reactor = PRESETS.find(preset => preset.id === "reactor")!;
  it("round-trips the mechanical chronograph and personal engraving", () => {
    const design = { ...reactor.design, initials: "AÉ", signature: "NIGHT ENGINE" };
    expect(designSchema.parse(JSON.parse(JSON.stringify(design)))).toEqual(design);
    expect(normalizeDesign(design)).toEqual(design);
    expect(applyAtelierLook(design, "after-hours")).toMatchObject({ family: "reactor", initials: "AÉ", signature: "NIGHT ENGINE", complication: "chronograph" });
  });
  it("rejects engraving that cannot fit or contains hidden control text", () => {
    for (const initials of ["ABCDE", "A\nB", "A\u202eB", 42]) {
      expect(designSchema.safeParse({ ...reactor.design, initials }).success).toBe(false);
    }
  });
  it("persists the new preset and allows all seven originals to be favorited", () => {
    expect(preferencesSchema.parse({ ...DEFAULT_PREFERENCES, activeWatchId: "reactor", favoritePresets: PRESETS.map(preset => preset.id) })).toMatchObject({ activeWatchId: "reactor", favoritePresets: expect.arrayContaining(["reactor", "monolith"]) });
  });
});
