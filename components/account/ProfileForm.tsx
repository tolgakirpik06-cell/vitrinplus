"use client";

import { useCallback, useState, type FormEvent } from "react";
import { useMarketplace } from "@/components/marketplace/context";
import { AccountShell, accountButton, accountCard, accountField } from "@/components/account/AccountShell";
import { friendlyError } from "@/lib/domain/errors";
import { useAsync } from "@/lib/use-async";
import type { ProfileView } from "@/lib/repositories/types";

function Form({ profile, onSaved }: { profile: ProfileView; onSaved: () => void }) {
  const { services } = useMarketplace();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setMessage(null);
    try {
      await services.account.updateProfile({ fullName: String(data.get("fullName") ?? "").trim(), phone: String(data.get("phone") ?? "").trim() });
      setMessage({ ok: true, text: "Profilin güncellendi." });
      onSaved();
    } catch (caught) {
      setMessage({ ok: false, text: friendlyError(caught) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${accountCard} space-y-4`}>
      <label className="block text-sm font-semibold">
        E-posta
        <input value={profile.email} readOnly aria-readonly className={`${accountField} bg-navy-50 text-navy-500`} />
        <span className="mt-1 block text-xs font-normal text-navy-400">E-posta adresi giriş bilgindir; buradan değiştirilemez.</span>
      </label>
      <label className="block text-sm font-semibold">
        Ad soyad
        <input name="fullName" required minLength={2} maxLength={120} autoComplete="name" defaultValue={profile.fullName} className={accountField} />
      </label>
      <label className="block text-sm font-semibold">
        Telefon
        <input name="phone" type="tel" maxLength={18} autoComplete="tel" defaultValue={profile.phone} placeholder="05xx xxx xx xx" className={accountField} />
      </label>
      {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-700" : "text-rose-600"}`}>{message.text}</p>}
      <button disabled={busy} className={accountButton}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
    </form>
  );
}

export function ProfileForm() {
  const { services, user } = useMarketplace();
  const load = useCallback(() => services.account.getProfile(), [services]);
  const profile = useAsync<ProfileView>(user ? load : null);

  return (
    <AccountShell title="Profil" description="Ad, iletişim ve hesap bilgilerin.">
      {profile.error ? (
        <p role="alert" className={accountCard}>Profil yüklenemedi. {profile.error} <button type="button" onClick={profile.reload} className="font-semibold text-brand-600 underline">Tekrar dene</button></p>
      ) : profile.loading && !profile.data ? (
        <p role="status">Profil yükleniyor…</p>
      ) : profile.data ? (
        <Form key={profile.data.id} profile={profile.data} onSaved={profile.reload} />
      ) : null}
    </AccountShell>
  );
}
