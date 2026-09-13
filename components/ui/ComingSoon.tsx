import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ComingSoon({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="section-container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
        <Sparkles size={26} />
      </span>
      <h1 className="text-2xl font-extrabold text-navy-900 sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-md text-sm text-navy-400 sm:text-base">{description}</p>
      <Button href="/" variant="primary" size="md" className="mt-7">
        Ana Sayfaya Dön
      </Button>
    </div>
  );
}
