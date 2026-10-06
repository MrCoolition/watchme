/** Device state belongs to one account, even when people share a browser. */
export function accountStorageKey(accountId: string, legacyKey: string): string {
  return `watchme.account.${accountId}.${legacyKey.replace(/^watchme\./, "")}`;
}

/** Only the original owner can import pre-account state. Copy succeeds before removal. */
export function readAccountStorage(accountId: string, isOwner: boolean, legacyKey: string, aliases: readonly string[] = []): string | null {
  try {
    const key = accountStorageKey(accountId, legacyKey);
    const current = localStorage.getItem(key);
    if (current !== null) return current;
    if (!isOwner) return null;
    for (const oldKey of [legacyKey, ...aliases]) {
      const legacy = localStorage.getItem(oldKey);
      if (legacy === null) continue;
      try { localStorage.setItem(key, legacy); localStorage.removeItem(oldKey); } catch { /* Retain the source when storage is full or blocked. */ }
      return legacy;
    }
  } catch { /* In-memory controls remain available with browser storage disabled. */ }
  return null;
}
