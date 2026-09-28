-- Enforce minimization at the write boundary, including direct privileged writes.
-- Historical application JSON is preserved; audit/redaction of old records is a separate controlled operation.
begin;
create or replace function public.sanitize_seller_application(p_input jsonb)
returns jsonb language plpgsql immutable set search_path = '' as $$
declare
  result jsonb := '{"version":1,"documents":{}}'::jsonb;
  section text;
  key text;
  allowed text[];
  obj jsonb;
  value jsonb;
begin
  if jsonb_typeof(p_input) is distinct from 'object' or octet_length(p_input::text) > 20000 then
    raise exception 'Başvuru verisi geçersiz.' using hint = 'INVALID_APPLICATION';
  end if;
  foreach section in array array['contact','business','shipping','store','agreement'] loop
    allowed := case section
      when 'contact' then array['name','email','phone']
      when 'business' then array['ticariUnvan','vergiDairesi','vergiNumarasi','isletmeAdresi','il','ilce','sirketUnvani','mersisNumarasi','ticaretSicilNumarasi','yetkiliKisi','sirketAdresi']
      when 'shipping' then array['il','ilce','acikAdres','iadeAdresiAyni','iadeIl','iadeIlce','iadeAcikAdres']
      when 'store' then array['name','description','categories']
      else array['contract','kvkk','commercialMessages'] end;
    obj := '{}'::jsonb;
    foreach key in array allowed loop
      value := p_input -> section -> key;
      if key = 'categories' then
        select coalesce(jsonb_agg(to_jsonb(left(item #>> '{}', 60))), '[]'::jsonb) into value
        from (select item from jsonb_array_elements(case when jsonb_typeof(value) = 'array' then value else '[]'::jsonb end) as x(item)
          where jsonb_typeof(item) = 'string' limit 12) a;
      elsif key in ('contract','kvkk','commercialMessages','iadeAdresiAyni') then
        value := case when jsonb_typeof(value) = 'boolean' then value else 'false'::jsonb end;
      elsif jsonb_typeof(value) = 'string' then
        -- Personal tax numbers (11-digit TCKN) must never be stored here.
        if key = 'vergiNumarasi' and (value #>> '{}') !~ '^[0-9]{10}$' then value := '""'::jsonb;
        else value := to_jsonb(left(btrim(value #>> '{}'), case when key = 'description' then 1000 else 300 end)); end if;
      else value := '""'::jsonb;
      end if;
      obj := obj || jsonb_build_object(key, value);
    end loop;
    result := result || jsonb_build_object(section, obj);
  end loop;
  -- Re-mask even a malicious full IBAN supplied under ibanMasked. No arbitrary bank keys survive.
  result := result || jsonb_build_object('bank', jsonb_build_object(
    'ibanMasked', case when jsonb_typeof(p_input #> '{bank,ibanMasked}') = 'string'
      and (p_input #>> '{bank,ibanMasked}') ~ '[0-9]{4}$' then 'TR** **** **** **** **** ' || right(p_input #>> '{bank,ibanMasked}', 4) else '' end,
    'bankName', case when jsonb_typeof(p_input #> '{bank,bankName}') = 'string' then left(p_input #>> '{bank,bankName}', 80) else '' end,
    'holderName', case when jsonb_typeof(p_input #> '{bank,holderName}') = 'string' then left(p_input #>> '{bank,holderName}', 120) else '' end));
  foreach key in array array['sellerType','invoicePreference','planId'] loop
    value := p_input -> key;
    result := result || jsonb_build_object(key, case when jsonb_typeof(value) = 'string' then to_jsonb(left(value #>> '{}', 60)) else 'null'::jsonb end);
  end loop;
  return result;
end;
$$;
revoke all on function public.sanitize_seller_application(jsonb) from public, anon, authenticated;

create or replace function public.seller_application_allowlist_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.application := public.sanitize_seller_application(new.application);
  return new;
end;
$$;
revoke all on function public.seller_application_allowlist_guard() from public, anon, authenticated;
drop trigger if exists seller_application_allowlist_guard on public.seller_accounts;
create trigger seller_application_allowlist_guard before insert or update of application on public.seller_accounts
for each row execute function public.seller_application_allowlist_guard();
commit;
