import assert from 'node:assert/strict';
import { neon } from '@neondatabase/serverless';
import { sealData } from 'iron-session';

/** Regression checks use the existing owner's current session version, never a legacy shared session. */
export async function ownerVerificationSession(schema) {
  assert.ok(['watchme', 'watchme_preview', 'watchme_dev'].includes(schema));
  assert.ok(process.env.neon_connect && process.env.SESSION_SECRET);
  const sql = neon(process.env.neon_connect);
  const [account] = await sql.query(`SELECT id, session_version FROM "${schema}".accounts WHERE id = $1 AND is_owner = true`, ['00000000-0000-4000-8000-000000000001']);
  assert.ok(account, 'Owner migration must be completed before deployed regression checks.');
  return sealData({ userId: account.id, sessionVersion: account.session_version, issuedAt: Date.now() }, { password: process.env.SESSION_SECRET, ttl: 3600 });
}
