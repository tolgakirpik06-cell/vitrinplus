"use client";

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const controlBase =
  "w-full rounded-lg border border-line bg-white text-[13px] text-navy-800 placeholder:text-navy-300 transition-colors focus-visible:border-royal-400 focus-visible:outline-2 focus-visible:outline-royal-200 disabled:bg-navy-50 disabled:text-navy-300 aria-[invalid=true]:border-rose-400";

/** Etiketli form alanı; hata ve ipucu metnini `aria-describedby` ile bağlar. */
export function Field({
  label,
  required,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-xs font-semibold text-navy-600">
        {label}
        {required ? (
          <span aria-hidden className="ml-0.5 text-rose-500">
            *
          </span>
        ) : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-[11px] font-medium text-rose-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

export function TextInput({ className, invalid, ...props }: InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return <input {...props} aria-invalid={invalid || undefined} className={cn(controlBase, "h-10 px-3", className)} />;
}

export function TextArea({ className, invalid, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea {...props} aria-invalid={invalid || undefined} className={cn(controlBase, "min-h-24 px-3 py-2.5 leading-relaxed", className)} />;
}

export function SelectInput({ className, invalid, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select {...props} aria-invalid={invalid || undefined} className={cn(controlBase, "h-10 px-3", className)}>
      {children}
    </select>
  );
}

/** Sağında birim (TL, %) olan sayı alanı. */
export function UnitInput({
  unit,
  className,
  invalid,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & { unit: string; invalid?: boolean }) {
  return (
    <div className={cn("flex h-10 overflow-hidden rounded-lg border border-line bg-white focus-within:border-royal-400 focus-within:outline-2 focus-within:outline-royal-200", invalid && "border-rose-400", className)}>
      <input
        {...props}
        type="number"
        inputMode="decimal"
        aria-invalid={invalid || undefined}
        className="min-w-0 flex-1 bg-transparent px-3 text-[13px] text-navy-800 outline-none placeholder:text-navy-300 disabled:text-navy-300"
      />
      <span aria-hidden className="flex items-center border-l border-line bg-navy-50/60 px-3 text-xs font-semibold text-muted">
        {unit}
      </span>
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="flex items-start gap-3">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500 disabled:opacity-50",
          checked ? "bg-royal-600" : "bg-navy-200"
        )}
      >
        <span aria-hidden className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </button>
      <label htmlFor={id} className="cursor-pointer text-[13px] text-navy-700">
        <span className="font-semibold">{label}</span>
        {description ? <span className="block text-[11px] text-muted">{description}</span> : null}
      </label>
    </div>
  );
}

/** Birincil / ikincil / tehlike butonları (panel içi). */
type ButtonVariant = "primary" | "secondary" | "danger" | "dangerSolid" | "ghost" | "soft";

const buttonVariants: Record<ButtonVariant, string> = {
  primary: "bg-royal-600 text-white shadow-royal hover:bg-royal-700 disabled:shadow-none",
  secondary: "border border-line bg-white text-navy-700 hover:border-royal-200 hover:bg-royal-50/50 hover:text-royal-700",
  danger: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
  dangerSolid: "bg-rose-600 text-white hover:bg-rose-700",
  ghost: "text-navy-600 hover:bg-navy-50",
  soft: "bg-royal-50 text-royal-700 hover:bg-royal-100",
};

export function ActionButton({
  variant = "secondary",
  size = "md",
  loading,
  className,
  children,
  type = "button",
  ...props
}: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  variant?: ButtonVariant;
  size?: "sm" | "md";
  loading?: boolean;
  className?: string;
}) {
  return (
    <button
      type={type}
      {...props}
      disabled={props.disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500 disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" ? "h-10 px-4 text-[13px]" : "h-8 px-3 text-xs",
        buttonVariants[variant],
        className
      )}
    >
      {loading ? <span aria-hidden className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" /> : null}
      {children}
    </button>
  );
}

/** Bağlantı olarak görünen buton (aynı görünüm, <a> semantiği). */
export const linkButtonClass = (variant: ButtonVariant = "secondary", size: "sm" | "md" = "md") =>
  cn(
    "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500",
    size === "md" ? "h-10 px-4 text-[13px]" : "h-8 px-3 text-xs",
    buttonVariants[variant]
  );
