import type { WatchDesign } from "@/lib/types";

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

const METALS: Record<WatchDesign["metal"], string> = { steel: "Stainless steel", titanium: "Titanium", gold: "Gold tone", rose: "Rose gold tone", graphite: "Graphite", ceramic: "Black ceramic" };
const TEXTURES: Record<WatchDesign["texture"], string> = { grid: "Clous de Paris", horizontal: "Horizontal relief", sunburst: "Sunburst", lacquer: "Lacquer", skeleton: "Open architecture", carbon: "Carbon weave", meteorite: "Meteorite", guilloche: "Guilloché", mechanical: "Mechanical layers" };
const BEZELS = { polished: "Polished", fluted: "Fluted", iced: "Iced", ceramic: "Ceramic" };
const STRAPS = { bracelet: "Metal bracelet", leather: "Leather strap", rubber: "Rubber strap" };

export function editionSpecs(design: WatchDesign): { label: string; value: string }[] {
  return [
    { label: "CASE / FINISH", value: METALS[design.metal] },
    { label: "DIAL", value: TEXTURES[design.texture] },
    { label: "BEZEL", value: BEZELS[design.bezel ?? "polished"] },
    { label: "STRAP", value: STRAPS[design.strap] },
  ];
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
  const isReactor = design.family === "reactor";
  const title = editionTitle(name);
  const initials = editionInitials(design.initials);
  const specs = editionSpecs(design);
  const faceState = eclipse ? "ECLIPSE" : lume ? "LUME" : "DAYLIGHT";
  const mechanical = design.texture === "mechanical" ? "LIVING DIAL" : design.texture.replace(/-/g, " ").toUpperCase();
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
    <rect x="793" y="60" width="223" height="40" rx="1" fill="${isReactor ? "#090A0C" : "#FFFFFF"}" fill-opacity="${isReactor ? ".8" : ".025"}" stroke="#647277" stroke-opacity=".5"/>
    <text x="905" y="86" fill="${isReactor ? accent : "#C0CACB"}" font-size="14" text-anchor="middle" letter-spacing="3">${isReactor ? "BLACK LABEL" : "PRIVATE STUDIO"}</text>
    <path d="M64 124H1016" stroke="url(#edition-rule)"/>
    <text x="66" y="163" fill="${accent}" font-size="12" letter-spacing="3.5">${isReactor ? "EXPERIMENTAL HOROLOGY" : "YOUR DESIGN. YOUR TIME."}</text>
    ${title.map((line, index) => `<text x="62" y="${219 + index * 55}" fill="#EEF0EB" font-size="${title.length > 1 ? 49 : 62}" font-weight="300" letter-spacing="-1.4"${Array.from(line).length > 22 ? ' textLength="845" lengthAdjust="spacingAndGlyphs"' : ""}>${escapeXml(line)}</text>`).join("")}
    <text transform="translate(86 940) rotate(-90)" fill="#8D9E9F" font-size="11" letter-spacing="4">${escapeXml(design.family.toUpperCase())} / ${escapeXml(mechanical)}</text>
    <text transform="translate(994 397) rotate(90)" fill="#8D9E9F" font-size="11" letter-spacing="4">${faceState} / ${design.secondsMotion === "tick" ? "TICK" : "SWEEP"}</text>
  </g>
  ${nestedWatch}
  <g font-family="Arial, Helvetica, sans-serif">
    <path d="M64 1067H1016" stroke="url(#edition-rule)"/>
    ${specs.map((spec, index) => `<text x="${64 + index * 248}" y="1104" fill="#879797" font-size="11" letter-spacing="1.7">${spec.label}</text><text x="${64 + index * 248}" y="1134" fill="#DFE6E3" font-size="17">${escapeXml(spec.value)}</text>`).join("")}
    <path d="M64 1168H1016" stroke="#A0B4B4" stroke-opacity=".15"/>
    <text x="64" y="1205" fill="#879797" font-size="10" letter-spacing="2.3">DESIGN FINGERPRINT</text>
    <text x="64" y="1231" fill="#C5D2CF" font-family="monospace" font-size="17" letter-spacing="1">${editionFingerprint(design)}</text>
    ${initials ? `<text x="1016" y="1205" fill="#879797" font-size="10" text-anchor="end" letter-spacing="2.3">PERSONAL MARK</text><text x="1016" y="1232" fill="${accent}" font-size="25" text-anchor="end" letter-spacing="5">${escapeXml(initials)}</text>` : `<path d="M968 1203L980 1227L992 1203L1004 1227L1016 1203" fill="none" stroke="${accent}" stroke-width="2"/>`}
    <text x="64" y="1286" fill="#6B7A7B" font-size="10" letter-spacing="2">ORIGINAL WATCHMÉ DESIGN / DIGITAL EDITION</text>
    <text x="1016" y="1286" fill="#6B7A7B" font-size="10" text-anchor="end" letter-spacing="2">1080 × 1350</text>
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
