import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAppRole, redirectTargetFor, isProtectedRoute, type AppRole } from "@/lib/auth/paths";
import { getPublicConfig } from "@/lib/supabase/env";

/**
 * Her istekte Supabase oturumunu yeniler (çerezleri günceller) ve korumalı rotalar için
 * DERİNLEMESİNE SAVUNMA kontrolü yapar:
 *  - /satici-panel/*  → giriş + seller/admin rolü
 *  - /yonetim/*       → giriş + admin rolü
 * Yetki asıl olarak RLS / RPC'lerde uygulanır; bu kontrol yalnızca yetkisiz kullanıcıya boş bir ekran
 * göstermemek ve gereksiz istekleri erken kesmek içindir.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const config = getPublicConfig();
  if (!config) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (items) => {
        for (const item of items) request.cookies.set(item.name, item.value);
        response = NextResponse.next({ request });
        for (const item of items) response.cookies.set(item.name, item.value, item.options);
      },
    },
  });

  // getUser() token'ı Supabase Auth sunucusuna doğrulatır (getSession yalnızca çerezi okur, güvenilmez).
  const { data } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  if (!isProtectedRoute(pathname)) return response;

  let role: AppRole | null = null;
  if (data.user) {
    const profile = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    const row: unknown = profile.data;
    const value = typeof row === "object" && row !== null ? (row as { role?: unknown }).role : null;
    role = isAppRole(value) ? value : null;
  }

  const target = redirectTargetFor(role, data.user !== null, pathname, request.nextUrl.search);
  if (!target) return response;
  const redirect = NextResponse.redirect(new URL(target, request.url));
  // Yenilenmiş oturum çerezleri yönlendirmeye de taşınır.
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie.name, cookie.value);
  return redirect;
}
