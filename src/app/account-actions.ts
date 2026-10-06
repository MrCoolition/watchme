"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { AuthError, SetupRequiredError, accountBucket, clearLoginAttempts, createAccountSession, getSession, isConfigured, requireSession, reserveAuthAttempt } from "@/lib/auth";
import { OWNER_ACCOUNT_ID, OWNER_USERNAME } from "@/lib/account-constants";
import { changePassphraseInputSchema, loginInputSchema, recoveryInputSchema, recoveryRegenerationInputSchema, registrationInputSchema, throttleUsername } from "@/lib/account-validation";
import { getDb } from "@/lib/db";
import { accounts } from "@/lib/schema";
import { DUMMY_PASSWORD_HASH, generateRecoveryCode, hashPassword, hashRecoveryCode, isPasswordHash, passwordNeedsUpgrade, upgradePasswordHash, verifyPassword, verifyRecoveryCode } from "@/lib/password";
import type { AccountSummary, ActionResult } from "@/lib/types";

type Account = typeof accounts.$inferSelect;
const LOGIN_ERROR = "That username and passphrase did not unlock your studio.";
const RECOVERY_ERROR = "That username and recovery code could not recover an account.";
const THROTTLE_ERROR = "Too many attempts. Please wait and try again later.";
function failed<T>(error: string): ActionResult<T> { return { ok: false, error }; }
function actionError<T>(error: unknown): ActionResult<T> {
  if (error instanceof AuthError || error instanceof SetupRequiredError) return failed(error.message);
  if (error instanceof z.ZodError) return failed(error.issues[0]?.message || "Please check your details.");
  return failed("Your account is temporarily unavailable. Try again shortly.");
}
function summary(account: Account): AccountSummary {
  return { id: account.id, username: account.username, isOwner: account.isOwner, hasRecoveryCode: Boolean(account.recoveryCodeHash) };
}
async function findAccount(username: string): Promise<Account | undefined> {
  const [account] = await getDb().select().from(accounts).where(eq(accounts.username, username)).limit(1);
  return account;
}
async function dummyVerify(passphrase: unknown): Promise<void> {
  await verifyPassword(typeof passphrase === "string" && passphrase.length <= 1024 ? passphrase : "invalid account credentials", DUMMY_PASSWORD_HASH);
}

export async function login(input: { username: string; passphrase: string }): Promise<ActionResult<null>> {
  try {
    if (!isConfigured()) throw new SetupRequiredError();
    const username = throttleUsername(input);
    if (!await reserveAuthAttempt("login", username)) return failed(THROTTLE_ERROR);
    const parsed = loginInputSchema.safeParse(input);
    if (!parsed.success) { await dummyVerify(input?.passphrase); return failed(LOGIN_ERROR); }
    let account = await findAccount(parsed.data.username);
    // A migration normally seeds this record. This fallback cannot claim or overwrite an existing owner.
    if (!account && parsed.data.username === OWNER_USERNAME && isPasswordHash(process.env.WATCHME_PASSWORD_HASH)) {
      if (!await verifyPassword(parsed.data.passphrase, process.env.WATCHME_PASSWORD_HASH)) { await dummyVerify(parsed.data.passphrase); return failed(LOGIN_ERROR); }
      await getDb().insert(accounts).values({ id: OWNER_ACCOUNT_ID, username: OWNER_USERNAME, passwordHash: process.env.WATCHME_PASSWORD_HASH, isOwner: true }).onConflictDoNothing();
      account = await findAccount(OWNER_USERNAME);
    }
    if (!account) { await dummyVerify(parsed.data.passphrase); return failed(LOGIN_ERROR); }
    if (!await verifyPassword(parsed.data.passphrase, account.passwordHash)) return failed(LOGIN_ERROR);
    if (passwordNeedsUpgrade(account.passwordHash)) {
      const upgraded = await upgradePasswordHash(parsed.data.passphrase);
      const [updated] = await getDb().update(accounts).set({ passwordHash: upgraded, updatedAt: new Date() }).where(and(eq(accounts.id, account.id), eq(accounts.passwordHash, account.passwordHash), eq(accounts.sessionVersion, account.sessionVersion))).returning();
      if (!updated) return failed("Your account changed while signing in. Please try again.");
      account = updated;
    }
    await createAccountSession(account);
    await clearLoginAttempts(accountBucket("login", account.username));
    return { ok: true, data: null };
  } catch (error) { return actionError(error); }
}

