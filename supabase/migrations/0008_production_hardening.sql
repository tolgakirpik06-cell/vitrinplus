-- Forward-only security changes. Existing orders, ledger and application history are preserved.
-- Deploy before the application. Rollback must never re-enable the old coupon or approval bypass.
begin;
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
  if v_account.status not in ('approved', 'suspended') or p_status not in ('approved', 'suspended') then
    raise exception 'Başvuru kararını belge inceleme ekranından ver.' using errcode = 'P0001', hint = 'REVIEW_REQUIRED';
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

-- Remove the old overload: default arguments preserve add/remove callers; set requires expected stock.
drop function if exists public.adjust_stock(uuid, uuid, text, integer, text);
create or replace function public.adjust_stock(
  p_product_id uuid,
  p_variant_id uuid,
  p_mode text,
  p_quantity integer,
  p_note text default null,
  p_expected_stock integer default null
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

  if p_mode = 'set' and (p_expected_stock is null or p_expected_stock <> v_before) then
    raise exception 'Stok değişti; güncel stoğu yükleyip yeniden dene.' using errcode = 'P0001', hint = 'STOCK_CONFLICT';
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

revoke all on function public.adjust_stock(uuid, uuid, text, integer, text, integer) from public, anon, authenticated;
grant execute on function public.adjust_stock(uuid, uuid, text, integer, text, integer) to authenticated;
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
  v_coupon_ok := false; -- Platform coupons disabled; historical orders remain unchanged.
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
          null, v_express,
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

commit;
