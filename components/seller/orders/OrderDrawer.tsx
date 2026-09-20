"use client";

import { Copy, CreditCard, Download, FileText, Mail, MapPin, MessageSquare, Phone, Truck, UserRound } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { DetailDrawer } from "@/components/dashboard/DetailDrawer";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { ConfirmModal, Modal } from "@/components/dashboard/Modal";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Tabs } from "@/components/dashboard/Tabs";
import { useToast } from "@/components/dashboard/Toast";
import { ActionButton, Field, SelectInput, TextArea, TextInput, linkButtonClass } from "@/components/dashboard/form";
import { OrderStatusBadge } from "@/components/seller/OrderStatusBadge";
import { ProductThumb } from "@/components/seller/ProductThumb";
import { OrderTimeline } from "@/components/seller/orders/OrderTimeline";
import type { OrderActions } from "@/components/seller/orders/useOrderActions";
import { cn } from "@/lib/utils";
import { downloadTextFile } from "@/lib/csv";
import { formatDateTime, formatPercent, formatSignedTL, formatTL } from "@/lib/format";
import { buildTimeline, hasAddressProblem, type SellerOrderRow } from "@/lib/seller-analytics";
import { CARRIERS, isWaiting } from "@/lib/seller-orders";

type Tab = "detay" | "kargo" | "fatura" | "notlar";
type Draft = { carrier?: string; tracking?: string; notes?: string };

function SectionTitle({ children }: { children: ReactNode }) {
  return <h3 className="mb-2 text-[13px] font-extrabold text-navy-900">{children}</h3>;
}

function InfoRow({ icon: Icon, children, aside }: { icon: typeof UserRound; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
      <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-500">
        <Icon size={17} />
      </span>
      <div className="min-w-0 flex-1 text-[12.5px] leading-snug text-navy-700">{children}</div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

function MessageModal({ open, onClose, name, onSend }: { open: boolean; onClose: () => void; name: string; onSend: (text: string) => boolean }) {
  const [text, setText] = useState("");
  const id = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Müşteriye Mesaj Gönder"
      description={`${name} için mesaj yaz. Demo sürümünde mesaj yalnızca sipariş kaydına eklenir; müşteriye gerçek bildirim gitmez.`}
      size="sm"
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>
            Vazgeç
          </ActionButton>
          <ActionButton
            variant="primary"
            disabled={!text.trim()}
            onClick={() => {
              if (onSend(text)) {
                setText("");
                onClose();
              }
            }}
          >
            Gönder (Demo)
          </ActionButton>
        </>
      }
    >
      <Field label="Mesajın" htmlFor={id} hint={`${text.length}/500`}>
        <TextArea id={id} value={text} maxLength={500} onChange={(event) => setText(event.target.value)} placeholder="Siparişin kargoya verildi, en kısa sürede elinde olacak…" />
      </Field>
    </Modal>
  );
}

function invoiceText(row: SellerOrderRow): string {
  const lines = row.items.map((item) => `${item.name}${item.variantLabel ? ` (${item.variantLabel})` : ""}  ${item.quantity} x ${formatTL(item.price)} = ${formatTL(item.price * item.quantity)}`);
  return [
    "VitrinPlus — DEMO FATURA (yasal geçerliliği yoktur)",
    `Fatura No: ${row.meta.invoiceNo ?? "-"}`,
    `Tarih: ${row.meta.invoiceAt ? formatDateTime(row.meta.invoiceAt) : "-"}`,
    `Sipariş: ${row.order.id}`,
    `Müşteri: ${row.customer.name}`,
    `Fatura Adresi: ${row.order.billingAddress}`,
    "",
    ...lines,
    "",
    `Toplam: ${formatTL(row.amount)}`,
  ].join("\n");
}

