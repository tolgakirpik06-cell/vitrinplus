"use client";

import { Banknote, CalendarClock, HandCoins, MinusCircle, Percent, ReceiptText, Truck, Undo2, Wallet } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { DataTable, type Column } from "@/components/dashboard/DataTable";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Pagination, paginate } from "@/components/dashboard/Pagination";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge, type BadgeTone } from "@/components/dashboard/StatusBadge";
import { ActionButton } from "@/components/dashboard/form";
import { useMarketplace } from "@/components/marketplace/context";
import { sellerHref } from "@/components/seller/seller-nav";
import { PAYOUT_HOLD_DAYS, payoutStatusLabels } from "@/lib/domain/ledger";
import { formatShortDate, formatTL } from "@/lib/format";
import { COMMISSION_LABEL } from "@/lib/plans";
import { useAsync } from "@/lib/use-async";
import type { FinanceOverview, LedgerEntryView, PayoutView } from "@/lib/repositories/types";
import type { DbPayoutStatus } from "@/types/database";

function useFinance() {
  const { services } = useMarketplace();
  const finance = services.finance;
  const load = useCallback(() => (finance ? finance.load() : Promise.reject(new Error("Finans verisi bu hesapta yok."))), [finance]);
  return useAsync<FinanceOverview>(finance ? load : null);
}

function FinanceState({ resource, children }: { resource: ReturnType<typeof useFinance>; children: (data: FinanceOverview) => ReactNode }) {
  if (resource.error) return <Panel><EmptyState title="Finans verisi yüklenemedi" description={resource.error} action={<ActionButton onClick={resource.reload}>Tekrar dene</ActionButton>} /></Panel>;
  if (!resource.data) return <LoadingState label="Kazanç verisi yükleniyor…" />;
  return <>{children(resource.data)}</>;
}

type EntryState = "paid" | "planned" | "available" | "pending" | "reversed";

function entryState(entry: LedgerEntryView, now: number): EntryState {
  if (entry.status === "reversed") return "reversed";
  if (entry.status === "paid") return "paid";
  if (entry.payoutId) return "planned";
  return entry.availableAt !== null && new Date(entry.availableAt).getTime() <= now ? "available" : "pending";
}

const ENTRY_META: Record<EntryState, { label: string; tone: BadgeTone }> = {
  pending: { label: "Bekliyor", tone: "neutral" },
  available: { label: "Ödemeye hazır", tone: "info" },
  planned: { label: "Ödeme planlandı", tone: "warning" },
  paid: { label: "Ödendi", tone: "success" },
  reversed: { label: "İptal (geri alındı)", tone: "danger" },
};

const PAYOUT_TONE: Record<DbPayoutStatus, BadgeTone> = { planned: "info", processing: "warning", paid: "success", failed: "danger", cancelled: "neutral" };

