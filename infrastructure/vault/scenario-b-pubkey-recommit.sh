#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

extract_pubkey() {
  local key_name="$1"
  vault read -format=json "transit/keys/$key_name" | node -e "let data=''; process.stdin.on('data', c => data += c); process.stdin.on('end', () => { const obj = JSON.parse(data); const keys = obj.data?.keys || {}; const latest = obj.data?.latest_version || Object.keys(keys).sort().at(-1); const pub = keys[String(latest)]?.public_key || obj.data?.public_key; if (!pub) throw new Error('public key missing for ' + process.argv[1]); process.stdout.write(pub.trim() + '\n'); });" "$key_name"
}

write_pubkey() {
  local key_name="$1"
  local target="$2"
  extract_pubkey "$key_name" > "$ROOT_DIR/$target"
  printf 'Updated %s from %s\n' "$target" "$key_name"
}

write_pubkey "taxtips-federal-specialist" "jurisdictions/us-federal/signatures/federal-specialist.pub"
write_pubkey "taxtips-ca-specialist" "jurisdictions/california/signatures/ca-specialist.pub"
write_pubkey "taxtips-tax-director" "jurisdictions/us-federal/signatures/tax-director.pub"
write_pubkey "taxtips-tax-director" "jurisdictions/california/signatures/tax-director.pub"

printf '\nNew public key SHA-256 hashes:\n'
sha256sum \
  "$ROOT_DIR/jurisdictions/us-federal/signatures/federal-specialist.pub" \
  "$ROOT_DIR/jurisdictions/us-federal/signatures/tax-director.pub" \
  "$ROOT_DIR/jurisdictions/california/signatures/ca-specialist.pub" \
  "$ROOT_DIR/jurisdictions/california/signatures/tax-director.pub"

printf '\nReview the diff manually. This script does not commit changes.\n'
