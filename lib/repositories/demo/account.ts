"use client";

/**
 * Hesap deposu — demo (localStorage) uygulaması: telefon, bildirim tercihleri ve adresler kullanıcı kimliğine göre saklanır.
 * Favoriler Aşama 1'deki `vitrinplus-favorites` anahtarını kullanır (FavoritesProvider ile aynı veri).
 */
import { createLocalStore } from "@/lib/local-store";
import { STORAGE_KEYS } from "@/lib/storage-migration";
import { MAX_ADDRESSES, normalizeNotificationPrefs } from "@/lib/domain/account";
import { MarketplaceError } from "@/lib/domain/errors";
import { addFavoriteSlug, removeFavoriteSlug } from "@/lib/domain/favorites";
import type { AccountRepository, AddressInput, AddressView, ProfileView } from "@/lib/repositories/types";
import type { NotificationPrefs } from "@/types/database";

type StoredProfile = { phone: string; avatarUrl: string | null; notificationPrefs: NotificationPrefs; fullName?: string };
type DemoAccountState = { version: 1; profiles: Record<string, StoredProfile>; addresses: Record<string, AddressView[]> };

const initial: DemoAccountState = { version: 1, profiles: {}, addresses: {} };

function isAddress(value: unknown): value is AddressView {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === "string" && typeof item.title === "string" && typeof item.addressLine === "string" && typeof item.city === "string";
}

export const demoAccountStore = createLocalStore<DemoAccountState>({
  key: STORAGE_KEYS.demoAccount,
  initial,
  parse(raw) {
    if (typeof raw !== "object" || raw === null) return initial;
    const record = raw as Record<string, unknown>;
    if (record.version !== 1 || typeof record.profiles !== "object" || record.profiles === null || typeof record.addresses !== "object" || record.addresses === null) return initial;
    const addresses: Record<string, AddressView[]> = {};
    for (const [key, list] of Object.entries(record.addresses as Record<string, unknown>)) addresses[key] = Array.isArray(list) ? list.filter(isAddress) : [];
    const profiles: Record<string, StoredProfile> = {};
    for (const [key, value] of Object.entries(record.profiles as Record<string, unknown>)) {
      if (typeof value !== "object" || value === null) continue;
      const stored = value as Record<string, unknown>;
      profiles[key] = { phone: typeof stored.phone === "string" ? stored.phone : "", avatarUrl: typeof stored.avatarUrl === "string" ? stored.avatarUrl : null, notificationPrefs: normalizeNotificationPrefs(stored.notificationPrefs), ...(typeof stored.fullName === "string" ? { fullName: stored.fullName } : {}) };
    }
    return { version: 1, profiles, addresses };
  },
});

function readFavorites(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEYS.favorites);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeFavorites(slugs: string[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(slugs));
  } catch {
    throw new MarketplaceError("STORAGE", "Favoriler kaydedilemedi. Tarayıcı depolama alanını kontrol et.");
  }
}

export function createDemoAccountRepository(ctx: { user: { id: string; email: string; name: string } }): AccountRepository {
  const userId = ctx.user.id;

  function profile(): ProfileView {
    const stored = demoAccountStore.getSnapshot().profiles[userId];
    return { id: userId, email: ctx.user.email, fullName: stored?.fullName ?? ctx.user.name, phone: stored?.phone ?? "", avatarUrl: stored?.avatarUrl ?? null, role: "customer", notificationPrefs: normalizeNotificationPrefs(stored?.notificationPrefs) };
  }

  function addresses(): AddressView[] {
    return [...(demoAccountStore.getSnapshot().addresses[userId] ?? [])].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  }

  function saveAddresses(list: AddressView[]): AddressView[] {
    demoAccountStore.update((state) => ({ ...state, addresses: { ...state.addresses, [userId]: list } }));
    return addresses();
  }

  return {
    async getProfile() {
      return profile();
    },
    async updateProfile(patch) {
      const current = profile();
      demoAccountStore.update((state) => ({
        ...state,
        profiles: {
          ...state.profiles,
          [userId]: {
            fullName: patch.fullName?.trim() ?? current.fullName,
            phone: patch.phone?.trim() ?? current.phone,
            avatarUrl: patch.avatarUrl === undefined ? current.avatarUrl : patch.avatarUrl,
            notificationPrefs: patch.notificationPrefs ? normalizeNotificationPrefs(patch.notificationPrefs) : current.notificationPrefs,
          },
        },
      }));
      return profile();
    },
    async listAddresses() {
      return addresses();
    },
    async saveAddress(id: string | null, input: AddressInput) {
      const current = demoAccountStore.getSnapshot().addresses[userId] ?? [];
      if (!id && current.length >= MAX_ADDRESSES) throw new MarketplaceError("ADDRESS_LIMIT", `En fazla ${MAX_ADDRESSES} adres kaydedebilirsin.`);
      if (id && !current.some((item) => item.id === id)) throw new MarketplaceError("ADDRESS_NOT_FOUND", "Adres bulunamadı.");
      const clean: AddressInput = { ...input, title: input.title.trim(), fullName: input.fullName.trim(), phone: input.phone.trim(), city: input.city.trim(), district: input.district.trim(), addressLine: input.addressLine.trim(), postalCode: input.postalCode.trim() };
      const saved: AddressView = { id: id ?? crypto.randomUUID(), ...clean };
      const others = current.filter((item) => item.id !== saved.id).map((item) => (saved.isDefault ? { ...item, isDefault: false } : item));
      const list = id ? current.map((item) => (item.id === id ? saved : saved.isDefault ? { ...item, isDefault: false } : item)) : [...others, saved];
      // İlk adres otomatik varsayılan olur.
      return saveAddresses(list.length === 1 ? [{ ...list[0], isDefault: true }] : list);
    },
    async deleteAddress(id: string) {
      const list = (demoAccountStore.getSnapshot().addresses[userId] ?? []).filter((item) => item.id !== id);
      const hasDefault = list.some((item) => item.isDefault);
      return saveAddresses(hasDefault || list.length === 0 ? list : list.map((item, index) => (index === 0 ? { ...item, isDefault: true } : item)));
    },
    async listFavorites() {
      return readFavorites();
    },
    async addFavorite(slug: string) {
      const next = addFavoriteSlug(readFavorites(), slug);
      writeFavorites(next);
      return next;
    },
    async removeFavorite(slug: string) {
      const next = removeFavoriteSlug(readFavorites(), slug);
      writeFavorites(next);
      return next;
    },
  };
}
