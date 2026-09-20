"use client";

import { CheckCircle2, MessageCircle } from "lucide-react";
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
  const { user } = useDemo();
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

  function submit() {
    try {
      askQuestion({ sellerName, productSlug, productName, customerName: user?.name ?? "Misafir", question: text });
      setSent(true);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sorun gönderilemedi.");
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
              <ActionButton variant="primary" disabled={text.trim().length < 5} onClick={submit}>
                Soruyu Gönder
              </ActionButton>
            </>
          )
        }
      >
        {sent ? (
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-navy-700">
            <CheckCircle2 size={18} aria-hidden className="mt-0.5 shrink-0 text-emerald-600" />
            Sorun iletildi. Demo sürümünde soru bu tarayıcıya kaydedilir; gerçek bir bildirim ya da e-posta gönderilmez.
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
