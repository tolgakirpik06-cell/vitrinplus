import { Store } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { StoreIllustration } from "@/components/ui/StoreIllustration";

export function SellerCta() {
  return (
    <div className="flex h-full flex-col justify-between overflow-hidden rounded-3xl bg-navy-900 p-6 sm:p-7">
      <div>
        <h2 className="text-balance text-xl font-extrabold leading-snug text-white sm:text-2xl">
          Satıcılar için
          <br />
          bambaşka bir dönem!
        </h2>

        <p className="mt-4 text-4xl font-extrabold text-brand-500 sm:text-5xl">%0</p>
        <p className="text-sm font-semibold text-brand-400">Komisyon</p>

        <p className="mt-3 text-sm text-navy-300">
          Sattıkça kesinti yok.
          <br />
          Sadece aylık mağaza ücreti ödeyin.
        </p>
      </div>

      <div className="my-6">
        <StoreIllustration />
      </div>

      <Button href="/satici-basvuru" variant="dark" size="md" className="w-full sm:w-fit">
        <Store size={16} />
        Mağaza Aç
      </Button>
    </div>
  );
}
