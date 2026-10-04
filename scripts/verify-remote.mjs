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
context.setDefaultTimeout(20000);
// Keep viewport transitions deterministic on Windows; focus must also work without native fullscreen.
await context.addInitScript(() => { Element.prototype.requestFullscreen = async () => { throw new Error('Verify in-page focus'); }; });
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

async function assertMoonPhase(verifiedPage) {
  await verifiedPage.waitForFunction(() => {
    const disc = document.querySelector('.watch-stage [data-moon-disc]');
    return ['data-moon-phase', 'data-moon-illumination', 'data-moon-name'].every(attribute => Boolean(disc?.getAttribute(attribute)));
  });
  const moon = await verifiedPage.locator('.watch-stage [data-moon-disc]').evaluate(disc => ({
    phase: Number(disc.getAttribute('data-moon-phase')),
    illumination: Number(disc.getAttribute('data-moon-illumination')),
    name: disc.getAttribute('data-moon-name'),
    description: disc.querySelector('desc')?.textContent,
  }));
  assert.ok(Number.isFinite(moon.phase) && moon.phase >= 0 && moon.phase < 1, 'Moon phase must be a calculated fraction.');
  assert.ok(Number.isFinite(moon.illumination) && moon.illumination >= 0 && moon.illumination <= 1, 'Moon illumination must be a calculated fraction.');
  assert.ok(['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'].includes(moon.name));
  assert.ok(moon.description?.includes('% illuminated'), 'Moon accessibility description must contain the measured percentage.');
}

async function configureCatalog(verifiedPage) {
  await verifiedPage.getByRole('button', { name: 'Parts catalog', exact: true }).first().click();
  await verifiedPage.getByRole('button', { name: 'All entries 1,431', exact: true }).waitFor();
  for (const option of ['Bronze / CuSn alloy', 'Cathedral', 'Precisionist / 16 advances per second', 'Peripheral']) {
    await verifiedPage.getByLabel('Search catalog', { exact: true }).fill(option);
    await verifiedPage.getByRole('button', { name: `View ${option}`, exact: true }).click();
    await verifiedPage.getByRole('button', { name: 'Apply catalog option', exact: true }).click();
    await verifiedPage.locator('.catalog-success').waitFor();
  }
  await verifiedPage.getByLabel('Search catalog', { exact: true }).fill('ECG recording app');
  await verifiedPage.getByRole('button', { name: 'View ECG recording app', exact: true }).click();
  assert.equal(await verifiedPage.getByRole('button', { name: 'Apply catalog option', exact: true }).count(), 0);
  await verifiedPage.getByRole('button', { name: 'Save catalog reference', exact: true }).click();
  await verifiedPage.getByRole('button', { name: 'Saved references 1', exact: true }).waitFor();
  await verifiedPage.getByRole('button', { name: 'Close dialog', exact: true }).click();
}

