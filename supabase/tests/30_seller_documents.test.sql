-- ============================================================================
-- VitrinPlus · Aşama 2 · 0007 testleri: özel belge kovası, belge kayıtları, başvuru inceleme kararı
--
-- Çalıştırma: run-local.sh migration'lar + 10_rules.test.sql'den SONRA çalıştırır. Gerçek Supabase'te ÇALIŞTIRMA.
-- API'yi taklit eder: `set local role authenticated|anon` + JWT `sub` claim'i.
-- ============================================================================
\set ON_ERROR_STOP on
\set QUIET on

create schema if not exists test;
grant usage on schema test to public;

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

create or replace function test.ok(p_name text) returns void language plpgsql as $$
begin
  raise notice 'PASS: %', p_name;
end $$;

create or replace function test.sd_uid(p_name text) returns uuid language sql immutable as $$
  select case p_name
    when 'admin' then 'b0000000-0000-4000-8000-0000000000a1'::uuid
    when 'sel1'  then 'b0000000-0000-4000-8000-0000000000b1'::uuid
    when 'sel2'  then 'b0000000-0000-4000-8000-0000000000b2'::uuid
    when 'cust'  then 'b0000000-0000-4000-8000-0000000000c1'::uuid
  end
$$;

-- Belge yolu üretir: {kullanıcı}/{tür}/{sabit uuid}.{uzantı}
create or replace function test.doc_path(p_user text, p_type text, p_n integer, p_ext text default 'pdf') returns text language sql immutable as $$
  select test.sd_uid(p_user)::text || '/' || p_type || '/' || ('d0000000-0000-4000-8000-' || lpad(p_n::text, 12, '0')) || '.' || p_ext
$$;

-- ═══ 0. Kurulum ══════════════════════════════════════════════════════════════
insert into auth.users (id, email, raw_user_meta_data) values
  (test.sd_uid('admin'), 'sd-admin@example.com', '{"full_name":"Belge Yöneticisi"}'),
  (test.sd_uid('sel1'),  'sd-sel1@example.com',  '{"full_name":"Belge Satıcı Bir"}'),
  (test.sd_uid('sel2'),  'sd-sel2@example.com',  '{"full_name":"Belge Satıcı İki"}'),
  (test.sd_uid('cust'),  'sd-cust@example.com',  '{"full_name":"Belge Müşteri"}');
update public.profiles set role = 'admin' where id = test.sd_uid('admin');

begin;
select test.login(test.sd_uid('sel1'));
select public.submit_seller_application('Belge Mağazası Bir', 'Açıklama', 'vitrin', '{"version":1,"sellerType":"sahis"}');
select test.login(test.sd_uid('sel2'));
select public.submit_seller_application('Belge Mağazası İki', 'Açıklama', 'vitrin-plus', '{"version":1,"sellerType":"limited-as"}');
commit;

-- ═══ 1. Kova ÖZEL ve sınırlı ═════════════════════════════════════════════════
do $$
declare b record;
begin
  select * into b from storage.buckets where id = 'seller-documents';
  assert found, 'seller-documents kovası oluşmalı';
  assert b.public = false, 'seller-documents kovası ÖZEL olmalı (public = false)';
  assert b.file_size_limit = 10485760, 'Boyut sınırı 10 MB';
  assert b.allowed_mime_types @> array['application/pdf', 'image/jpeg', 'image/png'] and cardinality(b.allowed_mime_types) = 3, 'Yalnızca pdf/jpeg/png';
  -- Diğer (görsel) kovaları bu migration tarafından değiştirilmemiş olmalı.
  assert (select count(*) from storage.buckets where public) = 3, 'Herkese açık kova sayısı değişmemeli (yalnızca 3 görsel kovası)';
  perform test.ok('kova: seller-documents özel, 10 MB, yalnızca pdf/jpg/png; diğer kovalar aynı');
end $$;