/** Gerçek mod Kazançlarım: tüm tutarlar veritabanındaki kazanç defterinden (seller_ledger) gelir. */
export function LiveEarnings() {
  const finance = useFinance();
  const [page, setPage] = useState(1);
  const [now] = useState(() => Date.now());
  const entries = useMemo(() => finance.data?.entries ?? [], [finance.data]);

  const columns: Column<LedgerEntryView>[] = [
    {
      key: "no",
      header: "Kayıt",
      cell: (entry) => (
        <span className="whitespace-nowrap font-bold text-navy-900">
          {entry.entryType === "return" ? "İade" : "Satış"}
          {entry.orderNo ? (
            <Link href={`${sellerHref.orders}?siparis=${encodeURIComponent(entry.orderNo)}`} className="ml-2 text-royal-700 hover:text-royal-900">#{entry.orderNo}</Link>
          ) : null}
        </span>
      ),
    },
    { key: "date", header: "Tarih", hideBelow: "md", cell: (entry) => <span className="whitespace-nowrap text-xs text-navy-600">{formatShortDate(entry.createdAt)}</span> },
    { key: "gross", header: "Brüt", align: "right", cell: (entry) => <span className="whitespace-nowrap tabular-nums text-navy-800">{formatTL(entry.gross)}</span> },
    { key: "discount", header: "İndirim", align: "right", hideBelow: "lg", cell: (entry) => <span className="whitespace-nowrap tabular-nums text-navy-600">{entry.discount ? `−${formatTL(entry.discount)}` : "—"}</span> },
    { key: "shipping", header: "Kargo", align: "right", hideBelow: "lg", cell: (entry) => <span className="whitespace-nowrap tabular-nums text-navy-600">{formatTL(entry.shipping)}</span> },
    { key: "deduction", header: "Kesinti", align: "right", hideBelow: "md", cell: (entry) => <span className="whitespace-nowrap tabular-nums text-rose-600">{entry.deductionTotal ? `−${formatTL(entry.deductionTotal)}` : formatTL(0)}</span> },
    { key: "net", header: "Net", align: "right", cell: (entry) => <span className={`whitespace-nowrap font-bold tabular-nums ${entry.net < 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatTL(entry.net)}</span> },
    { key: "state", header: "Durum", cell: (entry) => { const meta = ENTRY_META[entryState(entry, now)]; return <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>; } },
  ];

  return (
    <>
      <PageHeader title="Kazançlarım" description="Satış, indirim, iade, kargo ve kesintilerin; tüm tutarlar kazanç defterindeki gerçek kayıtlardan gelir." />
      <FinanceState resource={finance}>
        {({ summary }) => (
          <div className="flex flex-col gap-5">
            <ul aria-label="Kazanç özeti" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <li className="min-w-0"><StatCard icon={ReceiptText} tone="violet" label="Brüt Satış" value={formatTL(summary.grossSales)} className="h-full" /></li>
              <li className="min-w-0"><StatCard icon={MinusCircle} tone="amber" label="Satıcı İndirimi" value={`−${formatTL(summary.sellerDiscounts)}`} className="h-full" /></li>
              <li className="min-w-0"><StatCard icon={Undo2} tone="rose" label="İadeler" value={`−${formatTL(summary.returns)}`} className="h-full" /></li>
              <li className="min-w-0"><StatCard icon={Truck} tone="blue" label="Kargo Geliri" value={formatTL(summary.shipping)} note="Müşteriden alınan kargo" className="h-full" /></li>
              <li className="min-w-0"><StatCard icon={Percent} tone="amber" label="Ödeme Altyapısı Kesintisi" value={formatTL(summary.paymentProviderDeduction)} note="Sağlayıcı bağlanınca hesaplanır" className="h-full" /></li>
              <li className="min-w-0"><StatCard icon={HandCoins} tone="blue" label="VitrinPlus Satış Komisyonu" value={formatTL(summary.commission)} note={COMMISSION_LABEL} className="h-full" /></li>
              <li className="min-w-0 col-span-2"><StatCard icon={Wallet} tone="green" label="Net Kazanç" value={formatTL(summary.net)} note="Brüt − indirim + kargo − iade − kesintiler" className="h-full" /></li>
            </ul>
            <ul aria-label="Bakiye durumu" className="grid gap-3 md:grid-cols-4">
              <li><StatCard icon={CalendarClock} tone="slate" label="Bekleyen" value={formatTL(summary.pendingBalance)} note={`Teslimden ${PAYOUT_HOLD_DAYS} gün sonra hazır olur`} className="h-full" /></li>
              <li><StatCard icon={Wallet} tone="blue" label="Ödemeye Hazır" value={formatTL(summary.availableBalance)} className="h-full" /></li>
              <li><StatCard icon={CalendarClock} tone="amber" label="Planlanan" value={formatTL(summary.plannedBalance)} className="h-full" /></li>
              <li><StatCard icon={Banknote} tone="green" label="Ödenen" value={formatTL(summary.paidTotal)} className="h-full" /></li>
            </ul>
            <Panel aria-label="Kazanç defteri">
              <PanelHeader title="Kazanç Defteri" subtitle="Her sipariş ve iade için ayrı kayıt. Net = Brüt − İndirim + Kargo − Kesintiler. Gerçek ödeme aktarımı bağlı değildir." />
              <DataTable
                caption="Kazanç defteri"
                columns={columns}
                rows={paginate(entries, page, 10)}
                getRowId={(entry) => entry.id}
                minWidth={720}
                empty={<EmptyState compact icon={Wallet} title="Henüz kazanç kaydı yok" description="Sipariş aldıkça satış kayıtların burada listelenir." />}
              />
              {entries.length > 0 ? <Pagination page={page} pageSize={10} total={entries.length} onPageChange={setPage} itemLabel="kayıt" /> : null}
            </Panel>
          </div>
        )}
      </FinanceState>
    </>
  );
}

/** Gerçek mod Ödemeler: ödeme kayıtlarını yönetici planlar; bu ekran yalnızca kayıtları gösterir. Gerçek para transferi yoktur. */
export function LivePayouts() {
  const finance = useFinance();
  const [page, setPage] = useState(1);

  const columns: Column<PayoutView>[] = [
    { key: "no", header: "Ödeme No", cell: (payout) => <span className="whitespace-nowrap font-bold text-navy-900">{payout.payoutNo}</span> },
    { key: "planned", header: "Planlanan Tarih", hideBelow: "md", cell: (payout) => <span className="whitespace-nowrap text-xs text-navy-600">{formatShortDate(payout.plannedFor)}</span> },
    { key: "amount", header: "Tutar", align: "right", cell: (payout) => <span className="whitespace-nowrap font-bold tabular-nums text-navy-900">{formatTL(payout.amount)}</span> },
    { key: "paid", header: "Ödeme Tarihi", hideBelow: "lg", cell: (payout) => <span className="whitespace-nowrap text-xs text-navy-600">{payout.paidAt ? formatShortDate(payout.paidAt) : "—"}</span> },
    { key: "ref", header: "Referans", hideBelow: "lg", cell: (payout) => <span className="text-xs text-navy-600">{payout.providerReference ?? "—"}</span> },
    { key: "state", header: "Durum", cell: (payout) => <StatusBadge tone={PAYOUT_TONE[payout.status]}>{payoutStatusLabels[payout.status]}</StatusBadge> },
  ];

  return (
    <>
      <PageHeader title="Ödemeler" description="Hesabına aktarılan ve planlanan ödemelerini takip et." />
      <FinanceState resource={finance}>
        {({ summary, payouts }) => (
          <div className="flex flex-col gap-5">
            <ul aria-label="Ödeme özeti" className="grid gap-3 md:grid-cols-4">
              <li><StatCard icon={Wallet} tone="blue" label="Ödemeye Hazır" value={formatTL(summary.availableBalance)} note="Yönetici ödeme planlayabilir" className="h-full" /></li>
              <li><StatCard icon={CalendarClock} tone="amber" label="Planlanan" value={formatTL(summary.plannedBalance)} note="Ödeme planına bağlı" className="h-full" /></li>
              <li><StatCard icon={CalendarClock} tone="slate" label="Bekleyen" value={formatTL(summary.pendingBalance)} note={`Teslimden ${PAYOUT_HOLD_DAYS} gün sonra hazır olur`} className="h-full" /></li>
              <li><StatCard icon={Banknote} tone="green" label="Ödenen Toplam" value={formatTL(summary.paidTotal)} className="h-full" /></li>
            </ul>
            <p role="note" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
              Ödeme kayıtları yönetici tarafından planlanır. Ödeme sağlayıcısı ve banka aktarımı henüz bağlı değildir; “Ödendi” durumu şimdilik kayıt amaçlıdır ve IBAN bilgisi alınmaz.
            </p>
            <Panel aria-label="Ödeme listesi">
              <PanelHeader title="Ödeme Geçmişi" />
              <DataTable
                caption="Ödeme geçmişi"
                columns={columns}
                rows={paginate(payouts, page, 10)}
                getRowId={(payout) => payout.id}
                minWidth={620}
                empty={<EmptyState compact icon={Wallet} title="Henüz ödeme kaydı yok" description="Bakiyen ödemeye hazır olduğunda yönetici ödeme planlar; kayıtlar burada görünür." />}
              />
              {payouts.length > 0 ? <Pagination page={page} pageSize={10} total={payouts.length} onPageChange={setPage} itemLabel="ödeme" /> : null}
            </Panel>
          </div>
        )}
      </FinanceState>
    </>
  );
}
