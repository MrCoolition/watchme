import { describe, expect, it } from "vitest";
import { getEditionDetails, getEditionPages, resolveEditionReferences } from "../src/lib/edition-details";
import { PARTS, PRESETS } from "../src/lib/presets";
import type { WatchDesign } from "../src/lib/types";

const base = PRESETS[0].design;
const rows = (design: WatchDesign) => getEditionDetails(design).flatMap(section => section.rows);
const row = (design: WatchDesign, label: string) => rows(design).find(item => item.label === label)!;

describe("complete edition details", () => {
  it("describes legacy defaults without adding optional fields or mutating the design", () => {
    const original = JSON.stringify(base);
    expect(row(base, "Finish").value).toBe("Original mixed finish");
    expect(row(base, "Bezel").value).toBe("Polished");
    expect(row(base, "Crystal").value).toBe("Clear");
    expect(row(base, "Chapter ring").value).toBe("Minute track");
    expect(row(base, "Bracelet links").value).toBe("Three-link");
    expect(row(base, "Strap color").value).toBe("Follows case metal");
    expect(row(base, "Motion").value).toBe("Continuous glide");
    expect(row(base, "Lume color").color).toBe(base.accentColor);
    expect(row(base, "Edition").value).toBe("Original WATCHMÉ design");
    expect(rows(base).some(item => item.label === "Design format")).toBe(false);
    expect(JSON.stringify(base)).toBe(original);
  });

  it("matches original and customized seconds layouts, including both legacy chronograph sources", () => {
    const reactor = PRESETS.find(preset => preset.id === "reactor")!.design;
    const vesper = PRESETS.find(preset => preset.id === "vesper")!.design;
    const orbit = PRESETS.find(preset => preset.id === "orbit")!.design;
    expect(row(reactor, "Indication").value).toBe("Elapsed + running seconds");
    expect(row(reactor, "Placement").value).toBe("Central + off-center register");
    expect(row(vesper, "Placement").value).toBe("Small seconds register");
    expect(row(orbit, "Placement").value).toBe("Small seconds register");
    expect(row({ ...vesper, complication: "date" }, "Placement").value).toBe("Central");
    expect(row({ ...reactor, secondsPlacement: "peripheral" }, "Indication").value).toBe("Elapsed stopwatch seconds");
    expect(row({ ...reactor, secondsIndication: "running" }, "Indication").value).toBe("Running clock seconds");
    expect(row({ ...orbit, secondsIndication: "running" }, "Placement").value).toBe("Central");
    expect(row({ ...base, secondsMotion: "stepped" }, "Advances").value).toBe("8 per second");
  });

  it("preserves every inactive override and distinguishes physical reference notes", () => {
    const design: WatchDesign = {
      ...base, strap: "leather", braceletStyle: "engineer", strapColor: "#123abc", lumeStyle: "none", lumeColor: "#abcdef",
      secondsIndication: "none", secondsPlacement: "peripheral", secondsMotion: "tick", secondsAdvances: 16,
      secondsSetting: "zero-reset", chronographBehavior: "flyback", signature: "Made by me", initials: "abc",
    };
    expect(row(design, "Bracelet links")).toMatchObject({ value: "Engineer", note: "Saved / inactive on the selected strap." });
    for (const label of ["Placement", "Motion", "Advances", "Lume color"]) expect(row(design, label).note).toMatch(/inactive/i);
    expect(row(design, "Placement").value).toBe("Peripheral");
    expect(row(design, "Advances").value).toBe("16 per second");
    expect(row(design, "Lume color").color).toBe("#ABCDEF");
    expect(row(design, "Strap color").color).toBe("#123ABC");
    expect(row(design, "Setting reference")).toMatchObject({ value: "Zero-reset", note: expect.stringMatching(/reference only/) });
    expect(row(design, "Chronograph reference")).toMatchObject({ value: "Flyback", note: expect.stringMatching(/Saved reference.*start \/ pause \/ reset/) });
    expect(row(design, "Signature").value).toBe("Made by me");
    expect(row(design, "Initials").value).toBe("ABC");
    expect(row({ ...design, secondsIndication: "running" }, "Advances").note).toContain("inactive");
  });

  it("accounts for all stored colors without claiming texture-led dial colors or metal tints are solid fills", () => {
    for (const texture of ["motherofpearl", "malachite", "lapis", "marble"] as const) {
      const detail = row({ ...base, texture, dialColor: "#ff0000" }, "Dial color");
      expect(detail.color).toBe("#FF0000");
      expect(detail.note).toContain("inactive on the texture-led main dial");
    }
    expect(row({ ...base, texture: "prismatic" }, "Dial color").note).toContain("Tint");
    expect(row({ ...base, texture: "mechanical" }, "Dial color").note).toContain("own palette");
    for (const strap of ["bracelet", "mesh"] as const) expect(row({ ...base, strap, strapColor: "#fedcba" }, "Strap color").note).toContain("tint");
    expect(row({ ...base, strap: "nato" }, "Strap color").color).toBe("#273B40");
    expect(row({ ...base, strap: "leather" }, "Strap color").value).toBe("Black plum gradient");
    expect(row({ ...base, strap: "rubber" }, "Strap color").value).toBe("Charcoal gradient");
    expect(row(base, "Accent color").color).toBe(base.accentColor);
  });

  it("covers every supported part enum in six bounded sections and every active complication", () => {
    const registries = {
      caseShape: PARTS.caseShapes, metal: PARTS.metals, texture: PARTS.textures, hands: PARTS.hands, markers: PARTS.markers,
      strap: PARTS.straps, bezel: PARTS.bezels, caseFinish: PARTS.caseFinishes, braceletStyle: PARTS.braceletStyles,
      chapterRing: PARTS.chapterRings, crystalStyle: PARTS.crystalStyles, lumeStyle: PARTS.lumeStyles,
      secondsIndication: PARTS.secondsIndications, secondsPlacement: PARTS.secondsPlacements, secondsMotion: PARTS.secondsMotions,
      secondsAdvances: PARTS.secondsAdvances, secondsSetting: PARTS.secondsSettings, chronographBehavior: PARTS.chronographBehaviors,
      complication: PARTS.complications,
    };
    for (const [field, options] of Object.entries(registries)) for (const value of options) {
      const sections = getEditionDetails({ ...base, [field]: value } as WatchDesign);
      expect(sections).toHaveLength(6);
      expect(sections.every(section => section.rows.length <= 6)).toBe(true);
      expect(sections.flatMap(section => section.rows).every(item => typeof item.value === "string" && item.value.length > 0), `${field}: ${value}`).toBe(true);
      expect(JSON.stringify(sections), `${field}: ${value}`).not.toContain("undefined");
    }
    const multi: WatchDesign = { ...base, complication: "chronograph", additionalComplications: ["daydate", "gmt", "moonphase"] };
    expect(row(multi, "Primary function").value).toBe("Chronograph");
    expect(row(multi, "Additional functions").value).toBe("Day / date · GMT · Moon phase");
    for (const preset of PRESETS) expect(row(preset.design, "Family").value).toBe(preset.id.toUpperCase());
  });
});

