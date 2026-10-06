import type { Atmosphere } from "./types";

export interface AtmosphereImpulse { x: number; y: number; dx: number; dy: number; at: number; }
export interface LiquidPool { x: number; y: number; rx: number; ry: number; angle: number; phase: number; }
export const LIQUID_POOLS: readonly LiquidPool[] = [
  { x: 211, y: 373, rx: 57, ry: 118, angle: -19, phase: .7 },
  { x: 421, y: 391, rx: 58, ry: 99, angle: 27, phase: 2.6 },
  { x: 309, y: 489, rx: 104, ry: 34, angle: -8, phase: 4.8 },
  { x: 387, y: 215, rx: 83, ry: 38, angle: -19, phase: 6.2 },
];
const TAU = Math.PI * 2;
const wrap = (value: number, size: number) => (value % size + size) % size;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export function unrealSeed(index: number, salt = 1): number { return wrap(Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123, 1); }
export function atmosphereParticleCount(texture: "liquid" | "snow", density: number): number {
  return Math.round(clamp(density, 0, 100) / 100 * (texture === "liquid" ? 24 : 96));
}
function impulseAt(impulse: AtmosphereImpulse | null, timestamp: number) {
  const decay = impulse ? Math.exp(-Math.max(0, timestamp - impulse.at) / 1900) : 0;
  return { x: (impulse?.dx || 0) * decay, y: (impulse?.dy || 0) * decay, decay };
}
function curve(points: readonly { x: number; y: number }[], closed: boolean): string {
  const rounded = (n: number) => n.toFixed(2);
  let path = `M${rounded(points[0].x)} ${rounded(points[0].y)}`;
  for (let i = 0; i < (closed ? points.length : points.length - 1); i++) {
    const before = points[(i - 1 + points.length) % points.length];
    const current = points[i], next = points[(i + 1) % points.length], after = points[(i + 2) % points.length];
    path += `C${rounded(current.x + (next.x - before.x) / 6)} ${rounded(current.y + (next.y - before.y) / 6)} ${rounded(next.x - (after.x - current.x) / 6)} ${rounded(next.y - (after.y - current.y) / 6)} ${rounded(next.x)} ${rounded(next.y)}`;
  }
  return path + (closed ? "Z" : "");
}
/** Timestamp-derived contours: no accumulated frame state or variable-step integration. */
export function liquidGeometry(pool: LiquidPool, timestamp: number, atmosphere: Atmosphere, impulse: AtmosphereImpulse | null = null) {
  const motion = atmosphere.intensity / 100;
  const t = timestamp / 1000 * .23 * motion;
  const gust = impulseAt(impulse, timestamp);
  const rotation = pool.angle * Math.PI / 180 + Math.sin(t * .45 + pool.phase) * .04 * motion;
  const gravity = atmosphere.gravity === "down" ? 1 : atmosphere.gravity === "up" ? -1 : 0;
  const influence = impulse ? Math.max(.15, 1 - Math.hypot(pool.x - impulse.x, pool.y - impulse.y) / 330) : 0;
  const cx = pool.x + gust.x * .2 * influence;
  const cy = pool.y + gust.y * .2 * influence + gravity * (8 + 4 * Math.sin(t + pool.phase)) * motion;
  const point = (angle: number, scale = 1) => {
    const wave = 1 + (.09 * Math.sin(angle * 3 + t + pool.phase) + .05 * Math.cos(angle * 5 - t * .7 + pool.phase)) * (.5 + motion * .5);
    const x = Math.cos(angle) * pool.rx * wave * scale;
    const y = Math.sin(angle) * pool.ry * wave * scale;
    return { x: cx + x * Math.cos(rotation) - y * Math.sin(rotation), y: cy + x * Math.sin(rotation) + y * Math.cos(rotation) };
  };
  return {
    body: curve(Array.from({ length: 18 }, (_, i) => point(i * TAU / 18)), true),
    ridge: curve(Array.from({ length: 9 }, (_, i) => point(Math.PI * (1.03 + i * .105), .87)), false),
    crease: curve(Array.from({ length: 9 }, (_, i) => point(Math.PI * (.10 + i * .095), .78)), false),
  };
}
export function snowParticle(index: number, timestamp: number, atmosphere: Atmosphere, impulse: AtmosphereImpulse | null = null) {
  const depth = unrealSeed(index, 2);
  const motion = atmosphere.intensity / 100;
  const t = timestamp / 1000;
  const gust = impulseAt(impulse, timestamp);
  const initialX = 135 + unrealSeed(index, 3) * 370;
  const initialY = unrealSeed(index, 4) * 390;
  const speed = (5 + depth * 22) * motion;
  const direction = atmosphere.gravity === "up" ? -1 : 1;
  const floatY = Math.sin(t * .23 * motion + index * 1.7) * (13 + depth * 12);
  const y = atmosphere.gravity === "float" ? 158 + initialY + floatY * motion : 155 + wrap(initialY + t * speed * direction, 390);
  const x = 132 + wrap(initialX - 132 + Math.sin(t * .3 * motion + index) * (5 + depth * 12) * motion + gust.x * (1 + depth * 1.5), 376);
  return { x, y: y + gust.y * (.4 + depth), radius: .65 + depth * depth * 2.2, opacity: .22 + depth * .72, angle: wrap(t * (3 + depth * 8) * motion + index * 37 + gust.x, 360), depth };
}
export function liquidDroplet(index: number, timestamp: number, atmosphere: Atmosphere, impulse: AtmosphereImpulse | null = null) {
  const t = timestamp / 1000 * atmosphere.intensity / 100;
  const gust = impulseAt(impulse, timestamp);
  const angle = unrealSeed(index, 7) * TAU + Math.sin(t * .13 + index) * .035;
  const radius = 105 + unrealSeed(index, 8) * 59;
  const gravity = atmosphere.gravity === "down" ? 1 : atmosphere.gravity === "up" ? -1 : 0;
  return { x: 320 + Math.cos(angle) * radius + Math.sin(t * .24 + index) * 4 + gust.x * .32, y: 350 + Math.sin(angle) * radius + Math.cos(t * .29 + index) * 4 + gravity * 8 + gust.y * .3, radius: 1.8 + unrealSeed(index, 9) ** 2 * 8.5 };
}
