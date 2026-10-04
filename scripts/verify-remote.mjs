import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';
import { sealData } from 'iron-session';

// Run only against this project's deployment. The private credentials stay inside this process.
// Local verification separately tests the actual passphrase login; this tests deployed sessions/actions.
const config = JSON.parse(await readFile(process.argv[2] || '.setup/preview-access.json', 'utf8'));
const target = new URL(config.url);
assert.ok(/^watchme(?:-[a-z0-9-]+)?\.vercel\.app$/.test(target.hostname));
assert.ok(['watchme', 'watchme_preview'].includes(config.schema));
assert.ok(process.env.SESSION_SECRET && process.env.WATCHME_PASSWORD_HASH);
const session = await sealData({ authenticated: true, issuedAt: Date.now(), authVersion: createHash('sha256').update(process.env.WATCHME_PASSWORD_HASH).digest('hex') }, { password: process.env.SESSION_SECRET, ttl: 3600 });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'America/New_York' });
const page = await context.newPage();
const runtimeErrors = [];
let loginPassphrase;
if (process.argv.includes('--login-base64-stdin')) {
  let encoded = '';
  for await (const chunk of process.stdin) encoded += chunk.toString();
  loginPassphrase = Buffer.from(encoded.trim(), 'base64').toString('utf8');
}
page.on('pageerror', error => runtimeErrors.push(error.message));
let stage = 'opening protected deployment';
let fixtureCreated = false;
const fixtureName = `Verification ${randomUUID().slice(0, 8)}`;
let originalSelection;
let originalTab = 'originals';
try {
  await page.goto(config.accessUrl || config.url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByLabel('YOUR PRIVATE PASSPHRASE', { exact: true }).waitFor({ timeout: 30000 });
  stage = 'checking private API boundary';
  assert.equal((await context.request.get(`${config.url}/api/weather?lat=40.7&lon=-74&unit=fahrenheit`)).status(), 401);
  assert.equal((await context.request.get(`${config.url}/api/locations?q=London`)).status(), 401);
  if (loginPassphrase) {
    stage = 'logging in with the configured passphrase';
    await page.getByLabel('YOUR PRIVATE PASSPHRASE', { exact: true }).fill(loginPassphrase);
    await page.getByRole('button', { name: 'Enter the studio', exact: true }).click();
    await page.locator('.watch-story h1').waitFor({ timeout: 30000 });
    loginPassphrase = undefined;
  } else {
    await context.addCookies([{ name: `watchme_${config.schema}_session`, value: session, domain: target.hostname, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]);
  }
  stage = 'opening authenticated studio';
  await page.goto(config.url, { waitUntil: 'networkidle' });
  await page.locator('.watch-story h1').waitFor({ timeout: 30000 });
  const active = page.locator('.watch-card-main[aria-pressed="true"]').first();
  originalSelection = await active.getAttribute('aria-label');
  originalTab = (await page.getByRole('button', { name: /My creations/ }).getAttribute('class'))?.includes('selected') ? 'saved' : 'originals';
  await mkdir('.setup', { recursive: true });
  await page.screenshot({ path: `.setup/${config.schema}-desktop.png`, fullPage: true });
  stage = 'saving a configured watch';
  await page.getByRole('button', { name: 'Originals', exact: true }).click();
  await page.getByRole('button', { name: 'Select REACTOR', exact: true }).click();
  await page.getByRole('button', { name: 'Design studio', exact: true }).first().click();
  await page.locator('summary').filter({ hasText: 'Signature & light' }).click();
  await page.getByRole('combobox', { name: 'Bezel', exact: true }).selectOption('iced');
  await page.getByLabel('Dial signature', { exact: true }).fill('NIGHT SHIFT');
  await page.getByLabel('Engraved initials', { exact: true }).fill('WM');
  await page.getByRole('combobox', { name: 'Seconds motion', exact: true }).selectOption('tick');
  await page.getByRole('button', { name: 'Add to collection', exact: true }).click();
  await page.getByLabel('Watch name', { exact: true }).fill(fixtureName);
  await page.getByRole('button', { name: 'Save watch', exact: true }).click();
  await page.getByRole('heading', { name: fixtureName, exact: true }).waitFor({ timeout: 30000 });
  fixtureCreated = true;
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: fixtureName, exact: true }).waitFor();
  await page.getByRole('button', { name: 'Favorite', exact: true }).click();
  await page.getByRole('button', { name: 'Favorited', exact: true }).waitFor();
  assert.ok(await page.locator('.watch-stage svg').getByText('NIGHT SHIFT', { exact: true }).count());
  assert.ok(await page.locator('.watch-stage [data-mechanical-movement]').count());
  await page.getByRole('button', { name: 'Start chronograph', exact: true }).click();
  await page.getByRole('button', { name: 'Pause chronograph', exact: true }).waitFor();
  await page.getByRole('button', { name: 'Record lap', exact: true }).click();
  await page.getByRole('button', { name: 'Pause chronograph', exact: true }).click();
  await page.getByRole('button', { name: 'Reset chronograph', exact: true }).click();
  await page.getByRole('button', { name: 'Eclipse', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.watch-stage svg')?.getAttribute('data-eclipse') === 'true');
  stage = 'verifying a second browser context';
  const second = await browser.newContext({ timezoneId: 'America/New_York' });
  await second.addCookies(await context.cookies());
  const secondPage = await second.newPage();
  await secondPage.goto(config.url, { waitUntil: 'networkidle' });
  await secondPage.getByRole('heading', { name: fixtureName, exact: true }).waitFor();
  await secondPage.getByRole('button', { name: 'Favorited', exact: true }).waitFor();
  await second.close();
  stage = 'verifying live weather';
  const weather = await context.request.get(`${config.url}/api/weather?lat=40.7&lon=-74&unit=fahrenheit`);
  assert.equal(weather.status(), 200);
  const data = await weather.json(); assert.equal(data.ok, true); assert.ok(Number.isFinite(data.data.temperature));
  stage = 'verifying focus and phone rendering';
  await page.getByRole('button', { name: 'Enter focus mode', exact: true }).first().click();
  await page.getByRole('button', { name: 'Back to the studio', exact: true }).click();
  await page.waitForFunction(() => !document.fullscreenElement);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.querySelector('.watch-stage svg')?.getAttribute('data-framing') === 'face');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `.setup/${config.schema}-mobile.png`, fullPage: true });
  await page.getByRole('button', { name: 'Front & center', exact: true }).click();
  await page.getByRole('button', { name: 'Digital time', exact: true }).waitFor();
  await page.screenshot({ path: `.setup/${config.schema}-face-forward.png`, fullPage: true });
  await page.getByRole('button', { name: 'Back to the studio', exact: true }).click();
  await page.waitForFunction(() => !document.fullscreenElement);
  assert.deepEqual(runtimeErrors, [], 'The deployed page produced a runtime error.');
  console.log(`PASS: ${config.schema} deployed session, private APIs, REACTOR engraving, real chronograph controls, Eclipse, Neon save/reload/favorite, second-browser persistence, live weather, focus, and mobile face-first layout.`);
} catch (error) {
  console.error(`Remote verification failed while ${stage}. Credentials and private URLs omitted.`);
  console.error(String(error?.message || error).replace(/https?:\/\/\S+/g, '[private URL omitted]').slice(0, 2200));
  process.exitCode = 1;
} finally {
  if (fixtureCreated) {
    try {
      await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(config.url, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /My creations/ }).click();
      await page.getByRole('button', { name: `Select ${fixtureName}`, exact: true }).click();
      await page.getByRole('button', { name: 'Remove', exact: true }).click();
      await page.getByRole('button', { name: 'Remove watch', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await page.getByRole('button', { name: originalTab === 'originals' ? 'Originals' : /My creations/, exact: originalTab === 'originals' }).click();
      if (originalSelection) await page.getByRole('button', { name: originalSelection, exact: true }).click();
      console.log('Verification watch removed and original selection restored.');
    } catch { console.error('Verification watch cleanup needs attention.'); process.exitCode = 1; }
  }
  await browser.close();
}
