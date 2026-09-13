"use client";

import type {
  ChangeEvent,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

type FieldWrapperProps = {
  label: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

export function FieldWrapper({
  label,
  htmlFor,
  required,
  error,
  hint,
  className,
  children,
}: FieldWrapperProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-sm font-semibold text-navy-800">
        {label}
        {required ? <span className="ml-0.5 text-brand-500">*</span> : null}
      </label>
      {children}
      {hint && !error ? <p className="text-xs text-navy-400">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}

const inputBase =
  "h-11 w-full rounded-xl border bg-white px-3.5 text-sm text-navy-900 outline-none transition-colors placeholder:text-navy-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10";

export function TextField({
  label,
  id,
  required,
  error,
  hint,
  className,
  ...rest
}: {
  label: string;
  id: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className">) {
  return (
    <FieldWrapper label={label} htmlFor={id} required={required} error={error} hint={hint} className={className}>
      <input
        id={id}
        className={cn(inputBase, error ? "border-rose-300" : "border-navy-100")}
        {...rest}
      />
    </FieldWrapper>
  );
}

export function TextareaField({
  label,
  id,
  required,
  error,
  hint,
  className,
  ...rest
}: {
  label: string;
  id: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id" | "className">) {
  return (
    <FieldWrapper label={label} htmlFor={id} required={required} error={error} hint={hint} className={className}>
      <textarea
        id={id}
        className={cn(
          "min-h-[100px] w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-navy-900 outline-none transition-colors placeholder:text-navy-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/10",
          error ? "border-rose-300" : "border-navy-100"
        )}
        {...rest}
      />
    </FieldWrapper>
  );
}

export function SelectField({
  label,
  id,
  required,
  error,
  hint,
  className,
  options,
  placeholder,
  ...rest
}: {
  label: string;
  id: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  options: string[];
  placeholder?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "id" | "className">) {
  return (
    <FieldWrapper label={label} htmlFor={id} required={required} error={error} hint={hint} className={className}>
      <select
        id={id}
        className={cn(
          inputBase,
          "appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%228%22 viewBox=%220 0 12 8%22><path d=%22M1 1l5 5 5-5%22 stroke=%22%23708098%22 stroke-width=%221.6%22 fill=%22none%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22/></svg>')] bg-[right_0.9rem_center] bg-no-repeat pr-9",
          error ? "border-rose-300" : "border-navy-100"
        )}
        {...rest}
      >
        <option value="">{placeholder ?? "Seçiniz"}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

export function CheckboxRow({
  id,
  checked,
  onChange,
  label,
  error,
  required,
}: {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className={cn(
          "flex cursor-pointer items-start gap-2.5 rounded-xl border p-3.5 text-sm text-navy-700 transition-colors",
          error ? "border-rose-300 bg-rose-50/40" : "border-navy-100 hover:border-brand-200"
        )}
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-navy-300 text-brand-500 focus:ring-brand-400"
        />
        <span>
          {label}
          {required ? <span className="ml-0.5 text-brand-500">*</span> : null}
        </span>
      </label>
      {error ? <p className="pl-1 text-xs font-medium text-rose-600">{error}</p> : null}
    </div>
  );
}
