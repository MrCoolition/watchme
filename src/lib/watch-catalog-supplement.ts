import type { CatalogAction, CatalogEntry } from "./watch-catalog";
import type { WatchDesign } from "./types";

/** User-supplied additions, kept separate from the exact imported workbook. Append new records; do not reorder stable IDs. */
export const WATCH_CATALOG_SUPPLEMENT_SOURCE = "User-supplied specifications";
export const WATCH_CATALOG_PRIMARY_SOURCES = {
  bulova: "https://de.bulova.com/media/download/BULOVA_Precisionist_ShortGuide_EN.pdf",
  springDrive: "https://www.grand-seiko.com/uk-en/collections/movement/springdrive",
  jumpingSeconds: "https://www.alange-soehne.com/mo-en/timepieces/richard-lange/richard-lange-jumping-seconds",
  ringCommand: "https://www.rolex.com/en-us/watchmaking/features/bezels/ring-command",
} as const;

const entries: CatalogEntry[] = [];
const actions = new Map<string, CatalogAction>();
type Definition = readonly [option: string, description: string];
function add(category: string, subcategory: string, option: string, description: string, action?: CatalogAction, sourceUrl?: string, notes?: string) {
  const id = `spec-${entries.length + 1}` as const;
  entries.push({ id, category, subcategory, option, description, availability: "Specification", sourceKind: "supplement", sourceLabel: WATCH_CATALOG_SUPPLEMENT_SOURCE, ...(sourceUrl ? { sourceUrl } : {}), ...(notes ? { notes } : {}) });
  if (action) actions.set(id, action);
}
function bezel(subcategory: string, definitions: readonly Definition[]) {
  for (const [option, description] of definitions) add("Bezel specifications", subcategory, option, description);
}
const appearance = (label: string, patch: Partial<WatchDesign>): CatalogAction => ({ kind: "appearance", label, patch });
const reference = (reason: string): CatalogAction => ({ kind: "reference", reason });
function seconds(subcategory: string, option: string, description: string, action?: CatalogAction, sourceUrl?: string, notes?: string) {
  add("Seconds indication and motion", subcategory, option, description, action, sourceUrl, notes);
}

