#!/usr/bin/env bash
# Eşzamanlılık testleri: 10_rules.test.sql'den sonra, aynı veritabanında çalıştırılır.
#   1) Son 1 adet stok için iki müşteri aynı anda sipariş verir → yalnızca biri başarılı olmalı.
#   2) Aynı müşteri aynı idempotency anahtarıyla iki eşzamanlı istek gönderir → tek sipariş, tek stok düşümü.
set -uo pipefail
DB="${1:-vp_test}"
PSQL="psql -X -q -t -A -d ${DB}"
CUST1='a0000000-0000-0000-0000-000000000021'
CUST2='a0000000-0000-0000-0000-000000000022'
RUN="$(date +%s%N)"
ADDR='{"ship_to":{"name":"Test Kişi","phone":"0532 111 22 33","city":"İstanbul","district":"Kadıköy","address":"Moda Cad. No 5"}}'

${PSQL} -c "update public.products set stock = 1 where id = 'b0000000-0000-0000-0000-000000000024'; delete from public.stock_movements where false;" >/dev/null

order_sql() { # $1 = kullanıcı  $2 = ürün  $3 = anahtar  $4 = commit öncesi bekleme (sn)
cat <<SQL
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '$1', true);
do \$\$
declare r jsonb; v_hint text;
begin
  r := public.place_order('[{"product_id":"$2","quantity":1}]', '$ADDR'::jsonb, '$3');
  raise notice 'SONUC:OK:%', r ->> 'duplicate';
exception when others then
  get stacked diagnostics v_hint = pg_exception_hint;
  raise notice 'SONUC:HATA:%', coalesce(v_hint, sqlstate);
end \$\$;
select pg_sleep($4);
commit;
SQL
}

ITEMS_BEFORE=$(${PSQL} -c "select count(*) from public.order_items where product_id = 'b0000000-0000-0000-0000-000000000024'")
echo "── Senaryo 1: son stok için yarış"
order_sql "$CUST1" b0000000-0000-0000-0000-000000000024 race-key-A-${RUN} 2 | ${PSQL} 2>&1 | grep SONUC > /tmp/vp-race-a.txt &
sleep 0.6
order_sql "$CUST2" b0000000-0000-0000-0000-000000000024 race-key-B-${RUN} 0 | ${PSQL} 2>&1 | grep SONUC > /tmp/vp-race-b.txt &
wait
cat /tmp/vp-race-a.txt /tmp/vp-race-b.txt
OK_COUNT=$(cat /tmp/vp-race-a.txt /tmp/vp-race-b.txt | grep -c 'SONUC:OK')
ERR_COUNT=$(cat /tmp/vp-race-a.txt /tmp/vp-race-b.txt | grep -c 'SONUC:HATA:OUT_OF_STOCK')
STOCK=$(${PSQL} -c "select stock from public.products where id = 'b0000000-0000-0000-0000-000000000024'")
ORDERS=$(( $(${PSQL} -c "select count(*) from public.order_items where product_id = 'b0000000-0000-0000-0000-000000000024'") - ITEMS_BEFORE ))
echo "başarılı=${OK_COUNT} stok_yetersiz=${ERR_COUNT} kalan_stok=${STOCK} sipariş_kalemi=${ORDERS}"
if [ "${OK_COUNT}" = "1" ] && [ "${ERR_COUNT}" = "1" ] && [ "${STOCK}" = "0" ] && [ "${ORDERS}" = "1" ]; then echo "PASS: eşzamanlılık: son stok yalnızca bir siparişe gider"; else echo "FAIL: son stok yarışı"; exit 1; fi

echo "── Senaryo 2: aynı anahtarla eşzamanlı çift istek"
${PSQL} -c "update public.products set stock = 50 where id = 'b0000000-0000-0000-0000-000000000021'" >/dev/null
BEFORE=$(${PSQL} -c "select count(*) from public.orders where buyer_id = '${CUST1}'")
order_sql "$CUST1" b0000000-0000-0000-0000-000000000021 dup-key-${RUN} 2 | ${PSQL} 2>&1 | grep SONUC > /tmp/vp-dup-a.txt &
sleep 0.6
order_sql "$CUST1" b0000000-0000-0000-0000-000000000021 dup-key-${RUN} 0 | ${PSQL} 2>&1 | grep SONUC > /tmp/vp-dup-b.txt &
wait
cat /tmp/vp-dup-a.txt /tmp/vp-dup-b.txt
AFTER=$(${PSQL} -c "select count(*) from public.orders where buyer_id = '${CUST1}'")
STOCK2=$(${PSQL} -c "select stock from public.products where id = 'b0000000-0000-0000-0000-000000000021'")
DUP=$(cat /tmp/vp-dup-a.txt /tmp/vp-dup-b.txt | grep -c 'SONUC:OK:true')
NEW=$(cat /tmp/vp-dup-a.txt /tmp/vp-dup-b.txt | grep -c 'SONUC:OK:false')
echo "yeni_sipariş=$((AFTER-BEFORE)) tekrar_yanıtı=${DUP} yeni_yanıtı=${NEW} kalan_stok=${STOCK2}"
if [ "$((AFTER-BEFORE))" = "1" ] && [ "${DUP}" = "1" ] && [ "${NEW}" = "1" ] && [ "${STOCK2}" = "49" ]; then echo "PASS: eşzamanlılık: aynı anahtarla çift istek tek sipariş üretir"; else echo "FAIL: idempotency yarışı"; exit 1; fi
