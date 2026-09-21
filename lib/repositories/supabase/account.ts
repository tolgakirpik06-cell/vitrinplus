import { MarketplaceError } from "@/lib/domain/errors";
import { normalizeFavoriteSlug } from "@/lib/domain/favorites";
import type { AccountRepository, AddressInput, AddressView, ProfilePatch } from "@/lib/repositories/types";
import type { AddressRow, FavoriteRow, ProfileRow } from "@/types/database";
import { rows, unwrap, first, type Client } from "./common";
import { idFromProductSlug, mapAddress, mapProfile } from "./mappers";

function addressColumns(input: AddressInput) {
  return { title: input.title.trim(), full_name: input.fullName.trim(), phone: input.phone.trim(), city: input.city.trim(), district: input.district.trim(), address_line: input.addressLine.trim(), postal_code: input.postalCode.trim() || null, is_default: input.isDefault };
}

export function createAccountRepository(client: Client, ctx: { userId: string }): AccountRepository {
  async function listAddresses(): Promise<AddressView[]> {
    const data = rows<AddressRow>(unwrap(await client.from("addresses").select("*").eq("user_id", ctx.userId).order("is_default", { ascending: false }).order("created_at", { ascending: true })));
    return data.map(mapAddress);
  }
  async function listFavorites(): Promise<string[]> {
    return rows<FavoriteRow>(unwrap(await client.from("favorites").select("*").eq("user_id", ctx.userId).order("created_at", { ascending: false }).limit(500))).map((row) => row.product_slug);
  }
  return {
    async getProfile() {
      const row = first<ProfileRow>(unwrap(await client.from("profiles").select("*").eq("id", ctx.userId).maybeSingle()));
      if (!row) throw new MarketplaceError("PROFILE_NOT_FOUND", "Profil bulunamadı.");
      return mapProfile(row);
    },
    async updateProfile(patch: ProfilePatch) {
      const columns: Record<string, unknown> = {};
      if (patch.fullName !== undefined) columns.full_name = patch.fullName.trim();
      if (patch.phone !== undefined) columns.phone = patch.phone.trim() || null;
      if (patch.avatarUrl !== undefined) columns.avatar_url = patch.avatarUrl;
      if (patch.notificationPrefs !== undefined) columns.notification_prefs = patch.notificationPrefs;
      const row = first<ProfileRow>(unwrap(await client.from("profiles").update(columns).eq("id", ctx.userId).select("*").single()));
      if (!row) throw new MarketplaceError("PROFILE_NOT_FOUND", "Profil güncellenemedi.");
      return mapProfile(row);
    },
    listAddresses,
    async saveAddress(id, input) {
      if (id) unwrap(await client.from("addresses").update(addressColumns(input)).eq("id", id).eq("user_id", ctx.userId));
      else unwrap(await client.from("addresses").insert({ id: crypto.randomUUID(), user_id: ctx.userId, ...addressColumns(input) }));
      return listAddresses();
    },
    async deleteAddress(id) {
      unwrap(await client.from("addresses").delete().eq("id", id).eq("user_id", ctx.userId));
      return listAddresses();
    },
    listFavorites,
    async addFavorite(slug) {
      const value = normalizeFavoriteSlug(slug);
      const result = await client.from("favorites").insert({ id: crypto.randomUUID(), user_id: ctx.userId, product_slug: value, product_id: idFromProductSlug(value) });
      // 23505: aynı ürün zaten favoride (unique) — hata değildir, işlem tekrarlanabilir (idempotent).
      if (result.error && result.error.code !== "23505") throw result.error;
      return listFavorites();
    },
    async removeFavorite(slug) {
      unwrap(await client.from("favorites").delete().eq("user_id", ctx.userId).eq("product_slug", normalizeFavoriteSlug(slug)));
      return listFavorites();
    },
  };
}
