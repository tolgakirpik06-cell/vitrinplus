import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createQuestionsRepository } from "@/lib/repositories/supabase/questions";
export async function PublicQuestions({ slug }: { slug: string }) {
  const client = await createSupabaseServerClient();
  const questions = client ? await createQuestionsRepository(client, { storeId: null }).listPublic(slug) : [];
  return <section id="soru-cevap" className="rounded-2xl border border-navy-100/80 bg-white p-5 sm:p-6">
    <h2 className="text-lg font-bold text-navy-900">Soru & Cevap</h2>
    {questions.length === 0 ? <p className="mt-4 text-sm text-navy-500">Henüz yanıtlanmış soru yok. Satıcıya Sor düğmesiyle sorunu iletebilirsin.</p> : questions.map(q => <div key={q.id} className="border-b border-navy-50 py-4 text-sm"><p className="font-semibold text-navy-800">{q.question}</p><p className="mt-2 text-navy-600">{q.answer}</p></div>)}
  </section>;
}
