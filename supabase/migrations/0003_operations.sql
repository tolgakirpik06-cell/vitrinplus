-- ============================================================================
-- VitrinPlus · Aşama 2 · 0003 — Operasyon tabloları
--   orders, order_items, order_events, order_shipments, stock_movements,
--   returns, return_events, product_questions, seller_payouts, seller_ledger
--
-- Bu tablolara API'den doğrudan YAZILMAZ (0005'te yalnızca SELECT verilir).
-- Tüm yazmalar 0004'teki SECURITY DEFINER RPC fonksiyonlarıyla yapılır.
-- ============================================================================

-- ─── orders (checkout başına mağaza başına bir sipariş) ──────────────────────
create table public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_no          text not null unique check (order_no ~ '^VP-[A-Z0-9]{8}$'),
  checkout_group_id uuid not null,
  buyer_id          uuid not null references public.profiles (id) on delete restrict,
  store_id          uuid not null references public.stores (id) on delete restrict,
  seller_id         uuid not null references public.profiles (id) on delete restrict,
  status            text not null default 'new'
                      check (status in ('new', 'preparing', 'ready_to_ship', 'shipped', 'delivered', 'cancelled')),
  idempotency_key   text not null check (char_length(idempotency_key) between 8 and 120),
  coupon_code       text,
  express           boolean not null default false,
  subtotal          numeric(12, 2) not null check (subtotal >= 0),
  discount_total    numeric(12, 2) not null default 0 check (discount_total >= 0),
  shipping_total    numeric(12, 2) not null default 0 check (shipping_total >= 0),
  total             numeric(12, 2) not null check (total >= 0),
  ship_to           jsonb not null,
  shipping_address  text not null check (char_length(shipping_address) between 5 and 800),
  billing_address   text not null check (char_length(billing_address) between 5 and 800),
  customer_note     text check (customer_note is null or char_length(customer_note) <= 500),
  seller_note       text check (seller_note is null or char_length(seller_note) <= 1000),
  cancel_reason     text check (cancel_reason is null or char_length(cancel_reason) <= 300),
  cancelled_by      uuid references public.profiles (id) on delete set null,
  stock_restored_at timestamptz,
  shipped_at        timestamptz,
  delivered_at      timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint orders_total_matches check (total = subtotal - discount_total + shipping_total),
  constraint orders_idempotency_uq unique (buyer_id, idempotency_key, store_id)
);

create index orders_buyer_idx on public.orders (buyer_id, created_at desc);
create index orders_store_idx on public.orders (store_id, created_at desc);
create index orders_store_status_idx on public.orders (store_id, status);
create index orders_group_idx on public.orders (checkout_group_id);
create index orders_seller_idx on public.orders (seller_id, created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ─── order_items (SNAPSHOT: ad, SKU, birim fiyat, adet, satır toplamı) ────────
create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  store_id      uuid not null references public.stores (id) on delete restrict,
  seller_id     uuid not null references public.profiles (id) on delete restrict,
  product_id    uuid references public.products (id) on delete set null,
  variant_id    uuid references public.product_variants (id) on delete set null,
  product_name  text not null,
  sku           text,
  variant_label text,
  list_price    numeric(12, 2) not null check (list_price >= 0),
  unit_price    numeric(12, 2) not null check (unit_price >= 0),
  quantity      integer not null check (quantity >= 1),
  line_total    numeric(12, 2) not null check (line_total >= 0),
  created_at    timestamptz not null default now(),
  constraint order_items_line_total_matches check (line_total = round(unit_price * quantity, 2))
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);
create index order_items_seller_idx on public.order_items (seller_id);

