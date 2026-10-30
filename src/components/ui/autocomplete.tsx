"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";

export type AutocompleteOption = { value: string; label: string };

type AutocompleteProps = {
  name: string;
  options: AutocompleteOption[];
  defaultValue?: string;
  placeholder?: string;
  emptyMessage?: string;
  required?: boolean;
  autoFocus?: boolean;
  allowClear?: boolean;
};

export function Autocomplete({
  name,
  options,
  defaultValue = "",
  placeholder = "พิมพ์เพื่อค้นหา...",
  emptyMessage = "ไม่พบรายการที่ค้นหา",
  required = false,
  autoFocus = false,
  allowClear = true,
}: AutocompleteProps) {
  const inputId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectedAtStart = options.find((option) => option.value === defaultValue);
  const [selectedValue, setSelectedValue] = useState(defaultValue);
  const [query, setQuery] = useState(selectedAtStart?.label ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedOption = options.find((option) => option.value === selectedValue);
  const normalizedQuery = query.trim().toLocaleLowerCase("th");
  const filteredOptions = useMemo(() => {
    if (!normalizedQuery || query === selectedOption?.label) return options;
    return options.filter((option) => option.label.toLocaleLowerCase("th").includes(normalizedQuery));
  }, [normalizedQuery, options, query, selectedOption?.label]);

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    const form = rootRef.current?.closest("form");
    function resetSelection() {
      const option = options.find((item) => item.value === defaultValue);
      setSelectedValue(defaultValue);
      setQuery(option?.label ?? "");
      setOpen(false);
      setActiveIndex(-1);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    form?.addEventListener("reset", resetSelection);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      form?.removeEventListener("reset", resetSelection);
    };
  }, [defaultValue, options]);

  useEffect(() => {
    if (open && activeIndex >= 0) document.getElementById(`${listboxId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId, open]);

  function choose(option: AutocompleteOption) {
    setSelectedValue(option.value);
    setQuery(option.label);
    setOpen(false);
    setActiveIndex(-1);
  }

  function clear() {
    setSelectedValue("");
    setQuery("");
    setOpen(true);
    setActiveIndex(options.length ? 0 : -1);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => filteredOptions.length ? Math.min(current + 1, filteredOptions.length - 1) : -1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => filteredOptions.length ? (current <= 0 ? filteredOptions.length - 1 : current - 1) : -1);
    } else if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      const option = filteredOptions[activeIndex];
      if (option) choose(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={selectedValue} />
      <div className="relative">
        <Search aria-hidden="true" size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          id={inputId}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          aria-required={required}
          autoComplete="off"
          autoFocus={autoFocus}
          value={query}
          placeholder={placeholder}
          onFocus={() => { setOpen(true); setActiveIndex(filteredOptions.length ? 0 : -1); }}
          onChange={(event) => { setQuery(event.target.value); setSelectedValue(""); setOpen(true); setActiveIndex(0); }}
          onKeyDown={handleKeyDown}
          className="h-11 w-full rounded-lg border border-[var(--border)] bg-white pl-9 pr-16 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-3 focus:ring-blue-100"
        />
        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center">
          {allowClear && (query || selectedValue) && <button type="button" aria-label="ล้างรายการที่เลือก" onClick={clear} className="flex size-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={14} /></button>}
          <button type="button" aria-label={open ? "ปิดรายการ" : "เปิดรายการ"} onClick={() => { setOpen((value) => !value); inputRef.current?.focus(); }} className="flex size-9 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"><ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} /></button>
        </div>
      </div>
      {open && <div id={listboxId} role="listbox" className="absolute z-[70] mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-[var(--border)] bg-white p-1.5 shadow-[0_14px_36px_rgb(31_65_104_/_14%)]">
        {filteredOptions.length ? filteredOptions.map((option, index) => {
          const selected = option.value === selectedValue;
          const active = index === activeIndex;
          return <button key={`${option.value}-${index}`} id={`${listboxId}-${index}`} type="button" role="option" aria-selected={selected} onPointerDown={(event) => event.preventDefault()} onClick={() => choose(option)} onMouseEnter={() => setActiveIndex(index)} className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${active ? "bg-[var(--primary-soft)] text-[#0075d1]" : "text-slate-700 hover:bg-slate-50"}`}><span>{option.label}</span>{selected && <Check aria-hidden="true" size={15} className="shrink-0" />}</button>;
        }) : <p className="px-3 py-6 text-center text-sm text-slate-500">{emptyMessage}</p>}
      </div>}
    </div>
  );
}
