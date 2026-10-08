import { describe, expect, it } from "vitest";

import { availableCurrencies, computeTotals, convert, formatMoney } from "@/lib/itineraries/totals";

const fx = { gbpPerNgn: 0.0005, usdPerNgn: 0.00065 };

describe("itinerary totals (P4)", () => {
  it("per-day subtotals, running total and overall total are correct; unpriced items are counted not guessed", () => {
    const t = computeTotals(
      [
        { day: 1, cost_ngn: 15000 }, { day: 1, cost_ngn: 5000 }, { day: 1, cost_ngn: null },
        { day: 2, cost_ngn: 0 }, { day: 2, cost_ngn: 42500 },
        { day: 3, cost_ngn: null },
      ],
      3,
    );
    expect(t.days).toEqual([
      { day: 1, subtotal: 20000, runningTotal: 20000, priced: 2, unpriced: 1 },
      { day: 2, subtotal: 42500, runningTotal: 62500, priced: 2, unpriced: 0 },
      { day: 3, subtotal: 0, runningTotal: 62500, priced: 0, unpriced: 1 },
    ]);
    expect([t.total, t.priced, t.unpriced]).toEqual([62500, 4, 2]);
  });

  it("items on days beyond the itinerary length are ignored", () => {
    expect(computeTotals([{ day: 1, cost_ngn: 100 }, { day: 5, cost_ngn: 9999 }], 2).total).toBe(100);
  });

  it("FX toggle: converts with the settings rates, offers only configured currencies, formats sensibly", () => {
    expect(convert(62500, "GBP", fx)).toBeCloseTo(31.25);
    expect(convert(62500, "USD", fx)).toBeCloseTo(40.625);
    expect(formatMoney(62500, "NGN", fx)).toBe("₦62,500");
    expect(formatMoney(62500, "GBP", fx)).toBe("£31");
    expect(formatMoney(62500, "USD", fx)).toBe("$41");
    expect(formatMoney(1000, "GBP", fx)).toBe("<£1");
    expect(formatMoney(0, "USD", fx)).toBe("Free");
    expect(availableCurrencies(fx)).toEqual(["NGN", "GBP", "USD"]);
    expect(availableCurrencies({ gbpPerNgn: null, usdPerNgn: 0.0006 })).toEqual(["NGN", "USD"]);
    expect(availableCurrencies({ gbpPerNgn: null, usdPerNgn: null })).toEqual(["NGN"]);
  });
});
