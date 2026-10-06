import { describe, expect, it } from "vitest";
import type { Atmosphere } from "../src/lib/types";
import { atmosphereParticleCount, auroraCurtain, sceneComet, sceneLight, snowParticle } from "../src/lib/unreal-simulation";

const atmosphere: Atmosphere = { intensity: 65, density: 60, gravity: "down", color: "#9BE7FF", calm: false };

describe("timestamp anchored winter worlds", () => {
  it("bounds snow particle work at both density extremes", () => {
    expect(atmosphereParticleCount(0)).toBe(0);
    expect(atmosphereParticleCount(100)).toBe(96);
    expect(atmosphereParticleCount(300)).toBe(96);
    expect(atmosphereParticleCount(-20)).toBe(0);
  });
  it("resumes geometry independently of previous frames", () => {
    const timestamp = Date.parse("2026-10-06T15:27:43.291Z");
    const direct = snowParticle(14, timestamp, atmosphere);
    const curtain = auroraCurtain(2, timestamp, 65);
    for (const elapsed of [0, 16, 33, 1200, 15000]) {
      snowParticle(14, timestamp - elapsed, atmosphere);
      auroraCurtain(2, timestamp - elapsed, 65);
    }
    expect(snowParticle(14, timestamp, atmosphere)).toEqual(direct);
    expect(auroraCurtain(2, timestamp, 65)).toEqual(curtain);
    expect(curtain).not.toMatch(/NaN|Infinity/);
    expect(curtain.endsWith("Z")).toBe(true);
  });
  it("moves falling and rising snow in opposite directions", () => {
    const down0 = snowParticle(5, 0, atmosphere);
    const down1 = snowParticle(5, 100, atmosphere);
    const up0 = snowParticle(5, 0, { ...atmosphere, gravity: "up" });
    const up1 = snowParticle(5, 100, { ...atmosphere, gravity: "up" });
    expect(down1.y).toBeGreaterThan(down0.y);
    expect(up1.y).toBeLessThan(up0.y);
  });
  it("freezes every automatic element at zero intensity", () => {
    const still = { ...atmosphere, intensity: 0 };
    expect(snowParticle(8, 0, still)).toEqual(snowParticle(8, 590_000, still));
    expect(auroraCurtain(2, 0, 0)).toEqual(auroraCurtain(2, 590_000, 0));
    expect(sceneLight(8, 0, 0)).toEqual(sceneLight(8, 590_000, 0));
    expect(sceneComet(0, 0)).toEqual(sceneComet(590_000, 0));
  });
  it("keeps active scene animation bounded over distant timestamps", () => {
    for (const timestamp of [0, 1e4, 1e8, 1791296863291]) {
      for (let index = 0; index < 40; index++) {
        expect(sceneLight(index, timestamp, 100)).toBeGreaterThanOrEqual(.42);
        expect(sceneLight(index, timestamp, 100)).toBeLessThanOrEqual(.78);
      }
      const comet = sceneComet(timestamp, 100);
      expect(comet.x).toBeGreaterThanOrEqual(270);
      expect(comet.x).toBeLessThanOrEqual(425);
      expect(comet.y).toBeGreaterThanOrEqual(224);
      expect(comet.y).toBeLessThanOrEqual(281);
      expect(comet.opacity).toBeGreaterThanOrEqual(0);
      expect(comet.opacity).toBeLessThanOrEqual(.8);
    }
  });
  it("responds to direct input on static geometry and dissipates with time", () => {
    const impulse = { x: 240, y: 370, dx: 40, dy: -12, at: 0 };
    const still = { ...atmosphere, intensity: 0 };
    const base = snowParticle(12, 0, still);
    const gust = snowParticle(12, 0, still, impulse);
    const settled = snowParticle(12, 30_000, still, impulse);
    expect(Math.abs(gust.x - base.x)).toBeGreaterThan(10);
    expect(settled.x).toBeCloseTo(base.x, 3);
  });
});
