"use client";

import Link from "next/link";
import { useState } from "react";
import { useMarketplace } from "@/components/marketplace/context";
import { AccountShell, accountButton, accountCard, accountGhostButton } from "@/components/account/AccountShell";
import { orderLabels } from "@/lib/demo-marketplace";
import { friendlyError } from "@/lib/domain/errors";
import { formatPrice } from "@/lib/utils";

export function AccountOverview() {
  const { user, state, mode, role, sellerAccount, shop, logout } = useMarketplace();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const orders = state.orders.filter((order) => order.buyerId === user?.id).slice(0, 3);
  const sellerHref = mode === "supabase" ? (sellerAccount?.status === "approved" ? "/satici-panel" : sellerAccount ? "/satici-basvuru/durum" : "/satici-basvuru") : shop?.status === "onaylandi" ? "/satici-panel" : "/demo";
  const sellerLabel = mode === "supabase" ? (sellerAccount?.status === "approved" ? "Mağazamı yönet" : sellerAccount ? "Başvuru durumum" : "Mağaza aç") : shop?.status === "onaylandi" ? "Mağazamı yönet" : "Mağaza aç";

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      await logout();
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AccountShell title={`Merhaba, ${user?.name ?? ""}`} description={user?.email}>
      <div className={accountCard}>
        <p className="text-sm text-navy-500">
          {mode === "supabase" ? "Hesabın e-posta ve şifreyle doğrulanır; verilerin hesabına bağlı olarak saklanır." : "Şifresiz yerel demo hesabı. Gerçek kimlik doğrulama yapılmaz; veriler bu tarayıcıda saklanır."}
          {role === "admin" ? " Yönetici yetkin var." : ""}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/siparislerim" className={accountButton}>Siparişlerim</Link>
          <Link href={sellerHref} className={accountButton}>{sellerLabel}</Link>
          {role === "admin" && <Link href="/yonetim" className={accountGhostButton}>Yönetim</Link>}
          <button type="button" disabled={busy} onClick={() => void signOut()} className={accountGhostButton}>Çıkış yap</button>
        </div>
        {error && <p role="alert" className="mt-3 text-sm text-rose-600">{error}</p>}
      </div>

      <div className={accountCard}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">Son siparişlerim</h2>
          <Link href="/siparislerim" className="text-sm font-semibold text-brand-600">Tümü →</Link>
        </div>
        {orders.length === 0 ? (
          <p className="mt-3 text-sm text-navy-500">Henüz siparişin yok. <Link href="/" className="font-semibold text-brand-600">Alışverişe başla</Link></p>
        ) : (
          <ul className="mt-3 divide-y divide-navy-50">
            {orders.map((order) => (
              <li key={order.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span><strong>{order.id}</strong> · {new Date(order.createdAt).toLocaleDateString("tr-TR")}</span>
                <span className="flex items-center gap-3"><span className="rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700">{orderLabels[order.status]}</span><strong>{formatPrice(order.total)}</strong></span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AccountShell>
  );
}
