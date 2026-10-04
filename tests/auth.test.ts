import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ session: {} as { authenticated?: boolean; issuedAt?: number; authVersion?: string }, execute: vi.fn(), requestHeaders: new Headers(), getIronSession: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: vi.fn().mockResolvedValue({}), headers: () => mocks.requestHeaders }));
vi.mock("iron-session", () => ({ getIronSession: mocks.getIronSession }));
vi.mock("../src/lib/db", () => ({ getDb: () => ({ execute: mocks.execute }) }));
import { AuthError, SetupRequiredError, authVersion, getAuthStatus, getSession, isSessionValid, loginBucket, requireSession, reserveLoginAttempt } from "../src/lib/auth";

beforeEach(() => {
  vi.stubEnv("neon_connect", "postgresql://test.invalid/test");
  vi.stubEnv("WATCHME_PASSWORD_HASH", `scrypt:${"a".repeat(32)}:${"b".repeat(128)}`);
  vi.stubEnv("SESSION_SECRET", "test-only-session-secret-at-least-32-characters");
  vi.stubEnv("VERCEL", "");
  mocks.session = {};
  mocks.requestHeaders = new Headers();
  mocks.getIronSession.mockReset().mockImplementation(async () => mocks.session);
  mocks.execute.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); });

describe("session authorization", () => {
  it("fails closed before reading cookies when setup is incomplete", async () => {
    vi.stubEnv("neon_connect", "");
    expect(await getAuthStatus()).toBe("setup-required");
    await expect(requireSession()).rejects.toBeInstanceOf(SetupRequiredError);
    expect(mocks.getIronSession).not.toHaveBeenCalled();
  });
  it("rejects missing, expired, future, or password-rotated sessions", async () => {
    expect(await getAuthStatus()).toBe("unauthenticated");
    await expect(requireSession()).rejects.toBeInstanceOf(AuthError);
    const valid = { authenticated: true, issuedAt: Date.now(), authVersion: authVersion() };
    expect(isSessionValid(valid)).toBe(true);
    expect(isSessionValid({ ...valid, issuedAt: Date.now() - 8 * 24 * 60 * 60 * 1000 })).toBe(false);
    expect(isSessionValid({ ...valid, issuedAt: Date.now() + 60_000 })).toBe(false);
    expect(isSessionValid({ ...valid, authVersion: "previous-password-version" })).toBe(false);
    mocks.session = valid;
    expect(await getAuthStatus()).toBe("authenticated");
    await expect(requireSession()).resolves.toEqual(valid);
  });
  it("uses encrypted HTTP-only production cookies with a bounded lifetime", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await getSession();
    expect(mocks.getIronSession.mock.calls[0][1]).toMatchObject({ ttl: 604800, cookieOptions: { secure: true, httpOnly: true, sameSite: "lax", path: "/" } });
  });
});
describe("login throttle boundary", () => {
  it("ignores spoofable local forwarding headers and hashes trusted Vercel addresses", async () => {
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
  it("only permits attempts for which Postgres returns a reservation", async () => {
    mocks.execute.mockResolvedValueOnce({ rows: [{ attempts: 5 }] }).mockResolvedValueOnce({ rows: [] });
    expect(await reserveLoginAttempt("hashed-ip")).toBe(true);
    expect(await reserveLoginAttempt("hashed-ip")).toBe(false);
  });
});
