import { describe, expect, it } from "vitest";
import { currentHouseholdHeadLabel } from "@/lib/domain/registry";

describe("household head display", () => {
  it("does not promote the only current member when no head is recorded", () => {
    expect(currentHouseholdHeadLabel([
      { isHead: false, moveOutAt: null, resident: { firstName: "สมชาย", lastName: "ใจดี" } },
    ])).toBe("ไม่มีข้อมูลเจ้าบ้าน");
  });

  it("shows the explicitly assigned current head", () => {
    expect(currentHouseholdHeadLabel([
      { isHead: false, moveOutAt: null, resident: { firstName: "สมชาย", lastName: "ใจดี" } },
      { isHead: true, moveOutAt: null, resident: { firstName: "วิไล", lastName: "มั่นคง" } },
    ])).toBe("วิไล มั่นคง");
  });

  it("does not show a former head after they move out", () => {
    expect(currentHouseholdHeadLabel([
      { isHead: true, moveOutAt: "2026-01-01", resident: { firstName: "สมชาย", lastName: "ใจดี" } },
    ])).toBe("ไม่มีข้อมูลเจ้าบ้าน");
  });
});