function OrderDrawerContent({
  row,
  onClose,
  actions,
  images,
  onPrintLabels,
}: {
  row: SellerOrderRow;
  onClose: () => void;
  actions: OrderActions;
  images: ReadonlyMap<string, string | undefined>;
  onPrintLabels: (ids: string[]) => void;
}) {
  const toast = useToast();
  const carrierId = useId();
  const trackingId = useId();
  const notesId = useId();
  const [tab, setTab] = useState<Tab>("detay");
  const [draft, setDraft] = useState<Draft>({});
  const [cancelOpen, setCancelOpen] = useState(false);
  const [messageOpen, setMessageOpen] = useState(false);

  const id = row.order.id;
  const carrier = draft.carrier ?? row.carrier;
  const tracking = draft.tracking ?? row.meta.tracking ?? "";
  const notes = draft.notes ?? row.meta.notes ?? "";
  const dirty = draft.carrier !== undefined || draft.tracking !== undefined || draft.notes !== undefined;
  const waiting = isWaiting(row);
  const canManage = row.manageable;
  const cancelled = row.ui === "iptal";
  const carrierOptions = CARRIERS.includes(carrier as (typeof CARRIERS)[number]) ? [...CARRIERS] : [carrier, ...CARRIERS];

  const profit = row.estimatedProfit;
  const cost = profit === null ? null : row.amount - profit;
  const margin = profit !== null && row.amount > 0 ? (profit / row.amount) * 100 : null;
  const addressProblem = hasAddressProblem(row);

  async function copyId() {
    try {
      await navigator.clipboard.writeText(id);
      toast.success("Sipariş numarası kopyalandı.");
    } catch {
      toast.error("Panoya kopyalanamadı.");
    }
  }

  function save() {
    if (actions.saveDetails(id, { carrier, tracking, notes })) setDraft({});
  }

  function ship() {
    if (actions.ship([id], { carrier, tracking }).done > 0) setDraft({});
  }

  const shipButton = (
    <ActionButton variant="primary" className="w-full !bg-royal-600" disabled={!waiting || !canManage} onClick={ship}>
      <Truck size={15} aria-hidden /> Kargoya Ver
    </ActionButton>
  );

  return (
    <>
      <DetailDrawer
        open
        onClose={onClose}
        label={`Sipariş ${id} detayı`}
        header={
          <div>
            <div className="flex items-center gap-2">
              <p className="truncate text-[20px] font-extrabold tracking-tight text-navy-900">#{id}</p>
              <button type="button" onClick={copyId} aria-label="Sipariş numarasını kopyala" className="flex h-7 w-7 items-center justify-center rounded-md text-navy-400 hover:bg-navy-50 hover:text-navy-700 focus-visible:outline-2 focus-visible:outline-royal-500">
                <Copy size={14} aria-hidden />
              </button>
            </div>
            <div className="mt-2 flex items-end justify-between gap-2">
              <div>
                <p className="text-[11px] text-muted">Sipariş Tarihi</p>
                <p className="text-[12.5px] font-semibold text-navy-800">{formatDateTime(row.order.createdAt)}</p>
              </div>
              <OrderStatusBadge status={row.ui} />
            </div>
          </div>
        }
        footer={
          <>
            {row.meta.invoiceNo ? (
              <ActionButton variant="secondary" onClick={() => setTab("fatura")}>
                <FileText size={14} aria-hidden /> Faturayı Görüntüle
              </ActionButton>
            ) : (
              <ActionButton variant="secondary" className="!border-royal-300 !text-royal-700" disabled={cancelled} onClick={() => actions.createInvoice(id)}>
                <FileText size={14} aria-hidden /> Faturayı Oluştur
              </ActionButton>
            )}
            <ActionButton variant="danger" disabled={!waiting || !canManage} onClick={() => setCancelOpen(true)}>
              Siparişi İptal Et
            </ActionButton>
            <ActionButton variant="primary" className="ml-auto" disabled={!dirty} onClick={save}>
              Kaydet
            </ActionButton>
          </>
        }
      >
        <div className="space-y-5">
          <Tabs
            variant="underline"
            label="Sipariş bölümleri"
            value={tab}
            onChange={setTab}
            items={[
              { key: "detay", label: "Detaylar" },
              { key: "kargo", label: "Kargo" },
              { key: "fatura", label: "Fatura" },
              { key: "notlar", label: "Notlar" },
            ]}
          />

          {!canManage ? (
            <p role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              Bu sipariş başka satıcıların ürünlerini de içeriyor; durum değişikliği yalnızca sipariş yönetimi tarafından yapılabilir.
            </p>
          ) : null}

          {tab === "detay" ? (
            <>
              <section aria-label="Ürün bilgileri">
                <SectionTitle>Ürün Bilgileri</SectionTitle>
                <ul className="space-y-2">
                  {row.items.map((item) => (
                    <li key={`${item.slug}-${item.variantLabel ?? ""}`} className="flex items-center gap-3 rounded-xl border border-line bg-white p-2.5">
                      <ProductThumb name={item.name} image={images.get(item.slug)} size={52} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-semibold text-navy-900">{item.name}</p>
                        {item.variantLabel ? <p className="truncate text-xs text-muted">{item.variantLabel}</p> : null}
                        <p className="text-xs text-muted">{item.quantity} adet</p>
                      </div>
                      <p className="shrink-0 text-[13px] font-bold tabular-nums text-navy-900">{formatTL(item.price * item.quantity)}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-label="Müşteri bilgileri">
                <SectionTitle>Müşteri Bilgileri</SectionTitle>
                <InfoRow
                  icon={UserRound}
                  aside={
                    <ActionButton size="sm" variant="secondary" className="!border-royal-300 !text-royal-700" onClick={() => setMessageOpen(true)}>
                      <MessageSquare size={13} aria-hidden /> Mesaj Gönder
                    </ActionButton>
                  }
                >
                  <p className="text-[13px] font-semibold text-navy-900">{row.customer.name}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted">
                    <Phone size={11} aria-hidden /> {row.customer.phone ?? "Telefon paylaşılmadı"}
                  </p>
                  <p className="flex items-center gap-1 break-all text-xs text-muted">
                    <Mail size={11} aria-hidden /> {row.customer.email ?? "E-posta paylaşılmadı"}
                  </p>
                </InfoRow>
              </section>

              <section aria-label="Teslimat adresi">
                <SectionTitle>Teslimat Adresi</SectionTitle>
                <InfoRow
                  icon={MapPin}
                  aside={
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.order.address)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={linkButtonClass("secondary", "sm")}
                    >
                      Haritada Gör
                    </a>
                  }
                >
                  <p>{row.order.address}</p>
                  {addressProblem ? <p className="mt-1 text-xs font-semibold text-amber-700">Adres bilgisi eksik görünüyor. Müşteriyle iletişime geç.</p> : null}
                </InfoRow>
              </section>

              <section aria-label="Ödeme bilgileri">
                <SectionTitle>Ödeme Bilgileri</SectionTitle>
                <InfoRow icon={CreditCard} aside={<StatusBadge tone={cancelled ? "neutral" : "success"}>{cancelled ? "İptal Edildi" : "Ödeme Alındı"}</StatusBadge>}>
                  <p className="font-semibold text-navy-900">{row.paymentMethod}</p>
                  <p className="text-xs text-muted">{formatTL(row.amount)}</p>
                </InfoRow>
              </section>

              <section aria-label="Kargo bilgileri">
                <SectionTitle>Kargo Bilgileri</SectionTitle>
                <div className="space-y-3 rounded-xl border border-line bg-white p-3">
                  <Field label="Kargo Firması Seç" htmlFor={carrierId}>
                    <SelectInput id={carrierId} value={carrier} disabled={cancelled} onChange={(event) => setDraft((previous) => ({ ...previous, carrier: event.target.value }))}>
                      {carrierOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Takip Numarası" htmlFor={trackingId} hint="Boş bırakırsan kargoya verirken demo takip numarası üretilir.">
                    <TextInput id={trackingId} value={tracking} disabled={cancelled} placeholder="Takip numarası girin…" onChange={(event) => setDraft((previous) => ({ ...previous, tracking: event.target.value }))} />
                  </Field>
                  {shipButton}
                </div>
              </section>

              <section aria-label="Kârlılık bilgisi">
                <SectionTitle>Kârlılık Bilgisi</SectionTitle>
                {profit === null ? (
                  <p className="rounded-xl border border-dashed border-line bg-navy-50/50 px-3 py-2.5 text-xs leading-relaxed text-muted">Bu siparişteki ürünlerin maliyeti girilmediği için kâr hesaplanamıyor. Ürün düzenleme ekranından maliyet ekleyebilirsin.</p>
                ) : (
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-line bg-white p-3.5 text-[12px]">
                    <div>
                      <dt className="text-muted">Satış Fiyatı</dt>
                      <dd className="mt-0.5 text-[15px] font-extrabold tabular-nums text-navy-900">{formatTL(row.amount)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Toplam Maliyet</dt>
                      <dd className="mt-0.5 text-[15px] font-extrabold tabular-nums text-rose-600">{cost === null ? "—" : formatTL(cost)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Kâr Marjı</dt>
                      <dd className="mt-0.5 text-[15px] font-extrabold tabular-nums text-navy-900">{margin === null ? "—" : formatPercent(margin)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Tahmini Kâr</dt>
                      <dd className={cn("mt-0.5 text-[18px] font-extrabold tabular-nums", profit >= 0 ? "text-emerald-600" : "text-rose-600")}>{formatSignedTL(profit)}</dd>
                    </div>
                  </dl>
                )}
              </section>

              <section aria-label="Sipariş zaman çizelgesi">
                <SectionTitle>Sipariş Zaman Çizelgesi</SectionTitle>
                {cancelled ? <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Bu sipariş iptal edildi; ürün stokları geri yüklendi.</p> : null}
                <OrderTimeline steps={buildTimeline(row)} />
              </section>
            </>
          ) : null}

          {tab === "kargo" ? (
            <section aria-label="Kargo işlemleri" className="space-y-4">
              <div className="rounded-xl border border-line bg-white p-3.5">
                <dl className="grid grid-cols-2 gap-3 text-[12px]">
                  <div>
                    <dt className="text-muted">Kargo Firması</dt>
                    <dd className="mt-0.5 text-[13px] font-bold text-navy-900">{row.carrier}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Takip No</dt>
                    <dd className="mt-0.5 break-all font-mono text-[13px] font-bold text-navy-900">{row.meta.tracking ?? "—"}</dd>
                  </div>
                </dl>
              </div>

              <ol className="space-y-2 text-[13px]" aria-label="Kargo adımları">
                {[
                  { label: "Sipariş hazırlandı", done: row.ui !== "yeni" && !cancelled },
                  { label: "Kargo etiketi oluşturuldu", done: row.meta.labelCreated === true },
                  { label: "Etiket yazdırıldı", done: row.meta.labelPrinted === true },
                  { label: "Kargoya verildi", done: row.ui === "kargoda" || row.ui === "teslim-edildi" },
                  { label: "Teslim edildi", done: row.ui === "teslim-edildi" },
                ].map((step) => (
                  <li key={step.label} className="flex items-center gap-2.5">
                    <span aria-hidden className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold", step.done ? "bg-emerald-500 text-white" : "border-2 border-navy-200 text-transparent")}>
                      ✓
                    </span>
                    <span className={step.done ? "font-semibold text-navy-800" : "text-muted"}>{step.label}</span>
                    <span className="sr-only">{step.done ? "Tamamlandı" : "Bekliyor"}</span>
                  </li>
                ))}
              </ol>

              <div className="flex flex-col gap-2">
                {row.ui === "yeni" ? (
                  <ActionButton variant="primary" disabled={!canManage} onClick={() => actions.prepare([id])}>
                    Siparişi Hazırla
                  </ActionButton>
                ) : null}
                {row.ui === "hazirlaniyor" && !row.meta.labelCreated ? (
                  <ActionButton variant="primary" disabled={!canManage} onClick={() => actions.createLabels([id])}>
                    Kargo Etiketi Oluştur
                  </ActionButton>
                ) : null}
                {row.ui === "hazirlaniyor" && row.meta.labelCreated && !row.meta.labelPrinted ? (
                  <ActionButton variant="primary" onClick={() => onPrintLabels([id])}>
                    Etiketi Yazdır
                  </ActionButton>
                ) : null}
                {row.meta.labelCreated && row.meta.labelPrinted && waiting ? <ActionButton variant="secondary" onClick={() => onPrintLabels([id])}>Etiketi Tekrar Görüntüle</ActionButton> : null}
                {waiting ? shipButton : null}
                {row.ui === "kargoda" && !row.meta.outForDelivery ? (
                  <ActionButton variant="secondary" disabled={!canManage} onClick={() => actions.outForDelivery([id])}>
                    Dağıtıma Çıktı Olarak İşaretle
                  </ActionButton>
                ) : null}
                {row.ui === "kargoda" ? (
                  <ActionButton variant="primary" disabled={!canManage} onClick={() => actions.deliver([id])}>
                    Teslim Edildi Olarak İşaretle
                  </ActionButton>
                ) : null}
              </div>
              <p className="text-[11.5px] leading-relaxed text-muted">Demo sürümünde kargo firması entegrasyonu bağlı değildir; adımlar burada elle işaretlenir.</p>
            </section>
          ) : null}

          {tab === "fatura" ? (
            <section aria-label="Fatura">
              {row.meta.invoiceNo ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-line bg-white p-3.5">
                    <dl className="grid grid-cols-2 gap-3 text-[12px]">
                      <div>
                        <dt className="text-muted">Fatura No</dt>
                        <dd className="mt-0.5 break-all font-mono text-[13px] font-bold text-navy-900">{row.meta.invoiceNo}</dd>
                      </div>
                      <div>
                        <dt className="text-muted">Fatura Tarihi</dt>
                        <dd className="mt-0.5 text-[13px] font-bold text-navy-900">{row.meta.invoiceAt ? formatDateTime(row.meta.invoiceAt) : "—"}</dd>
                      </div>
                    </dl>
                    <ul className="mt-3 divide-y divide-line border-t border-line text-[12.5px]">
                      {row.items.map((item) => (
                        <li key={`${item.slug}-${item.variantLabel ?? ""}`} className="flex justify-between gap-3 py-2">
                          <span className="min-w-0 truncate text-navy-700">
                            {item.name} × {item.quantity}
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-navy-900">{formatTL(item.price * item.quantity)}</span>
                        </li>
                      ))}
                      <li className="flex justify-between gap-3 pt-2 text-[13px] font-extrabold text-navy-900">
                        <span>Toplam</span>
                        <span className="tabular-nums">{formatTL(row.amount)}</span>
                      </li>
                    </ul>
                  </div>
                  <ActionButton variant="secondary" onClick={() => downloadTextFile(`fatura-${row.meta.invoiceNo}.txt`, invoiceText(row), "text/plain;charset=utf-8")}>
                    <Download size={14} aria-hidden /> Demo Faturayı İndir
                  </ActionButton>
                  <p className="text-[11.5px] leading-relaxed text-muted">Bu belge demodur ve yasal geçerliliği yoktur; e-fatura entegrasyonu bağlı değildir.</p>
                </div>
              ) : (
                <EmptyState
                  compact
                  icon={FileText}
                  title="Bu sipariş için fatura yok"
                  description="Demo fatura oluşturabilirsin. Gerçek e-fatura entegrasyonu sonraki aşamada bağlanacak."
                  action={
                    <ActionButton variant="primary" disabled={cancelled} onClick={() => actions.createInvoice(id)}>
                      Faturayı Oluştur
                    </ActionButton>
                  }
                />
              )}
            </section>
          ) : null}

          {tab === "notlar" ? (
            <section aria-label="Notlar" className="space-y-4">
              <Field label="Satıcı Notu" htmlFor={notesId} hint="Yalnızca sen görürsün. Kaydetmek için alttaki Kaydet düğmesini kullan.">
                <TextArea id={notesId} value={notes} maxLength={600} placeholder="Örn. Hediye paketi istendi, öğleden sonra teslim edilecek…" onChange={(event) => setDraft((previous) => ({ ...previous, notes: event.target.value }))} />
              </Field>
              <div>
                <SectionTitle>Müşteri Mesajları (Demo)</SectionTitle>
                {row.meta.messages?.length ? (
                  <ul className="space-y-2">
                    {row.meta.messages.map((message) => (
                      <li key={message.at} className="rounded-xl border border-line bg-navy-50/50 px-3 py-2">
                        <p className="text-[12.5px] text-navy-800">{message.text}</p>
                        <p className="mt-1 text-[11px] text-muted">{formatDateTime(message.at)}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">Henüz mesaj gönderilmedi.</p>
                )}
                <ActionButton size="sm" variant="secondary" className="mt-3" onClick={() => setMessageOpen(true)}>
                  <MessageSquare size={13} aria-hidden /> Yeni Mesaj
                </ActionButton>
              </div>
            </section>
          ) : null}
        </div>
      </DetailDrawer>

      <MessageModal open={messageOpen} onClose={() => setMessageOpen(false)} name={row.customer.name} onSend={(text) => actions.sendMessage(id, text)} />
      <ConfirmModal
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Sipariş iptal edilsin mi?"
        confirmLabel="Siparişi İptal Et"
        description={
          <>
            <strong>#{id}</strong> siparişi iptal edilir ve ürün stokları geri yüklenir. Bu işlem geri alınamaz.
          </>
        }
        onConfirm={() => {
          actions.cancel([id]);
          setCancelOpen(false);
        }}
      />
    </>
  );
}

/** Sağ sipariş çekmecesi (referans 13). Sipariş değişince içerik sıfırlanır. */
export function OrderDrawer(props: {
  row: SellerOrderRow | null;
  onClose: () => void;
  actions: OrderActions;
  images: ReadonlyMap<string, string | undefined>;
  onPrintLabels: (ids: string[]) => void;
}) {
  const { row, ...rest } = props;
  if (!row) return null;
  return <OrderDrawerContent key={row.order.id} row={row} {...rest} />;
}
