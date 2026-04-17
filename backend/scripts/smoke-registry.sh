#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://localhost:3002}"

echo "=== API LIST ==="
curl -s "$BASE_URL/api/recommendations?page=1&limit=20" | python3 -c 'import sys,json; d=json.load(sys.stdin); print({"page": d.get("page"), "pages": d.get("pages"), "total": d.get("total"), "items": len(d.get("items", []))})'

echo ""
echo "=== API DETAIL ==="
ID=$(curl -s "$BASE_URL/api/recommendations?page=1&limit=1" | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("items") or [{}])[0].get("id", ""))')

if [ -z "$ID" ]; then
  echo "No ID returned from recommendations list"
  exit 1
fi

curl -s "$BASE_URL/api/recommendations/$ID" | python3 -c 'import sys,json; d=json.load(sys.stdin); print({"id": d.get("id"), "seq_no": d.get("seq_no"), "status": d.get("status_normalized"), "has_case": "case_note" in d, "has_adgs": "adgs_position" in d})'
