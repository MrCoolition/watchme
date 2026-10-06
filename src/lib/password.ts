import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const LEGACY_FORMAT = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/i;
const CURRENT_FORMAT = /^scrypt:v1:131072:8:1:([a-f0-9]{32}):([a-f0-9]{128})$/i;
const PARAMETERS = { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 } as const;
// An absent username takes the same current KDF path; this value is never an account credential.
export const DUMMY_PASSWORD_HASH = `scrypt:v1:131072:8:1:${"a7".repeat(16)}:${"39".repeat(64)}`;
function derive(passphrase: string, salt: string, legacy = false): Promise<Buffer> {
  return new Promise((resolve, reject) => scrypt(passphrase, salt, 64, legacy ? { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } : PARAMETERS, (error, key) => error ? reject(error) : resolve(key)));
}
export function isPasswordHash(value: string | undefined): value is string {
  return Boolean(value && (CURRENT_FORMAT.test(value) || LEGACY_FORMAT.test(value)));
}
export function passwordNeedsUpgrade(value: string): boolean { return LEGACY_FORMAT.test(value); }
async function encodePassword(passphrase: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = await derive(passphrase, salt);
  return `scrypt:v1:131072:8:1:${salt}:${hash.toString("hex")}`;
}
export async function hashPassword(passphrase: string): Promise<string> {
  if (typeof passphrase !== "string" || passphrase.length < 15 || passphrase.length > 1024) throw new Error("Choose a passphrase between 15 and 1024 characters.");
  return encodePassword(passphrase);
}
/** Only used after verifying an existing credential; shorter legacy credentials are never newly registered. */
export async function upgradePasswordHash(passphrase: string): Promise<string> {
  if (typeof passphrase !== "string" || !passphrase.length || passphrase.length > 1024) throw new Error("Invalid existing credential.");
  return encodePassword(passphrase);
}
export async function verifyPassword(passphrase: string, encoded: string): Promise<boolean> {
  const current = CURRENT_FORMAT.exec(encoded), legacy = LEGACY_FORMAT.exec(encoded);
  const match = current || legacy;
  if (!match || typeof passphrase !== "string" || passphrase.length > 1024) return false;
  const actual = await derive(passphrase, match[1], !current);
  return timingSafeEqual(actual, Buffer.from(match[2], "hex"));
}
export function generateRecoveryCode(): string {
  return randomBytes(24).toString("hex").toUpperCase().match(/.{8}/g)!.join("-");
}
function normalizeRecoveryCode(value: string): string | null {
  if (typeof value !== "string" || value.length > 80) return null;
  const code = value.replace(/[-\s]/g, "").toLowerCase();
  return /^[a-f0-9]{48}$/.test(code) ? code : null;
}
export function hashRecoveryCode(code: string): string {
  const normalized = normalizeRecoveryCode(code);
  if (!normalized) throw new Error("Invalid recovery code.");
  return `sha256:${createHash("sha256").update(`watchme-recovery-v1:${normalized}`).digest("hex")}`;
}
export function verifyRecoveryCode(code: string, encoded: string | null | undefined): boolean {
  const normalized = normalizeRecoveryCode(code);
  const validHash = typeof encoded === "string" && /^sha256:[a-f0-9]{64}$/.test(encoded);
  // Always compare equal-length digests, including missing/invalid stored codes.
  const actual = createHash("sha256").update(`watchme-recovery-v1:${normalized || "invalid"}`).digest();
  const expected = Buffer.from(validHash ? encoded.slice(7) : "0".repeat(64), "hex");
  return timingSafeEqual(actual, expected) && Boolean(normalized && validHash);
}
