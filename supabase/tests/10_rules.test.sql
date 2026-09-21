-- ============================================================================
-- VitrinPlus · Aşama 2 · Veritabanı kural testleri (RLS, RPC, sipariş motoru)
--
-- Çalıştırma (boş bir yerel PostgreSQL veritabanında; bkz. supabase/tests/run-local.sh):
--   psql -v ON_ERROR_STOP=1 -d vp_test -f supabase/tests/00_supabase_shim.sql
--   psql -v ON_ERROR_STOP=1 -d vp_test -f supabase/migrations/000X_*.sql   (sırayla)
--   psql -v ON_ERROR_STOP=1 -d vp_test -f supabase/tests/10_rules.test.sql
--
-- Bu dosya gerçek Supabase projesinde ÇALIŞTIRILMAZ (test verisi oluşturur).
-- Her test, API'yi taklit eder: `set local role authenticated` + JWT `sub` claim'i.
-- ============================================================================
\set ON_ERROR_STOP on
\set QUIET on

create schema if not exists test;
grant usage on schema test to public;

-- API kullanıcısı gibi davran / postgres'e dön.
create or replace function test.login(p_uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_uid::text, ''), true);
  set local role authenticated;
end $$;

create or replace function test.anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  set local role anon;
end $$;

create or replace function test.admin_session() returns void language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claim.sub', '', true);
end $$;

-- Beklenen hata: hint (RPC kodu) ya da SQLSTATE eşleşmeli.
create or replace function test.throws(p_sql text, p_expect text default null) returns void language plpgsql as $$
declare v_hint text; v_state text; v_msg text;
begin
  begin
    execute p_sql;
  exception when others then
    get stacked diagnostics v_hint = pg_exception_hint, v_state = returned_sqlstate, v_msg = message_text;
    if p_expect is not null and p_expect is distinct from v_hint and p_expect is distinct from v_state then
      raise exception 'Beklenen hata "%" ama gelen hint=% state=% (%). SQL: %', p_expect, v_hint, v_state, v_msg, p_sql;
    end if;
    return;
  end;
  raise exception 'HATA BEKLENİYORDU ama çalıştı: %', p_sql;
end $$;

-- Geçen testler NOTICE olarak yazılır (işlem geri alınsa bile çıktıda kalır).
create or replace function test.ok(p_name text) returns void language plpgsql as $$
begin
  raise notice 'PASS: %', p_name;
end $$;

-- ─── Sabit kimlikler ─────────────────────────────────────────────────────────
-- admin / seller1 / seller2 / seller3 (askıya alınacak) / cust1 / cust2
create or replace function test.uid(p_name text) returns uuid language sql immutable as $$
  select case p_name
    when 'admin'   then 'a0000000-0000-0000-0000-000000000001'::uuid
    when 'seller1' then 'a0000000-0000-0000-0000-000000000011'::uuid
    when 'seller2' then 'a0000000-0000-0000-0000-000000000012'::uuid
    when 'seller3' then 'a0000000-0000-0000-0000-000000000013'::uuid
    when 'cust1'   then 'a0000000-0000-0000-0000-000000000021'::uuid
    when 'cust2'   then 'a0000000-0000-0000-0000-000000000022'::uuid
  end
$$;

-- ═══ 0. Kurulum ══════════════════════════════════════════════════════════════
insert into auth.users (id, email, raw_user_meta_data) values
  (test.uid('admin'),   'admin@example.com',   '{"full_name":"Yönetici Kişi"}'),
  (test.uid('seller1'), 'seller1@example.com', '{"full_name":"Satıcı Bir"}'),
  (test.uid('seller2'), 'seller2@example.com', '{"full_name":"Satıcı İki"}'),
  (test.uid('seller3'), 'seller3@example.com', '{"full_name":"Satıcı Üç"}'),
  (test.uid('cust1'),   'cust1@example.com',   '{"full_name":"Ayşe Kaya", "role":"admin"}'),
  (test.uid('cust2'),   'cust2@example.com',   '{"full_name":"Mehmet Demir"}');

update public.profiles set role = 'admin' where id = test.uid('admin');

do $$
declare v_role text;
begin
  -- Kayıt metadatasındaki "role":"admin" YOK sayılır: herkes customer doğar.
  select role into v_role from public.profiles where id = test.uid('cust1');
  assert v_role = 'customer', 'Yeni kullanıcı customer olmalı, metadata rol vermemeli';
  perform test.ok('signup: rol her zaman customer (metadata ile yükseltilemez)');
end $$;

-- ═══ 1. Tüm public tablolarda RLS açık ═══════════════════════════════════════
do $$
declare v_missing text;
begin
  select string_agg(c.relname, ', ') into v_missing
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  assert v_missing is null, 'RLS kapalı tablolar: ' || coalesce(v_missing, '');
  perform test.ok('rls: tüm public tablolarda açık');
end $$;

-- ═══ 2. Profil koruması ══════════════════════════════════════════════════════
begin;
select test.login(test.uid('cust1'));
select test.throws($$update public.profiles set role = 'admin' where id = test.uid('cust1')$$, '42501');
update public.profiles set full_name = 'Ayşe K. Kaya' where id = test.uid('cust1');
do $$
declare v_n integer;
begin
  update public.profiles set full_name = 'Hack' where id = test.uid('cust2');
  get diagnostics v_n = row_count;
  assert v_n = 0, 'Başka kullanıcının profili güncellenemez';
  assert (select count(*) from public.profiles) = 1, 'Müşteri yalnızca kendi profilini görür';
  perform test.ok('profil: rol değiştirilemez, başkasının profili görünmez/yazılamaz');
end $$;
rollback;

-- ═══ 3. Satıcı başvurusu ═════════════════════════════════════════════════════
begin;
select test.login(test.uid('seller1'));
do $$
declare r jsonb;
begin
  r := public.submit_seller_application('Alfa Mağaza', 'Açıklama', 'vitrin-plus', '{"sellerType":"sahis"}');
  assert r ->> 'status' = 'pending', 'Başvuru pending başlamalı';
  assert not (select is_active from public.stores where name = 'Alfa Mağaza'), 'Onaydan önce mağaza pasif';
  -- Aynı kullanıcı ikinci kez başvuramaz
  perform test.throws($q$select public.submit_seller_application('Alfa Mağaza 2', '', 'vitrin', '{}')$q$, 'ALREADY_APPLIED');
end $$;
-- Onaysız mağaza ürün ekleyemez
select test.throws($$insert into public.products (store_id, seller_id, name, sku, category, price, status)
  values ((select id from public.stores where owner_id = test.uid('seller1')), test.uid('seller1'), 'X', 'X-1', 'c', 10, 'draft')$$, '42501');
-- Müşteri onay veremez
select test.login(test.uid('cust1'));
select test.throws($$select public.admin_set_seller_status((select id from public.seller_accounts limit 1), 'approved')$$, '42501');
-- Doğrudan seller_accounts yazımı yok
select test.login(test.uid('seller1'));
select test.throws($$update public.seller_accounts set status = 'approved'$$, '42501');
select test.throws($$update public.stores set is_active = true$$, '42501');
commit;

