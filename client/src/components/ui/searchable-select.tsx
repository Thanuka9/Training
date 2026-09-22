import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SearchableOption = {
  id: string;
  label: string;
  description?: string;
};

type Props = {
  id?: string;
  value: string;
  options: SearchableOption[];
  onChange: (id: string, option: SearchableOption | null) => void;
  onSearchChange?: (query: string) => void;
  searchValue?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
};

/** Single dropdown with built-in search filter (combobox). */
export function SearchableSelect({
  id,
  value,
  options,
  onChange,
  onSearchChange,
  searchValue,
  placeholder = "Select…",
  searchPlaceholder = "Type to search…",
  disabled,
  loading,
  emptyMessage = "No matches",
  className,
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [internalQuery, setInternalQuery] = useState("");
  const query = searchValue ?? internalQuery;

  const selected = useMemo(() => options.find((item) => item.id === value) ?? null, [options, value]);

  const filtered = useMemo(() => {
    // When parent drives search via API, options are already filtered — still apply light local filter for snappy typing.
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((item) =>
      [item.label, item.description ?? ""].join(" ").toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (open) {
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  function setQuery(next: string) {
    if (searchValue === undefined) setInternalQuery(next);
    onSearchChange?.(next);
  }

  function pick(option: SearchableOption) {
    onChange(option.id, option);
    setQuery(option.label);
    setOpen(false);
  }

  function clear() {
    onChange("", null);
    setQuery("");
    setOpen(true);
    inputRef.current?.focus();
  }

  const display = selected?.label ?? (open ? "" : placeholder);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (disabled) return;
          setOpen((current) => !current);
          if (!open && selected) setQuery("");
        }}
        className={cn(
          "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 text-left text-sm shadow-sm outline-none",
          "focus:border-navy focus:ring-2 focus:ring-navy/20",
          disabled ? "cursor-not-allowed bg-slate-100 text-slate-500" : "text-ink",
          !selected && !open ? "text-slate-400" : "",
        )}
      >
        <span className="truncate">{open && !selected ? placeholder : display}</span>
        <span className="flex shrink-0 items-center gap-1 text-slate-500">
          {selected && !disabled ? (
            <span
              role="button"
              tabIndex={-1}
              className="rounded px-1 text-xs hover:bg-slate-100 hover:text-ink"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
            >
              Clear
            </span>
          ) : null}
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </span>
      </button>

      {open && !disabled ? (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="border-b border-slate-100 p-2">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy/20"
              aria-autocomplete="list"
              aria-controls={listId}
            />
          </div>
          <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {loading ? (
              <li className="px-3 py-2 text-sm text-slate-500">Searching…</li>
            ) : null}
            {!loading && filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-slate-500">{emptyMessage}</li>
            ) : null}
            {filtered.map((item) => {
              const isSelected = item.id === value;
              return (
                <li key={item.id} role="option" aria-selected={isSelected}>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-navy/5",
                      isSelected ? "bg-navy/10 font-medium text-navy" : "text-ink",
                    )}
                    onClick={() => pick(item)}
                  >
                    <span>{item.label}</span>
                    {item.description ? (
                      <span className="text-xs font-normal text-slate-500">{item.description}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
