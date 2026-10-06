import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function run(args) {
  const result = spawnSync(process.execPath, args, { stdio: 'inherit', env: process.env });
  if (result.status !== 0) process.exit(result.status || 1);
}
if (process.env.neon_connect && process.env.SESSION_SECRET) {
  run(['--import', 'tsx', 'scripts/migrate.ts']);
} else {
  console.log('Watchme database/session setup is incomplete. Building a locked application; no database changes will run.');
}
run([require.resolve('next/dist/bin/next'), 'build']);
