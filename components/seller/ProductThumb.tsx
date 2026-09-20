import { cn } from "@/lib/utils";

const gradients = ["from-royal-500 to-brand-500", "from-sky-500 to-royal-500", "from-emerald-500 to-teal-500", "from-amber-500 to-rose-500", "from-brand-500 to-rose-500", "from-navy-500 to-royal-600"];

function hash(text: string): number {
  let value = 0;
  for (let index = 0; index < text.length; index += 1) value = (value * 31 + text.charCodeAt(index)) >>> 0;
  return value;
}

/** Ürün küçük görseli: yüklenen görsel varsa o, yoksa isimden türeyen renkli baş harf. */
export function ProductThumb({ name, image, size = 40, className }: { name: string; image?: string; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={image} alt="" style={style} className={cn("shrink-0 rounded-lg border border-line object-cover", className)} />
    );
  }
  return (
    <span
      aria-hidden
      style={style}
      className={cn("flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[13px] font-bold text-white", gradients[hash(name) % gradients.length], className)}
    >
      {name.trim().charAt(0).toLocaleUpperCase("tr-TR") || "•"}
    </span>
  );
}
