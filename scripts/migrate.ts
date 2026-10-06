import { neon } from "@neondatabase/serverless";
import { getSchemaName } from "../src/lib/schema";
import { accountMigrationStatements } from "../src/lib/account-migration";
import { isPasswordHash } from "../src/lib/password";

async function migrate() {
  const connection = process.env.neon_connect;
  if (!connection) throw new Error("Set neon_connect before running the database migration.");
  const schema = getSchemaName();
  const sql = neon(connection);
  // Confirm connectivity and inspect existing schemas before creating only Watchme-owned objects.
  await sql`SELECT 1 AS connected`;
  const existing = await sql`SELECT schema_name FROM information_schema.schemata WHERE schema_name IN ('watchme', 'watchme_preview', 'watchme_dev')`;
  console.log(`Connected. Target: ${schema}. Existing Watchme schemas: ${existing.map((row) => row.schema_name).join(", ") || "none"}.`);
  const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema = ${schema}`;
  console.log(`Existing target tables: ${tables.map(row => row.table_name).join(", ") || "none"}.`);
  const hash = process.env.WATCHME_PASSWORD_HASH;
  if (hash && !isPasswordHash(hash)) throw new Error("The initial owner hash is invalid.");
  const statements = accountMigrationStatements(schema, hash);
  await sql.transaction(statements.map(statement => sql.query(statement.query, statement.params ?? [])));
  console.log(`Watchme migration complete in ${schema}.`);
}
migrate().catch(() => { console.error("Migration failed. Check database connectivity, schema permissions, and neon_connect. Connection details are intentionally omitted."); process.exitCode = 1; });
