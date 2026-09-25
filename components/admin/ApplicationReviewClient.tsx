"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, Info, ShieldCheck } from "lucide-react";
import { AdminGate } from "@/components/admin/AdminClient";
import { DocumentChecklistList } from "@/components/seller-application/DocumentChecklistList";
import { ActionButton, Field, TextArea, linkButtonClass } from "@/components/dashboard/form";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { Modal } from "@/components/dashboard/Modal";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { StatusBadge, type BadgeTone } from "@/components/dashboard/StatusBadge";
import { NOT_STORED_FIELDS, parseApplicationDetail, type DetailRow } from "@/lib/domain/application-detail";
import { errorCode, friendlyError } from "@/lib/domain/errors";
import { buildDocumentChecklist, formatFileSize } from "@/lib/domain/seller-documents";
import { getPlan, isPlanKey } from "@/lib/plans";
import { MIN_REJECTION_REASON, type AdminService } from "@/lib/services";
import { useAsync } from "@/lib/use-async";
import type { ApplicationDetailView } from "@/lib/repositories/types";
import type { DbSellerStatus } from "@/types/database";

const SELLER_STATUS: Record<DbSellerStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "İnceleniyor", tone: "warning" },
  approved: { label: "Onaylı", tone: "success" },
  rejected: { label: "Reddedildi", tone: "danger" },
  suspended: { label: "Askıda", tone: "danger" },
};

const REASON_MAX = 500;

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
}

