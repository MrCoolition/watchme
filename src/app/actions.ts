"use server";

import { randomUUID } from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, SetupRequiredError, authVersion, clearLoginAttempts, getSession, isConfigured, loginBucket, requireSession, reserveLoginAttempt } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { watches, preferences as preferencesTable } from "@/lib/schema";
import { designSchema, familySchema, preferencesSchema, watchInputSchema } from "@/lib/validation";
import { DEFAULT_PREFERENCES, type ActionResult, type Preferences, type SavedWatch, type StudioData, type WatchDesign } from "@/lib/types";
import { migrateLegacyUnrealDesign, migrateLegacyUnrealPreferences } from "@/lib/unreal";

function actionError<T>(error: unknown): ActionResult<T> {
  if (error instanceof AuthError || error instanceof SetupRequiredError) return { ok: false, error: error.message };
  if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Please check your selections." };
  // Never return database diagnostics: they can contain connection strings and submitted data.
  console.error("Watchme persistence request failed.");
  return { ok: false, error: "Your studio could not reach its database. Your draft is still on this device. Try again shortly." };
}
function toWatch(row: typeof watches.$inferSelect): SavedWatch {
  return { ...row, design: designSchema.parse(migrateLegacyUnrealDesign(row.design)), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

export async function loadStudio(): Promise<ActionResult<StudioData>> {
  try {
    await requireSession();
    const db = getDb();
    const [rows, settings] = await Promise.all([db.select().from(watches).orderBy(desc(watches.updatedAt)), db.select().from(preferencesTable).where(eq(preferencesTable.id, 1)).limit(1)]);
    const preferences = settings[0] ? preferencesSchema.parse(migrateLegacyUnrealPreferences(settings[0].value)) : { ...DEFAULT_PREFERENCES };
    if (!familySchema.safeParse(preferences.activeWatchId).success && !rows.some((watch) => watch.id === preferences.activeWatchId)) preferences.activeWatchId = "monolith";
    return { ok: true, data: { watches: rows.map(toWatch), preferences } };
  } catch (error) { return actionError(error); }
}
export async function saveWatch(input: { id?: string; name: string; design: WatchDesign }): Promise<ActionResult<SavedWatch>> {
  try {
    await requireSession();
    const validated = watchInputSchema.parse(input);
    const db = getDb();
    const [row] = validated.id
      ? await db.update(watches).set({ name: validated.name, design: validated.design, updatedAt: new Date() }).where(eq(watches.id, validated.id)).returning()
      : await db.insert(watches).values({ id: randomUUID(), name: validated.name, design: validated.design }).returning();
    if (!row) return { ok: false, error: "This watch was removed on another device. Save it as a new watch." };
    revalidatePath("/");
    return { ok: true, data: toWatch(row) };
  } catch (error) { return actionError(error); }
}
export async function deleteWatch(id: string): Promise<ActionResult<null>> {
  try {
    await requireSession();
    const watchId = z.uuid().parse(id);
    const db = getDb();
    // The batch is atomic: deleting an active watch resets its selection without replacing other settings.
    await db.batch([
      db.delete(watches).where(eq(watches.id, watchId)),
      db.update(preferencesTable).set({ value: sql`jsonb_set(${preferencesTable.value}, '{activeWatchId}', '"monolith"'::jsonb)`, updatedAt: new Date() }).where(sql`${preferencesTable.id} = 1 AND ${preferencesTable.value}->>'activeWatchId' = ${watchId}`),
    ]);
    revalidatePath("/");
    return { ok: true, data: null };
  } catch (error) { return actionError(error); }
}
export async function setFavorite(id: string, favorite: boolean): Promise<ActionResult<SavedWatch>> {
  try {
    await requireSession();
    const watchId = z.uuid().parse(id);
    const value = z.boolean().parse(favorite);
    const [row] = await getDb().update(watches).set({ favorite: value, updatedAt: new Date() }).where(eq(watches.id, watchId)).returning();
    if (!row) return { ok: false, error: "This watch no longer exists." };
    revalidatePath("/");
    return { ok: true, data: toWatch(row) };
  } catch (error) { return actionError(error); }
}
export async function savePreferences(preferences: Preferences): Promise<ActionResult<Preferences>> {
  try {
    await requireSession();
    const value = preferencesSchema.parse(preferences);
    const db = getDb();
    if (!familySchema.safeParse(value.activeWatchId).success) {
      const [watch] = await db.select({ id: watches.id }).from(watches).where(eq(watches.id, value.activeWatchId)).limit(1);
      if (!watch) return { ok: false, error: "Choose a watch from your collection." };
    }
    await db.insert(preferencesTable).values({ id: 1, value }).onConflictDoUpdate({ target: preferencesTable.id, set: { value, updatedAt: new Date() } });
    revalidatePath("/");
    return { ok: true, data: value };
  } catch (error) { return actionError(error); }
}
export async function login(passphrase: string): Promise<ActionResult<null>> {
  if (!isConfigured()) return { ok: false, error: "Private studio setup is required." };
  try {
    const bucket = await loginBucket();
    if (!await reserveLoginAttempt(bucket)) return { ok: false, error: "Too many attempts. Try again in 15 minutes." };
    if (typeof passphrase !== "string" || !await verifyPassword(passphrase, process.env.WATCHME_PASSWORD_HASH!)) {
      return { ok: false, error: "That passphrase did not unlock your studio." };
    }
    await clearLoginAttempts(bucket);
    const session = await getSession();
    session.authenticated = true;
    session.issuedAt = Date.now();
    session.authVersion = authVersion();
    await session.save();
    revalidatePath("/");
    return { ok: true, data: null };
  } catch {
    console.error("Watchme login service failed.");
    return { ok: false, error: "Your studio is temporarily unavailable. Try again shortly." };
  }
}
export async function logout(): Promise<void> {
  const session = await requireSession();
  session.destroy();
  revalidatePath("/");
}
