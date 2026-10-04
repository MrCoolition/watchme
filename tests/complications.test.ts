import { describe, expect, it } from "vitest";
import {
  ACTIVE_COMPLICATIONS, PARTS, PRESETS, complicationConflict, getComplications,
  hasComplication, isCompatibleDesign, normalizeDesign, setComplications,
} from "../src/lib/presets";
import type { ActiveComplication, Complication, WatchDesign } from "../src/lib/types";
import { designSchema, watchInputSchema } from "../src/lib/validation";

const source = PRESETS.find(preset => preset.id === "reactor")!.design;
function withComplications(list: readonly ActiveComplication[], caseShape = source.caseShape): WatchDesign {
  const design: WatchDesign = { ...source, caseShape, complication: list[0] ?? "none" };
  if (list.length > 1) design.additionalComplications = list.slice(1);
  return design;
}

describe("multiple complications in version-one watch designs", () => {
  it("preserves every legacy preset without adding an optional array", () => {
    for (const preset of PRESETS) {
      expect(normalizeDesign(preset.design)).toEqual(preset.design);
      expect(designSchema.parse(preset.design)).toEqual(preset.design);
      expect(getComplications(preset.design)).toEqual(preset.design.complication === "none" ? [] : [preset.design.complication]);
      expect(normalizeDesign(preset.design)).not.toHaveProperty("additionalComplications");
    }
  });

  it("round-trips a four-function chronograph with moon, date and GMT through saved JSON", () => {
    const design: WatchDesign = {
      ...withComplications(["chronograph", "moonphase", "date", "gmt"]),
      initials: "WM", signature: "AFTER HOURS", bezel: "iced", secondsMotion: "tick",
    };
    const reopened = watchInputSchema.parse(JSON.parse(JSON.stringify({ name: "Four functions", design }))).design;
    expect(reopened).toEqual(design);
    expect(normalizeDesign(reopened)).toEqual(design);
    expect(getComplications(reopened)).toEqual(["chronograph", "moonphase", "date", "gmt"]);
    for (const type of ["chronograph", "moonphase", "date", "gmt"] as const) expect(hasComplication(reopened, type)).toBe(true);
    expect(hasComplication(reopened, "none")).toBe(false);
    expect(hasComplication(reopened, "weather")).toBe(false);
  });

  it.each(PARTS.caseShapes)("checks every complication combination on a %s case, regardless of primary order", caseShape => {
    for (let mask = 0; mask < 2 ** ACTIVE_COMPLICATIONS.length; mask += 1) {
      const list = ACTIVE_COMPLICATIONS.filter((_, index) => mask & (1 << index));
      const lowerCount = list.filter(type => ["moonphase", "daynight", "weather"].includes(type)).length;
      const expected = list.length <= 4
        && !(list.includes("chronograph") && caseShape === "round")
        && !(list.includes("regulator") && caseShape !== "round")
        && lowerCount <= 1
        && !(list.includes("regulator") && lowerCount > 0);
      for (const ordered of [list, list.toReversed()]) {
        const design = withComplications(ordered, caseShape);
        const context = `${caseShape}: ${ordered.join(" + ") || "none"}`;
        expect(isCompatibleDesign(design), context).toBe(expected);
        expect(designSchema.safeParse(design).success, context).toBe(expected);
        expect(isCompatibleDesign(normalizeDesign(design)), context).toBe(true);
      }
    }
  });

  it("retains compatible extras when changing a case invalidates the primary", () => {
    const chronograph = withComplications(["chronograph", "moonphase", "date", "gmt"]);
    const round = normalizeDesign({ ...chronograph, caseShape: "round" });
    expect(getComplications(round)).toEqual(["moonphase", "date", "gmt"]);
    expect(round.complication).toBe("moonphase");
    expect(round).toMatchObject({ family: source.family, texture: source.texture, caseShape: "round" });
    expect(getComplications(chronograph)).toEqual(["chronograph", "moonphase", "date", "gmt"]);

    const regulator = withComplications(["regulator", "date", "gmt"], "round");
    expect(getComplications(normalizeDesign({ ...regulator, caseShape: "cushion" }))).toEqual(["date", "gmt"]);
    const extraChronograph = withComplications(["date", "chronograph", "moonphase", "gmt"]);
    expect(getComplications(normalizeDesign({ ...extraChronograph, caseShape: "round" }))).toEqual(["date", "moonphase", "gmt"]);
  });

  it("preserves the selected primary and drops conflicting extras in their original order", () => {
    const changed = normalizeDesign({ ...withComplications(["date", "moonphase", "gmt"]), complication: "weather" });
    expect(getComplications(changed)).toEqual(["weather", "gmt"]);
    const overfilled = withComplications(["chronograph", "weather", "moonphase", "daynight", "date", "gmt"]);
    expect(getComplications(normalizeDesign(overfilled))).toEqual(["chronograph", "weather", "date", "gmt"]);
    expect(getComplications(normalizeDesign(withComplications(["regulator", "moonphase", "date", "gmt"], "round")))).toEqual(["regulator", "date", "gmt"]);
  });

  it("uses ordered set operations for additions, removals and removing the primary", () => {
    const initial = withComplications(["chronograph", "moonphase", "date", "gmt"]);
    const removed = setComplications(initial, getComplications(initial).filter(type => type !== "chronograph"));
    expect(removed.complication).toBe("moonphase");
    expect(removed.additionalComplications).toEqual(["date", "gmt"]);
    expect(getComplications(setComplications(initial, ["gmt", "date", "moonphase", "chronograph"]))).toEqual(["gmt", "date", "moonphase", "chronograph"]);
    expect(getComplications(initial)).toEqual(["chronograph", "moonphase", "date", "gmt"]);
    expect(getComplications(setComplications(initial, ["date", "date", "none", "gmt"]))).toEqual(["date", "gmt"]);
    expect(setComplications(initial, [])).toMatchObject({ complication: "none" });
    expect(setComplications(initial, [])).not.toHaveProperty("additionalComplications");
  });

  it("clears extras when None is explicitly selected", () => {
    const design = { ...withComplications(["date", "moonphase", "gmt"]), complication: "none" as const };
    expect(getComplications(design)).toEqual([]);
    expect(designSchema.safeParse(design).success).toBe(false);
    expect(normalizeDesign(design)).toMatchObject({ complication: "none" });
    expect(normalizeDesign(design)).not.toHaveProperty("additionalComplications");
    const empty = { ...design, additionalComplications: [] };
    expect(designSchema.parse(empty)).toEqual(empty);
    expect(normalizeDesign(empty)).toEqual(empty);
  });

  it("explains slot and case conflicts while keeping selected items removable", () => {
    const moon = withComplications(["moonphase", "date", "gmt"]);
    expect(complicationConflict(moon, "chronograph")).toBeNull();
    expect(complicationConflict(moon, "weather")).toMatch(/lower dial/i);
    expect(complicationConflict(moon, "daynight")).toMatch(/lower dial/i);
    expect(complicationConflict({ ...moon, caseShape: "round" }, "regulator")).toMatch(/lower dial/i);
    expect(complicationConflict({ ...moon, caseShape: "round" }, "chronograph")).toMatch(/case/i);
    expect(complicationConflict(withComplications(["regulator"], "round"), "moonphase")).toMatch(/lower dial/i);
    expect(complicationConflict(withComplications(["chronograph", "moonphase", "date", "gmt"]), "gmt")).toBeNull();
    expect(complicationConflict(moon, "none")).toBeNull();
  });

  it("strictly rejects malformed, duplicate, overlapping and oversized extras", () => {
    const malicious: unknown[] = [
      null, "gmt", {}, ["none"], ["unknown"], [null], [1], [{ type: "gmt" }],
      ["date"], ["gmt", "gmt"], ["moonphase", "weather"],
      ["gmt", "moonphase", "chronograph", "daynight"], new Array(1),
    ];
    for (const extras of malicious) {
      const design = { ...source, complication: "date", additionalComplications: extras } as unknown as WatchDesign;
      expect(isCompatibleDesign(design), JSON.stringify(extras)).toBe(false);
      expect(designSchema.safeParse(design).success, JSON.stringify(extras)).toBe(false);
      expect(isCompatibleDesign(normalizeDesign(design)), JSON.stringify(extras)).toBe(true);
    }
    expect(designSchema.safeParse({ ...source, additionalComplications: ["gmt"], layout: { freeform: true } }).success).toBe(false);
    expect(getComplications(setComplications(source, ["bad", "date", "gmt"] as Complication[]))).toEqual(["date", "gmt"]);
  });
});