export async function register(input: { username: string; passphrase: string }): Promise<ActionResult<{ account: AccountSummary; recoveryCode: string }>> {
  try {
    if (!isConfigured()) throw new SetupRequiredError();
    if (!await reserveAuthAttempt("register")) return failed(THROTTLE_ERROR);
    const value = registrationInputSchema.parse(input);
    if (value.username === OWNER_USERNAME) return failed("That username cannot be used. Choose another.");
    const recoveryCode = generateRecoveryCode();
    const passwordHash = await hashPassword(value.passphrase);
    const [account] = await getDb().insert(accounts).values({ id: randomUUID(), username: value.username, passwordHash, recoveryCodeHash: hashRecoveryCode(recoveryCode), isOwner: false }).onConflictDoNothing().returning();
    if (!account) return failed("That username cannot be used. Choose another.");
    await createAccountSession(account);
    // Do not redirect or revalidate: the UI must display and acknowledge this one-time code first.
    return { ok: true, data: { account: summary(account), recoveryCode } };
  } catch (error) { return actionError(error); }
}

export async function recoverAccount(input: { username: string; recoveryCode: string; passphrase: string }): Promise<ActionResult<{ recoveryCode: string }>> {
  try {
    if (!isConfigured()) throw new SetupRequiredError();
    if (!await reserveAuthAttempt("recover", throttleUsername(input))) return failed(THROTTLE_ERROR);
    const parsed = recoveryInputSchema.safeParse(input);
    if (!parsed.success) {
      const passphraseIssue = parsed.error.issues.find(issue => issue.path[0] === "passphrase");
      return failed(passphraseIssue?.message || RECOVERY_ERROR);
    }
    const value = parsed.data, account = await findAccount(value.username);
    const valid = verifyRecoveryCode(value.recoveryCode, account?.recoveryCodeHash);
    if (!account || !valid) return failed(RECOVERY_ERROR);
    const recoveryCode = generateRecoveryCode();
    const passwordHash = await hashPassword(value.passphrase);
    // One atomic compare-and-swap consumes the old code and invalidates every prior session.
    const [updated] = await getDb().update(accounts).set({ passwordHash, recoveryCodeHash: hashRecoveryCode(recoveryCode), sessionVersion: sql`${accounts.sessionVersion} + 1`, updatedAt: new Date() }).where(and(eq(accounts.id, account.id), eq(accounts.recoveryCodeHash, account.recoveryCodeHash!), eq(accounts.sessionVersion, account.sessionVersion))).returning();
    if (!updated) return failed(RECOVERY_ERROR);
    await createAccountSession(updated);
    return { ok: true, data: { recoveryCode } };
  } catch (error) { return actionError(error); }
}

export async function changePassphrase(input: { currentPassphrase: string; passphrase: string }, expectedAccountId: string): Promise<ActionResult<null>> {
  try {
    const session = await requireSession();
    if (typeof expectedAccountId !== "string" || expectedAccountId !== session.userId) return failed("Your signed-in account changed. Reload the studio before changing its settings.");
    if (!await reserveAuthAttempt("credentials", session.account.username)) return failed(THROTTLE_ERROR);
    const value = changePassphraseInputSchema.parse(input);
    const account = await findAccount(session.account.username);
    if (!account || account.sessionVersion !== session.sessionVersion || !await verifyPassword(value.currentPassphrase, account.passwordHash)) return failed("Your current passphrase did not match.");
    const passwordHash = await hashPassword(value.passphrase);
    const [updated] = await getDb().update(accounts).set({ passwordHash, sessionVersion: sql`${accounts.sessionVersion} + 1`, updatedAt: new Date() }).where(and(eq(accounts.id, session.userId), eq(accounts.passwordHash, account.passwordHash), eq(accounts.sessionVersion, session.sessionVersion))).returning();
    if (!updated) throw new AuthError();
    await createAccountSession(updated);
    return { ok: true, data: null };
  } catch (error) { return actionError(error); }
}

export async function regenerateRecoveryCode(input: { passphrase: string }, expectedAccountId: string): Promise<ActionResult<{ recoveryCode: string }>> {
  try {
    const session = await requireSession();
    if (typeof expectedAccountId !== "string" || expectedAccountId !== session.userId) return failed("Your signed-in account changed. Reload the studio before changing its settings.");
    if (!await reserveAuthAttempt("credentials", session.account.username)) return failed(THROTTLE_ERROR);
    const value = recoveryRegenerationInputSchema.parse(input);
    const account = await findAccount(session.account.username);
    if (!account || account.sessionVersion !== session.sessionVersion || !await verifyPassword(value.passphrase, account.passwordHash)) return failed("Your passphrase did not match.");
    const recoveryCode = generateRecoveryCode();
    const [updated] = await getDb().update(accounts).set({ recoveryCodeHash: hashRecoveryCode(recoveryCode), updatedAt: new Date() }).where(and(eq(accounts.id, session.userId), eq(accounts.passwordHash, account.passwordHash), eq(accounts.sessionVersion, session.sessionVersion), account.recoveryCodeHash ? eq(accounts.recoveryCodeHash, account.recoveryCodeHash) : isNull(accounts.recoveryCodeHash))).returning();
    if (!updated) throw new AuthError();
    return { ok: true, data: { recoveryCode } };
  } catch (error) { return actionError(error); }
}

export async function logout(): Promise<void> {
  // A revoked or expired session must still be able to clear its own cookie.
  const session = await getSession();
  session.destroy();
}
