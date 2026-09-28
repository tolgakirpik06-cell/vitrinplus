"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="section-container py-16"><div className="rounded-2xl border border-navy-100 bg-white p-8 text-center">
    <h1 className="text-xl font-bold text-navy-900">Bilgiler şu anda yüklenemiyor</h1>
    <p className="mt-3 text-sm text-navy-500">Bağlantıyı kontrol edip yeniden deneyebilirsin.</p>
    <button onClick={reset} className="mt-5 rounded-full bg-brand-600 px-6 py-3 text-sm font-semibold text-white">Tekrar dene</button>
  </div></main>;
}
