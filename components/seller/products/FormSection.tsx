"use client";

import { ChevronUp } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Panel } from "@/components/dashboard/Panel";
import { cn } from "@/lib/utils";

/** Daraltılabilir form bölümü (Ürün Ekle referansındaki bölüm kartları). */
export function FormSection({ title, description, children, defaultOpen = true, id }: { title: string; description?: string; children: ReactNode; defaultOpen?: boolean; id?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <Panel id={id} aria-label={title}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center justify-between gap-3 rounded-lg text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-royal-500"
      >
        <span>
          <span className="block text-[16px] font-extrabold text-navy-900">{title}</span>
          {description ? <span className="mt-0.5 block text-xs font-normal text-muted">{description}</span> : null}
        </span>
        <ChevronUp size={18} aria-hidden className={cn("shrink-0 text-navy-300 transition-transform", !open && "rotate-180")} />
      </button>
      <div id={bodyId} hidden={!open} className="mt-4">
        {children}
      </div>
    </Panel>
  );
}
