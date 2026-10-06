import { z } from "zod";
import { ACTIVE_COMPLICATIONS, isCatalogReference, isCompatibleDesign, isValidInitials, isValidSignature, MAX_ACTIVE_COMPLICATIONS, MAX_CATALOG_REFERENCES, PARTS, PRESETS, WATCH_FAMILIES } from "./presets";

export const familySchema = z.enum(WATCH_FAMILIES);
const colorSchema = z.string().regex(/^#[a-f0-9]{6}$/i);
export const atmosphereSchema = z.object({
  intensity: z.number().finite().min(0).max(100),
  density: z.number().finite().min(0).max(100),
  gravity: z.enum(PARTS.atmosphereGravities),
  color: colorSchema.length(7),
  calm: z.boolean(),
  scene: z.enum(PARTS.atmosphereScenes).optional(),
}).strict();
export const designSchema = z.object({
  version: z.literal(1), family: familySchema,
  caseShape: z.enum(PARTS.caseShapes),
  metal: z.enum(PARTS.metals),
  dialColor: colorSchema, accentColor: colorSchema,
  texture: z.enum(PARTS.textures),
  hands: z.enum(PARTS.hands),
  markers: z.enum(PARTS.markers),
  strap: z.enum(PARTS.straps),
  complication: z.enum(PARTS.complications),
  additionalComplications: z.array(z.enum(ACTIVE_COMPLICATIONS)).max(MAX_ACTIVE_COMPLICATIONS - 1).optional(),
  bezel: z.enum(PARTS.bezels).optional(),
  lumeColor: colorSchema.optional(),
  signature: z.string().refine(isValidSignature, "Use up to 14 visible characters for your signature.").optional(),
  initials: z.string().refine(isValidInitials, "Use up to 4 visible characters for your initials.").optional(),
  secondsMotion: z.enum(PARTS.secondsMotions).optional(),
  secondsIndication: z.enum(PARTS.secondsIndications).optional(),
  secondsPlacement: z.enum(PARTS.secondsPlacements).optional(),
  secondsAdvances: z.union(PARTS.secondsAdvances.map(value => z.literal(value))).optional(),
  secondsSetting: z.enum(PARTS.secondsSettings).optional(),
  chronographBehavior: z.enum(PARTS.chronographBehaviors).optional(),
  caseFinish: z.enum(PARTS.caseFinishes).optional(),
  braceletStyle: z.enum(PARTS.braceletStyles).optional(),
  chapterRing: z.enum(PARTS.chapterRings).optional(),
  crystalStyle: z.enum(PARTS.crystalStyles).optional(),
  lumeStyle: z.enum(PARTS.lumeStyles).optional(),
  strapColor: colorSchema.optional(),
  catalogReferences: z.array(z.string().refine(isCatalogReference, "Choose a reference from the watch catalog.")).max(MAX_CATALOG_REFERENCES).optional(),
  atmosphere: atmosphereSchema.optional(),
}).strict().refine(isCompatibleDesign, "Choose up to four distinct complications that fit this case and dial layout.");
export const watchInputSchema = z.object({ id: z.uuid().optional(), name: z.string().trim().min(1).max(60), design: designSchema }).strict();
const timezoneSchema = z.string().max(100).refine((value) => {
  if (!value) return true;
  try { new Intl.DateTimeFormat("en-US", { timeZone: value }).format(); return true; } catch { return false; }
}, "Choose a valid time zone.");
export const locationSchema = z.object({ name: z.string().trim().min(1).max(160), latitude: z.number().finite().min(-90).max(90), longitude: z.number().finite().min(-180).max(180), timezone: timezoneSchema, country: z.string().max(100).optional() }).strict();
export const preferencesSchema = z.object({
  primaryTimezone: timezoneSchema,
  secondaryTimezone: timezoneSchema.refine(Boolean, "Choose a secondary time zone."),
  unit: z.enum(["fahrenheit", "celsius"]), location: locationSchema.nullable(),
  activeWatchId: z.union([familySchema, z.uuid()]),
  favoritePresets: z.array(familySchema).max(PRESETS.length).transform((values) => [...new Set(values)]),
}).strict();
export const weatherQuerySchema = z.object({
  lat: z.string().trim().min(1).pipe(z.coerce.number<string>().finite().min(-90).max(90)),
  lon: z.string().trim().min(1).pipe(z.coerce.number<string>().finite().min(-180).max(180)),
  unit: z.enum(["fahrenheit", "celsius"]).default("fahrenheit"),
});
export const locationQuerySchema = z.string().trim().min(2).max(80);
