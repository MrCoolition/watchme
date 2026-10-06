// Start a real Next.js server against the already migrated development schema.
// Credentials stay in the inherited private environment; browser test credentials stay in memory.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';

const require = createRequire(import.meta.url);
const base = 'http://127.0.0.1:3001';
let stage = 'checking local verification setup';

async function main() {
  if (!process.env.neon_connect || !process.env.SESSION_SECRET) throw new Error('Database and session setup is required.');
  try {
    await fetch(base, { signal: AbortSignal.timeout(1500) });
    throw new Error('Port 3001 is already in use.');
  } catch (error) {
    if (error instanceof Error && error.message === 'Port 3001 is already in use.') throw error;
  }
  await mkdir('.setup', { recursive: true });
  await writeFile('.setup/local-accounts.json', JSON.stringify({ url: base, schema: 'watchme_dev' }));
  const server = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', '--hostname', '127.0.0.1', '--port', '3001'], {
    windowsHide: true,
    env: { ...process.env, WATCHME_SCHEMA: 'watchme_dev', VERCEL: '', VERCEL_ENV: '', NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // Discard server diagnostics: a framework stack trace could contain sensitive request values.
  server.stdout.resume(); server.stderr.resume();
  let serverError = false;
  server.on('error', () => { serverError = true; });
  try {
    stage = 'starting the development account server';
    let ready = false;
    for (let attempt = 0; attempt < 90; attempt++) {
      if (serverError || server.exitCode !== null) throw new Error('Next.js exited before readiness.');
      try {
        const response = await fetch(base + '/login', { signal: AbortSignal.timeout(5000) });
        if (response.ok) { ready = true; break; }
      } catch { /* Initial compilation can take several seconds. */ }
      await delay(1000);
    }
    if (!ready) throw new Error('Next.js readiness timed out.');
    stage = 'running real account and collection verification';
    const code = await new Promise((resolve, reject) => {
      const verifier = spawn(process.execPath, ['scripts/verify-accounts.mjs', '.setup/local-accounts.json'], {
        windowsHide: true, env: { ...process.env, WATCHME_SCHEMA: 'watchme_dev' }, stdio: ['ignore', 'inherit', 'inherit'],
      });
      verifier.on('error', reject); verifier.on('exit', status => resolve(status ?? 1));
    });
    if (code !== 0) process.exitCode = 1;
  } finally {
    // Only stop this task's known child PID and its Next.js workers.
    if (server.pid && server.exitCode === null) {
      if (process.platform === 'win32') await new Promise(resolve => {
        const stop = spawn('taskkill', ['/PID', String(server.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
        stop.on('error', resolve); stop.on('exit', resolve);
      });
      else server.kill('SIGTERM');
    }
  }
}
main().catch(error => {
  console.error(`Local verification failed during ${stage} (${error instanceof Error ? error.name : 'UnknownError'}).`);
  process.exitCode = 1;
});
