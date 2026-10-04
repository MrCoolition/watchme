import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const deriveKey = promisify(scrypt);
const FORMAT = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/i;
export function isPasswordHash(value: string | undefined): value is string {
  return Boolean(value && FORMAT.test(value));
}
export async function hashPassword(passphrase: string): Promise<string> {
  if (passphrase.length < 12 || passphrase.length > 1024) throw new Error("Choose a passphrase between 12 and 1024 characters.");
  const salt = randomBytes(16).toString("hex");
  const hash = await deriveKey(passphrase, salt, 64) as Buffer;
  return `scrypt:${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(passphrase: string, encoded: string): Promise<boolean> {
  const match = FORMAT.exec(encoded);
  if (!match || typeof passphrase !== "string" || passphrase.length > 1024) return false;
  const actual = await deriveKey(passphrase, match[1], 64) as Buffer;
  return timingSafeEqual(actual, Buffer.from(match[2], "hex"));
}
