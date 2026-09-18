import { products } from "@/data/products";
import { mainCategories, extraCategories } from "@/data/categories";
import { stores } from "@/data/stores";
import { generateCategoryProducts } from "@/lib/mock-catalog";

export function normalizeSearch(value: string): string {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

const categories = [...mainCategories, ...extraCategories];
// Use the same catalog and slugs as category and product detail pages.
const catalog = [...new Map([
  ...products,
  ...categories.flatMap((category) => generateCategoryProducts(category.slug)),
].map((product) => [product.slug, product])).values()];

const productIndex = catalog.map((product) => ({
  product,
  text: normalizeSearch([product.name, product.brand, product.category, product.seller].join(" ")),
}));

export function searchCatalog(query: string) {
  const normalized = normalizeSearch(query);
  const tokens = normalized.split(" ").filter(Boolean);
  const matches = (text: string) => tokens.length > 0 && tokens.every((token) => text.includes(token));
  return {
    products: productIndex.filter(({ text }) => matches(text)).map(({ product }) => product),
    stores: stores.filter((store) => matches(normalizeSearch(`${store.name} ${store.categoryLabel}`))),
    categories: categories.filter((category) => matches(normalizeSearch([
      category.name,
      ...(mainCategories.find((main) => main.id === category.id)?.subcategories ?? []),
    ].join(" ")))).map(({ id, slug, name }) => ({ id, slug, name })),
  };
}
