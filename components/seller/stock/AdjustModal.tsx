"use client";

import { useId, useState } from "react";
import { Modal } from "@/components/dashboard/Modal";
import { Tabs } from "@/components/dashboard/Tabs";
import { ActionButton, Field, TextInput } from "@/components/dashboard/form";
import { adjustLabels, parseCount, type AdjustMode } from "@/lib/seller-stock";

const hints: Record<AdjustMode, string> = {
  add: "Girdiğin adet mevcut stoğa eklenir.",
  remove: "Girdiğin adet mevcut stoktan düşülür (en az 0).",
  set: "Stok tüm hedef ürünlerde bu değere ayarlanır.",
  threshold: "Stok bu adede ya da altına inince ürün “Kritik” olarak işaretlenir.",
};

/**
 * Stok / kritik seviye toplu işlem penceresi.
 * `immediate` doğruysa uygulanınca kaydedilir; değilse yalnızca tablodaki "yeni stok" alanlarına yazılır
 * ve “Değişiklikleri Kaydet” ile kalıcı hale gelir.
 */
export function AdjustModal({
  initialMode,
  modes,
  targetLabel,
  immediate,
  onClose,
  onApply,
}: {
  initialMode: AdjustMode;
  modes: AdjustMode[];
  targetLabel: string;
  immediate: boolean;
  onClose: () => void;
  onApply: (mode: AdjustMode, value: number) => void;
}) {
  const [mode, setMode] = useState<AdjustMode>(initialMode);
  const [text, setText] = useState("");
  const id = useId();
  const value = parseCount(text);
  const min = mode === "add" || mode === "remove" ? 1 : 0;
  const invalid = text !== "" && (value === null || value < min);
  const canApply = value !== null && value >= min;

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title="Toplu Stok Güncelle"
      description={`Hedef: ${targetLabel}. ${immediate ? "Uygulayınca değişiklik hemen kaydedilir." : "Değişiklik önce tabloya yazılır; “Değişiklikleri Kaydet” ile kalıcı olur."}`}
      footer={
        <>
          <ActionButton variant="secondary" onClick={onClose}>
            Vazgeç
          </ActionButton>
          <ActionButton variant="primary" disabled={!canApply} onClick={() => value !== null && onApply(mode, value)}>
            {immediate ? "Uygula ve Kaydet" : "Uygula"}
          </ActionButton>
        </>
      }
    >
      <div className="space-y-4">
        {modes.length > 1 ? <Tabs variant="segment" label="İşlem türü" value={mode} onChange={setMode} items={modes.map((key) => ({ key, label: adjustLabels[key] }))} /> : <p className="text-sm font-bold text-navy-900">{adjustLabels[mode]}</p>}
        <Field label={mode === "threshold" ? "Kritik seviye (adet)" : "Adet"} htmlFor={id} hint={hints[mode]} error={invalid ? (mode === "add" || mode === "remove" ? "1 veya daha büyük bir tam sayı gir." : "0 veya daha büyük bir tam sayı gir.") : undefined}>
          <TextInput
            id={id}
            autoFocus
            inputMode="numeric"
            value={text}
            invalid={invalid}
            placeholder="Örn. 20"
            onChange={(event) => setText(event.target.value.replace(/[^\d]/g, ""))}
            onKeyDown={(event) => {
              if (event.key === "Enter" && canApply && value !== null) onApply(mode, value);
            }}
          />
        </Field>
      </div>
    </Modal>
  );
}
