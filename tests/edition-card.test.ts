import { describe, expect, it } from "vitest";
import { buildEditionCardSvg, editionFilename, editionFingerprint, editionFunctions, editionInitials, editionSeconds, editionSpecs, editionTitle, escapeXml } from "../src/lib/edition-card";
import { PARTS, PRESETS, isFlagshipFamily } from "../src/lib/presets";
import type { WatchDesign } from "../src/lib/types";

const design = PRESETS[0].design;

describe("edition card artwork", () => {
  it("escapes user text without interpreting markup in the exported XML", () => {
    expect(escapeXml(`<script a="x">&'</script>`)).toBe("&lt;script a=&quot;x&quot;&gt;&amp;&apos;&lt;/script&gt;");
    const artwork = buildEditionCardSvg({ design: { ...design, initials: "<AB>" }, name: "<img>&\"", watchSvg: '<svg viewBox="0 0 640 720"><path id="real-watch"/></svg>' });
    expect(artwork).toContain("&lt;IMG&gt;&amp;&quot;");
    expect(artwork).toContain("&lt;AB&gt;");
    expect(artwork).not.toContain("<img>");
    expect(artwork).toContain('id="real-watch"');
    expect(artwork).toContain('<svg x="90" y="259" width="900" height="780" viewBox="0 0 640 720">');
  });

  it("fits long names on at most two lines without splitting Unicode code points", () => {
    expect(editionTitle("  REACTOR  ")).toEqual(["REACTOR"]);
    expect(editionTitle(" ")).toEqual(["UNTITLED"]);
    const title = editionTitle("An exceptionally long personally named watch for a unique collection");
    expect(title).toHaveLength(2);
    expect(title.every(line => Array.from(line).length <= 25)).toBe(true);
    expect(title[1].endsWith("…")).toBe(true);
    expect(editionTitle("⌚".repeat(70)).join("")).not.toContain("�");
  });

  it("sanitizes and uppercases four visible initials including Unicode", () => {
    expect(editionInitials(" abcdE ")).toBe("ABCD");
    expect(editionInitials("A\u202EB\nC")).toBe("ABC");
    expect(editionInitials("é⌚xyZ")).toBe("É⌚XY");
    expect(editionInitials()).toBe("");
  });

  it("fingerprints design content deterministically independent of object key order or absent optional values", () => {
    const reversed = Object.fromEntries(Object.entries(design).reverse()) as unknown as WatchDesign;
    expect(editionFingerprint(reversed)).toBe(editionFingerprint(design));
    expect(editionFingerprint({ ...design, initials: undefined })).toBe(editionFingerprint(design));
    expect(editionFingerprint({ ...design, initials: "AB" })).not.toBe(editionFingerprint(design));
    expect(editionFingerprint({ ...design, dialColor: "#123456" })).not.toBe(editionFingerprint(design));
    expect(editionFingerprint(design)).toMatch(/^WM-[A-F0-9]{8}-[A-F0-9]{8}$/);
  });

  it("creates portable filenames that cannot contain paths or special shell characters", () => {
    expect(editionFilename("My Édition / 01", design)).toMatch(/^watchme-my-edition-01-[a-f0-9]{8}\.png$/);
    expect(editionFilename("../../CON<>:\"|?*", design)).toMatch(/^watchme-con-[a-f0-9]{8}\.png$/);
    expect(editionFilename("⌚", design)).toContain("watchme-untitled-");
    expect(editionFilename("x".repeat(1000), design).length).toBeLessThan(100);
  });

  it("describes real finish choices and identifies Black Label editions without inventing a limited serial", () => {
    for (const preset of PRESETS) {
      expect(editionSpecs(preset.design).every(spec => spec.value)).toBe(true);
      const artwork = buildEditionCardSvg({ design: preset.design, name: preset.name, watchSvg: "<svg/>" });
      expect(artwork).toContain('width="1080" height="1350"');
      expect(artwork).toContain("DESIGN FINGERPRINT");
      expect(artwork).not.toContain("LIMITED");
      expect(artwork.includes("BLACK LABEL")).toBe(isFlagshipFamily(preset.id));
    }
  });

  it("exports readable descriptions for every supported material and visual part", () => {
    const registries = {
      metal: PARTS.metals, caseShape: PARTS.caseShapes, texture: PARTS.textures,
      hands: PARTS.hands, markers: PARTS.markers, bezel: PARTS.bezels, strap: PARTS.straps,
      caseFinish: PARTS.caseFinishes, braceletStyle: PARTS.braceletStyles,
      chapterRing: PARTS.chapterRings, crystalStyle: PARTS.crystalStyles, lumeStyle: PARTS.lumeStyles,
    };
    for (const [field, options] of Object.entries(registries)) for (const option of options) {
      const customized = { ...design, [field]: option } as WatchDesign;
      const specs = editionSpecs(customized);
      expect(specs.every(spec => Boolean(spec.label && spec.value)), `${field}: ${option}`).toBe(true);
      const artwork = buildEditionCardSvg({ design: customized, name: "Catalog edition", watchSvg: "<svg/>" });
      expect(artwork, `${field}: ${option}`).not.toContain("undefined");
      expect(artwork, `${field}: ${option}`).not.toContain("[object Object]");
    }
  });

  it("describes optional finish, hands, markers, crystal, track and band color without dropping the main specifications", () => {
    const customized: WatchDesign = {
      ...design, metal: "whitegold", caseShape: "rectangle", caseFinish: "hammered",
      texture: "motherofpearl", hands: "leaf", markers: "breguet", bezel: "coined",
      crystalStyle: "domed", chapterRing: "railroad", strap: "bracelet", braceletStyle: "beads-of-rice", strapColor: "#a1b2c3",
    };
    expect(editionSpecs(customized)).toEqual([
      { label: "CASE / FINISH", value: "White gold tone", detail: "Rectangular · Hammered" },
      { label: "DIAL", value: "Mother-of-pearl", detail: "Leaf · Breguet numerals" },
      { label: "BEZEL", value: "Coin-edge", detail: "Domed crystal · Railroad track" },
      { label: "STRAP", value: "Beads-of-rice bracelet", detail: "Color #A1B2C3" },
    ]);
    const artwork = buildEditionCardSvg({ design: customized, name: "Pearl", watchSvg: "<svg/>" });
    expect(artwork).toContain("MOTHER-OF-PEARL");
    expect(artwork).not.toContain("MOTHEROFPEARL");
    expect(artwork).toContain("Rectangular · Hammered");
  });

  it("includes the full active complication set and luminous treatment in the export", () => {
    const customized: WatchDesign = { ...design, complication: "chronograph", additionalComplications: ["daydate", "gmt", "calendar"], lumeStyle: "full-dial" };
    expect(editionFunctions(customized)).toBe("Chronograph · Day / date · GMT · Calendar / Full-dial lume");
    const artwork = buildEditionCardSvg({ design: customized, name: "Calendar machine", watchSvg: "<svg/>" });
    expect(artwork).toContain("FUNCTIONS");
    expect(artwork).toContain(editionFunctions(customized));
    expect(editionFunctions({ ...design, complication: "none", lumeStyle: "none" })).toBe("Time only / No lume");
    for (const complication of PARTS.complications) expect(editionFunctions({ ...design, complication })).not.toContain("undefined");
  });

  it("does not describe saved catalog references as hardware capabilities or alter absent finishing fields", () => {
    const referenceDesign: WatchDesign = { ...design, catalogReferences: ["catalog-1309", "catalog-1310"] };
    const artwork = buildEditionCardSvg({ design: referenceDesign, name: "Reference study", watchSvg: "<svg/>" });
    expect(artwork).not.toMatch(/COSC|Certified|METAS|water resistance/i);
    expect(editionSpecs(referenceDesign)).toEqual(editionSpecs(design));
    expect(editionSpecs(design)[0].detail).toBe("Octagonal");
    expect(editionSpecs(design)[2].detail).toBe("");
    expect(editionSpecs({ ...design, strap: "leather", braceletStyle: "engineer" })[3].value).toBe("Leather strap");
  });

  it("describes software seconds source, placement and rate without claiming setting mechanics", () => {
    const customized: WatchDesign = { ...design, complication: "chronograph", secondsIndication: "chronograph", secondsPlacement: "peripheral", secondsMotion: "stepped", secondsAdvances: 16, secondsSetting: "zero-reset", chronographBehavior: "flyback" };
    expect(editionSeconds(customized)).toBe("ELAPSED / PERIPHERAL / 16 ADVANCES/S");
    expect(editionSeconds({ ...customized, secondsIndication: "none" })).toBe("SECONDS HIDDEN");
    expect(editionSeconds({ ...design, secondsIndication: "running", secondsPlacement: "small", secondsMotion: "tick" })).toBe("RUNNING / SMALL / TICK");
    const artwork = buildEditionCardSvg({ design: customized, name: "Sixteen", watchSvg: "<svg/>" });
    expect(artwork).toContain("ELAPSED / PERIPHERAL / 16 ADVANCES/S");
    expect(artwork).not.toMatch(/flyback|zero.reset|262\s*kHz/i);
  });

  it("matches the renderer's elapsed source when only a chronograph watch's seconds placement is customized", () => {
    const reactor = PRESETS.find(preset => preset.id === "reactor")!.design;
    const peripheral: WatchDesign = { ...reactor, secondsPlacement: "peripheral" };
    expect(editionSeconds(peripheral)).toBe("ELAPSED / PERIPHERAL / GLIDE");
    expect(editionSeconds({ ...peripheral, secondsIndication: "running" })).toBe("RUNNING / PERIPHERAL / GLIDE");
    expect(editionSeconds({ ...peripheral, complication: "date", additionalComplications: ["chronograph"] })).toBe("ELAPSED / PERIPHERAL / GLIDE");
    expect(editionSeconds({ ...design, secondsPlacement: "peripheral" })).toBe("RUNNING / PERIPHERAL / GLIDE");
    expect(buildEditionCardSvg({ design: peripheral, name: "Peripheral Reactor", watchSvg: "<svg/>" })).toContain("DAYLIGHT / ELAPSED / PERIPHERAL / GLIDE");
  });

  it("keeps long part details within the specification columns while retaining every selected detail", () => {
    const customized: WatchDesign = {
      ...design, metal: "sapphire", caseShape: "rectangle", caseFinish: "damascus",
      texture: "motherofpearl", hands: "mercedes", markers: "california", bezel: "screws",
      crystalStyle: "faceted", chapterRing: "railroad", strap: "bracelet", braceletStyle: "beads-of-rice", strapColor: "#a1b2c3",
      complication: "chronograph", additionalComplications: ["daydate", "gmt", "moonphase"], lumeStyle: "standard",
      secondsPlacement: "peripheral", secondsMotion: "stepped", secondsAdvances: 16,
    };
    const artwork = buildEditionCardSvg({ design: customized, name: "Complete specification", watchSvg: "<svg/>" });
    expect(artwork).toContain('textLength="200" lengthAdjust="spacingAndGlyphs">Mercedes-style · California numerals</text>');
    expect(artwork).not.toContain('textLength="215"');
    for (const spec of editionSpecs(customized)) {
      expect(artwork).toContain(escapeXml(spec.value));
      expect(artwork).toContain(escapeXml(spec.detail));
    }
    expect(artwork).toContain(escapeXml(editionFunctions(customized)));
    expect(artwork).toContain("DAYLIGHT / ELAPSED / PERIPHERAL / 16 ADVANCES/S");
  });
});
