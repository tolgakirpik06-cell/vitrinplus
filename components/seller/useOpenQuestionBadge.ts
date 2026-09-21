"use client";

import { useCallback, useEffect, useState } from "react";
import { useMarketplace } from "@/components/marketplace/context";
import { QUESTIONS_CHANGED_EVENT } from "@/lib/question-events";
import { useAsync } from "@/lib/use-async";

/** Yan menüdeki "Müşteri Soruları" rozeti: gerçek modda bekleyen soru sayısı sunucudan, demo modda yerel kayıttan gelir. */
export function useOpenQuestionBadge(localCount: number): number {
  const { mode, services } = useMarketplace();
  const [tick, setTick] = useState(0);
  const load = useCallback(() => services.questions.listForStore(), [services]);
  const remote = useAsync(mode === "supabase" ? load : null, tick);

  // Sorular sayfasında yanıtlanan / gizlenen soru rozete anında yansısın.
  useEffect(() => {
    const onChanged = () => setTick((value) => value + 1);
    window.addEventListener(QUESTIONS_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(QUESTIONS_CHANGED_EVENT, onChanged);
  }, []);

  if (mode !== "supabase") return localCount;
  return remote.data ? remote.data.filter((item) => item.status === "pending").length : 0;
}
