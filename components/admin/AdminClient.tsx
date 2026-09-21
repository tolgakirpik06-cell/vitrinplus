"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useMarketplace } from "@/components/marketplace/context";
import { ActionButton, Field, SelectInput, TextArea, TextInput } from "@/components/dashboard/form";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { Modal } from "@/components/dashboard/Modal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { StatusBadge, type BadgeTone } from "@/components/dashboard/StatusBadge";
import { friendlyError } from "@/lib/domain/errors";
import { useAsync } from "@/lib/use-async";
import { formatPrice } from "@/lib/utils";
import type { AdminService } from "@/lib/services";
import type { ApplicationReviewView, PayoutView } from "@/lib/repositories/types";
import type { DbPayoutStatus, DbSellerStatus } from "@/types/database";

const SELLER_STATUS: Record<DbSellerStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "İnceleniyor", tone: "warning" },
  approved: { label: "Onaylı", tone: "success" },
  rejected: { label: "Reddedildi", tone: "danger" },
  suspended: { label: "Askıda", tone: "danger" },
};

const PAYOUT_STATUS: Record<DbPayoutStatus, { label: string; tone: BadgeTone }> = {
  planned: { label: "Planlandı", tone: "info" },
  processing: { label: "İşleniyor", tone: "warning" },
  paid: { label: "Ödendi (kayıt)", tone: "success" },
  failed: { label: "Başarısız", tone: "danger" },
  cancelled: { label: "İptal", tone: "neutral" },
};

type Decision = { kind: "reject" | "suspend"; application: ApplicationReviewView };

/**
 * Asgari yönetim ekranı: satıcı başvuru incelemesi ve ödeme planı.
 * NOT: Bu ekranın rol kontrolü yalnızca kullanıcı deneyimi içindir. Asıl yetki `proxy.ts` (rota),
 * RLS politikaları ve SECURITY DEFINER fonksiyonlarındaki `is_admin()` kontrolündedir.
 */