-- Satıcı2, Satıcı3, aynı mağaza adı çakışması
begin;
select test.login(test.uid('seller2'));
select public.submit_seller_application('Beta Mağaza', 'Açıklama', 'vitrin', '{}');
select test.login(test.uid('seller3'));
select test.throws($$select public.submit_seller_application('alfa mağaza', '', 'vitrin', '{}')$$, 'STORE_NAME_TAKEN');
select public.submit_seller_application('Gama Mağaza', 'Açıklama', 'vitrin-plus', '{}');
commit;

-- Yönetici: onay / ret; onaydan sonra mağaza aktif ve rol seller
begin;
select test.login(test.uid('admin'));
select public.admin_set_seller_status((select id from public.seller_accounts where owner_id = test.uid('seller1')), 'approved');
select public.admin_set_seller_status((select id from public.seller_accounts where owner_id = test.uid('seller2')), 'approved');
select public.admin_set_seller_status((select id from public.seller_accounts where owner_id = test.uid('seller3')), 'approved');
select test.throws($$select public.admin_set_seller_status((select id from public.seller_accounts limit 1), 'rejected', '')$$, 'REASON_REQUIRED');
do $$
begin
  assert (select is_active from public.stores where owner_id = test.uid('seller1')), 'Onaylı mağaza aktif olmalı';
  assert (select role from public.profiles where id = test.uid('seller1')) = 'seller', 'Onaylanan kullanıcı seller olmalı';
  perform test.ok('başvuru: onaya kadar pasif, admin onayıyla aktif + rol seller');
end $$;
commit;

-- ═══ 4. Ürün yönetimi + maliyet gizliliği + çapraz kiracı ════════════════════
begin;
select test.login(test.uid('seller1'));
do $$
declare v_store uuid := (select id from public.stores where owner_id = test.uid('seller1'));
begin
  insert into public.products (id, store_id, seller_id, name, sku, category, price, stock, status, brand)
  values ('b0000000-0000-0000-0000-000000000001', v_store, test.uid('seller1'), 'Kablosuz Kulaklık', 'KLK-1', 'Elektronik', 1000, 10, 'active', 'Marka');
  insert into public.product_costs (product_id, cost, shipping_cost) values ('b0000000-0000-0000-0000-000000000001', 600, 25);
  insert into public.products (id, store_id, seller_id, name, sku, category, price, stock, status)
  values ('b0000000-0000-0000-0000-000000000002', v_store, test.uid('seller1'), 'Taslak Ürün', null, '', 0, 0, 'draft');
  insert into public.products (id, store_id, seller_id, name, sku, category, price, stock, status)
  values ('b0000000-0000-0000-0000-000000000003', v_store, test.uid('seller1'), 'Pasif Ürün', 'PSF-1', 'Elektronik', 50, 5, 'passive');
  -- aynı SKU ikinci kez
  perform test.throws($q$insert into public.products (store_id, seller_id, name, sku, category, price, stock, status)
    values ((select id from public.stores where owner_id = test.uid('seller1')), test.uid('seller1'), 'Kopya', 'klk-1', 'Elektronik', 10, 1, 'active')$q$, '23505');
  -- aktif ürün zorunlu alanlar (SKU boş)
  perform test.throws($q$insert into public.products (store_id, seller_id, name, sku, category, price, stock, status)
    values ((select id from public.stores where owner_id = test.uid('seller1')), test.uid('seller1'), 'SKU yok', '', 'Elektronik', 10, 1, 'active')$q$, '23514');
  -- indirim fiyatı liste fiyatından küçük olmalı
  perform test.throws($q$update public.products set discount_price = 2000 where id = 'b0000000-0000-0000-0000-000000000001'$q$, '23514');
end $$;
commit;

begin;
select test.login(test.uid('seller1'));
insert into public.products (id, store_id, name, sku, category, price, stock, status)
values ('b0000000-0000-0000-0000-000000000004', (select id from public.stores where owner_id = test.uid('seller1')), 'Seller_id verilmedi', 'NOID-1', 'Elektronik', 10, 1, 'active');
do $$
begin
  assert (select seller_id from public.products where id = 'b0000000-0000-0000-0000-000000000004') = test.uid('seller1'), 'seller_id mağaza sahibinden türetilmeli';
  perform test.ok('ürün: seller_id sunucuda türetilir');
end $$;
commit;

-- Müşteri / anonim: maliyet tablosu görünmez, products sorgusu maliyet kolonu içermez
begin;
select test.login(test.uid('cust1'));
do $$
declare v_n integer;
begin
  assert (select count(*) from public.products) = 2, 'Müşteri yalnızca aktif ürünleri görür (aktif: 2, taslak/pasif görünmez)';
  assert (select count(*) from public.product_costs) = 0, 'Müşteri maliyet satırı görmez';
  assert not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'products' and column_name ~ 'cost'),
    'products tablosunda maliyet kolonu olmamalı';
  perform test.ok('maliyet: müşteri okuyamaz, products kolonlarında maliyet yok');
end $$;
select test.anon();
do $$
begin
  perform test.throws($q$select * from public.product_costs$q$, '42501');
  assert (select count(*) from public.products) = 2, 'Anonim yalnızca aktif ürünleri görür';
end $$;
rollback;

-- Çapraz kiracı: seller2, seller1'in ürününü / maliyetini değiştiremez
begin;
select test.login(test.uid('seller2'));
do $$
declare v_n integer;
begin
  update public.products set name = 'Ele geçirildi' where id = 'b0000000-0000-0000-0000-000000000001';
  get diagnostics v_n = row_count;
  assert v_n = 0, 'Başka satıcının ürünü güncellenemez';
  assert (select count(*) from public.product_costs) = 0, 'Başka satıcının maliyeti görünmez';
  update public.product_costs set cost = 1 where product_id = 'b0000000-0000-0000-0000-000000000001';
  get diagnostics v_n = row_count;
  assert v_n = 0, 'Başka satıcının maliyeti güncellenemez';
  -- Başka mağazaya ürün ekleme
  perform test.throws($q$insert into public.products (store_id, seller_id, name, sku, category, price, stock, status)
    values ((select id from public.stores where owner_id = test.uid('seller1')), test.uid('seller2'), 'Sızma', 'SZ-1', 'c', 10, 1, 'active')$q$, '42501');
  -- seller_id sahteciliği: mağaza seller1'in, seller_id seller2
  perform test.throws($q$insert into public.products (store_id, seller_id, name, sku, category, price, stock, status)
    values ((select id from public.stores where owner_id = test.uid('seller1')), test.uid('seller1'), 'Sızma2', 'SZ-2', 'c', 10, 1, 'active')$q$, '42501');
  -- Başka satıcının ürününe maliyet / görsel / varyant ekleme
  perform test.throws($q$insert into public.product_costs (product_id, cost) values ('b0000000-0000-0000-0000-000000000003', 1)$q$, '42501');
  perform test.throws($q$insert into public.product_variants (product_id, label, stock) values ('b0000000-0000-0000-0000-000000000001', 'XL', 5)$q$, '42501');
  perform test.ok('çapraz kiracı: satıcı başka satıcının ürün/maliyet/varyantına dokunamaz');
