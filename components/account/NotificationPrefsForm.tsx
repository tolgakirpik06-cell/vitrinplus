"use client";

import { useCallback, useState } from "react";
import { useMarketplace } from "@/components/marketplace/context";
import { AccountShell, accountButton, accountCard } from "@/components/account/AccountShell";
import { friendlyError } from "@/lib/domain/errors";
import { useAsync } from "@/lib/use-async";
import type { ProfileView } from "@/lib/repositories/types";
import type { NotificationPrefs } from "@/types/database";

const OPTIONS: { key: keyof NotificationPrefs; label: string; hint: string }[] = [
  { key: "orderUpdates", label: "Sipariş güncellemeleri", hint: "Sipariş hazırlandığında, kargoya verildiğinde veya iptal edildiğinde." },
  { key: "returnUpdates", label: "İade güncellemeleri", hint: "İade talebinin onay, ret veya tamamlanma durumları." },
  { key: "questionAnswers", label: "Soru yanıtları", hint: "Satıcıya sorduğun soru yanıtlandığında." },
  { key: "promotions", label: "Kampanya ve öneriler", hint: "İndirim ve kampanya duyuruları." },
  { key: "email", label: "E-posta ile bildir", hint: "Seçtiğin bildirimleri e-posta ile al." },
  { key: "sms", label: "SMS ile bildir", hint: "Seçtiğin bildirimleri SMS ile al." },
];

function Form({ profile, onSaved }: { profile: ProfileView; onSaved: () => void }) {
  const { services } = useMarketplace();
  const [prefs, setPrefs] = useState<NotificationPrefs>(profile.notificationPrefs);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      await services.account.updateProfile({ notificationPrefs: prefs });
      setMessage({ ok: true, text: "Tercihlerin kaydedildi." });
      onSaved();
    } catch (caught) {
      setMessage({ ok: false, text: friendlyError(caught) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`${accountCard} space-y-4`}>
      <ul className="divide-y divide-navy-50">
        {OPTIONS.map((option) => (
          <li key={option.key} className="py-3">
            <label className="flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={prefs[option.key]} onChange={(event) => setPrefs({ ...prefs, [option.key]: event.target.checked })} className="mt-1" />
              <span><strong className="block">{option.label}</strong><span className="text-xs text-navy-500">{option.hint}</span></span>
            </label>
          </li>
        ))}
      </ul>
      <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Tercihlerin hesabına kaydedilir. E-posta ve SMS gönderim altyapısı henüz bağlı değil; bildirimler bağlandığında bu tercihler uygulanır.</p>
      {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-700" : "text-rose-600"}`}>{message.text}</p>}
      <button type="button" disabled={busy} onClick={() => void save()} className={accountButton}>{busy ? "Kaydediliyor…" : "Kaydet"}</button>
    </div>
  );
}

export function NotificationPrefsForm() {
  const { services, user } = useMarketplace();
  const load = useCallback(() => services.account.getProfile(), [services]);
  const profile = useAsync<ProfileView>(user ? load : null);
  return (
    <AccountShell title="Bildirim tercihleri" description="Hangi güncellemeleri nasıl almak istediğini seç.">
      {profile.error ? (
        <p role="alert" className={accountCard}>Tercihler yüklenemedi. {profile.error} <button type="button" onClick={profile.reload} className="font-semibold text-brand-600 underline">Tekrar dene</button></p>
      ) : profile.loading && !profile.data ? (
        <p role="status">Tercihler yükleniyor…</p>
      ) : profile.data ? (
        <Form key={profile.data.id} profile={profile.data} onSaved={profile.reload} />
      ) : null}
    </AccountShell>
  );
}
