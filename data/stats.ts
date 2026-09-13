import { Users, Heart, PackageSearch, Truck } from "lucide-react";
import type { Stat } from "@/types";

export const stats: Stat[] = [
  { icon: Users, value: "10.000+", label: "Aktif Satıcı" },
  { icon: Heart, value: "1M+", label: "Mutlu Müşteri" },
  { icon: PackageSearch, value: "50M+", label: "Ürün Çeşidi" },
  { icon: Truck, value: "81 il", label: "Hızlı Teslimat" },
];
