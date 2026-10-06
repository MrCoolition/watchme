import { scryptSync } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateRecoveryCode, hashPassword, hashRecoveryCode, isPasswordHash, passwordNeedsUpgrade, upgradePasswordHash, verifyPassword, verifyRecoveryCode } from "../src/lib/password";
import { loginInputSchema, newPassphraseSchema, registrationInputSchema, throttleUsername, usernameSchema } from "../src/lib/account-validation";

describe("account credentials", () => {
  it("canonicalizes usernames without silently weakening new passphrases", () => {
    expect(usernameSchema.parse("  Moon_Walker3  ")).toBe("moon_walker3");
    for (const username of ["ab", "x".repeat(25), "moon walker", "moon@example.com", "<script>", "josé"]) expect(usernameSchema.safeParse(username).success).toBe(false);
    expect(newPassphraseSchema.safeParse("a".repeat(14)).success).toBe(false);
    expect(newPassphraseSchema.safeParse("a".repeat(15)).success).toBe(true);
    expect(newPassphraseSchema.safeParse("a".repeat(1024)).success).toBe(true);
    expect(newPassphraseSchema.safeParse("a".repeat(1025)).success).toBe(false);
    expect(loginInputSchema.safeParse({ username: "coolition", passphrase: "legacy-short" }).success).toBe(true);
    expect(registrationInputSchema.safeParse({ username: "tester", passphrase: "legacy-short" }).success).toBe(false);
    expect(registrationInputSchema.safeParse({ username: "tester", passphrase: "very long passphrase", isOwner: true }).success).toBe(false);
    expect(throttleUsername({ username: "BAD NAME" })).toBe("invalid");
  });
  it("verifies legacy hashes read-only and upgrades an existing short credential to explicit modern parameters", async () => {
    const passphrase = "legacy-short", salt = "a1".repeat(16);
    const legacy = `scrypt:${salt}:${scryptSync(passphrase, salt, 64).toString("hex")}`;
    expect(isPasswordHash(legacy)).toBe(true);
    expect(passwordNeedsUpgrade(legacy)).toBe(true);
    expect(await verifyPassword(passphrase, legacy)).toBe(true);
    expect(await verifyPassword("wrong passphrase", legacy)).toBe(false);
    const upgraded = await upgradePasswordHash(passphrase);
    expect(upgraded).toMatch(/^scrypt:v1:131072:8:1:[a-f0-9]{32}:[a-f0-9]{128}$/);
    expect(passwordNeedsUpgrade(upgraded)).toBe(false);
    expect(await verifyPassword(passphrase, upgraded)).toBe(true);
    expect(await verifyPassword("wrong passphrase", upgraded)).toBe(false);
    expect(isPasswordHash(upgraded.replace(":131072:", ":1048576:"))).toBe(false);
    await expect(hashPassword(passphrase)).rejects.toThrow("15");
  }, 15_000);
  it("generates independent 192-bit recovery secrets and stores only normalized digests", () => {
    const first = generateRecoveryCode(), second = generateRecoveryCode();
    expect(first).toMatch(/^[A-F0-9]{8}(?:-[A-F0-9]{8}){5}$/);
    expect(first).not.toEqual(second);
    const encoded = hashRecoveryCode(first);
    expect(encoded).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(encoded).not.toContain(first);
    expect(verifyRecoveryCode(first.toLowerCase().replace(/-/g, " "), encoded)).toBe(true);
    expect(verifyRecoveryCode(second, encoded)).toBe(false);
    expect(verifyRecoveryCode(first, null)).toBe(false);
    expect(verifyRecoveryCode("bad code", encoded)).toBe(false);
    expect(verifyRecoveryCode(first, "corrupt hash")).toBe(false);
    expect(() => hashRecoveryCode("bad code")).toThrow();
  });
});
