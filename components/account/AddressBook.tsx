"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useMarketplace } from "@/components/marketplace/context";
import { AccountShell, accountButton, accountCard, accountField, accountGhostButton } from "@/components/account/AccountShell";
import { MAX_ADDRESSES } from "@/lib/domain/account";
import { friendlyError } from "@/lib/domain/errors";
import { useAsync } from "@/lib/use-async";
import type { AddressInput, AddressView } from "@/lib/repositories/types";

function AddressForm({ initial, first, onCancel, onSubmit }: { initial: AddressView | null; first: boolean; onCancel: () => void; onSubmit: (input: AddressInput) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    setBusy(true);
    setError("");
    try {
      await onSubmit({ title: text("title"), fullName: text("fullName"), phone: text("phone"), city: text("city"), district: text("district"), addressLine: text("addressLine"), postalCode: text("postalCode"), isDefault: data.get("isDefault") === "on" });
    } catch (caught) {
      setError(friendlyError(caught));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${accountCard} space-y-4`} aria-label={initial ? "Adresi düzenle" : "Yeni adres"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-semibold">Adres başlığı<input name="title" required maxLength={40} defaultValue={initial?.title ?? ""} placeholder="Ev, İş…" className={accountField} /></label>
        <label className="text-sm font-semibold">Ad soyad<input name="fullName" required minLength={2} maxLength={80} autoComplete="name" defaultValue={initial?.fullName ?? ""} className={accountField} /></label>
        <label className="text-sm font-semibold">Telefon<input name="phone" required type="tel" maxLength={18} autoComplete="tel" defaultValue={initial?.phone ?? ""} className={accountField} /></label>
        <label className="text-sm font-semibold">Posta kodu (isteğe bağlı)<input name="postalCode" maxLength={10} autoComplete="postal-code" defaultValue={initial?.postalCode ?? ""} className={accountField} /></label>
        <label className="text-sm font-semibold">İl<input name="city" required minLength={2} maxLength={60} defaultValue={initial?.city ?? ""} className={accountField} /></label>
        <label className="text-sm font-semibold">İlçe<input name="district" required minLength={2} maxLength={60} defaultValue={initial?.district ?? ""} className={accountField} /></label>
        <label className="text-sm font-semibold sm:col-span-2">Açık adres<textarea name="addressLine" required minLength={5} maxLength={300} defaultValue={initial?.addressLine ?? ""} className={accountField} /></label>
      </div>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isDefault" defaultChecked={initial?.isDefault ?? first} />Varsayılan adres yap</label>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-3">
        <button disabled={busy} className={accountButton}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
        <button type="button" disabled={busy} onClick={onCancel} className={accountGhostButton}>Vazgeç</button>
      </div>
    </form>
  );
}

export function AddressBook() {
  const { services, user } = useMarketplace();
  const load = useCallback(() => services.account.listAddresses(), [services]);
  const list = useAsync<AddressView[]>(user ? load : null);
  const [editing, setEditing] = useState<AddressView | "new" | null>(null);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const items = list.data ?? [];

  async function save(input: AddressInput) {
    await services.account.saveAddress(editing !== "new" && editing ? editing.id : null, input);
    setEditing(null);
    list.reload();
  }

  async function remove(item: AddressView) {
    setBusyId(item.id);
    setError("");
    try {
      await services.account.deleteAddress(item.id);
      list.reload();
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AccountShell title="Adreslerim" description={`Teslimat adreslerini yönet (en fazla ${MAX_ADDRESSES} adres).`}>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {list.error ? (
        <p role="alert" className={accountCard}>Adresler yüklenemedi. {list.error} <button type="button" onClick={list.reload} className="font-semibold text-brand-600 underline">Tekrar dene</button></p>
      ) : list.loading && !list.data ? (
        <p role="status">Adresler yükleniyor…</p>
      ) : (
        <>
          {items.length === 0 && editing === null && <p className={`${accountCard} text-sm text-navy-500`}>Henüz kayıtlı adresin yok.</p>}
          <ul className="grid gap-4 sm:grid-cols-2">
            {items.map((item) => (
              <li key={item.id} className={accountCard}>
                <p className="font-bold">{item.title}{item.isDefault && <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">Varsayılan</span>}</p>
                <p className="mt-2 text-sm text-navy-600">{item.fullName} · {item.phone}</p>
                <p className="text-sm text-navy-600">{item.addressLine}, {item.district} / {item.city}{item.postalCode ? ` ${item.postalCode}` : ""}</p>
                <div className="mt-4 flex gap-3 text-sm">
                  <button type="button" onClick={() => setEditing(item)} className="font-semibold text-brand-600">Düzenle</button>
                  <button type="button" disabled={busyId === item.id} onClick={() => void remove(item)} className="font-semibold text-rose-600 disabled:opacity-40">{busyId === item.id ? "Siliniyor…" : "Sil"}</button>
                </div>
              </li>
            ))}
          </ul>
          {editing !== null ? (
            <AddressForm key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} first={items.length === 0} onCancel={() => setEditing(null)} onSubmit={save} />
          ) : (
            <button type="button" disabled={items.length >= MAX_ADDRESSES} onClick={() => setEditing("new")} className={accountButton}>Yeni adres ekle</button>
          )}
        </>
      )}
    </AccountShell>
  );
}
