#!/bin/bash
# verify-deploy.sh — Verificar que el stack está funcionando correctamente
# Uso: bash scripts/verify-deploy.sh [staging|prod]

set -e

ENV=${1:-staging}
BASE_URL=""

if [ "$ENV" = "prod" ]; then
  BASE_URL="https://liriodelosvallescr.org"
else
  BASE_URL="http://localhost"
fi

PASS=0
FAIL=0

check() {
  local name=$1
  local url=$2
  local expected=$3

  result=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null || echo "000")
  if [ "$result" = "$expected" ]; then
    echo "  PASS  $name ($result)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  $name — esperado $expected, got $result"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Verificando stack Docker ==="
docker compose ps

echo ""
echo "=== Verificando servicios HTTP ($ENV) ==="

check "Next.js health"         "http://localhost:3000/api/health"    "200"
check "Directus health"        "http://localhost:8055/server/health" "200"

if [ "$ENV" = "prod" ]; then
  echo ""
  echo "=== Verificando dominios públicos ==="
  check "Sitio principal"        "$BASE_URL"                           "200"
  check "Sitio ES"               "$BASE_URL/es"                        "200"
  check "Panel Directus"         "https://admin.liriodelosvallescr.org/server/health" "200"
fi

echo ""
echo "=== Resultado: $PASS PASS / $FAIL FAIL ==="

if [ $FAIL -gt 0 ]; then
  echo "Ver logs: docker compose logs -f"
  exit 1
fi
