"use client";

import Link from "next/link";
import { ChevronRight, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { IconTile, type IconTone } from "@/components/dashboard/StatCard";

export type QuickAction = {
  key: string;
  icon: LucideIcon;
  tone: IconTone;
  title: string;
  subtitle: string;
  href?: string;
  onClick?: () => void;
  /** Kilitliyse (paket gereksinimi) başlığın yanında kilit gösterilir. */
  locked?: boolean;
};

const rowClass =
  "group flex w-full items-center gap-3 rounded-xl border border-line bg-white p-3 text-left transition-colors hover:border-royal-200 hover:bg-royal-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500";

function Row({ action }: { action: QuickAction }) {
  const content = (
    <>
      <IconTile icon={action.icon} tone={action.tone} className="h-10 w-10" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-navy-900">
          {action.title}
          {action.locked ? <Lock size={12} aria-label="Paket yükseltme gerekir" className="text-amber-500" /> : null}
        </span>
        <span className="block truncate text-xs text-muted">{action.subtitle}</span>
      </span>
      <ChevronRight size={16} aria-hidden className="shrink-0 text-navy-200 transition-transform group-hover:translate-x-0.5 group-hover:text-royal-500" />
    </>
  );
  if (action.href) {
    return (
      <Link href={action.href} className={rowClass}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={action.onClick} className={rowClass}>
      {content}
    </button>
  );
}

export function QuickActions({ actions, title = "Hızlı İşlemler" }: { actions: QuickAction[]; title?: string }) {
  return (
    <Panel aria-label={title}>
      <PanelHeader title={title} />
      <div className="flex flex-col gap-2.5">
        {actions.map((action) => (
          <Row key={action.key} action={action} />
        ))}
      </div>
    </Panel>
  );
}