function InfoList({ rows }: { rows: DetailRow[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className={`min-w-0 ${row.value && row.value.length > 70 ? "sm:col-span-2" : ""}`}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{row.label}</dt>
          <dd className="mt-0.5 whitespace-pre-line break-words text-sm text-navy-900">{row.value ?? <span className="text-navy-300" aria-label="Belirtilmemiş">—</span>}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Yönetici başvuru inceleme ekranı. Başvurunun kaydedilen TÜM içeriği, yüklenen belgeler ve — sayfanın en altında — karar bölümü.
 * NOT: Rol kontrolü yalnızca kullanıcı deneyimi içindir. Asıl yetki `proxy.ts` (rota), RLS, depolama politikaları ve
 * SECURITY DEFINER fonksiyonlarındaki `is_admin()` kontrolündedir.
 */
export function ApplicationReviewClient({ accountId }: { accountId: string }) {
  return <AdminGate>{(admin) => <ReviewScreen admin={admin} accountId={accountId} />}</AdminGate>;
}

type Dialog = "approve" | "reject" | "suspend" | "reactivate" | null;

function ReviewScreen({ admin, accountId }: { admin: AdminService; accountId: string }) {
  const load = useCallback(() => admin.getApplicationDetail(accountId), [admin, accountId]);
  const detail = useAsync<ApplicationDetailView>(load);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [dialogError, setDialogError] = useState("");

  const back = (
    <Link href="/yonetim" className={linkButtonClass("secondary", "md")}>
      <ArrowLeft size={14} aria-hidden /> Başvurulara dön
    </Link>
  );

  if (detail.error && !detail.data) {
    return (
      <>
        <PageHeader title="Başvuru incelemesi" actions={back} />
        <EmptyState icon={AlertTriangle} title="Başvuru yüklenemedi" description={detail.error} action={<ActionButton onClick={detail.reload}>Tekrar dene</ActionButton>} />
      </>
    );
  }
  if (!detail.data) return <LoadingState label="Başvuru yükleniyor…" />;

  const app = detail.data;
  const content = parseApplicationDetail(app.application);
  const checklist = buildDocumentChecklist(content.sellerType, app.documents);
  const declaredByKey = new Map(content.declaredDocuments.map((doc) => [doc.key, doc]));
  const badge = SELLER_STATUS[app.status];
  const planName = isPlanKey(app.plan) ? getPlan(app.plan).name : app.plan;
  const reasonValid = reason.trim().length >= MIN_REJECTION_REASON;
  // Karar sonrası ekran yenilenirken de kilitli: eski durumla ikinci bir karar tıklanamasın.
  const locked = busy || detail.loading;

  function close() {
    if (busy) return;
    setDialog(null);
    setReason("");
    setDialogError("");
  }

  /** Kararı uygular. Çift tıklamaya karşı `busy` kilitlidir; veritabanı da ikinci kararı reddeder (ALREADY_REVIEWED). */
  async function run(action: () => Promise<void>, done: string) {
    if (busy) return;
    setBusy(true);
    setDialogError("");
    setMessage(null);
    try {
      await action();
      setMessage({ tone: "ok", text: done });
      setDialog(null);
      setReason("");
      detail.reload();
    } catch (error) {
      const text = friendlyError(error);
      if (errorCode(error) === "ALREADY_REVIEWED") {
        // Başka bir yönetici / sekme karar vermiş: ekranı güncel duruma getir.
        setDialog(null);
        setMessage({ tone: "error", text });
        detail.reload();
      } else {
        setDialogError(text);
      }
    } finally {
      setBusy(false);
    }
  }

  const dialogTitle = dialog === "approve" ? "Başvuruyu onayla" : dialog === "reject" ? "Başvuruyu reddet" : dialog === "suspend" ? "Mağazayı askıya al" : "Mağazayı yeniden etkinleştir";

  return (
    <>
      <PageHeader
        title={app.storeName}
        description={`Satıcı başvurusu · ${app.reference}`}
        breadcrumb={[{ label: "Yönetim", href: "/yonetim" }, { label: "Satıcı başvuruları", href: "/yonetim" }, { label: app.storeName }]}
        actions={back}
      />

      {message && (
        <p role={message.tone === "error" ? "alert" : "status"} className={`mb-4 rounded-lg px-4 py-3 text-sm ${message.tone === "error" ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-800"}`}>
          {message.text}
        </p>
      )}

      <div className="flex flex-col gap-6">
        <Panel aria-labelledby="summary-title">
          <PanelHeader id="summary-title" title="Başvuru özeti" action={<StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>} />
          <InfoList
            rows={[
              { label: "Mağaza adı", value: app.storeName },
              { label: "Başvuru no", value: app.reference },
              { label: "Başvuru tarihi", value: formatDateTime(app.submittedAt) },
              { label: "Seçilen paket", value: planName },
              { label: "Satıcı tipi", value: content.sellerTypeLabel },
              { label: "Hesap sahibi", value: app.ownerName || null },
              { label: "Hesap e-postası", value: app.ownerEmail || null },
              { label: "Hesap telefonu", value: app.ownerPhone },
              ...(app.storeDescription ? [{ label: "Mağaza açıklaması", value: app.storeDescription }] : []),
              ...(app.reviewedAt ? [{ label: "Karar tarihi", value: `${formatDateTime(app.reviewedAt)}${app.reviewerName ? ` · ${app.reviewerName}` : ""}` }] : []),
              ...(app.rejectionReason ? [{ label: app.status === "suspended" ? "Askıya alma gerekçesi" : "Red nedeni", value: app.rejectionReason }] : []),
            ]}
          />
        </Panel>

        {content.unrecognized ? (
          <Panel>
            <p className="flex items-start gap-2.5 text-sm text-navy-700">
              <Info size={16} className="mt-0.5 shrink-0 text-royal-600" aria-hidden />
              Bu başvuruda ayrıntılı form kaydı (işletme, vergi, banka, adres bilgileri) bulunmuyor. Yalnızca yukarıdaki hesap ve mağaza kayıtları gösterilir; kayıtta olmayan bilgi uydurulmaz.
            </p>
          </Panel>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-2">
              {content.sections.map((section) => (
                <Panel key={section.id} aria-labelledby={`section-${section.id}`} className={section.id === "store" || section.id === "shipping" ? "lg:col-span-2" : ""}>
                  <PanelHeader id={`section-${section.id}`} title={section.title} />
                  <InfoList rows={section.rows} />
                </Panel>
              ))}
            </div>
            <p className="flex items-start gap-2.5 rounded-xl border border-line bg-white px-4 py-3 text-xs leading-relaxed text-navy-600">
              <ShieldCheck size={15} className="mt-0.5 shrink-0 text-royal-600" aria-hidden />
              Veri minimizasyonu (KVKK) gereği {NOT_STORED_FIELDS.join(", ")} veritabanına kaydedilmez; bu bilgiler bu ekranda gösterilemez. IBAN yalnızca son 4 haneyle maskeli saklanır.
            </p>
          </>
        )}

        <Panel aria-labelledby="documents-title">
          <PanelHeader
            id="documents-title"
            title="Belgeler"
            subtitle={`${checklist.uploadedRequiredCount}/${checklist.requiredCount} zorunlu belge yüklendi. Belgeler özel depolamadadır; her açışta kısa ömürlü (60 sn) bir bağlantı üretilir.`}
            action={<StatusBadge tone={checklist.complete ? "success" : "warning"}>{checklist.complete ? "Belgeler tam" : `${checklist.missingLabels.length} belge eksik`}</StatusBadge>}
          />
          {!checklist.complete && (
            <p role="status" className="mb-4 flex items-start gap-2.5 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                Eksik belge: {checklist.missingLabels.join(", ")}.{" "}
                {app.status === "pending" ? "Satıcı bu belgeleri başvuru durumu sayfasından yükleyebilir." : ""}
                {checklist.uploadedRequiredCount === 0 && content.declaredDocuments.length > 0 ? " Başvuru formunda yalnızca dosya adı beyan edilmiş; dosyalar sunucuya yüklenmemiş (belge yükleme özelliğinden önceki başvuru)." : ""}
              </span>
            </p>
          )}
          <DocumentChecklistList
            items={checklist.items}
            getUrl={(id, mode) => admin.getDocumentUrl(id, mode)}
            renderExtra={(item) => {
              const declared = declaredByKey.get(item.key);
              return !item.document && declared ? <p className="max-w-xs text-[11px] text-muted">Formda beyan edilen: {declared.name} ({formatFileSize(declared.size)}) — dosya yüklenmemiş</p> : null;
            }}
          />
        </Panel>

        {/* Karar bölümü bilinçli olarak sayfanın EN SONUNDA: yönetici önce bilgileri ve belgeleri görür. */}
        <Panel aria-labelledby="decision-title">
          <PanelHeader id="decision-title" title="Karar" subtitle={app.status === "pending" ? "Bilgileri ve belgeleri inceledikten sonra kararını ver. Karar geri alınamaz." : undefined} />
          {app.status === "pending" && (
            <>
              {!checklist.complete && <p className="mb-3 text-xs text-amber-700">Dikkat: {checklist.missingLabels.length} zorunlu belge eksik. Onaylamadan önce belgeleri kontrol et; eksik belge nedeniyle reddedebilirsin.</p>}
              <div className="flex flex-wrap gap-3">
                <ActionButton variant="primary" disabled={locked} onClick={() => { setMessage(null); setDialog("approve"); }}>Başvuruyu onayla</ActionButton>
                <ActionButton variant="danger" disabled={locked} onClick={() => { setMessage(null); setDialog("reject"); }}>Başvuruyu reddet</ActionButton>
              </div>
            </>
          )}
          {app.status === "approved" && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-navy-700">Bu başvuru onaylandı; mağaza satışa açık.{app.reviewedAt ? ` (${formatDateTime(app.reviewedAt)})` : ""}</p>
              <ActionButton variant="danger" disabled={locked} onClick={() => { setMessage(null); setDialog("suspend"); }}>Mağazayı askıya al</ActionButton>
            </div>
          )}
          {app.status === "suspended" && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-navy-700">Mağaza askıda; satış yapamıyor.</p>
              <ActionButton variant="primary" disabled={locked} onClick={() => { setMessage(null); setDialog("reactivate"); }}>Yeniden etkinleştir</ActionButton>
            </div>
          )}
          {app.status === "rejected" && <p className="text-sm text-navy-700">Bu başvuru reddedildi. Satıcı ret nedenini kendi hesabında görür; bilgilerini ve belgelerini güncelleyip yeniden başvurabilir.</p>}
        </Panel>
      </div>

      <Modal
        open={dialog !== null}
        onClose={close}
        size="sm"
        title={dialogTitle}
        description={app.storeName}
        footer={
          <>
            <ActionButton variant="secondary" disabled={busy} onClick={close}>Vazgeç</ActionButton>
            {dialog === "approve" && <ActionButton variant="primary" loading={busy} onClick={() => void run(() => admin.approveApplication(app.accountId), `${app.storeName} onaylandı; mağaza artık satışa açık.`)}>Evet, onayla</ActionButton>}
            {dialog === "reject" && <ActionButton variant="dangerSolid" loading={busy} disabled={!reasonValid} onClick={() => void run(() => admin.rejectApplication(app.accountId, reason), "Başvuru reddedildi; ret nedeni satıcıya gösterilecek.")}>Reddet</ActionButton>}
            {dialog === "suspend" && <ActionButton variant="dangerSolid" loading={busy} disabled={!reasonValid} onClick={() => void run(() => admin.suspend(app.accountId, reason), "Mağaza askıya alındı.")}>Askıya al</ActionButton>}
            {dialog === "reactivate" && <ActionButton variant="primary" loading={busy} onClick={() => void run(() => admin.reactivate(app.accountId), "Mağaza yeniden etkinleştirildi.")}>Evet, etkinleştir</ActionButton>}
          </>
        }
      >
        {dialog === "approve" && (
          <div className="space-y-2 text-sm text-navy-700">
            <p><strong>{app.storeName}</strong> başvurusu onaylanacak: mağaza satışa açılır ve hesap sahibi satıcı olur. Bu işlem geri alınamaz (yalnızca mağaza sonradan askıya alınabilir).</p>
            {!checklist.complete && <p className="rounded-lg bg-amber-50 p-3 text-amber-800">Eksik zorunlu belge: {checklist.missingLabels.join(", ")}. Yine de onaylamak istediğinden emin misin?</p>}
          </div>
        )}
        {dialog === "reject" && (
          <Field label="Red nedeni" required htmlFor="review-reason" hint={`Satıcıya gösterilir. En az ${MIN_REJECTION_REASON} karakter · ${reason.length}/${REASON_MAX}`}>
            <TextArea id="review-reason" value={reason} maxLength={REASON_MAX} onChange={(event) => setReason(event.target.value)} placeholder="Ör. Vergi levhası okunaksız; güncel tarihli bir belge yükleyin." />
          </Field>
        )}
        {dialog === "suspend" && (
          <Field label="Gerekçe (satıcıya gösterilir)" required htmlFor="review-reason" hint={`En az ${MIN_REJECTION_REASON} karakter · ${reason.length}/${REASON_MAX}`}>
            <TextArea id="review-reason" value={reason} maxLength={REASON_MAX} onChange={(event) => setReason(event.target.value)} />
          </Field>
        )}
        {dialog === "reactivate" && <p className="text-sm text-navy-700">Mağaza yeniden satışa açılacak.</p>}
        {dialogError && <p role="alert" className="mt-3 text-sm text-rose-600">{dialogError}</p>}
      </Modal>
    </>
  );
}