-- ═══ 2. Tablo: yalnızca okuma; doğrudan yazma yok ═══════════════════════════
begin;
select test.anon();
select test.throws($$select * from public.seller_documents$$, '42501');
select test.login(test.sd_uid('sel1'));
select test.throws($$insert into public.seller_documents (seller_account_id, owner_id, doc_type, storage_path, original_name, mime_type, size_bytes)
  values ((select id from public.seller_accounts where owner_id = test.sd_uid('sel1')), test.sd_uid('sel1'), 'kimlik', 'x', 'x.pdf', 'application/pdf', 10)$$, '42501');
select test.throws($$update public.seller_documents set original_name = 'x'$$, '42501');
select test.throws($$delete from public.seller_documents$$, '42501');
do $$ begin perform test.ok('seller_documents: anon okuyamaz; API rolü doğrudan yazamaz'); end $$;
rollback;

-- ═══ 3. Yükleme politikası (storage.objects) ════════════════════════════════
begin;
select test.login(test.sd_uid('sel1'));
do $$
begin
  insert into storage.objects (bucket_id, name) values ('seller-documents', test.doc_path('sel1', 'kimlik', 1));
  insert into storage.objects (bucket_id, name) values ('seller-documents', test.doc_path('sel1', 'vergiLevhasi', 2, 'png'));
  -- Başkasının klasörüne yazamaz
  perform test.throws(format($q$insert into storage.objects (bucket_id, name) values ('seller-documents', %L)$q$, test.doc_path('sel2', 'kimlik', 3)), '42501');
  -- Yasak uzantı, bilinmeyen belge türü, düz dosya adı, yol dolanımı
  perform test.throws(format($q$insert into storage.objects (bucket_id, name) values ('seller-documents', %L)$q$, test.doc_path('sel1', 'kimlik', 4, 'exe')), '42501');
  perform test.throws(format($q$insert into storage.objects (bucket_id, name) values ('seller-documents', %L)$q$, test.doc_path('sel1', 'gizli', 5)), '42501');
  perform test.throws(format($q$insert into storage.objects (bucket_id, name) values ('seller-documents', %L)$q$, test.sd_uid('sel1')::text || '/kimlik.pdf'), '42501');
  perform test.throws(format($q$insert into storage.objects (bucket_id, name) values ('seller-documents', %L)$q$, test.sd_uid('sel1')::text || '/kimlik/../../x.pdf'), '42501');
  perform test.ok('storage: yalnızca kendi klasörü, izinli tür ve uzantı, doğru yol biçimi');
end $$;
-- Müşteri (başvurusu yok) kendi klasörüne yükleyebilir ama başkasınınkine yükleyemez
select test.login(test.sd_uid('cust'));
do $$
begin
  perform test.throws(format($q$insert into storage.objects (bucket_id, name) values ('seller-documents', %L)$q$, test.doc_path('sel1', 'kimlik', 6)), '42501');
end $$;
select test.anon();
select test.throws(format($q$insert into storage.objects (bucket_id, name) values ('seller-documents', %L)$q$, test.doc_path('sel1', 'kimlik', 7)), '42501');
rollback;

