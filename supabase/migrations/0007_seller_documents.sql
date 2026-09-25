-- ============================================================================
-- VitrinPlus · Aşama 2 · 0007 — Satıcı belgeleri (özel depolama) ve başvuru inceleme kararı
--
-- Öncesi (0001–0006): başvuru formu belge DOSYASI yüklemiyordu; yalnızca dosya adı/boyut meta bilgisi
-- `seller_accounts.application` içine yazılıyordu ve gerçek bir belge kovası yoktu.
--
-- Bu migration:
--   1) `seller-documents` kovasını ÖZEL (public = false) oluşturur. Kimlik, vergi levhası gibi hassas belgeler
--      hiçbir koşulda herkese açık URL ile sunulmaz; yalnızca kısa ömürlü imzalı adres (signed URL) ile açılır.
--   2) Belge meta bilgisi için `seller_documents` tablosu (RLS: satıcı yalnızca kendi belgelerini, yönetici hepsini okur).
--      Yazma yalnızca `register_seller_documents` RPC'siyle olur; API rollerine tablo yazma yetkisi verilmez.
--   3) storage.objects politikaları:  {kullanıcı_id}/{belge_türü}/{uuid}.{pdf|jpg|jpeg|png}
--        - satıcı yalnızca kendi klasörüne yükler; başvurusu onaylı/askıdaysa yükleyemez;
--        - satıcı yalnızca kendi klasörünü okur; yönetici bu kovadaki tüm nesneleri okur;
--        - silme: yalnızca kendi, hiçbir kayda bağlı olmayan (yetim / değiştirilmiş) dosyalar.
--   4) `admin_review_seller_application`: yalnızca BEKLEYEN başvuru için onay/ret. İkinci kez çağrılırsa reddedilir
--      (çift işlem koruması). Ret nedeni zorunludur ve veritabanına yazılır; satıcı kendi başvurusunda görür.
--
-- Önceki migration dosyaları değiştirilmez. Mağaza aktifliği (`sync_store_active` tetikleyicisi) ve satıcı rolü
-- (`profiles.role`) mevcut tasarımla aynı yoldan güncellenir.
-- ============================================================================

-- ─── 1) Özel kova ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('seller-documents', 'seller-documents', false, 10485760, array['application/pdf', 'image/jpeg', 'image/png'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ─── 2) Belge kayıtları ──────────────────────────────────────────────────────
create table public.seller_documents (
  id                uuid primary key default gen_random_uuid(),
  seller_account_id uuid not null references public.seller_accounts (id) on delete cascade,
  owner_id          uuid not null references public.profiles (id) on delete cascade,
  doc_type          text not null check (doc_type in ('kimlik', 'vergiLevhasi', 'imzaBeyannamesi', 'ticaretSicilBelgesi', 'faaliyetBelgesi')),
  storage_path      text not null unique check (char_length(storage_path) <= 300),
  original_name     text not null check (char_length(original_name) between 1 and 200),
  mime_type         text not null check (mime_type in ('application/pdf', 'image/jpeg', 'image/png')),
  size_bytes        integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  uploaded_at       timestamptz not null default now(),
  -- Başvuru başına her belge türünden tek güncel dosya; yeniden yükleme eskisinin yerini alır.
  unique (seller_account_id, doc_type)
);

create index seller_documents_owner_idx on public.seller_documents (owner_id);

alter table public.seller_documents enable row level security;

-- Supabase varsayılan olarak yeni tablolara API rolleri için yetki verir; burada bilinçli olarak geri alınır.
revoke all on table public.seller_documents from anon, authenticated;
grant select on public.seller_documents to authenticated;

create policy seller_documents_select on public.seller_documents
  for select to authenticated
  using (owner_id = (select auth.uid()) or public.is_admin());

-- ─── 3) Depolama yardımcıları ve politikaları ────────────────────────────────
-- Yol biçimi: {kullanıcı uuid}/{belge türü}/{uuid}.{uzantı}. İstemci kodu (lib/domain/seller-documents.ts) aynı kalıbı üretir.
create or replace function public.is_seller_document_path(p_path text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_path, '') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/(kimlik|vergiLevhasi|imzaBeyannamesi|ticaretSicilBelgesi|faaliyetBelgesi)/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(pdf|jpg|jpeg|png)$';
$$;

