/** Calendar values are computed by Intl so IANA time zones and DST stay authoritative. */
export interface ClockParts {
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  day: number;
  month: number;
  year: number;
  weekday: string;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

export function getClockParts(timestamp: number, timezone?: string): ClockParts {
  if (!Number.isFinite(timestamp)) throw new RangeError("A finite timestamp is required.");
  const zone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  let formatter = formatters.get(zone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: zone, hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit",
      year: "numeric", month: "2-digit", day: "2-digit", weekday: "short",
    });
    formatters.set(zone, formatter);
  }
  const parts = Object.fromEntries(formatter.formatToParts(timestamp).map((part) => [part.type, part.value]));
  return {
    hour: Number(parts.hour) % 24, minute: Number(parts.minute), second: Number(parts.second),
    millisecond: ((timestamp % 1000) + 1000) % 1000, day: Number(parts.day), month: Number(parts.month),
    year: Number(parts.year), weekday: parts.weekday,
  };
}

export function getHandAngles(parts: ClockParts) {
  const seconds = parts.second + parts.millisecond / 1000;
  const minutes = parts.minute + seconds / 60;
  return { second: seconds * 6, minute: minutes * 6, hour: (parts.hour % 12 + minutes / 60) * 30, gmt: (parts.hour + minutes / 60) * 15 };
}
