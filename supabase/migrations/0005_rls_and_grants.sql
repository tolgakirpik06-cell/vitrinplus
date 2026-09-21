-- ============================================================================
-- VitrinPlus · Aşama 2 · 0005 — RLS politikaları ve GRANT'lar
--
-- Savunma katmanları (hepsi birlikte çalışır):
--   1) Tablo/kolon GRANT'ları: API rolleri yalnızca izin verilen kolonlara yazabilir.
--   2) RLS: satır düzeyinde sahiplik (müşteri kendi verisi, satıcı kendi mağazası).
--   3) Korumalı kolon tetikleyicileri (0001–0003) ve SECURITY DEFINER RPC'ler (0004).
--
-- Yeni bir tablo eklediğinde: RLS'i aç, politikayı yaz, GRANT'ı açıkça ver.
-- ============================================================================

-- Ürün herkese görünür mü? (aktif + silinmemiş + mağaza yayında)
create or replace function public.product_is_public(p_product_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.products p
    where p.id = p_product_id and p.status = 'active' and p.deleted_at is null and public.store_is_public(p.store_id)
  );
$$;

-- ─── Önce her şeyi kapat, sonra açıkça ver ───────────────────────────────────
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

alter table public.profiles          enable row level security;
alter table public.seller_accounts   enable row level security;
alter table public.stores            enable row level security;
alter table public.plan_limits       enable row level security;
alter table public.platform_fee_rules enable row level security;
alter table public.products          enable row level security;
alter table public.product_costs     enable row level security;
alter table public.product_images    enable row level security;
alter table public.product_variants  enable row level security;
alter table public.store_campaigns   enable row level security;
alter table public.addresses         enable row level security;
alter table public.favorites         enable row level security;
alter table public.carts             enable row level security;
alter table public.cart_items        enable row level security;
alter table public.orders            enable row level security;
alter table public.order_items       enable row level security;
alter table public.order_events      enable row level security;
alter table public.order_shipments   enable row level security;
alter table public.stock_movements   enable row level security;
alter table public.returns           enable row level security;
alter table public.return_events     enable row level security;
alter table public.product_questions enable row level security;
alter table public.seller_payouts    enable row level security;
alter table public.seller_ledger     enable row level security;

-- RLS politikalarında ve korumalı-kolon tetikleyicilerinde (invoker) kullanılan yardımcılar
-- API rolleri tarafından çağrılabilir olmalı.
grant execute on function public.is_api_caller() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.owns_store(uuid) to anon, authenticated;
grant execute on function public.store_is_public(uuid) to anon, authenticated;
grant execute on function public.product_is_public(uuid) to anon, authenticated;

-- ─── profiles ────────────────────────────────────────────────────────────────
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

grant select on public.profiles to authenticated;
grant update (full_name, phone, avatar_url, notification_prefs) on public.profiles to authenticated;

-- ─── seller_accounts (yazma yalnızca RPC) ────────────────────────────────────
create policy seller_accounts_select on public.seller_accounts
  for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());

grant select on public.seller_accounts to authenticated;

-- ─── stores ──────────────────────────────────────────────────────────────────
create policy stores_select on public.stores
  for select to anon, authenticated
  using (is_active or owner_id = (select auth.uid()) or public.is_admin());

create policy stores_update_own on public.stores
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

grant select on public.stores to anon, authenticated;
grant update (name, description, contact_email, contact_phone, logo_url, banner_url, shipping_fee, free_shipping_threshold, preparation_days, carrier)
  on public.stores to authenticated;

-- ─── Kamuya açık yapılandırma ────────────────────────────────────────────────
create policy plan_limits_select on public.plan_limits for select to anon, authenticated using (true);
create policy platform_fee_rules_select on public.platform_fee_rules for select to anon, authenticated using (active);
grant select on public.plan_limits, public.platform_fee_rules to anon, authenticated;

-- ─── products ────────────────────────────────────────────────────────────────
create policy products_select on public.products
  for select to anon, authenticated
  using (
    (status = 'active' and deleted_at is null and public.store_is_public(store_id))
    or seller_id = (select auth.uid())
    or public.is_admin()
  );

-- Yalnızca yayında olan (onaylı) mağaza ürün ekleyebilir; seller_id tetikleyiciyle mağaza sahibinden türetilir.
create policy products_insert_own on public.products
  for insert to authenticated
  with check (seller_id = (select auth.uid()) and public.owns_store(store_id) and public.store_is_public(store_id));

