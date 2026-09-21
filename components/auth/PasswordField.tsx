"use client";

import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";

export function PasswordField({
  id,
  label,
  placeholder,
  name,
  autoComplete = "current-password",
  required = false,
  minLength,
  maxLength,
  disabled = false,
}: {
  id: string;
  label: string;
  placeholder?: string;
  /** Verilirse alan bir formun parçası olur (FormData ile okunur). Şifre state'te ya da depoda tutulmaz. */
  name?: string;
  autoComplete?: "current-password" | "new-password";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-xs font-semibold text-navy-600">
      {label}
      <span className="flex items-center gap-2 rounded-xl border border-navy-100 bg-navy-50/40 px-3.5 py-2.5 focus-within:border-brand-300">
        <Lock size={16} className="shrink-0 text-navy-300" />
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          disabled={disabled}
          className="w-full bg-transparent text-sm font-normal text-navy-800 placeholder:text-navy-300 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
          className="shrink-0 text-navy-300 transition-colors hover:text-navy-500"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </span>
    </label>
  );
}