-- ─── order_events (zaman çizelgesi) ──────────────────────────────────────────
create table public.order_events (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.orders (id) on delete cascade,
  from_status text,
  to_status  text not null,
  actor_id   uuid references public.profiles (id) on delete set null,
  actor_role text not null check (actor_role in ('buyer', 'seller', 'admin', 'system')),
  note       text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index order_events_order_idx on public.order_events (order_id, created_at);

-- ─── order_shipments ─────────────────────────────────────────────────────────
create table public.order_shipments (
  order_id    uuid primary key references public.orders (id) on delete cascade,
  carrier     text check (carrier is null or char_length(carrier) <= 60),
  tracking_no text check (tracking_no is null or char_length(tracking_no) <= 80),
  shipped_at  timestamptz,
  updated_at  timestamptz not null default now()
);

-- ─── stock_movements (değiştirilemez denetim kaydı) ──────────────────────────
create table public.stock_movements (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores (id) on delete cascade,
  product_id      uuid references public.products (id) on delete set null,
  variant_id      uuid references public.product_variants (id) on delete set null,
  product_name    text not null,
  movement_type   text not null
                    check (movement_type in ('initial', 'manual_add', 'manual_remove', 'manual_set', 'sale', 'order_cancel', 'return_restock', 'adjustment')),
  quantity_change integer not null check (quantity_change <> 0),
  stock_before    integer not null check (stock_before >= 0),
  stock_after     integer not null check (stock_after >= 0),
  reference_type  text check (reference_type is null or reference_type in ('order', 'return', 'manual')),
  reference_id    uuid,
  note            text check (note is null or char_length(note) <= 300),
  actor_id        uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  constraint stock_movements_math check (stock_after = stock_before + quantity_change)
);

create index stock_movements_store_idx on public.stock_movements (store_id, created_at desc);
create index stock_movements_product_idx on public.stock_movements (product_id, created_at desc);
create index stock_movements_reference_idx on public.stock_movements (reference_type, reference_id);

-- Ürün ilk kez stokla oluşturulursa "initial" hareketi yazılır.
create or replace function public.log_initial_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'products' then
    if new.stock > 0 then
      insert into public.stock_movements (store_id, product_id, product_name, movement_type, quantity_change, stock_before, stock_after, reference_type, note, actor_id)
      values (new.store_id, new.id, new.name, 'initial', new.stock, 0, new.stock, 'manual', 'İlk stok', (select auth.uid()));
    end if;
  else
    if new.stock > 0 then
      insert into public.stock_movements (store_id, product_id, variant_id, product_name, movement_type, quantity_change, stock_before, stock_after, reference_type, note, actor_id)
      values (new.store_id, new.product_id, new.id, (select p.name from public.products p where p.id = new.product_id), 'initial', new.stock, 0, new.stock, 'manual', 'İlk varyant stoku', (select auth.uid()));
    end if;
  end if;
  return new;
end;
$$;

create trigger products_log_initial_stock
  after insert on public.products
  for each row execute function public.log_initial_stock();

create trigger product_variants_log_initial_stock
  after insert on public.product_variants
  for each row execute function public.log_initial_stock();

-- Varyantlı üründe ürün stoku = aktif varyant stokları toplamı.
create or replace function public.sync_product_stock_from_variants()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_product uuid := coalesce(new.product_id, old.product_id);
begin
  if exists (select 1 from public.product_variants v where v.product_id = v_product) then
    update public.products p
       set stock = coalesce((select sum(v.stock) from public.product_variants v where v.product_id = v_product and v.is_active), 0)
     where p.id = v_product;
  end if;
  return coalesce(new, old);
end;
$$;

create trigger product_variants_sync_stock
  after insert or update of stock, is_active or delete on public.product_variants
  for each row execute function public.sync_product_stock_from_variants();

-- ─── returns (iade talepleri) ────────────────────────────────────────────────
create table public.returns (
  id            uuid primary key default gen_random_uuid(),
  return_no     text not null unique check (return_no ~ '^IR-[A-Z0-9]{8}$'),
  order_id      uuid not null references public.orders (id) on delete restrict,
  order_item_id uuid not null references public.order_items (id) on delete restrict,
  store_id      uuid not null references public.stores (id) on delete restrict,
  seller_id     uuid not null references public.profiles (id) on delete restrict,
  buyer_id      uuid not null references public.profiles (id) on delete restrict,
  product_name  text not null,
  quantity      integer not null check (quantity >= 1),
  reason        text not null check (reason in ('defective', 'wrong_item', 'not_as_described', 'damaged_in_shipping', 'changed_mind', 'other')),
  description   text check (description is null or char_length(description) <= 800),
  status        text not null default 'requested' check (status in ('requested', 'approved', 'rejected', 'shipped', 'received', 'refunded')),
  refund_amount numeric(12, 2) not null check (refund_amount >= 0),
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  carrier       text check (carrier is null or char_length(carrier) <= 60),
  tracking_no   text check (tracking_no is null or char_length(tracking_no) <= 80),
  restock       boolean not null default true,
  restocked_at  timestamptz,
  approved_at   timestamptz,
  shipped_at    timestamptz,
  received_at   timestamptz,
  refunded_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index returns_buyer_idx on public.returns (buyer_id, created_at desc);
create index returns_store_idx on public.returns (store_id, created_at desc);
create index returns_store_status_idx on public.returns (store_id, status);
create index returns_item_idx on public.returns (order_item_id);

create trigger returns_set_updated_at
  before update on public.returns
  for each row execute function public.set_updated_at();

create table public.return_events (
  id          uuid primary key default gen_random_uuid(),
  return_id   uuid not null references public.returns (id) on delete cascade,
  from_status text,
  to_status   text not null,
  actor_id    uuid references public.profiles (id) on delete set null,
  actor_role  text not null check (actor_role in ('buyer', 'seller', 'admin', 'system')),
  note        text check (note is null or char_length(note) <= 500),
  created_at  timestamptz not null default now()
);

create index return_events_return_idx on public.return_events (return_id, created_at);

-- ─── product_questions (Soru–Cevap) ──────────────────────────────────────────
create table public.product_questions (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  store_id      uuid not null references public.stores (id) on delete cascade,
  asker_id      uuid not null references public.profiles (id) on delete cascade,
  -- Müşteri adı herkese açık gösterilmez: "A*** K." biçiminde maskelenmiş görünen ad.
  asker_display text not null check (char_length(asker_display) between 1 and 60),
  question      text not null check (char_length(btrim(question)) between 5 and 500),
  answer        text check (answer is null or char_length(btrim(answer)) between 2 and 1000),
  -- Yalnızca 'answered' herkese açıktır; 'hidden' yayından kaldırılmış demektir.
  status        text not null default 'pending' check (status in ('pending', 'answered', 'hidden')),
  answered_by   uuid references public.profiles (id) on delete set null,
  answered_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint product_questions_answered_has_answer check (status <> 'answered' or (answer is not null and answered_at is not null))
);

create index product_questions_product_idx on public.product_questions (product_id, created_at desc) where status = 'answered';
create index product_questions_store_idx on public.product_questions (store_id, status, created_at desc);
create index product_questions_asker_idx on public.product_questions (asker_id, created_at desc);

create trigger product_questions_set_updated_at
  before update on public.product_questions
  for each row execute function public.set_updated_at();

-- ─── seller_payouts (ödeme sağlayıcısından bağımsız ödeme kayıtları) ──────────
create table public.seller_payouts (
  id                 uuid primary key default gen_random_uuid(),
  payout_no          text not null unique check (payout_no ~ '^OD-[A-Z0-9]{8}$'),
  store_id           uuid not null references public.stores (id) on delete restrict,
  seller_id          uuid not null references public.profiles (id) on delete restrict,
  amount             numeric(12, 2) not null check (amount > 0),
  status             text not null default 'planned' check (status in ('planned', 'processing', 'paid', 'failed', 'cancelled')),
  planned_for        date not null,
  paid_at            timestamptz,
  -- Sağlayıcı bağımsız: gerçek banka/ödeme entegrasyonu bağlanınca doldurulur.
  provider           text check (provider is null or char_length(provider) <= 40),
  provider_reference text check (provider_reference is null or char_length(provider_reference) <= 120),
  note               text check (note is null or char_length(note) <= 300),
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index seller_payouts_store_idx on public.seller_payouts (store_id, created_at desc);

create trigger seller_payouts_set_updated_at
  before update on public.seller_payouts
  for each row execute function public.set_updated_at();

-- ─── seller_ledger (hakediş defteri) ─────────────────────────────────────────
--   net = brüt − indirim + müşteriden alınan kargo − kesintiler toplamı
--   İade kayıtları negatiftir. 'pending' + available_at <= now() → çekilebilir bakiye.
create table public.seller_ledger (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores (id) on delete restrict,
  seller_id       uuid not null references public.profiles (id) on delete restrict,
  order_id        uuid references public.orders (id) on delete restrict,
  return_id       uuid references public.returns (id) on delete restrict,
  entry_type      text not null check (entry_type in ('sale', 'return', 'adjustment')),
  status          text not null default 'pending' check (status in ('pending', 'paid', 'reversed')),
  gross_amount    numeric(12, 2) not null,
  discount_amount numeric(12, 2) not null default 0,
  shipping_amount numeric(12, 2) not null default 0,
  deductions      jsonb not null default '[]'::jsonb,
  deduction_total numeric(12, 2) not null default 0,
  net_amount      numeric(12, 2) not null,
  available_at    timestamptz,
  payout_id       uuid references public.seller_payouts (id) on delete set null,
  description     text check (description is null or char_length(description) <= 300),
  created_at      timestamptz not null default now(),
  constraint seller_ledger_net_matches check (net_amount = gross_amount - discount_amount + shipping_amount - deduction_total)
);

create unique index seller_ledger_sale_uq on public.seller_ledger (order_id) where entry_type = 'sale';
create unique index seller_ledger_return_uq on public.seller_ledger (return_id) where entry_type = 'return';
create index seller_ledger_store_idx on public.seller_ledger (store_id, created_at desc);
create index seller_ledger_balance_idx on public.seller_ledger (store_id, status, available_at);
create index seller_ledger_payout_idx on public.seller_ledger (payout_id);
