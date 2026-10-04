import { neon } from "@neondatabase/serverless";
import { getSchemaName } from "../src/lib/schema";

async function migrate() {
  const connection = process.env.neon_connect;
  if (!connection) throw new Error("Set neon_connect before running the database migration.");
  const schema = getSchemaName();
  const sql = neon(connection);
  // Confirm connectivity and inspect existing schemas before creating only Watchme-owned objects.
  await sql`SELECT 1 AS connected`;
  const existing = await sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('watchme', 'watchme_preview', 'watchme_dev')`;
  console.log(`Connected. Target: ${schema}. Existing Watchme schemas: ${existing.map((row) => row.schema_name).join(", ") || "none"}.`);
  // schema is from the strict server-side allowlist; no user-controlled SQL identifiers are accepted.
  const target = `"${schema}"`;
  await sql.transaction([
    sql.query(`CREATE SCHEMA IF NOT EXISTS ${target}`),
    sql.query(`CREATE TABLE IF NOT EXISTS ${target}.watches (
      id uuid PRIMARY KEY, name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
      design jsonb NOT NULL, favorite boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
    )`),
    sql.query(`CREATE TABLE IF NOT EXISTS ${target}.preferences (
      id integer PRIMARY KEY CHECK (id = 1), value jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
    )`),
    sql.query(`CREATE TABLE IF NOT EXISTS ${target}.login_attempts (
      bucket text PRIMARY KEY, attempts integer NOT NULL CHECK (attempts > 0), window_start timestamptz NOT NULL
    )`),
    sql.query(`CREATE INDEX IF NOT EXISTS watches_updated_at_idx ON ${target}.watches(updated_at DESC)`),
    sql.query(`CREATE INDEX IF NOT EXISTS login_attempts_window_idx ON ${target}.login_attempts(window_start)`),
  ]);
  console.log(`Watchme migration complete in ${schema}.`);
}
migrate().catch(() => { console.error("Migration failed. Check database connectivity, schema permissions, and neon_connect. Connection details are intentionally omitted."); process.exitCode = 1; });
