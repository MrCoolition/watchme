import { describe, expect, it } from "vitest";
import { PRESETS, normalizeDesign, isComplicationCompatible } from "../src/lib/presets";
import { designSchema, watchInputSchema } from "../src/lib/validation";

describe("saved moon-phase complications", () => {
  it("fits every case and round-trips on each existing watch without creating new presets", () => {
    expect(PRESETS).toHaveLength(14);
    for (const preset of PRESETS) {
      const design = { ...preset.design, complication: "moonphase" as const, initials: "WM", signature: "LUNAR EDITION" };
      expect(isComplicationCompatible(design.caseShape, design.complication)).toBe(true);
      expect(normalizeDesign(design)).toEqual(design);
      expect(watchInputSchema.parse(JSON.parse(JSON.stringify({ name: `${preset.name} Moon`, design })))).toEqual({ name: `${preset.name} Moon`, design });
    }
  });
  it("keeps moon phase exclusive from other complications and leaves existing presets unchanged", () => {
    expect(PRESETS.every(preset => preset.design.complication !== "moonphase")).toBe(true);
    expect(designSchema.safeParse({ ...PRESETS[0].design, complication: ["moonphase", "daynight"] }).success).toBe(false);
  });
});
