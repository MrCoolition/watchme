import { expect, test } from "@playwright/test";

// Optional real Next.js target. Never point this at the standalone Vite fixture.
const target = process.env.WATCHME_SECURITY_BASE_URL;
test.describe("real Next.js unauthenticated boundary", () => {
  test.skip(!target, "Set WATCHME_SECURITY_BASE_URL to a running Next.js development or preview URL.");
  test("private API routes return no data without a session", async ({ request }) => {
    for (const route of ["/api/weather?lat=40&lon=-74", "/api/locations?q=London"]) {
      const response = await request.get(new URL(route, target!).href);
      expect([401, 503]).toContain(response.status());
      const body = await response.json();
      expect(body.ok).toBe(false);
      expect(body.data).toBeUndefined();
      expect(response.headers()["cache-control"]).toContain("no-store");
    }
  });
});
