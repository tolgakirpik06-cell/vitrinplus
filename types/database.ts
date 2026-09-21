/**
 * Veritabanı satır türleri (supabase/migrations ile birebir).
 *
 * Bu dosya elle yazılmıştır ve tarayıcı kodunun okuduğu sütunları kapsar. Supabase CLI ile üretilen türler
 * (`supabase gen types typescript`) hazır olduğunda bu dosyanın yerine geçebilir; alan adları aynıdır.
 * ÖNEMLİ: Maliyet alanları `products` tablosunda DEĞİL, yalnızca satıcıya görünen `product_costs` tablosundadır;
 * bu yüzden herkese açık ürün sorgularında maliyet sütunu fiziksel olarak bulunmaz.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type Uuid = string;
export type Timestamp = string;

export type DbRole = "customer" | "seller" | "admin";
export type DbSellerStatus = "pending" | "approved" | "rejected" | "suspended";
export type DbProductStatus = "draft" | "active" | "passive";
export type DbOrderStatus = "new" | "preparing" | "ready_to_ship" | "shipped" | "delivered" | "cancelled";
export type DbReturnStatus = "requested" | "approved" | "rejected" | "shipped" | "received" | "refunded";
export type DbReturnReason = "defective" | "wrong_item" | "not_as_described" | "damaged_in_shipping" | "changed_mind" | "other";
export type DbQuestionStatus = "pending" | "answered" | "hidden";
export type DbPayoutStatus = "planned" | "processing" | "paid" | "failed" | "cancelled";
export type DbLedgerType = "sale" | "return" | "adjustment";
export type DbLedgerStatus = "pending" | "paid" | "reversed";
export type DbStockMovementType = "initial" | "manual_add" | "manual_remove" | "manual_set" | "sale" | "order_cancel" | "return_restock" | "adjustment";
export type DbActorRole = "buyer" | "seller" | "admin" | "system";

export type NotificationPrefs = {
  orderUpdates: boolean;
  returnUpdates: boolean;
  questionAnswers: boolean;
  promotions: boolean;
  email: boolean;
  sms: boolean;
};

export type ProfileRow = {
  id: Uuid; role: DbRole; full_name: string; email: string | null; phone: string | null; avatar_url: string | null;
  notification_prefs: Partial<NotificationPrefs>; created_at: Timestamp; updated_at: Timestamp;
};

export type SellerAccountRow = {
  id: Uuid; owner_id: Uuid; reference: string; status: DbSellerStatus; selected_plan: string; application: Json;
  rejection_reason: string | null; reviewed_by: Uuid | null; reviewed_at: Timestamp | null; submitted_at: Timestamp; created_at: Timestamp; updated_at: Timestamp;
};

export type StoreRow = {
  id: Uuid; seller_account_id: Uuid; owner_id: Uuid; slug: string; name: string; description: string; contact_email: string; contact_phone: string;
  logo_url: string | null; banner_url: string | null; shipping_fee: number; free_shipping_threshold: number; preparation_days: number; carrier: string;
  is_active: boolean; created_at: Timestamp; updated_at: Timestamp;
};

export type ProductRow = {
  id: Uuid; store_id: Uuid; seller_id: Uuid; name: string; sku: string | null; barcode: string | null; brand: string | null; model: string | null;
  category: string; short_description: string; description: string; price: number; discount_price: number | null;
  discount_start: Timestamp | null; discount_end: Timestamp | null; stock: number; low_stock_threshold: number; auto_passive: boolean;
  status: DbProductStatus; deleted_at: Timestamp | null; created_at: Timestamp; updated_at: Timestamp;
};

/** Yalnızca mağaza sahibi / yönetici okuyabilir. */
export type ProductCostRow = {
  product_id: Uuid; store_id: Uuid; cost: number; shipping_cost: number; packaging_cost: number; payment_cost: number; other_cost: number; updated_at: Timestamp;
};

export type ProductImageRow = { id: Uuid; product_id: Uuid; store_id: Uuid; storage_path: string; url: string; alt: string; sort_order: number; created_at: Timestamp };

export type ProductVariantRow = {
  id: Uuid; product_id: Uuid; store_id: Uuid; label: string; sku: string | null; stock: number; sort_order: number; is_active: boolean; created_at: Timestamp; updated_at: Timestamp;
};

export type StoreCampaignRow = { id: Uuid; store_id: Uuid; name: string; discount_percent: number; end_date: string; created_at: Timestamp };

export type AddressRow = {
  id: Uuid; user_id: Uuid; title: string; full_name: string; phone: string; city: string; district: string; address_line: string;
  postal_code: string | null; is_default: boolean; created_at: Timestamp; updated_at: Timestamp;
};

