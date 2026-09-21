"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { DemoShop, DemoUser, SellerProduct } from "@/lib/demo-marketplace";
import { useDemo } from "@/components/demo/DemoProvider";
import { useLocalStore } from "@/lib/local-store";
import { useNow } from "@/lib/use-now";
import { getPlan, type Plan, type PlanKey } from "@/lib/plans";
import { mergeServerOps } from "@/lib/seller-ops-merge";
import { summarizeLivePayouts } from "@/lib/seller-live-finance";
import { useAsync } from "@/lib/use-async";
import type { FinanceOverview } from "@/lib/repositories/types";
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
  /** Gerçek modda kazanç defteri özeti (yüklenene kadar null; demo modunda her zaman null). `financeError`: yükleme hatası. */
  finance: FinanceOverview | null;
  financeError: string | null;
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

const EMPTY_PAYOUTS: PayoutSummary = { paidOut: 0, pending: 0, nextPayoutAt: null, nextPayoutAmount: 0 };

const WorkspaceContext = createContext<SellerWorkspaceValue | null>(null);

export function SellerWorkspaceProvider({ owner, shop, children }: { owner: DemoUser; shop: DemoShop; children: ReactNode }) {
  const { state, mode, serverOrderMeta, sellerAccount, services } = useDemo();
  const financeService = services.finance;
  const loadFinance = useCallback(() => (financeService ? financeService.load() : Promise.reject(new Error("Finans verisi yok."))), [financeService]);
  const financeResource = useAsync<FinanceOverview>(mode === "supabase" && financeService ? loadFinance : null);
  const finance = mode === "supabase" ? financeResource.data : null;
  const opsState = useLocalStore(sellerOpsStore);
  const now = useNow();
  const [aiState, setAiState] = useState<{ open: boolean; prompt: string | null; nonce: number }>({ open: false, prompt: null, nonce: 0 });

  const localOps = getShopOps(opsState, owner.id);
  // Gerçek modda gerçek olay / kargo verisi ve paket sunucudan gelir; yerel kayıt yalnızca henüz yazılmamış bayrakları taşır.
  const livePlan = sellerAccount?.plan;
  const ops = useMemo(() => (mode === "supabase" ? mergeServerOps(localOps, serverOrderMeta, livePlan) : localOps), [mode, localOps, serverOrderMeta, livePlan]);
  const products = shop.products;

  const rows = useMemo(
    () => buildSellerOrders({ orders: state.orders, ownerId: owner.id, users: state.users, products, ops, shop }),
    [state.orders, state.users, owner.id, products, ops, shop]
  );
  const stockRows = useMemo(() => buildStockRows(products, rows, now), [products, rows, now]);
  const counts = useMemo(() => countOrders(rows), [rows]);
  const payouts = useMemo(() => (mode === "supabase" ? (finance ? summarizeLivePayouts(finance) : EMPTY_PAYOUTS) : summarizePayouts(rows, now)), [mode, finance, rows, now]);
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
      finance,
      financeError: mode === "supabase" ? financeResource.error : null,
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
    [owner, shop, now, products, rows, stockRows, counts, payouts, ops, finance, mode, financeResource.error, notifications, readIds, unreadCount, updateOps, markNotificationsRead, aiState, openAi, closeAi]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useSellerWorkspace(): SellerWorkspaceValue {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("SellerWorkspaceProvider gerekli");
  return value;
}
