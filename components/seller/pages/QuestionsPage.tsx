"use client";

import { MessageCircle, MessagesSquare } from "lucide-react";
import { useId, useState } from "react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Panel } from "@/components/dashboard/Panel";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Tabs } from "@/components/dashboard/Tabs";
import { useToast } from "@/components/dashboard/Toast";
import { ActionButton, Field, TextArea } from "@/components/dashboard/form";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";
import { formatDateTime } from "@/lib/format";
import { answerQuestion, useQuestions, type SellerQuestion } from "@/lib/questions";

function QuestionCard({ item }: { item: SellerQuestion }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const id = useId();

  function submit() {
    try {
      answerQuestion(item.id, text);
      toast.success("Yanıtın kaydedildi.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Yanıt kaydedilemedi.");
    }
  }

  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-navy-900">{item.customerName}</p>
          <p className="text-xs text-muted">
            {item.productName ? `${item.productName} · ` : ""}
            {formatDateTime(item.createdAt)}
          </p>
        </div>
        <StatusBadge tone={item.status === "bekliyor" ? "warning" : "success"}>{item.status === "bekliyor" ? "Yanıt bekliyor" : "Yanıtlandı"}</StatusBadge>
      </div>
      <p className="mt-2.5 text-[13px] leading-relaxed text-navy-800">{item.question}</p>
      {item.status === "yanitlandi" ? (
        <div className="mt-3 rounded-lg bg-royal-50/60 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-royal-700">Yanıtın{item.answeredAt ? ` · ${formatDateTime(item.answeredAt)}` : ""}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-navy-800">{item.answer}</p>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          <Field label="Yanıtın" htmlFor={id} error={error || undefined}>
            <TextArea
              id={id}
              value={text}
              maxLength={600}
              invalid={Boolean(error)}
              className="min-h-20"
              onChange={(event) => {
                setText(event.target.value);
                setError("");
              }}
              placeholder="Müşteriye yanıtını yaz…"
            />
          </Field>
          <ActionButton variant="primary" size="sm" disabled={text.trim().length < 2} onClick={submit}>
            Yanıtla
          </ActionButton>
        </div>
      )}
    </li>
  );
}

/**
 * Müşteri Soruları: ürün sayfasındaki "Satıcıya Sor" ile gelen sorular. Yanıtlama çalışır;
 * yanıtların ürün sayfasında yayınlanması ve bildirimler sonraki aşamadadır.
 */
export function QuestionsPage() {
  const { shop } = useSellerWorkspace();
  const items = useQuestions(shop.settings.storeName);
  const [tab, setTab] = useState<"bekliyor" | "yanitlandi" | "tumu">("bekliyor");
  const waiting = items.filter((item) => item.status === "bekliyor").length;
  const shown = items.filter((item) => tab === "tumu" || item.status === tab);

  return (
    <>
      <PageHeader title="Müşteri Soruları" description="Ürün sayfalarından gelen soruları yanıtla ve müşterilerini mutlu et." />
      <Panel aria-label="Soru listesi">
        <div className="mb-4">
          <Tabs
            label="Soru durumu"
            value={tab}
            onChange={setTab}
            items={[
              { key: "bekliyor", label: "Bekleyen", count: waiting },
              { key: "yanitlandi", label: "Yanıtlanan", count: items.length - waiting },
              { key: "tumu", label: "Tümü", count: items.length },
            ]}
          />
        </div>
        {shown.length === 0 ? (
          <EmptyState
            icon={items.length === 0 ? MessagesSquare : MessageCircle}
            title={items.length === 0 ? "Henüz müşteri sorusu yok" : "Bu görünümde soru yok"}
            description={items.length === 0 ? "Müşteriler ürün sayfasındaki “Satıcıya Sor” ile soru sorduğunda burada görünür. Paneli denemek için Ayarlar’dan örnek veri yükleyebilirsin." : undefined}
          />
        ) : (
          <ul className="space-y-3">
            {shown.map((item) => (
              <QuestionCard key={item.id} item={item} />
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
