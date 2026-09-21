"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useMarketplace } from "@/components/marketplace/context";
import { AccountShell, accountButton, accountCard, accountField, accountGhostButton } from "@/components/account/AccountShell";
import { ReturnSummary } from "@/components/returns/ReturnParts";
import { friendlyError } from "@/lib/domain/errors";
import { RETURN_REASONS, RETURN_WINDOW_DAYS, returnReasonLabels } from "@/lib/domain/returns";
import { useAsync } from "@/lib/use-async";
import { formatPrice } from "@/lib/utils";
import type { ReturnableItemView, ReturnView } from "@/lib/repositories/types";
import type { DbReturnReason } from "@/types/database";

function RequestForm({ item, onDone, onCancel }: { item: ReturnableItemView; onDone: () => void; onCancel: () => void }) {
  const { services } = useMarketplace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await services.returns.request({ orderItemId: item.orderItemId, quantity: Math.floor(Number(data.get("quantity"))), reason: String(data.get("reason")) as DbReturnReason, description: String(data.get("description") ?? "").trim() || undefined });
      onDone();
    } catch (caught) {
      setError(friendlyError(caught));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl bg-navy-50/60 p-4" aria-label="İade talebi">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">İade nedeni
          <select name="reason" required defaultValue="" className={accountField}>
            <option value="" disabled>Seç…</option>
            {RETURN_REASONS.map((reason) => <option key={reason} value={reason}>{returnReasonLabels[reason]}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold">Adet (en fazla {item.remaining})
          <input name="quantity" type="number" required min={1} max={item.remaining} step={1} defaultValue={1} className={accountField} />
        </label>
      </div>
      <label className="block text-sm font-semibold">Açıklama (isteğe bağlı)
        <textarea name="description" maxLength={1000} className={accountField} />
      </label>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-3">
        <button disabled={busy} className={accountButton}>{busy ? "Gönderiliyor…" : "İade talebi gönder"}</button>
        <button type="button" disabled={busy} onClick={onCancel} className={accountGhostButton}>Vazgeç</button>
      </div>
    </form>
  );
}

function ShipBackForm({ item, onDone }: { item: ReturnView; onDone: () => void }) {
  const { services } = useMarketplace();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError("");
    try {
      await services.returns.shipBack(item.id, String(data.get("carrier") ?? ""), String(data.get("tracking") ?? ""));
      onDone();
    } catch (caught) {
      setError(friendlyError(caught));
      setBusy(false);
    }
  }

  if (!open) return <button type="button" onClick={() => setOpen(true)} className={accountButton}>Ürünü kargoya verdim</button>;
  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3" aria-label="Kargo bilgisi">
      <label className="text-sm font-semibold">Kargo firması<input name="carrier" required maxLength={60} className={accountField} /></label>
      <label className="text-sm font-semibold">Takip no<input name="tracking" required maxLength={60} className={accountField} /></label>
      <button disabled={busy} className={accountButton}>{busy ? "Kaydediliyor…" : "Bildir"}</button>
      {error && <p role="alert" className="w-full text-sm text-rose-600">{error}</p>}
    </form>
  );
}

export function CustomerReturns() {
  const { services, user } = useMarketplace();
  const loadMine = useCallback(() => services.returns.listMine(), [services]);
  const loadReturnable = useCallback(() => services.returns.listReturnable(), [services]);
  const mine = useAsync<ReturnView[]>(user ? loadMine : null);
  const returnable = useAsync<ReturnableItemView[]>(user ? loadReturnable : null);
  const [creating, setCreating] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  function refreshAll() {
    mine.reload();
    returnable.reload();
  }

  return (
    <AccountShell title="İadelerim" description={`Teslim aldığın ürünler için ${RETURN_WINDOW_DAYS} gün içinde iade talebi oluşturabilirsin.`}>
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <div className={accountCard}>
        <h2 className="text-lg font-bold">İade edilebilir ürünler</h2>
        {returnable.error ? (
          <p role="alert" className="mt-3 text-sm text-rose-600">Ürünler yüklenemedi. {returnable.error} <button type="button" onClick={returnable.reload} className="font-semibold underline">Tekrar dene</button></p>
        ) : returnable.loading && !returnable.data ? (
          <p role="status" className="mt-3 text-sm text-navy-500">Yükleniyor…</p>
        ) : !returnable.data?.length ? (
          <p className="mt-3 text-sm text-navy-500">İade süresi içinde teslim edilmiş ürünün yok.</p>
        ) : (
          <ul className="mt-3 divide-y divide-navy-50">
            {returnable.data.map((item) => (
              <li key={item.orderItemId} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span><strong>{item.productName}</strong>{item.variantLabel ? ` (${item.variantLabel})` : ""} · Sipariş {item.orderNo}<span className="block text-xs text-navy-500">{item.remaining} / {item.quantity} adet iade edilebilir · {formatPrice(item.unitPrice)} · Son gün: {new Date(item.deadline).toLocaleDateString("tr-TR")}</span></span>
                  {creating !== item.orderItemId && <button type="button" onClick={() => setCreating(item.orderItemId)} className={accountGhostButton}>İade talebi oluştur</button>}
                </div>
                {creating === item.orderItemId && (
                  <RequestForm item={item} onCancel={() => setCreating(null)} onDone={() => { setCreating(null); setNotice("İade talebin satıcıya iletildi."); refreshAll(); }} />
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className={accountCard}>
        <h2 className="text-lg font-bold">İade taleplerim</h2>
        {mine.error ? (
          <p role="alert" className="mt-3 text-sm text-rose-600">İadeler yüklenemedi. {mine.error} <button type="button" onClick={mine.reload} className="font-semibold underline">Tekrar dene</button></p>
        ) : mine.loading && !mine.data ? (
          <p role="status" className="mt-3 text-sm text-navy-500">Yükleniyor…</p>
        ) : !mine.data?.length ? (
          <p className="mt-3 text-sm text-navy-500">Henüz iade talebin yok.</p>
        ) : (
          <ul className="mt-3 divide-y divide-navy-50">
            {mine.data.map((item) => (
              <li key={item.id} className="space-y-3 py-4">
                <ReturnSummary item={item} />
                {item.status === "approved" && <ShipBackForm item={item} onDone={() => { setNotice("Kargo bilgin satıcıya iletildi."); refreshAll(); }} />}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-navy-400">Gerçek para iadesi ödeme sağlayıcısı bağlandığında yapılacaktır; şimdilik iade süreci kayıt olarak yürütülür.</p>
      </div>
    </AccountShell>
  );
}
