import { describe, expect, it } from "vitest";
import { applyWaterPayment, calculateWaterCharge, evaluateReading } from "@/lib/domain/water";

describe("water tariff calculations", () => {
  it("adds a service fee to a fixed rate", () => {
    expect(calculateWaterCharge(12, { mode: "flat", ratePerCubicMeter: 8.5, serviceFee: 20 })).toBe(122);
  });

  it("charges progressive tiers cumulatively", () => {
    expect(calculateWaterCharge(15, { mode: "progressive", serviceFee: 5, tiers: [
      { upToCubicMeters: 10, ratePerCubicMeter: 4 },
      { upToCubicMeters: null, ratePerCubicMeter: 8 },
    ] })).toBe(85);
  });

  it("holds a reading below the previous value or beyond the threshold", () => {
    expect(evaluateReading(100, 98).reason).toBe("decrease");
    expect(evaluateReading(100, 201, 100)).toMatchObject({ requiresReview: true, reason: "high_usage", usage: 101 });
    expect(evaluateReading(100, 150, 100)).toMatchObject({ requiresReview: false, usage: 50 });
  });

  it("allocates partial and full payments without allowing overpayment", () => {
    expect(applyWaterPayment(100, 35)).toEqual({ remaining: 65, status: "partially_paid" });
    expect(applyWaterPayment(100, 100)).toEqual({ remaining: 0, status: "paid" });
    expect(() => applyWaterPayment(100, 101)).toThrow();
  });
});
