-- ============================================================================
-- VitrinPlus · Aşama 2 · 0004 — İş kuralı fonksiyonları (RPC)
--
-- Kritik yazmaların TEK yolu budur. Hepsi SECURITY DEFINER'dır ve yetkiyi
-- kendileri kontrol eder (auth.uid() + satır sahipliği); RLS'e güvenmezler.
-- Hata mesajları kullanıcıya gösterilebilir (Türkçe); `hint` makine kodudur.
-- ============================================================================

create or replace function public.new_code(p_prefix text)
returns text
language sql
volatile
as $$
  select p_prefix || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

-- Sipariş durum makinesi (kaynak: lib/domain/order-engine.ts ile birebir aynı olmalı; test doğrular).
create or replace function public.order_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
as $$
  select case p_from
    when 'new' then p_to in ('preparing', 'cancelled')
    when 'preparing' then p_to in ('ready_to_ship', 'shipped', 'cancelled')
    when 'ready_to_ship' then p_to in ('shipped', 'cancelled')
    when 'shipped' then p_to = 'delivered'
    else false
  end;
$$;

-- İade durum makinesi (kaynak: lib/domain/returns.ts).
create or replace function public.return_transition_allowed(p_from text, p_to text)
returns boolean
language sql
immutable
as $$
  select case p_from
    when 'requested' then p_to in ('approved', 'rejected')
    when 'approved' then p_to = 'shipped'
    when 'shipped' then p_to = 'received'
    when 'received' then p_to = 'refunded'
    else false
  end;
$$;

