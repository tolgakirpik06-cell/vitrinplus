-- Public projections retain caller RLS. Never expose owner/seller UUIDs in catalog DTOs.
begin;

create or replace function public.catalog_normalize(p_text text)
returns text language sql immutable parallel safe set search_path = '' as $$
  select btrim(regexp_replace(lower(translate(coalesce(p_text, ''),
    'çğıöşüÇĞİÖŞÜâîûÂÎÛ', 'cgiosuCGIOSUaiuAIU')), '[^a-z0-9]+', ' ', 'g'));
$$;
revoke all on function public.catalog_normalize(text) from public;
grant execute on function public.catalog_normalize(text) to anon, authenticated;

alter table public.products add column if not exists slug text;
update public.products set slug = coalesce(nullif(left(replace(public.catalog_normalize(name), ' ', '-'), 100), ''), 'urun') || '-' || id::text where slug is null;
alter table public.products alter column slug set not null;
create unique index if not exists products_slug_uq on public.products(slug);

create or replace function public.product_slug_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.slug := coalesce(nullif(left(replace(public.catalog_normalize(new.name), ' ', '-'), 100), ''), 'urun') || '-' || new.id::text;
  else
    new.slug := old.slug; -- Stable even when seller renames the product.
  end if;
  return new;
end;
$$;
drop trigger if exists product_slug_guard on public.products;
create trigger product_slug_guard before insert or update on public.products
for each row execute function public.product_slug_guard();

-- Anon table access also excludes internal ownership columns. Authenticated seller/admin reads retain their grants.
revoke select on public.products, public.stores from anon;
grant select (id, store_id, slug, name, sku, brand, model, category, short_description, description,
  price, discount_price, discount_start, discount_end, stock, status, deleted_at, created_at) on public.products to anon;
grant select (id, slug, name, description, logo_url, banner_url, contact_email, contact_phone,
  shipping_fee, free_shipping_threshold, preparation_days, is_active, created_at) on public.stores to anon;

create or replace view public.public_catalog with (security_invoker = true, security_barrier = true) as
select p.id, p.slug, p.store_id, p.name, p.sku, p.brand, p.model, p.category,
  p.short_description, p.description, p.price, p.discount_price, p.discount_start, p.discount_end,
  p.stock, p.created_at,
  (p.discount_price > 0 and p.discount_price < p.price and (p.discount_start is null or p.discount_start <= now()) and (p.discount_end is null or p.discount_end >= now())) as is_discounted,
  case when p.discount_price > 0 and p.discount_price < p.price
    and (p.discount_start is null or p.discount_start <= now())
    and (p.discount_end is null or p.discount_end >= now())
    then p.discount_price else p.price end as effective_price,
  public.catalog_normalize(p.category) as category_key,
  public.catalog_normalize(p.name || ' ' || coalesce(p.brand, '') || ' ' || p.category || ' ' || s.name) as search_text,
  jsonb_build_object('slug', s.slug, 'name', s.name, 'description', s.description,
    'shipping_fee', s.shipping_fee, 'free_shipping_threshold', s.free_shipping_threshold) as stores,
  coalesce((select jsonb_agg(jsonb_build_object('url', i.url, 'sort_order', i.sort_order) order by i.sort_order)
    from public.product_images i where i.product_id = p.id), '[]'::jsonb) as product_images,
  coalesce((select jsonb_agg(jsonb_build_object('label', v.label, 'stock', v.stock, 'sort_order', v.sort_order, 'is_active', true) order by v.sort_order)
    from public.product_variants v where v.product_id = p.id and v.is_active), '[]'::jsonb) as product_variants,
  s.slug as store_slug
from public.products p join public.stores s on s.id = p.store_id
where p.status = 'active' and p.deleted_at is null and public.store_is_public(s.id);

create or replace view public.public_stores with (security_invoker = true, security_barrier = true) as
select s.id, s.slug, s.name, s.description, s.logo_url, s.banner_url, s.contact_email, s.contact_phone,
  s.shipping_fee, s.free_shipping_threshold, s.preparation_days, s.created_at,
  public.catalog_normalize(s.name || ' ' || s.description) as search_text,
  (select count(*) from public.products p where p.store_id = s.id and p.status = 'active' and p.deleted_at is null) as product_count
from public.stores s where public.store_is_public(s.id);

revoke all on public.public_catalog, public.public_stores from public, anon, authenticated;
grant select on public.public_catalog, public.public_stores to anon, authenticated;
create index if not exists products_public_store_created_idx on public.products(store_id, created_at desc, id) where status = 'active' and deleted_at is null;
create index if not exists products_public_category_idx on public.products(public.catalog_normalize(category)) where status = 'active' and deleted_at is null;
commit;
