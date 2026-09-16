import Link from "next/link";
import { mainCategories, categoryHref } from "@/data/categories";

/** Unsplash üzerinden ücretsiz lisanslı (Unsplash License) kategori fotoğrafları. */
function unsplash(id: string, size = 160) {
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${size}&h=${size}&q=80`;
}

/** Hero'nun altındaki yuvarlak, hızlı kategori erişimi — gerçek fotoğraflarla. */
const CHIP_SLUGS: { slug: string; label?: string; photo: string }[] = [
  { slug: "kadin", photo: unsplash("photo-1601117830731-1a36c879f666") },
  { slug: "erkek", photo: unsplash("photo-1587397845856-e6cf49176c70") },
  { slug: "elektronik", photo: unsplash("photo-1615655406736-b37c4fabf923") },
  { slug: "ev-yasam", photo: unsplash("photo-1554995207-c18c203602cb") },
  { slug: "kozmetik", photo: unsplash("photo-1552046122-03184de85e08") },
  { slug: "anne-cocuk", photo: unsplash("photo-1542385151-efd9000785a0") },
  { slug: "spor-outdoor", label: "Spor", photo: unsplash("photo-1550345332-09e3ac987658") },
  { slug: "supermarket", photo: unsplash("photo-1628102491629-778571d893a3") },
];

export function CategoryChips() {
  const chips = CHIP_SLUGS.map(({ slug, label, photo }) => {
    const category = mainCategories.find((item) => item.slug === slug);
    if (!category) return null;
    return { ...category, label: label ?? category.name, photo };
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));

  return (
    <div className="grid grid-cols-4 gap-3 sm:grid-cols-8">
      {chips.map((category) => (
        <Link
          key={category.id}
          href={categoryHref(category.slug)}
          className="group flex flex-col items-center gap-2"
        >
          <span className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-white shadow-card transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-glow group-hover:ring-brand-200 sm:h-16 sm:w-16">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={category.photo}
              alt={category.label}
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <span
              className="pointer-events-none absolute inset-0 rounded-full bg-brand-900/0 transition-colors duration-200 group-hover:bg-brand-900/15"
              aria-hidden
            />
          </span>
          <span className="text-center text-[11px] font-semibold text-navy-700 sm:text-xs">
            {category.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
