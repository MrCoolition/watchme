import { describe, expect, it } from "vitest";
import { buildEditionCardSvg, editionAccentInk, editionFilename, editionFingerprint, editionFunctions, editionInitials, editionSeconds, editionSpecs, editionTitle, escapeXml } from "../src/lib/edition-card";
import { PARTS, PRESETS, isFlagshipFamily } from "../src/lib/presets";
import type { WatchDesign } from "../src/lib/types";
import { getEditionDetails, getEditionPages, type EditionReference } from "../src/lib/edition-details";

const design = PRESETS[0].design;
const textContent = (svg: string) => Array.from(svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g), match => match[1]).join(" ").replace(/\s+/g, " ");

describe("edition card artwork", () => {
  it("keeps dark accent ink readable while preserving actual black watch colors and swatches", () => {
    const luminance = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255).map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4).reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
    for (const accent of ["#000000", "#001122", "#000080", "#550033", "#79E8C5"]) {
      const ink = editionAccentInk(accent);
      expect((luminance(ink) + .05) / (luminance("#162023") + .05)).toBeGreaterThanOrEqual(4.5);
    }
    expect(editionAccentInk("#79E8C5")).toBe("#79E8C5");
    const ink = editionAccentInk("#000000");
    expect(ink).not.toBe("#000000");
    const artwork = buildEditionCardSvg({ design: { ...design, accentColor: "#000000" }, name: "Black study", watchSvg: '<svg><circle id="actual-black-watch" fill="#000000"/></svg>' });
    expect(artwork).toContain(`fill="${ink}"`);
    expect(artwork).toMatch(/data-edition-color="accent"><circle[^>]*fill="#000000"/);
    expect(artwork).toContain('id="actual-black-watch" fill="#000000"');
    expect(textContent(artwork)).toContain("#000000");
  });

  it("escapes user text without interpreting markup in the exported XML", () => {
    expect(escapeXml(`<script a="x">&'</script>`)).toBe("&lt;script a=&quot;x&quot;&gt;&amp;&apos;&lt;/script&gt;");
    const artwork = buildEditionCardSvg({ design: { ...design, initials: "<AB>" }, name: "<img>&\"", watchSvg: '<svg viewBox="0 0 640 720"><path id="real-watch"/></svg>' });
    expect(artwork).toContain("&lt;IMG&gt;&amp;&quot;");
    expect(artwork).toContain("&lt;AB&gt;");
    expect(artwork).not.toContain("<img>");
    expect(artwork).toContain('id="real-watch"');
    expect(artwork).toMatch(/<svg viewBox="0 0 640 720" x="\d+" y="\d+" width="\d+" height="\d+" preserveAspectRatio="xMidYMid meet">/);
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
    expect(artwork).toContain("Mother-of-pearl");
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
    expect(textContent(artwork)).toContain("Mercedes-style · California numerals");
    expect(artwork).not.toContain('lengthAdjust="spacingAndGlyphs"');
    for (const spec of editionSpecs(customized)) {
      expect(textContent(artwork)).toContain(escapeXml(spec.value));
      expect(textContent(artwork)).toContain(escapeXml(spec.detail));
    }
    expect(artwork).toContain(escapeXml(editionFunctions(customized)));
    expect(artwork).toContain("DAYLIGHT / ELAPSED / PERIPHERAL / 16 ADVANCES/S");
  });

  it("defaults to an illustrated portrait while keeping the original filename", () => {
    const artwork = buildEditionCardSvg({ design, name: "One of my own", watchSvg: '<svg width="640" height="720" viewBox="0 0 640 720"><path id="frozen-hands"/></svg>' });
    expect(artwork).toContain('data-edition-page="portrait"');
    expect(artwork.match(/data-edition-callout=/g)).toHaveLength(3);
    expect(artwork.match(/data-edition-color=/g)).toHaveLength(3);
    expect(artwork).toContain('id="frozen-hands"');
    const portrait = getEditionPages(design)[0];
    expect(editionFilename("One of my own", design, portrait)).toBe(editionFilename("One of my own", design));
    expect(editionFilename("One of my own", design, getEditionPages(design)[1])).toMatch(/-build\.png$/);
  });

  it("prints every build value and note, including defaults and saved inactive settings", () => {
    const customized: WatchDesign = { ...design, strap: "leather", braceletStyle: "engineer", texture: "motherofpearl", secondsIndication: "none", secondsMotion: "stepped", secondsAdvances: 16, secondsSetting: "zero-reset", chronographBehavior: "flyback", lumeStyle: "none", lumeColor: "#A1B2C3", signature: "A <B> & C", initials: "WM" };
    const name = "An exceptionally long personally named watch for a unique collection of originals";
    const artwork = buildEditionCardSvg({ design: customized, name, watchSvg: '<svg><path id="portrait-only"/></svg>', page: { id: "build", kind: "build", label: "Build sheet" }, timezone: "America/New_York", secondaryTimezone: "Asia/Tokyo", isDraft: true });
    const text = textContent(artwork);
    expect(artwork).toContain('data-edition-page="build"');
    expect(artwork.match(/data-edition-section=/g)).toHaveLength(6);
    expect(text).toContain(name);
    expect(text).toContain("DRAFT SNAPSHOT");
    expect(text).toContain("America/New_York");
    expect(text).toContain("Asia/Tokyo");
    for (const section of getEditionDetails(customized)) for (const row of section.rows) {
      expect(text).toContain(escapeXml(row.value));
      if (row.note) expect(text).toContain(escapeXml(row.note));
    }
    expect(artwork).not.toContain('id="portrait-only"');
    expect(text).toContain("Saved reference only; device time remains authoritative.");
    expect(text).toContain("Saved / inactive on the selected strap.");
  });

  it("prints forty saved references exactly once across four readable reference pages", () => {
    const references: EditionReference[] = Array.from({ length: 40 }, (_, i) => ({ id: `reference-${i + 1}`, category: "Movement research", option: `Saved option ${i + 1}`, description: `An original research note number ${i + 1} with enough detail to wrap across several lines while preserving the entire wording.`, sourceLabel: `Master catalog · row ${i + 2}`, sourceUrl: `https://example.com/reference/${i + 1}` }));
    const customized = { ...design, catalogReferences: references.map(reference => reference.id) };
    const pages = getEditionPages(customized);
    expect(pages).toHaveLength(6);
    const cards = pages.filter(page => page.kind === "references").map(page => buildEditionCardSvg({ design: customized, name: "Research edition", watchSvg: "<svg/>", page, references }));
    expect(cards.map(card => card.match(/data-edition-reference=/g)?.length)).toEqual([12, 12, 12, 4]);
    const combined = cards.join("");
    const text = textContent(combined);
    for (const reference of references) {
      expect(combined.split(`data-edition-reference="${reference.id}"`)).toHaveLength(2);
      expect(text).toContain(reference.option);
      expect(text).toContain(reference.description);
      expect(combined).toContain(`href="${reference.sourceUrl}"`);
    }
    expect(editionFilename("Research edition", customized, pages[5])).toMatch(/-references-4\.png$/);
  });

  it("keeps unavailable references visible and escapes reference text and source URLs", () => {
    const customized = { ...design, catalogReferences: ["missing-1", "malicious-2"] };
    const artwork = buildEditionCardSvg({ design: customized, name: "References", watchSvg: "<svg/>", page: getEditionPages(customized)[2], references: [{ id: "malicious-2", category: "<script>", option: "<img> & reference", description: 'Quoted "notes" & text', sourceLabel: "A <source>", sourceUrl: "javascript:alert(1)" }] });
    expect(artwork).toContain("Missing reference: missing-1");
    expect(artwork).toContain("&lt;img&gt; &amp; reference");
    expect(artwork).not.toContain("<script>");
    expect(artwork).not.toContain("javascript:");
    expect(artwork.match(/data-edition-reference=/g)).toHaveLength(2);
  });
});
