import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { generateRecoveryCode, hashRecoveryCode, verifyRecoveryCode } from "../src/lib/password";

const mocks = vi.hoisted(() => ({ select: vi.fn(), insert: vi.fn(), update: vi.fn(), reserve: vi.fn(), requireSession: vi.fn(), createSession: vi.fn(), clearAttempts: vi.fn(), destroy: vi.fn(), verify: vi.fn(), hash: vi.fn(), upgrade: vi.fn(), writes: [] as { values: Record<string, unknown>; where?: unknown }[] }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/auth", () => ({
  AuthError: class AuthError extends Error { constructor() { super("Locked."); } }, SetupRequiredError: class SetupRequiredError extends Error {},
  isConfigured: () => true, accountBucket: (operation: string, username: string) => `${operation}:account:${username}`,
  clearLoginAttempts: mocks.clearAttempts, createAccountSession: mocks.createSession, reserveAuthAttempt: mocks.reserve, requireSession: mocks.requireSession,
  getSession: async () => ({ destroy: mocks.destroy }),
}));
vi.mock("../src/lib/password", async importOriginal => ({ ...await importOriginal<typeof import("../src/lib/password")>(), verifyPassword: mocks.verify, hashPassword: mocks.hash, upgradePasswordHash: mocks.upgrade }));
vi.mock("../src/lib/db", () => ({ getDb: () => ({
  select: () => ({ from: () => ({ where: () => ({ limit: mocks.select }) }) }),
  insert: () => ({ values: (values: Record<string, unknown>) => { mocks.writes.push({ values }); return { onConflictDoNothing: () => ({ returning: () => mocks.insert(values) }) }; } }),
  update: () => ({ set: (values: Record<string, unknown>) => ({ where: (where: unknown) => { mocks.writes.push({ values, where }); return { returning: () => mocks.update(values, where) }; } }) }),
}) }));
import { changePassphrase, login, logout, recoverAccount, regenerateRecoveryCode, register } from "../src/app/account-actions";
import { AuthError } from "../src/lib/auth";
import { OWNER_USERNAME } from "../src/lib/account-constants";
const ID = "11111111-1111-4111-8111-111111111111";
const currentHash = `scrypt:v1:131072:8:1:${"ab".repeat(16)}:${"cd".repeat(64)}`;
const account = { id: ID, username: "tester", passwordHash: currentHash, recoveryCodeHash: null as string | null, isOwner: false, sessionVersion: 2, legacyImportedAt: null, createdAt: new Date(), updatedAt: new Date() };
const passphrase = "a long and private passphrase";
const dialect = new PgDialect();

beforeEach(() => {
  vi.clearAllMocks(); mocks.writes.length = 0;
  vi.stubEnv("WATCHME_PASSWORD_HASH", "");
  mocks.select.mockReset().mockResolvedValue([{ ...account }]);
  mocks.insert.mockReset().mockImplementation(async (values: Record<string, unknown>) => [{ ...account, ...values }]);
  mocks.update.mockReset().mockImplementation(async (values: Record<string, unknown>) => [{ ...account, ...values, sessionVersion: values.sessionVersion ? 3 : 2 }]);
  mocks.reserve.mockResolvedValue(true);
  mocks.requireSession.mockResolvedValue({ userId: ID, sessionVersion: 2, issuedAt: Date.now(), account: { id: ID, username: "tester", isOwner: false, hasRecoveryCode: true } });
  mocks.verify.mockResolvedValue(true); mocks.hash.mockResolvedValue("new-password-digest"); mocks.upgrade.mockResolvedValue(currentHash);
  mocks.createSession.mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllEnvs(); });

