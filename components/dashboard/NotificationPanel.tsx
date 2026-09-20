"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Bell, ChevronRight, FileText, ShoppingBag, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeDay } from "@/lib/format";
import type { NotificationItem, Tone } from "@/lib/seller-analytics";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { EmptyState } from "@/components/dashboard/EmptyState";

const toneTiles: Record<Tone, string> = {
  danger: "bg-rose-50 text-rose-600",
  warning: "bg-amber-50 text-amber-600",
  info: "bg-royal-50 text-royal-600",
  success: "bg-emerald-50 text-emerald-600",
  neutral: "bg-navy-50 text-navy-400",
};

function iconFor(id: string, tone: Tone): LucideIcon {
  if (id.startsWith("order-")) return ShoppingBag;
  if (id.startsWith("stock-")) return AlertTriangle;
  if (id.startsWith("drafts-")) return FileText;
  if (id.startsWith("payout-")) return Wallet;
  return tone === "warning" || tone === "danger" ? AlertTriangle : Bell;
}

export function NotificationList({
  items,
  now,
  readIds,
  onSelect,
  limit,
}: {
  items: NotificationItem[];
  now: Date;
  readIds: ReadonlySet<string>;
  onSelect?: (item: NotificationItem) => void;
  limit?: number;
}) {
  const shown = limit ? items.slice(0, limit) : items;
  if (!shown.length) return <EmptyState compact icon={Bell} title="Yeni bildirim yok" description="Sipariş, stok ve ödeme gelişmeleri burada görünür." />;
  return (
    <ul className="divide-y divide-line/80">
      {shown.map((item) => {
        const Icon = iconFor(item.id, item.tone);
        const unread = !readIds.has(item.id);
        return (
          <li key={item.id}>
            <Link
              href={item.href}
              onClick={() => onSelect?.(item)}
              className="flex items-start gap-3 rounded-lg px-1 py-3 transition-colors hover:bg-navy-50/60 focus-visible:outline-2 focus-visible:outline-royal-500"
            >
              <span aria-hidden className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", toneTiles[item.tone])}>
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-[13px] font-semibold text-navy-900">{item.title}</span>
                  {unread ? (
                    <>
                      <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-royal-500" />
                      <span className="sr-only">Okunmadı</span>
                    </>
                  ) : null}
                </span>
                <span className="block truncate text-xs text-muted">{item.detail}</span>
                {item.at !== new Date(0).toISOString() ? <span className="mt-0.5 block text-[11px] text-navy-300">{formatRelativeDay(item.at, now)}</span> : null}
              </span>
              <ChevronRight size={15} aria-hidden className="mt-2.5 shrink-0 text-navy-200" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

/** Kart olarak bildirim paneli (Genel Bakış sağ sütunu). */
export function NotificationPanel({
  items,
  now,
  readIds,
  onSelect,
  moreHref,
  limit = 5,
}: {
  items: NotificationItem[];
  now: Date;
  readIds: ReadonlySet<string>;
  onSelect?: (item: NotificationItem) => void;
  moreHref?: string;
  limit?: number;
}) {
  return (
    <Panel aria-label="Bildirimler">
      <PanelHeader
        title="Bildirimler"
        action={
          moreHref ? (
            <Link href={moreHref} className="inline-flex items-center gap-1 text-xs font-semibold text-royal-600 hover:text-royal-800">
              Tümünü Gör <ArrowRight size={13} aria-hidden />
            </Link>
          ) : null
        }
        className="mb-1"
      />
      <NotificationList items={items} now={now} readIds={readIds} onSelect={onSelect} limit={limit} />
    </Panel>
  );
}
