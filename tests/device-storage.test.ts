import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { accountStorageKey, readAccountStorage } from "../src/lib/device-storage";

describe("account-scoped device state", () => {
  let values: Map<string, string>;
  beforeEach(() => {
    values = new Map();
    vi.stubGlobal("localStorage", {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
      removeItem: vi.fn((key: string) => values.delete(key)),
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("never gives another account the original owner's device state", () => {
    values.set("watchme.draft.v1.monolith", "owner draft");
    expect(readAccountStorage("visitor", false, "watchme.draft.v1.monolith")).toBeNull();
    expect(values.get("watchme.draft.v1.monolith")).toBe("owner draft");
    expect(readAccountStorage("owner", true, "watchme.draft.v1.monolith")).toBe("owner draft");
    expect(values.has("watchme.draft.v1.monolith")).toBe(false);
    expect(values.get(accountStorageKey("owner", "watchme.draft.v1.monolith"))).toBe("owner draft");
    expect(readAccountStorage("visitor", false, "watchme.draft.v1.monolith")).toBeNull();
  });

  it("keeps saved state separate and prefers it over a legacy key", () => {
    values.set(accountStorageKey("one", "watchme.timers.v1"), "timer one");
    values.set(accountStorageKey("two", "watchme.timers.v1"), "timer two");
    values.set("watchme.timers.v1", "old timer");
    expect(readAccountStorage("one", true, "watchme.timers.v1")).toBe("timer one");
    expect(readAccountStorage("two", false, "watchme.timers.v1")).toBe("timer two");
    expect(readAccountStorage("three", false, "watchme.timers.v1")).toBeNull();
  });

  it("recovers the owner's previous FLUX draft into WHITEOUT's scoped key", () => {
    values.set("watchme.draft.v1.flux", "legacy design");
    expect(readAccountStorage("owner", true, "watchme.draft.v1.whiteout", ["watchme.draft.v1.flux"])).toBe("legacy design");
    expect(values.has("watchme.draft.v1.flux")).toBe(false);
    expect(values.get(accountStorageKey("owner", "watchme.draft.v1.whiteout"))).toBe("legacy design");
  });

  it("preserves the only draft copy if storage is full or blocked", () => {
    values.set("watchme.draft.v1.apex", "precious draft");
    vi.mocked(localStorage.setItem).mockImplementation(() => { throw new Error("Quota exceeded"); });
    expect(readAccountStorage("owner", true, "watchme.draft.v1.apex")).toBe("precious draft");
    expect(values.get("watchme.draft.v1.apex")).toBe("precious draft");
    expect(localStorage.removeItem).not.toHaveBeenCalled();
  });
});
