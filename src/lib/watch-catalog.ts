// This module intentionally owns the full workbook payload. Load it dynamically
// when the catalog opens; shared validation and the initial watch do not import it.
import data from "./watch-catalog-data.json";
import { complicationConflict, getComplications, normalizeDesign, secondsConflict, setComplications } from "./presets";
import { getSupplementAction, WATCH_CATALOG_SUPPLEMENT } from "./watch-catalog-supplement";
import type { ActiveComplication, WatchDesign } from "./types";

export interface CatalogEntry {
  id: `catalog-${number}` | `spec-${number}`;
  category: string;
  subcategory: string;
  option: string;
  description: string;
  availability: string;
  notes?: string;
  sourceUrl?: string;
  sourceRow?: number;
  sourceKind?: "workbook" | "supplement";
  sourceLabel?: string;
}
export interface CatalogTerm { term: string; meaning: string; sourceRow: number; }
export interface CatalogSource {
  filename: string; sha256: string; catalogSheet: string; termsSheet: string;
  headerRow: number; firstRow: number; lastRow: number;
  entryCount: number; categoryCount: number; termCount: number;
}
export type CatalogAction =
  | { kind: "appearance"; label: string; patch: Partial<WatchDesign> }
  | { kind: "complication"; label: string; complication: ActiveComplication }
  | { kind: "tool"; label: string; tool: "instruments" | "settings" | "speak" }
  | { kind: "reference"; reason: string };

export const WATCH_CATALOG_WORKBOOK_ENTRIES = data.entries as readonly CatalogEntry[];
export const WATCH_CATALOG_ENTRIES: readonly CatalogEntry[] = [...WATCH_CATALOG_WORKBOOK_ENTRIES, ...WATCH_CATALOG_SUPPLEMENT];
export { WATCH_CATALOG_SUPPLEMENT } from "./watch-catalog-supplement";
export const WATCH_CATALOG_TERMS: readonly CatalogTerm[] = data.terms;
export const WATCH_CATALOG_SOURCE: CatalogSource = data.source;
export const CATALOG_CATEGORIES: readonly string[] = [...new Set(WATCH_CATALOG_ENTRIES.map(entry => entry.category))];

const actions = new Map<string, CatalogAction>();
const key = (category: string, option: string) => `${category}\u0000${option}`;
function appearance(category: string, options: readonly string[], patch: Partial<WatchDesign>, label: string) {
  for (const option of options) actions.set(key(category, option), { kind: "appearance", label, patch });
}
function part<K extends keyof WatchDesign>(category: string, field: K, options: Readonly<Record<string, NonNullable<WatchDesign[K]>>>, label: (value: NonNullable<WatchDesign[K]>) => string) {
  for (const [option, value] of Object.entries(options)) appearance(category, [option], { [field]: value }, label(value as NonNullable<WatchDesign[K]>));
}
function complication(category: string, options: readonly string[], type: ActiveComplication, label: string) {
  for (const option of options) actions.set(key(category, option), { kind: "complication", label, complication: type });
}
function tool(category: string, options: readonly string[], target: "instruments" | "settings" | "speak", label: string) {
  for (const option of options) actions.set(key(category, option), { kind: "tool", label, tool: target });
}
const human = (value: string) => ({ motherofpearl: "mother-of-pearl", fume: "fumé", guilloche: "guilloché", lapis: "lapis lazuli" }[value] ?? value.replaceAll("-", " "));

part("Cases", "caseShape", {
  Round: "round", Square: "square", "Rounded square / TV": "square", Rectangle: "rectangle",
  "Curved rectangle / cintree": "rectangle", "Tonneau / barrel": "tonneau", Cushion: "cushion",
  Oval: "oval", Ellipse: "oval", Octagon: "octagonal", Hexagon: "hexagonal", "Triangle / shield": "shield",
  "Round-in-square": "square", "Round-in-cushion": "cushion",
}, value => `Use ${value} case`);

