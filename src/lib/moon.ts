import { Body, Illumination, MoonPhase } from "astronomy-engine";

export interface MoonPhaseState {
  /** Geocentric Sun–Moon ecliptic-longitude difference / 360, in [0, 1). */
  readonly phase: number;
  /** Fraction of the lunar disc illuminated by the Sun, in [0, 1]. */
  readonly illumination: number;
  readonly name: string;
  readonly waxing: boolean;
}

const MINUTE = 60_000;
const cache = new Map<number, MoonPhaseState>();

function phaseName(phase: number): string {
  // Principal phases are instants. Give their display names a narrow one-degree
  // window; crescent/gibbous names cover the intervening arcs, not equal time bins.
  const window = 1 / 360;
  if (phase <= window || phase >= 1 - window) return "New moon";
  if (Math.abs(phase - .25) <= window) return "First quarter";
  if (Math.abs(phase - .5) <= window) return "Full moon";
  if (Math.abs(phase - .75) <= window) return "Last quarter";
  if (phase < .25) return "Waxing crescent";
  if (phase < .5) return "Waxing gibbous";
  if (phase < .75) return "Waning gibbous";
  return "Waning crescent";
}

/**
 * Offline geocentric lunar geometry evaluated at the start of the UTC minute.
 * A timestamp is an instant; changing a watch's time zone cannot change the Moon.
 * No observer position, horizon rotation, weather, or eclipse darkening is modeled.
 *
 * Astronomy Engine's MoonPhase returns relative ecliptic longitude; Illumination
 * separately accounts for the three-dimensional Sun/Earth/Moon geometry. Do not
 * derive illuminated area from a mean lunar month or from the phase longitude.
 * https://github.com/cosinekitty/astronomy/tree/master/source/js#MoonPhase
 * https://github.com/cosinekitty/astronomy/tree/master/source/js#Illumination
 * Primary-event validation: https://aa.usno.navy.mil/calculated/moon/phases?year=2026
 */
export function getMoonPhase(timestamp: number): MoonPhaseState {
  if (!Number.isFinite(timestamp) || !Number.isFinite(new Date(timestamp).getTime())) {
    throw new RangeError("A finite timestamp within the JavaScript Date range is required.");
  }
  const minute = Math.floor(timestamp / MINUTE);
  const cached = cache.get(minute);
  if (cached) return cached;

  // Pass Date, never the numeric timestamp: Astronomy Engine interprets numeric
  // time arguments as days since J2000, not Unix milliseconds.
  const date = new Date(minute * MINUTE);
  const phase = MoonPhase(date) / 360;
  const illumination = Illumination(Body.Moon, date).phase_fraction;
  if (!Number.isFinite(phase) || !Number.isFinite(illumination)) {
    throw new RangeError("Lunar geometry could not be calculated for this timestamp.");
  }
  const normalized = ((phase % 1) + 1) % 1;
  const result: MoonPhaseState = Object.freeze({
    phase: normalized,
    illumination: Math.max(0, Math.min(1, illumination)),
    name: phaseName(normalized),
    waxing: normalized < .5,
  });
  // All visible watches share a minute's work; historic queries get their own key.
  // Bound the cache so long-lived tabs and tests cannot accumulate lunar ephemerides.
  if (cache.size >= 64) cache.delete(cache.keys().next().value!);
  cache.set(minute, result);
  return result;
}
