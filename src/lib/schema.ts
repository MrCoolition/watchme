import { boolean, index, integer, jsonb, pgSchema, text, timestamp, uuid } from "drizzle-orm/pg-core";
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
export const accounts = watchmeSchema.table("accounts", {
  id: uuid("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  recoveryCodeHash: text("recovery_code_hash"),
  sessionVersion: integer("session_version").notNull().default(1),
  isOwner: boolean("is_owner").notNull().default(false),
  legacyImportedAt: timestamp("legacy_imported_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
// Separate tables prevent an older shared-studio deployment from reading personal collections.
export const watches = watchmeSchema.table("user_watches", {
  id: uuid("id").primaryKey(),
  userId: uuid("user_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  design: jsonb("design").$type<WatchDesign>().notNull(),
  favorite: boolean("favorite").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, table => [index("user_watches_owner_updated_idx").on(table.userId, table.updatedAt)]);
export const preferences = watchmeSchema.table("user_preferences", {
  userId: uuid("user_id").primaryKey().references(() => accounts.id, { onDelete: "cascade" }),
  value: jsonb("value").$type<Preferences>().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const loginAttempts = watchmeSchema.table("login_attempts", {
  bucket: text("bucket").primaryKey(),
  attempts: integer("attempts").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});
