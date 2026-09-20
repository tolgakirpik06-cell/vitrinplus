"use client";

import { CalendarClock, Megaphone, Plus, Tag, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ConfirmModal, Modal } from "@/components/dashboard/Modal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { StatCard } from "@/components/dashboard/StatCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { useToast } from "@/components/dashboard/Toast";
import { UpgradeLock } from "@/components/dashboard/UpgradeLock";
import { ActionButton, Field, TextInput, UnitInput } from "@/components/dashboard/form";
import { useSellerData, type SellerCampaign } from "@/components/seller/SellerDataProvider";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { dayKey, formatShortDate } from "@/lib/format";
import { hasFeature } from "@/lib/plans";

function CampaignForm({ onClose, onCreate }: { onClose: () => void; onCreate: (input: Omit<SellerCampaign, "id">) => boolean }) {
  const { now } = useSellerWorkspace();
  const [name, setName] = useState("");
  const [discount, setDiscount] = useState("10");
  const [endDate, setEndDate] = useState("");
  const [errors, setErrors] = useState<{ name?: string; discount?: string; endDate?: string }>({});
  const ids = { name: useId(), discount: useId(), end: useId() };

  function submit() {
    const found: typeof errors = {};
    const percent = Number(discount.replace(",", "."));
    if (name.trim().length < 2) found.name = "Kampanya adı en az 2 karakter olmalı.";
    if (!Number.isFinite(percent) || percent < 1 || percent > 90) found.discount = "İndirim %1 ile %90 arasında olmalı.";
    if (!endDate) found.endDate = "Bitiş tarihi seç.";
    else if (endDate < dayKey(now)) found.endDate = "Bitiş tarihi geçmişte olamaz.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    if (onCreate({ name: name.trim(), discountPercent: Math.round(percent), endDate })) onClose();
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Kampanya Oluştur"
      description="Kampanya taslağı oluşturur; ürün fiyatlarına otomatik uygulanmaz."
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>
            Vazgeç
          </ActionButton>
          <ActionButton variant="primary" onClick={submit}>
            Oluştur
          </ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Kampanya Adı" required htmlFor={ids.name} error={errors.name}>
          <TextInput id={ids.name} autoFocus value={name} invalid={Boolean(errors.name)} onChange={(event) => setName(event.target.value)} placeholder="Örn. Hafta Sonu Fırsatı" />
        </Field>
        <Field label="İndirim Oranı" required htmlFor={ids.discount} error={errors.discount}>
          <UnitInput id={ids.discount} unit="%" inputMode="numeric" value={discount} invalid={Boolean(errors.discount)} onChange={(event) => setDiscount(event.target.value)} />
        </Field>
        <Field label="Bitiş Tarihi" required htmlFor={ids.end} error={errors.endDate}>
          <TextInput id={ids.end} type="date" value={endDate} min={dayKey(now)} invalid={Boolean(errors.endDate)} onChange={(event) => setEndDate(event.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/** Kampanyalar: eski kampanya oluşturma/silme davranışı korunur. Kampanya oluşturma Vitrin Plus ve üstünde açıktır. */
export function CampaignsPage() {
  const toast = useToast();
  const { planKey, now } = useSellerWorkspace();
  const { campaigns, addCampaign, deleteCampaign } = useSellerData();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SellerCampaign | null>(null);

  const allowed = hasFeature(planKey, "campaigns");
  const today = dayKey(now);
  const active = campaigns.filter((campaign) => campaign.endDate >= today);

  if (!allowed) {
    return (
      <>
        <PageHeader title="Kampanyalar" description="İndirim kampanyaları oluştur ve satışlarını artır." />
        <UpgradeLock
          variant="page"
          feature="campaigns"
          currentPlan={planKey}
          description={campaigns.length > 0 ? `Mevcut ${campaigns.length} kampanyan korunuyor; yeni kampanya oluşturmak için paketini yükselt.` : undefined}
        />
      </>
    );
  }

  function create(input: Omit<SellerCampaign, "id">): boolean {
    try {
      addCampaign(input);
      toast.success("Kampanya oluşturuldu.");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kampanya oluşturulamadı.");
      return false;
    }
  }

  return (
    <>
      <PageHeader
        title="Kampanyalar"
        description="İndirim kampanyaları oluştur ve satışlarını artır."
        actions={
          <ActionButton variant="primary" onClick={() => setFormOpen(true)}>
            <Plus size={15} aria-hidden /> Kampanya Oluştur
          </ActionButton>
        }
      />
      <div className="flex flex-col gap-5">
        <ul aria-label="Kampanya özeti" className="grid gap-3 sm:grid-cols-3">
          <li>
            <StatCard icon={Megaphone} tone="violet" label="Toplam Kampanya" value={campaigns.length} className="h-full" />
          </li>
          <li>
            <StatCard icon={Tag} tone="green" label="Aktif Kampanya" value={active.length} note="Bitiş tarihi geçmemiş" className="h-full" />
          </li>
          <li>
            <StatCard icon={CalendarClock} tone="slate" label="Sona Eren" value={campaigns.length - active.length} className="h-full" />
          </li>
        </ul>

        <p role="note" className="rounded-xl border border-line bg-white px-4 py-3 text-xs leading-relaxed text-muted shadow-panel">
          Kampanyalar taslak olarak saklanır ve ürün fiyatlarına otomatik uygulanmaz. Ürün bazlı indirim için ürünü düzenlerken “İndirimli fiyat” alanını kullan. Alışveriş demosunda <strong className="text-navy-700">VITRINPLUS10</strong> kuponu kullanılabilir.
        </p>

        <Panel aria-label="Kampanya listesi">
          {campaigns.length === 0 ? (
            <EmptyState
              icon={Megaphone}
              title="Henüz bir kampanyan yok"
              description="İlk kampanyanı oluştur; ad, indirim oranı ve bitiş tarihi yeterli."
              action={
                <ActionButton variant="primary" onClick={() => setFormOpen(true)}>
                  <Plus size={14} aria-hidden /> Kampanya Oluştur
                </ActionButton>
              }
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {campaigns.map((campaign) => {
                const live = campaign.endDate >= today;
                return (
                  <li key={campaign.id} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-white p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-navy-900">{campaign.name}</p>
                      <p className="mt-1 text-xs text-muted">
                        %{campaign.discountPercent} indirim · {formatShortDate(campaign.endDate)} tarihine kadar
                      </p>
                      <div className="mt-2">
                        <StatusBadge tone={live ? "success" : "neutral"}>{live ? "Aktif" : "Sona erdi"}</StatusBadge>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(campaign)}
                      aria-label={`${campaign.name} kampanyasını sil`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-400"
                    >
                      <Trash2 size={15} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      {formOpen ? <CampaignForm onClose={() => setFormOpen(false)} onCreate={create} /> : null}
      <ConfirmModal
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Kampanya silinsin mi?"
        confirmLabel="Sil"
        description={deleteTarget ? <><strong>{deleteTarget.name}</strong> kampanyası kalıcı olarak silinir.</> : null}
        onConfirm={() => {
          if (deleteTarget) {
            try {
              deleteCampaign(deleteTarget.id);
              toast.success("Kampanya silindi.");
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Kampanya silinemedi.");
            }
          }
          setDeleteTarget(null);
        }}
      />
    </>
  );
}