-- ═══ 4. Belge kaydı RPC'si ═══════════════════════════════════════════════════
begin;
select test.login(test.sd_uid('sel1'));
do $$
declare r jsonb; v_id uuid;
begin
  insert into storage.objects (bucket_id, name) values ('seller-documents', test.doc_path('sel1', 'kimlik', 11));
  r := public.register_seller_documents(jsonb_build_array(jsonb_build_object('doc_type', 'kimlik', 'path', test.doc_path('sel1', 'kimlik', 11), 'name', 'kimlik.pdf', 'mime', 'application/pdf', 'size', 12345)));
  assert (r ->> 'registered')::int = 1, 'Bir belge kaydedilmeli';
  assert jsonb_array_length(r -> 'replaced_paths') = 0, 'İlk kayıtta değişen dosya yok';

  -- Doğrulamalar
  perform test.throws($q$select public.register_seller_documents('[]'::jsonb)$q$, 'INVALID_DOCUMENTS');
  perform test.throws($q$select public.register_seller_documents('{"a":1}'::jsonb)$q$, 'INVALID_DOCUMENTS');
  perform test.throws(format($q$select public.register_seller_documents(%L::jsonb)$q$, jsonb_build_array(jsonb_build_object('doc_type', 'kimlik', 'path', test.doc_path('sel2', 'kimlik', 12), 'name', 'a.pdf', 'mime', 'application/pdf', 'size', 10))), 'INVALID_DOCUMENT_PATH');
  perform test.throws(format($q$select public.register_seller_documents(%L::jsonb)$q$, jsonb_build_array(jsonb_build_object('doc_type', 'vergiLevhasi', 'path', test.doc_path('sel1', 'kimlik', 11), 'name', 'a.pdf', 'mime', 'application/pdf', 'size', 10))), 'INVALID_DOCUMENT_PATH');
  perform test.throws(format($q$select public.register_seller_documents(%L::jsonb)$q$, jsonb_build_array(jsonb_build_object('doc_type', 'kimlik', 'path', test.doc_path('sel1', 'kimlik', 13), 'name', 'a.pdf', 'mime', 'application/pdf', 'size', 10))), 'FILE_NOT_FOUND');
  perform test.throws(format($q$select public.register_seller_documents(%L::jsonb)$q$, jsonb_build_array(jsonb_build_object('doc_type', 'pasaport', 'path', test.doc_path('sel1', 'kimlik', 11), 'name', 'a.pdf', 'mime', 'application/pdf', 'size', 10))), 'INVALID_DOCUMENT_TYPE');
  perform test.throws(format($q$select public.register_seller_documents(%L::jsonb)$q$, jsonb_build_array(jsonb_build_object('doc_type', 'kimlik', 'path', test.doc_path('sel1', 'kimlik', 11), 'name', 'a.exe', 'mime', 'application/x-msdownload', 'size', 10))), 'INVALID_DOCUMENT_TYPE');
  perform test.throws(format($q$select public.register_seller_documents(%L::jsonb)$q$, jsonb_build_array(jsonb_build_object('doc_type', 'kimlik', 'path', test.doc_path('sel1', 'kimlik', 11), 'name', 'a.pdf', 'mime', 'application/pdf', 'size', 10485761))), 'DOCUMENT_TOO_LARGE');
  perform test.throws(format($q$select public.register_seller_documents(%L::jsonb)$q$, jsonb_build_array(jsonb_build_object('doc_type', 'kimlik', 'path', test.doc_path('sel1', 'kimlik', 11), 'name', 'a.pdf', 'mime', 'application/pdf', 'size', 'abc'))), 'DOCUMENT_TOO_LARGE');
  perform test.throws(format($q$select public.register_seller_documents(%L::jsonb)$q$, jsonb_build_array(jsonb_build_object('doc_type', 'kimlik', 'path', test.doc_path('sel1', 'kimlik', 11), 'name', '   ', 'mime', 'application/pdf', 'size', 10))), 'INVALID_DOCUMENT_NAME');
  perform test.ok('register: yol/tür/mime/boyut/ad doğrulamaları ve depolamada dosya varlığı');

  -- Yeniden yükleme eskisinin yerini alır; eski yol döner
  insert into storage.objects (bucket_id, name) values ('seller-documents', test.doc_path('sel1', 'kimlik', 14, 'jpg'));
  r := public.register_seller_documents(jsonb_build_array(jsonb_build_object('doc_type', 'kimlik', 'path', test.doc_path('sel1', 'kimlik', 14, 'jpg'), 'name', 'kimlik-yeni.jpg', 'mime', 'image/jpeg', 'size', 999)));
  assert r -> 'replaced_paths' ->> 0 = test.doc_path('sel1', 'kimlik', 11), 'Eski dosya yolu dönmeli';
  assert (select count(*) from public.seller_documents where owner_id = test.sd_uid('sel1')) = 1, 'Belge türü başına tek kayıt';
  assert (select original_name from public.seller_documents where owner_id = test.sd_uid('sel1') and doc_type = 'kimlik') = 'kimlik-yeni.jpg', 'Kayıt yenilenmeli';
  perform test.ok('register: yeniden yükleme eski kaydın yerini alır ve eski yolu bildirir');

  -- Silme: kayda bağlı dosya silinemez, değiştirilmiş (yetim) dosya silinebilir
  delete from storage.objects where bucket_id = 'seller-documents' and name = test.doc_path('sel1', 'kimlik', 14, 'jpg');
  assert exists (select 1 from storage.objects where name = test.doc_path('sel1', 'kimlik', 14, 'jpg')), 'Kayda bağlı belge silinememeli';
  delete from storage.objects where bucket_id = 'seller-documents' and name = test.doc_path('sel1', 'kimlik', 11);
  assert not exists (select 1 from storage.objects where name = test.doc_path('sel1', 'kimlik', 11)), 'Yetim eski dosya silinebilmeli';
  perform test.ok('storage silme: bağlı dosya korunur, yetim dosya silinir');
