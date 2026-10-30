import { describe, expect, it } from "vitest";
import { decodeRegistryCursor, encodeRegistryCursor, registrySearchParam } from "@/lib/registry-query";

describe("registry cursor", () => {
  it("round-trips Thai sort values without exposing raw JSON", () => {
    const cursor = { primary: "ศรีสุข", secondary: "กมล", id: "9d4e7b65-c99a-4434-a81d-f613e25c287e" };
    const encoded = encodeRegistryCursor(cursor);
    expect(encoded).not.toContain("ศรีสุข");
    expect(decodeRegistryCursor(encoded)).toEqual(cursor);
  });

  it("rejects malformed cursors and bounds search input", () => {
    expect(decodeRegistryCursor("not-a-cursor")).toBeNull();
    expect(registrySearchParam(["  บ้านเลขที่ 44/2  "], 10)).toBe("บ้านเลขที่");
  });
});
