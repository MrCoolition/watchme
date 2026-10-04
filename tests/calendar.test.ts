import { describe, expect, it } from "vitest";
import { getCalendarState } from "../src/lib/calendar";

describe("live calendar complication", () => {
  it("rolls over at midnight in the selected watch zone", () => {
    const timestamp = Date.parse("2026-10-04T00:30:00Z");
    expect(getCalendarState(timestamp, "America/New_York")).toMatchObject({ day: 3, weekday: "Sat", month: "Oct", year: 2026 });
    expect(getCalendarState(timestamp, "Asia/Tokyo")).toMatchObject({ day: 4, weekday: "Sun", month: "Oct", year: 2026 });
  });

  it.each([
    ["2024-02-29T23:59:59Z", 29, "Feb", 2024, 9, 2024],
    ["2024-03-01T00:00:00Z", 1, "Mar", 2024, 9, 2024],
    ["2020-12-31T12:00:00Z", 31, "Dec", 2020, 53, 2020],
    ["2021-01-01T12:00:00Z", 1, "Jan", 2021, 53, 2020],
    ["2021-01-04T12:00:00Z", 4, "Jan", 2021, 1, 2021],
    ["2024-12-30T12:00:00Z", 30, "Dec", 2024, 1, 2025],
  ])("handles leap days and ISO week years at %s", (date, day, month, year, isoWeek, isoWeekYear) => {
    expect(getCalendarState(Date.parse(date as string), "UTC")).toMatchObject({ day, month, year, isoWeek, isoWeekYear });
  });

  it.each([
    ["2026-03-08T06:59:59Z", "2026-03-08T07:00:00Z"],
    ["2026-11-01T05:59:59Z", "2026-11-01T06:00:00Z"],
  ])("keeps calendar values stable across DST at %s", (before, after) => {
    expect(getCalendarState(Date.parse(before), "America/New_York")).toEqual(getCalendarState(Date.parse(after), "America/New_York"));
  });
});
