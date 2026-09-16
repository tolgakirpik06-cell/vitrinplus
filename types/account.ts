export type OrderStatus =
  | "alindi"
  | "hazirlaniyor"
  | "kargoda"
  | "teslim-edildi"
  | "iptal-edildi"
  | "iade-surecinde";

export interface OrderItem {
  slug: string;
  quantity: number;
  priceAtPurchase: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  seller: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
}

export type CouponStatus =
  | "kullanilabilir"
  | "kullanildi"
  | "suresi-dolmus";

export interface Coupon {
  id: string;
  code: string;
  discountLabel: string;
  minCartLabel: string;
  validUntil: string;
  scope: string;
  status: CouponStatus;
}
