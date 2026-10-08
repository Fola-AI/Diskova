import { describe, expect, it } from "vitest";

import { capAwards, DAILY_CAP } from "@/lib/services/points";

describe("points daily cap (§6.20)", () => {
  const checkin = [
    { kind: "checkin", points: 3 },
    { kind: "checkin_with_photo", points: 2 },
    { kind: "checkin_at_venue", points: 2 },
    { kind: "first_at_vendor", points: 5 },
  ];

  it("awards everything when under the cap", () => {
    expect(capAwards(checkin, 0).reduce((s, a) => s + a.points, 0)).toBe(12);
  });

  it("trims the award that crosses the cap and drops the rest", () => {
    const out = capAwards(checkin, DAILY_CAP - 4);
    expect(out).toEqual([
      { kind: "checkin", points: 3 },
      { kind: "checkin_with_photo", points: 1 },
    ]);
  });

  it("awards nothing once the cap is reached", () => {
    expect(capAwards(checkin, DAILY_CAP)).toEqual([]);
    expect(capAwards(checkin, DAILY_CAP + 10)).toEqual([]);
  });
});
