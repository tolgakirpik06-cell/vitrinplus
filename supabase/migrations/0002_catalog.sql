-- ============================================================================
-- VitrinPlus · Aşama 2 · 0002 — Katalog
--   products, product_costs, product_images, product_variants,
--   store_campaigns, addresses, favorites, carts, cart_items
--
-- ÖNEMLİ: Ürün maliyeti (cost / extra_cost) `products` tablosunda DEĞİL,
-- yalnızca satıcı/yöneticiye açık `product_costs` tablosundadır. Böylece müşteri
-- sorguları (products, product_images, product_variants) maliyet kolonu içermez;
-- "select *" bile sızdıramaz.
-- ============================================================================

-- ─── products ────────────────────────────────────────────────────────────────
create table public.products (
  id                  uuid primary key default gen_random_uuid(),
  store_id            uuid not null references public.stores (id) on delete cascade,
  seller_id           uuid not null references public.profiles (id) on delete cascade,
  name                text not null check (char_length(btrim(name)) between 1 and 160),
  sku                 text check (sku is null or char_length(sku) <= 64),
  barcode             text check (barcode is null or char_length(barcode) <= 64),
  brand               text check (brand is null or char_length(brand) <= 80),
  model               text check (model is null or char_length(model) <= 80),
  category            text not null default '' check (char_length(category) <= 80),
  short_description   text not null default '' check (char_length(short_description) <= 300),
  description         text not null default '' check (char_length(description) <= 8000),
  price               numeric(12, 2) not null default 0 check (price >= 0 and price <= 10000000),
  discount_price      numeric(12, 2) check (discount_price is null or (discount_price > 0 and discount_price < price)),
  discount_start      timestamptz,
  discount_end        timestamptz,
  stock               integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  auto_passive        boolean not null default false,
  status              text not null default 'draft' check (status in ('draft', 'active', 'passive')),
  deleted_at          timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint products_discount_window check (discount_start is null or discount_end is null or discount_end >= discount_start),
  -- Yayına (aktif) alınabilmek için zorunlu alanlar.
  constraint products_active_requires_fields check (
    status <> 'active'
    or (price > 0 and sku is not null and btrim(sku) <> '' and btrim(category) <> '')
  )
);

create unique index products_store_sku_uq on public.products (store_id, lower(btrim(sku)))
  where sku is not null and btrim(sku) <> '' and deleted_at is null;
create index products_store_idx on public.products (store_id, created_at desc) where deleted_at is null;
create index products_seller_idx on public.products (seller_id);
create index products_public_idx on public.products (category, created_at desc) where status = 'active' and deleted_at is null;
create index products_barcode_idx on public.products (store_id, barcode) where barcode is not null;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- INSERT: seller_id her zaman mağaza sahibinden türetilir (istemcinin verdiği değer güvenilmez);
-- paket ürün limiti burada zorlanır (kaynak: plan_limits ← lib/plans.ts).
create or replace function public.products_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
  v_limit integer;
  v_count integer;
begin
  -- Mağaza satırını kilitle: eşzamanlı eklemeler limiti aşamasın.
  select s.owner_id into v_owner from public.stores s where s.id = new.store_id for update;
  if v_owner is null then
    raise exception 'Mağaza bulunamadı.' using errcode = 'P0001', hint = 'STORE_NOT_FOUND';
  end if;
  new.seller_id := v_owner;

  select l.product_limit into v_limit
  from public.stores s
  join public.seller_accounts a on a.id = s.seller_account_id
  join public.plan_limits l on l.plan_key = a.selected_plan
  where s.id = new.store_id;

  if v_limit is not null then
    select count(*) into v_count from public.products p where p.store_id = new.store_id and p.deleted_at is null;
    if v_count >= v_limit then
      raise exception 'Paket ürün limitine ulaştın (% ürün). Daha fazla ürün için paketini yükselt.', v_limit
        using errcode = 'P0001', hint = 'PLAN_LIMIT';
    end if;
  end if;
  return new;
end;
$$;

create trigger products_before_insert_guard
  before insert on public.products
  for each row execute function public.products_before_insert();