end $$;
commit;

-- Hesabı olmayan kullanıcı belge kaydedemez
begin;
select test.login(test.sd_uid('cust'));
select test.throws($$select public.register_seller_documents('[{"doc_type":"kimlik"}]'::jsonb)$$, 'NOT_FOUND');
select test.anon();
select test.throws($$select public.register_seller_documents('[{"doc_type":"kimlik"}]'::jsonb)$$, '42501');
rollback;

-- ═══ 5. Erişim yalıtımı: satıcı / müşteri / anon / yönetici ═════════════════
begin;
select test.login(test.sd_uid('sel2'));
do $$
begin
  insert into storage.objects (bucket_id, name) values ('seller-documents', test.doc_path('sel2', 'ticaretSicilBelgesi', 21));
  perform public.register_seller_documents(jsonb_build_array(jsonb_build_object('doc_type', 'ticaretSicilBelgesi', 'path', test.doc_path('sel2', 'ticaretSicilBelgesi', 21), 'name', 'sicil.pdf', 'mime', 'application/pdf', 'size', 500)));
end $$;
commit;

begin;
select test.login(test.sd_uid('sel2'));
do $$
begin
  assert (select count(*) from public.seller_documents) = 1, 'Satıcı iki yalnızca kendi belgesini görür';
  assert (select count(*) from public.seller_documents where owner_id = test.sd_uid('sel1')) = 0, 'Satıcı iki, satıcı birin belgesini göremez';
  assert (select count(*) from storage.objects where bucket_id = 'seller-documents') = 1, 'Satıcı iki yalnızca kendi dosyasını listeler';
  assert not exists (select 1 from storage.objects where name = test.doc_path('sel1', 'kimlik', 14, 'jpg')), 'Satıcı iki, satıcı birin dosyasını göremez (imzalı adres de üretemez)';
  assert (select count(*) from public.seller_accounts) = 1, 'Satıcı iki yalnızca kendi başvurusunu görür';
  perform test.ok('yalıtım: satıcı başka satıcının başvurusunu, belgesini ve dosyasını göremez');
end $$;
select test.login(test.sd_uid('cust'));
do $$
begin
  assert (select count(*) from public.seller_documents) = 0, 'Müşteri belge göremez';
  assert (select count(*) from storage.objects where bucket_id = 'seller-documents') = 0, 'Müşteri belge dosyası göremez';
  perform test.ok('yalıtım: müşteri hiçbir belge/dosya göremez');
end $$;
select test.anon();
do $$
begin
  assert (select count(*) from storage.objects where bucket_id = 'seller-documents') = 0, 'Anon belge dosyası göremez';
  perform test.ok('yalıtım: anon belge dosyası göremez');
end $$;
select test.login(test.sd_uid('admin'));
do $$
begin
  assert (select count(*) from public.seller_documents) = 2, 'Yönetici tüm belge kayıtlarını görür';
  assert (select count(*) from storage.objects where bucket_id = 'seller-documents') = 2, 'Yönetici tüm belge dosyalarını görür (imzalı adres üretebilir)';
  -- Yönetici başkası adına dosya yükleyemez / silemez
  perform test.throws(format($q$insert into storage.objects (bucket_id, name) values ('seller-documents', %L)$q$, test.doc_path('sel1', 'kimlik', 31)), '42501');
  delete from storage.objects where bucket_id = 'seller-documents';
  assert (select count(*) from storage.objects where bucket_id = 'seller-documents') = 2, 'Yönetici belge dosyalarını silemez';
  perform test.ok('yönetici: tüm belgeleri okur; yazma/silme yetkisi yok');
