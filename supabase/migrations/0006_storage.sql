-- ============================================================================
-- VitrinPlus · Aşama 2 · 0006 — Storage (bucket + politikalar)
--
--   product-images : {store_id}/{product_id}/{dosya}.{jpg|jpeg|png|webp}   (herkese okunur, mağaza sahibi yazar)
--   store-assets   : {store_id}/{dosya}.{jpg|jpeg|png|webp}                (logo / kapak; herkese okunur)
--   avatars        : {user_id}/{dosya}.{jpg|jpeg|png|webp}                 (herkese okunur, kullanıcı kendi klasörüne yazar)
--
-- Sunucu tarafı sınırlar: MIME türü, dosya boyutu ve uzantı. İstemci tarafı doğrulama
-- (lib/storage/upload.ts) yalnızca kullanıcı deneyimi içindir; güvenlik bu politikalardadır.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('store-assets',   'store-assets',   true, 5242880, array['image/jpeg', 'image/png', 'image/webp']),
  ('avatars',        'avatars',        true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Mağaza klasörü (ilk yol parçası) çağıran kullanıcının mağazası mı?
create or replace function public.owns_store_folder(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.stores s
    where s.owner_id = (select auth.uid()) and s.id::text = split_part(p_path, '/', 1)
  );
$$;

grant execute on function public.owns_store_folder(text) to authenticated;

create or replace function public.is_image_path(p_path text)
returns boolean
language sql
immutable
as $$
  select lower(p_path) ~ '\.(jpg|jpeg|png|webp)$';
$$;

grant execute on function public.is_image_path(text) to authenticated;

-- product-images
create policy "product_images_insert_own_store" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.owns_store_folder(name) and public.is_image_path(name));

create policy "product_images_update_own_store" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.owns_store_folder(name))
  with check (bucket_id = 'product-images' and public.owns_store_folder(name) and public.is_image_path(name));

create policy "product_images_delete_own_store" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.owns_store_folder(name));

create policy "product_images_select_own_store" on storage.objects
  for select to authenticated
  using (bucket_id = 'product-images' and public.owns_store_folder(name));

-- store-assets
create policy "store_assets_insert_own_store" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'store-assets' and public.owns_store_folder(name) and public.is_image_path(name));

create policy "store_assets_update_own_store" on storage.objects
  for update to authenticated
  using (bucket_id = 'store-assets' and public.owns_store_folder(name))
  with check (bucket_id = 'store-assets' and public.owns_store_folder(name) and public.is_image_path(name));

create policy "store_assets_delete_own_store" on storage.objects
  for delete to authenticated
  using (bucket_id = 'store-assets' and public.owns_store_folder(name));

create policy "store_assets_select_own_store" on storage.objects
  for select to authenticated
  using (bucket_id = 'store-assets' and public.owns_store_folder(name));

-- avatars
create policy "avatars_insert_own_folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text and public.is_image_path(name));

create policy "avatars_update_own_folder" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text and public.is_image_path(name));

create policy "avatars_delete_own_folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);

create policy "avatars_select_own_folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'avatars' and split_part(name, '/', 1) = (select auth.uid())::text);