-- ─── Satıcı başvurusu ────────────────────────────────────────────────────────
create or replace function public.submit_seller_application(
  p_store_name text,
  p_description text,
  p_plan text,
  p_application jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_name text := btrim(coalesce(p_store_name, ''));
  v_desc text := left(btrim(coalesce(p_description, '')), 1000);
  v_plan text := coalesce(nullif(btrim(p_plan), ''), 'vitrin-plus');
  v_app jsonb := case when jsonb_typeof(p_application) = 'object' then p_application else '{}'::jsonb end;
  v_profile public.profiles%rowtype;
  v_account public.seller_accounts%rowtype;
  v_store_id uuid;
  v_slug text;
  v_tries integer := 0;
begin
  if v_uid is null then
    raise exception 'Başvuru için giriş yapmalısın.' using errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  select * into v_profile from public.profiles where id = v_uid;
  if not found then
    raise exception 'Profil bulunamadı.' using errcode = 'P0001', hint = 'PROFILE_NOT_FOUND';
  end if;
  if char_length(v_name) < 3 or char_length(v_name) > 80 then
    raise exception 'Mağaza adı 3–80 karakter olmalı.' using errcode = 'P0001', hint = 'INVALID_STORE_NAME';
  end if;
  if v_plan not in ('vitrin', 'vitrin-plus', 'vitrin-pro-plus', 'vitrin-enterprise') then
    raise exception 'Geçersiz paket.' using errcode = 'P0001', hint = 'INVALID_PLAN';
  end if;
  if octet_length(v_app::text) > 20000 then
    raise exception 'Başvuru verisi çok büyük.' using errcode = 'P0001', hint = 'PAYLOAD_TOO_LARGE';
  end if;

  select * into v_account from public.seller_accounts where owner_id = v_uid for update;

  if found then
    if v_account.status <> 'rejected' then
      raise exception 'Zaten bir mağaza başvurun var.' using errcode = 'P0001', hint = 'ALREADY_APPLIED';
    end if;
    -- Reddedilen başvuru yeniden gönderilebilir.
    begin
      update public.stores set name = v_name, description = v_desc where seller_account_id = v_account.id;
    exception when unique_violation then
      raise exception 'Bu mağaza adı kullanılıyor.' using errcode = 'P0001', hint = 'STORE_NAME_TAKEN';
    end;
    update public.seller_accounts
       set status = 'pending', selected_plan = v_plan, application = v_app, rejection_reason = null,
           reviewed_by = null, reviewed_at = null, submitted_at = now()
     where id = v_account.id
     returning * into v_account;
    select id into v_store_id from public.stores where seller_account_id = v_account.id;
  else
    loop
      begin
        insert into public.seller_accounts (owner_id, reference, selected_plan, application)
        values (v_uid, public.new_code('VP-'), v_plan, v_app)
        returning * into v_account;
        exit;
      exception when unique_violation then
        v_tries := v_tries + 1;
        if v_tries >= 5 then raise; end if;
      end;
    end loop;

    v_slug := regexp_replace(
      lower(translate(v_name, 'çğıöşüÇĞİÖŞÜâîûÂÎÛ', 'cgiosuCGIOSUaiuAIU')),
      '[^a-z0-9]+', '-', 'g'
    );
    v_slug := btrim(v_slug, '-');
    if v_slug = '' then v_slug := 'magaza'; end if;
    v_slug := left(v_slug, 50) || '-' || substr(replace(v_account.id::text, '-', ''), 1, 6);

    begin
      insert into public.stores (seller_account_id, owner_id, slug, name, description, contact_email, is_active)
      -- contact_email bilinçli olarak BOŞ başlar: mağaza iletişim adresi herkese açıktır; giriş e-postası sızdırılmaz.
      values (v_account.id, v_uid, v_slug, v_name, v_desc, '', false)
      returning id into v_store_id;
    exception when unique_violation then
      raise exception 'Bu mağaza adı kullanılıyor.' using errcode = 'P0001', hint = 'STORE_NAME_TAKEN';
    end;
  end if;

  return jsonb_build_object(
    'account_id', v_account.id,
    'store_id', v_store_id,
    'reference', v_account.reference,
    'status', v_account.status,
    'selected_plan', v_account.selected_plan
  );
end;
$$;

-- Yönetici: başvuru onay / ret / askıya alma.
create or replace function public.admin_set_seller_status(p_account_id uuid, p_status text, p_reason text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_account public.seller_accounts%rowtype;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.' using errcode = '42501', hint = 'FORBIDDEN';
  end if;
  if p_status not in ('approved', 'rejected', 'suspended') then
    raise exception 'Geçersiz durum.' using errcode = 'P0001', hint = 'INVALID_STATUS';
  end if;
  if p_status = 'rejected' and char_length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Ret nedenini yaz.' using errcode = 'P0001', hint = 'REASON_REQUIRED';
  end if;

  select * into v_account from public.seller_accounts where id = p_account_id for update;
  if not found then
    raise exception 'Başvuru bulunamadı.' using errcode = 'P0001', hint = 'NOT_FOUND';
  end if;
  if v_account.status = p_status then
    return jsonb_build_object('account_id', v_account.id, 'status', v_account.status);
  end if;

  update public.seller_accounts
     set status = p_status,
         rejection_reason = case when p_status = 'approved' then null else left(btrim(coalesce(p_reason, '')), 500) end,
         reviewed_by = v_uid,
         reviewed_at = now()
   where id = p_account_id
   returning * into v_account;

  if p_status = 'approved' then
    update public.profiles set role = 'seller' where id = v_account.owner_id and role = 'customer';
  end if;

  return jsonb_build_object('account_id', v_account.id, 'status', v_account.status);
end;
$$;

-- Satıcı: paket seçimi (ödeme henüz bağlı değil; seçim kaydedilir).
create or replace function public.set_seller_plan(p_plan text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_account public.seller_accounts%rowtype;
  v_limit integer;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  select * into v_account from public.seller_accounts where owner_id = v_uid for update;
  if not found then
    raise exception 'Satıcı hesabın yok.' using errcode = 'P0001', hint = 'NO_SELLER_ACCOUNT';
  end if;
  if v_account.status not in ('pending', 'approved') then
    raise exception 'Bu hesap için paket değiştirilemez.' using errcode = 'P0001', hint = 'INVALID_STATUS';
  end if;
  select l.product_limit into v_limit from public.plan_limits l where l.plan_key = p_plan;
  if not found then
    raise exception 'Geçersiz paket.' using errcode = 'P0001', hint = 'INVALID_PLAN';
  end if;
  select count(*) into v_count
    from public.products p join public.stores s on s.id = p.store_id
   where s.seller_account_id = v_account.id and p.deleted_at is null;
  if v_limit is not null and v_count > v_limit then
    raise exception 'Ürün sayın (%) seçilen paketin limitini (%) aşıyor.', v_count, v_limit
      using errcode = 'P0001', hint = 'PLAN_LIMIT';
  end if;
  update public.seller_accounts set selected_plan = p_plan where id = v_account.id;
  return jsonb_build_object('account_id', v_account.id, 'selected_plan', p_plan);
end;
$$;

-- ─── Sipariş oluşturma (atomik) ──────────────────────────────────────────────
-- p_items:   [{ "product_id": uuid, "variant_id": uuid?, "variant_label": text?, "quantity": int }]
-- p_details: { "ship_to": {name, phone, city, district, address}, "billing_address": text,
--              "coupon": text?, "express": bool?, "note": text? }
-- Fiyat/stok/durum SUNUCUDA hesaplanır; istemcinin gönderdiği fiyata güvenilmez.
create or replace function public.place_order(p_items jsonb, p_details jsonb, p_idempotency_key text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_key text := btrim(coalesce(p_idempotency_key, ''));
  v_ship jsonb;
  v_ship_name text;
  v_ship_phone text;
  v_ship_city text;
  v_ship_district text;
  v_ship_line text;
  v_shipping_address text;
  v_billing text;
  v_coupon_ok boolean;
  v_express boolean;
  v_note text;
  v_group uuid := gen_random_uuid();
  v_now timestamptz := now();
  v_line record;
  v_p record;
  v_v record;
  v_qty numeric;
  v_variant_count integer;
  v_variant_id uuid;
  v_variant_label text;
  v_avail integer;
  v_unit numeric(12, 2);
  v_before integer;
  v_after integer;
  v_new_total integer;
  v_resolved jsonb := '[]'::jsonb;
  v_store record;
  v_order_id uuid;
  v_order_no text;
  v_list_total numeric(12, 2);
  v_subtotal numeric(12, 2);
  v_discount numeric(12, 2);
  v_shipping numeric(12, 2);
  v_total numeric(12, 2);
  v_seller_discount numeric(12, 2);
  v_deductions jsonb;
  v_ded_total numeric(12, 2);
  v_result jsonb := '[]'::jsonb;
  v_tries integer;
  v_constraint text;
begin
  if v_uid is null then
    raise exception 'Sipariş vermek için giriş yapmalısın.' using errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  if not exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'Profil bulunamadı.' using errcode = 'P0001', hint = 'PROFILE_NOT_FOUND';
  end if;
  if char_length(v_key) < 8 or char_length(v_key) > 120 then
    raise exception 'Sipariş anahtarı geçersiz.' using errcode = 'P0001', hint = 'INVALID_KEY';
  end if;

  -- Aynı kullanıcı + anahtar için işlemleri sıraya sok (çift tıklama / ağ tekrarı).
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text || ':' || v_key, 0));

  -- Tekrarlanan istek: yeni sipariş OLUŞTURMA, mevcut sonucu döndür (stok tekrar düşmez).
  if exists (select 1 from public.orders o where o.buyer_id = v_uid and o.idempotency_key = v_key) then
    return public.order_group_json(v_uid, v_key, true);
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Sepetin boş.' using errcode = 'P0001', hint = 'EMPTY_CART';
  end if;
  if jsonb_array_length(p_items) > 50 then
    raise exception 'Sepette en fazla 50 satır olabilir.' using errcode = 'P0001', hint = 'TOO_MANY_LINES';
  end if;
  if p_details is null or jsonb_typeof(p_details) <> 'object' then
    raise exception 'Teslimat bilgileri eksik.' using errcode = 'P0001', hint = 'INVALID_ADDRESS';
  end if;

  v_ship := case when jsonb_typeof(p_details -> 'ship_to') = 'object' then p_details -> 'ship_to' else '{}'::jsonb end;
  v_ship_name := btrim(coalesce(v_ship ->> 'name', ''));
  v_ship_phone := btrim(coalesce(v_ship ->> 'phone', ''));
  v_ship_city := btrim(coalesce(v_ship ->> 'city', ''));
  v_ship_district := btrim(coalesce(v_ship ->> 'district', ''));
  v_ship_line := btrim(coalesce(v_ship ->> 'address', ''));
  if v_ship_name = '' or v_ship_city = '' or v_ship_district = '' or v_ship_line = '' or v_ship_phone !~ '^\+?[0-9 ()-]{10,18}$' then
    raise exception 'Teslimat bilgilerini eksiksiz ve geçerli gir.' using errcode = 'P0001', hint = 'INVALID_ADDRESS';
  end if;
  if char_length(v_ship_name) > 80 or char_length(v_ship_city) > 60 or char_length(v_ship_district) > 60 or char_length(v_ship_line) > 300 then
    raise exception 'Teslimat bilgileri çok uzun.' using errcode = 'P0001', hint = 'INVALID_ADDRESS';
  end if;
  v_shipping_address := v_ship_name || ' · ' || v_ship_phone || ' · ' || v_ship_line || ' · ' || v_ship_district || ' · ' || v_ship_city;
  v_billing := btrim(coalesce(p_details ->> 'billing_address', ''));
  if v_billing = '' then v_billing := v_shipping_address; end if;
  if char_length(v_billing) > 800 then
    raise exception 'Fatura adresi çok uzun.' using errcode = 'P0001', hint = 'INVALID_ADDRESS';
  end if;
  v_coupon_ok := upper(btrim(coalesce(p_details ->> 'coupon', ''))) = 'VITRINPLUS10';
  v_express := lower(coalesce(p_details ->> 'express', 'false')) in ('true', 't', '1');
  v_note := nullif(left(btrim(coalesce(p_details ->> 'note', '')), 500), '');

  -- 1) Satır biçimi doğrulaması: tamsayı ve pozitif adet, geçerli kimlikler.
  for v_line in select e.value as v from jsonb_array_elements(p_items) e loop
    if jsonb_typeof(v_line.v) <> 'object' then
      raise exception 'Sepet satırı geçersiz.' using errcode = 'P0001', hint = 'INVALID_LINE';
    end if;
    if jsonb_typeof(v_line.v -> 'quantity') is distinct from 'number' then
      raise exception 'Ürün adedi geçersiz.' using errcode = 'P0001', hint = 'INVALID_QUANTITY';
    end if;
    v_qty := (v_line.v ->> 'quantity')::numeric;
    if v_qty <> trunc(v_qty) or v_qty < 1 or v_qty > 99 then
      raise exception 'Ürün adedi geçersiz.' using errcode = 'P0001', hint = 'INVALID_QUANTITY';
    end if;
    if nullif(v_line.v ->> 'product_id', '') is null then
      raise exception 'Ürün kimliği eksik.' using errcode = 'P0001', hint = 'INVALID_LINE';
    end if;
    begin
      perform (v_line.v ->> 'product_id')::uuid;
      perform nullif(v_line.v ->> 'variant_id', '')::uuid;
    exception when invalid_text_representation then
      raise exception 'Ürün kimliği geçersiz.' using errcode = 'P0001', hint = 'INVALID_LINE';
    end;
  end loop;

  -- 2) Kilitle + doğrula + stok düş. Ürün kimliğine göre sıralı kilit → kilitlenme (deadlock) olmaz.
  for v_line in
    select (e.value ->> 'product_id')::uuid as product_id,
           nullif(e.value ->> 'variant_id', '')::uuid as variant_id,
           nullif(btrim(e.value ->> 'variant_label'), '') as variant_label,
           sum((e.value ->> 'quantity')::numeric)::integer as qty
      from jsonb_array_elements(p_items) e
     group by 1, 2, 3
     order by 1, 2 nulls first, 3 nulls first
  loop
    select p.id, p.store_id, p.seller_id, p.name, p.sku, p.price, p.discount_price, p.discount_start, p.discount_end,
           p.stock, p.auto_passive, p.status, p.deleted_at
      into v_p
      from public.products p
     where p.id = v_line.product_id
       for update;

    if v_p.id is null or v_p.deleted_at is not null or v_p.status <> 'active' then
      raise exception 'Sepetindeki bir ürün artık satışta değil. Sepetini güncelle.' using errcode = 'P0001', hint = 'NOT_SELLABLE';
    end if;
    if not public.store_is_public(v_p.store_id) then
      raise exception 'Sepetindeki bir ürünün mağazası şu anda satış yapmıyor.' using errcode = 'P0001', hint = 'STORE_INACTIVE';
    end if;
    if v_p.seller_id = v_uid then
      raise exception 'Kendi ürününü satın alamazsın.' using errcode = 'P0001', hint = 'OWN_PRODUCT';
    end if;

    v_variant_id := null;
    v_variant_label := null;
    select count(*) into v_variant_count from public.product_variants x where x.product_id = v_p.id and x.is_active;

    if v_line.variant_id is not null or v_line.variant_label is not null then
      if v_variant_count = 0 then
        raise exception 'Bu ürün için seçenek belirtilemez.' using errcode = 'P0001', hint = 'INVALID_VARIANT';
      end if;
      select x.id, x.label, x.stock
        into v_v
        from public.product_variants x
       where x.product_id = v_p.id and x.is_active
         and ((v_line.variant_id is not null and x.id = v_line.variant_id)
              or (v_line.variant_id is null and lower(btrim(x.label)) = lower(v_line.variant_label)))
         for update;
      if v_v.id is null then
        raise exception 'Seçilen seçenek bulunamadı.' using errcode = 'P0001', hint = 'INVALID_VARIANT';
      end if;
      v_variant_id := v_v.id;
      v_variant_label := v_v.label;
      v_avail := v_v.stock;
    elsif v_variant_count > 0 then
      raise exception '%: lütfen bir seçenek seç.', v_p.name using errcode = 'P0001', hint = 'VARIANT_REQUIRED';
    else
      v_avail := v_p.stock;
    end if;

    if v_line.qty > v_avail then
      raise exception '%: stokta % adet var.', v_p.name, v_avail using errcode = 'P0001', hint = 'OUT_OF_STOCK';
    end if;

    -- İndirimli fiyat yalnızca tarih aralığında geçerli.
    v_unit := case
      when v_p.discount_price is not null and v_p.discount_price > 0 and v_p.discount_price < v_p.price
           and (v_p.discount_start is null or v_now >= v_p.discount_start)
           and (v_p.discount_end is null or v_now <= v_p.discount_end)
      then v_p.discount_price
      else v_p.price
    end;
    if v_unit <= 0 then
      raise exception '%: fiyat geçersiz.', v_p.name using errcode = 'P0001', hint = 'NOT_SELLABLE';
    end if;

    if v_variant_id is not null then
      v_before := v_v.stock;
      v_after := v_before - v_line.qty;
      update public.product_variants set stock = v_after where id = v_variant_id;
      select p.stock into v_new_total from public.products p where p.id = v_p.id; -- tetikleyici yeniden hesapladı
    else
      v_before := v_p.stock;
      v_after := v_before - v_line.qty;
      update public.products set stock = v_after where id = v_p.id;
      v_new_total := v_after;
    end if;
    if v_new_total <= 0 and v_p.auto_passive then
      update public.products set status = 'passive' where id = v_p.id;
    end if;

    v_resolved := v_resolved || jsonb_build_object(
      'store_id', v_p.store_id,
      'product_id', v_p.id,
      'variant_id', v_variant_id,
      'name', v_p.name,
      'sku', v_p.sku,
      'variant_label', v_variant_label,
      'list_price', v_p.price,
      'unit_price', v_unit,
      'qty', v_line.qty,
      'stock_before', v_before,
      'stock_after', v_after
    );
  end loop;

  -- 3) Mağaza başına bir sipariş.
  for v_store in
    select r.store_id, s.owner_id as seller_id, s.shipping_fee, s.free_shipping_threshold
      from (select distinct (e ->> 'store_id')::uuid as store_id from jsonb_array_elements(v_resolved) e) r
      join public.stores s on s.id = r.store_id
     order by r.store_id
  loop
    select coalesce(sum(round((e ->> 'unit_price')::numeric * (e ->> 'qty')::integer, 2)), 0),
           coalesce(sum(round((e ->> 'list_price')::numeric * (e ->> 'qty')::integer, 2)), 0)
      into v_subtotal, v_list_total
      from jsonb_array_elements(v_resolved) e
     where (e ->> 'store_id')::uuid = v_store.store_id;

    v_discount := case when v_coupon_ok then round(v_subtotal * 0.10, 2) else 0 end;
    v_shipping := (case when v_subtotal - v_discount >= v_store.free_shipping_threshold then 0 else v_store.shipping_fee end)
                  + (case when v_express then 29.90 else 0 end);
    v_total := v_subtotal - v_discount + v_shipping;

    v_tries := 0;
    loop
      v_order_no := public.new_code('VP-');
      begin
        insert into public.orders (
          order_no, checkout_group_id, buyer_id, store_id, seller_id, status, idempotency_key, coupon_code, express,
          subtotal, discount_total, shipping_total, total, ship_to, shipping_address, billing_address, customer_note
        ) values (
          v_order_no, v_group, v_uid, v_store.store_id, v_store.seller_id, 'new', v_key,
          case when v_coupon_ok then 'VITRINPLUS10' else null end, v_express,
          v_subtotal, v_discount, v_shipping, v_total,
          jsonb_build_object('name', v_ship_name, 'phone', v_ship_phone, 'city', v_ship_city, 'district', v_ship_district, 'address', v_ship_line),
          v_shipping_address, v_billing, v_note
        ) returning id into v_order_id;
        exit;
      exception when unique_violation then
        get stacked diagnostics v_constraint = constraint_name;
        v_tries := v_tries + 1;
        if v_constraint is distinct from 'orders_order_no_key' or v_tries >= 5 then raise; end if;
      end;
    end loop;

    insert into public.order_items (order_id, store_id, seller_id, product_id, variant_id, product_name, sku, variant_label, list_price, unit_price, quantity, line_total)
    select v_order_id, v_store.store_id, v_store.seller_id,
           (e ->> 'product_id')::uuid, nullif(e ->> 'variant_id', '')::uuid, e ->> 'name', e ->> 'sku', e ->> 'variant_label',
           (e ->> 'list_price')::numeric, (e ->> 'unit_price')::numeric, (e ->> 'qty')::integer,
           round((e ->> 'unit_price')::numeric * (e ->> 'qty')::integer, 2)
      from jsonb_array_elements(v_resolved) e
     where (e ->> 'store_id')::uuid = v_store.store_id;

    insert into public.stock_movements (store_id, product_id, variant_id, product_name, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, note, actor_id)
    select v_store.store_id, (e ->> 'product_id')::uuid, nullif(e ->> 'variant_id', '')::uuid, e ->> 'name', 'sale',
           -((e ->> 'qty')::integer), (e ->> 'stock_before')::integer, (e ->> 'stock_after')::integer,
           'order', v_order_id, v_order_no, v_uid
      from jsonb_array_elements(v_resolved) e
     where (e ->> 'store_id')::uuid = v_store.store_id;

    insert into public.order_events (order_id, from_status, to_status, actor_id, actor_role)
    values (v_order_id, null, 'new', v_uid, 'buyer');

    -- Hakediş kaydı: brüt = liste fiyatı toplamı, indirim = satıcının kendi fiyat indirimi.
    -- Kupon (VITRINPLUS10) platform kuponudur: satıcı hakedişinden düşülmez.
    v_seller_discount := v_list_total - v_subtotal;
    v_deductions := public.compute_deductions(v_subtotal);
    v_ded_total := public.deductions_total(v_deductions);
    insert into public.seller_ledger (store_id, seller_id, order_id, entry_type, gross_amount, discount_amount, shipping_amount, deductions, deduction_total, net_amount, description)
    values (v_store.store_id, v_store.seller_id, v_order_id, 'sale', v_list_total, v_seller_discount, v_shipping, v_deductions, v_ded_total,
            v_list_total - v_seller_discount + v_shipping - v_ded_total, v_order_no);

    v_result := v_result || jsonb_build_object(
      'id', v_order_id, 'order_no', v_order_no, 'store_id', v_store.store_id, 'status', 'new',
      'subtotal', v_subtotal, 'discount_total', v_discount, 'shipping_total', v_shipping, 'total', v_total
    );
  end loop;

  return jsonb_build_object('duplicate', false, 'checkout_group_id', v_group, 'orders', v_result);