bezel("Location", [
  ["External", "The bezel sits outside the crystal."],
  ["Internal beneath crystal", "The bezel or rotating scale sits beneath the crystal."],
  ["Nested / double bezel", "Two nested bezel elements provide separate surfaces or functions."],
]);
bezel("Operation", [
  ["Fixed", "The bezel does not rotate."],
  ["Unidirectional", "The bezel rotates in one direction."],
  ["Bidirectional", "The bezel rotates in both directions."],
  ["Friction / smooth rotation", "The bezel rotates smoothly without indexed click stops."],
  ["Indexed clicks", "The bezel advances through defined detent positions."],
  ["Locking", "A locking mechanism secures the selected bezel position."],
]);
bezel("Indexing", [
  ["24 clicks", "Twenty-four indexed positions per full bezel revolution."],
  ["60 clicks", "Sixty indexed positions per full bezel revolution."],
  ["120 clicks", "One hundred and twenty indexed positions per full bezel revolution."],
  ["Other movement-specific indexing", "The number or arrangement of positions follows the selected mechanism."],
]);
bezel("Control", [
  ["Direct hand", "The wearer turns the bezel directly by hand."],
  ["Internal crown", "A separate crown operates the internal bezel."],
]);
add("Bezel specifications", "Control", "Bezel function selection", "Turning the bezel selects a function to adjust; the exact controls depend on the movement.", undefined, WATCH_CATALOG_PRIMARY_SOURCES.ringCommand, "Rolex Ring Command is a documented example of bezel and crown function selection, not a capability of this digital design.");
bezel("Profile", [
  ["Flat", "A flat upper bezel surface."], ["Sloped", "An angled surface slopes toward the dial or case edge."],
  ["Domed", "A convex, rounded bezel surface."], ["Stepped", "The bezel has multiple raised levels."],
  ["Raised protective rim", "A raised bezel rim surrounds the crystal."], ["Narrow", "A slim bezel leaves a larger visible dial aperture."],
  ["Wide", "A broad bezel gives the surrounding ring more visual weight."], ["Nearly bezel-free", "The visible bezel is reduced to a minimal border."],
]);
bezel("Shape", [
  ["Round", "A circular bezel outline."], ["Polygonal", "A bezel outline with multiple straight sides."],
  ["Case-following", "The bezel follows the selected case silhouette."],
]);
bezel("Grip", [
  ["Smooth", "A smooth bezel perimeter."], ["Coin-edge", "Fine edge grooves provide a coin-edge appearance and grip."],
  ["Knurled", "A repeated cross-cut or textured grip surface."], ["Scalloped", "A perimeter with curved recesses."],
  ["Toothed", "Projecting teeth form the perimeter grip."], ["Notched", "Spaced notches provide purchase around the bezel."],
]);
bezel("Decoration", [
  ["Fluted", "Repeated flutes form a reflective decorative ring."], ["Brushed", "Directional surface brushing gives a satin appearance."],
  ["Polished", "A reflective polished bezel surface."], ["Blasted", "A fine matte surface produced by blasting in a physical watch."],
  ["Engraved", "Cut or engraved decorative detail."], ["Engine-turned", "Repeated decorative patterns cut by an engine-turning process."],
  ["Exposed screws", "Visible screws form part of the bezel design."], ["Gem-set", "Decorative stones are set into the bezel."],
]);
bezel("Construction", [
  ["Solid", "A solid bezel rather than a separate visible insert."], ["Replaceable insert", "The visible insert is a separate replaceable part."],
  ["Captive / retained", "A retaining construction secures the bezel to the case."], ["Sapphire-covered insert", "A sapphire cover protects the insert beneath it."],
]);
bezel("Material", [
  ["Steel", "Steel bezel material specification."], ["Titanium", "Titanium bezel material specification."],
  ["Precious metals", "A specified precious-metal alloy for the bezel."], ["Bronze", "Bronze bezel material specification."],
  ["Aluminum", "Aluminum bezel or insert specification."], ["Ceramic", "Ceramic bezel or insert specification."],
  ["Sapphire", "Sapphire bezel or insert specification."], ["Glass", "Glass bezel insert specification."],
  ["Carbon composite", "Carbon-composite bezel material specification."], ["Resin", "Resin bezel material specification."],
  ["Rubber", "Rubber bezel or protective bezel covering."],
]);
bezel("Markings", [
  ["Printed", "Printed bezel markings."], ["Engraved", "Engraved bezel markings."], ["Embossed", "Raised bezel markings."],
  ["Paint-filled", "Recessed markings filled with paint."], ["Metal-filled", "Recessed markings filled with metal."],
  ["Luminous", "Markings include luminous material."], ["Unmarked", "The bezel carries no scale or markings."],
]);
bezel("Colors", [
  ["Solid", "One main bezel color."], ["Two-color", "Two distinct bezel color regions."], ["Multicolor", "More than two bezel colors."],
  ["Gradient", "A gradual change between bezel colors."], ["Contrasting numerals", "Numerals contrast with the bezel surface."],
  ["Matching dial", "The bezel color coordinates with the dial."], ["Contrasting dial", "The bezel color contrasts with the dial."],
]);
bezel("Gems", [
  ["Accent stones", "A small number of stones provide accents."], ["Continuous ring", "Stones form a continuous ring around the bezel."],
  ["Pavé", "Closely set small stones cover the bezel surface."], ["Baguettes", "Elongated rectangular stones form the setting."],
  ["Matched color", "Stones are selected for a coordinated color."], ["Rainbow gradient", "Stones form a gradual spectrum of colors."],
]);
bezel("Scales and functions", [
  ["Elapsed-time", "Shows time elapsed since an aligned starting point."],
  ["Countdown", "Shows time remaining to an aligned target."],
  ["12-hour", "References a second time zone using an ordinary 12-hour hand."],
  ["24-hour / GMT", "References a time zone using a 24-hour hand."],
  ["World-time / city", "Provides city or time-zone reference markings."],
  ["Tachymeter", "Relates elapsed time over a known distance to average speed."],
  ["Telemeter", "Relates the delay between seeing and hearing an event to approximate distance."],
  ["Pulsometer", "Relates the elapsed time for a prescribed pulse count to a pulse rate."],
  ["Respiration", "Relates the elapsed time for a prescribed breath count to a breathing rate."],
  ["Decimal timing", "Expresses a timing interval using decimal subdivisions."],
  ["Compass", "Provides directional reference markings; orientation requires an appropriate method."],
  ["Slide rule", "Uses logarithmic scales for multiplication, division, conversions and aviation calculations."],
]);
add("Bezel specifications", "Scales and functions", "Control bezel", "Selects a setting function through the bezel rather than serving only as a timing scale.", undefined, WATCH_CATALOG_PRIMARY_SOURCES.ringCommand);

