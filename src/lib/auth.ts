import "server-only";
import { createHash, createHmac } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getIronSession } from "iron-session";
import { eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { getSchemaName, loginAttempts } from "./schema";
import { isPasswordHash } from "./password";

export class AuthError extends Error {
  constructor() { super("Your studio is locked. Sign in to continue."); }
}
export class SetupRequiredError extends Error {
  constructor() { super("Private studio setup is required."); }
}
interface SessionData { authenticated?: boolean; issuedAt?: number; authVersion?: string; }
const SESSION_SECONDS = 7 * 24 * 60 * 60;
export function isConfigured(): boolean {
  return Boolean(process.env.neon_connect && isPasswordHash(process.env.WATCHME_PASSWORD_HASH) && process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32);
}
export function authVersion(): string {
  return createHash("sha256").update(process.env.WATCHME_PASSWORD_HASH ?? "").digest("hex");
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
export function isSessionValid(session: SessionData): boolean {
  return session.authenticated === true && session.authVersion === authVersion() && typeof session.issuedAt === "number" && session.issuedAt <= Date.now() && Date.now() - session.issuedAt < SESSION_SECONDS * 1000;
}
export async function requireSession() {
  const session = await getSession();
  if (!isSessionValid(session)) throw new AuthError();
  return session;
}
export async function getAuthStatus(): Promise<"setup-required" | "authenticated" | "unauthenticated"> {
  if (!isConfigured()) return "setup-required";
  return isSessionValid(await getSession()) ? "authenticated" : "unauthenticated";
}
export async function loginBucket(): Promise<string> {
  const requestHeaders = await headers();
  // Vercel supplies this trusted header. Outside Vercel, use a shared bucket rather than trusting client headers.
  const address = process.env.VERCEL ? requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() || "unknown" : "local";
  return createHmac("sha256", process.env.SESSION_SECRET!).update(address).digest("hex");
}
export async function reserveLoginAttempt(bucket: string): Promise<boolean> {
  // Reserve before hashing. The conflict WHERE makes concurrent attempts share a hard five-attempt limit.
  const result = await getDb().execute(sql`
    INSERT INTO ${loginAttempts} (bucket, attempts, window_start) VALUES (${bucket}, 1, now())
    ON CONFLICT (bucket) DO UPDATE SET
      attempts = CASE WHEN ${loginAttempts.windowStart} <= now() - interval '15 minutes' THEN 1 ELSE ${loginAttempts.attempts} + 1 END,
      window_start = CASE WHEN ${loginAttempts.windowStart} <= now() - interval '15 minutes' THEN now() ELSE ${loginAttempts.windowStart} END
    WHERE ${loginAttempts.windowStart} <= now() - interval '15 minutes' OR ${loginAttempts.attempts} < 5
    RETURNING attempts
  `);
  return result.rows.length > 0;
}
export async function clearLoginAttempts(bucket: string): Promise<void> {
  await getDb().delete(loginAttempts).where(eq(loginAttempts.bucket, bucket));
}
