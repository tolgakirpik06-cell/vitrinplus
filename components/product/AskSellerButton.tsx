"use client";

import { CheckCircle2, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Modal } from "@/components/dashboard/Modal";
import { ActionButton, Field, TextArea } from "@/components/dashboard/form";
import { askQuestion } from "@/lib/questions";

/**
 * "Satıcıya Sor" (demo): soru bu tarayıcıda saklanır ve aynı tarayıcıdaki satıcı panelinin
 * "Müşteri Soruları" ekranına düşer. Gerçek bildirim / e-posta gönderilmez.
 */
export function AskSellerButton({ sellerName, productSlug, productName }: { sellerName: string; productSlug?: string; productName?: string }) {
  const { user, mode, services } = useDemo();
  const live = mode === "supabase";
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const fieldId = useId();

  function close() {
    setOpen(false);
    setSent(false);
    setError("");
    setText("");
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    try {
      if (live) {
        if (!productSlug) throw new Error("Bu ürün için soru gönderilemiyor.");
        await services.questions.ask(productSlug, text);
      } else {
        askQuestion({ sellerName, productSlug, productName, customerName: user?.name ?? "Misafir", question: text });
      }
      setSent(true);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sorun gönderilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ActionButton variant="ghost" size="sm" className="flex-1 !rounded-full !text-brand-700" onClick={() => setOpen(true)}>
        <MessageCircle size={14} aria-hidden /> Satıcıya Sor
      </ActionButton>
      <Modal
        open={open}
        onClose={close}
        size="sm"
        title={`${sellerName} mağazasına sor`}
        description={productName ? `Ürün: ${productName}` : undefined}
        footer={
          sent ? (
            <ActionButton variant="primary" onClick={close}>
              Tamam
            </ActionButton>
          ) : (
            <>
              <ActionButton variant="secondary" onClick={close}>
                Vazgeç
              </ActionButton>
              <ActionButton variant="primary" disabled={busy || text.trim().length < 5 || (live && !user)} onClick={() => void submit()}>
                {busy ? "Gönderiliyor…" : "Soruyu Gönder"}
              </ActionButton>
            </>
          )
        }
      >
        {sent ? (
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-navy-700">
            <CheckCircle2 size={18} aria-hidden className="mt-0.5 shrink-0 text-emerald-600" />
            {live ? "Sorun satıcıya iletildi. Satıcı yanıtladığında ürün sayfasında görünür." : "Sorun iletildi. Demo sürümünde soru bu tarayıcıya kaydedilir; gerçek bir bildirim ya da e-posta gönderilmez."}
          </p>
        ) : live && !user ? (
          <p className="text-[13px] leading-relaxed text-navy-700">
            Satıcıya soru sormak için giriş yapmalısın. <Link href={`/giris?next=${encodeURIComponent(productSlug ? `/urun/${productSlug}` : "/")}`} className="font-semibold text-brand-600">Giriş yap →</Link>
          </p>
        ) : (
          <Field label="Sorun" htmlFor={fieldId} error={error || undefined} hint={`${text.length}/500`}>
            <TextArea id={fieldId} value={text} maxLength={500} invalid={Boolean(error)} onChange={(event) => setText(event.target.value)} placeholder="Örn. Bu ürün hediye paketiyle gönderilebilir mi?" />
          </Field>
        )}
      </Modal>
    </>
  );
}
