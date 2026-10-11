"use client";

import { Search, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  suggestions?: string[];
  loading?: boolean;
}

export default function SearchBar({ value, onChange, onSubmit, suggestions = [], loading }: Props) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        ref.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" size={18} />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }}
          placeholder='Try "government shutdown", "bitcoin 2026", or "who wins the Super Bowl"...'
          className="w-full rounded-2xl border border-border bg-surface pl-12 pr-24 py-4 text-[15px] text-text placeholder:text-muted outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              onClick={() => onChange("")}
              className="p-2 text-muted hover:text-text"
              aria-label="Clear"
            >
              <X size={16} />
            </button>
          )}
          <button
            onClick={onSubmit}
            className="px-3 py-1.5 rounded-lg bg-accent text-white text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "..." : "Search"}
          </button>
        </div>
      </div>

      {focused && suggestions.length > 0 && (
        <div className="mt-2 rounded-xl border border-border bg-surface/95 backdrop-blur p-2">
          <div className="flex items-center gap-2 px-2 py-1 text-[11px] text-muted">
            <Sparkles size={12} /> try one of these
          </div>
          <div className="flex flex-wrap gap-2 p-1">
            {suggestions.map((s) => (
              <button
                key={s}
                onMouseDown={(e) => { e.preventDefault(); onChange(s); onSubmit(); }}
                className="px-2.5 py-1 rounded-full text-[12px] border border-border hover:border-accent/40 text-text/90"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