seconds("Indication", "Running seconds", "Indicates the seconds of the current time.", appearance("Show running seconds", { secondsIndication: "running" }));
seconds("Indication", "Chronograph seconds", "Indicates stopwatch elapsed seconds and advances only while the stopwatch runs.", appearance("Use chronograph seconds", { secondsIndication: "chronograph" }));
seconds("Indication", "No seconds / two hands", "Omits the running-seconds indicator while retaining hours and minutes.", appearance("Hide running seconds", { secondsIndication: "none" }));
const visualMotion = "A software animation choice; it does not specify or emulate a physical oscillator or escapement.";
seconds("Motion", "One-second ticking", "The second hand advances once each second.", appearance("Use one-second ticking", { secondsMotion: "tick" }), undefined, visualMotion);
seconds("Motion", "Mechanical deadbeat / jumping seconds", "A mechanical jumping-seconds mechanism can make one visible advance per second.", appearance("Use one-second ticking appearance", { secondsMotion: "tick" }), WATCH_CATALOG_PRIMARY_SOURCES.jumpingSeconds, visualMotion);
seconds("Motion", "Multistep quartz", "Multiple visible hand advances per second can create a stepped sweep.", appearance("Use 4 advances per second", { secondsMotion: "stepped", secondsAdvances: 4 }), undefined, visualMotion);
seconds("Motion", "Conventional mechanical", "A conventional mechanical watch can show several visible advances each second; the rate depends on its movement.", appearance("Use 6 advances per second", { secondsMotion: "stepped", secondsAdvances: 6 }), undefined, visualMotion);
seconds("Motion", "High-beat mechanical", "A higher nominal mechanical beat rate produces more visible hand advances per second.", appearance("Use 10 advances per second", { secondsMotion: "stepped", secondsAdvances: 10 }), undefined, visualMotion);
seconds("Motion", "Continuous glide", "The hand appears to move continuously rather than in discrete visible steps.", appearance("Use continuous software glide", { secondsMotion: "sweep" }), WATCH_CATALOG_PRIMARY_SOURCES.springDrive, visualMotion);
seconds("Motion", "Retrograde", "The seconds indicator travels through an arc and snaps back. The return interval depends on the design.", reference("Retrograde travel and snapback are a design reference; this renderer uses circular seconds paths."));
seconds("Motion", "Sequential / relay retrograde", "Multiple hands take successive portions of a minute before returning.", reference("Sequential hand relays are not implemented; save this display architecture as a reference."));
seconds("Motion", "Foudroyante / flying seconds", "A fast subsidiary seconds indicator completes rapid revolutions, often one per second.", reference("A flying-seconds display is not implemented; the app does not substitute a fake rapid measurement."));
seconds("Motion", "Screen-animated seconds", "A digital renderer can animate tick, stepped or glide motion independently of movement type.", appearance("Use continuous software glide", { secondsMotion: "sweep" }), undefined, visualMotion);
seconds("Advances per second", "4 advances per second", "Four rendered hand positions each second.", appearance("Use 4 advances per second", { secondsMotion: "stepped", secondsAdvances: 4 }), undefined, visualMotion);
for (const [vph, advances] of [[18000, 5], [21600, 6], [28800, 8], [36000, 10]] as const) {
  seconds("Advances per second", `${vph.toLocaleString("en-US")} vph / ${advances} advances per second`, `A nominal ${vph.toLocaleString("en-US")} vibrations per hour corresponds to ${advances} beats per second. The app renders ${advances} hand advances each second.`, appearance(`Use ${advances} advances per second`, { secondsMotion: "stepped", secondsAdvances: advances }), undefined, visualMotion);
}
seconds("Advances per second", "Precisionist / 16 advances per second", "Bulova's Precisionist guide describes 16 second-hand advances per second. This is distinct from the quartz oscillator frequency.", appearance("Use 16 advances per second", { secondsMotion: "stepped", secondsAdvances: 16 }), WATCH_CATALOG_PRIMARY_SOURCES.bulova, visualMotion);
seconds("Placement", "Central", "The seconds hand shares the main central axis.", appearance("Use central seconds", { secondsPlacement: "central" }));
seconds("Placement", "Small seconds", "Seconds are shown on a subsidiary dial.", appearance("Use small seconds display", { secondsPlacement: "small" }));
seconds("Placement", "Off-center", "The seconds display uses an axis away from the main center.", appearance("Use off-center seconds", { secondsPlacement: "off-center" }));
seconds("Placement", "Peripheral", "Seconds are indicated around the dial perimeter.", appearance("Use peripheral seconds", { secondsPlacement: "peripheral" }));
seconds("Setting behavior", "Hacking / stop seconds", "The seconds mechanism stops during time setting.", reference("A physical setting specification. The app continues to derive accurate current time from the device clock."));
seconds("Setting behavior", "Non-hacking", "The seconds mechanism continues to run while the time is set.", reference("A physical setting specification; the app does not simulate mechanical hand setting."));
seconds("Setting behavior", "Zero-reset", "The seconds indication returns to zero when a setting control is engaged.", reference("A physical setting specification. It does not reset the app's current-time clock."), WATCH_CATALOG_PRIMARY_SOURCES.jumpingSeconds);
seconds("Chronograph behavior", "Ordinary start / stop / reset", "The stopwatch starts, stops and returns its elapsed-time indication to zero.", { kind: "tool", label: "Open stopwatch controls", tool: "instruments" });
seconds("Chronograph behavior", "Flyback", "A running chronograph resets and immediately restarts in one operation.", reference("Flyback reset-and-restart is not implemented. Save it as a chronograph specification."));
seconds("Chronograph behavior", "Split-seconds", "Overlapping elapsed-time hands let one pause for an intermediate reading and then catch up.", reference("Split-seconds hands are not implemented. Ordinary recorded laps remain available in the stopwatch."));
seconds("Other behavior", "Low-battery jumps", "A physical watch may use unusual second-hand jumps as a low-energy signal.", reference("A hardware battery-warning behavior. No simulated battery reading is added to this watch."));
seconds("Other behavior", "Display clearing", "A hand moves temporarily away from a readout to improve visibility.", reference("Automatic hand displacement for display clearing is not implemented."));

