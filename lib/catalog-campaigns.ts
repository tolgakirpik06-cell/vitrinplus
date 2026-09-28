import "server-only";
import { catalogProducts } from "@/lib/catalog-server";
import type { Campaign } from "@/types";
export async function catalogCampaigns(limit = 4): Promise<Campaign[]> {
  const { items } = await catalogProducts({ discounted: true, inStock: true, pageSize: limit });
  return items.map(p => ({ id: p.id, title: p.name, subtitle: `${p.seller} · Güncel ürün indirimi`, badge: `%${p.discount} indirim`, ctaLabel: "Ürünü İncele", href: `/urun/${p.slug}`, tone: "brand" }));
}
