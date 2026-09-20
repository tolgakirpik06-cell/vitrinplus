"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, ClipboardCheck, Package, ShoppingBag, Wallet } from "lucide-react";
import { useMemo } from "react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { cn } from "@/lib/utils";
import { buildTodos, type Tone } from "@/lib/seller-analytics";
import { sellerHref } from "@/components/seller/seller-nav";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";

const tiles: Record<Tone, string> = {
  danger: "bg-rose-50 text-rose-600",
  warning: "bg-amber-50 text-amber-600",
  info: "bg-royal-50 text-royal-600",
  success: "bg-emerald-50 text-emerald-600",
  neutral: "bg-navy-50 text-navy-400",
};

function iconFor(id: string) {
  if (id === "ship") return ShoppingBag;
  if (id === "late") return AlertTriangle;
  if (id === "stock" || id === "out") return Package;
  if (id === "payout") return Wallet;
  return ClipboardCheck;
}

/** "Bugün Yapılacaklar": gerçek sipariş/stok/ödeme durumundan türetilir. */
export function TodoCard() {
  const { rows, stockRows, payouts, now, shop } = useSellerWorkspace();
  const todos = useMemo(() => buildTodos({ rows, stockRows, payouts, now, preparationDays: shop.shipping.preparationDays }), [rows, stockRows, payouts, now, shop.shipping.preparationDays]);

  return (
    <Panel aria-label="Bugün yapılacaklar" className="flex flex-col">
      <PanelHeader
        title="Bugün Yapılacaklar"
        action={
          <Link href={sellerHref.orders} className="inline-flex items-center gap-1 text-xs font-semibold text-royal-600 hover:text-royal-800">
            Tümünü Gör <ArrowRight size={13} aria-hidden />
          </Link>
        }
      />
      {todos.length === 0 ? (
        <EmptyState compact icon={CheckCircle2} title="Bugün için bekleyen iş yok" description="Sipariş, stok veya ödeme aksiyonu gerektiğinde burada listelenir." />
      ) : (
        <ul className="divide-y divide-line/80">
          {todos.map((todo) => {
            const Icon = iconFor(todo.id);
            return (
              <li key={todo.id}>
                <Link href={todo.href} className="group flex items-center gap-3 rounded-lg py-3 transition-colors hover:bg-navy-50/50 focus-visible:outline-2 focus-visible:outline-royal-500">
                  <span aria-hidden className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", tiles[todo.tone])}>
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold leading-snug text-navy-900">{todo.title}</span>
                    {todo.hint ? <span className="block text-xs text-muted">{todo.hint}</span> : null}
                  </span>
                  <ArrowRight size={15} aria-hidden className="shrink-0 text-navy-200 transition-transform group-hover:translate-x-0.5 group-hover:text-royal-500" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
