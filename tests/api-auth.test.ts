import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ requireSession: vi.fn(), getWeather: vi.fn(), searchLocations: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("../src/lib/auth", () => ({ requireSession: mocks.requireSession, AuthError: class AuthError extends Error {}, SetupRequiredError: class SetupRequiredError extends Error {} }));
vi.mock("../src/lib/weather", () => ({ getWeather: mocks.getWeather, searchLocations: mocks.searchLocations }));
import { AuthError, SetupRequiredError } from "../src/lib/auth";
import { GET as weather } from "../src/app/api/weather/route";
import { GET as locations } from "../src/app/api/locations/route";

beforeEach(() => { vi.clearAllMocks(); mocks.requireSession.mockResolvedValue({}); });
describe("private API routes", () => {
  it("blocks direct unauthenticated requests before provider calls", async () => {
    mocks.requireSession.mockRejectedValue(new AuthError());
    expect((await weather(new Request("https://watchme.test/api/weather?lat=40&lon=-74"))).status).toBe(401);
    expect((await locations(new Request("https://watchme.test/api/locations?q=London"))).status).toBe(401);
    expect(mocks.getWeather).not.toHaveBeenCalled();
    expect(mocks.searchLocations).not.toHaveBeenCalled();
  });
  it("fails closed when configuration is absent", async () => {
    mocks.requireSession.mockRejectedValue(new SetupRequiredError());
    expect((await weather(new Request("https://watchme.test/api/weather?lat=40&lon=-74"))).status).toBe(503);
  });
  it("validates coordinates and city names before sending provider requests", async () => {
    expect((await weather(new Request("https://watchme.test/api/weather?lat=999&lon=-74"))).status).toBe(400);
    expect((await locations(new Request("https://watchme.test/api/locations?q=x"))).status).toBe(400);
    expect(mocks.getWeather).not.toHaveBeenCalled();
    expect(mocks.searchLocations).not.toHaveBeenCalled();
  });
  it("keeps stale state explicit and never allows shared response caching", async () => {
    mocks.getWeather.mockResolvedValue({ data: { temperature: 71 }, stale: true });
    const result = await weather(new Request("https://watchme.test/api/weather?lat=40&lon=-74&unit=celsius"));
    expect(await result.json()).toEqual({ ok: true, data: { temperature: 71 }, stale: true });
    expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.getWeather).toHaveBeenCalledWith(40, -74, "celsius");
  });
  it("returns a useful unavailable state without upstream error details", async () => {
    mocks.getWeather.mockRejectedValue(new Error("SECRET provider diagnostic"));
    const result = await weather(new Request("https://watchme.test/api/weather?lat=40&lon=-74"));
    expect(result.status).toBe(502);
    expect(JSON.stringify(await result.json())).not.toContain("SECRET");
  });
});
