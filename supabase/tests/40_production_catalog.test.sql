-- Local only. Runs after 10_rules and 30_seller_documents.
begin;
reset role;
insert into auth.users(id, email, raw_user_meta_data) values
('d0000000-0000-0000-0000-000000000001','hardening@example.test','{"full_name":"Yeni Satıcı"}');
select test.login('d0000000-0000-0000-0000-000000000001');
select public.submit_seller_application('Güvenli Şık Mağaza', 'Yeni mağaza', 'vitrin-plus',
'{"sellerType":"sahis","password":"SECRET","tcKimlikNo":"12345678901","dogumTarihi":"1990-01-01","extra":{"secret":"SECRET"},"contact":{"name":"Satıcı","password":"SECRET"},"business":{"vergiNumarasi":"12345678901","tcKimlikNo":"12345678901"},"bank":{"iban":"TR12345678901234567890123456","ibanMasked":"TR12345678901234567890123456"},"store":{"name":"Güvenli","categories":["Elektronik",{"password":"SECRET"}]},"documents":{"unknown":{"password":"SECRET"}}}');
do $$ declare a jsonb; begin
  select application into a from public.seller_accounts where owner_id = auth.uid();
  assert a ->> 'sellerType' = 'sahis';
  assert a #>> '{contact,name}' = 'Satıcı';
  assert a::text not like '%SECRET%' and a::text not like '%12345678901%' and a::text not like '%1990-01-01%';
  assert a #>> '{bank,ibanMasked}' = 'TR** **** **** **** **** 3456';
  assert a #> '{store,categories}' = '["Elektronik"]'::jsonb;
  assert a -> 'documents' = '{}'::jsonb;
  perform test.ok('application: nested allowlist, TCKN removal, forced IBAN mask, typed arrays');
end $$;
select test.login(test.uid('admin'));
select test.throws($q$select public.admin_set_seller_status((select id from public.seller_accounts where owner_id = 'd0000000-0000-0000-0000-000000000001'), 'approved')$q$, 'REVIEW_REQUIRED');
select test.throws($q$select public.admin_set_seller_status((select id from public.seller_accounts where owner_id = 'd0000000-0000-0000-0000-000000000001'), 'suspended')$q$, 'REVIEW_REQUIRED');
select public.admin_review_seller_application((select id from public.seller_accounts where owner_id = 'd0000000-0000-0000-0000-000000000001'), 'approve');
select test.login('d0000000-0000-0000-0000-000000000001');
insert into public.products(id, store_id, name, sku, category, brand, price, stock, status)
values ('d1000000-0000-0000-0000-000000000001', (select id from public.stores where owner_id = auth.uid()), 'Şık Kulaklık', 'HARD-1', 'Elektronik', 'İyi Marka', 100, 10, 'active'),
('d1000000-0000-0000-0000-000000000002', (select id from public.stores where owner_id = auth.uid()), 'Şık Kulaklık', 'HARD-2', 'Elektronik', 'İyi Marka', 100, 0, 'active'),
('d1000000-0000-0000-0000-000000000003', (select id from public.stores where owner_id = auth.uid()), 'Gizli Ürün', 'HARD-3', 'Elektronik', null, 100, 10, 'draft');
insert into public.product_variants(id, product_id, label, stock, sort_order)
values ('d2000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000002','Siyah',5,0);
do $$ declare old_slug text; begin
  select slug into old_slug from public.products where id = 'd1000000-0000-0000-0000-000000000001';
  assert old_slug = 'sik-kulaklik-d1000000-0000-0000-0000-000000000001';
  update public.products set name = 'Yeni Şık Kulaklık' where id = 'd1000000-0000-0000-0000-000000000001';
  assert (select slug from public.products where id = 'd1000000-0000-0000-0000-000000000001') = old_slug;
  assert (select count(distinct slug) from public.products where sku in ('HARD-1','HARD-2')) = 2;
  perform test.ok('slugs: normalized, unique and stable across rename');
