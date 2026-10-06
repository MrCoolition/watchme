import { createServer } from 'node:http';
import { randomBytes, scryptSync } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const port = 4319;
const origin = `http://127.0.0.1:${port}`;
const csrf = randomBytes(32).toString('hex');
let done = false;
let initial = {};
try {
  const contents = await readFile(resolve(root, '.env.local'), 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const at = line.indexOf('=');
    if (at > 0) { try { initial[line.slice(0, at)] = JSON.parse(line.slice(at + 1)); } catch { initial[line.slice(0, at)] = line.slice(at + 1); } }
  }
} catch {}

const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>WATCHMÉ · Private setup</title><style>
*{box-sizing:border-box}body{margin:0;background:#0c0d0d;color:#efefe8;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;min-height:100vh;display:grid;place-items:center;padding:32px}main{width:min(100%,520px)}.brand{letter-spacing:.3em;font-size:17px;font-weight:700}.eyebrow{font-size:12px;letter-spacing:.18em;color:#c5aa70;margin:42px 0 8px}h1{font-size:40px;letter-spacing:-.045em;line-height:1.1;font-weight:500;margin:0 0 18px}p{color:#9a9c96}label{display:block;margin-top:24px;font-size:14px}input{width:100%;padding:15px;background:#171919;color:#fff;border:1px solid #363933;border-radius:7px;font:inherit;margin-top:7px}input:focus{outline:2px solid #c5aa70;outline-offset:2px}small{display:block;color:#777e75;margin-top:7px;line-height:1.5}button{width:100%;border:0;border-radius:7px;background:#d8c397;color:#131610;padding:16px;font:600 15px inherit;margin-top:30px;cursor:pointer}#message{color:#c5aa70;white-space:pre-line}.foot{font-size:12px;border-top:1px solid #262a25;margin-top:30px;padding-top:22px}
</style><main><div class="brand">WATCHMÉ<span style="color:#c5aa70">.</span></div><div class="eyebrow">LOCAL SETUP / PRIVATE STUDIO</div><h1>Make it yours.<br>Keep it yours.</h1><p>Set the initial coolition owner passphrase. This form runs only on your computer. Existing accounts keep their current passphrases; change those in Account settings.</p><form id="setup"><label for="passphrase">Your private passphrase</label><input id="passphrase" name="passphrase" type="password" autocomplete="new-password" minlength="15" maxlength="1024" required><small>At least 15 characters. A few unrelated words work well.</small><label for="confirm">Confirm passphrase</label><input id="confirm" name="confirm" type="password" autocomplete="new-password" required><label for="database">Development / preview Neon connection <span style="color:#777">(optional for now)</span></label><input id="database" name="database" type="password" autocomplete="off" spellcheck="false" placeholder="postgresql://…"><small>Use a connection scoped for development and previews. Your production connection in Vercel stays unchanged.</small><button type="submit">Save private setup</button><p id="message" role="status"></p></form><p class="foot">Only a salted passphrase hash is saved. Credentials stay in an ignored local environment file; the passphrase itself is never stored or displayed.</p></main><script nonce="${csrf}">
document.querySelector('form').addEventListener('submit', async e=>{e.preventDefault();const p=document.querySelector('#passphrase'),c=document.querySelector('#confirm'),d=document.querySelector('#database'),m=document.querySelector('#message'),b=document.querySelector('button');if(p.value!==c.value){m.textContent='The passphrases do not match.';return}b.disabled=true;try{const r=await fetch('/setup',{method:'POST',headers:{'Content-Type':'application/json','X-Setup-Token':'${csrf}'},body:JSON.stringify({passphrase:p.value,database:d.value})});const result=await r.json();if(!r.ok)throw new Error(result.error);p.value='';c.value='';d.value='';m.textContent=result.message;b.textContent='Setup saved';}catch(err){m.textContent=err.message;b.disabled=false;}})
</script></html>`;

const server = createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${csrf}'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'`);
  if (req.headers.host !== `127.0.0.1:${port}`) { res.writeHead(403); res.end(); return; }
  if (req.method === 'GET' && req.url === '/') { res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html); return; }
  if (req.method === 'GET' && req.url === '/status') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ configured: done, databaseConfigured: !!initial.neon_connect })); return; }
  if (req.method !== 'POST' || req.url !== '/setup' || req.headers.origin !== origin || req.headers['x-setup-token'] !== csrf) { res.writeHead(403); res.end(); return; }
  res.setHeader('Content-Type', 'application/json');
  try {
    let body = ''; for await (const chunk of req) { body += chunk; if (body.length > 8192) throw new Error('Form too large.'); }
    const { passphrase, database } = JSON.parse(body);
    if (typeof passphrase !== 'string' || passphrase.length < 15 || passphrase.length > 1024) throw new Error('Use a passphrase between 15 and 1024 characters.');
    if (database) { const url = new URL(database); if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname.endsWith('.neon.tech')) throw new Error('Enter a Neon PostgreSQL connection string.'); }
    const salt = randomBytes(16).toString('hex');
    initial = { ...initial, WATCHME_SCHEMA: 'watchme_dev', WATCHME_PASSWORD_HASH: `scrypt:v1:131072:8:1:${salt}:${scryptSync(passphrase, salt, 64, { N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }).toString('hex')}`, SESSION_SECRET: initial.SESSION_SECRET || randomBytes(48).toString('base64url'), ...(database ? { neon_connect: database } : {}) };
    await writeFile(resolve(root, '.env.local'), Object.entries(initial).map(([key,value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 });
    await mkdir(resolve(root, '.setup'), { recursive: true });
    await writeFile(resolve(root, '.setup', 'status.json'), JSON.stringify({ configured: true, databaseConfigured: !!initial.neon_connect, configuredAt: new Date().toISOString() }));
    done = true;
    res.end(JSON.stringify({ message: initial.neon_connect ? 'Private setup saved. WATCHMÉ can now be connected and tested.' : 'Passphrase saved. Development and preview database credentials are still needed for cloud-save testing.' }));
  } catch (error) { res.writeHead(400); res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Setup could not be saved.' })); }
});
server.listen(port, '127.0.0.1', () => console.log(`Private setup available at ${origin}`));