export type FavoriteRow = { id: Uuid; user_id: Uuid; product_slug: string; product_id: Uuid | null; created_at: Timestamp };

export type ShipTo = { name: string; phone: string; city: string; district: string; address: string };

export type OrderRow = {
  id: Uuid; order_no: string; checkout_group_id: Uuid; buyer_id: Uuid; store_id: Uuid; seller_id: Uuid; status: DbOrderStatus; idempotency_key: string;
  coupon_code: string | null; express: boolean; subtotal: number; discount_total: number; shipping_total: number; total: number; ship_to: ShipTo;
  shipping_address: string; billing_address: string; customer_note: string | null; seller_note: string | null; cancel_reason: string | null; cancelled_by: Uuid | null;
  stock_restored_at: Timestamp | null; shipped_at: Timestamp | null; delivered_at: Timestamp | null; cancelled_at: Timestamp | null; created_at: Timestamp; updated_at: Timestamp;
};

/** Sipariş anındaki AN GÖRÜNTÜ: ürün adı, SKU ve fiyat sonradan değişse de bu satır değişmez. */
export type OrderItemRow = {
  id: Uuid; order_id: Uuid; store_id: Uuid; seller_id: Uuid; product_id: Uuid | null; variant_id: Uuid | null; product_name: string; sku: string | null;
  variant_label: string | null; list_price: number; unit_price: number; quantity: number; line_total: number; created_at: Timestamp;
};

export type OrderEventRow = { id: Uuid; order_id: Uuid; from_status: DbOrderStatus | null; to_status: DbOrderStatus; actor_id: Uuid | null; actor_role: DbActorRole; note: string | null; created_at: Timestamp };
export type OrderShipmentRow = { order_id: Uuid; carrier: string | null; tracking_no: string | null; shipped_at: Timestamp | null; updated_at: Timestamp };

export type StockMovementRow = {
  id: Uuid; store_id: Uuid; product_id: Uuid | null; variant_id: Uuid | null; product_name: string; movement_type: DbStockMovementType; quantity_change: number;
  stock_before: number; stock_after: number; reference_type: "order" | "return" | "manual" | null; reference_id: Uuid | null; note: string | null; actor_id: Uuid | null; created_at: Timestamp;
};

export type ReturnRow = {
  id: Uuid; return_no: string; order_id: Uuid; order_item_id: Uuid; store_id: Uuid; seller_id: Uuid; buyer_id: Uuid; product_name: string; quantity: number;
  reason: DbReturnReason; description: string | null; status: DbReturnStatus; refund_amount: number; rejection_reason: string | null; carrier: string | null; tracking_no: string | null;
  restock: boolean; restocked_at: Timestamp | null; approved_at: Timestamp | null; shipped_at: Timestamp | null; received_at: Timestamp | null; refunded_at: Timestamp | null;
  created_at: Timestamp; updated_at: Timestamp;
};

export type ReturnEventRow = { id: Uuid; return_id: Uuid; from_status: DbReturnStatus | null; to_status: DbReturnStatus; actor_id: Uuid | null; actor_role: DbActorRole; note: string | null; created_at: Timestamp };

/** `asker_id` ve `answered_by` sütunları istemciye AÇILMAZ (kolon düzeyinde yetki); soran kişi maskelenmiş adla görünür. */
export type ProductQuestionRow = {
  id: Uuid; product_id: Uuid; store_id: Uuid; asker_display: string; question: string; answer: string | null; status: DbQuestionStatus; answered_at: Timestamp | null; created_at: Timestamp;
};

export type LedgerDeduction = { type: string; label: string; rate: number; amount: number };

export type SellerLedgerRow = {
  id: Uuid; store_id: Uuid; seller_id: Uuid; order_id: Uuid | null; return_id: Uuid | null; entry_type: DbLedgerType; status: DbLedgerStatus; gross_amount: number;
  discount_amount: number; shipping_amount: number; deductions: LedgerDeduction[]; deduction_total: number; net_amount: number; available_at: Timestamp | null;
  payout_id: Uuid | null; description: string | null; created_at: Timestamp;
};

export type SellerPayoutRow = {
  id: Uuid; payout_no: string; store_id: Uuid; seller_id: Uuid; amount: number; status: DbPayoutStatus; planned_for: string; paid_at: Timestamp | null;
  provider: string | null; provider_reference: string | null; note: string | null; created_by: Uuid | null; created_at: Timestamp; updated_at: Timestamp;
};

export type PlatformFeeRuleRow = { code: string; label: string; rate: number; active: boolean; sort_order: number };
