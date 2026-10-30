// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { Autocomplete } from "@/components/ui/autocomplete";

const options = [
  { value: "house-44", label: "บ้านเลขที่ 44/2 · หมู่ 3" },
  { value: "house-72", label: "บ้านเลขที่ 72/1 · หมู่ 3" },
  { value: "house-118", label: "บ้านเลขที่ 118 · หมู่ 3" },
];

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

describe("Autocomplete", () => {
  it("filters and selects a household with the keyboard", () => {
    const { container } = render(<Autocomplete name="householdId" options={options} required />);
    const input = screen.getByRole("combobox");

    fireEvent.change(input, { target: { value: "72/1" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(input).toHaveValue("บ้านเลขที่ 72/1 · หมู่ 3");
    expect(container.querySelector<HTMLInputElement>('input[name="householdId"]')).toHaveValue("house-72");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("moves through options with arrow keys", () => {
    const { container } = render(<Autocomplete name="destinationHouseholdId" options={options} />);
    const input = screen.getByRole("combobox");

    fireEvent.focus(input);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(container.querySelector<HTMLInputElement>('input[name="destinationHouseholdId"]')).toHaveValue("house-72");
  });
});
