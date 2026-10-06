import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, eq, inArray, sql } from "drizzle-orm";
vi.mock("server-only", () => ({}));
import { getDb } from "../src/lib/db";
import { accounts, getSchemaName, loginAttempts, preferences, watches } from "../src/lib/schema";
import { reserveLoginAttempt } from "../src/lib/auth";
import { PRESETS } from "../src/lib/presets";
import { DEFAULT_PREFERENCES } from "../src/lib/types";

// This suite is opt-in and owns only temporary accounts; the original owner's rows are never touched.
const enabled = process.env.WATCHME_RUN_DB_TESTS === "1";
const testBucket = `integration-${randomUUID()}`;
const testWatchId = randomUUID();
const firstUserId = randomUUID(), secondUserId = randomUUID();
describe.skipIf(!enabled)("Neon integration (requires an isolated migrated dev/preview schema)", () => {
  beforeAll(async () => {
    if (getSchemaName() === "watchme") throw new Error("Integration tests must use watchme_dev or watchme_preview.");
    await getDb().insert(accounts).values([firstUserId, secondUserId].map(id => ({ id, username: `test_${id.replaceAll("-", "").slice(0, 18)}`, passwordHash: `scrypt:${"a".repeat(32)}:${"b".repeat(128)}` })));
  });
  afterAll(async () => {
    if (getSchemaName() === "watchme") return;
    await getDb().delete(loginAttempts).where(eq(loginAttempts.bucket, testBucket));
    await getDb().delete(accounts).where(inArray(accounts.id, [firstUserId, secondUserId]));
  });
  it("allows exactly five concurrent attempts, blocks the rest, and reopens after the window", async () => {
    if (getSchemaName() === "watchme") throw new Error("Integration tests must use watchme_dev or watchme_preview.");
    const results = await Promise.all(Array.from({ length: 12 }, () => reserveLoginAttempt(testBucket, 5)));
    expect(results.filter(Boolean)).toHaveLength(5);
    expect(await reserveLoginAttempt(testBucket, 5)).toBe(false);
    await getDb().update(loginAttempts).set({ windowStart: sql`now() - interval '16 minutes'` }).where(eq(loginAttempts.bucket, testBucket));
    expect(await reserveLoginAttempt(testBucket, 5)).toBe(true);
    const [row] = await getDb().select().from(loginAttempts).where(eq(loginAttempts.bucket, testBucket));
    expect(row.attempts).toBe(1);
  });
  it("round-trips a saved design and favorite through Neon", async () => {
    if (getSchemaName() === "watchme") throw new Error("Integration tests must use watchme_dev or watchme_preview.");
    await getDb().insert(watches).values({ id: testWatchId, userId: firstUserId, name: "Integration verification", design: PRESETS[0].design });
    await getDb().update(watches).set({ favorite: true }).where(and(eq(watches.id, testWatchId), eq(watches.userId, firstUserId)));
    const [row] = await getDb().select().from(watches).where(and(eq(watches.id, testWatchId), eq(watches.userId, firstUserId)));
    expect(row.design).toEqual(PRESETS[0].design);
    expect(row.favorite).toBe(true);
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(await getDb().select().from(watches).where(and(eq(watches.id, testWatchId), eq(watches.userId, secondUserId)))).toEqual([]);
    expect(await getDb().update(watches).set({ favorite: false }).where(and(eq(watches.id, testWatchId), eq(watches.userId, secondUserId))).returning()).toEqual([]);
    await getDb().insert(preferences).values([
      { userId: firstUserId, value: { ...DEFAULT_PREFERENCES, activeWatchId: testWatchId } },
      { userId: secondUserId, value: { ...DEFAULT_PREFERENCES, unit: "celsius" } },
    ]);
    const [second] = await getDb().select().from(preferences).where(eq(preferences.userId, secondUserId));
    expect(second.value).toMatchObject({ activeWatchId: "monolith", unit: "celsius" });
  });
});