const materials = "Case materials";
appearance(materials, ["316L stainless steel", "904L stainless steel", "Submarine steel", "Recycled stainless steel", "316LVM stainless steel"], { metal: "steel" }, "Use steel appearance");
appearance(materials, ["Damascus / pattern-welded steel"], { metal: "steel", caseFinish: "damascus" }, "Use Damascus steel appearance");
appearance(materials, ["Grade 2 titanium", "Grade 5 titanium", "Titanium aluminide", "Recrystallized titanium", "Pattern-forged titanium"], { metal: "titanium" }, "Use titanium appearance");
appearance(materials, ["Bronze / CuSn alloy", "Aluminium bronze / CuAl alloy", "Bronze Gold / gold-rich bronze alloy"], { metal: "bronze" }, "Use bronze appearance");
appearance(materials, ["Sterling silver / 925"], { metal: "silver" }, "Use silver appearance");
appearance(materials, ["Yellow gold", "9K gold", "10K gold", "14K gold", "18K gold", "Proprietary pale-yellow gold alloy"], { metal: "gold" }, "Use yellow-gold appearance");
appearance(materials, ["Rose / pink / red gold", "Proprietary rose/red-gold alloy"], { metal: "rose" }, "Use rose-gold appearance");
appearance(materials, ["White gold", "Proprietary white-gold alloy"], { metal: "whitegold" }, "Use white-gold appearance");
appearance(materials, ["Platinum / 950"], { metal: "platinum" }, "Use platinum appearance");
appearance(materials, ["Zirconia high-tech ceramic", "Colored ceramic", "Plasma high-tech ceramic", "Alumina-based ATZ ceramic", "Ceramic-polymer composite / Bioceramic"], { metal: "ceramic" }, "Use ceramic appearance");
appearance(materials, ["Clear synthetic sapphire", "Colored synthetic sapphire", "SAXEM crystal composite"], { metal: "sapphire" }, "Use sapphire case appearance");
appearance(materials, ["Woven carbon-fiber composite", "Forged / chopped carbon composite", "Layered carbon composite", "Graphene-reinforced carbon composite", "Carbon-fiber-reinforced resin"], { metal: "carbon" }, "Use carbon case appearance");

const exterior = "Exterior finish";
appearance(exterior, ["High polish / mirror polish", "Polished chamfers / bevels", "Polished ceramic"], { caseFinish: "polished" }, "Use polished case finish");
appearance(exterior, ["Satin / brushed", "Longitudinal brushing", "Circular brushing", "Radial brushing / sunburst", "Mixed polished-and-brushed"], { caseFinish: "brushed" }, "Use brushed case finish");
appearance(exterior, ["Bead-blasted", "Sandblasted / microblasted", "Matte / satin ceramic", "Stonewashed / tumbled"], { caseFinish: "blasted" }, "Use blasted case appearance");
appearance(exterior, ["Hammered", "Micro-hammered / frosted gold"], { caseFinish: "hammered" }, "Use hammered case appearance");
appearance(exterior, ["Pattern-etched Damascus"], { caseFinish: "damascus" }, "Use Damascus case pattern");
appearance(exterior, ["Reeding / fluting"], { bezel: "fluted" }, "Use fluted bezel");
appearance(exterior, ["DLC coating"], { metal: "graphite" }, "Use dark graphite appearance");
appearance(exterior, ["Electroplated gold", "Vermeil", "Gold-filled / rolled-gold exterior"], { metal: "gold" }, "Use gold-tone appearance");
appearance(exterior, ["Rhodium plating"], { metal: "silver" }, "Use silver-tone appearance");

