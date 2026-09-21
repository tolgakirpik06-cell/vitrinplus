import Image from "next/image";

/**
 * Satıcının yüklediği (Supabase Storage) ürün görseli.
 * Görseller yüklenmeden önce tarayıcıda küçültülür (lib/image-resize.ts: en fazla 1280 px, kalite 0.82).
 * Sunucu tarafı optimizasyon yalnızca next.config.ts'te izin verilen Supabase adresi için açılır;
 * yerel geliştirme adresi (localhost / özel IP) Next görsel optimizasyonuna verilemediğinden doğrudan sunulur.
 */
function shouldOptimize(src: string): boolean {
  const configured = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configured) return false;
  try {
    const target = new URL(src);
    const allowed = new URL(configured);
    if (target.hostname !== allowed.hostname) return false;
    return !/^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(target.hostname);
  } catch {
    return false;
  }
}

export function ProductImage({ src, alt, sizes, priority = false, className }: { src: string; alt: string; sizes: string; priority?: boolean; className?: string }) {
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} unoptimized={!shouldOptimize(src)} className={className ?? "object-contain"} />;
}