create policy products_update_own on public.products
  for update to authenticated
  using (seller_id = (select auth.uid()))
  with check (seller_id = (select auth.uid()));

grant select on public.products to anon, authenticated;
grant insert (id, store_id, seller_id, name, sku, barcode, brand, model, category, short_description, description, price,
              discount_price, discount_start, discount_end, stock, low_stock_threshold, auto_passive, status)
  on public.products to authenticated;
-- STOK kolonu bilinçli olarak yok: stok yalnızca adjust_stock / sipariş RPC'leriyle değişir. DELETE yok: silme = deleted_at.
grant update (name, sku, barcode, brand, model, category, short_description, description, price, discount_price,
              discount_start, discount_end, low_stock_threshold, auto_passive, status, deleted_at)
  on public.products to authenticated;

-- ─── product_costs (YALNIZCA satıcı / yönetici) ──────────────────────────────
create policy product_costs_select on public.product_costs
  for select to authenticated
  using (public.owns_store(store_id) or public.is_admin());

create policy product_costs_insert_own on public.product_costs
  for insert to authenticated
  with check (public.owns_store(store_id));

create policy product_costs_update_own on public.product_costs
  for update to authenticated
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));

grant select on public.product_costs to authenticated;
grant insert (product_id, cost, shipping_cost, packaging_cost, payment_cost, other_cost) on public.product_costs to authenticated;
grant update (cost, shipping_cost, packaging_cost, payment_cost, other_cost) on public.product_costs to authenticated;

-- ─── product_images ──────────────────────────────────────────────────────────
create policy product_images_select on public.product_images
  for select to anon, authenticated
  using (public.product_is_public(product_id) or public.owns_store(store_id) or public.is_admin());

create policy product_images_insert_own on public.product_images
  for insert to authenticated
  with check (public.owns_store(store_id));

create policy product_images_update_own on public.product_images
  for update to authenticated
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));

create policy product_images_delete_own on public.product_images
  for delete to authenticated
  using (public.owns_store(store_id));

grant select on public.product_images to anon, authenticated;
grant insert (id, product_id, storage_path, url, alt, sort_order) on public.product_images to authenticated;
grant update (alt, sort_order) on public.product_images to authenticated;
grant delete on public.product_images to authenticated;

-- ─── product_variants ────────────────────────────────────────────────────────
create policy product_variants_select on public.product_variants
  for select to anon, authenticated
  using (public.product_is_public(product_id) or public.owns_store(store_id) or public.is_admin());

create policy product_variants_insert_own on public.product_variants
  for insert to authenticated
  with check (public.owns_store(store_id));

create policy product_variants_update_own on public.product_variants
  for update to authenticated
  using (public.owns_store(store_id))
  with check (public.owns_store(store_id));

create policy product_variants_delete_own on public.product_variants
  for delete to authenticated
  using (public.owns_store(store_id));

grant select on public.product_variants to anon, authenticated;
grant insert (id, product_id, label, sku, stock, sort_order, is_active) on public.product_variants to authenticated;
grant update (label, sku, sort_order, is_active) on public.product_variants to authenticated;
grant delete on public.product_variants to authenticated;

-- ─── store_campaigns ─────────────────────────────────────────────────────────
create policy store_campaigns_select on public.store_campaigns
  for select to authenticated
  using (public.owns_store(store_id) or public.is_admin());

create policy store_campaigns_insert_own on public.store_campaigns
  for insert to authenticated
  with check (public.owns_store(store_id));

create policy store_campaigns_delete_own on public.store_campaigns
  for delete to authenticated
  using (public.owns_store(store_id));

grant select, delete on public.store_campaigns to authenticated;
grant insert (id, store_id, name, discount_percent, end_date) on public.store_campaigns to authenticated;

-- ─── addresses / favorites / carts / cart_items (yalnızca kendi satırları) ───
create policy addresses_own on public.addresses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, delete on public.addresses to authenticated;
grant insert (id, user_id, title, full_name, phone, city, district, address_line, postal_code, is_default) on public.addresses to authenticated;
grant update (title, full_name, phone, city, district, address_line, postal_code, is_default) on public.addresses to authenticated;

