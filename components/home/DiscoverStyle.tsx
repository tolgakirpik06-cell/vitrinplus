import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { mainCategories, categoryHref } from "@/data/categories";

type Tone = "brand" | "lime" | "rose" | "sky";

const toneClasses: Record<Tone, string> = {
  brand: "from-brand-500 to-brand-700 text-white",
  lime: "from-lime-300 to-lime-500 text-navy-950",
  rose: "from-rose-400 to-rose-600 text-white",
  sky: "from-sky-400 to-sky-600 text-white",
};

const STYLE_TILES: { slug: string; tone: Tone; subtitle: string }[] = [
  { slug: "kadin", tone: "brand", subtitle: "Sezonun trend kombinleri" },
  { slug: "kozmetik", tone: "rose", subtitle: "Cilt & makyaj favorileri" },
  { slug: "erkek", tone: "sky", subtitle: "Günlük ve şık seçenekler" },
  { slug: "spor-outdoor", tone: "lime", subtitle: "Formda kalmanın yolları" },
];

export function DiscoverStyle() {
  const tiles = STYLE_TILES.map((tile) => {
    const category = mainCategories.find((item) => item.slug === tile.slug);
    if (!category) return null;
    return { ...tile, category };
  }).filter((tile): tile is NonNullable<typeof tile> => Boolean(tile));

  return (
    <section aria-labelledby="tarzini-kesfet-baslik">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="tarzini-kesfet-baslik" className="text-lg font-bold text-navy-900 sm:text-xl">
          Tarzını Keşfet
        </h2>
        <Link
          href="/kategoriler"
          className="text-sm font-semibold text-navy-500 transition-colors hover:text-brand-600"
        >
          Tüm Kategoriler
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3.5 sm:gap-4 lg:grid-cols-4">
        {tiles.map(({ category, tone, subtitle }) => (
          <Link
            key={category.id}
            href={categoryHref(category.slug)}
            className={`group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br p-5 shadow-premium transition-transform duration-300 hover:-translate-y-1 ${toneClasses[tone]}`}
          >
            <div
              className="pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-white/15 blur-2xl"
              aria-hidden
            />
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
              <category.icon size={20} />
            </span>
            <div>
              <span className="flex items-center gap-1 text-lg font-extrabold">
                {category.name}
                <ArrowUpRight
                  size={16}
                  className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </span>
              <span className="mt-1 block text-xs font-medium opacity-85">{subtitle}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
