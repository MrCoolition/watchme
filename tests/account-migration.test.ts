import { describe, expect, it } from "vitest";
import { accountMigrationStatements, finalOwnerImportStatements, PERSONAL_COLLECTIONS_MIGRATION } from "../src/lib/account-migration";
import { OWNER_ACCOUNT_ID, OWNER_USERNAME } from "../src/lib/account-constants";

describe("additive personal collection migration", () => {
  const hash = `scrypt:${"a".repeat(32)}:${"b".repeat(128)}`;
  it("uses isolated personal tables, scoped foreign keys, an advisory lock and idempotent ledger", () => {
    const statements = accountMigrationStatements("watchme_preview", hash);
    const query = statements.map(item => item.query).join("\n");
    expect(statements[0].query).toContain("pg_advisory_xact_lock");
    expect(query).toContain('CREATE TABLE IF NOT EXISTS "watchme_preview".user_watches');
    expect(query).toContain('CREATE TABLE IF NOT EXISTS "watchme_preview".user_preferences');
    expect(query).toContain('REFERENCES "watchme_preview".accounts(id)');
    expect(query).toContain("user_id uuid PRIMARY KEY");
    expect(query).toContain("user_id, updated_at DESC");
    expect(query).toContain(PERSONAL_COLLECTIONS_MIGRATION);
    expect(query).not.toMatch(/DROP|TRUNCATE|DELETE FROM/i);
    expect(query).not.toMatch(/INSERT INTO "watchme_preview"\.(watches|preferences)\s/);
  });
  it("seeds only the reserved owner without printing, replacing or resetting account secrets", () => {
    const statements = accountMigrationStatements("watchme_dev", hash);
    const seed = statements.find(statement => statement.query.startsWith('INSERT INTO "watchme_dev".accounts'))!;
    expect(seed.params).toEqual([OWNER_ACCOUNT_ID, OWNER_USERNAME, hash]);
    expect(seed.query).not.toContain(hash);
    expect(seed.query).toContain("ON CONFLICT (id) DO NOTHING");
    expect(statements.map(item => item.query).join("\n")).not.toContain("SET password_hash");
    expect(accountMigrationStatements("watchme_dev").some(statement => statement.query.startsWith('INSERT INTO "watchme_dev".accounts'))).toBe(false);
  });
  it("initially copies the original IDs only to the owner and never reseeds deleted personal data on reruns", () => {
    const queries = accountMigrationStatements("watchme", hash).filter(statement => statement.query.startsWith('INSERT INTO "watchme".user_'));
    expect(queries).toHaveLength(2);
    for (const { query } of queries) {
      expect(query).toContain(OWNER_ACCOUNT_ID);
      expect(query).toContain("is_owner = true AND legacy_imported_at IS NULL");
      expect(query).toContain("NOT EXISTS (SELECT 1 FROM");
      expect(query).toContain("migration_ledger");
      expect(query).toContain("DO NOTHING");
    }
    expect(queries[0].query).toContain(`SELECT id, '${OWNER_ACCOUNT_ID}', name, design, favorite, created_at, updated_at`);
  });
  it("finalizes the legacy cutover atomically behind the same lock and a permanent per-owner gate", () => {
    const statements = finalOwnerImportStatements("watchme");
    expect(statements[0].query).toBe(accountMigrationStatements("watchme")[0].query);
    for (const statement of statements.slice(1)) {
      expect(statement.query).toContain(OWNER_ACCOUNT_ID);
      expect(statement.query).toContain("legacy_imported_at IS NULL");
    }
    expect(statements[1].query).toMatch(/^DELETE FROM "watchme"\.user_watches WHERE user_id =/);
    expect(statements[1].query).toContain("NOT EXISTS (SELECT 1 FROM");
    expect(statements[2].query).toContain("DO UPDATE SET name = EXCLUDED.name");
    expect(statements[2].query).toContain(`WHERE user_watches.user_id = '${OWNER_ACCOUNT_ID}'`);
    expect(statements.at(-1)!.query).toContain("SET legacy_imported_at = now()");
    expect(statements.some(statement => /DELETE FROM "watchme"\.(watches|preferences)\s/.test(statement.query))).toBe(false);
  });
  it("rejects arbitrary schema names before producing raw SQL", () => {
    for (const schema of ["public", "", 'watchme"; DROP TABLE accounts;--']) {
      expect(() => accountMigrationStatements(schema, hash)).toThrow();
      expect(() => finalOwnerImportStatements(schema)).toThrow();
    }
  });
});
