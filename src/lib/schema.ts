import { boolean, integer, jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { Preferences, WatchDesign } from "./types";

export function getSchemaName(env: Record<string, string | undefined> = process.env): "watchme" | "watchme_preview" | "watchme_dev" {
  const explicit = env.WATCHME_SCHEMA;
  if (explicit) {
    if (explicit !== "watchme" && explicit !== "watchme_preview" && explicit !== "watchme_dev") {
      throw new Error("WATCHME_SCHEMA must be watchme, watchme_preview, or watchme_dev.");
    }
    return explicit;
  }
  return env.VERCEL_ENV === "production" ? "watchme" : env.VERCEL_ENV === "preview" ? "watchme_preview" : "watchme_dev";
}

export const watchmeSchema = pgSchema(getSchemaName());
export const watches = watchmeSchema.table("watches", {
  id: uuid("id").primaryKey(),
  name: text("name").notNull(),
  design: jsonb("design").$type<WatchDesign>().notNull(),
  favorite: boolean("favorite").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const preferences = watchmeSchema.table("preferences", {
  id: integer("id").primaryKey(),
  value: jsonb("value").$type<Preferences>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const loginAttempts = watchmeSchema.table("login_attempts", {
  bucket: text("bucket").primaryKey(),
  attempts: integer("attempts").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});
