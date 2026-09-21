import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";
import { MarketplaceError } from "@/lib/domain/errors";

export type Client = SupabaseClient;

type Result = { data: unknown; error: PostgrestError | null };

/** Sorgu sonucunu açar; hata varsa fırlatır (üst katman `friendlyError` ile kullanıcıya çevirir). */
export function unwrap(result: Result): unknown {
  if (result.error) throw result.error;
  return result.data;
}

export function rows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}

export function first<T>(data: unknown): T | null {
  if (Array.isArray(data)) return (data[0] as T | undefined) ?? null;
  return data && typeof data === "object" ? (data as T) : null;
}

/** Sunucu fonksiyonu (RPC) çağrısı. Yetki ve iş kuralları veritabanında uygulanır. */
export async function callRpc(client: Client, fn: string, args: Record<string, unknown>): Promise<unknown> {
  return unwrap(await client.rpc(fn, args));
}

export function requireUserId(userId: string | null | undefined): string {
  if (!userId) throw new MarketplaceError("AUTH_REQUIRED", "Giriş yapmalısın.");
  return userId;
}

export function num(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** PostgREST `.in()` süzgeci için boş liste güvenli: boşsa sorgu hiç atılmaz. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

const PAGE = 1000;

/** PostgREST varsayılan üst sınırını (1000 satır) aşan tablolar için sayfa sayfa okur. */
export async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<Result>): Promise<T[]> {
  const all: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const page = rows<T>(unwrap(await build(from, from + PAGE - 1)));
    all.push(...page);
    if (page.length < PAGE) return all;
  }
}
