import { getClockParts } from "./time";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Calendar and ISO week follow the watch's primary time zone, including at midnight. */
export function getCalendarState(timestamp: number, timezone?: string) {
  const parts = getClockParts(timestamp, timezone);
  // Work in UTC using the selected zone's civil date, so DST cannot change day lengths.
  const thursday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  const weekday = thursday.getUTCDay() || 7;
  thursday.setUTCDate(thursday.getUTCDate() + 4 - weekday);
  const isoWeekYear = thursday.getUTCFullYear();
  const yearStart = Date.UTC(isoWeekYear, 0, 1);
  const isoWeek = Math.ceil(((thursday.getTime() - yearStart) / 86_400_000 + 1) / 7);
  return { day: parts.day, weekday: parts.weekday, month: MONTHS[parts.month - 1], year: parts.year, isoWeek, isoWeekYear };
}
