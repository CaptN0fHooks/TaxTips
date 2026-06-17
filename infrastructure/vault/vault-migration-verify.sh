#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
POLICY_DIR="$ROOT_DIR/infrastructure/vault/vault-policies"

declare -a FAILURES=()
declare -a PASSES=()

pass() {
  PASSES+=("$1")
  printf 'PASS: %s\n' "$1"
}

fail() {
  FAILURES+=("$1")
  printf 'FAIL: %s\n' "$1" >&2
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    fail "missing required command: $1"
    return 1
  fi
}

json_field() {
  node -e "let data=''; process.stdin.on('data', c => data += c); process.stdin.on('end', () => { const obj = JSON.parse(data); const path = process.argv[1].split('.'); let cur = obj; for (const part of path) cur = cur?.[part]; if (cur === undefined || cur === null) process.exit(2); process.stdout.write(String(cur)); });" "$1"
}

require_command vault || true
require_command node || true

status_json="$(vault status -format=json 2>/dev/null || true)"
if [[ -z "$status_json" ]]; then
  fail "vault status failed"
else
  sealed="$(printf '%s' "$status_json" | json_field sealed || true)"
  storage_type="$(printf '%s' "$status_json" | json_field storage_type || true)"
  if [[ "$sealed" == "false" ]]; then pass "Vault is unsealed"; else fail "Vault sealed=$sealed"; fi
  if [[ "$storage_type" == "raft" ]]; then pass "Vault storage is raft"; else fail "Vault storage is $storage_type, expected raft"; fi
fi

declare -A PUBKEY_FILES=(
  ["taxtips-federal-specialist"]="jurisdictions/us-federal/signatures/federal-specialist.pub"
  ["taxtips-ca-specialist"]="jurisdictions/california/signatures/ca-specialist.pub"
  ["taxtips-tax-director"]="jurisdictions/us-federal/signatures/tax-director.pub"
)
TAX_DIRECTOR_CA_PUBKEY="jurisdictions/california/signatures/tax-director.pub"

test_input="$(printf 'taxtips-vault-migration-verify' | base64 | tr -d '\n')"

for key in "${!PUBKEY_FILES[@]}"; do
  key_json="$(vault read -format=json "transit/keys/$key" 2>/dev/null || true)"
  if [[ -z "$key_json" ]]; then
    fail "Transit key missing: $key"
    continue
  fi
  pass "Transit key exists: $key"

  signature="$(vault write -field=signature "transit/sign/$key" input="$test_input" 2>/dev/null || true)"
  if [[ -z "$signature" ]]; then
    fail "Test sign failed: $key"
    continue
  fi
  valid="$(vault write -field=valid "transit/verify/$key" input="$test_input" signature="$signature" 2>/dev/null || true)"
  if [[ "$valid" == "true" ]]; then pass "Sign/verify round-trip: $key"; else fail "Sign/verify failed: $key"; fi

  vault_pubkey="$(printf '%s' "$key_json" | node -e "let data=''; process.stdin.on('data', c => data += c); process.stdin.on('end', () => { const obj = JSON.parse(data); const keys = obj.data?.keys || {}; const latest = obj.data?.latest_version || Object.keys(keys).sort().at(-1); const pub = keys[String(latest)]?.public_key || obj.data?.public_key; if (!pub) process.exit(2); process.stdout.write(pub.trim()); });" 2>/dev/null || true)"
  repo_pubkey="$(tr -d '\r\n ' < "$ROOT_DIR/${PUBKEY_FILES[$key]}")"
  if [[ -n "$vault_pubkey" && "$vault_pubkey" == "$repo_pubkey" ]]; then
    pass "Committed pubkey matches Vault key: $key"
  else
    fail "SCENARIO B DETECTED - pubkeys must be re-committed for $key"
  fi
done

if [[ -f "$ROOT_DIR/$TAX_DIRECTOR_CA_PUBKEY" ]]; then
  ca_tax_director_pubkey="$(tr -d '\r\n ' < "$ROOT_DIR/$TAX_DIRECTOR_CA_PUBKEY")"
  federal_tax_director_pubkey="$(tr -d '\r\n ' < "$ROOT_DIR/${PUBKEY_FILES[taxtips-tax-director]}")"
  if [[ "$ca_tax_director_pubkey" == "$federal_tax_director_pubkey" ]]; then
    pass "California Tax Director pubkey duplicate matches canonical Tax Director key"
  else
    fail "California Tax Director pubkey duplicate does not match canonical Tax Director key"
  fi
else
  fail "Missing California Tax Director pubkey duplicate: $TAX_DIRECTOR_CA_PUBKEY"
fi

declare -A POLICIES=(
  ["taxtips-federal-specialist-sign"]="federal-specialist-sign.hcl"
  ["taxtips-ca-specialist-sign"]="ca-specialist-sign.hcl"
  ["taxtips-tax-director-sign"]="tax-director-sign.hcl"
  ["taxtips-verify"]="verify.hcl"
  ["taxtips-kv-read"]="kv-read.hcl"
)

for policy in "${!POLICIES[@]}"; do
  actual="$(mktemp)"
  expected="$(mktemp)"
  if vault policy read "$policy" >"$actual" 2>/dev/null; then
    sed '/^[[:space:]]*$/d' "$POLICY_DIR/${POLICIES[$policy]}" >"$expected"
    sed -i '/^[[:space:]]*$/d' "$actual"
    if diff -u "$expected" "$actual" >/dev/null; then
      pass "Policy matches file: $policy"
    else
      fail "Policy mismatch: $policy"
    fi
  else
    fail "Policy missing: $policy"
  fi
  rm -f "$actual" "$expected"
done

audit_output="$(vault audit list -detailed 2>/dev/null || true)"
if printf '%s\n' "$audit_output" | grep -q '^file/'; then
  audit_path="$(printf '%s\n' "$audit_output" | awk '/file_path/ {print $2; exit}')"
  if [[ -n "$audit_path" && "$audit_path" != /tmp/* ]]; then
    pass "File audit device active on persistent-looking path: $audit_path"
  else
    fail "File audit device path is missing or under /tmp: ${audit_path:-unknown}"
  fi
else
  fail "File audit device not active"
fi

printf '\nMIGRATION SUMMARY: %s passed, %s failed\n' "${#PASSES[@]}" "${#FAILURES[@]}"
if [[ "${#FAILURES[@]}" -eq 0 ]]; then
  printf 'MIGRATION VERIFIED\n'
  exit 0
fi

printf 'MIGRATION FAILED\n' >&2
exit 1