end $$;
rollback;

-- ═══ 6. Başvuru kararı ═══════════════════════════════════════════════════════
-- Yetkisiz
begin;
select test.login(test.sd_uid('sel1'));
select test.throws($$select public.admin_review_seller_application((select id from public.seller_accounts where owner_id = test.sd_uid('sel1')), 'approve')$$, '42501');
select test.login(test.sd_uid('cust'));
select test.throws($$select public.admin_review_seller_application((select id from public.seller_accounts limit 1), 'approve')$$, '42501');
select test.anon();
select test.throws($$select public.admin_review_seller_application('00000000-0000-0000-0000-000000000000', 'approve')$$, '42501');
rollback;

-- Onay
begin;
select test.login(test.sd_uid('admin'));
do $$
declare v_id uuid := (select id from public.seller_accounts where owner_id = test.sd_uid('sel1')); r jsonb;
begin
  perform test.throws(format($q$select public.admin_review_seller_application(%L, 'maybe')$q$, v_id), 'INVALID_STATUS');
  perform test.throws($q$select public.admin_review_seller_application('00000000-0000-0000-0000-000000000000', 'approve')$q$, 'NOT_FOUND');
  assert not (select is_active from public.stores where owner_id = test.sd_uid('sel1')), 'Onaydan önce mağaza pasif';
  r := public.admin_review_seller_application(v_id, 'approve');
  assert r ->> 'status' = 'approved', 'Durum approved';
  assert (select is_active from public.stores where owner_id = test.sd_uid('sel1')), 'Onay mağazayı aktifleştirmeli (mevcut tetikleyici)';
  assert (select role from public.profiles where id = test.sd_uid('sel1')) = 'seller', 'Onay satıcı rolü vermeli';
  assert (select reviewed_by from public.seller_accounts where id = v_id) = test.sd_uid('admin'), 'İnceleyen yönetici kaydedilmeli';
  assert (select reviewed_at from public.seller_accounts where id = v_id) is not null, 'İnceleme zamanı kaydedilmeli';
  assert (select rejection_reason from public.seller_accounts where id = v_id) is null, 'Onayda ret nedeni boş';
  -- Çift işlem: ikinci onay da, sonradan ret de reddedilir
  perform test.throws(format($q$select public.admin_review_seller_application(%L, 'approve')$q$, v_id), 'ALREADY_REVIEWED');
  perform test.throws(format($q$select public.admin_review_seller_application(%L, 'reject', 'Sonradan vazgeçtim')$q$, v_id), 'ALREADY_REVIEWED');
  assert (select status from public.seller_accounts where id = v_id) = 'approved', 'Durum değişmemeli';
  perform test.ok('karar/onay: mağaza aktif, rol seller, inceleyen kayıtlı; ikinci işlem ALREADY_REVIEWED');
end $$;
commit;

-- Onaylanan satıcı artık belge yükleyemez / kaydedemez / bağlı dosyayı silemez
begin;
select test.login(test.sd_uid('sel1'));
do $$
begin
  perform test.throws(format($q$insert into storage.objects (bucket_id, name) values ('seller-documents', %L)$q$, test.doc_path('sel1', 'vergiLevhasi', 41)), '42501');
  perform test.throws($q$select public.register_seller_documents('[{"doc_type":"kimlik"}]'::jsonb)$q$, 'DOCUMENTS_LOCKED');
  delete from storage.objects where bucket_id = 'seller-documents';
  assert (select count(*) from storage.objects where bucket_id = 'seller-documents') >= 1, 'Onaylı satıcı belge silemez';
  -- Kendi başvurusundaki durum alanını doğrudan değiştiremez
  perform test.throws($q$update public.seller_accounts set status = 'pending'$q$, '42501');
  perform test.ok('onay sonrası: belge yükleme/kayıt/silme kilitli');
end $$;
rollback;