part("Crystals", "crystalStyle", {
  Flat: "clear", "Single-domed": "domed", "Double-domed / double-curved": "domed",
  "Box / top-hat crystal": "domed", "Bubble / very high dome": "domed", "Faceted crystal": "faceted", "Tinted / smoked cover": "smoked",
}, value => `Use ${value} crystal appearance`);
part("Bezels", "bezel", {
  Smooth: "polished", "Domed / rounded": "polished", "Flat / sloped": "polished", Fluted: "fluted",
  "Coin-edge": "coined", Scalloped: "scalloped", "Exposed screws": "screws", "Gem-set bezel": "iced",
  "Ceramic insert / bezel": "ceramic", "Metal insert or solid metal bezel": "polished",
}, value => `Use ${value === "iced" ? "gem-set" : human(value)} bezel appearance`);

part("Hands", "hands", {
  "Baton or stick": "baton", Pencil: "baton", Sword: "sword", Dauphine: "dauphine", "Leaf or feuille": "leaf",
  "Breguet or pomme": "breguet", Syringe: "syringe", Cathedral: "cathedral", Arrow: "arrow", "Broad arrow": "arrow",
  "Mercedes-style": "mercedes", "Snowflake-style": "snowflake", Lollipop: "lollipop", "Skeletonized hands": "skeleton",
}, value => `Use ${value} hands`);
part("Hour markers and numerals", "markers", {
  "Baton indices": "baton", "Rectangular indices": "baton", "Round dot indices": "dots", "Triangle indices": "triangles",
  "Diamond or lozenge indices": "diamonds", "Arrowhead indices": "triangles", "No hour markers": "none",
  "Arabic numerals 1-12": "arabic", "Roman numerals": "roman", "Breguet-style Arabic numerals": "breguet",
  "Explorer-style 3-6-9": "explorer", "Mixed Roman and Arabic California dial": "california", "Cardinal markers only": "minimal",
}, value => `Use ${value === "none" ? "no hour" : value} markers`);

const dial = "Dial";
part(dial, "texture", {
  "Carbon-fiber dial": "carbon", "Forged-carbon dial": "carbon", "Meteorite dial": "meteorite",
  "Aventurine glass dial": "aventurine", "Natural aventurine quartz dial": "aventurine",
  "Mother-of-pearl dial": "motherofpearl", "Malachite dial": "malachite", "Lapis lazuli dial": "lapis",
  "Marble dial": "marble", "Linen texture": "linen", Honeycomb: "honeycomb", "Wave pattern": "wave",
  "Fume or degradé": "fume", "Ombre or directional gradient": "fume", "Enamel on metal": "enamel", "Porcelain dial": "enamel",
  "Grand feu enamel": "enamel", "Lacquered dial": "lacquer", "Urushi-lacquer dial": "lacquer", Gloss: "lacquer",
  "Sunburst brushing": "sunburst", "Straight brushing": "horizontal", "Horizontal grooves": "horizontal",
  "Hobnail or clous de Paris": "grid", "Tapisserie or waffle": "grid", "Geometric tessellation": "prismatic",
  "Faceted dial architecture": "prismatic", "Iridescent or interference color": "prismatic", "Hand-cut guilloche": "guilloche",
  "Barleycorn guilloche": "guilloche", Flinque: "guilloche", "Concentric snailed registers": "guilloche",
  "Vinyl-record-like concentric grooves": "guilloche", Sandblasted: "sand", Grained: "sand", Frosted: "sand",
  "Skeleton or openworked face": "skeleton", "Dial-free construction": "skeleton", "Skeleton engraving": "mechanical",
}, value => `Use ${human(value)} dial appearance`);

