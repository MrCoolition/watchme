import { z } from "zod";

export const usernameSchema = z.string().trim().toLowerCase().min(3, "Use a username with 3–24 letters, numbers, or underscores.").max(24, "Use a username with 3–24 letters, numbers, or underscores.").regex(/^[a-z0-9_]+$/, "Use letters, numbers, and underscores for your username.");
export const newPassphraseSchema = z.string().min(15, "Choose a passphrase with at least 15 characters.").max(1024, "Keep your passphrase under 1025 characters.");
export const loginInputSchema = z.object({ username: usernameSchema, passphrase: z.string().min(1).max(1024) }).strict();
export const registrationInputSchema = z.object({ username: usernameSchema, passphrase: newPassphraseSchema }).strict();
export const recoveryInputSchema = z.object({ username: usernameSchema, recoveryCode: z.string().min(1).max(80), passphrase: newPassphraseSchema }).strict();
export const changePassphraseInputSchema = z.object({ currentPassphrase: z.string().min(1).max(1024), passphrase: newPassphraseSchema }).strict();
export const recoveryRegenerationInputSchema = z.object({ passphrase: z.string().min(1).max(1024) }).strict();
/** Invalid input shares one account throttle bucket rather than creating unbounded arbitrary keys. */
export function throttleUsername(input: unknown): string {
  const raw = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>).username : undefined;
  const parsed = usernameSchema.safeParse(raw);
  return parsed.success ? parsed.data : "invalid";
}
