"use client";

import { useRef, useEffect, useCallback } from "react";
import { Search, X } from "lucide-react";

interface Props {
  query: string;
  onChange: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ query, onChange, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onChange(val);
      }, 200);
    },
    [onChange]
  );

  const handleClear = useCallback(() => {
    onChange("");
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  }, [onChange]);

  // Sync input value when query changes externally
  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== query) {
      inputRef.current.value = query;
    }
  }, [query]);

  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
      <input
        ref={inputRef}
        type="text"
        defaultValue={query}
        onChange={handleChange}
        placeholder={placeholder || "Search by skill name, statement, or keyword..."}
        className="w-full pl-12 pr-10 py-3 text-lg rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
      />
      {query && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
