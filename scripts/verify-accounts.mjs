// Real account/UI/server-action/Neon verification. Temporary credentials exist only in memory.
// Run: node --env-file=.env.local scripts/verify-accounts.mjs .setup/local-accounts.json
import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { chromium } from '@playwright/test';

let stage = 'reading verification configuration';
async function main() {
  const config = JSON.parse(await readFile(process.argv[2] || '.setup/preview-access.json', 'utf8'));
  const target = new URL(config.url);
  const local = target.hostname === '127.0.0.1';
  assert.ok(local ? target.protocol === 'http:' : target.protocol === 'https:' && /^watchme(?:-[a-z0-9-]+)?\.vercel\.app$/.test(target.hostname));
  assert.ok(['watchme', 'watchme_preview', 'watchme_dev'].includes(config.schema));
  assert.ok(!local || config.schema === 'watchme_dev');
  assert.equal(target.username, ''); assert.equal(target.password, '');
  if (config.accessUrl) assert.equal(new URL(config.accessUrl).origin, target.origin);
  assert.ok(process.env.neon_connect && process.env.SESSION_SECRET);
  const base = target.origin, schema = `"${config.schema}"`, sql = neon(process.env.neon_connect);
  const suffix = randomBytes(8).toString('hex');
  const userA = `qa_a_${suffix}`, userB = `qa_b_${suffix}`;
  const secret = () => `Private test ${randomBytes(24).toString('base64url')}`;
  const originalPassphrase = secret(), changedPassphrase = secret(), recoveredPassphrase = secret(), passphraseB = secret();
  const watchName = `Account A verification ${suffix}`;
  const startedAt = new Date(Date.now() - 1000).toISOString();
  let browser, cleanupAllowed = false, passed = false;
  const pageErrors = [];
  const recovery = { original: '', replacement: '', final: '' };

  async function newPage(viewport = { width: 1440, height: 1000 }) {
    const context = await browser.newContext({ viewport, timezoneId: 'America/New_York' });
    context.setDefaultTimeout(25000);
    await context.addInitScript(() => { Element.prototype.requestFullscreen = async () => { throw new Error('Verify in-page focus'); }; });
    const page = await context.newPage();
    page.on('pageerror', error => pageErrors.push(error.name));
    await page.goto(config.accessUrl || `${base}/login`, { waitUntil: 'networkidle', timeout: 60000 });
    if (!page.url().startsWith(`${base}/login`)) await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await page.getByLabel('Username', { exact: true }).waitFor();
    return { page, context };
  }
  async function acknowledgeCode(page, destination) {
    const code = await page.locator('[data-recovery-code]').innerText();
    assert.ok(code.length >= 20);
    // A newly issued code must stay on screen instead of disappearing into a refreshed login route.
    assert.equal(await page.locator('.studio-shell').count(), destination === 'studio' ? 0 : 1);
    const acknowledge = page.getByRole('button', { name: 'I’ve saved my recovery code', exact: true });
    await acknowledge.waitFor();
    await acknowledge.click();
    await page.locator('[data-recovery-code]').waitFor({ state: 'detached' });
    if (destination === 'studio') await page.locator('.studio-shell').waitFor();
    return code;
  }
  async function register(page, username, passphrase) {
    await page.getByRole('button', { name: 'Create collection', exact: true }).click();
    await page.getByLabel('Username', { exact: true }).fill(username);
    await page.getByLabel('Passphrase', { exact: true }).fill(passphrase);
    await page.getByLabel('Confirm passphrase', { exact: true }).fill(passphrase);
    await page.getByRole('button', { name: 'Create my collection', exact: true }).click();
    return acknowledgeCode(page, 'studio');
  }
  async function signIn(page, username, passphrase, valid = true) {
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByLabel('Username', { exact: true }).fill(username);
    await page.getByLabel('Passphrase', { exact: true }).fill(passphrase);
    await page.getByRole('button', { name: 'Enter the studio', exact: true }).click();
    if (valid) await page.locator('.studio-shell').waitFor();
    else await page.getByRole('alert').filter({ hasText: 'did not unlock' }).waitFor();
  }
  async function recover(page, code, passphrase, valid) {
    await page.getByRole('button', { name: 'Recover access', exact: true }).click();
    await page.getByLabel('Username', { exact: true }).fill(userA);
    await page.getByLabel('Recovery code', { exact: true }).fill(code);
    await page.getByLabel('New passphrase', { exact: true }).fill(passphrase);
    await page.getByLabel('Confirm new passphrase', { exact: true }).fill(passphrase);
    await page.getByRole('button', { name: 'Reset passphrase', exact: true }).click();
    if (valid) return acknowledgeCode(page, 'studio');
    await page.getByRole('alert').filter({ hasText: 'could not recover' }).waitFor();
    assert.equal(await page.locator('[data-recovery-code]').count(), 0);
  }
  async function assertPrivateWatch(page) {
    await page.getByRole('heading', { name: watchName, exact: true }).waitFor();
    assert.equal(await page.locator('.watch-stage svg').getByText('PRIVATE A', { exact: true }).count(), 1);
  }
  async function assertNoOverflow(page) {
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
    const dialog = page.locator('dialog[open]');
    if (await dialog.count()) assert.ok(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth + 1));
  }
  async function safeScreenshot(page, path) {
    assert.equal(await page.locator('[data-recovery-code]').count(), 0);
    assert.ok(await page.locator('input[type="password"]').evaluateAll(inputs => inputs.every(input => input.value === '')));
    await page.screenshot({ path, fullPage: true });
  }

  try {
    stage = 'checking isolated fixture names';
    const existing = await sql.query(`SELECT id FROM ${schema}.accounts WHERE username IN ($1, $2)`, [userA, userB]);
    assert.equal(existing.length, 0); cleanupAllowed = true;
    browser = await chromium.launch();
    const a = await newPage();
    stage = 'checking unauthenticated endpoint protection';
    for (const path of ['/api/weather?lat=40&lon=-74', '/api/locations?q=London']) assert.equal((await a.context.request.get(`${base}${path}`)).status(), 401);

    stage = 'registering account A and acknowledging its recovery code';
    recovery.original = await register(a.page, userA, originalPassphrase);
    const [accountA] = await sql.query(`SELECT id, username, is_owner, session_version FROM ${schema}.accounts WHERE username = $1`, [userA]);
    assert.ok(accountA && !accountA.is_owner);
    const cookie = (await a.context.cookies()).find(item => item.name === `watchme_${config.schema}_session`);
    assert.ok(cookie?.httpOnly); assert.equal(cookie.sameSite, 'Lax'); assert.equal(cookie.secure, !local);
    assert.ok(!cookie.value.includes(originalPassphrase));

    stage = 'saving an account-owned customized Apex';
    await a.page.getByRole('button', { name: 'Originals', exact: true }).click();
    await a.page.getByRole('button', { name: 'Select Apex', exact: true }).click();
    await a.page.getByRole('button', { name: 'Design studio', exact: true }).first().click();
    await a.page.locator('summary').filter({ hasText: 'Signature & light' }).click();
    await a.page.getByLabel('Dial signature', { exact: true }).fill('PRIVATE A');
    await a.page.getByRole('button', { name: 'Add to collection', exact: true }).click();
    await a.page.getByLabel('Watch name', { exact: true }).fill(watchName);
    await a.page.getByRole('button', { name: 'Save watch', exact: true }).click();
    await a.page.getByRole('dialog', { name: 'Sign your creation.', exact: true }).waitFor({ state: 'detached' });
    await a.page.reload({ waitUntil: 'networkidle' }); await assertPrivateWatch(a.page);
    const [savedWatch] = await sql.query(`SELECT id, user_id, design, favorite FROM ${schema}.user_watches WHERE user_id = $1 AND name = $2`, [accountA.id, watchName]);
    assert.ok(savedWatch); assert.equal(savedWatch.design.signature, 'PRIVATE A'); assert.equal(savedWatch.user_id, accountA.id);

    stage = 'capturing the real favorite action and verifying persistence';
    const favoriteRequest = a.page.waitForRequest(request => request.method() === 'POST' && request.headers()['next-action'] && request.postData()?.includes(savedWatch.id));
    await a.page.getByRole('button', { name: 'Favorite', exact: true }).click();
    const captured = await favoriteRequest;
    await a.page.getByRole('button', { name: 'Favorited', exact: true }).waitFor();
    const capturedBody = captured.postData();
    assert.ok(capturedBody?.includes(accountA.id));
    const actionHeaders = { origin: base };
    for (const name of ['next-action', 'content-type', 'next-router-state-tree', 'next-url', 'accept']) if (captured.headers()[name]) actionHeaders[name] = captured.headers()[name];
    const c = await newPage();
    stage = 'rejecting an incorrect login and reopening account A on another device';
    await signIn(c.page, userA, secret(), false);
    await signIn(c.page, userA, originalPassphrase); await assertPrivateWatch(c.page);
    await c.page.getByRole('button', { name: 'Favorited', exact: true }).waitFor();

    const b = await newPage();
    stage = 'registering account B with an empty private collection';
    await register(b.page, userB, passphraseB);
    const [accountB] = await sql.query(`SELECT id, is_owner FROM ${schema}.accounts WHERE username = $1`, [userB]);
    assert.ok(accountB && !accountB.is_owner);
    await b.page.getByRole('button', { name: /My creations/ }).click();
    assert.equal(await b.page.locator('.watch-card-main').count(), 0);
    assert.equal(await b.page.getByRole('heading', { name: watchName, exact: true }).count(), 0);
    assert.equal((await sql.query(`SELECT id FROM ${schema}.user_watches WHERE user_id = $1`, [accountB.id])).length, 0);

    stage = 'rejecting stale-account and cross-account direct server-action requests';
    const stale = await b.context.request.post(captured.url(), { headers: actionHeaders, data: capturedBody });
    assert.equal(stale.status(), 200); assert.ok((await stale.text()).includes('account changed'));
    const forged = JSON.parse(capturedBody);
    assert.equal(forged[0], savedWatch.id); assert.equal(forged[2], accountA.id);
    forged[1] = false; forged[2] = accountB.id;
    const intrusion = await b.context.request.post(captured.url(), { headers: actionHeaders, data: JSON.stringify(forged) });
    assert.equal(intrusion.status(), 200); assert.ok((await intrusion.text()).includes('unavailable'));
    const [stillPrivate] = await sql.query(`SELECT user_id, favorite, design FROM ${schema}.user_watches WHERE id = $1`, [savedWatch.id]);
    assert.equal(stillPrivate.user_id, accountA.id); assert.equal(stillPrivate.favorite, true); assert.equal(stillPrivate.design.signature, 'PRIVATE A');
    console.log('PASS checkpoint: two real accounts, Neon save/reopen, favorite, and rejected cross-account server actions.');

    stage = 'changing the passphrase and revoking another signed-in device';
    await a.page.getByRole('button', { name: 'Account settings', exact: true }).click();
    await a.page.getByLabel('Current passphrase', { exact: true }).fill(originalPassphrase);
    await a.page.getByLabel('New passphrase', { exact: true }).fill(changedPassphrase);
    await a.page.getByLabel('Confirm new passphrase', { exact: true }).fill(changedPassphrase);
    await a.page.getByRole('button', { name: 'Update passphrase', exact: true }).click();
    await a.page.getByRole('status').filter({ hasText: 'Passphrase updated' }).waitFor();
    assert.equal((await c.context.request.get(`${base}/api/locations?q=London`)).status(), 401);
    await c.page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await signIn(c.page, userA, originalPassphrase, false);

    stage = 'regenerating recovery material and dismissing it only after acknowledgement';
    await a.page.getByLabel('Passphrase to generate recovery code', { exact: true }).fill(changedPassphrase);
    await a.page.getByRole('button', { name: 'Generate recovery code', exact: true }).click();
    recovery.replacement = await acknowledgeCode(a.page, 'account');
    assert.notEqual(recovery.replacement, recovery.original);
    await a.page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    stage = 'rejecting the replaced recovery code';
    await recover(c.page, recovery.original, recoveredPassphrase, false);
    stage = 'recovering account A and rotating its recovery code';
    recovery.final = await recover(c.page, recovery.replacement, recoveredPassphrase, true);
    assert.notEqual(recovery.final, recovery.replacement);
    await assertPrivateWatch(c.page);
    assert.equal((await a.context.request.get(`${base}/api/locations?q=London`)).status(), 401);
    const [updatedAccount] = await sql.query(`SELECT session_version FROM ${schema}.accounts WHERE id = $1`, [accountA.id]);
    assert.equal(updatedAccount.session_version, accountA.session_version + 2);
    stage = 'rejecting reuse of the consumed recovery code';
    await a.page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await recover(a.page, recovery.replacement, secret(), false);

    stage = 'switching accounts in the same browser without leaking a collection';
    await b.page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await b.page.getByRole('button', { name: 'Use another account', exact: true }).click();
    await b.page.getByLabel('Username', { exact: true }).waitFor();
    await signIn(b.page, userA, recoveredPassphrase); await assertPrivateWatch(b.page);

    stage = 'checking phone account settings and front-and-center display';
    await b.page.setViewportSize({ width: 390, height: 844 });
    await b.page.getByRole('button', { name: 'Account settings', exact: true }).click();
    await b.page.getByRole('dialog', { name: 'Your account.', exact: true }).waitFor();
    await assertNoOverflow(b.page); await mkdir('.setup', { recursive: true });
    await safeScreenshot(b.page, `.setup/${config.schema}-accounts-settings-phone.png`);
    await b.page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await b.page.getByRole('button', { name: 'Front & center', exact: true }).click();
    await b.page.locator('.studio-shell.is-focus').waitFor();
    await assertNoOverflow(b.page);
    await safeScreenshot(b.page, `.setup/${config.schema}-accounts-focus-phone.png`);
    await b.page.getByRole('button', { name: 'Back to the studio', exact: true }).click();
    assert.equal(pageErrors.length, 0);
    passed = true;
  } finally {
    await browser?.close();
    if (cleanupAllowed) {
      // Only these two unpredictable test usernames can be removed. Foreign keys clean their own rows.
      await sql.query(`DELETE FROM ${schema}.accounts WHERE username IN ($1, $2) AND is_owner = false AND created_at >= $3::timestamptz`, [userA, userB, startedAt]);
      assert.equal((await sql.query(`SELECT id FROM ${schema}.accounts WHERE username IN ($1, $2)`, [userA, userB])).length, 0);
    }
  }
  if (passed) console.log(`PASS: ${config.schema} real registration, recovery acknowledgement, private collections, cross-device persistence, direct-action isolation, passphrase changes, session revocation, recovery rotation, account switching and phone layout. Temporary accounts removed.`);
}

main().catch(error => {
  // Never print error.message, assertions, request bodies, credentials, codes or database diagnostics.
  console.error(`Account verification failed during ${stage} (${error instanceof Error ? error.name : 'UnknownError'}).`);
  process.exitCode = 1;
});
