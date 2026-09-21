import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

/**
 * Next.js 16 proxy (eski adıyla middleware). Supabase yapılandırılmamışsa hiçbir şey yapmadan geçer;
 * yapılandırılmışsa oturumu yeniler ve satıcı/yönetim rotalarını korur.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Statik dosyalar, görseller ve ikonlar hariç tüm sayfa istekleri.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