create policy favorites_own on public.favorites
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, delete on public.favorites to authenticated;
grant insert (id, user_id, product_slug, product_id) on public.favorites to authenticated;

create policy carts_own on public.carts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, delete on public.carts to authenticated;
grant insert (id, user_id, coupon) on public.carts to authenticated;
grant update (coupon) on public.carts to authenticated;

create policy cart_items_own on public.cart_items
  for all to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = (select auth.uid())));

grant select, delete on public.cart_items to authenticated;
grant insert (id, cart_id, product_slug, variant_label, quantity) on public.cart_items to authenticated;
grant update (quantity) on public.cart_items to authenticated;

-- ─── orders ve alt kayıtları (yalnızca OKUMA; yazma RPC ile) ─────────────────
create policy orders_select on public.orders
  for select to authenticated
  using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or public.is_admin());

create policy order_items_select on public.order_items
  for select to authenticated
  using (
    seller_id = (select auth.uid())
    or public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.buyer_id = (select auth.uid()))
  );

create policy order_events_select on public.order_events
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()))) or public.is_admin());

create policy order_shipments_select on public.order_shipments
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.buyer_id = (select auth.uid()) or o.seller_id = (select auth.uid()))) or public.is_admin());

grant select on public.orders, public.order_items, public.order_events, public.order_shipments to authenticated;

-- ─── stock_movements (yalnızca mağaza sahibi / yönetici okur) ────────────────
create policy stock_movements_select on public.stock_movements
  for select to authenticated
  using (public.owns_store(store_id) or public.is_admin());

grant select on public.stock_movements to authenticated;

-- ─── returns ─────────────────────────────────────────────────────────────────
create policy returns_select on public.returns
  for select to authenticated
  using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or public.is_admin());

create policy return_events_select on public.return_events
  for select to authenticated
  using (exists (select 1 from public.returns r where r.id = return_id and (r.buyer_id = (select auth.uid()) or r.seller_id = (select auth.uid()))) or public.is_admin());

grant select on public.returns, public.return_events to authenticated;

-- ─── product_questions ───────────────────────────────────────────────────────
-- Herkese açık: yalnızca YANITLANMIŞ ve yayında olan ürünün soruları.
create policy product_questions_select on public.product_questions
  for select to anon, authenticated
  using (
    (status = 'answered' and public.product_is_public(product_id))
    or asker_id = (select auth.uid())
    or public.owns_store(store_id)
    or public.is_admin()
  );

-- Soru soran kişinin kimliği (asker_id) ve yanıtlayan (answered_by) API'ye açılmaz.
grant select (id, product_id, store_id, asker_display, question, answer, status, answered_at, created_at) on public.product_questions to anon, authenticated;

-- ─── Kazanç / ödeme (yalnızca mağaza sahibi / yönetici okur) ─────────────────
create policy seller_ledger_select on public.seller_ledger
  for select to authenticated
  using (public.owns_store(store_id) or public.is_admin());

create policy seller_payouts_select on public.seller_payouts
  for select to authenticated
  using (public.owns_store(store_id) or public.is_admin());

grant select on public.seller_ledger, public.seller_payouts to authenticated;

-- ─── RPC yetkileri (yalnızca giriş yapmış kullanıcı) ─────────────────────────
grant execute on function public.submit_seller_application(text, text, text, jsonb) to authenticated;
grant execute on function public.admin_set_seller_status(uuid, text, text) to authenticated;
grant execute on function public.set_seller_plan(text) to authenticated;
grant execute on function public.place_order(jsonb, jsonb, text) to authenticated;
grant execute on function public.transition_order(uuid, text, text, text, text) to authenticated;
grant execute on function public.update_order_details(uuid, text, text, text) to authenticated;
grant execute on function public.adjust_stock(uuid, uuid, text, integer, text) to authenticated;
grant execute on function public.create_return(uuid, integer, text, text) to authenticated;
grant execute on function public.transition_return(uuid, text, text, text, text, boolean) to authenticated;
grant execute on function public.ask_question(uuid, text) to authenticated;
grant execute on function public.answer_question(uuid, text) to authenticated;
grant execute on function public.set_question_hidden(uuid, boolean) to authenticated;
grant execute on function public.plan_payout(uuid) to authenticated;
grant execute on function public.set_payout_status(uuid, text, text, text, text) to authenticated;
