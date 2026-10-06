import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
const mocks = vi.hoisted(() => ({ session: {} as Record<string, unknown>, execute: vi.fn(), select: vi.fn(), deleted: vi.fn(), requestHeaders: new Headers(), getIronSession: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn().mockResolvedValue({}), headers: () => mocks.requestHeaders }));
vi.mock("iron-session", () => ({ getIronSession: mocks.getIronSession }));
vi.mock("../src/lib/db", () => ({ getDb: () => ({ execute: mocks.execute, select: () => ({ from: () => ({ where: () => ({ limit: mocks.select }) }) }), delete: () => ({ where: mocks.deleted }) }) }));
import { AuthError, SetupRequiredError, accountBucket, clearLoginAttempts, createAccountSession, getAuthStatus, getSession, isConfigured, isSessionValid, loginBucket, requireSession, reserveAuthAttempt, reserveLoginAttempt } from "../src/lib/auth";
const USER_ID = "01234567-89ab-4cde-8fab-0123456789ab";
const account = { id: USER_ID, username: "tester", isOwner: false, recoveryCodeHash: "opaque", sessionVersion: 3 };

beforeEach(() => {
  vi.stubEnv("neon_connect", "postgresql://test.invalid/test");
  vi.stubEnv("WATCHME_PASSWORD_HASH", "");
  vi.stubEnv("SESSION_SECRET", "test-only-session-secret-at-least-32-characters");
  vi.stubEnv("VERCEL", "");
  mocks.session = {};
  mocks.requestHeaders = new Headers();
  mocks.getIronSession.mockReset().mockImplementation(async () => mocks.session);
  mocks.execute.mockReset().mockResolvedValue({ rows: [{ attempts: 1 }] });
  mocks.select.mockReset().mockResolvedValue([account]);
  mocks.deleted.mockReset().mockResolvedValue(undefined);
});
afterEach(() => { vi.unstubAllEnvs(); });

describe("per-account session authorization", () => {
  it("fails closed before cookies or DB when runtime setup is incomplete", async () => {
    vi.stubEnv("neon_connect", "");
    expect(await getAuthStatus()).toBe("setup-required");
    await expect(requireSession()).rejects.toBeInstanceOf(SetupRequiredError);
    expect(mocks.getIronSession).not.toHaveBeenCalled();
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it("does not require the retired bootstrap hash for normal account login", () => { expect(isConfigured()).toBe(true); });
  it("rejects old shared-cookie payloads before accessing any account", async () => {
    mocks.session = { authenticated: true, issuedAt: Date.now(), authVersion: "old-shared-secret-hash" };
    expect(await getAuthStatus()).toBe("unauthenticated");
    await expect(requireSession()).rejects.toBeInstanceOf(AuthError);
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it("rejects missing, expired, future, and malformed identity/version values", () => {
    const valid = { userId: USER_ID, issuedAt: Date.now(), sessionVersion: 3 };
    expect(isSessionValid(valid)).toBe(true);
    for (const invalid of [{}, { ...valid, userId: "arbitrary-user" }, { ...valid, sessionVersion: 0 }, { ...valid, sessionVersion: 1.5 }, { ...valid, issuedAt: NaN }, { ...valid, issuedAt: Date.now() - 8 * 86400_000 }, { ...valid, issuedAt: Date.now() + 60_000 }]) expect(isSessionValid(invalid)).toBe(false);
  });
  it("checks the current DB version on every request and returns only safe account fields", async () => {
    mocks.session = { userId: USER_ID, issuedAt: Date.now(), sessionVersion: 3 };
    const first = await requireSession();
    expect(first).toEqual({ userId: USER_ID, issuedAt: mocks.session.issuedAt, sessionVersion: 3, account: { id: USER_ID, username: "tester", isOwner: false, hasRecoveryCode: true } });
    expect(JSON.stringify(first)).not.toContain("opaque");
    mocks.select.mockResolvedValueOnce([{ ...account, sessionVersion: 4 }]);
    await expect(requireSession()).rejects.toBeInstanceOf(AuthError);
    expect(mocks.select).toHaveBeenCalledTimes(2);
    mocks.select.mockResolvedValueOnce([]);
    expect(await getAuthStatus()).toBe("unauthenticated");
  });
  it("fails closed when the account database fails", async () => {
    mocks.session = { userId: USER_ID, issuedAt: Date.now(), sessionVersion: 3 };
    mocks.select.mockRejectedValue(new Error("database unavailable"));
    await expect(requireSession()).rejects.toThrow("database unavailable");
  });
  it("issues encrypted HTTP-only cookies and removes all retired session fields", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const save = vi.fn().mockResolvedValue(undefined);
    mocks.session = { authenticated: true, authVersion: "old", save };
    await createAccountSession({ id: USER_ID, sessionVersion: 4 });
    expect(mocks.session).toMatchObject({ userId: USER_ID, sessionVersion: 4 });
    expect(mocks.session).not.toHaveProperty("authenticated");
    expect(mocks.session).not.toHaveProperty("authVersion");
    expect(save).toHaveBeenCalledOnce();
    await getSession();
    expect(mocks.getIronSession.mock.calls[0][1]).toMatchObject({ ttl: 604800, cookieOptions: { secure: true, httpOnly: true, sameSite: "lax", path: "/" } });
  });
});

describe("persistent account and IP throttles", () => {
  it("ignores local spoofed forwarding headers and hashes trusted Vercel addresses", async () => {
    mocks.requestHeaders.set("x-forwarded-for", "1.2.3.4");
    const local = await loginBucket();
    mocks.requestHeaders.set("x-forwarded-for", "9.9.9.9");
    expect(await loginBucket()).toBe(local);
    vi.stubEnv("VERCEL", "1");
    mocks.requestHeaders.set("x-vercel-forwarded-for", "1.2.3.4");
    const first = await loginBucket();
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("1.2.3.4");
    mocks.requestHeaders.set("x-vercel-forwarded-for", "1.2.3.5");
    expect(await loginBucket()).not.toBe(first);
  });
  it("uses conflict-guarded atomic reservations with distinct policies", async () => {
    await reserveAuthAttempt("login", "tester");
    const dialect = new PgDialect();
    const queries = mocks.execute.mock.calls.map(([value]) => dialect.sqlToQuery(value));
    expect(queries).toHaveLength(2);
    expect(queries[0].sql).toMatch(/ON CONFLICT[\s\S]*WHERE[\s\S]*RETURNING attempts/);
    expect(queries[0].params).toContain(30);
    expect(queries[1].params).toContain(10);
    expect(queries[1].params[0]).toBe(accountBucket("login", "tester"));
    expect(queries[1].params[0]).not.toContain("tester");
    mocks.execute.mockClear();
    await reserveAuthAttempt("register");
    const signup = dialect.sqlToQuery(mocks.execute.mock.calls[0][0]);
    expect(signup.params).toContain(3600);
    expect(signup.params).toContain(10);
  });
  it("denies when either account or IP reservation is exhausted", async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [{ attempts: 2 }] }).mockResolvedValueOnce({ rows: [] });
    expect(await reserveAuthAttempt("login", "tester")).toBe(false);
    mocks.execute.mockResolvedValueOnce({ rows: [] });
    expect(await reserveLoginAttempt("hashed-ip")).toBe(false);
  });
  it("never clears an IP budget after a successful login", async () => {
    await clearLoginAttempts("login:ip:opaque");
    expect(mocks.deleted).not.toHaveBeenCalled();
    await clearLoginAttempts(accountBucket("login", "tester"));
    expect(mocks.deleted).toHaveBeenCalledOnce();
  });
});
