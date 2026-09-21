"use client";

import { CheckCircle2, Clock, RotateCcw, XCircle } from "lucide-react";
import { useCallback, useState } from "react";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { Modal } from "@/components/dashboard/Modal";
import { Panel } from "@/components/dashboard/Panel";
import { StatCard } from "@/components/dashboard/StatCard";
import { Tabs } from "@/components/dashboard/Tabs";
import { useToast } from "@/components/dashboard/Toast";
import { ActionButton, Field, TextArea } from "@/components/dashboard/form";
import { useMarketplace } from "@/components/marketplace/context";
import { ReturnSummary } from "@/components/returns/ReturnParts";
import { friendlyError } from "@/lib/domain/errors";
import { useAsync } from "@/lib/use-async";
import type { ReturnView } from "@/lib/repositories/types";

type Dialog = { kind: "reject" | "received" | "refunded"; item: ReturnView } | null;
type Tab = "open" | "done" | "all";

const OPEN: ReturnView["status"][] = ["requested", "approved", "shipped", "received"];

/** Gerçek iade kayıtları (müşteri talebi → onay / ret → teslim alma → iade edildi). Gerçek para iadesi yapılmaz; kayıt ve finans etkisi oluşur. */
export function SellerReturns() {
  const { services } = useMarketplace();
  const toast = useToast();
  const load = useCallback(() => services.returns.listForStore(), [services]);
  const list = useAsync(load);
  const [tab, setTab] = useState<Tab>("open");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [restock, setRestock] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const items = list.data ?? [];
  const isOpen = (item: ReturnView) => OPEN.includes(item.status);
  const shown = items.filter((item) => (tab === "all" ? true : tab === "open" ? isOpen(item) : !isOpen(item)));
  const count = (status: ReturnView["status"]) => items.filter((item) => item.status === status).length;

  async function run(id: string, action: () => Promise<void>, done: string) {
    setBusyId(id);
    setError("");
    try {
      await action();
      toast.success(done);
      setDialog(null);
      setReason("");
      list.reload();
    } catch (caught) {
      const message = friendlyError(caught);
      // Doğrudan (pencere açık değilken) yapılan işlemde hata pencerede değil, bildirimde gösterilir.
      if (dialog) setError(message);
      else toast.error(message);
    } finally {
      setBusyId(null);
    }
  }

  function open(next: NonNullable<Dialog>) {
    setError("");
    setDialog(next);
  }

  function close() {
    setDialog(null);
    setReason("");
    setError("");
    setRestock(true);
  }

  return (
    <div className="flex flex-col gap-5">
      <ul aria-label="İade özeti" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <li><StatCard icon={Clock} tone="amber" label="Karar Bekleyen" value={count("requested")} note="Onay / ret bekliyor" className="h-full" /></li>
        <li><StatCard icon={RotateCcw} tone="blue" label="Süreçte" value={count("approved") + count("shipped") + count("received")} note="Kargo / teslim / iade" className="h-full" /></li>
        <li><StatCard icon={CheckCircle2} tone="green" label="Tamamlanan" value={count("refunded")} note="İade edildi" className="h-full" /></li>
        <li><StatCard icon={XCircle} tone="rose" label="Reddedilen" value={count("rejected")} className="h-full" /></li>
      </ul>

      <Panel aria-label="İade talepleri">
        <div className="mb-4">
          <Tabs
            label="İade durumu"
            value={tab}
            onChange={setTab}
            items={[
              { key: "open", label: "Açık", count: items.filter(isOpen).length },
              { key: "done", label: "Kapanan", count: items.filter((item) => !isOpen(item)).length },
              { key: "all", label: "Tümü", count: items.length },
            ]}
          />
        </div>
        {list.error ? (
          <EmptyState title="İadeler yüklenemedi" description={list.error} action={<ActionButton onClick={list.reload}>Tekrar dene</ActionButton>} />
        ) : list.loading && !list.data ? (
          <LoadingState label="İadeler yükleniyor…" />
        ) : shown.length === 0 ? (
          <EmptyState icon={RotateCcw} title={items.length === 0 ? "Henüz iade talebi yok" : "Bu görünümde iade yok"} description={items.length === 0 ? "Müşteriler teslim aldıkları ürünler için iade talebi oluşturduğunda burada görünür." : undefined} />
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((item) => {
              const busy = busyId === item.id;
              return (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <ReturnSummary item={item} showCustomer />
                  <div className="flex flex-wrap gap-2">
                    {item.status === "requested" && (
                      <>
                        <ActionButton size="sm" variant="primary" loading={busy} onClick={() => void run(item.id, () => services.returns.approve(item.id), "İade talebi onaylandı.")}>Onayla</ActionButton>
                        <ActionButton size="sm" variant="danger" disabled={busy} onClick={() => open({ kind: "reject", item })}>Reddet</ActionButton>
                      </>
                    )}
                    {item.status === "approved" && <span className="text-xs text-navy-500">Müşterinin ürünü kargoya vermesi bekleniyor.</span>}
                    {item.status === "shipped" && <ActionButton size="sm" variant="primary" disabled={busy} onClick={() => open({ kind: "received", item })}>Ürünü teslim aldım</ActionButton>}
                    {item.status === "received" && <ActionButton size="sm" variant="primary" disabled={busy} onClick={() => open({ kind: "refunded", item })}>İade edildi olarak işaretle</ActionButton>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Modal
        open={dialog !== null}
        onClose={close}
        size="sm"
        title={dialog?.kind === "reject" ? "İade talebini reddet" : dialog?.kind === "received" ? "Ürünü teslim aldım" : "İade edildi olarak işaretle"}
        description={dialog ? `${dialog.item.returnNo} · ${dialog.item.productName}` : undefined}
        footer={
          <>
            <ActionButton variant="secondary" onClick={close}>Vazgeç</ActionButton>
            {dialog?.kind === "reject" && (
              <ActionButton variant="dangerSolid" disabled={reason.trim().length < 3} loading={busyId === dialog.item.id} onClick={() => void run(dialog.item.id, () => services.returns.reject(dialog.item.id, reason), "İade talebi reddedildi.")}>Reddet</ActionButton>
            )}
            {dialog?.kind === "received" && (
              <ActionButton variant="primary" loading={busyId === dialog.item.id} onClick={() => void run(dialog.item.id, () => services.returns.markReceived(dialog.item.id, restock), restock ? "Ürün teslim alındı; stok geri eklendi." : "Ürün teslim alındı.")}>Teslim alındı</ActionButton>
            )}
            {dialog?.kind === "refunded" && (
              <ActionButton variant="primary" loading={busyId === dialog.item.id} onClick={() => void run(dialog.item.id, () => services.returns.markRefunded(dialog.item.id), "İade kaydı tamamlandı.")}>İade edildi</ActionButton>
            )}
          </>
        }
      >
        {dialog?.kind === "reject" && (
          <Field label="Ret gerekçesi (müşteriye gösterilir)" htmlFor="return-reason" hint={`${reason.length}/300`}>
            <TextArea id="return-reason" value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} />
          </Field>
        )}
        {dialog?.kind === "received" && (
          <label className="flex items-start gap-2 text-sm text-navy-700">
            <input type="checkbox" checked={restock} onChange={(event) => setRestock(event.target.checked)} className="mt-1" />
            Ürün satılabilir durumda; iade edilen adedi stoğa geri ekle.
          </label>
        )}
        {dialog?.kind === "refunded" && (
          <p className="text-sm text-navy-700">Bu işlem iadeyi “iade edildi” olarak kaydeder ve kazançlarına düşen tutarı finans defterine yazar. Müşteriye gerçek bir para iadesi bu ekrandan yapılmaz; ödeme sağlayıcısı bağlandığında iade oradan yürütülecektir.</p>
        )}
        {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
      </Modal>
    </div>
  );
}
