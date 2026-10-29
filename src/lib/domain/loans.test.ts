import { describe, expect, it } from "vitest";
import { createLoanSchedule } from "@/lib/domain/loans";

describe("loan repayment schedules", () => {
  it("creates a fixed-interest schedule that repays principal exactly", () => {
    const schedule = createLoanSchedule(12000, 12, 12, "flat");
    expect(schedule).toHaveLength(12);
    expect(schedule.reduce((sum, item) => sum + item.principal, 0)).toBe(12000);
    expect(schedule.reduce((sum, item) => sum + item.interest, 0)).toBe(1440);
    expect(schedule.at(-1)?.remainingPrincipal).toBe(0);
  });

  it("reduces interest as the principal falls and supports zero interest", () => {
    const declining = createLoanSchedule(12000, 12, 12, "declining");
    expect(declining[0].interest).toBeGreaterThan(declining.at(-1)!.interest);
    expect(declining.at(-1)?.remainingPrincipal).toBe(0);
    const zero = createLoanSchedule(1200, 0, 12, "declining");
    expect(zero.every((item) => item.interest === 0)).toBe(true);
  });

  it("rejects invalid loan inputs", () => {
    expect(() => createLoanSchedule(0, 5, 12, "flat")).toThrow();
    expect(() => createLoanSchedule(1000, 5, 0, "flat")).toThrow();
  });
});
