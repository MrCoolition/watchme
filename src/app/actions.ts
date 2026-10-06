"use server";

import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AuthError, SetupRequiredError, requireSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { accounts, getSchemaName, watches, preferences as preferencesTable } from "@/lib/schema";
import { designSchema, familySchema, preferencesSchema, watchInputSchema } from "@/lib/validation";
import { DEFAULT_PREFERENCES, type ActionResult, type Preferences, type SavedWatch, type StudioData, type WatchDesign } from "@/lib/types";
import { migrateLegacyUnrealDesign, migrateLegacyUnrealPreferences } from "@/lib/unreal";
import { OWNER_ACCOUNT_ID } from "@/lib/account-constants";
import { finalOwnerImportStatements } from "@/lib/account-migration";

function actionError<T>(error: unknown): ActionResult<T> {
  if (error instanceof AuthError || error instanceof SetupRequiredError) return { ok: false, error: error.message };
  if (error instanceof z.ZodError) return { ok: false, error: error.issues[0]?.message ?? "Please check your selections." };
  console.error("Watchme persistence request failed.");
  return { ok: false, error: "Your studio could not reach its database. Your draft is still on this device. Try again shortly." };
}
function toWatch(row: typeof watches.$inferSelect): SavedWatch {
  return { id: row.id, name: row.name, favorite: row.favorite, design: designSchema.parse(migrateLegacyUnrealDesign(row.design)), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() };
}

/** The original studio is imported only for its reserved owner, never a public registrant. */
async function finishOwnerImport(userId: string) {
  if (userId !== OWNER_ACCOUNT_ID) return;
  const db = getDb();
  const [owner] = await db.select({ legacyImportedAt: accounts.legacyImportedAt }).from(accounts).where(and(eq(accounts.id, userId), eq(accounts.isOwner, true))).limit(1);
  if (!owner || owner.legacyImportedAt !== null) return;
  const [first, ...rest] = finalOwnerImportStatements(getSchemaName());
  // The transaction lock and database gate make concurrent first loads and migration reruns safe.
  await db.batch([db.execute(sql.raw(first.query)), ...rest.map(statement => db.execute(sql.raw(statement.query)))]);
}

export async function loadStudio(): Promise<ActionResult<StudioData>> {
  try {
    const session = await requireSession();
    await finishOwnerImport(session.userId);
    const db = getDb();
    const [rows, settings] = await Promise.all([
      db.select().from(watches).where(eq(watches.userId, session.userId)).orderBy(desc(watches.updatedAt)),
      db.select().from(preferencesTable).where(eq(preferencesTable.userId, session.userId)).limit(1),
    ]);
    const preferences = settings[0] ? preferencesSchema.parse(migrateLegacyUnrealPreferences(settings[0].value)) : { ...DEFAULT_PREFERENCES };
    if (!familySchema.safeParse(preferences.activeWatchId).success && !rows.some(watch => watch.id === preferences.activeWatchId)) preferences.activeWatchId = "monolith";
    return { ok: true, data: { account: session.account, watches: rows.map(toWatch), preferences } };
  } catch (error) { return actionError(error); }
}
export async function saveWatch(input: { id?: string; name: string; design: WatchDesign }, expectedAccountId: string): Promise<ActionResult<SavedWatch>> {
  try {
    const session = await requireSession();
    if (expectedAccountId !== session.userId) return { ok: false, error: "Your signed-in account changed. Reload the studio before saving." };
    const validated = watchInputSchema.parse(input);
    await finishOwnerImport(session.userId);
    const db = getDb();
    const [row] = validated.id
      ? await db.update(watches).set({ name: validated.name, design: validated.design, updatedAt: new Date() }).where(and(eq(watches.id, validated.id), eq(watches.userId, session.userId))).returning()
      : await db.insert(watches).values({ id: randomUUID(), userId: session.userId, name: validated.name, design: validated.design }).returning();
    if (!row) return { ok: false, error: "This watch is unavailable. Save it as a new watch." };
    revalidatePath("/");
    return { ok: true, data: toWatch(row) };
  } catch (error) { return actionError(error); }
}
export async function deleteWatch(id: string, expectedAccountId: string): Promise<ActionResult<null>> {
  try {
    const session = await requireSession();
    if (expectedAccountId !== session.userId) return { ok: false, error: "Your signed-in account changed. Reload the studio before making changes." };
    const watchId = z.uuid().parse(id);
    await finishOwnerImport(session.userId);
    const db = getDb();
    const [deleted] = await db.batch([
      db.delete(watches).where(and(eq(watches.id, watchId), eq(watches.userId, session.userId))).returning({ id: watches.id }),
      db.update(preferencesTable).set({ value: sql`jsonb_set(${preferencesTable.value}, '{activeWatchId}', '"monolith"'::jsonb)`, updatedAt: new Date() }).where(and(eq(preferencesTable.userId, session.userId), sql`${preferencesTable.value}->>'activeWatchId' = ${watchId}`)),
    ]);
    if (!deleted.length) return { ok: false, error: "This watch is unavailable." };
    revalidatePath("/");
    return { ok: true, data: null };
  } catch (error) { return actionError(error); }
}
export async function setFavorite(id: string, favorite: boolean, expectedAccountId: string): Promise<ActionResult<SavedWatch>> {
  try {
    const session = await requireSession();
    if (expectedAccountId !== session.userId) return { ok: false, error: "Your signed-in account changed. Reload the studio before making changes." };
    const watchId = z.uuid().parse(id);
    const value = z.boolean().parse(favorite);
    await finishOwnerImport(session.userId);
    const [row] = await getDb().update(watches).set({ favorite: value, updatedAt: new Date() }).where(and(eq(watches.id, watchId), eq(watches.userId, session.userId))).returning();
    if (!row) return { ok: false, error: "This watch is unavailable." };
    revalidatePath("/");
    return { ok: true, data: toWatch(row) };
  } catch (error) { return actionError(error); }
}
export async function savePreferences(preferences: Preferences, expectedAccountId: string): Promise<ActionResult<Preferences>> {
  try {
    const session = await requireSession();
    if (expectedAccountId !== session.userId) return { ok: false, error: "Your signed-in account changed. Reload the studio before saving." };
    const value = preferencesSchema.parse(preferences);
    await finishOwnerImport(session.userId);
    const db = getDb();
    if (!familySchema.safeParse(value.activeWatchId).success) {
      const [watch] = await db.select({ id: watches.id }).from(watches).where(and(eq(watches.id, value.activeWatchId), eq(watches.userId, session.userId))).limit(1);
      if (!watch) return { ok: false, error: "Choose a watch from your collection." };
    }
    await db.insert(preferencesTable).values({ userId: session.userId, value }).onConflictDoUpdate({ target: preferencesTable.userId, set: { value, updatedAt: new Date() } });
    revalidatePath("/");
    return { ok: true, data: value };
  } catch (error) { return actionError(error); }
}
