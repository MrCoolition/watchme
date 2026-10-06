import { describe, expect, it } from "vitest";
import type { Atmosphere } from "../src/lib/types";
import { atmosphereParticleCount, LIQUID_POOLS, liquidDroplet, liquidGeometry, snowParticle } from "../src/lib/unreal-simulation";

const atmosphere: Atmosphere = { intensity: 65, density: 60, gravity: "down", color: "#9BE7FF", calm: false };

describe("timestamp anchored atmospheric geometry", () => {
  it("bounds particle work at both density extremes", () => {
    expect(atmosphereParticleCount("snow", 0)).toBe(0);
    expect(atmosphereParticleCount("snow", 100)).toBe(96);
    expect(atmosphereParticleCount("liquid", 100)).toBe(24);
    expect(atmosphereParticleCount("snow", 300)).toBe(96);
    expect(atmosphereParticleCount("liquid", -20)).toBe(0);
  });
  it("resumes at the same geometry regardless of previous rendered frames", () => {
    const timestamp = Date.parse("2026-10-06T15:27:43.291Z");
    const direct = liquidGeometry(LIQUID_POOLS[0], timestamp, atmosphere);
    for (const elapsed of [0, 16, 33, 1200, 15000]) liquidGeometry(LIQUID_POOLS[0], timestamp - elapsed, atmosphere);
    expect(liquidGeometry(LIQUID_POOLS[0], timestamp, atmosphere)).toEqual(direct);
    expect(snowParticle(14, timestamp, atmosphere)).toEqual(snowParticle(14, timestamp, atmosphere));
    expect(direct.body).not.toContain("NaN");
    expect(direct.body).not.toContain("Infinity");
    expect(direct.body.endsWith("Z")).toBe(true);
  });
  it("moves falling and rising snow in opposite directions", () => {
    const down0 = snowParticle(5, 0, atmosphere);
    const down1 = snowParticle(5, 100, atmosphere);
    const up0 = snowParticle(5, 0, { ...atmosphere, gravity: "up" });
    const up1 = snowParticle(5, 100, { ...atmosphere, gravity: "up" });
    expect(down1.y).toBeGreaterThan(down0.y);
    expect(up1.y).toBeLessThan(up0.y);
  });
  it("has static automatic geometry at zero intensity", () => {
    const still = { ...atmosphere, intensity: 0 };
    expect(liquidGeometry(LIQUID_POOLS[1], 0, still)).toEqual(liquidGeometry(LIQUID_POOLS[1], 590_000, still));
    expect(snowParticle(8, 0, still)).toEqual(snowParticle(8, 590_000, still));
    expect(liquidDroplet(4, 0, still)).toEqual(liquidDroplet(4, 590_000, still));
  });
  it("responds to direct input even on static geometry and dissipates with time", () => {
    const impulse = { x: 240, y: 370, dx: 40, dy: -12, at: 0 };
    const still = { ...atmosphere, intensity: 0 };
    const idle = liquidGeometry(LIQUID_POOLS[0], 0, still);
    expect(liquidGeometry(LIQUID_POOLS[0], 0, still, impulse)).not.toEqual(idle);
    const base = snowParticle(12, 0, still);
    const gust = snowParticle(12, 0, still, impulse);
    const settled = snowParticle(12, 30_000, still, impulse);
    expect(Math.abs(gust.x - base.x)).toBeGreaterThan(10);
    expect(settled.x).toBeCloseTo(base.x, 3);
  });
});
