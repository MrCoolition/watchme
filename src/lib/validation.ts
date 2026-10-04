import { z } from "zod";
import { isCompatibleDesign } from "./presets";

export const familySchema = z.enum(["monolith", "pelagic", "apex", "vesper", "meridian", "orbit"]);
const colorSchema = z.string().regex(/^#[a-f0-9]{6}$/i);
export const designSchema = z.object({
  version: z.literal(1), family: familySchema,
  caseShape: z.enum(["octagonal", "cushion", "tonneau", "round"]),
  metal: z.enum(["steel", "titanium", "gold", "rose", "graphite"]),
  dialColor: colorSchema, accentColor: colorSchema,
  texture: z.enum(["grid", "horizontal", "sunburst", "lacquer", "skeleton"]),
  hands: z.enum(["baton", "sword", "dauphine", "skeleton"]),
  markers: z.enum(["baton", "roman", "arabic", "minimal"]),
  strap: z.enum(["bracelet", "leather", "rubber"]),
  complication: z.enum(["date", "gmt", "chronograph", "weather", "regulator", "none"]),
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
  favoritePresets: z.array(familySchema).max(6).transform((values) => [...new Set(values)]),
}).strict();
export const weatherQuerySchema = z.object({
  lat: z.string().trim().min(1).pipe(z.coerce.number<string>().finite().min(-90).max(90)),
  lon: z.string().trim().min(1).pipe(z.coerce.number<string>().finite().min(-180).max(180)),
  unit: z.enum(["fahrenheit", "celsius"]).default("fahrenheit"),
});
export const locationQuerySchema = z.string().trim().min(2).max(80);
