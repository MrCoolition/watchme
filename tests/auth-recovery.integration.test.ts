import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { eq, inArray } from "drizzle-orm";

const mocks = vi.hoisted(() => ({ address: "", save: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({}), headers: async () => new Headers({ "x-vercel-forwarded-for": mocks.address }) }));
vi.mock("iron-session", () => ({ getIronSession: async () => ({ save: mocks.save, destroy: vi.fn() }) }));
import { getDb } from "../src/lib/db";
import { accounts, getSchemaName, loginAttempts } from "../src/lib/schema";
import { accountBucket, loginBucket } from "../src/lib/auth";
import { recoverAccount } from "../src/app/account-actions";
import { generateRecoveryCode, hashPassword, hashRecoveryCode, verifyPassword, verifyRecoveryCode } from "../src/lib/password";

const enabled = process.env.WATCHME_RUN_DB_TESTS === "1";
const fixtureId = randomUUID(), username = `qa_recover_${fixtureId.replace(/-/g, "").slice(0, 10)}`;
const originalCode = generateRecoveryCode();
const originalPassphrase = "isolated original test passphrase";
const replacementPassphrase = "isolated replacement test passphrase";
let buckets: string[] = [];

describe.skipIf(!enabled)("real Neon single-use recovery boundary", () => {
  beforeAll(async () => {
    if (getSchemaName() === "watchme") throw new Error("Recovery integration tests require an isolated dev/preview schema.");
    vi.stubEnv("VERCEL", "1"); mocks.address = `integration-recovery-${fixtureId}`;
    buckets = [accountBucket("recover", username), `recover:ip:${await loginBucket()}`];
    await getDb().insert(accounts).values({ id: fixtureId, username, passwordHash: await hashPassword(originalPassphrase), recoveryCodeHash: hashRecoveryCode(originalCode), isOwner: false, sessionVersion: 1 });
  }, 15_000);
  afterAll(async () => {
    if (getSchemaName() !== "watchme") {
      await getDb().delete(accounts).where(eq(accounts.id, fixtureId));
      if (buckets.length) await getDb().delete(loginAttempts).where(inArray(loginAttempts.bucket, buckets));
    }
    vi.unstubAllEnvs();
  });
  it("gives exactly one simultaneous reset the replacement code and rejects replay", async () => {
    const results = await Promise.all([
      recoverAccount({ username, recoveryCode: originalCode, passphrase: replacementPassphrase }),
      recoverAccount({ username, recoveryCode: originalCode, passphrase: replacementPassphrase }),
    ]);
    const successes = results.filter(result => result.ok);
    expect(successes).toHaveLength(1); expect(mocks.save).toHaveBeenCalledOnce();
    const result = successes[0]; if (!result.ok) throw new Error("Expected one successful recovery.");
    const [row] = await getDb().select().from(accounts).where(eq(accounts.id, fixtureId));
    expect(row.sessionVersion).toBe(2);
    expect(await verifyPassword(originalPassphrase, row.passwordHash)).toBe(false);
    expect(await verifyPassword(replacementPassphrase, row.passwordHash)).toBe(true);
    expect(verifyRecoveryCode(originalCode, row.recoveryCodeHash)).toBe(false);
    expect(verifyRecoveryCode(result.data.recoveryCode, row.recoveryCodeHash)).toBe(true);
    expect((await recoverAccount({ username, recoveryCode: originalCode, passphrase: "another isolated replacement passphrase" })).ok).toBe(false);
    const [afterReplay] = await getDb().select().from(accounts).where(eq(accounts.id, fixtureId));
    expect(afterReplay.sessionVersion).toBe(2); expect(afterReplay.passwordHash).toBe(row.passwordHash);
  }, 30_000);
});
