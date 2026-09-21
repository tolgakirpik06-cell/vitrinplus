#!/usr/bin/env bash
# Yerel, boş bir PostgreSQL üzerinde migration + kural testlerini çalıştırır.
# Gerçek Supabase projene DOKUNMAZ. Kullanım: PGUSER/PGHOST ayarlı bir psql ile
#   bash supabase/tests/run-local.sh [veritabani_adi]
set -euo pipefail
DB="${1:-vp_test}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(dirname "$HERE")"
PSQL="psql -X -q -v ON_ERROR_STOP=1"
${PSQL} -d postgres -c "drop database if exists ${DB}" -c "create database ${DB}"
${PSQL} -d "${DB}" -f "${HERE}/00_supabase_shim.sql"
for f in "${ROOT}"/migrations/*.sql; do
  echo "migration: $(basename "$f")"
  ${PSQL} -d "${DB}" -f "$f"
done
${PSQL} -o /dev/null -d "${DB}" -f "${HERE}/10_rules.test.sql" 2>&1 | tee /tmp/vp-rules.out
echo "PASS sayısı: $(grep -c 'PASS:' /tmp/vp-rules.out || true)"
bash "${HERE}/20_concurrency.sh" "${DB}"
