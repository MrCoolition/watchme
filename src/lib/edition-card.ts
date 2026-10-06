import type { ActiveComplication, WatchDesign } from "@/lib/types";
import { getComplications, hasComplication, isFlagshipFamily } from "@/lib/presets";
import { getEditionAtmosphereDetails, getEditionDetails, getEditionPages, resolveEditionReferences, type EditionDetailSection, type EditionPage, type EditionReference } from "@/lib/edition-details";
import { isUnrealFamily } from "@/lib/unreal";

export const EDITION_CARD_SIZE = { width: 1080, height: 1350 } as const;

export function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

/** Keep card text on one visible line; Unicode code points are never split. */
function visibleText(value: string): string {
  return value.replace(/[\p{C}\p{Zl}\p{Zp}]/gu, "").replace(/\s+/g, " ").trim();
}

export function editionInitials(value?: string): string {
  return Array.from(visibleText(value ?? "").toLocaleUpperCase("en-US")).slice(0, 4).join("");
}

export function editionTitle(name: string): string[] {
  const characters = Array.from(visibleText(name).toLocaleUpperCase("en-US") || "UNTITLED");
  if (characters.length <= 25) return [characters.join("")];
  const first = characters.slice(0, 25).join("");
  const wordBreak = first.lastIndexOf(" ");
  const split = wordBreak >= 12 ? wordBreak : 25;
  const remainder = characters.slice(split).join("").trim();
  const second = Array.from(remainder);
  return [characters.slice(0, split).join(""), second.length > 25 ? `${second.slice(0, 24).join("")}…` : remainder];
}

/** A content fingerprint, not a serial number, ownership claim, or security hash. */
export function editionFingerprint(design: WatchDesign): string {
  const stableValue = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b, "en")).map(([key, item]) => [key, stableValue(item)]));
    return value;
  };
  const canonical = JSON.stringify(stableValue(design));
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (const byte of new TextEncoder().encode(canonical)) {
    first = Math.imul(first ^ byte, 0x01000193);
    second = Math.imul(second ^ byte, 0x85ebca6b);
  }
  return `WM-${(first >>> 0).toString(16).padStart(8, "0").toUpperCase()}-${(second >>> 0).toString(16).padStart(8, "0").toUpperCase()}`;
}

export function editionFilename(name: string, design: WatchDesign, page?: EditionPage): string {
  const slug = visibleText(name).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 56).replace(/-$/, "") || "untitled";
  const suffix = page && page.kind !== "portrait" ? `-${page.id.replace(/[^a-z0-9-]/gi, "").toLowerCase()}` : "";
  return `watchme-${slug}-${editionFingerprint(design).slice(3, 11).toLowerCase()}${suffix}.png`;
}

