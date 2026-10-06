import { describe, expect, it } from "vitest";
import { PRESETS, isCompatibleDesign, normalizeDesign, isComplicationCompatible } from "../src/lib/presets";
import type { WatchDesign } from "../src/lib/types";

describe("watch design compatibility", () => {
  it("ships fourteen unique valid presets without changing their saved representation", () => {
    expect(new Set(PRESETS.map((preset) => preset.id)).size).toBe(14);
    for (const preset of PRESETS) {
      expect(isCompatibleDesign(preset.design)).toBe(true);
      expect(normalizeDesign(preset.design)).toEqual(preset.design);
    }
  });
  it("prevents regulator and chronograph counters on unsuitable cases", () => {
    expect(isComplicationCompatible("round", "chronograph")).toBe(false);
    expect(isComplicationCompatible("tonneau", "regulator")).toBe(false);
    expect(isCompatibleDesign({ ...PRESETS[0].design, complication: "regulator" })).toBe(false);
    expect(normalizeDesign({ ...PRESETS[0].design, complication: "regulator" }).complication).toBe("none");
  });
  it("normalizes a changed case while preserving the other customized parts", () => {
    const design: WatchDesign = { ...PRESETS[2].design, caseShape: "round", dialColor: "#561BA8", strap: "leather" };
    const result = normalizeDesign(design);
    expect(result).toMatchObject({ caseShape: "round", complication: "none", dialColor: "#561BA8", strap: "leather" });
    expect(isCompatibleDesign(result)).toBe(true);
    expect(design.complication).toBe("chronograph");
  });
  it("rejects malformed colors, unknown parts and incompatible versions", () => {
    expect(isCompatibleDesign({ ...PRESETS[0].design, dialColor: "url(https://example.com)" })).toBe(false);
    expect(isCompatibleDesign({ ...PRESETS[0].design, hands: "missing" } as unknown as WatchDesign)).toBe(false);
    expect(isCompatibleDesign({ ...PRESETS[0].design, version: 2 } as unknown as WatchDesign)).toBe(false);
    expect(normalizeDesign({ ...PRESETS[0].design, dialColor: "garbage" }).dialColor).toBe(PRESETS[0].design.dialColor);
  });
});
