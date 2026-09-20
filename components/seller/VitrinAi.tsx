"use client";

import Link from "next/link";
import { ArrowRight, Send, Sparkles, X } from "lucide-react";
import { useId, useRef, useState, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { answerIntent, aiSuggestions, matchIntent, type AiAnswer, type AiContext } from "@/lib/vitrin-ai";
import { useDialog } from "@/components/dashboard/useDialog";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";

/** Kenar çubuğu altındaki Vitrin AI tanıtım kartı (referans 08 / 12). */
export function VitrinAiPromoCard() {
  const { ai } = useSellerWorkspace();
  return (
    <div className="rounded-2xl border border-royal-500/30 bg-gradient-to-br from-royal-700/60 via-royal-800/50 to-brand-800/50 p-3.5">
      <div className="flex items-center gap-2">
        <Sparkles size={16} aria-hidden className="text-royal-200" />
        <span className="text-[15px] font-bold text-white">Vitrin AI</span>
        <span className="rounded-md bg-royal-500/80 px-1.5 py-0.5 text-[10px] font-bold text-white">Yeni</span>
      </div>
      <p className="mt-2 text-[12px] leading-snug text-navy-100">Satışlarını artırmak için akıllı öneriler ve analizler.</p>
      <button
        type="button"
        onClick={() => ai.openAi()}
        className="mt-3 h-8 w-full rounded-lg bg-white text-[12px] font-bold text-royal-700 transition-colors hover:bg-royal-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-300"
      >
        Şimdi Keşfet
      </button>
    </div>
  );
}

type Turn = { id: number; question: string; answer: AiAnswer | null };

function AnswerView({ answer, onNavigate }: { answer: AiAnswer; onNavigate: () => void }) {
  return (
    <div className="space-y-2.5">
      <p className="text-[13px] font-bold text-navy-900">{answer.title}</p>
      {answer.lines.map((line) => (
        <p key={line} className="text-[12.5px] leading-relaxed text-navy-600">
          {line}
        </p>
      ))}
      {answer.items?.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
          {answer.items.map((item) => (
            <li key={`${item.label}-${item.href}`}>
              <Link href={item.href} onClick={onNavigate} className="flex items-center gap-2 px-3 py-2 hover:bg-royal-50/60 focus-visible:outline-2 focus-visible:outline-royal-500">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12.5px] font-semibold text-navy-800">{item.label}</span>
                  <span className="block truncate text-[11.5px] text-muted">{item.detail}</span>
                </span>
                <ArrowRight size={13} aria-hidden className="shrink-0 text-navy-300" />
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
      {answer.action ? (
        <Link href={answer.action.href} onClick={onNavigate} className="inline-flex items-center gap-1 text-[12px] font-bold text-royal-600 hover:text-royal-800">
          {answer.action.label} <ArrowRight size={13} aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

function PanelBody({ initialPrompt, onClose }: { initialPrompt: string | null; onClose: () => void }) {
  const { rows, stockRows, products, now, shop } = useSellerWorkspace();
  const context: AiContext = { rows, stockRows, products, now, preparationDays: shop.shipping.preparationDays };
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const counter = useRef(initialPrompt ? 1 : 0);
  const [draft, setDraft] = useState("");

  function makeTurn(question: string): Turn {
    counter.current += 1;
    const intent = matchIntent(question);
    return { id: counter.current, question, answer: intent ? answerIntent(intent, context) : null };
  }

  const [thread, setThread] = useState<Turn[]>(() => {
    if (!initialPrompt) return [];
    const intent = matchIntent(initialPrompt);
    return [{ id: 1, question: initialPrompt, answer: intent ? answerIntent(intent, context) : null }];
  });

  useDialog(true, ref, onClose, { trap: true });

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setThread((previous) => [...previous, makeTurn(trimmed)]);
    setDraft("");
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    ask(draft);
  }

  return (
    <div className="fixed inset-0 z-[70]">
      <div aria-hidden onClick={onClose} className="absolute inset-0 animate-fade-in bg-sidebar/50" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-[420px] animate-drawer-in flex-col bg-white shadow-drawer outline-none"
      >
        <div className="flex items-start gap-3 bg-gradient-to-br from-sidebar via-royal-900 to-royal-700 px-5 py-4 text-white">
          <span aria-hidden className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <Sparkles size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[16px] font-extrabold">
              Vitrin AI
            </h2>
            <p className="text-[12px] text-royal-100">Mağaza verinden akıllı öneriler · Demo</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Vitrin AI panelini kapat" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white">
            <X size={17} aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-canvas px-5 py-4" aria-live="polite">
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] leading-relaxed text-amber-900">
            Bu bir demo asistanıdır; gerçek bir yapay zekâ servisine bağlı değil. Yanıtlar bu tarayıcıdaki mağaza verinden hesaplanır.
          </p>

          {thread.length === 0 ? <p className="text-[13px] text-navy-600">Merhaba! Şunlardan birini sorabilirsin:</p> : null}

          {thread.map((turn) => (
            <div key={turn.id} className="space-y-2">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-royal-600 px-3.5 py-2 text-[12.5px] font-medium text-white">{turn.question}</p>
              <div className="max-w-[95%] rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-3 shadow-panel">
                {turn.answer ? (
                  <AnswerView answer={turn.answer} onNavigate={onClose} />
                ) : (
                  <p className="text-[12.5px] leading-relaxed text-navy-600">Bu soruyu demo sürümünde yanıtlayamıyorum. Aşağıdaki hazır sorulardan birini deneyebilirsin.</p>
                )}
              </div>
            </div>
          ))}

          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-navy-300">Önerilen sorular</p>
            <div className="flex flex-wrap gap-2">
              {aiSuggestions.map((suggestion) => (
                <button
                  key={suggestion.intent}
                  type="button"
                  onClick={() => ask(suggestion.label)}
                  className="rounded-full border border-royal-200 bg-white px-3 py-1.5 text-left text-[12px] font-medium text-royal-700 transition-colors hover:border-royal-400 hover:bg-royal-50 focus-visible:outline-2 focus-visible:outline-royal-500"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <form onSubmit={submit} className="flex items-center gap-2 border-t border-line bg-white px-4 py-3">
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Mağazan hakkında bir şey sor…"
            aria-label="Vitrin AI'a soru yaz"
            className="h-10 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-[13px] placeholder:text-navy-300 focus-visible:border-royal-400 focus-visible:bg-white focus-visible:outline-2 focus-visible:outline-royal-200"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label="Soruyu gönder"
            className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-royal-600 text-white transition-colors hover:bg-royal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-royal-500", "disabled:cursor-not-allowed disabled:bg-navy-100 disabled:text-navy-300")}
          >
            <Send size={16} aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}

/** Vitrin AI çekmecesi. Yalnızca açıkken bağlanır; her açılışta sohbet sıfırlanır. */
export function VitrinAiPanel() {
  const { ai } = useSellerWorkspace();
  if (!ai.open) return null;
  return <PanelBody key={ai.nonce} initialPrompt={ai.prompt} onClose={ai.closeAi} />;
}
