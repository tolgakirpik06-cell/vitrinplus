-- ============================================================================
-- VitrinPlus · Aşama 2 · 0001 — Temel yapı
--   profiles, seller_accounts, stores, plan_limits, platform_fee_rules
--
-- Sırayla çalıştırılmalıdır (0001 → 0006). Supabase SQL Editor'de ya da
-- `supabase db push` ile uygulanabilir. Tüm SECURITY DEFINER fonksiyonlar
-- `set search_path = ''` ile çalışır ve nesneleri şema adıyla çağırır.
--
-- Güvenlik ilkesi: API (anon/authenticated) yalnızca RLS + açık GRANT ile erişir.
-- Kritik yazmalar (sipariş, stok, iade, kazanç) yalnızca RPC fonksiyonlarıyla yapılır.
-- ============================================================================

-- ─── Yardımcı: updated_at ────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- API çağıranı (anon / authenticated) mı? SECURITY DEFINER fonksiyonların içinde
-- current_user fonksiyon sahibidir → false döner. Böylece "korumalı kolon" tetikleyicileri
-- yalnızca doğrudan API yazmalarını engeller, RPC'lerin kendi yazmalarını değil.
create or replace function public.is_api_caller()
returns boolean
language sql
stable
as $$
  select current_user in ('anon', 'authenticated');
$$;

-- ─── profiles ────────────────────────────────────────────────────────────────
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  role               text not null default 'customer' check (role in ('customer', 'seller', 'admin')),
  full_name          text not null default '' check (char_length(full_name) <= 120),
  email              text,
  phone              text check (phone is null or char_length(phone) <= 30),
  avatar_url         text check (avatar_url is null or char_length(avatar_url) <= 500),
  notification_prefs jsonb not null default '{"orderUpdates":true,"returnUpdates":true,"questionAnswers":true,"promotions":false,"email":true,"sms":false}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Rol, e-posta ve kimlik doğrudan API'den değiştirilemez (yetki yükseltme koruması).
create or replace function public.guard_profile_write()
returns trigger
language plpgsql
as $$
begin
  if public.is_api_caller() then
    if new.id <> old.id or new.role <> old.role or new.email is distinct from old.email or new.created_at <> old.created_at then
      raise exception 'Bu profil alanları değiştirilemez.' using errcode = '42501', hint = 'PROTECTED_COLUMN';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_write
  before update on public.profiles
  for each row execute function public.guard_profile_write();