const colors: Readonly<Record<string, string>> = {
  Black: "#101216", White: "#ECEDEA", "Ivory or cream": "#E6DBBF", "Ivory / cream": "#E6DBBF",
  "Silver-tone": "#BAC5CB", "Gray or anthracite": "#515B64", "Gray / charcoal": "#515B64", "Gunmetal / anthracite": "#303E48",
  Champagne: "#CAB17E", "Gold-tone": "#D9B76E", "Gold-tone / champagne": "#D9B76E",
  "Rose-gold or copper-tone": "#B77D6D", "Rose-gold-tone / copper-tone": "#B77D6D", Salmon: "#D89180", "Pink / salmon": "#D89180",
  "Brown or chocolate": "#52372C", "Bronze-tone / brown": "#795233", "Tan / cognac / camel": "#A87548", "Beige / sand / taupe": "#BAA887",
  Burgundy: "#5B142C", Red: "#A9273D", "Red / burgundy / oxblood": "#7D1830", Orange: "#D96726", "Orange / coral": "#D96726",
  Yellow: "#D8B938", "Yellow / lemon": "#D8B938", Green: "#165D46", "Green / olive / forest / mint": "#165D46",
  Blue: "#174A78", "Blue / navy / ice blue": "#174A78", Teal: "#126976", "Teal / turquoise / petrol": "#126976",
  Purple: "#63397D", "Purple / violet / plum": "#63397D", Pink: "#C47E9B",
};
for (const [name, color] of Object.entries(colors)) {
  appearance(dial, [name], { dialColor: color }, "Use this dial color");
  appearance("Colors and patterns", [name], { dialColor: color }, "Use this dial color");
}
appearance("Colors and patterns", ["Gradient / ombré", "Fumé edge-darkening"], { texture: "fume" }, "Use fumé dial gradient");
appearance("Colors and patterns", ["Marbled / swirled"], { texture: "marble" }, "Use marble dial pattern");
appearance("Colors and patterns", ["Iridescent / color-shifting", "Rainbow / multicolor"], { texture: "prismatic" }, "Use iridescent faceted dial");

const straps = "Bands and straps";
appearance(straps, ["Calfskin", "Cowhide", "Buffalo", "Goatskin", "Horsehide", "Shell cordovan", "Pigskin", "Lambskin / sheepskin", "Full-grain", "Top-grain", "Corrected-grain", "PU faux leather", "Plant-content leather alternative", "Recycled-polymer leather alternative"], { strap: "leather" }, "Use leather-look strap");
appearance(straps, ["Alligator", "Crocodile", "Embossed alligator-look"], { strap: "alligator" }, "Use alligator-pattern strap");
appearance(straps, ["Natural rubber", "Vulcanized rubber", "FKM fluoroelastomer", "Silicone", "Polyurethane / PU", "Thermoplastic polyurethane / TPU", "Resin", "Fluorosilicone", "Recycled rubber blend", "Cut-to-size rubber", "Accordion / wave dive", "Tropic-style"], { strap: "rubber" }, "Use rubber-look strap");
appearance(straps, ["Nylon", "Ballistic nylon", "Seatbelt-weave nylon", "Polyester", "NATO / G10-style", "Zulu-style", "Single-pass"], { strap: "nato" }, "Use NATO-style woven strap");
appearance(straps, ["Sailcloth", "Cotton canvas", "Waxed canvas", "Cordura-branded fabric", "Ripstop", "Kevlar-branded aramid fabric", "Recycled textile", "Textile over rubber"], { strap: "sailcloth" }, "Use sailcloth-pattern strap");
appearance(straps, ["Braided textile", "Braided leather", "Paracord", "Perlon"], { strap: "braided" }, "Use braided strap appearance");
appearance(straps, ["Rally / racing", "Perforated", "Perforated rubber"], { strap: "rally" }, "Use perforated rally strap");
appearance(straps, ["Mesh loop"], { strap: "mesh" }, "Use mesh band");
const bracelets = "Bracelets";
appearance(bracelets, ["Three-link Oyster-style", "Three-link President-style", "Flat-link", "Rounded-link"], { strap: "bracelet", braceletStyle: "three-link" }, "Use three-link bracelet appearance");
appearance(bracelets, ["Five-link Jubilee-style"], { strap: "bracelet", braceletStyle: "five-link" }, "Use five-link bracelet appearance");
appearance(bracelets, ["Beads of rice"], { strap: "bracelet", braceletStyle: "beads-of-rice" }, "Use beads-of-rice bracelet");
appearance(bracelets, ["Engineer", "H-link", "Brick / ladder"], { strap: "bracelet", braceletStyle: "engineer" }, "Use engineer bracelet appearance");
appearance(bracelets, ["Milanese fine mesh", "Shark / heavy mesh"], { strap: "mesh" }, "Use mesh bracelet appearance");