-- Ret
begin;
select test.login(test.sd_uid('admin'));
do $$
declare v_id uuid := (select id from public.seller_accounts where owner_id = test.sd_uid('sel2')); r jsonb;
begin
  perform test.throws(format($q$select public.admin_review_seller_application(%L, 'reject')$q$, v_id), 'REASON_REQUIRED');
  perform test.throws(format($q$select public.admin_review_seller_application(%L, 'reject', '   ')$q$, v_id), 'REASON_REQUIRED');
  perform test.throws(format($q$select public.admin_review_seller_application(%L, 'reject', 'kısa')$q$, v_id), 'REASON_REQUIRED');
  assert (select status from public.seller_accounts where id = v_id) = 'pending', 'Reddedilemeyen başvuru beklemede kalmalı';
  r := public.admin_review_seller_application(v_id, 'reject', '  Vergi levhası okunaksız, güncel olanı yükleyin.  ');
  assert r ->> 'status' = 'rejected', 'Durum rejected';
  assert (select rejection_reason from public.seller_accounts where id = v_id) = 'Vergi levhası okunaksız, güncel olanı yükleyin.', 'Ret nedeni kırpılıp kaydedilmeli';
  assert not (select is_active from public.stores where owner_id = test.sd_uid('sel2')), 'Reddedilen mağaza pasif';
  assert (select role from public.profiles where id = test.sd_uid('sel2')) = 'customer', 'Reddedilen kullanıcı satıcı rolü almaz';
  perform test.throws(format($q$select public.admin_review_seller_application(%L, 'reject', 'İkinci ret nedeni')$q$, v_id), 'ALREADY_REVIEWED');
  perform test.throws(format($q$select public.admin_review_seller_application(%L, 'approve')$q$, v_id), 'ALREADY_REVIEWED');
  perform test.ok('karar/ret: neden zorunlu ve kaydedilir; mağaza pasif; ikinci işlem ALREADY_REVIEWED');
end $$;
commit;

-- Satıcı reddedilme nedenini kendi hesabından görür; başkasınınkini görmez
begin;
select test.login(test.sd_uid('sel2'));
do $$
begin
  assert (select rejection_reason from public.seller_accounts where owner_id = test.sd_uid('sel2')) like 'Vergi levhası okunaksız%', 'Satıcı ret nedenini görür';
  assert (select count(*) from public.seller_accounts) = 1, 'Satıcı yalnızca kendi başvurusunu görür';
  -- Reddedilmiş başvuruda belge kaydı kilitli, ama yeni başvuru için yükleme serbest
  perform test.throws($q$select public.register_seller_documents('[{"doc_type":"kimlik"}]'::jsonb)$q$, 'DOCUMENTS_LOCKED');
  insert into storage.objects (bucket_id, name) values ('seller-documents', test.doc_path('sel2', 'kimlik', 51));
  perform test.ok('satıcı: ret nedenini görür, başkasını görmez; reddedilmiş başvuruda yeni dosya yükleyebilir');
end $$;
-- Yeniden başvuru: durum beklemeye döner, ret nedeni temizlenir, belgeler tekrar kaydedilebilir
select public.submit_seller_application('Belge Mağazası İki', 'Yeniden', 'vitrin-plus', '{"version":1,"sellerType":"limited-as"}');
do $$
declare r jsonb;
begin
  assert (select status from public.seller_accounts where owner_id = test.sd_uid('sel2')) = 'pending', 'Yeniden başvuru pending';
  assert (select rejection_reason from public.seller_accounts where owner_id = test.sd_uid('sel2')) is null, 'Ret nedeni temizlenmeli';
  r := public.register_seller_documents(jsonb_build_array(jsonb_build_object('doc_type', 'kimlik', 'path', test.doc_path('sel2', 'kimlik', 51), 'name', 'kimlik.pdf', 'mime', 'application/pdf', 'size', 700)));
  assert (r ->> 'registered')::int = 1, 'Yeniden başvuruda belge kaydedilebilmeli';
  perform test.ok('yeniden başvuru: bekleyen duruma döner, belge yeniden kaydedilebilir');
end $$;
commit;

\warn 'Belge ve inceleme testleri tamamlandı.'
