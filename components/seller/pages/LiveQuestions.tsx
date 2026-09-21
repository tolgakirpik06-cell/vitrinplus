"use client";

import { MessageCircle, MessagesSquare } from "lucide-react";
import { useCallback, useId, useState } from "react";
import { EmptyState, LoadingState } from "@/components/dashboard/EmptyState";
import { Panel } from "@/components/dashboard/Panel";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { Tabs } from "@/components/dashboard/Tabs";
import { useToast } from "@/components/dashboard/Toast";
import { ActionButton, Field, TextArea } from "@/components/dashboard/form";
import { useMarketplace } from "@/components/marketplace/context";
import { friendlyError } from "@/lib/domain/errors";
import { notifyQuestionsChanged } from "@/lib/question-events";
import { formatDateTime } from "@/lib/format";
import { useAsync } from "@/lib/use-async";
import type { StoreQuestionView } from "@/lib/repositories/types";

function LiveQuestionCard({ item, onChanged }: { item: StoreQuestionView; onChanged: () => void }) {
  const { services } = useMarketplace();
  const toast = useToast();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const id = useId();
  const hidden = item.status === "hidden";

  async function run(action: () => Promise<void>, done: string) {
    setBusy(true);
    setError("");
    try {
      await action();
      toast.success(done);
      notifyQuestionsChanged();
      onChanged();
    } catch (caught) {
      setError(friendlyError(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="rounded-xl border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-navy-900">{item.askerDisplay}</p>
          <p className="text-xs text-muted">
            {item.productName} · {formatDateTime(item.createdAt)}
          </p>
        </div>
        <StatusBadge tone={hidden ? "neutral" : item.status === "pending" ? "warning" : "success"}>{hidden ? "Gizli" : item.status === "pending" ? "Yanıt bekliyor" : "Yanıtlandı"}</StatusBadge>
      </div>
      <p className="mt-2.5 text-[13px] leading-relaxed text-navy-800">{item.question}</p>
      {item.answer ? (
        <div className="mt-3 rounded-lg bg-royal-50/60 px-3 py-2.5">
          <p className="text-[11px] font-semibold text-royal-700">Yanıtın{item.answeredAt ? ` · ${formatDateTime(item.answeredAt)}` : ""}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-navy-800">{item.answer}</p>
        </div>
      ) : null}
      {item.status === "pending" ? (
        <div className="mt-3 space-y-2">
          <Field label="Yanıtın (ürün sayfasında herkese görünür)" htmlFor={id} error={error || undefined} hint={`${text.length}/1000`}>
            <TextArea id={id} value={text} maxLength={1000} invalid={Boolean(error)} className="min-h-20" onChange={(event) => { setText(event.target.value); setError(""); }} placeholder="Müşteriye yanıtını yaz…" />
          </Field>
        </div>
      ) : error ? (
        <p role="alert" className="mt-2 text-xs text-rose-600">{error}</p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        {item.status === "pending" && (
          <ActionButton variant="primary" size="sm" loading={busy} disabled={text.trim().length < 2} onClick={() => void run(() => services.questions.answer(item.id, text), "Yanıtın yayınlandı.")}>
            Yanıtla ve yayınla
          </ActionButton>
        )}
        <ActionButton variant="ghost" size="sm" disabled={busy} onClick={() => void run(() => services.questions.setHidden(item.id, !hidden), hidden ? "Soru yeniden yayına alındı." : "Soru gizlendi.")}>
          {hidden ? "Yayına al" : "Gizle"}
        </ActionButton>
      </div>
    </li>
  );
}

/** Gerçek mod: sorular veritabanından gelir; yanıtlanan soru ürün sayfasında herkese görünür, bekleyen / gizli sorular görünmez. */
export function LiveQuestions() {
  const { services } = useMarketplace();
  const load = useCallback(() => services.questions.listForStore(), [services]);
  const list = useAsync(load);
  const [tab, setTab] = useState<"pending" | "answered" | "hidden" | "all">("pending");
  const items = list.data ?? [];
  const count = (status: StoreQuestionView["status"]) => items.filter((item) => item.status === status).length;
  const shown = items.filter((item) => tab === "all" || item.status === tab);

  return (
    <Panel aria-label="Soru listesi">
      <div className="mb-4">
        <Tabs
          label="Soru durumu"
          value={tab}
          onChange={setTab}
          items={[
            { key: "pending", label: "Bekleyen", count: count("pending") },
            { key: "answered", label: "Yanıtlanan", count: count("answered") },
            { key: "hidden", label: "Gizli", count: count("hidden") },
            { key: "all", label: "Tümü", count: items.length },
          ]}
        />
      </div>
      {list.error ? (
        <EmptyState title="Sorular yüklenemedi" description={list.error} action={<ActionButton onClick={list.reload}>Tekrar dene</ActionButton>} />
      ) : list.loading && !list.data ? (
        <LoadingState label="Sorular yükleniyor…" />
      ) : shown.length === 0 ? (
        <EmptyState icon={items.length === 0 ? MessagesSquare : MessageCircle} title={items.length === 0 ? "Henüz müşteri sorusu yok" : "Bu görünümde soru yok"} description={items.length === 0 ? "Müşteriler ürün sayfasındaki “Satıcıya Sor” ile soru sorduğunda burada görünür." : undefined} />
      ) : (
        <ul className="space-y-3">
          {shown.map((item) => (
            <LiveQuestionCard key={item.id} item={item} onChanged={list.reload} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
