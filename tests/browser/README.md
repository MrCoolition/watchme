# Browser verification

The Vite harness renders the actual `WatchStudio`, SVG watch renderer, hooks, dialogs, and production stylesheet. It replaces only `@/app/actions` with local test doubles through `vite.browser.config.ts`. Saved test creations live in this browser origin's local storage. This entry is outside the Next.js app and is never a production route or authentication bypass.

Run `pnpm test:e2e` to start the harness on `http://127.0.0.1:4173` and execute the Chromium UI integration suite. Run `pnpm exec vite --config vite.browser.config.ts` for manual visual inspection. Playwright's first setup requires `pnpm exec playwright install chromium`.

These tests verify interface flows and error recovery. They do **not** establish deployed authentication, real Neon persistence, or cross-device synchronization.

For the real unauthenticated Next.js boundary test, set `WATCHME_SECURITY_BASE_URL` to a running Next.js development or Vercel preview URL and run the suite. Its requests carry no session. An unconfigured studio must return setup-required responses; a configured studio must require authentication.

The opt-in Neon suite is separate: run `tests/database.integration.test.ts` through Vitest with `neon_connect`, a migrated `watchme_dev` or `watchme_preview` schema, and `WATCHME_RUN_DB_TESTS=1`. It refuses the production schema, uses unique fixture identifiers, and removes its fixtures afterward. Full deployed login → save → cross-device verification additionally requires the private passphrase, which is never embedded in these tests.
