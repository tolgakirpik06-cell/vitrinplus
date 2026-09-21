import { MarketplaceError } from "@/lib/domain/errors";

/** Giriş yapmamış ziyaretçi için depo: her çağrı "giriş yapmalısın" hatasıyla reddedilir (veritabanına hiç gidilmez). */
export function guestRepository<T extends object>(): T {
  return new Proxy({}, {
    get(_target, name) {
      if (typeof name === "symbol" || name === "then") return undefined;
      return async () => {
        throw new MarketplaceError("AUTH_REQUIRED", "Bu işlem için giriş yapmalısın.");
      };
    },
  }) as T;
}