const METALS: Record<WatchDesign["metal"], string> = { steel: "Stainless steel", titanium: "Titanium", gold: "Gold tone", rose: "Rose gold tone", graphite: "Graphite", ceramic: "Black ceramic", bronze: "Bronze tone", platinum: "Platinum tone", silver: "Silver tone", whitegold: "White gold tone", carbon: "Carbon composite", sapphire: "Sapphire crystal" };
const TEXTURES: Record<WatchDesign["texture"], string> = { grid: "Clous de Paris", horizontal: "Horizontal relief", sunburst: "Sunburst", lacquer: "Lacquer", skeleton: "Open architecture", carbon: "Carbon weave", meteorite: "Meteorite", guilloche: "Guilloché", mechanical: "Mechanical layers", turbine: "Sculpted turbine", solar: "Solar sculpture", abyssal: "Abyssal contours", prismatic: "Iridescent facets", aventurine: "Aventurine sky", motherofpearl: "Mother-of-pearl", malachite: "Malachite", lapis: "Lapis lazuli", marble: "Marble", linen: "Linen weave", honeycomb: "Honeycomb", wave: "Wave relief", fume: "Fumé gradient", enamel: "Enamel", sand: "Sand grain", liquid: "Liquid atmosphere", snow: "Snow atmosphere" };
const CASES: Record<WatchDesign["caseShape"], string> = { octagonal: "Octagonal", cushion: "Cushion", tonneau: "Tonneau", round: "Round", square: "Square", rectangle: "Rectangular", hexagonal: "Hexagonal", oval: "Oval", shield: "Shield" };
const FINISHES: Record<NonNullable<WatchDesign["caseFinish"]>, string> = { polished: "Polished", brushed: "Brushed", blasted: "Blasted", hammered: "Hammered", damascus: "Damascus pattern" };
const BEZELS: Record<NonNullable<WatchDesign["bezel"]>, string> = { polished: "Polished", fluted: "Fluted", iced: "Iced", ceramic: "Ceramic", coined: "Coin-edge", scalloped: "Scalloped", screws: "Exposed screws" };
const STRAPS: Record<WatchDesign["strap"], string> = { bracelet: "Metal bracelet", leather: "Leather strap", rubber: "Rubber strap", nato: "NATO-style textile", mesh: "Woven metal mesh", rally: "Rally strap", alligator: "Alligator pattern", sailcloth: "Sailcloth pattern", braided: "Braided strap" };
const BRACELETS: Record<NonNullable<WatchDesign["braceletStyle"]>, string> = { "three-link": "Three-link bracelet", "five-link": "Five-link bracelet", "beads-of-rice": "Beads-of-rice bracelet", engineer: "Engineer bracelet" };
const HANDS: Record<WatchDesign["hands"], string> = { baton: "Baton", sword: "Sword", dauphine: "Dauphine", skeleton: "Skeleton", leaf: "Leaf", breguet: "Breguet", syringe: "Syringe", cathedral: "Cathedral", arrow: "Arrow", lollipop: "Lollipop", snowflake: "Snowflake", mercedes: "Mercedes-style" };
const MARKERS: Record<WatchDesign["markers"], string> = { baton: "Baton indices", roman: "Roman numerals", arabic: "Arabic numerals", minimal: "Minimal indices", dots: "Dot indices", triangles: "Triangle indices", diamonds: "Diamond indices", explorer: "3-6-9 numerals", california: "California numerals", breguet: "Breguet numerals", none: "No indices" };
const CRYSTALS: Record<NonNullable<WatchDesign["crystalStyle"]>, string> = { clear: "Clear crystal", domed: "Domed crystal", smoked: "Smoked crystal", faceted: "Faceted crystal" };
const TRACKS: Record<NonNullable<WatchDesign["chapterRing"]>, string> = { minute: "Minute track", railroad: "Railroad track", dots: "Dot track", tachymeter: "Tachymeter", none: "Unmarked track" };
const LUME: Record<NonNullable<WatchDesign["lumeStyle"]>, string> = { standard: "Luminous hands & markers", "full-dial": "Full-dial lume", "hands-only": "Luminous hands", none: "No lume" };
const FUNCTIONS: Record<ActiveComplication, string> = { date: "Date", daydate: "Day / date", calendar: "Calendar", gmt: "GMT", chronograph: "Chronograph", weather: "Weather", regulator: "Regulator", daynight: "Day / night", moonphase: "Moon phase" };

export function editionSpecs(design: WatchDesign): { label: string; value: string; detail: string }[] {
  return [
    { label: "CASE / FINISH", value: METALS[design.metal], detail: [CASES[design.caseShape], design.caseFinish && FINISHES[design.caseFinish]].filter(Boolean).join(" · ") },
    { label: "DIAL", value: TEXTURES[design.texture], detail: `${HANDS[design.hands]} · ${MARKERS[design.markers]}` },
    { label: "BEZEL", value: BEZELS[design.bezel ?? "polished"], detail: [design.crystalStyle && CRYSTALS[design.crystalStyle], design.chapterRing && TRACKS[design.chapterRing]].filter(Boolean).join(" · ") },
    { label: "STRAP", value: design.strap === "bracelet" && design.braceletStyle ? BRACELETS[design.braceletStyle] : STRAPS[design.strap], detail: design.strapColor ? `Color ${design.strapColor.toUpperCase()}` : "" },
  ];
}

export function editionFunctions(design: WatchDesign): string {
  const functions = getComplications(design).map(type => FUNCTIONS[type]);
  return [functions.length ? functions.join(" · ") : "Time only", design.lumeStyle && LUME[design.lumeStyle]].filter(Boolean).join(" / ");
}

