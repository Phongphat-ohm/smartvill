import { describe, expect, it } from "vitest";
import { fundRows, householdRows, invoiceRows, loanRows, productRows, readingRows, residentRows, salesRows } from "@/lib/demo-data";

describe("demo data coverage", () => {
  const modules = { householdRows, residentRows, readingRows, invoiceRows, fundRows, loanRows, productRows, salesRows };

  it.each(Object.entries(modules))("provides enough %s to exercise real list states", (_name, rows) => {
    expect(rows.length).toBeGreaterThanOrEqual(10);
    expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  });
});
