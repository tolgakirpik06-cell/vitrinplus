import { Star } from "lucide-react";

export function RatingStars({
  rating,
  size = 14,
}: {
  rating: number;
  size?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <Star size={size} className="fill-amber-400 text-amber-400" />
      <span className="text-sm font-semibold text-navy-800">{rating.toFixed(1)}</span>
    </span>
  );
}