-- Belge yüklenebilir mi? Hesabı olmayan (ilk başvuru) ya da beklemede / reddedilmiş başvuru sahibi evet;
-- onaylı veya askıdaki satıcı hayır.
create or replace function public.can_upload_seller_document()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and not exists (
      select 1 from public.seller_accounts a
      where a.owner_id = (select auth.uid()) and a.status not in ('pending', 'rejected')
    );
$$;

-- Dosya bir belge kaydına bağlı mı? Bağlı dosya silinemez (yönetici incelerken kaybolmasın).
create or replace function public.seller_document_unreferenced(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (select 1 from public.seller_documents d where d.storage_path = p_path);
$$;

create policy "seller_documents_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'seller-documents'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and public.is_seller_document_path(name)
    and public.can_upload_seller_document()
  );

create policy "seller_documents_select_own_or_admin" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'seller-documents'
    and (split_part(name, '/', 1) = (select auth.uid())::text or public.is_admin())
  );

create policy "seller_documents_delete_own_unreferenced" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'seller-documents'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and public.can_upload_seller_document()
    and public.seller_document_unreferenced(name)
  );
-- Bilerek UPDATE politikası yok: dosya yerinde değiştirilemez; yeni dosya yüklenir ve kayıt onu gösterir.

-- ─── 4) Belge kaydı (RPC) ────────────────────────────────────────────────────
-- p_documents: [{"doc_type","path","name","mime","size"}, …]. Dosya önce depolamaya yüklenir, sonra burada kaydedilir.
-- Dönüş: {"registered": n, "replaced_paths": [...]} — değiştirilen eski dosyaları istemci depolamadan siler.
create or replace function public.register_seller_documents(p_documents jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_account public.seller_accounts%rowtype;
  v_item jsonb;
  v_type text;
  v_path text;
  v_name text;
  v_mime text;
  v_size bigint;
  v_old text;
  v_replaced text[] := '{}';
  v_count integer := 0;
begin
  if v_uid is null then
    raise exception 'Belge yüklemek için giriş yapmalısın.' using errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  if jsonb_typeof(p_documents) is distinct from 'array' or jsonb_array_length(p_documents) = 0 or jsonb_array_length(p_documents) > 5 then
    raise exception 'Belge listesi geçersiz.' using errcode = 'P0001', hint = 'INVALID_DOCUMENTS';
  end if;

  select * into v_account from public.seller_accounts where owner_id = v_uid for update;
  if not found then
    raise exception 'Belge yüklemeden önce mağaza başvurusu yapmalısın.' using errcode = 'P0001', hint = 'NOT_FOUND';
  end if;
  if v_account.status <> 'pending' then
    raise exception 'Belgeler yalnızca başvuru incelenirken güncellenebilir.' using errcode = 'P0001', hint = 'DOCUMENTS_LOCKED';
  end if;

  for v_item in select value from jsonb_array_elements(p_documents) loop
    v_type := v_item ->> 'doc_type';
    v_path := v_item ->> 'path';
    v_name := btrim(coalesce(v_item ->> 'name', ''));
    v_mime := v_item ->> 'mime';
    -- Sayı olmayan değer bir tür dönüşümü hatası yerine anlaşılır bir iş kuralı hatasına dönüşsün.
    v_size := case when (v_item ->> 'size') ~ '^[0-9]{1,9}$' then (v_item ->> 'size')::bigint end;

    if v_type is null or v_type not in ('kimlik', 'vergiLevhasi', 'imzaBeyannamesi', 'ticaretSicilBelgesi', 'faaliyetBelgesi') then
      raise exception 'Belge türü geçersiz.' using errcode = 'P0001', hint = 'INVALID_DOCUMENT_TYPE';
    end if;
    -- Yol, çağıranın kendi klasöründe ve bu belge türü altında olmalı.
    if not public.is_seller_document_path(v_path)
       or split_part(v_path, '/', 1) <> v_uid::text
       or split_part(v_path, '/', 2) <> v_type then
      raise exception 'Belge yolu geçersiz.' using errcode = 'P0001', hint = 'INVALID_DOCUMENT_PATH';
    end if;
    if char_length(v_name) < 1 or char_length(v_name) > 200 then
      raise exception 'Dosya adı geçersiz.' using errcode = 'P0001', hint = 'INVALID_DOCUMENT_NAME';
    end if;
    if v_mime is null or v_mime not in ('application/pdf', 'image/jpeg', 'image/png') then
      raise exception 'Yalnızca PDF, JPG veya PNG yüklenebilir.' using errcode = 'P0001', hint = 'INVALID_DOCUMENT_TYPE';
    end if;
    if v_size is null or v_size < 1 or v_size > 10485760 then
      raise exception 'Dosya boyutu en fazla 10 MB olabilir.' using errcode = 'P0001', hint = 'DOCUMENT_TOO_LARGE';
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'seller-documents' and o.name = v_path) then
      raise exception 'Dosya depolamada bulunamadı. Yüklemeyi tekrar dene.' using errcode = 'P0001', hint = 'FILE_NOT_FOUND';
    end if;

    select storage_path into v_old from public.seller_documents where seller_account_id = v_account.id and doc_type = v_type;

    insert into public.seller_documents (seller_account_id, owner_id, doc_type, storage_path, original_name, mime_type, size_bytes)
    values (v_account.id, v_uid, v_type, v_path, left(v_name, 200), v_mime, v_size::integer)
    on conflict (seller_account_id, doc_type) do update
      set storage_path = excluded.storage_path,
          original_name = excluded.original_name,
          mime_type = excluded.mime_type,
          size_bytes = excluded.size_bytes,
          uploaded_at = now();

    if v_old is not null and v_old <> v_path then
      v_replaced := v_replaced || v_old;
    end if;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('registered', v_count, 'replaced_paths', to_jsonb(v_replaced));