part("Chapter rings and scales", "chapterRing", {
  "Minute hash track": "minute", "Seconds hash track": "minute", "Railroad or chemin-de-fer track": "railroad",
  "Dot minute track": "dots", "Unmarked perimeter": "none", "Tachymeter scale": "tachymeter",
}, value => value === "none" ? "Use unmarked chapter ring" : `Use ${value} chapter ring`);
appearance("Bezels", ["Tachymeter scale"], { chapterRing: "tachymeter" }, "Use dial tachymeter scale");

const light = "Illumination and night legibility";
appearance(light, ["No luminous treatment"], { lumeStyle: "none" }, "Remove luminous treatment");
appearance(light, ["Photoluminescent afterglow pigment", "Luminous applied markers", "Luminous printed numerals", "Luminous sandwich dial", "Solid molded lume markers"], { lumeStyle: "standard" }, "Use luminous hands and markers");
appearance(light, ["Luminous hand fill"], { lumeStyle: "hands-only" }, "Use luminous hands only");
appearance(light, ["Full luminous dial", "Electroluminescent dial/backlight", "INDIGLO night-light"], { lumeStyle: "full-dial" }, "Use full-dial glow appearance");
part(light, "lumeColor", {
  "Green emission": "#9FFFD0", "Blue emission": "#84EAFF", "Orange/red luminous emission": "#FFAA73",
  "Vintage-colored modern lume": "#ECD5A5", "Violet luminous emission": "#BA9AFF", "White luminous emission": "#F2F4F1",
  "Pink luminous emission": "#F59BE1", "Yellow luminous emission": "#FFF09A", "Ultramarine-blue luminous emission": "#829FFF",
}, () => "Use this lume color");

const functions = "Functions and complications";
actions.set(key(functions, "Hours and minutes"), { kind: "reference", reason: "Hours and minutes are already included in every watch." });
appearance(functions, ["Running seconds"], { secondsIndication: "running" }, "Show running seconds");
complication(functions, ["Date", "Big/outsize date", "Quick-set date", "Electronic automatic calendar", "Instantaneous calendar change"], "date", "Add live date display");
complication(functions, ["Day-date", "Quick-set day"], "daydate", "Add live day/date display");
complication(functions, ["Complete/triple calendar", "Month indication", "Year indication", "Four-digit year indication", "Week number", "ISO week calendar"], "calendar", "Add digital calendar display");
complication(functions, ["Dual time", "Caller GMT", "Traveler GMT", "Half-hour/quarter-hour zone adjustment", "Universal/UTC reference"], "gmt", "Add GMT display");
complication(functions, ["Day/night indication", "AM/PM indication", "Home-time AM/PM or day/night"], "daynight", "Add primary-zone day/night display");
complication(functions, ["Moon phase", "High-precision moon phase"], "moonphase", "Add calculated moon phase");
complication(functions, ["Chronograph", "Two-pusher chronograph", "Monopusher chronograph", "Elapsed-hour counter", "Central elapsed-minute chronograph"], "chronograph", "Add chronograph display");
appearance(functions, ["Deadbeat/jumping running seconds"], { secondsMotion: "tick" }, "Use ticking seconds hand");
tool(functions, ["Digital stopwatch", "Lap timing and lap memory", "Countdown timer", "Programmable mechanical countdown"], "instruments", "Open stopwatch and countdown");
tool(functions, ["World time", "World time with daylight-saving indication", "Local and home date indications"], "settings", "Choose primary and secondary time zones");
complication(dial, ["Date-window layout"], "date", "Add live date display");
complication(dial, ["Day-date layout"], "daydate", "Add live day/date display");
complication(dial, ["Regulator dial"], "regulator", "Add regulator display");
appearance(dial, ["Central two-hand", "No-seconds layout"], { secondsIndication: "none" }, "Hide running seconds");
appearance(dial, ["Central three-hand"], { secondsIndication: "running", secondsPlacement: "central" }, "Use central running seconds");
appearance(dial, ["Small seconds"], { secondsPlacement: "small" }, "Use small seconds display");
appearance("Hands", ["Central running-seconds hand"], { secondsIndication: "running", secondsPlacement: "central" }, "Use central running seconds");
appearance("Hands", ["Subsidiary-seconds hand"], { secondsPlacement: "small" }, "Use small seconds display");
complication(dial, ["Two-register chronograph layout", "Three-register chronograph layout"], "chronograph", "Add adaptive chronograph layout");
complication("Pushers / exterior controls", ["Two-pusher chronograph layout", "Monopusher layout", "Crown-integrated pusher"], "chronograph", "Add standard chronograph controls");
complication("Electronic and connected functions", ["Weather forecast", "Thermometer"], "weather", "Add location weather display");
tool("Electronic and connected functions", ["Automatic daylight-saving adjustment", "Automatic timezone adjustment", "World-time city database"], "settings", "Open time-zone settings");
tool("Accessibility and alternative readouts", ["Talking watch/spoken time"], "speak", "Speak the current time");

