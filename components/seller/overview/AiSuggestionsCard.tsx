"use client";

import { ChevronRight, Sparkles } from "lucide-react";
import { Panel, PanelHeader } from "@/components/dashboard/Panel";
import { aiSuggestions } from "@/lib/vitrin-ai";
import { useSellerWorkspace } from "@/components/seller/SellerWorkspace";

/** Vitrin AI demo önerileri: tıklayınca Vitrin AI panelini o soruyla açar. */
export function AiSuggestionsCard() {
  const { ai } = useSellerWorkspace();
  return (
    <Panel aria-label="Vitrin AI önerileri">
      <PanelHeader
        title={
          <span className="flex items-center gap-1.5">
            <Sparkles size={15} aria-hidden className="text-royal-500" /> Vitrin AI
          </span>
        }
        subtitle="Sana özel öneriler · Demo"
      />
      <ul className="flex flex-col gap-1.5">
        {aiSuggestions
          .filter((suggestion) => suggestion.scope === "genel")
          .map((suggestion) => (
            <li key={suggestion.intent}>
              <button
                type="button"
                onClick={() => ai.openAi(suggestion.label)}
                className="group flex w-full items-center gap-2 rounded-lg border border-line bg-white px-3 py-2.5 text-left text-[12.5px] font-medium text-navy-700 transition-colors hover:border-royal-200 hover:bg-royal-50/50 focus-visible:outline-2 focus-visible:outline-royal-500"
              >
                <span className="min-w-0 flex-1">{suggestion.label}</span>
                <ChevronRight size={14} aria-hidden className="shrink-0 text-navy-200 group-hover:text-royal-500" />
              </button>
            </li>
          ))}
      </ul>
    </Panel>
  );
}