describe("edition reference pages", () => {
  it("resolves saved order, original source rows, user supplements and unavailable references", () => {
    const design: WatchDesign = { ...base, catalogReferences: ["spec-7", "catalog-12", "catalog-9999"] };
    const entries = [
      { id: "catalog-12", category: "Case", option: "Steel", description: "Steel reference", sourceRow: 12, sourceUrl: "https://example.com/steel" },
      { id: "spec-7", category: "Bezel specifications", option: "Fixed", description: "Fixed bezel reference", sourceLabel: "User-provided supplement" },
    ];
    const resolved = resolveEditionReferences(design, entries);
    expect(resolved.map(item => item.id)).toEqual(design.catalogReferences);
    expect(resolved[0]).toMatchObject({ sourceLabel: "User-provided supplement", option: "Fixed" });
    expect(resolved[0]).not.toHaveProperty("sourceUrl");
    expect(resolved[1]).toMatchObject({ sourceLabel: "Master catalog · row 12", sourceUrl: "https://example.com/steel" });
    expect(resolved[2]).toMatchObject({ category: "Unavailable reference", option: "Missing reference: catalog-9999" });
    expect(row(design, "Saved references")).toMatchObject({ value: "3 catalog references", note: expect.stringMatching(/no claim of hardware or certification/) });
    expect(resolveEditionReferences(base, entries)).toEqual([]);
  });

  it("keeps portrait and build pages first and creates one page per twelve saved references", () => {
    const fixed = [{ id: "portrait", label: "Portrait", kind: "portrait" }, { id: "build", label: "Build sheet", kind: "build" }];
    expect(getEditionPages(base)).toEqual(fixed);
    for (const count of [1, 12, 13, 24, 25, 40]) {
      const design = { ...base, catalogReferences: Array.from({ length: count }, (_, index) => `spec-${index + 1}`) };
      const pages = getEditionPages(design);
      expect(pages.slice(0, 2)).toEqual(fixed);
      expect(pages).toHaveLength(2 + Math.ceil(count / 12));
      expect(pages.slice(2)).toEqual(Array.from({ length: Math.ceil(count / 12) }, (_, index) => ({ id: `references-${index + 1}`, label: `References ${index + 1}`, kind: "references", index })));
    }
  });
});