end $$;
rollback;

-- Doğrudan stok yazımı engellenir; stok CHECK
begin;
select test.login(test.uid('seller1'));
select test.throws($$update public.products set stock = 999 where id = 'b0000000-0000-0000-0000-000000000001'$$, '42501');
select test.throws($$insert into public.products (store_id, name, sku, category, price, stock, status) values ((select id from public.stores where owner_id = test.uid('seller1')), 'Eksi', 'NEG-1', 'c', 10, -3, 'active')$$, '23514');
do $$ begin perform test.ok('stok: doğrudan güncelleme yasak, negatif stok CHECK ile engelli'); end $$;
rollback;

-- Soft delete: silinen ürün müşteriye görünmez, SKU serbest kalır
begin;
select test.login(test.uid('seller1'));
update public.products set deleted_at = now(), status = 'passive' where id = 'b0000000-0000-0000-0000-000000000004';
do $$
declare v_n integer;
begin
  select count(*) into v_n from public.products where id = 'b0000000-0000-0000-0000-000000000004';
  assert v_n = 1, 'Satıcı silinmiş ürünü kendi tarafında görebilir (soft delete)';
  perform test.throws($q$delete from public.products where id = 'b0000000-0000-0000-0000-000000000001'$q$, '42501');
end $$;
select test.anon();
do $$
begin
  assert (select count(*) from public.products where id = 'b0000000-0000-0000-0000-000000000004') = 0, 'Silinen ürün anonime görünmez';
  perform test.ok('soft delete: hard delete yok, silinen ürün gizli');
end $$;
commit;

-- ═══ 5. Paket ürün limiti ════════════════════════════════════════════════════
begin;
update public.plan_limits set product_limit = 5 where plan_key = 'vitrin';
select test.login(test.uid('seller2'));
do $$
declare v_store uuid := (select id from public.stores where owner_id = test.uid('seller2')); i integer;
begin
  for i in 1..5 loop
    insert into public.products (store_id, name, sku, category, price, stock, status) values (v_store, 'P' || i, 'LIM-' || i, 'c', 10, 1, 'draft');
  end loop;
  perform test.throws($q$insert into public.products (store_id, name, sku, category, price, stock, status)
    values ((select id from public.stores where owner_id = test.uid('seller2')), 'P6', 'LIM-6', 'c', 10, 1, 'draft')$q$, 'PLAN_LIMIT');
  perform test.ok('plan limiti: paket ürün limiti DB tarafından zorlanır');
end $$;
rollback;

-- ═══ 6. Stok ayarı (adjust_stock) ════════════════════════════════════════════
begin;
select test.login(test.uid('seller1'));
do $$
declare r jsonb;
begin
  r := public.adjust_stock('b0000000-0000-0000-0000-000000000001', null, 'add', 5, 'Depo girişi');
  assert (r ->> 'stock_after')::int = 15, 'add: 10+5';
  r := public.adjust_stock('b0000000-0000-0000-0000-000000000001', null, 'remove', 3, 'Fire');
  assert (r ->> 'stock_after')::int = 12;
  r := public.adjust_stock('b0000000-0000-0000-0000-000000000001', null, 'set', 10, 'Sayım');
  assert (r ->> 'stock_after')::int = 10;
  perform test.throws($q$select public.adjust_stock('b0000000-0000-0000-0000-000000000001', null, 'remove', 11)$q$, 'STOCK_NEGATIVE');
  perform test.throws($q$select public.adjust_stock('b0000000-0000-0000-0000-000000000001', null, 'add', 0)$q$, 'INVALID_QUANTITY');
  perform test.throws($q$select public.adjust_stock('b0000000-0000-0000-0000-000000000001', null, 'add', -2)$q$, 'INVALID_QUANTITY');
  assert (select stock from public.products where id = 'b0000000-0000-0000-0000-000000000001') = 10, 'Hatalı işlemler stoğu değiştirmemeli';
  assert (select count(*) from public.stock_movements where product_id = 'b0000000-0000-0000-0000-000000000001') = 4, 'initial + 3 hareket';
  assert (select bool_and(stock_after = stock_before + quantity_change) from public.stock_movements), 'hareket matematiği tutarlı';
  perform test.ok('stok: ekle/çıkar/say, negatif olamaz, her değişiklik hareket kaydı bırakır');
end $$;
select test.login(test.uid('seller2'));
select test.throws($$select public.adjust_stock('b0000000-0000-0000-0000-000000000001', null, 'add', 5)$$, 'PRODUCT_NOT_FOUND');
select test.login(test.uid('cust1'));
select test.throws($$select public.adjust_stock('b0000000-0000-0000-0000-000000000001', null, 'add', 5)$$, 'PRODUCT_NOT_FOUND');
do $$
begin
  assert (select count(*) from public.stock_movements) = 0, 'Müşteri stok hareketlerini göremez';
  perform test.ok('stok: başka satıcı/müşteri stok ayarlayamaz, hareketleri göremez');
end $$;
commit;

-- Hareketler kalıcı: ilk testte yapılan 3 değişiklik commit edildi (stok 10)

-- ═══ 7. Varyantlı ürün ═══════════════════════════════════════════════════════
begin;
select test.login(test.uid('seller1'));
do $$
declare v_store uuid := (select id from public.stores where owner_id = test.uid('seller1'));
begin
  insert into public.products (id, store_id, name, sku, category, price, stock, status)
  values ('b0000000-0000-0000-0000-000000000010', v_store, 'Tişört', 'TSR-1', 'Moda', 200, 0, 'active');
  insert into public.product_variants (id, product_id, label, stock) values
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000010', 'S', 3),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000010', 'M', 4);
  assert (select stock from public.products where id = 'b0000000-0000-0000-0000-000000000010') = 7, 'Ürün stoku varyant toplamı olmalı';
  perform public.adjust_stock('b0000000-0000-0000-0000-000000000010', 'c0000000-0000-0000-0000-000000000002', 'add', 6);
  assert (select stock from public.products where id = 'b0000000-0000-0000-0000-000000000010') = 13, 'Varyant stoku değişince ürün toplamı güncellenir';
  perform test.throws($q$select public.adjust_stock('b0000000-0000-0000-0000-000000000010', null, 'add', 1)$q$, 'VARIANT_REQUIRED');
  perform test.throws($q$update public.product_variants set stock = 100 where id = 'c0000000-0000-0000-0000-000000000001'$q$, '42501');
  perform test.ok('varyant: stok varyant bazında, ürün stoku toplam');
end $$;
commit;

