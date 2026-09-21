/**
 * Soru listesi değişince (yanıt, gizleme) aynı sayfadaki diğer parçaların (ör. yan menü rozeti) haberdar olması için
 * hafif bir tarayıcı olayı. Yalnızca istemcide çalışır; sunucuda ve dinleyici yokken zararsızdır.
 */
export const QUESTIONS_CHANGED_EVENT = "vitrinplus:questions-changed";

export function notifyQuestionsChanged(): void {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(QUESTIONS_CHANGED_EVENT));
}
