"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDemo } from "@/components/demo/DemoProvider";
export function AuthFormCard({ mode }: { mode: "giris" | "kayit" }) {
  const { login, ready } = useDemo();
  const router = useRouter();
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    try { login(String(data.get("email")), mode === "kayit" ? String(data.get("name")) : undefined); router.push("/hesabim"); }
    catch(e) { setError((e as Error).message); }
  }
  return <div className="mx-auto w-full max-w-md rounded-3xl border border-navy-100 bg-white p-8 shadow-card"><p className="text-xs font-bold uppercase tracking-wider text-brand-600">VitrinPlus Demo</p><h1 className="mt-3 text-2xl font-extrabold">{mode === "kayit" ? "Demo hesabını oluştur" : "Demo hesabına giriş yap"}</h1><p className="mt-3 text-sm leading-6 text-navy-500">Bu tarayıcıda saklanan, şifresiz bir deneme hesabıdır. Gerçek hesap veya e-posta doğrulaması yapılmaz. Örnek bir e-posta kullanabilirsin.</p><form onSubmit={submit} className="mt-6 space-y-4">{mode === "kayit" && <label className="block text-sm font-semibold">Ad Soyad<input name="name" required minLength={2} maxLength={80} autoComplete="name" className="mt-2 block w-full rounded-xl border border-navy-200 p-3" /></label>}<label className="block text-sm font-semibold">Demo e-posta<input name="email" required type="email" maxLength={150} placeholder="alici@example.com" autoComplete="email" className="mt-2 block w-full rounded-xl border border-navy-200 p-3" /></label>{error && <p role="alert" className="text-sm text-rose-600">{error}</p>}<button disabled={!ready} className="w-full rounded-xl bg-brand-500 p-3 font-semibold text-white disabled:opacity-50">{mode === "kayit" ? "Demo hesabı oluştur" : "Demo hesabına gir"}</button></form><p className="mt-5 text-center text-sm"><Link className="text-brand-600" href={mode === "kayit" ? "/giris" : "/kayit"}>{mode === "kayit" ? "Zaten hesabın var mı? Giriş yap" : "Yeni demo hesabı oluştur"}</Link></p></div>;
}