end $$;
select test.anon();
do $$ declare item jsonb; begin
  select to_jsonb(c) into item from public.public_catalog c where id = 'd1000000-0000-0000-0000-000000000001';
  assert item ->> 'name' = 'Yeni Şık Kulaklık';
  assert not (item ? 'seller_id') and not (item ? 'owner_id');
  assert item ->> 'search_text' like '%iyi marka elektronik guvenli sik magaza%';
  assert not exists(select 1 from public.public_catalog where id = 'd1000000-0000-0000-0000-000000000003');
  assert (select jsonb_array_length(product_variants) from public.public_catalog where id = 'd1000000-0000-0000-0000-000000000002') = 1;
  assert (select product_count from public.public_stores where name = 'Güvenli Şık Mağaza') = 2;
  perform test.throws('select seller_id from public.products limit 1', '42501');
  perform test.throws('select owner_id from public.stores limit 1', '42501');
  perform test.ok('public: no ownership UUIDs, RLS, real counts, variants and Turkish search');
end $$;
select test.login(test.uid('cust1'));
do $$ declare r jsonb; begin
  r := public.place_order('[{"product_id":"d1000000-0000-0000-0000-000000000001","quantity":1},{"product_id":"d1000000-0000-0000-0000-000000000002","variant_label":"Siyah","quantity":1}]',
    '{"ship_to":{"name":"Ayşe Kaya","phone":"0532 111 22 33","city":"İstanbul","district":"Kadıköy","address":"Moda Cad. No 5 D 3"},"coupon":"VITRINPLUS10"}', 'hardening-order-0001');
  assert (r #>> '{orders,0,discount_total}')::numeric = 0;
  perform test.ok('coupon: raw RPC coupon cannot discount a new order');
end $$;
select test.login('d0000000-0000-0000-0000-000000000001');
do $$ begin
  perform test.throws($q$select public.adjust_stock('d1000000-0000-0000-0000-000000000001',null,'set',15,'Stale',10)$q$, 'STOCK_CONFLICT');
  perform test.throws($q$select public.adjust_stock('d1000000-0000-0000-0000-000000000001',null,'set',15)$q$, 'STOCK_CONFLICT');
  assert (select stock from public.products where id = 'd1000000-0000-0000-0000-000000000001') = 9;
  perform public.adjust_stock('d1000000-0000-0000-0000-000000000001',null,'add',5);
  assert (select stock from public.products where id = 'd1000000-0000-0000-0000-000000000001') = 14;
  perform test.throws($q$select public.adjust_stock('d1000000-0000-0000-0000-000000000002','d2000000-0000-0000-0000-000000000001','set',7,'Stale',5)$q$, 'STOCK_CONFLICT');
  perform public.adjust_stock('d1000000-0000-0000-0000-000000000002','d2000000-0000-0000-0000-000000000001','set',7,'Fresh',4);
  assert (select stock from public.products where id = 'd1000000-0000-0000-0000-000000000002') = 7;
  perform test.throws($q$select public.adjust_stock('d1000000-0000-0000-0000-000000000001',null,'remove',15)$q$, 'STOCK_NEGATIVE');
  assert (select count(*) from public.stock_movements where product_id = 'd1000000-0000-0000-0000-000000000001' and movement_type = 'manual_add' and stock_before = 9 and stock_after = 14) = 1;
  perform test.ok('stock: stale counts rejected after sale; atomic deltas and variant movements preserved');
end $$;
select test.login(test.uid('admin'));
select public.admin_set_seller_status((select id from public.seller_accounts where owner_id = 'd0000000-0000-0000-0000-000000000001'), 'suspended');
select test.anon();
do $$ begin
  assert not exists(select 1 from public.public_stores where name = 'Güvenli Şık Mağaza');
  assert not exists(select 1 from public.public_catalog where id = 'd1000000-0000-0000-0000-000000000001');
  perform test.ok('suspended: both store and products disappear from public views');
end $$;
rollback;
