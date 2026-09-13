import type { ReactNode } from "react";

export function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-extrabold text-navy-900 sm:text-xl">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-navy-400">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