-- Yeni auth kullanıcısı → profil (rol HER ZAMAN 'customer'; kullanıcı metadatasından rol alınmaz).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), ''), 120)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── seller_accounts ─────────────────────────────────────────────────────────
create table public.seller_accounts (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null unique references public.profiles (id) on delete cascade,
  reference        text not null unique,
  status           text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  selected_plan    text not null default 'vitrin-plus' check (selected_plan in ('vitrin', 'vitrin-plus', 'vitrin-pro-plus', 'vitrin-enterprise')),
  -- Başvuru içeriği (TC kimlik, IBAN, şifre, belge içeriği ASLA burada tutulmaz — bkz. lib/domain/application.ts).
  application      jsonb not null default '{}'::jsonb,
  rejection_reason text check (rejection_reason is null or char_length(rejection_reason) <= 500),
  reviewed_by      uuid references public.profiles (id) on delete set null,
  reviewed_at      timestamptz,
  submitted_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index seller_accounts_status_idx on public.seller_accounts (status, submitted_at desc);

create trigger seller_accounts_set_updated_at
  before update on public.seller_accounts
  for each row execute function public.set_updated_at();

-- Durum, paket, inceleme alanları doğrudan API'den yazılamaz; yalnızca RPC ile değişir.
create or replace function public.guard_seller_account_write()
returns trigger
language plpgsql
as $$
begin
  if public.is_api_caller() then
    raise exception 'Satıcı hesabı yalnızca ilgili işlemlerle değiştirilebilir.' using errcode = '42501', hint = 'RPC_ONLY';
  end if;
  return new;
end;
$$;

create trigger seller_accounts_guard_write
  before update on public.seller_accounts
  for each row execute function public.guard_seller_account_write();

-- ─── stores ──────────────────────────────────────────────────────────────────
create table public.stores (
  id                      uuid primary key default gen_random_uuid(),
  seller_account_id       uuid not null unique references public.seller_accounts (id) on delete cascade,
  owner_id                uuid not null unique references public.profiles (id) on delete cascade,
  slug                    text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name                    text not null check (char_length(btrim(name)) between 3 and 80),
  description             text not null default '' check (char_length(description) <= 1000),
  contact_email           text not null default '' check (char_length(contact_email) <= 150),
  contact_phone           text not null default '' check (char_length(contact_phone) <= 30),
  logo_url                text check (logo_url is null or char_length(logo_url) <= 500),
  banner_url              text check (banner_url is null or char_length(banner_url) <= 500),
  shipping_fee            numeric(10, 2) not null default 49.90 check (shipping_fee >= 0),
  free_shipping_threshold numeric(10, 2) not null default 250 check (free_shipping_threshold >= 0),
  preparation_days        integer not null default 2 check (preparation_days between 1 and 30),
  carrier                 text not null default 'Demo Kargo' check (char_length(btrim(carrier)) between 1 and 60),
  -- Yalnızca onaylı satıcı hesabı için true (seller_accounts.status tetikleyicisiyle senkron).
  is_active               boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

create unique index stores_name_lower_uq on public.stores (lower(btrim(name)));
create index stores_active_idx on public.stores (is_active) where is_active;

create trigger stores_set_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

create or replace function public.guard_store_write()
returns trigger
language plpgsql
as $$
begin
  if public.is_api_caller() then
    if new.id <> old.id or new.owner_id <> old.owner_id or new.seller_account_id <> old.seller_account_id
       or new.is_active <> old.is_active or new.slug <> old.slug or new.created_at <> old.created_at then
      raise exception 'Mağaza sahibi, durumu ve adresi doğrudan değiştirilemez.' using errcode = '42501', hint = 'PROTECTED_COLUMN';
    end if;
  end if;
  return new;
end;
$$;

create trigger stores_guard_write
  before update on public.stores
  for each row execute function public.guard_store_write();

-- Satıcı hesabı durumu → mağaza aktifliği (tek doğruluk kaynağı: seller_accounts.status).
create or replace function public.sync_store_active()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.stores set is_active = (new.status = 'approved') where seller_account_id = new.id;
  return new;
end;
$$;

create trigger seller_accounts_sync_store
  after update of status on public.seller_accounts
  for each row execute function public.sync_store_active();

-- ─── plan_limits (kaynak: lib/plans.ts — test: scripts/domain.test.mjs eşleşmeyi doğrular) ──
create table public.plan_limits (
  plan_key      text primary key check (plan_key in ('vitrin', 'vitrin-plus', 'vitrin-pro-plus', 'vitrin-enterprise')),
  product_limit integer check (product_limit is null or product_limit > 0)
);

-- product_limit NULL → özel / sınırsız (teklife göre).
insert into public.plan_limits (plan_key, product_limit) values
  ('vitrin', 100),
  ('vitrin-plus', 1000),
  ('vitrin-pro-plus', 5000),
  ('vitrin-enterprise', null);

-- ─── platform_fee_rules (genişletilebilir kesinti kalemleri) ─────────────────
-- Kazanç kaydı oluşurken aktif kurallar uygulanır. Ödeme sağlayıcısı bağlanınca
-- 'payment_provider' oranı güncellenir; yeni kesinti eklemek yeni satır eklemektir.
create table public.platform_fee_rules (
  code       text primary key check (code ~ '^[a-z][a-z0-9_]{1,40}$'),
  label      text not null check (char_length(label) between 2 and 80),
  rate       numeric(6, 4) not null default 0 check (rate >= 0 and rate <= 1),
  active     boolean not null default true,
  sort_order integer not null default 100
);

insert into public.platform_fee_rules (code, label, rate, sort_order) values
  ('commission', 'VitrinPlus Satış Komisyonu', 0, 10),
  ('payment_provider', 'Ödeme Altyapısı Kesintisi', 0, 20);

-- Teslimden sonra hakedişin ödemeye açılması için bekleme süresi (gün). Kaynak: lib/seller-analytics.ts PAYOUT_DELAY_DAYS.
create or replace function public.payout_hold_days()
returns integer
language sql
immutable
as $$
  select 14;
$$;

-- İade talebi penceresi (teslimden sonra gün). Kaynak: lib/domain/returns.ts RETURN_WINDOW_DAYS.
create or replace function public.return_window_days()
returns integer
language sql
immutable
as $$
  select 14;
$$;

-- Kesinti kalemlerini hesaplar. p_base: (brüt − indirim). Negatif taban (iade) negatif kesinti üretir.
create or replace function public.compute_deductions(p_base numeric)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object('type', r.code, 'label', r.label, 'rate', r.rate, 'amount', round(p_base * r.rate, 2))
      order by r.sort_order, r.code
    ),
    '[]'::jsonb
  )
  from public.platform_fee_rules r
  where r.active;
$$;

create or replace function public.deductions_total(p_deductions jsonb)
returns numeric
language sql
immutable
as $$
  select coalesce(sum((d ->> 'amount')::numeric), 0)
  from jsonb_array_elements(coalesce(p_deductions, '[]'::jsonb)) as d;
$$;

-- ─── RLS yardımcıları (tablolar yukarıda oluşturulduğu için burada) ──────────
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin');
$$;

create or replace function public.owns_store(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.stores s where s.id = p_store_id and s.owner_id = (select auth.uid()));
$$;

-- Mağaza müşteriye görünür mü? (aktif mağaza + onaylı satıcı hesabı)
create or replace function public.store_is_public(p_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.stores s
    join public.seller_accounts a on a.id = s.seller_account_id
    where s.id = p_store_id and s.is_active and a.status = 'approved'
  );
$$;