export function editionSeconds(design: WatchDesign): string {
  if (design.secondsIndication === "none") return "SECONDS HIDDEN";
  const motion = design.secondsMotion === "tick" ? "TICK" : design.secondsMotion === "stepped" ? `${design.secondsAdvances ?? 8} ADVANCES/S` : "GLIDE";
  if (!design.secondsIndication && !design.secondsPlacement) return motion;
  const indication = design.secondsIndication ?? (hasComplication(design, "chronograph") ? "chronograph" : "running");
  const source = indication === "chronograph" ? "ELAPSED" : "RUNNING";
  return `${source} / ${(design.secondsPlacement ?? "central").toUpperCase()} / ${motion}`;
}

export interface EditionCardArtwork {
  design: WatchDesign;
  name: string;
  // Browser-serialized, self-contained WatchFace SVG; never user-authored XML.
  watchSvg: string;
  lume?: boolean;
  eclipse?: boolean;
  page?: EditionPage;
  references?: EditionReference[];
  timezone?: string;
  secondaryTimezone?: string;
  isDraft?: boolean;
}

const CARD = { paper: "#ECEDE6", text: "#D8DFDA", muted: "#98A9A5", dim: "#93A59E" };
function color(value: string | undefined, fallback: string): string { return value && /^#[a-f\d]{6}$/i.test(value) ? value.toUpperCase() : fallback; }

/** Card ink only: lift toward white until it clears the lightest paper at WCAG 4.5:1. */
export function editionAccentInk(value: string): string {
  const original = color(value, "#79E8C5");
  const channels = [1, 3, 5].map(offset => parseInt(original.slice(offset, offset + 2), 16));
  const luminance = (rgb: number[]) => rgb.reduce((total, channel, index) => {
    const srgb = channel / 255;
    const linear = srgb <= .04045 ? srgb / 12.92 : ((srgb + .055) / 1.055) ** 2.4;
    return total + linear * [.2126, .7152, .0722][index];
  }, 0);
  const paperLuminance = luminance([0x16, 0x20, 0x23]);
  for (let step = 0; step <= 255; step++) {
    // Mixing with white retains the source hue while lifting its luminance.
    const lifted = channels.map(channel => Math.round(channel + (255 - channel) * step / 255));
    if ((luminance(lifted) + .05) / (paperLuminance + .05) >= 4.5) {
      return `#${lifted.map(channel => channel.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
    }
  }
  return "#FFFFFF";
}
function widthOf(value: string, size: number): number {
  return Array.from(value).reduce((sum, char) => sum + (/[ilI1.,:;'| ]/.test(char) ? .28 : /[MW@%]/.test(char) ? .88 : /[A-Z0-9]/.test(char) ? .62 : /[^\u0000-\u024f]/u.test(char) ? .95 : .5) * size, 0);
}
// Word wrapping preserves every visible character, including names and reference notes.
function wrap(value: string, width: number, size: number): string[] {
  const words = visibleText(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (widthOf(line ? `${line} ${word}` : word, size) <= width) { line = line ? `${line} ${word}` : word; continue; }
    if (line) { lines.push(line); line = ""; }
    if (widthOf(word, size) <= width) { line = word; continue; }
    for (const character of Array.from(word)) {
      if (line && widthOf(line + character, size) > width) { lines.push(line); line = character; }
      else line += character;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}
function linesSvg(lines: string[], x: number, y: number, size: number, leading: number, fill: string = CARD.text, extra = ""): string {
  return lines.map((line, index) => `<text x="${x}" y="${y + index * leading}" font-size="${size}" fill="${fill}" ${extra}>${escapeXml(line)}</text>`).join("");
}
function label(value: string, x: number, y: number, fill: string = CARD.muted, size = 10): string {
  return `<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" letter-spacing="1.8">${escapeXml(value.toUpperCase())}</text>`;
}
function nestedSvg(svg: string, x: number, y: number, width: number, height: number): string {
  return svg.replace(/<svg\b([^>]*)>/, (_opening, attributes: string) => {
    const closed = /\/\s*$/.test(attributes);
    const clean = attributes.replace(/\/\s*$/, "").replace(/\s(?:x|y|width|height|preserveAspectRatio)="[^"]*"/g, "");
    return `<svg${clean} x="${x}" y="${y}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet"${closed ? "/" : ""}>`;
  });
}
function safeSource(url?: string): string | undefined {
  if (!url) return;
  try { const parsed = new URL(url); return ["https:", "http:"].includes(parsed.protocol) ? parsed.href : undefined; } catch { return; }
}
function colorStudy(design: WatchDesign, x: number, y: number): string {
  const swatches = [{ label: "DIAL", value: design.dialColor }, { label: "ACCENT", value: design.accentColor }, { label: "LUME", value: design.lumeColor || design.accentColor }, ...(design.strapColor ? [{ label: "STRAP", value: design.strapColor }] : [])];
  return swatches.map((swatch, i) => `<g data-edition-color="${swatch.label.toLowerCase()}"><circle cx="${x + i * 82}" cy="${y}" r="9" fill="${color(swatch.value, "#77938B")}" stroke="#D9E3DB" stroke-opacity=".3" stroke-width=".7"/>${label(swatch.label, x + i * 82 + 14, y - 2, CARD.muted, 6.5)}<text x="${x + i * 82 + 14}" y="${y + 9}" fill="${CARD.text}" font-size="7.5" font-family="monospace">${escapeXml(swatch.value.toUpperCase())}</text></g>`).join("");
}
function callout(number: string, title: string, value: string, x: number, y: number, targetX: number, targetY: number, accent: string, right = false): string {
  const width = 198;
  const textX = right ? x - width : x;
  const values = wrap(value, width, 13);
  const anchorX = right ? x - 28 : x + 28;
  const elbow = right ? x - width - 12 : x + width + 12;
  const lineY = y + values.length * 17 + 19;
  return `<g data-edition-callout="${number}">
    <circle cx="${right ? x - 9 : x + 9}" cy="${y - 10}" r="9" fill="#0A1515" stroke="${accent}" stroke-opacity=".55"/>
    <text x="${right ? x - 9 : x + 9}" y="${y - 7}" font-size="7.5" text-anchor="middle" fill="${accent}" font-family="monospace">${number}</text>
    ${label(title, right ? textX : textX + 27, y - 6, CARD.muted, 8)}
    ${linesSvg(values, textX, y + 16, 13, 17, CARD.paper)}
    <path d="M${anchorX} ${lineY}H${elbow}L${targetX} ${targetY}" fill="none" stroke="${accent}" stroke-opacity=".35" stroke-width=".7"/>
    <circle cx="${targetX}" cy="${targetY}" r="2.4" fill="${accent}" fill-opacity=".8"/>
  </g>`;
}
function portrait(artwork: EditionCardArtwork, accent: string): string {
  const { design, name, watchSvg, lume = false, eclipse = false } = artwork;
  const title = editionTitle(name);
  const specs = editionSpecs(design);
  const heroY = title.length > 1 ? 285 : 247;
  const heroHeight = title.length > 1 ? 729 : 767;
  const titleSize = title.length > 1 ? 48 : Array.from(title[0]).length > 17 ? 54 : 68;
  const inscription = [editionInitials(design.initials), visibleText(design.signature || "")].filter(Boolean).join(" · ");
  return `
    ${label("A PERSONAL STUDY IN TIME", 65, 156, accent, 9.5)}
    ${title.map((line, i) => `<text x="61" y="${217 + i * 51}" font-family="Georgia, 'Times New Roman', serif" font-size="${Math.min(titleSize, titleSize * 920 / Math.max(1, widthOf(line, titleSize) * 1.16)).toFixed(2)}" font-weight="400" letter-spacing="-1.7" fill="${CARD.paper}">${escapeXml(line)}</text>`).join("")}
    <g fill="none" stroke="${accent}"><circle cx="540" cy="642" r="311" stroke-opacity=".09"/><circle cx="540" cy="642" r="319" stroke-opacity=".12" stroke-dasharray=".7 15"/></g>
    <path d="M540 318V354M540 930V966M218 642H250M830 642H862" stroke="${accent}" stroke-opacity=".24" stroke-width=".6"/>
    ${nestedSvg(watchSvg, 126, heroY, 828, heroHeight)}
    ${callout("01", "CASE STUDY", `${METALS[design.metal]} · ${CASES[design.caseShape]}`, 65, 396, 310, 476, accent)}
    ${callout("02", "DIAL LANGUAGE", `${TEXTURES[design.texture]} · ${HANDS[design.hands]}`, 1015, 603, 774, 688, accent, true)}
    ${callout("03", "ON THE WRIST", specs[3].value, 65, 858, 404, 917, accent)}
    ${label(`${eclipse ? "ECLIPSE" : lume ? "LUME" : "DAYLIGHT"} / ${editionSeconds(design)}`, 65, 1037, CARD.muted, 8)}
    ${colorStudy(design, 694, 1032)}
    <path d="M64 1062H1016" stroke="url(#edition-rule)"/>
    ${specs.map((spec, index) => {
      const x = 64 + index * 246;
      return `<g data-edition-overview="${index + 1}">${label(spec.label, x, 1090, CARD.dim, 8.5)}${linesSvg(wrap(spec.value, 225, 15), x, 1115, 15, 18, CARD.paper)}${linesSvg(wrap(spec.detail, 221, 10), x, 1154, 10, 13, CARD.muted)}</g>`;
    }).join("")}
    ${label("FUNCTIONS", 64, 1200, CARD.dim, 8)}
    ${linesSvg(wrap(editionFunctions(design), 842, 10.7), 168, 1200, 10.7, 14, CARD.text)}
    ${inscription ? `<text x="1016" y="1246" text-anchor="end" font-family="Georgia, serif" font-style="italic" font-size="19" fill="${accent}">${escapeXml(inscription)}</text>` : `<path d="M970 1233L981 1247L992 1230L1003 1247L1014 1233" fill="none" stroke="${accent}" stroke-width="1.2"/>`}
  `;
}
function detailSection(section: EditionDetailSection, index: number, accent: string): string {
  const x = 64 + index % 2 * 492;
  const y = 315 + Math.floor(index / 2) * 291;
  const width = 460;
  let valueSize = 14;
  let noteSize = 10.1;
  const valueWidth = 313;
  let layout: { value: string[]; note: string[]; height: number }[] = [];
  for (let attempt = 0; attempt < 5; attempt++) {
    layout = section.rows.map(row => {
      const value = wrap(row.value, valueWidth - (row.color ? 20 : 0), valueSize);
      const note = row.note ? wrap(row.note, valueWidth, noteSize) : [];
      return { value, note, height: value.length * (valueSize + 2.5) + note.length * (noteSize + 2) + 9 };
    });
    if (layout.reduce((sum, row) => sum + row.height, 0) <= 224) break;
    valueSize -= .5; noteSize -= .35;
  }
  let rowY = y + 61;
  return `<g data-edition-section="${escapeXml(section.id)}">
    <path d="M${x} ${y}H${x + width}" stroke="${accent}" stroke-opacity=".44" stroke-width=".8"/>
    <text x="${x}" y="${y + 26}" font-size="12" font-family="monospace" fill="${accent}">${String(index + 1).padStart(2, "0")}</text>
    ${label(section.title, x + 34, y + 26, CARD.paper, 11)}
    ${section.rows.map((row, i) => {
      const lines = layout[i];
      const rowTop = rowY;
      rowY += lines.height;
      const rowValueX = x + 139;
      const physicalReference = /reference/i.test(row.label);
      return `<g data-edition-field="${escapeXml(row.label)}">
        ${linesSvg(wrap(row.label, 121, 9.5), x, rowTop, 9.5, 12, CARD.muted)}
        ${row.color ? `<circle cx="${rowValueX + 5}" cy="${rowTop - 5}" r="5.5" fill="${color(row.color, "#718A82")}" stroke="#D4DFD8" stroke-opacity=".35" stroke-width=".6"/>` : ""}
        ${linesSvg(lines.value, rowValueX + (row.color ? 19 : 0), rowTop, valueSize, valueSize + 2.5, physicalReference ? accent : CARD.paper)}
        ${linesSvg(lines.note, rowValueX, rowTop + lines.value.length * (valueSize + 2.5), noteSize, noteSize + 2, CARD.dim)}
        ${i < section.rows.length - 1 ? `<path d="M${x + 139} ${rowY - 8}H${x + width}" stroke="#A9BDB3" stroke-opacity=".08" stroke-width=".5"/>` : ""}
      </g>`;
    }).join("")}
  </g>`;
}
function buildSheet(artwork: EditionCardArtwork, accent: string): string {
  const fullName = visibleText(artwork.name) || "Untitled";
  const titleLines = wrap(fullName, 950, 23);
  const nameSize = titleLines.length > 3 ? 19 : 23;
  const nameLines = wrap(fullName, 950, nameSize);
  return `
    ${label("THE COMPLETE BUILD", 65, 158, accent, 9.5)}
    <text x="61" y="211" font-family="Georgia, 'Times New Roman', serif" font-size="49" fill="${CARD.paper}" letter-spacing="-1">Every detail, considered.</text>
    <g data-edition-full-name="true">${linesSvg(nameLines, 65, 250, nameSize, nameSize + 4, CARD.text)}</g>
    ${getEditionDetails(artwork.design).map((section, index) => detailSection(section, index, accent)).join("")}
    <path d="M64 1200H1016" stroke="url(#edition-rule)"/>
    ${label("CAPTURE CONTEXT", 64, 1222, CARD.dim, 8)}
    ${linesSvg(wrap(`Primary: ${artwork.timezone || "Device local time"}   ·   Secondary: ${artwork.secondaryTimezone || "Europe/London"}`, 790, 10), 64, 1243, 10, 13, CARD.muted)}
    <text x="1016" y="1243" fill="${accent}" font-size="9" text-anchor="end" letter-spacing="1.4">${artwork.eclipse ? "ECLIPSE" : artwork.lume ? "LUME" : "DAYLIGHT"}</text>
  `;
}
function atmospherePage(artwork: EditionCardArtwork, accent: string): string {
  const section = getEditionAtmosphereDetails(artwork.design);
  return `
    ${label("THE ATMOSPHERE STUDY", 65, 158, accent, 9.5)}
    <text x="61" y="212" font-family="Georgia, 'Times New Roman', serif" font-size="47" fill="${CARD.paper}" letter-spacing="-1">An atmosphere of your own.</text>
    ${linesSvg(wrap(visibleText(artwork.name) || "Untitled", 950, 20), 65, 251, 20, 24, CARD.text)}
    <path d="M64 302H1016" stroke="url(#edition-rule)"/>
    <g data-edition-section="atmosphere">${section.rows.map((row, index) => {
      const y = 342 + index * 132;
      return `<g data-edition-field="${escapeXml(row.label)}">
        ${label(`${String(index + 1).padStart(2, "0")} / ${row.label}`, 65, y, accent, 9)}
        ${row.color ? `<circle cx="77" cy="${y + 28}" r="11" fill="${color(row.color, "#9BE7FF")}" stroke="${CARD.text}" stroke-opacity=".6"/>` : ""}
        ${linesSvg(wrap(row.value, row.color ? 358 : 393, 25), row.color ? 104 : 65, y + 36, 25, 29, CARD.paper)}
        ${linesSvg(wrap(row.note || "", 400, 12), 65, y + 65, 12, 17, CARD.muted)}
        <path d="M65 ${y + 108}H469" stroke="#A9BDB3" stroke-opacity=".12"/>
      </g>`;
    }).join("")}</g>
    ${nestedSvg(artwork.watchSvg, 511, 332, 505, 665)}
    ${label("ONE CAPTURED MOMENT", 542, 1040, accent, 9)}
    ${linesSvg(wrap("The same dial artwork as your portrait. Your atmosphere settings remain in the complete design file.", 438, 13), 542, 1070, 13, 19, CARD.muted)}
    <path d="M64 1178H1016" stroke="url(#edition-rule)"/>
    ${label("DIGITAL MATERIAL / PERSONAL EXPRESSION", 65, 1209, CARD.muted, 9)}
    ${linesSvg(wrap("Atmosphere motion is independent of the clock. Your timekeeping and complications keep their selected behavior.", 930, 12), 65, 1234, 12, 17, CARD.text)}
  `;
}

function referenceEntry(reference: EditionReference, index: number, number: number, accent: string): string {
  const x = 64 + index % 2 * 492;
  const y = 307 + Math.floor(index / 2) * 150;
  const source = safeSource(reference.sourceUrl);
  const sourceText = [reference.sourceLabel || "Saved reference", source ? new URL(source).hostname.replace(/^www\./, "") : ""].filter(Boolean).join(" · ");
  let optionSize = 16, descriptionSize = 10.8;
  let category = wrap(reference.category.toUpperCase(), 393, 8.1);
  let option = wrap(reference.option, 406, optionSize);
  let description = reference.description ? wrap(reference.description, 440, descriptionSize) : [];
  let sourceLines = wrap(sourceText, 440, 8.7);
  for (let attempt = 0; attempt < 8; attempt++) {
    const total = category.length * 10 + option.length * (optionSize + 2) + description.length * (descriptionSize + 2) + sourceLines.length * 10 + 20;
    if (total <= 139) break;
    optionSize = Math.max(13, optionSize - .4);
    descriptionSize = Math.max(8, descriptionSize - .4);
    category = wrap(reference.category.toUpperCase(), 393, 8.1);
    option = wrap(reference.option, 406, optionSize);
    description = reference.description ? wrap(reference.description, 440, descriptionSize) : [];
    sourceLines = wrap(sourceText, 440, 8.7);
  }
  const optionY = y + 13 + category.length * 10;
  const descriptionY = optionY + option.length * (optionSize + 2) + 5;
  const sourceY = descriptionY + description.length * (descriptionSize + 2) + 5;
  return `<g data-edition-reference="${escapeXml(reference.id)}">
    <path d="M${x} ${y - 5}H${x + 460}" stroke="${accent}" stroke-opacity=".23" stroke-width=".7"/>
    <text x="${x}" y="${y + 25}" font-family="Georgia, serif" font-size="27" fill="${accent}" fill-opacity=".48">${String(number).padStart(2, "0")}</text>
    ${linesSvg(category, x + 47, y + 5, 8.1, 10, CARD.dim, 'letter-spacing="1.2"')}
    ${linesSvg(option, x + 47, optionY, optionSize, optionSize + 2, CARD.paper)}
    ${linesSvg(description, x + 1, descriptionY, descriptionSize, descriptionSize + 2, CARD.muted)}
    ${source ? `<a href="${escapeXml(source)}"><title>${escapeXml(source)}</title>` : ""}
    ${linesSvg(sourceLines, x + 1, sourceY, 8.7, 10, accent)}
    ${source ? "</a>" : ""}
  </g>`;
}
function referencePage(artwork: EditionCardArtwork, page: Extract<EditionPage, {kind: "references"}>, accent: string): string {
  const lookup = new Map((artwork.references || []).map(reference => [reference.id, reference]));
  const references = resolveEditionReferences(artwork.design, []).map(missing => lookup.get(missing.id) || missing);
  const start = Math.max(0, Math.floor(page.index)) * 12;
  const shown = references.slice(start, start + 12);
  return `
    ${label("THE REFERENCE ARCHIVE", 65, 158, accent, 9.5)}
    <text x="61" y="214" font-family="Georgia, 'Times New Roman', serif" font-size="51" fill="${CARD.paper}" letter-spacing="-1">Ideas behind the build.</text>
    ${label(`${start + 1}–${Math.min(start + 12, references.length)} OF ${references.length} SAVED REFERENCES`, 66, 248, CARD.text, 9)}
    <text x="1016" y="248" text-anchor="end" font-size="9" fill="${CARD.dim}" letter-spacing="1.5">REFERENCE SPECIFICATIONS</text>
    ${shown.map((reference, index) => referenceEntry(reference, index, start + index + 1, accent)).join("")}
    ${label("Saved research notes accompany this design.", 65, 1239, CARD.dim, 8)}
  `;
}

// Compose the collector set from the actual frozen watch and complete saved configuration.
export function buildEditionCardSvg(artwork: EditionCardArtwork): string {
  const { design, isDraft = false } = artwork;
  const accent = editionAccentInk(design.accentColor);
  const page = artwork.page || { id: "portrait", label: "Portrait", kind: "portrait" } as const;
  const pages = getEditionPages(design);
  const pageNumber = Math.max(0, pages.findIndex(item => item.id === page.id)) + 1;
  const content = page.kind === "build" ? buildSheet(artwork, accent) : page.kind === "atmosphere" ? atmospherePage(artwork, accent) : page.kind === "references" ? referencePage(artwork, page, accent) : portrait(artwork, accent);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350" data-edition-page="${escapeXml(page.id)}">
  <title>${escapeXml(visibleText(artwork.name) || "Untitled")} — ${escapeXml(page.label)}</title>
  <defs>
    <linearGradient id="edition-background" x2="1" y2="1"><stop stop-color="#162023"/><stop offset=".36" stop-color="#070D0F"/><stop offset="1" stop-color="#101A1C"/></linearGradient>
    <radialGradient id="edition-aura"><stop stop-color="${accent}" stop-opacity=".1"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <linearGradient id="edition-rule"><stop stop-color="${accent}" stop-opacity=".7"/><stop offset=".5" stop-color="#B7C9C0" stop-opacity=".16"/><stop offset="1" stop-color="#B7C9C0" stop-opacity=".38"/></linearGradient>
    <pattern id="edition-grain" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M0 .5H6" stroke="#FFFFFF" stroke-opacity=".018"/><circle cx="4" cy="4" r=".4" fill="#C4D3CA" fill-opacity=".05"/></pattern>
  </defs>
  <rect width="1080" height="1350" fill="url(#edition-background)"/>
  <rect width="1080" height="1350" fill="url(#edition-grain)"/>
  <ellipse cx="575" cy="618" rx="500" ry="520" fill="url(#edition-aura)"/>
  <path d="M31 31H1049V1319H31Z" fill="none" stroke="#C7D8CC" stroke-opacity=".07" stroke-width=".8"/>
  <g font-family="Arial, Helvetica, sans-serif">
    <path d="M64 66L72 78L79 63L86 78L94 66" fill="none" stroke="${accent}" stroke-width="1.5"/>
    <text x="109" y="85" fill="${CARD.paper}" font-size="27" font-weight="500" letter-spacing="5">WATCHMÉ</text>
    ${label(isUnrealFamily(design.family) ? "UNREAL" : isFlagshipFamily(design.family) ? "BLACK LABEL" : "PRIVATE STUDIO", 783, 67, accent, 9)}
    <text x="1016" y="88" text-anchor="end" fill="${CARD.muted}" font-size="8" letter-spacing="1.8">${isDraft ? "DRAFT SNAPSHOT" : "COLLECTOR EDITION"} / ${String(pageNumber).padStart(2, "0")}</text>
    <path d="M64 114H1016" stroke="url(#edition-rule)" stroke-width=".7"/>
    ${content}
    <path d="M64 1268H1016" stroke="#A0B4AA" stroke-opacity=".18" stroke-width=".6"/>
    ${label("DESIGN FINGERPRINT", 64, 1290, CARD.dim, 7)}
    <text x="64" y="1308" fill="${CARD.muted}" font-family="monospace" font-size="10" letter-spacing=".8">${editionFingerprint(design)}</text>
    <text x="1016" y="1290" text-anchor="end" fill="${CARD.muted}" font-size="8" letter-spacing="1.4">${escapeXml(page.label.toUpperCase())} / ${String(pageNumber).padStart(2, "0")} OF ${String(pages.length).padStart(2, "0")}</text>
    <text x="1016" y="1308" text-anchor="end" fill="${CARD.dim}" font-size="7.5" letter-spacing="1.4">ORIGINAL WATCHMÉ DESIGN · 1080 × 1350</text>
  </g>
</svg>`;
}

export function serializeWatchSvg(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.removeAttribute("width");
  clone.removeAttribute("height");
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  clone.removeAttribute("aria-labelledby");
  clone.setAttribute("viewBox", "0 0 640 720");
  return new XMLSerializer().serializeToString(clone);
}

/** All fonts, gradients and paths are local; no image or font request can taint this canvas. */
export async function drawEditionCard(canvas: HTMLCanvasElement, artwork: EditionCardArtwork): Promise<void> {
  const url = URL.createObjectURL(new Blob([buildEditionCardSvg(artwork)], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Your browser could not render this edition card. Please try again.")); image.src = url; });
    canvas.width = EDITION_CARD_SIZE.width;
    canvas.height = EDITION_CARD_SIZE.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not create the edition card canvas.");
    context.drawImage(image, 0, 0);
  } finally { URL.revokeObjectURL(url); }
}

export function editionPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Your browser could not encode the PNG. Please try again.")), "image/png"));
}