const style = "Watch styles";
appearance(style, ["Dress"], { caseShape: "round", metal: "rose", texture: "lacquer", hands: "dauphine", markers: "roman", strap: "leather" }, "Apply dress-watch styling");
appearance(style, ["Everyday / casual", "Sports"], { metal: "steel", texture: "sunburst", hands: "baton", markers: "baton", strap: "bracelet" }, "Apply steel sport styling");
appearance(style, ["Dive"], { caseShape: "cushion", metal: "titanium", dialColor: "#063D50", texture: "wave", hands: "sword", markers: "dots", strap: "rubber", bezel: "ceramic" }, "Apply dive-watch styling");
appearance(style, ["Pilot / aviation"], { dialColor: "#171D21", texture: "sand", hands: "sword", markers: "arabic", strap: "leather", chapterRing: "minute" }, "Apply pilot styling");
appearance(style, ["Field / military", "Outdoor / expedition", "Tactical"], { metal: "titanium", dialColor: "#364136", texture: "sand", markers: "arabic", strap: "nato", caseFinish: "blasted" }, "Apply field-watch styling");
appearance(style, ["Racing / motorsport"], { metal: "graphite", texture: "carbon", accentColor: "#FF783B", strap: "rally", chapterRing: "tachymeter" }, "Apply motorsport styling");
complication(style, ["Travel / GMT"], "gmt", "Add GMT display");
appearance(style, ["Marine / deck"], { dialColor: "#E9E2D0", texture: "enamel", hands: "breguet", markers: "roman", strap: "leather" }, "Apply marine styling");
appearance(style, ["Tool / instrument"], { dialColor: "#171C20", hands: "syringe", markers: "arabic", strap: "rubber", caseFinish: "blasted" }, "Apply instrument styling");
appearance(style, ["Minimalist", "Bauhaus-inspired"], { dialColor: "#E8E8E1", texture: "enamel", hands: "baton", markers: "minimal", strap: "leather", chapterRing: "none" }, "Apply minimal styling");
appearance(style, ["Art Deco"], { caseShape: "rectangle", metal: "gold", texture: "guilloche", hands: "breguet", markers: "roman", strap: "alligator" }, "Apply Art Deco styling");
appearance(style, ["Vintage-inspired"], { dialColor: "#DCCBA6", metal: "bronze", hands: "cathedral", markers: "breguet", strap: "leather", crystalStyle: "domed" }, "Apply vintage styling");
appearance(style, ["Retro-futurist"], { caseShape: "square", metal: "steel", texture: "prismatic", hands: "skeleton", strap: "mesh" }, "Apply retro-futurist styling");
appearance(style, ["Integrated-bracelet sports"], { caseShape: "octagonal", metal: "steel", texture: "grid", strap: "bracelet", braceletStyle: "three-link" }, "Apply bracelet-sport styling");
appearance(style, ["Jewelry / gem-set"], { metal: "platinum", bezel: "iced", markers: "diamonds" }, "Apply gem-set styling");
appearance(style, ["Skeleton / architectural"], { texture: "mechanical", hands: "skeleton" }, "Apply open-mechanics styling");
appearance(style, ["Artisan / métiers d'art"], { texture: "guilloche", hands: "breguet", markers: "roman" }, "Apply guilloché styling");

