import type { Atmosphere } from "./types";

export interface AtmosphereImpulse { x: number; y: number; dx: number; dy: number; at: number; }
const wrap = (value: number, size: number) => (value % size + size) % size;
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export function unrealSeed(index: number, salt = 1): number { return wrap(Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123, 1); }
export function atmosphereParticleCount(density: number): number { return Math.round(clamp(density, 0, 100) / 100 * 96); }
function impulseAt(impulse: AtmosphereImpulse | null, timestamp: number) {
  const decay = impulse ? Math.exp(-Math.max(0, timestamp - impulse.at) / 1900) : 0;
  return { x: (impulse?.dx || 0) * decay, y: (impulse?.dy || 0) * decay };
}

/** Pure timestamp-derived particles resume without accumulating frame or background drift. */
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

/** Curtains and lights share the snow clock, so Calm and exported snapshots freeze everything. */
export function auroraCurtain(index: number, timestamp: number, intensity: number): string {
  const t = timestamp / 1000 * .12 * clamp(intensity, 0, 100) / 100;
  const offset = index * 22;
  const a = Math.sin(t + index * 1.1) * 15, b = Math.cos(t * .73 + index) * 18;
  return `M115 ${234 + offset}C190 ${190 + offset + a} 212 ${331 + offset + b} 290 ${255 + offset}S420 ${205 + offset + b} 527 ${245 + offset + a}L527 ${179 + offset}C424 ${165 + offset} 385 ${189 + offset} 285 ${196 + offset}S194 ${183 + offset} 115 ${167 + offset}Z`;
}
export function sceneLight(index: number, timestamp: number, intensity: number): number {
  const t = timestamp / 1000 * clamp(intensity, 0, 100) / 100;
  return .6 + Math.sin(t * (.45 + unrealSeed(index, 31) * .6) + index * 2.4) * .18;
}
export function sceneComet(timestamp: number, intensity: number) {
  const t = wrap(.28 + timestamp / 1000 * .016 * clamp(intensity, 0, 100) / 100, 1);
  return { x: 270 + t * 155, y: 224 + t * 57, opacity: Math.sin(t * Math.PI) * .8 };
}
