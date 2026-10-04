import { describe, expect, it } from "vitest";
import { buildEditionCardSvg, editionFilename, editionFingerprint, editionInitials, editionSpecs, editionTitle, escapeXml } from "../src/lib/edition-card";
import { PRESETS } from "../src/lib/presets";
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

  it("describes real finish choices and identifies Reactor without inventing a limited serial", () => {
    for (const preset of PRESETS) {
      expect(editionSpecs(preset.design).every(spec => spec.value)).toBe(true);
      const artwork = buildEditionCardSvg({ design: preset.design, name: preset.name, watchSvg: "<svg/>" });
      expect(artwork).toContain('width="1080" height="1350"');
      expect(artwork).toContain("DESIGN FINGERPRINT");
      expect(artwork).not.toContain("LIMITED");
      expect(artwork.includes("BLACK LABEL")).toBe(preset.id === "reactor");
    }
  });
});
