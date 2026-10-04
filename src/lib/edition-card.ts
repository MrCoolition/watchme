import type { ActiveComplication, WatchDesign } from "@/lib/types";
import { getComplications, hasComplication, isFlagshipFamily } from "@/lib/presets";

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
  const canonical = JSON.stringify(Object.fromEntries(Object.entries(design).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b, "en"))));
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (const byte of new TextEncoder().encode(canonical)) {
    first = Math.imul(first ^ byte, 0x01000193);
    second = Math.imul(second ^ byte, 0x85ebca6b);
  }
  return `WM-${(first >>> 0).toString(16).padStart(8, "0").toUpperCase()}-${(second >>> 0).toString(16).padStart(8, "0").toUpperCase()}`;
}

export function editionFilename(name: string, design: WatchDesign): string {
  const slug = visibleText(name).normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 56).replace(/-$/, "") || "untitled";
  return `watchme-${slug}-${editionFingerprint(design).slice(3, 11).toLowerCase()}.png`;
}

const METALS: Record<WatchDesign["metal"], string> = { steel: "Stainless steel", titanium: "Titanium", gold: "Gold tone", rose: "Rose gold tone", graphite: "Graphite", ceramic: "Black ceramic", bronze: "Bronze tone", platinum: "Platinum tone", silver: "Silver tone", whitegold: "White gold tone", carbon: "Carbon composite", sapphire: "Sapphire crystal" };
const TEXTURES: Record<WatchDesign["texture"], string> = { grid: "Clous de Paris", horizontal: "Horizontal relief", sunburst: "Sunburst", lacquer: "Lacquer", skeleton: "Open architecture", carbon: "Carbon weave", meteorite: "Meteorite", guilloche: "Guilloché", mechanical: "Mechanical layers", turbine: "Sculpted turbine", solar: "Solar sculpture", abyssal: "Abyssal contours", prismatic: "Iridescent facets", aventurine: "Aventurine sky", motherofpearl: "Mother-of-pearl", malachite: "Malachite", lapis: "Lapis lazuli", marble: "Marble", linen: "Linen weave", honeycomb: "Honeycomb", wave: "Wave relief", fume: "Fumé gradient", enamel: "Enamel", sand: "Sand grain" };
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
  /** A browser-serialized, self-contained WatchFace SVG; never user-authored XML. */
  watchSvg: string;
  lume?: boolean;
  eclipse?: boolean;
}