async function assertCatalog(verifiedPage) {
  assert.equal(await verifiedPage.locator('.watch-stage svg').getAttribute('data-metal'), 'bronze');
  assert.equal(await verifiedPage.locator('.watch-stage [data-part-hand="cathedral"]').count(), 2);
  const seconds = verifiedPage.locator('.watch-stage [data-seconds-hand]');
  assert.equal(await seconds.count(), 1);
  assert.equal(await seconds.getAttribute('data-seconds-placement'), 'peripheral');
  assert.equal(await seconds.getAttribute('data-seconds-advances'), '16');
  await verifiedPage.getByRole('button', { name: 'Parts catalog', exact: true }).first().click();
  await verifiedPage.getByRole('button', { name: 'Saved references 1', exact: true }).click();
  await verifiedPage.getByRole('button', { name: 'View ECG recording app', exact: true }).waitFor();
  await verifiedPage.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await verifiedPage.getByRole('button', { name: 'Collection', exact: true }).first().click();
}

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
  await configureCatalog(page);
  await page.getByRole('button', { name: 'Add to collection', exact: true }).click();
  await page.getByLabel('Watch name', { exact: true }).fill(fixtureName);
  await page.getByRole('button', { name: 'Save watch', exact: true }).click();
  await page.getByRole('heading', { name: fixtureName, exact: true }).waitFor({ timeout: 30000 });
  fixtureCreated = true;
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: fixtureName, exact: true }).waitFor();
  await assertCatalog(page);
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

  stage = 'verifying independent focus panels';
  await page.getByRole('button', { name: 'Enter focus mode', exact: true }).first().click();
  const panelToggle = page.getByRole('button', { name: 'Chronograph panel', exact: true });
  const digitalToggle = page.getByRole('button', { name: 'Digital time', exact: true });
  const panel = page.locator('.chronograph-deck.is-immersive');
  const digitalTime = page.locator('.focus-time');
  await panel.waitFor({ state: 'visible' });
  await digitalTime.waitFor({ state: 'visible' });
  assert.equal(await panelToggle.getAttribute('aria-pressed'), 'true');
  assert.equal(await digitalToggle.getAttribute('aria-pressed'), 'true');
  await panelToggle.click();
  await panel.waitFor({ state: 'hidden' });
  await digitalTime.waitFor({ state: 'visible' });
  assert.equal(await panelToggle.getAttribute('aria-pressed'), 'false');
  await digitalToggle.click();
  await digitalTime.waitFor({ state: 'hidden' });
  assert.equal(await digitalToggle.getAttribute('aria-pressed'), 'false');
  await panelToggle.click();
  await panel.waitFor({ state: 'visible' });
  assert.equal(await digitalTime.count(), 0, 'Restoring the timer panel must not restore the digital clock.');
  await digitalToggle.click();
  await digitalTime.waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Back to the studio', exact: true }).click();
  await page.waitForFunction(() => !document.fullscreenElement);

  stage = 'saving and reopening the moon-phase complication';
  await page.getByRole('button', { name: 'Design studio', exact: true }).first().click();
  await page.locator('summary').filter({ hasText: 'Strap & function' }).click();
  await page.getByRole('combobox', { name: 'Complication', exact: true }).selectOption('moonphase');
  for (const name of ['Add Date', 'Add GMT', 'Add Chronograph']) {
    await page.getByRole('checkbox', { name, exact: true }).check();
  }
  await assertMoonPhase(page);
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  assert.equal(await page.getByLabel('Watch name', { exact: true }).inputValue(), fixtureName);
  await page.getByRole('button', { name: 'Save watch', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 30000 });
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: fixtureName, exact: true }).waitFor();
  await assertMoonPhase(page);
  await page.locator('.watch-specs').getByText(/Moon phase/).waitFor();
  for (const complication of ['moonphase', 'chronograph', 'date', 'gmt']) {
    await page.locator(`.watch-stage [data-complication="${complication}"]`).waitFor();
  }
  assert.equal(await page.locator('.watch-stage [data-chronograph-hand="hours"]').count(), 0, 'The lunar display must occupy the freed lower register.');

  stage = 'verifying a second browser context';
  const second = await browser.newContext({ timezoneId: 'America/New_York' });
  try {
    await second.addCookies(await context.cookies());
    const secondPage = await second.newPage();
    secondPage.on('pageerror', error => runtimeErrors.push(error.message));
    await secondPage.goto(config.url, { waitUntil: 'networkidle' });
    await secondPage.getByRole('heading', { name: fixtureName, exact: true }).waitFor();
    await secondPage.getByRole('button', { name: 'Favorited', exact: true }).waitFor();
    await secondPage.locator('.watch-specs').getByText(/Moon phase/).waitFor();
    for (const complication of ['moonphase', 'chronograph', 'date', 'gmt']) {
      await secondPage.locator(`.watch-stage [data-complication="${complication}"]`).waitFor();
    }
    await assertMoonPhase(secondPage);
    await assertCatalog(secondPage);
    assert.ok(await secondPage.locator('.watch-stage svg').getByText('NIGHT SHIFT', { exact: true }).count());
    stage = 'exporting the persisted lunar edition';
    await secondPage.getByRole('button', { name: 'Download edition card', exact: true }).click();
    const edition = secondPage.getByRole('dialog', { name: 'Your edition card', exact: true });
    const [download] = await Promise.all([
      secondPage.waitForEvent('download'),
      edition.getByRole('button', { name: 'Download PNG', exact: true }).click(),
    ]);
    assert.match(download.suggestedFilename(), /^watchme-verification-[a-f0-9]{8}-[a-f0-9]{8}\.png$/);
    const stream = await download.createReadStream();
    assert.ok(stream);
    const chunks = [];
    for await (const chunk of stream) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(bytes.readUInt32BE(16), 1080);
    assert.equal(bytes.readUInt32BE(20), 1350);
    assert.ok(bytes.length > 50000, 'The exported edition should contain the rendered watch.');
    await download.saveAs(`.setup/${config.schema}-moon-edition.png`);
  } finally { await second.close(); }
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
  console.log(`PASS: ${config.schema} deployed session, private APIs, catalog apply and references, new parts and independent seconds, lower-dial engraving, real chronograph controls, Eclipse, independent focus panels, four-complication save/reload/favorite, second-browser Neon persistence and PNG export, live weather, focus, and mobile face-first layout.`);
} catch (error) {
  console.error(`Remote verification failed while ${stage}. Credentials and private URLs omitted.`);
  console.error(String(error?.message || error).replace(/https?:\/\/\S+/g, '[private URL omitted]').slice(0, 2200));
  process.exitCode = 1;
} finally {
  if (fixtureCreated || originalSelection) {
    try {
      await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(config.url, { waitUntil: 'networkidle' });
      if (fixtureCreated) {
        await page.getByRole('button', { name: /My creations/ }).click();
        await page.getByRole('button', { name: `Select ${fixtureName}`, exact: true }).click();
        await page.getByRole('button', { name: 'Remove', exact: true }).click();
        await page.getByRole('button', { name: 'Remove watch', exact: true }).click();
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        // Removal closes its dialog before its queued preference write completes.
        await page.getByRole('status').filter({ hasText: 'Watch removed from your collection.' }).waitFor();
      }
      if (originalSelection) {
        await page.getByRole('button', { name: originalTab === 'originals' ? 'Originals' : /My creations/, exact: originalTab === 'originals' }).click();
        const [response] = await Promise.all([
          page.waitForResponse(response => response.request().method() === 'POST' && new URL(response.url()).origin === target.origin && !response.request().isNavigationRequest()),
          page.getByRole('button', { name: originalSelection, exact: true }).click(),
        ]);
        assert.equal(response.status(), 200);
        // Server-action response headers follow the write; don't wait on the RSC stream.
        await page.reload({ waitUntil: 'networkidle' });
        await page.getByRole('button', { name: originalSelection, exact: true }).waitFor();
        assert.equal(await page.getByRole('button', { name: originalSelection, exact: true }).getAttribute('aria-pressed'), 'true');
      }
      console.log('Verification cleanup complete; original selection restored.');
    } catch (error) { console.error('Verification watch cleanup needs attention.'); console.error(String(error?.message || error).replace(/https?:\/\/\S+/g, '[private URL omitted]').slice(0, 1500)); process.exitCode = 1; }
  }
  await browser.close();
}
