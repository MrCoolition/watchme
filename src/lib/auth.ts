import "server-only";
import { createHmac } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getIronSession } from "iron-session";
import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { accounts, getSchemaName, loginAttempts } from "./schema";
import type { AccountSummary } from "./types";

export class AuthError extends Error {
  constructor() { super("Your studio is locked. Sign in to continue."); }
}
export class SetupRequiredError extends Error {
  constructor() { super("Studio setup is required."); }
}
export interface SessionData { userId?: string; issuedAt?: number; sessionVersion?: number; }
export interface AuthorizedSession { userId: string; issuedAt: number; sessionVersion: number; account: AccountSummary; }
const SESSION_SECONDS = 7 * 24 * 60 * 60;
export function isConfigured(): boolean {
  return Boolean(process.env.neon_connect && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
}
export async function getSession() {
  if (!isConfigured()) throw new SetupRequiredError();
  return getIronSession<SessionData>(await cookies(), {
    password: process.env.SESSION_SECRET!,
    cookieName: `watchme_${getSchemaName()}_session`,
    ttl: SESSION_SECONDS,
    cookieOptions: { secure: process.env.NODE_ENV === "production", httpOnly: true, sameSite: "lax", path: "/" },
  });
}
/** Cookie shape/age only. Every authorization additionally checks the account's live DB version. */
export function isSessionValid(session: SessionData): boolean {
  return typeof session.userId === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(session.userId)
    && Number.isSafeInteger(session.sessionVersion) && session.sessionVersion! >= 1
    && typeof session.issuedAt === "number" && Number.isFinite(session.issuedAt)
    && session.issuedAt <= Date.now() && Date.now() - session.issuedAt < SESSION_SECONDS * 1000;
}
export async function requireSession(): Promise<AuthorizedSession> {
  const session = await getSession();
  if (!isSessionValid(session)) throw new AuthError();
  // Never trust a cookie's account identity or version without a current database record.
  const [account] = await getDb().select({ id: accounts.id, username: accounts.username, isOwner: accounts.isOwner, recoveryCodeHash: accounts.recoveryCodeHash, sessionVersion: accounts.sessionVersion }).from(accounts).where(eq(accounts.id, session.userId!)).limit(1);
  if (!account || account.sessionVersion !== session.sessionVersion) throw new AuthError();
  return { userId: account.id, issuedAt: session.issuedAt!, sessionVersion: account.sessionVersion, account: { id: account.id, username: account.username, isOwner: account.isOwner, hasRecoveryCode: Boolean(account.recoveryCodeHash) } };
}
export async function getAuthStatus(): Promise<"setup-required" | "authenticated" | "unauthenticated"> {
  if (!isConfigured()) return "setup-required";
  try { await requireSession(); return "authenticated"; }
  catch (error) { if (error instanceof AuthError) return "unauthenticated"; throw error; }
}
export async function createAccountSession(account: { id: string; sessionVersion: number }): Promise<void> {
  const session = await getSession();
  // Remove every previous payload field, including the retired shared-passphrase authorization.
  for (const key of Object.keys(session)) if (!["save", "destroy", "updateConfig"].includes(key)) delete (session as unknown as Record<string, unknown>)[key];
  session.userId = account.id;
  session.sessionVersion = account.sessionVersion;
  session.issuedAt = Date.now();
  await session.save();
}
export async function loginBucket(): Promise<string> {
  const requestHeaders = await headers();
  // Vercel supplies this trusted header. Other hosts share a bucket instead of trusting client headers.
  const address = process.env.VERCEL ? requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown" : "local";
  return createHmac("sha256", process.env.SESSION_SECRET!).update(`ip:${address}`).digest("hex");
}
export function accountBucket(operation: string, username: string): string {
  return `${operation}:account:${createHmac("sha256", process.env.SESSION_SECRET!).update(username).digest("hex")}`;
}
export async function reserveLoginAttempt(bucket: string, limit = 10, windowSeconds = 900): Promise<boolean> {
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(windowSeconds) || windowSeconds < 1 || windowSeconds > 86400) throw new Error("Invalid throttle policy.");
  const result = await getDb().execute(sql`
    INSERT INTO ${loginAttempts} (bucket, attempts, window_start) VALUES (${bucket}, 1, now())
    ON CONFLICT (bucket) DO UPDATE SET
      attempts = CASE WHEN ${loginAttempts.windowStart} <= now() - ${windowSeconds} * interval '1 second' THEN 1 ELSE ${loginAttempts.attempts} + 1 END,
      window_start = CASE WHEN ${loginAttempts.windowStart} <= now() - ${windowSeconds} * interval '1 second' THEN now() ELSE ${loginAttempts.windowStart} END
    WHERE ${loginAttempts.windowStart} <= now() - ${windowSeconds} * interval '1 second' OR ${loginAttempts.attempts} < ${limit}
    RETURNING attempts
  `);
  return result.rows.length > 0;
}
export async function reserveAuthAttempt(operation: "login" | "register" | "recover" | "credentials", username?: string): Promise<boolean> {
  const ip = `${operation}:ip:${await loginBucket()}`;
  const windowSeconds = operation === "register" ? 3600 : 900;
  const reservations = [reserveLoginAttempt(ip, operation === "register" ? 10 : 30, windowSeconds)];
  if (username) reservations.push(reserveLoginAttempt(accountBucket(operation, username), operation === "recover" ? 5 : 10, windowSeconds));
  return (await Promise.all(reservations)).every(Boolean);
}
/** Only account-specific login failures reset after success; never clear the shared IP budget. */
export async function clearLoginAttempts(bucket: string): Promise<void> {
  if (!bucket.startsWith("login:account:")) return;
  await getDb().delete(loginAttempts).where(eq(loginAttempts.bucket, bucket));
}
