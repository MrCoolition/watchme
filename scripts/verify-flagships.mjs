import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
import { sealData } from 'iron-session';

// Deployed collection checks use configured server credentials inside this process only.
const config = JSON.parse(await readFile(process.argv[2] || '.setup/preview-access.json', 'utf8'));
const target = new URL(config.url);
assert.ok(/^watchme(?:-[a-z0-9-]+)?\.vercel\.app$/.test(target.hostname));
assert.ok(['watchme', 'watchme_preview'].includes(config.schema));
assert.ok(process.env.SESSION_SECRET && process.env.WATCHME_PASSWORD_HASH);
const session = await sealData({ authenticated: true, issuedAt: Date.now(), authVersion: createHash('sha256').update(process.env.WATCHME_PASSWORD_HASH).digest('hex') }, { password: process.env.SESSION_SECRET, ttl: 3600 });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, timezoneId: 'America/New_York' });
await context.addInitScript(() => { Element.prototype.requestFullscreen = async () => { throw new Error('Verify in-page focus'); }; });
const page = await context.newPage();
const runtimeErrors = []; page.on('pageerror', error => runtimeErrors.push(error.message));
const additions = [['PHANTOM', 'turbine'], ['HELIOS', 'solar'], ['ABYSS', 'abyssal'], ['PRISM', 'prismatic'], ['NOCTURNE', 'aventurine']];
const fixturePrefix = `Verification ${randomUUID().slice(0, 8)}`;
const attemptedFixtures = [];
let originalSelection, originalTab = 'Originals', stage = 'opening deployment';
try {
  await page.goto(config.accessUrl || config.url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.getByLabel('YOUR PRIVATE PASSPHRASE', { exact: true }).waitFor();
  assert.equal((await context.request.get(`${config.url}/api/weather?lat=40.7&lon=-74&unit=fahrenheit`)).status(), 401);
  await context.addCookies([{ name: `watchme_${config.schema}_session`, value: session, domain: target.hostname, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]);
  await page.goto(config.url, { waitUntil: 'networkidle' });
  await page.locator('.watch-story h1').waitFor();
  originalSelection = await page.locator('.watch-card-main[aria-pressed="true"]').first().getAttribute('aria-label');
  if ((await page.getByRole('button', { name: /My creations/ }).getAttribute('class'))?.includes('selected')) originalTab = 'My creations';
  else if ((await page.getByRole('button', { name: 'Black Label', exact: true }).getAttribute('class'))?.includes('selected')) originalTab = 'Black Label';
  await mkdir('.setup', { recursive: true });
  await page.getByRole('button', { name: 'Black Label', exact: true }).click();
  await expect(page.locator('.watch-card-main')).toHaveCount(6);
  for (const [name, texture] of additions) {
    stage = `verifying ${name} persistence`;
    await page.getByRole('button', { name: 'Originals', exact: true }).click();
    await page.getByRole('button', { name: `Select ${name}`, exact: true }).click();
    await expect(page.locator(`.watch-stage [data-flagship-artwork="${texture}"]`)).toBeVisible();
    await page.getByRole('button', { name: 'Design studio', exact: true }).first().click();
    await page.locator('summary').filter({ hasText: 'Signature & light' }).click();
    await page.getByLabel('Engraved initials', { exact: true }).fill('WM');
    await page.getByRole('button', { name: 'Add to collection', exact: true }).click();
    const fixture = `${fixturePrefix} ${name}`; attemptedFixtures.push(fixture);
    await page.getByLabel('Watch name', { exact: true }).fill(fixture);
    await page.getByRole('button', { name: 'Save watch', exact: true }).click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: fixture, exact: true }).waitFor();
    assert.ok(await page.locator('.watch-stage svg').getByText('WM', { exact: true }).count());
    const second = await browser.newContext();
    try {
      await second.addCookies(await context.cookies());
      const reopened = await second.newPage();
      await reopened.goto(config.url, { waitUntil: 'networkidle' });
      await reopened.getByRole('heading', { name: fixture, exact: true }).waitFor();
      await expect(reopened.locator(`.watch-stage [data-flagship-artwork="${texture}"]`)).toBeVisible();
    } finally { await second.close(); }
    if (name === 'PHANTOM') {
      await page.getByRole('button', { name: 'Start chronograph', exact: true }).click();
      await page.getByRole('button', { name: 'Record lap', exact: true }).click();
      await page.getByRole('button', { name: 'Pause chronograph', exact: true }).click();
      await page.getByRole('button', { name: 'Reset chronograph', exact: true }).click();
    }
    stage = `verifying ${name} phone and export`;
    await page.getByRole('button', { name: 'Collection', exact: true }).first().click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Front & center', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Eclipse', exact: true })).toBeInViewport();
    await page.screenshot({ path: `.setup/${config.schema}-${name.toLowerCase()}-mobile.png` });
    await page.getByRole('button', { name: 'Eclipse', exact: true }).click();
    await expect(page.locator('.watch-stage svg')).toHaveAttribute('data-eclipse', 'true');
    await page.getByRole('button', { name: 'Download edition card', exact: true }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('dialog').getByRole('button', { name: 'Download PNG', exact: true }).click();
    const download = await downloadPromise;
    assert.ok(download.suggestedFilename().endsWith('.png'));
    await page.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await page.getByRole('button', { name: 'Eclipse', exact: true }).click();
    await page.getByRole('button', { name: 'Back to the studio', exact: true }).click();
    await page.setViewportSize({ width: 1440, height: 1050 });
  }
  assert.deepEqual(runtimeErrors, []);
  console.log(`PASS: ${config.schema} all five flagships, real Neon save/reload, second-browser persistence, engraving, chronograph controls, Eclipse, phone focus and PNG downloads.`);
} catch (error) {
  console.error(`Flagship verification failed while ${stage}. Credentials and private URLs omitted.`);
  console.error(String(error?.message || error).replace(/https?:\/\/\S+/g, '[private URL omitted]').slice(0, 1800));
  process.exitCode = 1;
} finally {
  try {
    await page.goto(config.url, { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 1440, height: 1050 });
    for (const fixture of attemptedFixtures) {
      await page.getByRole('button', { name: /My creations/ }).click();
      const selected = page.getByRole('button', { name: `Select ${fixture}`, exact: true });
      if (!await selected.count()) continue;
      await selected.click();
      await page.getByRole('button', { name: 'Remove', exact: true }).click();
      await page.getByRole('button', { name: 'Remove watch', exact: true }).click();
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
    }
    await page.getByRole('button', { name: originalTab === 'My creations' ? /My creations/ : originalTab, exact: originalTab !== 'My creations' }).click();
    if (originalSelection) await page.getByRole('button', { name: originalSelection, exact: true }).click();
    console.log('Temporary verification watches removed and original selection restored.');
  } catch { console.error('Verification cleanup needs attention.'); process.exitCode = 1; }
  await browser.close();
}
