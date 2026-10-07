import { describe, expect, it } from "vitest";

import { formatTime, openStatus, openStatusLabel, parseOpeningHours } from "@/lib/services/opening-hours";

// Africa/Lagos is UTC+1 all year (no DST). 2026-10-09 is a Friday.
const lagos = (iso: string) => new Date(`${iso}+01:00`);

const club = parseOpeningHours({
  thu: [["22:00", "04:00"]],
  fri: [["22:00", "05:00"]],
  sat: [["22:00", "05:00"]],
  sun: [["21:00", "03:00"]],
});
const cafe = parseOpeningHours({
  mon: [["07:30", "19:00"]],
  fri: [["07:30", "12:00"], ["14:00", "19:00"]],
});

describe("openStatus in Africa/Lagos", () => {
  it("is open during a same-day interval and reports the closing time", () => {
    const s = openStatus(cafe, lagos("2026-10-09T09:00:00"));
    expect(s).toMatchObject({ isOpen: true, closesAt: "12:00" });
  });

  it("handles split intervals (lunch break)", () => {
    expect(openStatus(cafe, lagos("2026-10-09T13:00:00"))).toMatchObject({
      isOpen: false,
      opensAt: { day: "fri", time: "14:00", dayOffset: 0 },
    });
  });

  it("is open after midnight on an overnight interval from the previous day", () => {
    // Saturday 03:30 → still Friday night's 22:00–05:00 session.
    expect(openStatus(club, lagos("2026-10-10T03:30:00"))).toMatchObject({ isOpen: true, closesAt: "05:00" });
  });

  it("closes exactly at the end time", () => {
    expect(openStatus(club, lagos("2026-10-10T05:00:00")).isOpen).toBe(false);
  });

  it("uses Lagos time, not UTC or the server's zone", () => {
    // 21:30 UTC Friday = 22:30 Lagos Friday → open.
    expect(openStatus(club, new Date("2026-10-09T21:30:00Z")).isOpen).toBe(true);
    // 20:30 UTC Friday = 21:30 Lagos → not yet open.
    expect(openStatus(club, new Date("2026-10-09T20:30:00Z")).isOpen).toBe(false);
  });

  it("finds the next opening day across the week", () => {
    // Monday 10:00 → club next opens Thursday 22:00.
    const s = openStatus(club, lagos("2026-10-12T10:00:00"));
    expect(s.opensAt).toEqual({ day: "thu", time: "22:00", dayOffset: 3 });
    expect(openStatusLabel(s)).toBe("Closed · opens Thu 10pm");
  });

  it("says tomorrow when the next opening is the next day", () => {
    const s = openStatus(club, lagos("2026-10-14T12:00:00")); // Wednesday
    expect(openStatusLabel(s)).toBe("Closed · opens tomorrow 10pm");
  });

  it("supports 24-hour days and missing hours", () => {
    const allDay = parseOpeningHours({ sat: [["00:00", "00:00"]] });
    expect(openStatus(allDay, lagos("2026-10-10T15:00:00")).isOpen).toBe(true);
    expect(openStatus({}, lagos("2026-10-10T15:00:00"))).toEqual({ hasHours: false, isOpen: false });
    expect(parseOpeningHours({ mon: [["25:00", "02:00"]] })).toEqual({});
  });

  it("formats labels", () => {
    expect(formatTime("00:00")).toBe("midnight");
    expect(formatTime("12:00")).toBe("noon");
    expect(formatTime("07:30")).toBe("7:30am");
    expect(formatTime("22:00")).toBe("10pm");
    expect(openStatusLabel(openStatus(club, lagos("2026-10-10T03:30:00")))).toBe("Open · closes 5am");
  });
});
