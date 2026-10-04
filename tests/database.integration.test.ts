import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it, vi } from "vitest";
import { eq, sql } from "drizzle-orm";
vi.mock("server-only", () => ({}));
import { getDb } from "../src/lib/db";
import { getSchemaName, loginAttempts, watches } from "../src/lib/schema";
import { reserveLoginAttempt } from "../src/lib/auth";
import { PRESETS } from "../src/lib/presets";

// This suite uses a real migrated Neon database and is deliberately opt-in. It never touches singleton preferences.
const enabled = process.env.WATCHME_RUN_DB_TESTS === "1";
const testBucket = `integration-${randomUUID()}`;
const testWatchId = randomUUID();
describe.skipIf(!enabled)("Neon integration (requires an isolated migrated dev/preview schema)", () => {
  afterAll(async () => {
    if (getSchemaName() === "watchme") return;
    await getDb().delete(loginAttempts).where(eq(loginAttempts.bucket, testBucket));
    await getDb().delete(watches).where(eq(watches.id, testWatchId));
  });
  it("allows exactly five concurrent attempts, blocks the rest, and reopens after the window", async () => {
    if (getSchemaName() === "watchme") throw new Error("Integration tests must use watchme_dev or watchme_preview.");
    const results = await Promise.all(Array.from({ length: 12 }, () => reserveLoginAttempt(testBucket)));
    expect(results.filter(Boolean)).toHaveLength(5);
    expect(await reserveLoginAttempt(testBucket)).toBe(false);
    await getDb().update(loginAttempts).set({ windowStart: sql`now() - interval '16 minutes'` }).where(eq(loginAttempts.bucket, testBucket));
    expect(await reserveLoginAttempt(testBucket)).toBe(true);
    const [row] = await getDb().select().from(loginAttempts).where(eq(loginAttempts.bucket, testBucket));
    expect(row.attempts).toBe(1);
  });
  it("round-trips a saved design and favorite through Neon", async () => {
    if (getSchemaName() === "watchme") throw new Error("Integration tests must use watchme_dev or watchme_preview.");
    await getDb().insert(watches).values({ id: testWatchId, name: "Integration verification", design: PRESETS[0].design });
    await getDb().update(watches).set({ favorite: true }).where(eq(watches.id, testWatchId));
    const [row] = await getDb().select().from(watches).where(eq(watches.id, testWatchId));
    expect(row.design).toEqual(PRESETS[0].design);
    expect(row.favorite).toBe(true);
    expect(row.createdAt).toBeInstanceOf(Date);
  });
});