const referenceReasons: Readonly<Record<string, string>> = {
  "Case materials": "A physical material or alloy specification. Save it as a reference for your design.",
  "Exterior finish": "This physical treatment is not rendered by the current case finishes.",
  Crystals: "A physical crystal specification. The app offers clear, domed, smoked and faceted appearances.",
  Crowns: "A physical crown construction or position. It does not change this app's controls.",
  "Pushers / exterior controls": "A physical control specification. The app uses its supported chronograph controls.",
  "Lugs / case-to-band interface": "A physical attachment specification that requires compatible manufactured parts.",
  Casebacks: "A caseback construction reference; the current watch view shows the dial side.",
  "Exterior design parameters": "A physical measurement or fit specification, rather than an on-screen watch dimension.",
  "Exterior gemstones": "A stone, sourcing or setting specification. The app's gem effects are visual representations.",
  "Face and display": "This display architecture needs a dedicated implementation beyond the current analog watch renderer.",
  "Closures and attachments": "A physical clasp or attachment reference; it is not visible in the current dial view.",
  "Performance and specifications": "A tested physical-watch capability. An on-screen design cannot establish this specification.",
  "Movement and power": "A physical movement or power-system specification. The app keeps time from device timestamps.",
  "Movement architecture": "A mechanical construction reference. Decorative motion does not reproduce its physical operation.",
  "Functions and complications": "This function is not implemented. Save it as a reference without adding a simulated reading.",
  "Illumination and night legibility": "A light-source technology or treatment specification. The app renders selectable glow appearances.",
  "Electronic and connected functions": "This connected or sensor feature is not provided by the app. It remains a design reference.",
  "Quality and certification": "A certification for tested physical products. It cannot be applied to a digital watch design.",
  "Accessibility and alternative readouts": "This readout requires dedicated tactile or haptic hardware that the app does not provide.",
};

export function getCatalogAction(entry: CatalogEntry): CatalogAction {
  return getSupplementAction(entry) ?? actions.get(key(entry.category, entry.option)) ?? {
    kind: "reference",
    reason: referenceReasons[entry.category] ?? "This option is available as a design reference; its exact construction or appearance is not implemented.",
  };
}

export function applyCatalogOption(design: WatchDesign, entry: CatalogEntry): { design?: WatchDesign; error?: string } {
  const action = getCatalogAction(entry);
  if (action.kind === "reference") return { error: action.reason };
  if (action.kind === "tool") return { error: `Use “${action.label}” to open this tool.` };
  if (action.kind === "complication") {
    const error = complicationConflict(design, action.complication);
    if (error) return { error };
    return { design: setComplications(design, [...getComplications(design), action.complication]) };
  }
  const proposed = { ...design, ...action.patch };
  const secondsError = secondsConflict(proposed);
  if (secondsError) return { error: secondsError };
  const next = normalizeDesign(proposed);
  const retained = getComplications(next);
  const removed = getComplications(design).filter(type => !retained.includes(type));
  if (removed.length) return { error: `This case does not fit ${removed.join(" and ")}. Remove that function before changing the case.` };
  return { design: next };
}