end;
$$;

-- ─── 5) Yönetici: başvuru kararı (yalnızca bekleyen başvuru) ─────────────────
create or replace function public.admin_review_seller_application(p_account_id uuid, p_decision text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_account public.seller_accounts%rowtype;
  v_reason text := left(btrim(coalesce(p_reason, '')), 500);
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.' using errcode = '42501', hint = 'FORBIDDEN';
  end if;
  if p_decision not in ('approve', 'reject') then
    raise exception 'Geçersiz karar.' using errcode = 'P0001', hint = 'INVALID_STATUS';
  end if;
  if p_decision = 'reject' and char_length(v_reason) < 5 then
    raise exception 'Ret nedenini yaz (en az 5 karakter).' using errcode = 'P0001', hint = 'REASON_REQUIRED';
  end if;

  select * into v_account from public.seller_accounts where id = p_account_id for update;
  if not found then
    raise exception 'Başvuru bulunamadı.' using errcode = 'P0001', hint = 'NOT_FOUND';
  end if;
  -- Çift işlem koruması: karar yalnızca bekleyen başvuruya verilir. Satır kilitli olduğundan iki yönetici aynı anda
  -- karar verse de ikincisi bu kontrolde durur.
  if v_account.status <> 'pending' then
    raise exception 'Bu başvuru zaten sonuçlandırılmış. Sayfayı yenile.' using errcode = 'P0001', hint = 'ALREADY_REVIEWED';
  end if;

  update public.seller_accounts
     set status = case when p_decision = 'approve' then 'approved' else 'rejected' end,
         rejection_reason = case when p_decision = 'approve' then null else v_reason end,
         reviewed_by = v_uid,
         reviewed_at = now()
   where id = p_account_id
   returning * into v_account;
  -- `sync_store_active` tetikleyicisi mağaza aktifliğini durumla eşitler (onay → is_active = true).

  if p_decision = 'approve' then
    update public.profiles set role = 'seller' where id = v_account.owner_id and role = 'customer';
  end if;

  return jsonb_build_object('account_id', v_account.id, 'status', v_account.status, 'reviewed_at', v_account.reviewed_at);
end;
$$;

-- ─── 6) Yetkiler ─────────────────────────────────────────────────────────────
revoke all on function public.is_seller_document_path(text) from public, anon, authenticated;
revoke all on function public.can_upload_seller_document() from public, anon, authenticated;
revoke all on function public.seller_document_unreferenced(text) from public, anon, authenticated;
revoke all on function public.register_seller_documents(jsonb) from public, anon, authenticated;
revoke all on function public.admin_review_seller_application(uuid, text, text) from public, anon, authenticated;

grant execute on function public.is_seller_document_path(text) to authenticated;
grant execute on function public.can_upload_seller_document() to authenticated;
grant execute on function public.seller_document_unreferenced(text) to authenticated;
grant execute on function public.register_seller_documents(jsonb) to authenticated;
grant execute on function public.admin_review_seller_application(uuid, text, text) to authenticated;