/** Compose original vector artwork. User-entered text is escaped independently of trusted SVG. */
export function buildEditionCardSvg({ design, name, watchSvg, lume = false, eclipse = false }: EditionCardArtwork): string {
  const accent = /^#[0-9a-f]{6}$/i.test(design.accentColor) ? design.accentColor : "#79E8C5";
  const isFlagship = isFlagshipFamily(design.family);
  const title = editionTitle(name);
  const initials = editionInitials(design.initials);
  const specs = editionSpecs(design);
  const faceState = eclipse ? "ECLIPSE" : lume ? "LUME" : "DAYLIGHT";
  const mechanical = design.texture === "mechanical" ? "LIVING DIAL" : TEXTURES[design.texture].toUpperCase();
  const nestedWatch = watchSvg.replace(/^<svg\b/, '<svg x="90" y="259" width="900" height="780"').replace(/\s(?:width|height)="(?:640|720)(?:px)?"/g, "");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <linearGradient id="edition-background" x2="1" y2="1"><stop stop-color="#15191D"/><stop offset=".45" stop-color="#080B0D"/><stop offset="1" stop-color="#111519"/></linearGradient>
    <radialGradient id="edition-aura"><stop stop-color="${accent}" stop-opacity=".14"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <linearGradient id="edition-rule"><stop stop-color="${accent}" stop-opacity=".75"/><stop offset=".6" stop-color="#AAB9BF" stop-opacity=".15"/><stop offset="1" stop-color="#AAB9BF" stop-opacity=".35"/></linearGradient>
    <pattern id="edition-grain" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0H8" stroke="#FFFFFF" stroke-opacity=".018"/></pattern>
  </defs>
  <rect width="1080" height="1350" fill="url(#edition-background)"/>
  <rect width="1080" height="1350" fill="url(#edition-grain)"/>
  <ellipse cx="540" cy="661" rx="510" ry="492" fill="url(#edition-aura)"/>
  <g fill="none" stroke="#D8E5E6" stroke-opacity=".065">
    <path d="M32 32H1048V1318H32Z"/><path d="M64 330V990M1016 330V990"/>
    <circle cx="540" cy="650" r="341"/><circle cx="540" cy="650" r="349" stroke-dasharray="1 16"/>
  </g>
  <g font-family="Arial, Helvetica, sans-serif">
    <text x="64" y="91" fill="#F0F3EE" font-size="32" font-weight="600" letter-spacing="6">WATCHMÉ</text>
    <rect x="793" y="60" width="223" height="40" rx="1" fill="${isFlagship ? "#090A0C" : "#FFFFFF"}" fill-opacity="${isFlagship ? ".8" : ".025"}" stroke="#647277" stroke-opacity=".5"/>
    <text x="905" y="86" fill="${isFlagship ? accent : "#C0CACB"}" font-size="14" text-anchor="middle" letter-spacing="3">${isFlagship ? "BLACK LABEL" : "PRIVATE STUDIO"}</text>
    <path d="M64 124H1016" stroke="url(#edition-rule)"/>
    <text x="66" y="163" fill="${accent}" font-size="12" letter-spacing="3.5">${isFlagship ? "EXPERIMENTAL HOROLOGY" : "YOUR DESIGN. YOUR TIME."}</text>
    ${title.map((line, index) => `<text x="62" y="${219 + index * 55}" fill="#EEF0EB" font-size="${title.length > 1 ? 49 : 62}" font-weight="300" letter-spacing="-1.4"${Array.from(line).length > 22 ? ' textLength="845" lengthAdjust="spacingAndGlyphs"' : ""}>${escapeXml(line)}</text>`).join("")}
    <text transform="translate(86 940) rotate(-90)" fill="#8D9E9F" font-size="11" letter-spacing="4">${escapeXml(design.family.toUpperCase())} / ${escapeXml(mechanical)}</text>
    <text transform="translate(994 397) rotate(90)" fill="#8D9E9F" font-size="11" letter-spacing="3">${faceState} / ${escapeXml(editionSeconds(design))}</text>
  </g>
  ${nestedWatch}
  <g font-family="Arial, Helvetica, sans-serif">
    <path d="M64 1067H1016" stroke="url(#edition-rule)"/>
    ${specs.map((spec, index) => `<text x="${64 + index * 248}" y="1102" fill="#879797" font-size="11" letter-spacing="1.7">${spec.label}</text><text x="${64 + index * 248}" y="1128" fill="#DFE6E3" font-size="17">${escapeXml(spec.value)}</text>${spec.detail ? `<text x="${64 + index * 248}" y="1150" fill="#A2B1AF" font-size="11"${Array.from(spec.detail).length > 32 ? ' textLength="200" lengthAdjust="spacingAndGlyphs"' : ""}>${escapeXml(spec.detail)}</text>` : ""}`).join("")}
    <text x="64" y="1180" fill="#879797" font-size="10" letter-spacing="1.7">FUNCTIONS</text>
    <text x="170" y="1180" fill="#BAC9C5" font-size="12">${escapeXml(editionFunctions(design))}</text>
    <path d="M64 1197H1016" stroke="#A0B4B4" stroke-opacity=".15"/>
    <text x="64" y="1223" fill="#879797" font-size="10" letter-spacing="2.3">DESIGN FINGERPRINT</text>
    <text x="64" y="1249" fill="#C5D2CF" font-family="monospace" font-size="17" letter-spacing="1">${editionFingerprint(design)}</text>
    ${initials ? `<text x="1016" y="1223" fill="#879797" font-size="10" text-anchor="end" letter-spacing="2.3">PERSONAL MARK</text><text x="1016" y="1250" fill="${accent}" font-size="25" text-anchor="end" letter-spacing="5">${escapeXml(initials)}</text>` : `<path d="M968 1221L980 1245L992 1221L1004 1245L1016 1221" fill="none" stroke="${accent}" stroke-width="2"/>`}
    <text x="64" y="1290" fill="#6B7A7B" font-size="10" letter-spacing="2">ORIGINAL WATCHMÉ DESIGN / DIGITAL EDITION</text>
    <text x="1016" y="1290" fill="#6B7A7B" font-size="10" text-anchor="end" letter-spacing="2">1080 × 1350</text>
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
