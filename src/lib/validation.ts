import { z } from "zod";
import { isCompatibleDesign, isValidInitials, isValidSignature, PARTS, PRESETS } from "./presets";

export const familySchema = z.enum(["monolith", "pelagic", "apex", "vesper", "meridian", "orbit", "reactor"]);
const colorSchema = z.string().regex(/^#[a-f0-9]{6}$/i);
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
  bezel: z.enum(PARTS.bezels).optional(),
  lumeColor: colorSchema.optional(),
  signature: z.string().refine(isValidSignature, "Use up to 14 visible characters for your signature.").optional(),
  initials: z.string().refine(isValidInitials, "Use up to 4 visible characters for your initials.").optional(),
  secondsMotion: z.enum(PARTS.secondsMotions).optional(),
}).strict().refine(isCompatibleDesign, "The selected complication does not fit this case.");
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