// Only implemented appearances and tools receive actions. Other bezel attributes
// remain separately selectable references rather than silently changing the case.
const bezelPatches: Readonly<Record<string, Partial<WatchDesign>>> = {
  "Grip/Smooth": { bezel: "polished" }, "Grip/Coin-edge": { bezel: "coined" }, "Grip/Scalloped": { bezel: "scalloped" },
  "Decoration/Fluted": { bezel: "fluted" }, "Decoration/Polished": { bezel: "polished" },
  "Decoration/Exposed screws": { bezel: "screws" }, "Decoration/Gem-set": { bezel: "iced" },
  "Material/Ceramic": { bezel: "ceramic" }, "Scales and functions/Tachymeter": { chapterRing: "tachymeter" },
};
for (const entry of entries) {
  if (entry.category !== "Bezel specifications") continue;
  const option = `${entry.subcategory}/${entry.option}`;
  const patch = bezelPatches[option];
  if (patch) actions.set(entry.id, appearance(entry.option === "Tachymeter" ? "Use dial tachymeter scale" : `Use ${entry.option.toLowerCase()} bezel appearance`, patch));
  if (option === "Scales and functions/24-hour / GMT") actions.set(entry.id, { kind: "complication", label: "Add GMT display", complication: "gmt" });
  if (option === "Scales and functions/World-time / city") actions.set(entry.id, { kind: "tool", label: "Choose primary and secondary time zones", tool: "settings" });
  if (option === "Scales and functions/Elapsed-time" || option === "Scales and functions/Countdown") actions.set(entry.id, { kind: "tool", label: "Open stopwatch and countdown", tool: "instruments" });
}

export const WATCH_CATALOG_SUPPLEMENT: readonly CatalogEntry[] = entries;
export function getSupplementAction(entry: CatalogEntry): CatalogAction | undefined {
  if (entry.sourceKind !== "supplement") return undefined;
  return actions.get(entry.id) ?? reference("This independent bezel attribute is a design specification. The current renderer applies only the supported bezel appearances and tools.");
}
