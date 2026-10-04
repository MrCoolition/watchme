// Real Next.js + Neon browser verification. This creates credentials only in one child process.
// Run: node --env-file=.env.local scripts/verify-local.mjs
import assert from "node:assert/strict";
import { createHmac, randomBytes, scryptSync } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { setTimeout as delay } from "node:timers/promises";
import { neon } from "@neondatabase/serverless";
import { chromium } from "@playwright/test";

const require = createRequire(import.meta.url);
if (!process.env.neon_connect) throw new Error("A development Neon connection is required.");
const sql = neon(process.env.neon_connect);
const base = "http://127.0.0.1:3001";
const passphrase = randomBytes(32).toString("base64url");
const sessionSecret = randomBytes(48).toString("base64url");
const salt = randomBytes(16).toString("hex");
const hash = `scrypt:${salt}:${scryptSync(passphrase, salt, 64).toString("hex")}`;
const name = `Browser verification ${randomBytes(6).toString("hex")}`;
const bucket = createHmac("sha256", sessionSecret).update("local").digest("hex");
const before = await sql`SELECT value, updated_at FROM watchme_dev.preferences WHERE id = 1`;
let browser;
let fixtureId;
let lastPreferences;
let processOutput = "";
let passed = false;
let failureStage = "starting the isolated Next.js server";
const runtimeErrors = [];
const safeDiagnostic = value => String(value).replaceAll(passphrase, "[test credential]").replaceAll(sessionSecret, "[session secret]").replaceAll(hash, "[password hash]").replaceAll(process.env.neon_connect, "[database connection]").slice(0, 3000);
const server = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3001"], {
  windowsHide: true,
  env: { ...process.env, WATCHME_SCHEMA: "watchme_dev", WATCHME_PASSWORD_HASH: hash, SESSION_SECRET: sessionSecret, VERCEL: "", VERCEL_ENV: "", NODE_ENV: "development", NEXT_TELEMETRY_DISABLED: "1" },
  stdio: ["ignore", "pipe", "pipe"],
});
// Keep subprocess diagnostics private: no environment values or browser credentials enter tool output.
server.stdout.on("data", data => { processOutput = (processOutput + data).slice(-16000); });
server.stderr.on("data", data => { processOutput = (processOutput + data).slice(-16000); });
try {
  for (let attempt = 0; attempt < 90; attempt++) {
    if (server.exitCode !== null) throw new Error("The isolated Next.js process exited.");
    try { const response = await fetch(`${base}/login`); if (response.ok) break; } catch { /* Startup can take a few seconds. */ }
    if (attempt === 89) throw new Error("Local application startup timed out.");
    await delay(1000);
  }
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, timezoneId: "America/New_York" });
  const page = await context.newPage();
  page.on("pageerror", error => runtimeErrors.push(error.message));
  failureStage = "checking unauthenticated routes";
  for (const route of ["/api/weather?lat=40&lon=-74", "/api/locations?q=London"]) {
    const response = await context.request.get(`${base}${route}`);
    assert.equal(response.status(), 401);
    assert.equal((await response.json()).ok, false);
  }
  failureStage = "rejecting an incorrect passphrase";
  await page.goto(base);
  await page.waitForURL("**/login");
  await page.getByLabel("YOUR PRIVATE PASSPHRASE", { exact: true }).fill("known-incorrect-test-passphrase");
  await page.getByRole("button", { name: "Enter the studio", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "did not unlock" }).waitFor();
  failureStage = "logging in through the actual server action";
  await page.getByLabel("YOUR PRIVATE PASSPHRASE", { exact: true }).fill(passphrase);
  await page.getByRole("button", { name: "Enter the studio", exact: true }).click();
  await page.locator(".studio-shell").waitFor();
  const cookies = await context.cookies();
  const sessionCookie = cookies.find(cookie => cookie.name === "watchme_watchme_dev_session");
  assert.ok(sessionCookie?.httpOnly);
  assert.equal(sessionCookie.sameSite, "Lax");
  assert.ok(!sessionCookie.value.includes(passphrase));
  failureStage = "saving a customized watch through Neon";
  await page.getByRole("button", { name: "Originals", exact: true }).click();
  await page.getByRole("button", { name: "Select Monolith", exact: true }).click();
  await page.getByRole("button", { name: "Design studio", exact: true }).first().click();
  await page.getByRole("button", { name: "Rose gold", exact: true }).click();
  await page.getByRole("button", { name: "Ultraviolet dial", exact: true }).click();
  await page.getByRole("button", { name: "Add to collection", exact: true }).click();
  await page.getByLabel("Watch name").fill(name);
  await page.getByRole("button", { name: "Save watch", exact: true }).click();
  await page.getByRole("dialog", { name: "Sign your creation.", exact: true }).waitFor({ state: "detached" });
  let rows = await sql`SELECT id, design, favorite FROM watchme_dev.watches WHERE name = ${name}`;
  assert.equal(rows.length, 1);
  fixtureId = rows[0].id;
  assert.equal(rows[0].design.metal, "rose");
  assert.equal(rows[0].design.dialColor, "#40346C");
  failureStage = "reopening and favoriting the saved watch";
  await page.reload();
  await page.getByRole("heading", { name, exact: true }).waitFor();
  await page.getByRole("button", { name: "Favorite", exact: true }).click();
  await page.getByRole("button", { name: "Favorited", exact: true }).waitFor();
  rows = await sql`SELECT favorite FROM watchme_dev.watches WHERE id = ${fixtureId}`;
  assert.equal(rows[0].favorite, true);
  failureStage = "checking cross-browser collection persistence";
  const secondContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const secondPage = await secondContext.newPage();
  await secondPage.goto(`${base}/login`);
  await secondPage.getByLabel("YOUR PRIVATE PASSPHRASE", { exact: true }).fill(passphrase);
  await secondPage.getByRole("button", { name: "Enter the studio", exact: true }).click();
  await secondPage.getByRole("heading", { name, exact: true }).waitFor();
  await secondPage.getByRole("button", { name: "Favorited", exact: true }).waitFor();
  await secondContext.close();
  failureStage = "reading real authenticated weather and location endpoints";
  const locationResponse = await context.request.get(`${base}/api/locations?q=London`);
  assert.equal(locationResponse.status(), 200);
  assert.ok((await locationResponse.json()).data.length > 0);
  const weatherResponse = await context.request.get(`${base}/api/weather?lat=40.7128&lon=-74.006&unit=fahrenheit`);
  assert.equal(weatherResponse.status(), 200);
  const observation = await weatherResponse.json();
  assert.equal(observation.ok, true);
  assert.ok(Number.isFinite(observation.data.temperature));
  failureStage = "locking the studio and checking session removal";
  // Keyboard activation avoids the Next.js development indicator overlapping the bottom-left rail button.
  await page.getByRole("button", { name: "Lock the studio", exact: true }).press("Enter");
  failureStage = "waiting for logout to return to the private entrance";
  await page.waitForURL("**/login");
  failureStage = "verifying the logged-out API session is invalid";
  assert.equal((await context.request.get(`${base}/api/weather?lat=40&lon=-74`)).status(), 401);
  failureStage = "checking browser runtime errors";
  assert.equal(runtimeErrors.length, 0);
  passed = true;
} catch (error) {
  // Keep Playwright action logs and server diagnostic contents out of output: they may contain temporary credentials.
  console.error(`Real browser verification failed while ${failureStage}.`);
  console.error(safeDiagnostic(error instanceof Error ? error.message : "Unknown verification error."));
  for (const error of runtimeErrors) console.error(`Browser: ${safeDiagnostic(error)}`);
  console.error(`Server reported an error: ${/Error:|error/i.test(processOutput) ? "yes" : "no"}. Detailed logs were not printed.`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  // On Windows, terminate the known child process tree so the Next.js worker cannot leave port 3001 occupied.
  if (server.pid && server.exitCode === null) {
    if (process.platform === "win32") {
      await new Promise(resolve => { const stop = spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"], { windowsHide: true, stdio: "ignore" }); stop.on("exit", resolve); });
    } else server.kill("SIGTERM");
  }
  const current = await sql`SELECT value FROM watchme_dev.preferences WHERE id = 1`;
  lastPreferences = current[0]?.value;
  // Restore the original singleton only if no other writer changed it after the last observed test state.
  if (lastPreferences) {
    if (before[0]) await sql`UPDATE watchme_dev.preferences SET value = ${JSON.stringify(before[0].value)}::jsonb, updated_at = ${before[0].updated_at} WHERE id = 1 AND value = ${JSON.stringify(lastPreferences)}::jsonb`;
    else await sql`DELETE FROM watchme_dev.preferences WHERE id = 1 AND value = ${JSON.stringify(lastPreferences)}::jsonb`;
  }
  await sql`DELETE FROM watchme_dev.watches WHERE name = ${name}`;
  await sql`DELETE FROM watchme_dev.login_attempts WHERE bucket = ${bucket}`;
  if (passed) console.log("PASS: real login, wrong-passphrase rejection, encrypted HTTP-only session, Neon save/reload/favorite, second-browser persistence, live weather/location routes, logout and unauthorized endpoints. Development fixtures removed, preferences restored, port 3001 stopped.");
}