describe("account action boundaries", () => {
  it("reserves account/IP budget before any credential work and cannot hash when denied", async () => {
    mocks.reserve.mockResolvedValue(false);
    expect((await login({ username: "tester", passphrase })).ok).toBe(false);
    expect((await register({ username: "new_user", passphrase })).ok).toBe(false);
    expect((await recoverAccount({ username: "tester", recoveryCode: generateRecoveryCode(), passphrase })).ok).toBe(false);
    expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.hash).not.toHaveBeenCalled(); expect(mocks.select).not.toHaveBeenCalled();
  });
  it("returns the same error for absent users and wrong passwords and uses a dummy KDF", async () => {
    mocks.select.mockResolvedValueOnce([]);
    const absent = await login({ username: "absent", passphrase });
    expect(mocks.verify).toHaveBeenCalledWith(passphrase, expect.stringMatching(/^scrypt:v1:131072:8:1:/));
    mocks.verify.mockResolvedValue(false);
    const wrong = await login({ username: "tester", passphrase });
    expect(wrong).toEqual(absent);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("signs in only as the verified DB account and clears only its account bucket", async () => {
    const result = await login({ username: "  TESTER  ", passphrase });
    expect(result).toEqual({ ok: true, data: null });
    expect(mocks.verify).toHaveBeenCalledWith(passphrase, currentHash);
    expect(mocks.createSession).toHaveBeenCalledWith(account);
    expect(mocks.clearAttempts).toHaveBeenCalledWith("login:account:tester");
    expect(mocks.reserve.mock.invocationCallOrder[0]).toBeLessThan(mocks.verify.mock.invocationCallOrder[0]);
  });
  it("never replaces an existing owner's DB credential with a changed bootstrap environment secret", async () => {
    const bootstrapHash = `scrypt:${"ef".repeat(16)}:${"01".repeat(64)}`;
    vi.stubEnv("WATCHME_PASSWORD_HASH", bootstrapHash);
    mocks.select.mockResolvedValue([{ ...account, username: OWNER_USERNAME, isOwner: true }]);
    await login({ username: OWNER_USERNAME, passphrase });
    expect(mocks.verify).toHaveBeenCalledWith(passphrase, currentHash);
    expect(mocks.verify).not.toHaveBeenCalledWith(passphrase, bootstrapHash);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("upgrades legacy hashes only after successful verification and guards concurrent password resets", async () => {
    const legacy = `scrypt:${"ab".repeat(16)}:${"cd".repeat(64)}`;
    mocks.select.mockResolvedValue([{ ...account, passwordHash: legacy }]);
    mocks.update.mockResolvedValueOnce([]);
    expect((await login({ username: "tester", passphrase: "old-short" })).ok).toBe(false);
    expect(mocks.upgrade).toHaveBeenCalledWith("old-short");
    const statement = dialect.sqlToQuery(mocks.writes[0].where as Parameters<PgDialect["sqlToQuery"]>[0]);
    expect(statement.params).toEqual([ID, legacy, 2]);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("prevents signup from claiming the owner or injecting ownership fields", async () => {
    expect((await register({ username: OWNER_USERNAME.toUpperCase(), passphrase })).ok).toBe(false);
    expect((await register({ username: "tester", passphrase, isOwner: true } as Parameters<typeof register>[0])).ok).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
  it("creates a separate account and exposes its recovery code once without returning stored secrets", async () => {
    const result = await register({ username: "  NEW_USER  ", passphrase });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("registration failed");
    const stored = mocks.writes[0].values;
    expect(stored.username).toBe("new_user"); expect(stored.isOwner).toBe(false);
    expect(stored.passwordHash).toBe("new-password-digest");
    expect(stored.recoveryCodeHash).not.toBe(result.data.recoveryCode);
    expect(verifyRecoveryCode(result.data.recoveryCode, stored.recoveryCodeHash as string)).toBe(true);
    expect(result.data.account).toMatchObject({ username: "new_user", isOwner: false, hasRecoveryCode: true });
    expect(result.data.account).not.toHaveProperty("passwordHash"); expect(result.data.account).not.toHaveProperty("recoveryCodeHash");
    expect(mocks.createSession).toHaveBeenCalledOnce();
  });
  it("handles concurrent duplicate registration through the unique insert boundary", async () => {
    mocks.insert.mockResolvedValueOnce([]);
    expect((await register({ username: "tester", passphrase })).ok).toBe(false);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("does not leak storage diagnostics", async () => {
    mocks.select.mockRejectedValue(new Error("postgresql://SECRET:credential@example.invalid"));
    const result = await login({ username: "tester", passphrase });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toMatch(/SECRET|postgresql|credential@example/);
  });
});

describe("recovery and credential rotation", () => {
  it("consumes a recovery code with an atomic hash/version guard and returns a different code", async () => {
    const code = generateRecoveryCode(), oldHash = hashRecoveryCode(code);
    mocks.select.mockResolvedValue([{ ...account, recoveryCodeHash: oldHash }]);
    const result = await recoverAccount({ username: "tester", recoveryCode: code, passphrase });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("recovery failed");
    expect(result.data.recoveryCode).not.toBe(code);
    const write = mocks.writes[0], statement = dialect.sqlToQuery(write.where as Parameters<PgDialect["sqlToQuery"]>[0]);
    expect(statement.params).toEqual([ID, oldHash, 2]);
    expect(dialect.sqlToQuery(write.values.sessionVersion as Parameters<PgDialect["sqlToQuery"]>[0]).sql).toMatch(/session_version.*\+ 1/);
    expect(verifyRecoveryCode(code, write.values.recoveryCodeHash as string)).toBe(false);
    expect(verifyRecoveryCode(result.data.recoveryCode, write.values.recoveryCodeHash as string)).toBe(true);
    expect(mocks.createSession).toHaveBeenCalledWith(expect.objectContaining({ id: ID, sessionVersion: 3 }));
    expect(mocks.clearAttempts).not.toHaveBeenCalled();
  });
  it("does not issue a replacement code or session to the losing concurrent reset", async () => {
    const code = generateRecoveryCode();
    mocks.select.mockResolvedValue([{ ...account, recoveryCodeHash: hashRecoveryCode(code) }]);
    mocks.update.mockResolvedValueOnce([{ ...account, sessionVersion: 3 }]).mockResolvedValueOnce([]);
    const results = await Promise.all([recoverAccount({ username: "tester", recoveryCode: code, passphrase }), recoverAccount({ username: "tester", recoveryCode: code, passphrase })]);
    expect(results.filter(result => result.ok)).toHaveLength(1);
    expect(mocks.createSession).toHaveBeenCalledOnce();
  });
  it("counts consumed, missing, and incorrect recovery codes without revealing account existence", async () => {
    const code = generateRecoveryCode();
    mocks.select.mockResolvedValueOnce([]).mockResolvedValueOnce([{ ...account, recoveryCodeHash: null }]).mockResolvedValueOnce([{ ...account, recoveryCodeHash: hashRecoveryCode(generateRecoveryCode()) }]);
    const absent = await recoverAccount({ username: "absent", recoveryCode: code, passphrase });
    expect(await recoverAccount({ username: "tester", recoveryCode: code, passphrase })).toEqual(absent);
    expect(await recoverAccount({ username: "tester", recoveryCode: code, passphrase })).toEqual(absent);
    expect(mocks.reserve).toHaveBeenCalledTimes(3); expect(mocks.hash).not.toHaveBeenCalled(); expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("requires the current passphrase, revokes old sessions, and refreshes the changing device", async () => {
    const result = await changePassphrase({ currentPassphrase: "old passphrase", passphrase }, ID);
    expect(result).toEqual({ ok: true, data: null });
    expect(mocks.verify).toHaveBeenCalledWith("old passphrase", currentHash);
    const write = mocks.writes[0], statement = dialect.sqlToQuery(write.where as Parameters<PgDialect["sqlToQuery"]>[0]);
    expect(statement.params).toEqual([ID, currentHash, 2]);
    expect(mocks.createSession).toHaveBeenCalledWith(expect.objectContaining({ sessionVersion: 3 }));
    expect(write.values).not.toHaveProperty("recoveryCodeHash");
  });
  it("rejects stale settings tabs when the cookie now belongs to a different account", async () => {
    const staleAccountId = "22222222-2222-4222-8222-222222222222";
    expect((await changePassphrase({ currentPassphrase: passphrase, passphrase }, staleAccountId)).ok).toBe(false);
    expect((await regenerateRecoveryCode({ passphrase }, staleAccountId)).ok).toBe(false);
    expect(mocks.reserve).not.toHaveBeenCalled(); expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.select).not.toHaveBeenCalled(); expect(mocks.writes).toHaveLength(0);
  });
  it("rejects passphrase changes on revoked sessions without attempting expensive hashing", async () => {
    mocks.requireSession.mockRejectedValue(new AuthError());
    expect((await changePassphrase({ currentPassphrase: "old passphrase", passphrase }, ID)).ok).toBe(false);
    expect((await regenerateRecoveryCode({ passphrase }, ID)).ok).toBe(false);
    expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.hash).not.toHaveBeenCalled();
  });
  it("rotates recovery codes only after passphrase proof and guards concurrent regeneration", async () => {
    const oldHash = hashRecoveryCode(generateRecoveryCode());
    mocks.select.mockResolvedValue([{ ...account, recoveryCodeHash: oldHash }]);
    const result = await regenerateRecoveryCode({ passphrase }, ID);
    expect(result.ok).toBe(true);
    const write = mocks.writes[0], statement = dialect.sqlToQuery(write.where as Parameters<PgDialect["sqlToQuery"]>[0]);
    expect(statement.params).toEqual([ID, currentHash, 2, oldHash]);
    expect(mocks.verify).toHaveBeenCalledWith(passphrase, currentHash);
    expect(mocks.createSession).not.toHaveBeenCalled();
  });
  it("allows logout even when account authorization is expired or revoked", async () => {
    mocks.requireSession.mockRejectedValue(new AuthError());
    await logout();
    expect(mocks.destroy).toHaveBeenCalledOnce(); expect(mocks.requireSession).not.toHaveBeenCalled();
  });
});