export function AdminClient() {
  const { ready, mode, user, role, services } = useMarketplace();
  const admin = services.admin;
  const [tab, setTab] = useState<"applications" | "payouts">("applications");

  if (!ready) return <LoadingState label="Yönetim ekranı yükleniyor…" />;
  if (mode !== "supabase") {
    return <EmptyState icon={ShieldAlert} title="Yönetim ekranı gerçek hesap modunda çalışır" description="Supabase yapılandırılmadığı için bu ortam tarayıcı içi demo modunda. Demo başvuruları /demo sayfasından onaylanır." action={<Link href="/demo" className="font-semibold text-royal-600">Demo rehberi →</Link>} />;
  }
  if (!user) {
    return <EmptyState icon={ShieldAlert} title="Giriş yapmalısın" action={<Link href="/giris?next=%2Fyonetim" className="font-semibold text-royal-600">Giriş yap →</Link>} />;
  }
  if (role !== "admin" || !admin) {
    return <EmptyState icon={ShieldAlert} title="Bu ekran için yetkin yok" description="Yönetim ekranı yalnızca yönetici hesaplarına açıktır." action={<Link href="/" className="font-semibold text-royal-600">Ana sayfa →</Link>} />;
  }

  return (
    <>
      <PageHeader title="Yönetim" description="Satıcı başvurularını incele, ödemeleri planla. Gerçek para transferi bu ekrandan yapılmaz; ödeme durumları kayıt amaçlıdır." />
      <div role="tablist" aria-label="Yönetim bölümleri" className="flex gap-2">
        {(
          [
            ["applications", "Satıcı başvuruları"],
            ["payouts", "Ödemeler"],
          ] as const
        ).map(([key, label]) => (
          <button key={key} role="tab" type="button" aria-selected={tab === key} onClick={() => setTab(key)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab === key ? "bg-royal-600 text-white" : "border border-line bg-white text-navy-700"}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === "applications" ? <Applications admin={admin} /> : <Payouts admin={admin} />}
    </>
  );
}

function Applications({ admin }: { admin: AdminService }) {
  const [filter, setFilter] = useState<DbSellerStatus | "all">("pending");
  const load = useCallback(() => admin.listApplications(filter === "all" ? undefined : filter), [admin, filter]);
  const list = useAsync(load);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [reason, setReason] = useState("");

  async function run(id: string, action: () => Promise<void>, done: string) {
    setBusyId(id);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "ok", text: done });
      setDecision(null);
      setReason("");
      list.reload();
    } catch (error) {
      setMessage({ tone: "error", text: friendlyError(error) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Panel>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-bold text-navy-900">Başvurular</h2>
        <label className="flex items-center gap-2 text-xs font-semibold text-navy-600">
          Durum
          <SelectInput value={filter} onChange={(event) => setFilter(event.target.value as DbSellerStatus | "all")} aria-label="Durum süzgeci">
            <option value="pending">İnceleniyor</option>
            <option value="approved">Onaylı</option>
            <option value="rejected">Reddedildi</option>
            <option value="suspended">Askıda</option>
            <option value="all">Tümü</option>
          </SelectInput>
        </label>
      </div>
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`mb-3 text-sm ${message.tone === "error" ? "text-rose-600" : "text-emerald-700"}`}>{message.text}</p>}
      {list.error ? (
        <EmptyState title="Başvurular yüklenemedi" description={list.error} action={<ActionButton onClick={list.reload}>Tekrar dene</ActionButton>} />
      ) : list.loading && !list.data ? (
        <LoadingState />
      ) : !list.data?.length ? (
        <EmptyState compact title="Bu durumda başvuru yok" />
      ) : (
        <ul className={`divide-y divide-line transition-opacity ${list.loading ? "opacity-60" : ""}`} aria-busy={list.loading}>
          {list.data.map((item) => {
            const badge = SELLER_STATUS[item.status];
            const busy = busyId === item.accountId;
            const locked = busyId !== null;
            return (
              <li key={item.accountId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900">{item.storeName} <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></p>
                  <p className="text-xs text-muted">{item.ownerName} · {item.ownerEmail} · Paket: {item.plan} · {item.reference} · {new Date(item.submittedAt).toLocaleDateString("tr-TR")}</p>
                  {item.rejectionReason && <p className="mt-1 text-xs text-rose-600">Gerekçe: {item.rejectionReason}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {(item.status === "pending" || item.status === "rejected" || item.status === "suspended") && (
                    <ActionButton size="sm" variant="primary" loading={busy} disabled={locked} onClick={() => run(item.accountId, () => admin.approve(item.accountId), `${item.storeName} onaylandı; mağaza artık satışa açık.`)}>Onayla</ActionButton>
                  )}
                  {item.status === "pending" && <ActionButton size="sm" variant="danger" disabled={locked} onClick={() => setDecision({ kind: "reject", application: item })}>Reddet</ActionButton>}
                  {item.status === "approved" && <ActionButton size="sm" variant="danger" disabled={locked} onClick={() => setDecision({ kind: "suspend", application: item })}>Askıya al</ActionButton>}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Modal
        open={decision !== null}
        onClose={() => { setDecision(null); setReason(""); }}
        size="sm"
        title={decision?.kind === "reject" ? "Başvuruyu reddet" : "Mağazayı askıya al"}
        description={decision?.application.storeName}
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => { setDecision(null); setReason(""); }}>Vazgeç</ActionButton>
            <ActionButton
              variant="dangerSolid"
              disabled={reason.trim().length < 3}
              loading={decision !== null && busyId === decision.application.accountId}
              onClick={() => {
                if (!decision) return;
                const target = decision.application;
                void run(target.accountId, () => (decision.kind === "reject" ? admin.reject(target.accountId, reason) : admin.suspend(target.accountId, reason)), decision.kind === "reject" ? "Başvuru reddedildi." : "Mağaza askıya alındı.");
              }}
            >
              {decision?.kind === "reject" ? "Reddet" : "Askıya al"}
            </ActionButton>
          </>
        }
      >
        <Field label="Gerekçe (satıcıya gösterilir)" htmlFor="admin-reason" hint={`${reason.length}/300`}>
          <TextArea id="admin-reason" value={reason} maxLength={300} onChange={(event) => setReason(event.target.value)} />
        </Field>
      </Modal>
    </Panel>
  );
}

function Payouts({ admin }: { admin: AdminService }) {
  const loadCandidates = useCallback(() => admin.listPayoutCandidates(), [admin]);
  const loadPayouts = useCallback(() => admin.listPayouts(), [admin]);
  const candidates = useAsync(loadCandidates);
  const payouts = useAsync(loadPayouts);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [reference, setReference] = useState<Record<string, string>>({});
  const [confirmPaid, setConfirmPaid] = useState<PayoutView | null>(null);
  const locked = busy !== null;

  async function run(key: string, action: () => Promise<void>, done: string) {
    setBusy(key);
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "ok", text: done });
      candidates.reload();
      payouts.reload();
    } catch (error) {
      setMessage({ tone: "error", text: friendlyError(error) });
    } finally {
      setBusy(null);
    }
  }

  const nextActions = (payout: PayoutView): { status: "processing" | "paid" | "failed" | "cancelled"; label: string; variant: "primary" | "secondary" | "danger" }[] =>
    payout.status === "planned"
      ? [{ status: "processing", label: "İşleme al", variant: "secondary" }, { status: "paid", label: "Ödendi olarak işaretle", variant: "primary" }, { status: "cancelled", label: "İptal et", variant: "danger" }]
      : payout.status === "processing"
        ? [{ status: "paid", label: "Ödendi olarak işaretle", variant: "primary" }, { status: "failed", label: "Başarısız", variant: "danger" }]
        : [];

  return (
    <div className="flex flex-col gap-6">
      {message && <p role={message.tone === "error" ? "alert" : "status"} className={`text-sm ${message.tone === "error" ? "text-rose-600" : "text-emerald-700"}`}>{message.text}</p>}
      <Panel>
        <h2 className="mb-1 text-base font-bold text-navy-900">Ödemeye hazır bakiyeler</h2>
        <p className="mb-4 text-xs text-muted">Teslimden sonra bekleme süresi dolan, henüz bir ödemeye bağlanmamış kazançlar.</p>
        {candidates.error ? (
          <EmptyState compact title="Bakiyeler yüklenemedi" description={candidates.error} action={<ActionButton onClick={candidates.reload}>Tekrar dene</ActionButton>} />
        ) : candidates.loading && !candidates.data ? (
          <LoadingState />
        ) : !candidates.data?.length ? (
          <EmptyState compact title="Ödemeye hazır bakiye yok" />
        ) : (
          <ul className="divide-y divide-line">
            {candidates.data.map((item) => (
              <li key={item.storeId} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span className="font-semibold text-navy-900">{item.storeName}</span>
                <span className="flex items-center gap-3">
                  <strong>{formatPrice(item.availableBalance)}</strong>
                  <ActionButton size="sm" variant="primary" loading={busy === `plan:${item.storeId}`} disabled={locked} onClick={() => run(`plan:${item.storeId}`, () => admin.planPayout(item.storeId), `${item.storeName} için ödeme planlandı.`)}>Ödeme planla</ActionButton>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel>
        <h2 className="mb-4 text-base font-bold text-navy-900">Ödeme kayıtları</h2>
        {payouts.error ? (
          <EmptyState compact title="Ödemeler yüklenemedi" description={payouts.error} action={<ActionButton onClick={payouts.reload}>Tekrar dene</ActionButton>} />
        ) : payouts.loading && !payouts.data ? (
          <LoadingState />
        ) : !payouts.data?.length ? (
          <EmptyState compact title="Henüz ödeme kaydı yok" />
        ) : (
          <ul className={`divide-y divide-line transition-opacity ${payouts.loading ? "opacity-60" : ""}`} aria-busy={payouts.loading}>
            {payouts.data.map((payout) => {
              const badge = PAYOUT_STATUS[payout.status];
              const actions = nextActions(payout);
              return (
                <li key={payout.id} className="flex flex-col gap-2 py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span><strong>{payout.storeName}</strong> · {payout.payoutNo} · <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></span>
                    <strong>{formatPrice(payout.amount)}</strong>
                  </div>
                  <p className="text-xs text-muted">Planlanan: {new Date(payout.plannedFor).toLocaleDateString("tr-TR")}{payout.providerReference ? ` · Referans: ${payout.providerReference}` : ""}</p>
                  {actions.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <TextInput aria-label="Banka dekont / referans no (isteğe bağlı)" placeholder="Referans no (isteğe bağlı)" maxLength={120} value={reference[payout.id] ?? ""} onChange={(event) => setReference({ ...reference, [payout.id]: event.target.value })} className="max-w-xs" />
                      {actions.map((action) => (
                        <ActionButton
                          key={action.status}
                          size="sm"
                          variant={action.variant}
                          loading={busy === `${payout.id}:${action.status}`}
                          disabled={locked}
                          onClick={() => {
                            // "Ödendi" geri alınamaz bir kayıt: önce onay iste.
                            if (action.status === "paid") setConfirmPaid(payout);
                            else void run(`${payout.id}:${action.status}`, () => admin.setPayoutStatus(payout.id, action.status, reference[payout.id]?.trim() || undefined), "Ödeme durumu güncellendi.");
                          }}
                        >
                          {action.label}
                        </ActionButton>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      <Modal
        open={confirmPaid !== null}
        onClose={() => setConfirmPaid(null)}
        size="sm"
        title="Ödemeyi “ödendi” olarak işaretle"
        description={confirmPaid ? `${confirmPaid.storeName} · ${confirmPaid.payoutNo} · ${formatPrice(confirmPaid.amount)}` : undefined}
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setConfirmPaid(null)}>Vazgeç</ActionButton>
            <ActionButton
              variant="primary"
              loading={confirmPaid !== null && busy === `${confirmPaid.id}:paid`}
              onClick={() => {
                if (!confirmPaid) return;
                const target = confirmPaid;
                void run(`${target.id}:paid`, () => admin.setPayoutStatus(target.id, "paid", reference[target.id]?.trim() || undefined), "Ödeme “ödendi” olarak kaydedildi.").then(() => setConfirmPaid(null));
              }}
            >
              Ödendi olarak kaydet
            </ActionButton>
          </>
        }
      >
        <p className="text-sm text-navy-700">Bu işlem yalnızca kayıt tutar; bu ekrandan gerçek bir para transferi yapılmaz. Tutarı banka üzerinden ayrıca gönderdiğinden emin ol. İşaretlenen ödeme sonradan değiştirilemez.</p>
      </Modal>
    </div>
  );
}
