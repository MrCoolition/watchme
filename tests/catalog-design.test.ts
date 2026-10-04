import { describe, expect, it } from "vitest";
import { isCompatibleDesign, MAX_CATALOG_REFERENCES, normalizeDesign, PARTS, PRESETS } from "../src/lib/presets";
import { designSchema, watchInputSchema } from "../src/lib/validation";
import type { WatchDesign } from "../src/lib/types";

const base = PRESETS[0].design;
const expanded: WatchDesign = {
  ...base, caseShape: "hexagonal", metal: "bronze", hands: "cathedral", markers: "california",
  texture: "malachite", strap: "nato", bezel: "coined", complication: "daydate", additionalComplications: ["calendar", "gmt"],
  caseFinish: "hammered", braceletStyle: "beads-of-rice", chapterRing: "railroad", crystalStyle: "domed",
  lumeStyle: "hands-only", strapColor: "#364832", catalogReferences: ["catalog-9", "catalog-1319", "spec-120"],
  secondsIndication: "running", secondsPlacement: "peripheral", secondsMotion: "stepped", secondsAdvances: 16,
  secondsSetting: "zero-reset", chronographBehavior: "flyback",
};

describe("catalog design persistence", () => {
  it("round-trips all new appearance controls, functions and references through saved JSON", () => {
    const saved = watchInputSchema.parse(JSON.parse(JSON.stringify({ name: "Custom catalog creation", design: expanded })));
    expect(saved.design).toEqual(expanded);
    expect(normalizeDesign(saved.design)).toEqual(expanded);
    expect(isCompatibleDesign(saved.design)).toBe(true);
  });

  it("accepts every curated new part without changing legacy defaults", () => {
    for (const [field, choices] of Object.entries({ caseShape: PARTS.caseShapes, metal: PARTS.metals, hands: PARTS.hands,
      markers: PARTS.markers, texture: PARTS.textures, strap: PARTS.straps, bezel: PARTS.bezels,
      caseFinish: PARTS.caseFinishes, braceletStyle: PARTS.braceletStyles, chapterRing: PARTS.chapterRings,
      crystalStyle: PARTS.crystalStyles, lumeStyle: PARTS.lumeStyles })) {
      for (const choice of choices) expect(designSchema.safeParse({ ...base, [field]: choice }).success, `${field}: ${choice}`).toBe(true);
    }
    for (const preset of PRESETS) {
      expect(normalizeDesign(preset.design)).toEqual(preset.design);
      expect(designSchema.parse(preset.design)).toEqual(preset.design);
    }
  });

  it.each([
    ["catalog-8"], ["catalog-1320"], ["catalog-09"], ["catalog-9\n"], ["catalog-9<script>"], [9], [null], ["catalog-9", "catalog-9"],
    ["spec-0"], ["spec-121"], ["spec-01"], ["spec-1\n"],
    Array.from({ length: MAX_CATALOG_REFERENCES + 1 }, (_, i) => `catalog-${i + 9}`),
  ])("rejects invalid or duplicate source references: %j", (...references) => {
    expect(designSchema.safeParse({ ...base, catalogReferences: references }).success).toBe(false);
  });

  it("recovers valid references and removes invalid optional draft values", () => {
    const recovered = normalizeDesign({ ...base, catalogReferences: ["catalog-9", "bad", "catalog-9", "catalog-1319"],
      caseFinish: "fake", strapColor: "red", crystalStyle: "fake", lumeStyle: "fake" } as unknown as WatchDesign);
    expect(recovered.catalogReferences).toEqual(["catalog-9", "catalog-1319"]);
    expect(recovered).not.toHaveProperty("caseFinish");
    expect(recovered).not.toHaveProperty("strapColor");
    expect(recovered).not.toHaveProperty("crystalStyle");
    expect(recovered).not.toHaveProperty("lumeStyle");
    expect(isCompatibleDesign(recovered)).toBe(true);
  });

  it("rejects additional unrecognized fields and malformed appearance settings on the server", () => {
    for (const patch of [{ strapColor: "url(example)" }, { caseFinish: "unknown" }, { catalogReferences: "catalog-9" }, { unlockedSensor: true }]) {
      expect(designSchema.safeParse({ ...base, ...patch }).success).toBe(false);
    }
  });
});