end;
$$;

create or replace function public.order_group_json(p_uid uuid, p_key text, p_duplicate boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'duplicate', p_duplicate,
    'checkout_group_id', min(o.checkout_group_id::text),
    'orders', coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id, 'order_no', o.order_no, 'store_id', o.store_id, 'status', o.status,
      'subtotal', o.subtotal, 'discount_total', o.discount_total, 'shipping_total', o.shipping_total, 'total', o.total
    ) order by o.created_at, o.id), '[]'::jsonb)
  )
  from public.orders o
  where o.buyer_id = p_uid and o.idempotency_key = p_key;
$$;

-- ─── Sipariş durum geçişi ────────────────────────────────────────────────────
create or replace function public.transition_order(
  p_order_id uuid,
  p_to text,
  p_note text default null,
  p_carrier text default null,
  p_tracking text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_o public.orders%rowtype;
  v_exists boolean;
  v_admin boolean;
  v_is_seller boolean;
  v_is_buyer boolean;
  v_role text;
  v_now timestamptz := now();
  v_item record;
  v_before integer;
  v_carrier text := nullif(left(btrim(coalesce(p_carrier, '')), 60), '');
  v_tracking text := nullif(left(btrim(coalesce(p_tracking, '')), 80), '');
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 500), '');
begin
  if v_uid is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  if p_to not in ('new', 'preparing', 'ready_to_ship', 'shipped', 'delivered', 'cancelled') then
    raise exception 'Geçersiz sipariş durumu.' using errcode = 'P0001', hint = 'INVALID_STATUS';
  end if;

  select * into v_o from public.orders where id = p_order_id for update;
  v_exists := found;
  v_admin := public.is_admin();
  v_is_seller := v_exists and v_o.seller_id = v_uid;
  v_is_buyer := v_exists and v_o.buyer_id = v_uid;
  -- Sipariş yoksa da, başkasınınsa da aynı yanıt: varlığı sızdırılmaz.
  if not v_exists or not (v_admin or v_is_seller or v_is_buyer) then
    raise exception 'Sipariş bulunamadı.' using errcode = 'P0001', hint = 'ORDER_NOT_FOUND';
  end if;
  v_role := case when v_admin then 'admin' when v_is_seller then 'seller' else 'buyer' end;

  if not public.order_transition_allowed(v_o.status, p_to) then
    raise exception 'Bu durum değişikliği yapılamaz.' using errcode = 'P0001', hint = 'INVALID_TRANSITION';
  end if;
  -- Müşteri yalnızca iptal edebilir; kargo / teslim satıcı ya da yönetici işidir.
  if p_to <> 'cancelled' and not (v_admin or v_is_seller) then
    raise exception 'Bu siparişi güncelleme yetkin yok.' using errcode = '42501', hint = 'FORBIDDEN';
  end if;

  if p_to = 'cancelled' then
    -- Stok iadesi yalnızca bir kez.
    if v_o.stock_restored_at is null then
      for v_item in
        select oi.product_id, oi.variant_id, oi.product_name, oi.quantity, oi.id
          from public.order_items oi
         where oi.order_id = v_o.id and oi.product_id is not null
         order by oi.product_id, oi.variant_id nulls first, oi.id
      loop
        -- Kilit sırası place_order ile aynı: önce ürün, sonra varyant.
        perform 1 from public.products p where p.id = v_item.product_id for update;
        if not found then continue; end if;
        if v_item.variant_id is not null then
          select x.stock into v_before from public.product_variants x where x.id = v_item.variant_id for update;
          if found then
            update public.product_variants set stock = v_before + v_item.quantity where id = v_item.variant_id;
            insert into public.stock_movements (store_id, product_id, variant_id, product_name, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, note, actor_id)
            values (v_o.store_id, v_item.product_id, v_item.variant_id, v_item.product_name, 'order_cancel', v_item.quantity, v_before, v_before + v_item.quantity, 'order', v_o.id, v_o.order_no, v_uid);
          end if;
        else
          select p.stock into v_before from public.products p where p.id = v_item.product_id;
          update public.products set stock = v_before + v_item.quantity where id = v_item.product_id;
          insert into public.stock_movements (store_id, product_id, product_name, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, note, actor_id)
          values (v_o.store_id, v_item.product_id, v_item.product_name, 'order_cancel', v_item.quantity, v_before, v_before + v_item.quantity, 'order', v_o.id, v_o.order_no, v_uid);
        end if;
      end loop;
    end if;
    update public.seller_ledger set status = 'reversed' where order_id = v_o.id and entry_type = 'sale' and status = 'pending';
    update public.orders
       set status = 'cancelled', cancelled_at = v_now, cancelled_by = v_uid, cancel_reason = left(v_note, 300),
           stock_restored_at = coalesce(stock_restored_at, v_now)
     where id = v_o.id;
  elsif p_to = 'shipped' then
    insert into public.order_shipments (order_id, carrier, tracking_no, shipped_at)
    values (v_o.id, v_carrier, v_tracking, v_now)
    on conflict (order_id) do update
      set carrier = coalesce(excluded.carrier, public.order_shipments.carrier),
          tracking_no = coalesce(excluded.tracking_no, public.order_shipments.tracking_no),
          shipped_at = excluded.shipped_at, updated_at = v_now;
    update public.orders set status = 'shipped', shipped_at = v_now where id = v_o.id;
  elsif p_to = 'delivered' then
    update public.seller_ledger
       set available_at = v_now + make_interval(days => public.payout_hold_days())
     where order_id = v_o.id and entry_type = 'sale' and status = 'pending';
    update public.orders set status = 'delivered', delivered_at = v_now where id = v_o.id;
  else
    if v_carrier is not null or v_tracking is not null then
      insert into public.order_shipments (order_id, carrier, tracking_no)
      values (v_o.id, v_carrier, v_tracking)
      on conflict (order_id) do update
        set carrier = coalesce(excluded.carrier, public.order_shipments.carrier),
            tracking_no = coalesce(excluded.tracking_no, public.order_shipments.tracking_no), updated_at = v_now;
    end if;
    update public.orders set status = p_to where id = v_o.id;
  end if;

  insert into public.order_events (order_id, from_status, to_status, actor_id, actor_role, note)
  values (v_o.id, v_o.status, p_to, v_uid, v_role, v_note);

  return jsonb_build_object('id', v_o.id, 'order_no', v_o.order_no, 'status', p_to);
