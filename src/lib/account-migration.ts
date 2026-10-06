import { OWNER_ACCOUNT_ID, OWNER_USERNAME } from "./account-constants";

export interface MigrationStatement { query: string; params?: string[]; }
export const PERSONAL_COLLECTIONS_MIGRATION = "personal-collections-v1";

function schemaTarget(schema: string): string {
  if (!["watchme", "watchme_preview", "watchme_dev"].includes(schema)) throw new Error("Choose a WATCHMÉ schema.");
  return `"${schema}"`;
}
function importGate(target: string): string {
  return `EXISTS (SELECT 1 FROM ${target}.accounts WHERE id = '${OWNER_ACCOUNT_ID}' AND is_owner = true AND legacy_imported_at IS NULL)`;
}
function ownerCopy(target: string, gate: string, update: boolean): MigrationStatement[] {
  return [
    { query: `INSERT INTO ${target}.user_watches (id, user_id, name, design, favorite, created_at, updated_at)
      SELECT id, '${OWNER_ACCOUNT_ID}', name, design, favorite, created_at, updated_at FROM ${target}.watches WHERE ${gate}
      ON CONFLICT (id) ${update ? `DO UPDATE SET name = EXCLUDED.name, design = EXCLUDED.design, favorite = EXCLUDED.favorite, created_at = EXCLUDED.created_at, updated_at = EXCLUDED.updated_at WHERE user_watches.user_id = '${OWNER_ACCOUNT_ID}'` : "DO NOTHING"}` },
    { query: `INSERT INTO ${target}.user_preferences (user_id, value, updated_at)
      SELECT '${OWNER_ACCOUNT_ID}', value, updated_at FROM ${target}.preferences WHERE id = 1 AND ${gate}
      ON CONFLICT (user_id) ${update ? "DO UPDATE SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at" : "DO NOTHING"}` },
  ];
}

/** All statements run in one Neon transaction. Tables remain separate from the old deployment. */
export function accountMigrationStatements(schema: string, ownerPasswordHash?: string): MigrationStatement[] {
  const target = schemaTarget(schema);
  const initialGate = `${importGate(target)} AND NOT EXISTS (SELECT 1 FROM ${target}.migration_ledger WHERE name = '${PERSONAL_COLLECTIONS_MIGRATION}')`;
  return [
    { query: `SELECT pg_advisory_xact_lock(hashtext('watchme:${schema}:personal-collections'))` },
    { query: `CREATE SCHEMA IF NOT EXISTS ${target}` },
    // Keep legacy objects for rollback and the final, explicitly owned import. Never copy new users back.
    { query: `CREATE TABLE IF NOT EXISTS ${target}.watches (
      id uuid PRIMARY KEY, name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60), design jsonb NOT NULL,
      favorite boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())` },
    { query: `CREATE TABLE IF NOT EXISTS ${target}.preferences (id integer PRIMARY KEY CHECK (id = 1), value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())` },
    { query: `CREATE TABLE IF NOT EXISTS ${target}.login_attempts (bucket text PRIMARY KEY, attempts integer NOT NULL CHECK (attempts > 0), window_start timestamptz NOT NULL)` },
    { query: `CREATE TABLE IF NOT EXISTS ${target}.migration_ledger (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())` },
    { query: `CREATE TABLE IF NOT EXISTS ${target}.accounts (
      id uuid PRIMARY KEY, username text UNIQUE NOT NULL CHECK (username ~ '^[a-z0-9_]{3,24}$'), password_hash text NOT NULL,
      recovery_code_hash text, session_version integer NOT NULL DEFAULT 1 CHECK (session_version > 0), is_owner boolean NOT NULL DEFAULT false,
      legacy_imported_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())` },
    { query: `CREATE UNIQUE INDEX IF NOT EXISTS accounts_single_owner_idx ON ${target}.accounts(is_owner) WHERE is_owner = true` },
    { query: `CREATE TABLE IF NOT EXISTS ${target}.user_watches (
      id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES ${target}.accounts(id) ON DELETE CASCADE,
      name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60), design jsonb NOT NULL, favorite boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())` },
    { query: `CREATE TABLE IF NOT EXISTS ${target}.user_preferences (
      user_id uuid PRIMARY KEY REFERENCES ${target}.accounts(id) ON DELETE CASCADE, value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now())` },
    { query: `CREATE INDEX IF NOT EXISTS user_watches_owner_updated_idx ON ${target}.user_watches(user_id, updated_at DESC)` },
    { query: `CREATE INDEX IF NOT EXISTS login_attempts_window_idx ON ${target}.login_attempts(window_start)` },
    ...(ownerPasswordHash ? [{ query: `INSERT INTO ${target}.accounts (id, username, password_hash, is_owner) VALUES ($1, $2, $3, true) ON CONFLICT (id) DO NOTHING`, params: [OWNER_ACCOUNT_ID, OWNER_USERNAME, ownerPasswordHash] }] : []),
    ...ownerCopy(target, initialGate, false),
    { query: `INSERT INTO ${target}.migration_ledger (name) VALUES ('${PERSONAL_COLLECTIONS_MIGRATION}') ON CONFLICT (name) DO NOTHING` },
  ];
}

/** Reconcile the old deployment's last edits once, before this owner's first collection operation. */
export function finalOwnerImportStatements(schema: string): MigrationStatement[] {
  const target = schemaTarget(schema);
  const gate = importGate(target);
  return [
    { query: `SELECT pg_advisory_xact_lock(hashtext('watchme:${schema}:personal-collections'))` },
    // Initial-copy rows deleted in the old studio during deployment must not reappear at cutover.
    { query: `DELETE FROM ${target}.user_watches WHERE user_id = '${OWNER_ACCOUNT_ID}' AND ${gate}
      AND NOT EXISTS (SELECT 1 FROM ${target}.watches legacy WHERE legacy.id = user_watches.id)` },
    ...ownerCopy(target, gate, true),
    { query: `UPDATE ${target}.accounts SET legacy_imported_at = now(), updated_at = now()
      WHERE id = '${OWNER_ACCOUNT_ID}' AND is_owner = true AND legacy_imported_at IS NULL` },
  ];
}
