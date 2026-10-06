import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { chromium } from '@playwright/test';
import { ownerVerificationSession } from './verification-session.mjs';

const config = JSON.parse(await readFile(process.argv[2] || '.setup/preview-access.json', 'utf8'));
const target = new URL(config.url);
assert.ok(/^watchme(?:-[a-z0-9-]+)?\.vercel\.app$/.test(target.hostname));
assert.ok(['watchme', 'watchme_preview'].includes(config.schema));
const session = await ownerVerificationSession(config.schema);
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1050 } });
context.setDefaultTimeout(20000);
const page = await context.newPage();
const name = `WHITEOUT verification ${randomUUID().slice(0, 8)}`;
let originalSelection, originalSaved = false, stage = 'opening deployment';
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(config.accessUrl || config.url, { waitUntil: 'networkidle' });
  await context.addCookies([{ name: `watchme_${config.schema}_session`, value: session, domain: target.hostname, path: '/', httpOnly: true, secure: true, sameSite: 'Lax' }]);
  await page.goto(config.url, { waitUntil: 'networkidle' });
  originalSelection = await page.locator('.watch-card-main[aria-pressed="true"]').first().getAttribute('aria-label');
  originalSaved = (await page.getByRole('button', { name: /My creations/ }).getAttribute('class'))?.includes('selected') || false;
  stage = 'customizing WHITEOUT';
  await page.getByRole('button', { name: 'WHITEOUT', exact: true }).click();
  assert.equal(await page.locator('.watch-card-main').count(), 6);
  assert.equal(await page.getByRole('button', { name: 'Select FLUX', exact: true }).count(), 0);
  for (const [edition, scene] of [['WHITEOUT', 'glacier'], ['EVERGREEN', 'forest'], ['NIGHTFALL', 'city'], ['BOREALIS', 'aurora'], ['STARFALL', 'observatory'], ['NOËL', 'christmas']]) {
    await page.getByRole('button', { name: `Select ${edition}`, exact: true }).click();
    await page.locator(`.watch-stage [data-whiteout-scene="${scene}"]`).waitFor();
  }
  const face = page.locator('.watch-stage > svg');
  await face.press('ArrowRight');
  await page.getByRole('button', { name: 'Atmosphere', exact: true }).first().click();
  await page.getByRole('button', { name: 'Forest scene', exact: true }).click();
  await page.getByRole('button', { name: 'Christmas scene', exact: true }).click();
  assert.equal(await page.getByRole('button', { name: 'Liquid atmosphere', exact: true }).count(), 0);
  await page.getByLabel('Atmosphere intensity', { exact: true }).press('End');
  await page.getByLabel('Atmosphere density', { exact: true }).press('Home');
  await page.getByLabel('Atmosphere color', { exact: true }).fill('#BD88FF');
  await page.getByLabel('Atmosphere gravity', { exact: true }).selectOption('up');
  await page.getByRole('button', { name: 'Calm mode', exact: true }).click();
  await page.getByRole('button', { name: 'Save creation', exact: true }).click();
  await page.getByLabel('Watch name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Save watch', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.reload();
  await page.getByRole('heading', { name, exact: true }).waitFor();
  stage = 'reopening in a second browser';
  const other = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    await other.addCookies(await context.cookies());
    await other.addInitScript(() => { Element.prototype.requestFullscreen = async () => { throw new Error('In-page focus verification'); }; });
    const second = await other.newPage();
    second.on('pageerror', error => errors.push(error.message));
    await second.goto(config.url, { waitUntil: 'networkidle' });
    await second.getByRole('heading', { name, exact: true }).waitFor();
    await second.getByRole('button', { name: 'Atmosphere', exact: true }).first().click();
    assert.equal(await second.getByLabel('Atmosphere intensity', { exact: true }).inputValue(), '100');
    assert.equal(await second.getByLabel('Atmosphere density', { exact: true }).inputValue(), '0');
    assert.equal(await second.getByLabel('Atmosphere gravity', { exact: true }).inputValue(), 'up');
    assert.equal(await second.getByLabel('Atmosphere color', { exact: true }).inputValue(), '#bd88ff');
    assert.equal(await second.getByRole('button', { name: 'Calm mode', exact: true }).getAttribute('aria-pressed'), 'true');
    assert.equal(await second.getByRole('button', { name: 'Christmas scene', exact: true }).getAttribute('aria-pressed'), 'true');
    await second.getByRole('button', { name: 'Close dialog', exact: true }).click();
    await second.getByRole('button', { name: 'Front & center', exact: true }).click();
    await second.locator('.watch-stage > svg').press('Space');
    await mkdir('.setup', { recursive: true });
    await second.screenshot({ path: `.setup/${config.schema}-unreal-phone.png` });
    stage = 'exporting the UNREAL edition';
    await second.getByRole('button', { name: 'Download edition card', exact: true }).click();
    const dialog = second.getByRole('dialog', { name: 'Your edition card', exact: true });
    await dialog.getByRole('tab', { name: 'Atmosphere', exact: true }).click();
    const [png] = await Promise.all([second.waitForEvent('download'), dialog.getByRole('button', { name: 'Download PNG', exact: true }).click()]);
    await png.saveAs(`.setup/${config.schema}-unreal-atmosphere.png`);
    const [zip] = await Promise.all([second.waitForEvent('download'), dialog.getByRole('button', { name: 'Download complete edition', exact: true }).click()]);
    const chunks = []; for await (const chunk of await zip.createReadStream()) chunks.push(Buffer.from(chunk));
    const bytes = Buffer.concat(chunks), files = new Map();
    let offset = 0;
    while (bytes.readUInt32LE(offset) === 0x04034b50) {
      const size = bytes.readUInt32LE(offset + 18), names = bytes.readUInt16LE(offset + 26), extra = bytes.readUInt16LE(offset + 28);
      const filename = bytes.subarray(offset + 30, offset + 30 + names).toString('utf8');
      const start = offset + 30 + names + extra;
      files.set(filename, bytes.subarray(start, start + size)); offset = start + size;
    }
    assert.equal(files.size, 4);
    const manifest = JSON.parse(files.get('design.json').toString('utf8'));
    assert.equal(manifest.design.family, 'noel');
    assert.deepEqual(manifest.design.atmosphere, { intensity: 100, density: 0, gravity: 'up', color: '#bd88ff', calm: true, scene: 'christmas' });
    assert.equal(manifest.presentation.environment.texture, 'snow');
    assert.equal(manifest.presentation.environment.scene, 'christmas');
    assert.ok(Number(manifest.presentation.environment.interactions) > 0);
    await zip.saveAs(`.setup/${config.schema}-unreal-collector.zip`);
    assert.deepEqual(errors, []);
    console.log(`PASS: ${config.schema} six WHITEOUT scenes, FLUX removed, scene controls, Neon save/reopen in a second browser, phone focus, interacted snapshot, Atmosphere PNG and complete ZIP.`);
  } finally { await other.close(); }
} catch (error) {
  console.error(`UNREAL verification failed during: ${stage}`);
  throw error;
} finally {
  try {
    if (originalSelection) {
      await page.goto(config.url, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: /My creations/ }).click();
      try {
        const fixture = page.getByRole('button', { name: `Select ${name}`, exact: true });
        if (await fixture.count()) {
          await fixture.click();
          await page.getByRole('button', { name: 'Remove', exact: true }).click();
          await page.getByRole('button', { name: 'Remove watch', exact: true }).click();
          await page.getByRole('status').filter({ hasText: 'Watch removed from your collection.' }).waitFor();
        }
      } finally {
        await page.goto(config.url, { waitUntil: 'networkidle' });
        await page.getByRole('button', { name: originalSaved ? /My creations/ : 'Originals', exact: !originalSaved }).click();
        const restored = page.waitForResponse(response => response.request().method() === 'POST' && response.status() === 200);
        await page.getByRole('button', { name: originalSelection, exact: true }).click();
        await restored;
        await page.reload();
        assert.equal(await page.getByRole('button', { name: originalSelection, exact: true }).getAttribute('aria-pressed'), 'true');
      }
      console.log('UNREAL verification fixture removed; original selection restored.');
    }
  } finally { await browser.close(); }
}
