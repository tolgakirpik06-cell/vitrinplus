"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { DemoShop, DemoUser, SellerProduct } from "@/lib/demo-marketplace";
import { useDemo } from "@/components/demo/DemoProvider";
import { useLocalStore } from "@/lib/local-store";
import { useNow } from "@/lib/use-now";
import { getPlan, type Plan, type PlanKey } from "@/lib/plans";
import { getShopOps, sellerOpsStore, updateShopOps, withReadNotifications, type ShopOps } from "@/lib/seller-ops";
import {
  buildNotifications,
  buildSellerOrders,
  buildStockRows,
  countOrders,
  summarizePayouts,
  type NotificationItem,
  type OrderCounts,
  type PayoutSummary,
  type SellerOrderRow,
  type StockRow,
} from "@/lib/seller-analytics";

/**
 * Satıcı paneli çalışma alanı: demo kaydından (ürünler, siparişler) ve satıcı
 * operasyon verisinden (paket, kargo bilgisi, notlar) türetilen ortak veri.
 * Tüm satıcı sayfaları aynı hesaplamayı paylaşır; her sayfa kendi verisini yeniden türetmez.
 */
export type SellerWorkspaceValue = {
  owner: DemoUser;
  shop: DemoShop;
  now: Date;
  products: SellerProduct[];
  rows: SellerOrderRow[];
  stockRows: StockRow[];
  counts: OrderCounts;
  payouts: PayoutSummary;
  ops: ShopOps;
  planKey: PlanKey;
  plan: Plan;
  notifications: NotificationItem[];
  readIds: ReadonlySet<string>;
  unreadCount: number;
  /** Bekleyen (yeni + hazırlanıyor + kargoya hazır) sipariş sayısı. */
  waitingOrders: number;
  /** Operasyon verisini günceller. Depolama hatasında fırlatır; çağıran yakalar. */
  updateOps: (change: (ops: ShopOps) => ShopOps) => void;
  markNotificationsRead: (ids: string[]) => void;
  ai: { open: boolean; prompt: string | null; /** Her açılışta artar; panel içeriğini sıfırlamak için anahtar olarak kullanılır. */ nonce: number; openAi: (prompt?: string) => void; closeAi: () => void };
};

const WorkspaceContext = createContext<SellerWorkspaceValue | null>(null);

export function SellerWorkspaceProvider({ owner, shop, children }: { owner: DemoUser; shop: DemoShop; children: ReactNode }) {
  const { state } = useDemo();
  const opsState = useLocalStore(sellerOpsStore);
  const now = useNow();
  const [aiState, setAiState] = useState<{ open: boolean; prompt: string | null; nonce: number }>({ open: false, prompt: null, nonce: 0 });

  const ops = getShopOps(opsState, owner.id);
  const products = shop.products;

  const rows = useMemo(
    () => buildSellerOrders({ orders: state.orders, ownerId: owner.id, users: state.users, products, ops, shop }),
    [state.orders, state.users, owner.id, products, ops, shop]
  );
  const stockRows = useMemo(() => buildStockRows(products, rows, now), [products, rows, now]);
  const counts = useMemo(() => countOrders(rows), [rows]);
  const payouts = useMemo(() => summarizePayouts(rows, now), [rows, now]);
  const notifications = useMemo(() => buildNotifications({ rows, stockRows, products }), [rows, stockRows, products]);
  const readIds = useMemo<ReadonlySet<string>>(() => new Set(ops.readNotifications), [ops.readNotifications]);
  const unreadCount = useMemo(() => notifications.filter((item) => !readIds.has(item.id)).length, [notifications, readIds]);

  const updateOps = useCallback((change: (current: ShopOps) => ShopOps) => updateShopOps(owner.id, change), [owner.id]);

  const markNotificationsRead = useCallback(
    (ids: string[]) => {
      if (!ids.length) return;
      try {
        updateShopOps(owner.id, (current) => withReadNotifications(current, ids));
      } catch {
        // Okundu bilgisi kaydedilemezse bildirim yalnızca okunmamış görünmeye devam eder.
      }
    },
    [owner.id]
  );

  const openAi = useCallback((prompt?: string) => setAiState((previous) => ({ open: true, prompt: prompt ?? null, nonce: previous.nonce + 1 })), []);
  const closeAi = useCallback(() => setAiState((previous) => ({ ...previous, open: false })), []);

  const value = useMemo<SellerWorkspaceValue>(
    () => ({
      owner,
      shop,
      now,
      products,
      rows,
      stockRows,
      counts,
      payouts,
      ops,
      planKey: ops.planKey,
      plan: getPlan(ops.planKey),
      notifications,
      readIds,
      unreadCount,
      waitingOrders: counts.yeni + counts.hazirlaniyor + counts["kargoya-hazir"],
      updateOps,
      markNotificationsRead,
      ai: { open: aiState.open, prompt: aiState.prompt, nonce: aiState.nonce, openAi, closeAi },
    }),
    [owner, shop, now, products, rows, stockRows, counts, payouts, ops, notifications, readIds, unreadCount, updateOps, markNotificationsRead, aiState, openAi, closeAi]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useSellerWorkspace(): SellerWorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("SellerWorkspaceProvider gerekli");
  return value;
}