-- ═══ 8. Sipariş motoru ═══════════════════════════════════════════════════════
-- Hazırlık: seller2 ürünleri (indirim pencereleri)
begin;
select test.login(test.uid('seller2'));
do $$
declare v_store uuid := (select id from public.stores where owner_id = test.uid('seller2'));
begin
  insert into public.products (id, store_id, name, sku, category, price, stock, status, discount_price, discount_start, discount_end)
  values
   ('b0000000-0000-0000-0000-000000000021', v_store, 'İndirim Aktif',   'D-ACT', 'Ev', 100, 50, 'active', 80, now() - interval '1 day', now() + interval '1 day'),
   ('b0000000-0000-0000-0000-000000000022', v_store, 'İndirim Bitti',   'D-END', 'Ev', 100, 50, 'active', 80, now() - interval '3 day', now() - interval '1 day'),
   ('b0000000-0000-0000-0000-000000000023', v_store, 'İndirim Gelecek', 'D-FUT', 'Ev', 100, 50, 'active', 80, now() + interval '1 day', now() + interval '3 day'),
   ('b0000000-0000-0000-0000-000000000024', v_store, 'Son Bir Adet',    'LAST-1', 'Ev', 300, 1, 'active', null, null, null);
end $$;
commit;

begin;
select test.login(test.uid('cust1'));
do $$
declare r jsonb; v_price numeric;
begin
  -- Giriş yapılmamış (sub yok) → sipariş yok
  perform set_config('request.jwt.claim.sub', '', true);
  perform test.throws($q$select public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000021","quantity":1}]', '{}', 'key-anon-0001')$q$, 'AUTH_REQUIRED');
  perform set_config('request.jwt.claim.sub', test.uid('cust1')::text, true);
end $$;
select test.anon();
select test.throws($$select public.place_order('[]', '{}', 'key-anon-0002')$$, '42501');
rollback;

begin;
select test.login(test.uid('cust1'));
do $$
declare
  d jsonb := '{"ship_to":{"name":"Ayşe Kaya","phone":"0532 111 22 33","city":"İstanbul","district":"Kadıköy","address":"Moda Cad. No 5 D 3"},"billing_address":"","coupon":"","express":false}'::jsonb;
  r jsonb; v_stock int;
begin
  -- Adet doğrulamaları
  perform test.throws(format($q$select public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000021","quantity":0}]', %L, 'key-qty-0001')$q$, d), 'INVALID_QUANTITY');
  perform test.throws(format($q$select public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000021","quantity":-2}]', %L, 'key-qty-0002')$q$, d), 'INVALID_QUANTITY');
  perform test.throws(format($q$select public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000021","quantity":1.5}]', %L, 'key-qty-0003')$q$, d), 'INVALID_QUANTITY');
  perform test.throws(format($q$select public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000021","quantity":"3"}]', %L, 'key-qty-0004')$q$, d), 'INVALID_QUANTITY');
  perform test.throws(format($q$select public.place_order('[]', %L, 'key-qty-0005')$q$, d), 'EMPTY_CART');
  -- Stoktan fazla
  perform test.throws(format($q$select public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000024","quantity":2}]', %L, 'key-stk-0001')$q$, d), 'OUT_OF_STOCK');
  -- Taslak / pasif / silinmiş ürün satılamaz
  perform test.throws(format($q$select public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000002","quantity":1}]', %L, 'key-drf-0001')$q$, d), 'NOT_SELLABLE');
  perform test.throws(format($q$select public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000003","quantity":1}]', %L, 'key-pas-0001')$q$, d), 'NOT_SELLABLE');
  perform test.throws(format($q$select public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000004","quantity":1}]', %L, 'key-del-0001')$q$, d), 'NOT_SELLABLE');
  -- Varyantlı üründe seçenek zorunlu
  perform test.throws(format($q$select public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000010","quantity":1}]', %L, 'key-var-0001')$q$, d), 'VARIANT_REQUIRED');
  -- Eksik adres
  perform test.throws($q$select public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000021","quantity":1}]', '{"ship_to":{"name":"A"}}', 'key-adr-0001')$q$, 'INVALID_ADDRESS');
  -- Hatalar stok değiştirmemeli
  assert (select stock from public.products where id = 'b0000000-0000-0000-0000-000000000021') = 50, 'Başarısız denemeler stok düşmemeli';
  assert (select count(*) from public.orders) = 0, 'Başarısız denemeler sipariş oluşturmamalı';
  perform test.ok('sipariş: adet/stok/durum/adres doğrulamaları ve başarısızlıkta yan etki yok');
end $$;
rollback;

-- Fiyat: indirim penceresi
begin;
select test.login(test.uid('cust1'));
do $$
declare
  d jsonb := '{"ship_to":{"name":"Ayşe Kaya","phone":"0532 111 22 33","city":"İstanbul","district":"Kadıköy","address":"Moda Cad. No 5 D 3"}}'::jsonb;
  r jsonb; v_oid uuid;
begin
  r := public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000021","quantity":1}]', d, 'key-disc-0001');
  assert (select unit_price from public.order_items where order_id = (r -> 'orders' -> 0 ->> 'id')::uuid) = 80, 'Pencere içinde indirimli fiyat';
  r := public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000022","quantity":1}]', d, 'key-disc-0002');
  assert (select unit_price from public.order_items where order_id = (r -> 'orders' -> 0 ->> 'id')::uuid) = 100, 'Süresi bitmiş indirim uygulanmaz';
  r := public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000023","quantity":1}]', d, 'key-disc-0003');
  assert (select unit_price from public.order_items where order_id = (r -> 'orders' -> 0 ->> 'id')::uuid) = 100, 'Başlamamış indirim uygulanmaz';
  perform test.ok('sipariş: indirim yalnızca tarih aralığında uygulanır');
end $$;
rollback;

-- Fiyat snapshot, idempotency, kupon + kargo
begin;
select test.login(test.uid('cust1'));
do $$
declare
  d jsonb := '{"ship_to":{"name":"Ayşe Kaya","phone":"0532 111 22 33","city":"İstanbul","district":"Kadıköy","address":"Moda Cad. No 5 D 3"},"coupon":"vitrinplus10","express":true}'::jsonb;
  r jsonb; r2 jsonb; v_o uuid; v_total numeric;
begin
  -- 2 × 100 TL (liste) + kupon %10 + hızlı kargo; mağaza eşiği 250 → kargo 49.90 + 29.90
  r := public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000022","quantity":2}]', d, 'key-snap-0001');
  v_o := (r -> 'orders' -> 0 ->> 'id')::uuid;
  assert (r -> 'orders' -> 0 ->> 'subtotal')::numeric = 200, 'ara toplam 200';
  assert (r -> 'orders' -> 0 ->> 'discount_total')::numeric = 20, 'kupon %10';
  assert (r -> 'orders' -> 0 ->> 'shipping_total')::numeric = 79.80, 'kargo 49.90 + hızlı 29.90';
  assert (r -> 'orders' -> 0 ->> 'total')::numeric = 259.80, 'toplam 200-20+79.80';
  assert (select stock from public.products where id = 'b0000000-0000-0000-0000-000000000022') = 48;
  -- Tekrarlanan istek: yeni sipariş yok, stok tekrar düşmez
  r2 := public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000022","quantity":2}]', d, 'key-snap-0001');
  assert (r2 ->> 'duplicate')::boolean, 'Aynı anahtar → duplicate';
  assert (r2 -> 'orders' -> 0 ->> 'id')::uuid = v_o, 'Aynı sipariş döner';
  assert (select count(*) from public.orders where buyer_id = test.uid('cust1')) = 1, 'Yalnızca bir sipariş';
  assert (select stock from public.products where id = 'b0000000-0000-0000-0000-000000000022') = 48, 'Stok ikinci kez düşmedi';
  perform test.ok('sipariş: tekrarlanan istek yeni sipariş oluşturmaz, stok bir kez düşer');
  -- Snapshot: ürün fiyatı/adı sonradan değişse de sipariş kalemi değişmez
  reset role;
  update public.products set price = 999, name = 'Yeni Ad' where id = 'b0000000-0000-0000-0000-000000000022';
  perform test.login(test.uid('cust1'));
  assert (select unit_price from public.order_items where order_id = v_o) = 100, 'Birim fiyat snapshot';
  assert (select product_name from public.order_items where order_id = v_o) = 'İndirim Bitti', 'Ürün adı snapshot';
  perform test.ok('sipariş: fiyat ve ad snapshot');
  reset role;
  -- Hakediş defteri: brüt 200, kupon platform kuponu (satıcıdan düşülmez), kargo bedeli satıcıya, komisyon 0
  assert (select gross_amount from public.seller_ledger where order_id = v_o) = 200;
  assert (select discount_amount from public.seller_ledger where order_id = v_o) = 0;
  assert (select shipping_amount from public.seller_ledger where order_id = v_o) = 79.80;
  assert (select deduction_total from public.seller_ledger where order_id = v_o) = 0, 'Komisyon %0';
  assert (select net_amount from public.seller_ledger where order_id = v_o) = 279.80;
  assert (select jsonb_array_length(deductions) from public.seller_ledger where order_id = v_o) = 2, 'Kesinti kalemleri (komisyon + ödeme altyapısı) kayıtta görünür';
  assert (select (deductions -> 0 ->> 'label') from public.seller_ledger where order_id = v_o) = 'VitrinPlus Satış Komisyonu';
  perform test.ok('hakediş: brüt/kesinti/net, komisyon %0, genişletilebilir kesinti kalemleri');
  update public.products set price = 100, name = 'İndirim Bitti' where id = 'b0000000-0000-0000-0000-000000000022';
  update public.products set stock = 50 where id = 'b0000000-0000-0000-0000-000000000022'; -- test verisi geri al (postgres)
end $$;
rollback;

-- Otomatik pasife alma: son adet satılınca ürün pasif olur
begin;
select test.login(test.uid('seller2'));
insert into public.products (id, store_id, name, sku, category, price, stock, status, auto_passive)
values ('b0000000-0000-0000-0000-000000000030', (select id from public.stores where owner_id = test.uid('seller2')), 'Otomatik Pasif', 'AP-1', 'Ev', 10, 1, 'active', true);
select test.login(test.uid('cust1'));
do $$
begin
  perform public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000030","quantity":1}]',
    '{"ship_to":{"name":"Ayşe Kaya","phone":"0532 111 22 33","city":"İstanbul","district":"Kadıköy","address":"Moda Cad. No 5 D 3"}}', 'key-autop-0001');
  reset role;
  assert (select status from public.products where id = 'b0000000-0000-0000-0000-000000000030') = 'passive', 'Stok bitince otomatik pasif';
  perform test.ok('stok: stok 0 olunca otomatik pasife alınır (ayar açıksa)');
end $$;
rollback;

-- Kendi ürününü satın alamaz; çok mağazalı sepet iki sipariş üretir
begin;
select test.login(test.uid('seller2'));
select test.throws($$select public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000021","quantity":1}]',
  '{"ship_to":{"name":"Satıcı İki","phone":"0532 111 22 33","city":"Ankara","district":"Çankaya","address":"Adres satırı 1"}}', 'key-own-0001')$$, 'OWN_PRODUCT');
select test.login(test.uid('cust2'));
do $$
declare
  d jsonb := '{"ship_to":{"name":"Mehmet Demir","phone":"0532 111 22 33","city":"Ankara","district":"Çankaya","address":"Adres satırı 1"}}'::jsonb;
  r jsonb;
begin
  r := public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000021","quantity":2},{"product_id":"b0000000-0000-0000-0000-000000000001","quantity":1}]', d, 'key-multi-0001');
  assert jsonb_array_length(r -> 'orders') = 2, 'İki mağaza → iki sipariş';
  assert (select count(distinct checkout_group_id) from public.orders where buyer_id = test.uid('cust2')) = 1, 'Aynı checkout grubu';
  assert (select sum(total) from public.orders where buyer_id = test.uid('cust2')) > 0;
  -- İkinci mağaza siparişinde seller_id doğru
  assert (select count(*) from public.orders where buyer_id = test.uid('cust2') and seller_id = test.uid('seller1')) = 1;
  perform test.ok('sipariş: çok mağazalı sepet mağaza başına sipariş üretir');
end $$;
rollback;

-- Askıya alınan mağaza satamaz; başka müşteri siparişi göremez / iptal edemez
begin;
select test.login(test.uid('cust1'));
do $$
declare
  d jsonb := '{"ship_to":{"name":"Ayşe Kaya","phone":"0532 111 22 33","city":"İstanbul","district":"Kadıköy","address":"Moda Cad. No 5 D 3"}}'::jsonb;
  r jsonb; v_o uuid;
begin
  r := public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000021","quantity":1}]', d, 'key-vis-0001');
  v_o := (r -> 'orders' -> 0 ->> 'id')::uuid;
  perform set_config('test.order1', v_o::text, true);
end $$;
select test.login(test.uid('cust2'));
do $$
declare v_o uuid := current_setting('test.order1')::uuid;
begin
  assert (select count(*) from public.orders) = 0, 'Başka müşteri siparişi göremez';
  assert (select count(*) from public.order_items) = 0, 'Başka müşteri sipariş kalemlerini göremez';
  perform test.throws(format($q$select public.transition_order(%L, 'cancelled')$q$, v_o), 'ORDER_NOT_FOUND');
  perform test.ok('sipariş: başka müşteri siparişi göremez ve iptal edemez');
end $$;
select test.login(test.uid('seller1'));
do $$
declare v_o uuid := current_setting('test.order1')::uuid;
begin
  assert (select count(*) from public.orders) = 0, 'Başka satıcı siparişi göremez';
  perform test.throws(format($q$select public.transition_order(%L, 'preparing')$q$, v_o), 'ORDER_NOT_FOUND');
  perform test.ok('sipariş: başka satıcı siparişi göremez ve yönetemez');
end $$;
select test.login(test.uid('cust1'));
do $$
declare v_o uuid := current_setting('test.order1')::uuid;
begin
  -- Müşteri kargolayamaz / teslim edemez
  perform test.throws(format($q$select public.transition_order(%L, 'preparing')$q$, v_o), 'FORBIDDEN');
  perform test.throws(format($q$select public.transition_order(%L, 'shipped')$q$, v_o), 'INVALID_TRANSITION');
  perform test.ok('sipariş: müşteri kargolayamaz / hazırlayamaz');
end $$;
commit;

-- Sipariş yaşam döngüsü: iptal + stok iadesi bir kez
begin;
select test.login(test.uid('cust1'));
do $$
declare
  d jsonb := '{"ship_to":{"name":"Ayşe Kaya","phone":"0532 111 22 33","city":"İstanbul","district":"Kadıköy","address":"Moda Cad. No 5 D 3"}}'::jsonb;
  r jsonb; v_o uuid; v_s0 int; v_ledger int;
begin
  select stock into v_s0 from public.products where id = 'b0000000-0000-0000-0000-000000000021';
  r := public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000021","quantity":3}]', d, 'key-life-0001');
  v_o := (r -> 'orders' -> 0 ->> 'id')::uuid;
  assert (select stock from public.products where id = 'b0000000-0000-0000-0000-000000000021') = v_s0 - 3;
  -- Müşteri iptal eder → stok bir kez geri gelir
  perform public.transition_order(v_o, 'cancelled', 'Vazgeçtim');
  assert (select stock from public.products where id = 'b0000000-0000-0000-0000-000000000021') = v_s0, 'İptalde stok iade edilir';
  perform test.throws(format($q$select public.transition_order(%L, 'cancelled')$q$, v_o), 'INVALID_TRANSITION');
  assert (select stock from public.products where id = 'b0000000-0000-0000-0000-000000000021') = v_s0, 'İptal ikinci kez stok iade etmez';
  assert (select count(*) from public.stock_movements where reference_id = v_o and movement_type = 'order_cancel') = 0, 'Müşteri stok hareketini göremez';
  perform test.ok('sipariş: iptalde stok yalnızca bir kez iade edilir');
  reset role;
  assert (select count(*) from public.stock_movements where reference_id = v_o and movement_type = 'order_cancel') = 1, 'Tek iade hareketi';
  assert (select status from public.seller_ledger where order_id = v_o) = 'reversed', 'İptalde hakediş kaydı geri alınır';
  assert (select stock_restored_at is not null from public.orders where id = v_o);
  perform test.ok('sipariş: iptal hakediş kaydını geri alır');
end $$;
commit;

-- Teslim edilen sipariş iptal edilemez; hakediş bekleme süresi
begin;
select test.login(test.uid('cust1'));
do $$
declare
  d jsonb := '{"ship_to":{"name":"Ayşe Kaya","phone":"0532 111 22 33","city":"İstanbul","district":"Kadıköy","address":"Moda Cad. No 5 D 3"}}'::jsonb;
  r jsonb; v_o uuid;
begin
  r := public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000021","quantity":2}]', d, 'key-deliv-0001');
  v_o := (r -> 'orders' -> 0 ->> 'id')::uuid;
  perform set_config('test.deliv', v_o::text, false);
  perform set_config('test.deliv_item', (select id::text from public.order_items where order_id = v_o), false);
end $$;
select test.login(test.uid('seller2'));
do $$
declare v_o uuid := current_setting('test.deliv')::uuid; r jsonb;
begin
  perform public.transition_order(v_o, 'preparing');
  perform public.transition_order(v_o, 'ready_to_ship', null, 'Yurtiçi Kargo', 'TRK123');
  perform test.throws(format($q$select public.transition_order(%L, 'delivered')$q$, v_o), 'INVALID_TRANSITION');
  perform public.transition_order(v_o, 'shipped', null, 'Yurtiçi Kargo', 'TRK123');
  assert (select tracking_no from public.order_shipments where order_id = v_o) = 'TRK123';
  perform public.transition_order(v_o, 'delivered');
  perform test.throws(format($q$select public.transition_order(%L, 'cancelled')$q$, v_o), 'INVALID_TRANSITION');
  perform test.throws(format($q$select public.transition_order(%L, 'shipped')$q$, v_o), 'INVALID_TRANSITION');
  assert (select count(*) from public.order_events where order_id = v_o) = 5, 'Zaman çizelgesi: new, preparing, ready, shipped, delivered';
  assert (select available_at > now() + interval '13 days' from public.seller_ledger where order_id = v_o), 'Hakediş teslimden 14 gün sonra ödemeye açılır';
  perform test.ok('sipariş: tam yaşam döngüsü; teslim edilen sipariş iptal edilemez');
end $$;
select test.login(test.uid('cust1'));
do $$
declare v_o uuid := current_setting('test.deliv')::uuid;
begin
  perform test.throws(format($q$select public.transition_order(%L, 'cancelled')$q$, v_o), 'INVALID_TRANSITION');
end $$;
commit;

-- ═══ 9. İadeler ══════════════════════════════════════════════════════════════
begin;
select test.login(test.uid('cust2'));
do $$
declare v_item uuid := current_setting('test.deliv_item')::uuid;
begin
  perform test.throws(format($q$select public.create_return(%L, 1, 'defective')$q$, v_item), 'ITEM_NOT_FOUND');
  perform test.ok('iade: başka müşteri iade açamaz');
end $$;
select test.login(test.uid('cust1'));
do $$
declare v_item uuid := current_setting('test.deliv_item')::uuid; r jsonb; v_ret uuid;
begin
  perform test.throws(format($q$select public.create_return(%L, 0, 'defective')$q$, v_item), 'INVALID_QUANTITY');
  perform test.throws(format($q$select public.create_return(%L, 3, 'defective')$q$, v_item), 'INVALID_QUANTITY');
  perform test.throws(format($q$select public.create_return(%L, 1, 'nonsense')$q$, v_item), 'INVALID_REASON');
  r := public.create_return(v_item, 1, 'defective', 'Çalışmıyor');
  v_ret := (r ->> 'id')::uuid;
  perform set_config('test.ret', v_ret::text, false);
  assert (r ->> 'refund_amount')::numeric = 80, 'İade tutarı = birim fiyat × adet';
  -- Aynı kalemden iade edilebilir adet: 2 - 1 = 1
  perform test.throws(format($q$select public.create_return(%L, 2, 'defective')$q$, v_item), 'INVALID_QUANTITY');
  -- Müşteri onaylayamaz
  perform test.throws(format($q$select public.transition_return(%L, 'approved')$q$, v_ret), '42501');
  perform test.ok('iade: müşteri oluşturur, onaylayamaz; adet ve neden doğrulanır');
end $$;
select test.login(test.uid('seller1'));
do $$
declare v_ret uuid := current_setting('test.ret')::uuid;
begin
  assert (select count(*) from public.returns) = 0, 'Başka satıcı iadeyi göremez';
  perform test.throws(format($q$select public.transition_return(%L, 'approved')$q$, v_ret), 'RETURN_NOT_FOUND');
  perform test.ok('iade: başka satıcı göremez ve yönetemez');
end $$;
select test.login(test.uid('seller2'));
do $$
declare v_ret uuid := current_setting('test.ret')::uuid; v_stock int;
begin
  assert (select count(*) from public.returns) = 1, 'Satıcı kendi iadesini görür';
  perform test.throws(format($q$select public.transition_return(%L, 'received')$q$, v_ret), 'INVALID_TRANSITION');
  perform test.throws(format($q$select public.transition_return(%L, 'rejected')$q$, v_ret), 'REASON_REQUIRED');
  perform public.transition_return(v_ret, 'approved');
  -- Satıcı "müşteri kargoladı" diyemez
  perform test.throws(format($q$select public.transition_return(%L, 'shipped')$q$, v_ret), '42501');
end $$;
select test.login(test.uid('cust1'));
do $$
declare v_ret uuid := current_setting('test.ret')::uuid;
begin
  perform public.transition_return(v_ret, 'shipped', null, 'Aras Kargo', 'IADE-1');
end $$;
select test.login(test.uid('seller2'));
do $$
declare v_ret uuid := current_setting('test.ret')::uuid; v_before int; v_after int;
begin
  select stock into v_before from public.products where id = 'b0000000-0000-0000-0000-000000000021';
  perform public.transition_return(v_ret, 'received', null, null, null, true);
  select stock into v_after from public.products where id = 'b0000000-0000-0000-0000-000000000021';
  assert v_after = v_before + 1, 'Teslim alınan iade stoğa geri eklenir';
  perform public.transition_return(v_ret, 'refunded');
  assert (select net_amount from public.seller_ledger where return_id = v_ret) = -80, 'İade hakediş defterine negatif yazılır';
  perform test.throws(format($q$select public.transition_return(%L, 'refunded')$q$, v_ret), 'INVALID_TRANSITION');
  assert (select count(*) from public.return_events where return_id = v_ret) = 5, 'İade zaman çizelgesi (requested, approved, shipped, received, refunded)';
  perform test.ok('iade: tam akış (talep→onay→kargo→teslim→iade), stok ve hakediş kancaları');
end $$;
commit;

-- İade penceresi
begin;
select test.login(test.uid('cust1'));
do $$
declare
  d jsonb := '{"ship_to":{"name":"Ayşe Kaya","phone":"0532 111 22 33","city":"İstanbul","district":"Kadıköy","address":"Moda Cad. No 5 D 3"}}'::jsonb;
  r jsonb; v_o uuid; v_item uuid;
begin
  r := public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000021","quantity":1}]', d, 'key-win-0001');
  v_o := (r -> 'orders' -> 0 ->> 'id')::uuid;
  select id into v_item from public.order_items where order_id = v_o;
  -- Teslim edilmemiş sipariş için iade yok
  perform test.throws(format($q$select public.create_return(%L, 1, 'defective')$q$, v_item), 'NOT_DELIVERED');
  reset role;
  update public.orders set status = 'delivered', delivered_at = now() - interval '20 days' where id = v_o;
  perform test.login(test.uid('cust1'));
  perform test.throws(format($q$select public.create_return(%L, 1, 'defective')$q$, v_item), 'RETURN_WINDOW');
  perform test.ok('iade: yalnızca teslim edilmiş ve süresi dolmamış siparişler');
end $$;
rollback;

-- ═══ 10. Soru–Cevap ══════════════════════════════════════════════════════════
begin;
select test.login(test.uid('cust1'));
do $$
declare r jsonb; v_q uuid;
begin
  r := public.ask_question('b0000000-0000-0000-0000-000000000021', 'Bu ürünün garantisi kaç yıl?');
  v_q := (r ->> 'id')::uuid;
  perform set_config('test.q', v_q::text, false);
  perform test.throws($q$select public.ask_question('b0000000-0000-0000-0000-000000000021', 'abc')$q$, 'INVALID_QUESTION');
  perform test.throws($q$select public.ask_question('b0000000-0000-0000-0000-000000000003', 'Pasif ürün için soru?')$q$, 'PRODUCT_NOT_FOUND');
  assert (select count(*) from public.product_questions) = 1, 'Soran kendi sorusunu görür';
  assert (select asker_display from public.product_questions where id = v_q) = 'A*** K.', 'Ad maskelenir';
  perform test.throws($q$select asker_id from public.product_questions$q$, '42501');
end $$;
select test.anon();
do $$
begin
  assert (select count(*) from public.product_questions) = 0, 'Yanıtsız soru herkese açık değil';
end $$;
select test.login(test.uid('cust2'));
do $$
begin
  assert (select count(*) from public.product_questions) = 0, 'Başka müşteri yanıtsız soruyu görmez';
  perform test.throws(format($q$select public.answer_question(%L, 'Sahte yanıt')$q$, current_setting('test.q')::uuid), 'QUESTION_NOT_FOUND');
end $$;
select test.login(test.uid('seller1'));
do $$
begin
  assert (select count(*) from public.product_questions) = 0, 'Başka mağaza sahibi soruyu görmez';
  perform test.throws(format($q$select public.answer_question(%L, 'Sahte yanıt')$q$, current_setting('test.q')::uuid), 'QUESTION_NOT_FOUND');
end $$;
select test.login(test.uid('seller2'));
do $$
declare v_q uuid := current_setting('test.q')::uuid;
begin
  assert (select count(*) from public.product_questions) = 1, 'Mağaza sahibi kendi sorusunu görür';
  perform test.throws(format($q$select public.answer_question(%L, 'x')$q$, v_q), 'INVALID_ANSWER');
  perform public.answer_question(v_q, '2 yıl resmi garanti.');
end $$;
select test.anon();
do $$
begin
  assert (select count(*) from public.product_questions) = 1, 'Yanıtlanan soru herkese açık';
  assert (select answer from public.product_questions limit 1) = '2 yıl resmi garanti.';
end $$;
select test.login(test.uid('seller2'));
do $$
declare v_q uuid := current_setting('test.q')::uuid;
begin
  perform public.set_question_hidden(v_q, true);
end $$;
select test.anon();
do $$
begin
  assert (select count(*) from public.product_questions) = 0, 'Gizlenen soru yayından kalkar';
  perform test.ok('soru-cevap: yalnızca yanıtlanmış ve yayında olan sorular herkese açık; yetkisiz yanıtlama yok');
end $$;
commit;

-- Hız sınırı
begin;
select test.login(test.uid('cust2'));
do $$
declare i int;
begin
  for i in 1..2 loop
    perform public.ask_question('b0000000-0000-0000-0000-000000000021', 'Deneme sorusu numara ' || i);
  end loop;
  -- Aynı üründe yanıtsız 2 soru → 3.'sü engellenir
  perform test.throws($q$select public.ask_question('b0000000-0000-0000-0000-000000000021', 'Deneme sorusu numara 3')$q$, 'RATE_LIMIT');
  perform test.ok('soru-cevap: hız sınırı (aynı üründe yanıtsız en fazla 2 soru)');
end $$;
rollback;

-- ═══ 11. Favori ve adres ═════════════════════════════════════════════════════
begin;
select test.login(test.uid('cust1'));
do $$
declare i int;
begin
  insert into public.favorites (user_id, product_slug) values (test.uid('cust1'), 'demo-abc');
  perform test.throws($q$insert into public.favorites (user_id, product_slug) values (test.uid('cust1'), 'demo-abc')$q$, '23505');
  perform test.throws($q$insert into public.favorites (user_id, product_slug) values (test.uid('cust2'), 'demo-zzz')$q$, '42501');
  perform test.ok('favori: aynı ürün iki kez eklenemez, başkası adına eklenemez');

  insert into public.addresses (user_id, title, full_name, phone, city, district, address_line) values (test.uid('cust1'), 'Ev', 'Ayşe Kaya', '0532 111 22 33', 'İstanbul', 'Kadıköy', 'Moda Cad. No 5');
  insert into public.addresses (user_id, title, full_name, phone, city, district, address_line, is_default) values (test.uid('cust1'), 'İş', 'Ayşe Kaya', '0532 111 22 33', 'İstanbul', 'Şişli', 'Büyükdere Cad. 1', true);
  assert (select count(*) from public.addresses where is_default) = 1, 'Tek varsayılan adres';
  assert (select title from public.addresses where is_default) = 'İş';
  perform test.throws($q$insert into public.addresses (user_id, title, full_name, phone, city, district, address_line) values (test.uid('cust1'), 'X', 'Ayşe', 'abc', 'İstanbul', 'Kadıköy', 'Adres satırı')$q$, '23514');
  for i in 1..8 loop
    insert into public.addresses (user_id, title, full_name, phone, city, district, address_line) values (test.uid('cust1'), 'A' || i, 'Ayşe Kaya', '0532 111 22 33', 'İstanbul', 'Kadıköy', 'Adres satırı ' || i);
  end loop;
  perform test.throws($q$insert into public.addresses (user_id, title, full_name, phone, city, district, address_line) values (test.uid('cust1'), 'Fazla', 'Ayşe Kaya', '0532 111 22 33', 'İstanbul', 'Kadıköy', 'Adres satırı x')$q$, 'ADDRESS_LIMIT');
  perform test.ok('adres: tek varsayılan, telefon doğrulaması, en fazla 10 adres');
end $$;
select test.login(test.uid('cust2'));
do $$
begin
  assert (select count(*) from public.addresses) = 0, 'Başka müşteri adresleri görünmez';
  assert (select count(*) from public.favorites) = 0, 'Başka müşteri favorileri görünmez';
end $$;
rollback;

-- ═══ 12. Ödemeler ════════════════════════════════════════════════════════════
begin;
select test.login(test.uid('seller2'));
select test.throws($$select public.plan_payout((select id from public.stores where owner_id = test.uid('seller2')))$$, '42501');
select test.login(test.uid('admin'));
select test.throws($$select public.plan_payout((select id from public.stores where owner_id = test.uid('seller2')))$$, 'NO_BALANCE');
rollback;

-- Ödeme akışı (bekleme süresi geçmiş gibi)
begin;
select test.login(test.uid('cust1'));
do $$
declare
  d jsonb := '{"ship_to":{"name":"Ayşe Kaya","phone":"0532 111 22 33","city":"İstanbul","district":"Kadıköy","address":"Moda Cad. No 5 D 3"}}'::jsonb;
  r jsonb; v_o uuid;
begin
  r := public.place_order('[{"product_id":"b0000000-0000-0000-0000-000000000021","quantity":1}]', d, 'key-pay-0001');
  perform set_config('test.payorder', (r -> 'orders' -> 0 ->> 'id'), false);
end $$;
select test.login(test.uid('seller2'));
do $$ declare v_o uuid := current_setting('test.payorder')::uuid; begin
  perform public.transition_order(v_o, 'preparing');
  perform public.transition_order(v_o, 'shipped');
  perform public.transition_order(v_o, 'delivered');
end $$;
select test.admin_session();
update public.seller_ledger set available_at = now() - interval '1 day' where entry_type = 'sale' and status = 'pending' and available_at is not null;
select test.login(test.uid('seller2'));
do $$
declare v_bal numeric;
begin
  select coalesce(sum(net_amount), 0) into v_bal from public.seller_ledger where status = 'pending' and payout_id is null and available_at <= now();
  assert v_bal <> 0, 'Çekilebilir bakiye var';
  assert (select count(*) from public.seller_ledger) >= 2, 'Satıcı kendi hakediş kayıtlarını görür';
end $$;
select test.login(test.uid('cust1'));
do $$ begin assert (select count(*) from public.seller_ledger) = 0, 'Müşteri hakediş görmez'; end $$;
select test.login(test.uid('seller1'));
do $$ begin assert (select count(*) from public.seller_ledger) = 0, 'Başka satıcı hakedişi görmez'; end $$;
select test.login(test.uid('admin'));
do $$
declare r jsonb; v_id uuid;
begin
  r := public.plan_payout((select id from public.stores where owner_id = test.uid('seller2')));
  v_id := (r ->> 'id')::uuid;
  assert (r ->> 'amount')::numeric > 0;
  perform test.throws($q$select public.plan_payout((select id from public.stores where owner_id = test.uid('seller2')))$q$, 'NO_BALANCE');
  perform public.set_payout_status(v_id, 'paid', 'manual', 'REF-1');
  assert (select count(*) from public.seller_ledger where payout_id = v_id and status = 'paid') >= 1, 'Ödenen kayıtlar paid';
  perform test.throws(format($q$select public.set_payout_status(%L, 'cancelled')$q$, v_id), 'INVALID_TRANSITION');
  perform test.ok('ödeme: yalnızca yönetici planlar, kayıtlar ödenince paid olur, çift ödeme yok');
end $$;
rollback;

-- ═══ 13. Storage politikaları ════════════════════════════════════════════════
begin;
select test.login(test.uid('seller1'));
do $$
declare v_store uuid := (select id from public.stores where owner_id = test.uid('seller1')); v_other uuid := (select id from public.stores where owner_id = test.uid('seller2'));
begin
  insert into storage.objects (bucket_id, name) values ('product-images', v_store || '/p1/a.webp');
  perform test.throws(format($q$insert into storage.objects (bucket_id, name) values ('product-images', %L)$q$, v_other || '/p1/a.webp'), '42501');
  perform test.throws(format($q$insert into storage.objects (bucket_id, name) values ('product-images', %L)$q$, v_store || '/p1/evil.exe'), '42501');
  insert into storage.objects (bucket_id, name) values ('avatars', test.uid('seller1') || '/me.png');
  perform test.throws(format($q$insert into storage.objects (bucket_id, name) values ('avatars', %L)$q$, test.uid('seller2') || '/me.png'), '42501');
  perform test.ok('storage: yalnızca kendi klasörü ve izinli uzantılar');
end $$;
select test.login(test.uid('cust1'));
do $$
declare v_store uuid := (select id from public.stores where owner_id = test.uid('seller1'));
begin
  perform test.throws(format($q$insert into storage.objects (bucket_id, name) values ('product-images', %L)$q$, v_store || '/p1/x.webp'), '42501');
end $$;
rollback;

-- ═══ Özet ════════════════════════════════════════════════════════════════════
\warn 'Tüm kural testleri tamamlandı.'