end;
$$;

-- Satıcı: kargo bilgisi ve iç not (siparişin durumu değişmez).
create or replace function public.update_order_details(p_order_id uuid, p_carrier text default null, p_tracking text default null, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_o public.orders%rowtype;
  v_carrier text := nullif(left(btrim(coalesce(p_carrier, '')), 60), '');
  v_tracking text := nullif(left(btrim(coalesce(p_tracking, '')), 80), '');
begin
  if v_uid is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  select * into v_o from public.orders where id = p_order_id for update;
  if not found or not (v_o.seller_id = v_uid or public.is_admin()) then
    raise exception 'Sipariş bulunamadı.' using errcode = 'P0001', hint = 'ORDER_NOT_FOUND';
  end if;
  if v_o.status = 'cancelled' then
    raise exception 'İptal edilen sipariş güncellenemez.' using errcode = 'P0001', hint = 'INVALID_TRANSITION';
  end if;
  insert into public.order_shipments (order_id, carrier, tracking_no)
  values (v_o.id, v_carrier, v_tracking)
  on conflict (order_id) do update set carrier = excluded.carrier, tracking_no = excluded.tracking_no, updated_at = now();
  update public.orders set seller_note = nullif(left(btrim(coalesce(p_note, '')), 1000), '') where id = v_o.id;
  return jsonb_build_object('id', v_o.id, 'status', v_o.status);
end;
$$;

-- ─── Manuel stok ayarı (denetlenebilir) ──────────────────────────────────────
create or replace function public.adjust_stock(
  p_product_id uuid,
  p_variant_id uuid,
  p_mode text,
  p_quantity integer,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_p public.products%rowtype;
  v_v public.product_variants%rowtype;
  v_variant_count integer;
  v_before integer;
  v_after integer;
  v_total integer;
  v_type text;
begin
  if v_uid is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  if p_mode not in ('add', 'remove', 'set') then
    raise exception 'Geçersiz stok işlemi.' using errcode = 'P0001', hint = 'INVALID_MODE';
  end if;
  if p_quantity is null or p_quantity < 0 or p_quantity > 1000000 or (p_mode <> 'set' and p_quantity < 1) then
    raise exception 'Adet geçersiz.' using errcode = 'P0001', hint = 'INVALID_QUANTITY';
  end if;

  select * into v_p from public.products where id = p_product_id for update;
  if not found or v_p.deleted_at is not null or not (v_p.seller_id = v_uid or public.is_admin()) then
    raise exception 'Ürün bulunamadı.' using errcode = 'P0001', hint = 'PRODUCT_NOT_FOUND';
  end if;

  select count(*) into v_variant_count from public.product_variants x where x.product_id = v_p.id and x.is_active;

  if p_variant_id is not null then
    select * into v_v from public.product_variants where id = p_variant_id and product_id = v_p.id for update;
    if not found then
      raise exception 'Seçenek bulunamadı.' using errcode = 'P0001', hint = 'VARIANT_NOT_FOUND';
    end if;
    v_before := v_v.stock;
  elsif v_variant_count > 0 then
    raise exception 'Bu üründe seçenekler var; stoğu seçenek bazında ayarla.' using errcode = 'P0001', hint = 'VARIANT_REQUIRED';
  else
    v_before := v_p.stock;
  end if;

  v_after := case p_mode when 'add' then v_before + p_quantity when 'remove' then v_before - p_quantity else p_quantity end;
  if v_after < 0 then
    raise exception 'Stok 0''ın altına düşemez (mevcut: %).', v_before using errcode = 'P0001', hint = 'STOCK_NEGATIVE';
  end if;
  if v_after > 1000000 then
    raise exception 'Stok üst sınırı aşıldı.' using errcode = 'P0001', hint = 'INVALID_QUANTITY';
  end if;
  if v_after = v_before then
    return jsonb_build_object('product_id', v_p.id, 'variant_id', p_variant_id, 'stock_before', v_before, 'stock_after', v_after, 'changed', false);
  end if;

  v_type := case p_mode when 'add' then 'manual_add' when 'remove' then 'manual_remove' else 'manual_set' end;

  if p_variant_id is not null then
    update public.product_variants set stock = v_after where id = p_variant_id;
    select p.stock into v_total from public.products p where p.id = v_p.id;
  else
    update public.products set stock = v_after where id = v_p.id;
    v_total := v_after;
  end if;
  if v_total <= 0 and v_p.auto_passive and v_p.status = 'active' then
    update public.products set status = 'passive' where id = v_p.id;
  end if;

  insert into public.stock_movements (store_id, product_id, variant_id, product_name, movement_type, quantity_change, stock_before, stock_after, reference_type, note, actor_id)
  values (v_p.store_id, v_p.id, p_variant_id, v_p.name, v_type, v_after - v_before, v_before, v_after, 'manual', nullif(left(btrim(coalesce(p_note, '')), 300), ''), v_uid);

  return jsonb_build_object('product_id', v_p.id, 'variant_id', p_variant_id, 'stock_before', v_before, 'stock_after', v_after, 'changed', true);
end;
$$;

-- ─── İadeler ─────────────────────────────────────────────────────────────────
create or replace function public.create_return(p_order_item_id uuid, p_quantity integer, p_reason text, p_description text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_i record;
  v_already integer;
  v_id uuid;
  v_no text;
  v_tries integer := 0;
  v_refund numeric(12, 2);
begin
  if v_uid is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  if p_reason not in ('defective', 'wrong_item', 'not_as_described', 'damaged_in_shipping', 'changed_mind', 'other') then
    raise exception 'İade nedeni geçersiz.' using errcode = 'P0001', hint = 'INVALID_REASON';
  end if;

  select oi.id, oi.order_id, oi.store_id, oi.seller_id, oi.product_name, oi.unit_price, oi.quantity,
         o.buyer_id, o.status as order_status, o.delivered_at
    into v_i
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
   where oi.id = p_order_item_id;

  if v_i.id is null or v_i.buyer_id <> v_uid then
    raise exception 'Sipariş kalemi bulunamadı.' using errcode = 'P0001', hint = 'ITEM_NOT_FOUND';
  end if;

  -- Aynı siparişteki eşzamanlı iade taleplerini sıraya sok.
  perform 1 from public.orders o where o.id = v_i.order_id for update;

  if v_i.order_status <> 'delivered' then
    raise exception 'Yalnızca teslim edilen siparişler için iade talebi açılabilir.' using errcode = 'P0001', hint = 'NOT_DELIVERED';
  end if;
  if v_i.delivered_at is null or now() > v_i.delivered_at + make_interval(days => public.return_window_days()) then
    raise exception 'İade süresi doldu (teslimden sonra % gün).', public.return_window_days() using errcode = 'P0001', hint = 'RETURN_WINDOW';
  end if;

  select coalesce(sum(r.quantity), 0) into v_already
    from public.returns r where r.order_item_id = p_order_item_id and r.status <> 'rejected';
  if p_quantity is null or p_quantity < 1 or p_quantity > v_i.quantity - v_already then
    raise exception 'İade adedi geçersiz (iade edilebilir: % adet).', v_i.quantity - v_already using errcode = 'P0001', hint = 'INVALID_QUANTITY';
  end if;

  v_refund := round(v_i.unit_price * p_quantity, 2);

  loop
    v_no := public.new_code('IR-');
    begin
      insert into public.returns (return_no, order_id, order_item_id, store_id, seller_id, buyer_id, product_name, quantity, reason, description, refund_amount)
      values (v_no, v_i.order_id, v_i.id, v_i.store_id, v_i.seller_id, v_uid, v_i.product_name, p_quantity, p_reason,
              nullif(left(btrim(coalesce(p_description, '')), 800), ''), v_refund)
      returning id into v_id;
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries >= 5 then raise; end if;
    end;
  end loop;

  insert into public.return_events (return_id, from_status, to_status, actor_id, actor_role)
  values (v_id, null, 'requested', v_uid, 'buyer');

  return jsonb_build_object('id', v_id, 'return_no', v_no, 'status', 'requested', 'refund_amount', v_refund);
end;
$$;

create or replace function public.transition_return(
  p_return_id uuid,
  p_to text,
  p_note text default null,
  p_carrier text default null,
  p_tracking text default null,
  p_restock boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_r public.returns%rowtype;
  v_exists boolean;
  v_admin boolean;
  v_is_seller boolean;
  v_is_buyer boolean;
  v_role text;
  v_now timestamptz := now();
  v_note text := nullif(left(btrim(coalesce(p_note, '')), 500), '');
  v_carrier text := nullif(left(btrim(coalesce(p_carrier, '')), 60), '');
  v_tracking text := nullif(left(btrim(coalesce(p_tracking, '')), 80), '');
  v_item record;
  v_before integer;
  v_deductions jsonb;
  v_ded_total numeric(12, 2);
  v_restock boolean := coalesce(p_restock, true);
begin
  if v_uid is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  if p_to not in ('requested', 'approved', 'rejected', 'shipped', 'received', 'refunded') then
    raise exception 'Geçersiz iade durumu.' using errcode = 'P0001', hint = 'INVALID_STATUS';
  end if;

  select * into v_r from public.returns where id = p_return_id for update;
  v_exists := found;
  v_admin := public.is_admin();
  v_is_seller := v_exists and v_r.seller_id = v_uid;
  v_is_buyer := v_exists and v_r.buyer_id = v_uid;
  if not v_exists or not (v_admin or v_is_seller or v_is_buyer) then
    raise exception 'İade talebi bulunamadı.' using errcode = 'P0001', hint = 'RETURN_NOT_FOUND';
  end if;
  v_role := case when v_admin then 'admin' when v_is_seller then 'seller' else 'buyer' end;

  if not public.return_transition_allowed(v_r.status, p_to) then
    raise exception 'Bu iade durumu değişikliği yapılamaz.' using errcode = 'P0001', hint = 'INVALID_TRANSITION';
  end if;
  -- Müşteri yalnızca "kargoya verdim" diyebilir; diğer adımlar satıcı / yöneticidir.
  if p_to = 'shipped' then
    if not (v_is_buyer or v_admin) then
      raise exception 'İade kargosunu yalnızca müşteri bildirebilir.' using errcode = '42501', hint = 'FORBIDDEN';
    end if;
  elsif not (v_is_seller or v_admin) then
    raise exception 'Bu iade talebini güncelleme yetkin yok.' using errcode = '42501', hint = 'FORBIDDEN';
  end if;
  if p_to = 'rejected' and char_length(coalesce(v_note, '')) < 3 then
    raise exception 'Ret nedenini yaz.' using errcode = 'P0001', hint = 'REASON_REQUIRED';
  end if;

  if p_to = 'approved' then
    update public.returns set status = 'approved', approved_at = v_now where id = v_r.id;
  elsif p_to = 'rejected' then
    update public.returns set status = 'rejected', rejection_reason = v_note where id = v_r.id;
  elsif p_to = 'shipped' then
    update public.returns set status = 'shipped', shipped_at = v_now, carrier = v_carrier, tracking_no = v_tracking where id = v_r.id;
  elsif p_to = 'received' then
    if v_restock then
      select oi.product_id, oi.variant_id, oi.product_name into v_item from public.order_items oi where oi.id = v_r.order_item_id;
      if v_item.product_id is not null then
        perform 1 from public.products p where p.id = v_item.product_id for update;
        if found then
          if v_item.variant_id is not null then
            select x.stock into v_before from public.product_variants x where x.id = v_item.variant_id for update;
            if found then
              update public.product_variants set stock = v_before + v_r.quantity where id = v_item.variant_id;
              insert into public.stock_movements (store_id, product_id, variant_id, product_name, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, note, actor_id)
              values (v_r.store_id, v_item.product_id, v_item.variant_id, v_item.product_name, 'return_restock', v_r.quantity, v_before, v_before + v_r.quantity, 'return', v_r.id, v_r.return_no, v_uid);
            end if;
          else
            select p.stock into v_before from public.products p where p.id = v_item.product_id;
            update public.products set stock = v_before + v_r.quantity where id = v_item.product_id;
            insert into public.stock_movements (store_id, product_id, product_name, movement_type, quantity_change, stock_before, stock_after, reference_type, reference_id, note, actor_id)
            values (v_r.store_id, v_item.product_id, v_item.product_name, 'return_restock', v_r.quantity, v_before, v_before + v_r.quantity, 'return', v_r.id, v_r.return_no, v_uid);
          end if;
        end if;
      end if;
    end if;
    update public.returns
       set status = 'received', received_at = v_now, restock = v_restock,
           restocked_at = case when v_restock then v_now else null end
     where id = v_r.id;
  elsif p_to = 'refunded' then
    -- Finans kancası: hakediş defterine NEGATİF kayıt. Gerçek para iadesi (ödeme sağlayıcısı) bağlı DEĞİLDİR.
    v_deductions := public.compute_deductions(-v_r.refund_amount);
    v_ded_total := public.deductions_total(v_deductions);
    insert into public.seller_ledger (store_id, seller_id, order_id, return_id, entry_type, gross_amount, discount_amount, shipping_amount, deductions, deduction_total, net_amount, available_at, description)
    values (v_r.store_id, v_r.seller_id, v_r.order_id, v_r.id, 'return', -v_r.refund_amount, 0, 0, v_deductions, v_ded_total,
            -v_r.refund_amount - v_ded_total, v_now, v_r.return_no);
    update public.returns set status = 'refunded', refunded_at = v_now where id = v_r.id;
  end if;

  insert into public.return_events (return_id, from_status, to_status, actor_id, actor_role, note)
  values (v_r.id, v_r.status, p_to, v_uid, v_role, v_note);

  return jsonb_build_object('id', v_r.id, 'return_no', v_r.return_no, 'status', p_to);
end;
$$;

-- ─── Soru–Cevap ──────────────────────────────────────────────────────────────
create or replace function public.ask_question(p_product_id uuid, p_question text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_q text := btrim(coalesce(p_question, ''));
  v_p public.products%rowtype;
  v_name text;
  v_display text;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Soru sormak için giriş yapmalısın.' using errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  if char_length(v_q) < 5 or char_length(v_q) > 500 then
    raise exception 'Sorun 5–500 karakter olmalı.' using errcode = 'P0001', hint = 'INVALID_QUESTION';
  end if;
  select * into v_p from public.products where id = p_product_id;
  if not found or v_p.deleted_at is not null or v_p.status <> 'active' or not public.store_is_public(v_p.store_id) then
    raise exception 'Ürün bulunamadı.' using errcode = 'P0001', hint = 'PRODUCT_NOT_FOUND';
  end if;
  if v_p.seller_id = v_uid then
    raise exception 'Kendi ürününe soru soramazsın.' using errcode = 'P0001', hint = 'OWN_PRODUCT';
  end if;
  -- Hız sınırı: saatte 5 soru; aynı üründe yanıtsız en fazla 2 soru.
  if (select count(*) from public.product_questions q where q.asker_id = v_uid and q.created_at > now() - interval '1 hour') >= 5
     or (select count(*) from public.product_questions q where q.asker_id = v_uid and q.product_id = p_product_id and q.status = 'pending') >= 2 then
    raise exception 'Çok fazla soru sordun. Bir süre sonra tekrar dene.' using errcode = 'P0001', hint = 'RATE_LIMIT';
  end if;

  select btrim(coalesce(p.full_name, '')) into v_name from public.profiles p where p.id = v_uid;
  v_display := case
    when coalesce(v_name, '') = '' then 'Müşteri'
    else upper(left(split_part(v_name, ' ', 1), 1)) || '***'
         || case when position(' ' in v_name) > 0 then ' ' || upper(left(reverse(split_part(reverse(v_name), ' ', 1)), 1)) || '.' else '' end
  end;

  insert into public.product_questions (product_id, store_id, asker_id, asker_display, question)
  values (v_p.id, v_p.store_id, v_uid, v_display, v_q)
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'status', 'pending');
end;
$$;

create or replace function public.answer_question(p_question_id uuid, p_answer text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_a text := btrim(coalesce(p_answer, ''));
  v_q public.product_questions%rowtype;
begin
  if v_uid is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  if char_length(v_a) < 2 or char_length(v_a) > 1000 then
    raise exception 'Yanıt 2–1000 karakter olmalı.' using errcode = 'P0001', hint = 'INVALID_ANSWER';
  end if;
  select q.* into v_q from public.product_questions q where q.id = p_question_id for update;
  if not found or not (public.owns_store(v_q.store_id) or public.is_admin()) then
    raise exception 'Soru bulunamadı.' using errcode = 'P0001', hint = 'QUESTION_NOT_FOUND';
  end if;
  if v_q.status = 'hidden' then
    raise exception 'Yayından kaldırılan soru yanıtlanamaz.' using errcode = 'P0001', hint = 'HIDDEN';
  end if;
  update public.product_questions
     set answer = v_a, status = 'answered', answered_by = v_uid, answered_at = now()
   where id = v_q.id;
  return jsonb_build_object('id', v_q.id, 'status', 'answered');
end;
$$;

create or replace function public.set_question_hidden(p_question_id uuid, p_hidden boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_q public.product_questions%rowtype;
  v_status text;
begin
  if v_uid is null then
    raise exception 'Giriş yapmalısın.' using errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  select q.* into v_q from public.product_questions q where q.id = p_question_id for update;
  if not found or not (public.owns_store(v_q.store_id) or public.is_admin()) then
    raise exception 'Soru bulunamadı.' using errcode = 'P0001', hint = 'QUESTION_NOT_FOUND';
  end if;
  v_status := case when p_hidden then 'hidden' when v_q.answer is not null then 'answered' else 'pending' end;
  update public.product_questions set status = v_status where id = v_q.id;
  return jsonb_build_object('id', v_q.id, 'status', v_status);
end;
$$;

-- ─── Ödemeler (sağlayıcıdan bağımsız kayıt; GERÇEK para transferi yok) ────────
create or replace function public.plan_payout(p_store_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_store public.stores%rowtype;
  v_amount numeric(12, 2);
  v_id uuid;
  v_no text;
  v_tries integer := 0;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.' using errcode = '42501', hint = 'FORBIDDEN';
  end if;
  select * into v_store from public.stores where id = p_store_id for update;
  if not found then
    raise exception 'Mağaza bulunamadı.' using errcode = 'P0001', hint = 'NOT_FOUND';
  end if;

  perform 1 from public.seller_ledger l
   where l.store_id = p_store_id and l.status = 'pending' and l.payout_id is null and l.available_at is not null and l.available_at <= now()
   for update;
  select coalesce(sum(l.net_amount), 0) into v_amount
    from public.seller_ledger l
   where l.store_id = p_store_id and l.status = 'pending' and l.payout_id is null and l.available_at is not null and l.available_at <= now();

  if v_amount <= 0 then
    raise exception 'Ödemeye hazır bakiye yok.' using errcode = 'P0001', hint = 'NO_BALANCE';
  end if;

  loop
    v_no := public.new_code('OD-');
    begin
      insert into public.seller_payouts (payout_no, store_id, seller_id, amount, planned_for, created_by)
      values (v_no, v_store.id, v_store.owner_id, v_amount, ((now() at time zone 'Europe/Istanbul')::date + 1), v_uid)
      returning id into v_id;
      exit;
    exception when unique_violation then
      v_tries := v_tries + 1;
      if v_tries >= 5 then raise; end if;
    end;
  end loop;

  update public.seller_ledger l set payout_id = v_id
   where l.store_id = p_store_id and l.status = 'pending' and l.payout_id is null and l.available_at is not null and l.available_at <= now();

  return jsonb_build_object('id', v_id, 'payout_no', v_no, 'amount', v_amount, 'status', 'planned');
end;
$$;

create or replace function public.set_payout_status(p_payout_id uuid, p_status text, p_provider text default null, p_reference text default null, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_p public.seller_payouts%rowtype;
begin
  if v_uid is null or not public.is_admin() then
    raise exception 'Bu işlem için yönetici yetkisi gerekir.' using errcode = '42501', hint = 'FORBIDDEN';
  end if;
  select * into v_p from public.seller_payouts where id = p_payout_id for update;
  if not found then
    raise exception 'Ödeme bulunamadı.' using errcode = 'P0001', hint = 'NOT_FOUND';
  end if;
  if not (
       (v_p.status = 'planned' and p_status in ('processing', 'paid', 'cancelled', 'failed'))
    or (v_p.status = 'processing' and p_status in ('paid', 'failed'))
  ) then
    raise exception 'Bu ödeme durumu değişikliği yapılamaz.' using errcode = 'P0001', hint = 'INVALID_TRANSITION';
  end if;

  update public.seller_payouts
     set status = p_status,
         provider = coalesce(nullif(left(btrim(coalesce(p_provider, '')), 40), ''), provider),
         provider_reference = coalesce(nullif(left(btrim(coalesce(p_reference, '')), 120), ''), provider_reference),
         note = coalesce(nullif(left(btrim(coalesce(p_note, '')), 300), ''), note),
         paid_at = case when p_status = 'paid' then now() else paid_at end
   where id = v_p.id;

  if p_status = 'paid' then
    update public.seller_ledger set status = 'paid' where payout_id = v_p.id and status = 'pending';
  elsif p_status in ('failed', 'cancelled') then
    -- Kayıtlar tekrar ödemeye hazır bakiyeye döner.
    update public.seller_ledger set payout_id = null where payout_id = v_p.id and status = 'pending';
  end if;

  return jsonb_build_object('id', v_p.id, 'status', p_status);
end;
$$;