-- UPDATE: mağaza/satıcı değişmez; STOK doğrudan yazılamaz (yalnızca adjust_stock / sipariş RPC'leri).
create or replace function public.guard_product_write()
returns trigger
language plpgsql
as $$
begin
  if public.is_api_caller() then
    if new.id <> old.id or new.store_id <> old.store_id or new.seller_id <> old.seller_id or new.created_at <> old.created_at then
      raise exception 'Ürünün mağazası ve sahibi değiştirilemez.' using errcode = '42501', hint = 'PROTECTED_COLUMN';
    end if;
    if new.stock <> old.stock then
      raise exception 'Stok yalnızca stok hareketiyle değiştirilebilir.' using errcode = '42501', hint = 'STOCK_RPC_ONLY';
    end if;
  end if;
  return new;
end;
$$;

create trigger products_guard_write
  before update on public.products
  for each row execute function public.guard_product_write();

-- ─── product_costs (YALNIZCA satıcı / yönetici) ──────────────────────────────
create table public.product_costs (
  product_id     uuid primary key references public.products (id) on delete cascade,
  store_id       uuid not null references public.stores (id) on delete cascade,
  cost           numeric(12, 2) not null default 0 check (cost >= 0),
  shipping_cost  numeric(12, 2) not null default 0 check (shipping_cost >= 0),
  packaging_cost numeric(12, 2) not null default 0 check (packaging_cost >= 0),
  payment_cost   numeric(12, 2) not null default 0 check (payment_cost >= 0),
  other_cost     numeric(12, 2) not null default 0 check (other_cost >= 0),
  updated_at     timestamptz not null default now()
);

create index product_costs_store_idx on public.product_costs (store_id);

create trigger product_costs_set_updated_at
  before update on public.product_costs
  for each row execute function public.set_updated_at();

-- store_id her zaman ürünün mağazasından türetilir.
create or replace function public.product_costs_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.store_id into new.store_id from public.products p where p.id = new.product_id;
  if new.store_id is null then
    raise exception 'Ürün bulunamadı.' using errcode = 'P0001', hint = 'PRODUCT_NOT_FOUND';
  end if;
  return new;
end;
$$;

create trigger product_costs_guard
  before insert or update on public.product_costs
  for each row execute function public.product_costs_before_write();

-- ─── product_images ──────────────────────────────────────────────────────────
create table public.product_images (
  id           uuid primary key default gen_random_uuid(),
  product_id   uuid not null references public.products (id) on delete cascade,
  store_id     uuid not null references public.stores (id) on delete cascade,
  storage_path text not null unique check (char_length(storage_path) between 3 and 300),
  url          text not null check (char_length(url) <= 600),
  alt          text not null default '' check (char_length(alt) <= 200),
  sort_order   integer not null default 0 check (sort_order >= 0),
  created_at   timestamptz not null default now()
);

create index product_images_product_idx on public.product_images (product_id, sort_order);

create or replace function public.product_images_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  select p.store_id into new.store_id from public.products p where p.id = new.product_id;
  if new.store_id is null then
    raise exception 'Ürün bulunamadı.' using errcode = 'P0001', hint = 'PRODUCT_NOT_FOUND';
  end if;
  -- Depolama yolu mağaza klasörüyle başlamalı: {store_id}/...
  if split_part(new.storage_path, '/', 1) <> new.store_id::text then
    raise exception 'Görsel yolu mağazaya ait değil.' using errcode = 'P0001', hint = 'INVALID_PATH';
  end if;
  select count(*) into v_count from public.product_images i where i.product_id = new.product_id;
  if v_count >= 10 then
    raise exception 'Bir ürüne en fazla 10 görsel eklenebilir.' using errcode = 'P0001', hint = 'IMAGE_LIMIT';
  end if;
  return new;
end;
$$;

create trigger product_images_guard
  before insert on public.product_images
  for each row execute function public.product_images_before_insert();

-- ─── product_variants ────────────────────────────────────────────────────────
create table public.product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  store_id   uuid not null references public.stores (id) on delete cascade,
  label      text not null check (char_length(btrim(label)) between 1 and 80),
  sku        text check (sku is null or char_length(sku) <= 64),
  stock      integer not null default 0 check (stock >= 0),
  sort_order integer not null default 0,
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index product_variants_label_uq on public.product_variants (product_id, lower(btrim(label)));
create unique index product_variants_sku_uq on public.product_variants (product_id, lower(btrim(sku))) where sku is not null and btrim(sku) <> '';
create index product_variants_product_idx on public.product_variants (product_id, sort_order);

create trigger product_variants_set_updated_at
  before update on public.product_variants
  for each row execute function public.set_updated_at();

create or replace function public.product_variants_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.store_id into new.store_id from public.products p where p.id = new.product_id;
  if new.store_id is null then
    raise exception 'Ürün bulunamadı.' using errcode = 'P0001', hint = 'PRODUCT_NOT_FOUND';
  end if;
  return new;
end;
$$;

-- NOT: is_api_caller() SECURITY DEFINER bir fonksiyonda hep false döner. Bu yüzden stok/kimlik
-- koruması ayrı bir (invoker) tetikleyicide yapılır:
create or replace function public.guard_variant_write()
returns trigger
language plpgsql
as $$
begin
  if public.is_api_caller() then
    if new.id <> old.id or new.product_id <> old.product_id or new.store_id <> old.store_id then
      raise exception 'Varyantın ürünü değiştirilemez.' using errcode = '42501', hint = 'PROTECTED_COLUMN';
    end if;
    if new.stock <> old.stock then
      raise exception 'Stok yalnızca stok hareketiyle değiştirilebilir.' using errcode = '42501', hint = 'STOCK_RPC_ONLY';
    end if;
  end if;
  return new;
end;
$$;

create trigger product_variants_before_write_fill
  before insert or update on public.product_variants
  for each row execute function public.product_variants_before_write();

create trigger product_variants_guard_write
  before update on public.product_variants
  for each row execute function public.guard_variant_write();

-- ─── store_campaigns ─────────────────────────────────────────────────────────
create table public.store_campaigns (
  id               uuid primary key default gen_random_uuid(),
  store_id         uuid not null references public.stores (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 2 and 80),
  discount_percent integer not null check (discount_percent between 1 and 90),
  end_date         date not null,
  created_at       timestamptz not null default now()
);

create index store_campaigns_store_idx on public.store_campaigns (store_id, created_at desc);

-- ─── addresses (müşteri adres defteri) ───────────────────────────────────────
create table public.addresses (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 40),
  full_name    text not null check (char_length(btrim(full_name)) between 2 and 80),
  phone        text not null check (phone ~ '^\+?[0-9 ()-]{10,18}$'),
  city         text not null check (char_length(btrim(city)) between 2 and 60),
  district     text not null check (char_length(btrim(district)) between 2 and 60),
  address_line text not null check (char_length(btrim(address_line)) between 5 and 300),
  postal_code  text check (postal_code is null or char_length(postal_code) <= 10),
  is_default   boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index addresses_user_idx on public.addresses (user_id, created_at desc);
create unique index addresses_one_default_uq on public.addresses (user_id) where is_default;

create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

create or replace function public.addresses_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  if tg_op = 'INSERT' then
    select count(*) into v_count from public.addresses a where a.user_id = new.user_id;
    if v_count >= 10 then
      raise exception 'En fazla 10 adres kaydedebilirsin.' using errcode = 'P0001', hint = 'ADDRESS_LIMIT';
    end if;
    -- İlk adres otomatik varsayılan olur.
    if v_count = 0 then new.is_default := true; end if;
  end if;
  if new.is_default then
    update public.addresses set is_default = false where user_id = new.user_id and id <> new.id and is_default;
  end if;
  return new;
end;
$$;

create trigger addresses_guard
  before insert or update on public.addresses
  for each row execute function public.addresses_before_write();

-- ─── favorites ───────────────────────────────────────────────────────────────
-- product_slug doğal anahtardır (statik katalog + "demo-<id>" mağaza ürünleri); product_id yalnızca DB ürünleri içindir.
create table public.favorites (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  product_slug text not null check (char_length(product_slug) between 1 and 160),
  product_id   uuid references public.products (id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint favorites_user_product_uq unique (user_id, product_slug)
);

create index favorites_user_idx on public.favorites (user_id, created_at desc);

-- ─── carts / cart_items ──────────────────────────────────────────────────────
create table public.carts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null unique references public.profiles (id) on delete cascade,
  coupon     text check (coupon is null or char_length(coupon) <= 40),
  updated_at timestamptz not null default now()
);

create trigger carts_set_updated_at
  before update on public.carts
  for each row execute function public.set_updated_at();

create table public.cart_items (
  id            uuid primary key default gen_random_uuid(),
  cart_id       uuid not null references public.carts (id) on delete cascade,
  product_slug  text not null check (char_length(product_slug) between 1 and 160),
  variant_label text check (variant_label is null or char_length(variant_label) <= 80),
  quantity      integer not null check (quantity between 1 and 99),
  created_at    timestamptz not null default now()
);

create unique index cart_items_line_uq on public.cart_items (cart_id, product_slug, coalesce(variant_label, ''));
