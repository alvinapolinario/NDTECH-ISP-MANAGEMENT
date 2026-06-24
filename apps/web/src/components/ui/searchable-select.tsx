"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export type SelectOption = {
  label: string;
  value: string;
};

type SearchableSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  emptyOptionLabel?: string;
  searchPlaceholder?: string;
  required?: boolean;
  disabled?: boolean;
  includeEmptyOption?: boolean;
  className?: string;
};

const defaultTriggerClass =
  "flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-sm outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-50";

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  emptyOptionLabel = "Select",
  searchPlaceholder = "Search options...",
  required = false,
  disabled = false,
  includeEmptyOption = true,
  className,
}: SearchableSelectProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalized) ||
        option.value.toLowerCase().includes(normalized),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        setQuery("");
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);
    searchRef.current?.focus();

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  function chooseOption(nextValue: string) {
    onChange(nextValue);
    setOpen(false);
    setQuery("");
  }

  const displayValue =
    selectedOption?.label ??
    (value ? value : includeEmptyOption ? emptyOptionLabel : placeholder);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
        }}
        className={className ?? defaultTriggerClass}
      >
        <span className={selectedOption ? "text-slate-900" : "text-slate-500"}>
          {displayValue}
        </span>
        <span className="ml-2 text-slate-400" aria-hidden>
          ▾
        </span>
      </button>

      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          value={value}
          required
          readOnly
          onChange={() => undefined}
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      ) : null}

      {open ? (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b p-2">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <ul
            id={listId}
            role="listbox"
            className="max-h-60 overflow-y-auto py-1 text-sm"
          >
            {includeEmptyOption ? (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === ""}
                  onClick={() => chooseOption("")}
                  className={`block w-full px-3 py-2 text-left hover:bg-emerald-50 ${
                    value === "" ? "bg-emerald-50 font-medium text-emerald-800" : ""
                  }`}
                >
                  {emptyOptionLabel}
                </button>
              </li>
            ) : null}
            {filteredOptions.map((option) => (
              <li key={`${option.value}-${option.label}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => chooseOption(option.value)}
                  className={`block w-full px-3 py-2 text-left hover:bg-emerald-50 ${
                    value === option.value
                      ? "bg-emerald-50 font-medium text-emerald-800"
                      : ""
                  }`}
                >
                  {option.label}
                </button>
              </li>
            ))}
            {!filteredOptions.length ? (
              <li className="px-3 py-3 text-slate-500">No matching options.</li>
            ) : null}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
