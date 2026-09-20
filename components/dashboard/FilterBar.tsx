"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FilterBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="search" className={cn("flex flex-wrap items-center gap-2.5", className)}>
      {children}
    </div>
  );
}

export function SearchFilter({
  value,
  onChange,
  placeholder,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  className?: string;
}) {
  return (
    <label className={cn("relative block min-w-[220px] flex-1", className)}>
      <span className="sr-only">{label}</span>
      <Search size={15} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-8 text-[13px] text-navy-800 placeholder:text-navy-300 focus-visible:border-royal-400 focus-visible:outline-2 focus-visible:outline-royal-200"
      />
      {value ? (
        <button
          type="button"
          aria-label="Aramayı temizle"
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-navy-300 hover:bg-navy-50 hover:text-navy-600"
        >
          <X size={13} aria-hidden />
        </button>
      ) : null}
    </label>
  );
}

export function SelectFilter({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg border border-line bg-white px-3 pr-8 text-[13px] font-medium text-navy-700 focus-visible:border-royal-400 focus-visible:outline-2 focus-visible:outline-royal-200"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
