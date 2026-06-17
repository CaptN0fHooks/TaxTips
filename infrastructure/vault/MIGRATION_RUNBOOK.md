# Vault Raft Migration Runbook

Directive: CODEX_DIRECTIVE_2.md v1.0.0
Target Vault: Vault 2.0.x with Integrated Storage (Raft)
Status: operator runbook, not yet executed

## Stop Rule

Do not run a production signing ceremony until `infrastructure/vault/vault-migration-verify.sh` exits `0` and the Principal Engineer plus CISO sign off below.

If any command returns an unexpected Vault error, stop and escalate to the Principal Engineer. Do not attempt a workaround during the signing infrastructure migration.

## Prerequisites

- Current dev Vault is still running and reachable at `VAULT_ADDR`.
- Current operator has a token with permission to read Transit key metadata, save snapshots if supported, configure audit devices, write policies, and manage auth methods.
- Persistent volume for Raft is mounted at the path configured in `vault-raft.hcl`.
- Persistent audit log directory exists and is writable by the Vault runtime user.
- Docker or host service definition is ready to launch Vault with `infrastructure/vault/vault-raft.hcl`.
- Repo working tree includes committed public keys:
  - `jurisdictions/us-federal/signatures/federal-specialist.pub`
  - `jurisdictions/california/signatures/ca-specialist.pub`
  - `jurisdictions/us-federal/signatures/tax-director.pub`
- No production signatures or immutable tags have been cut from the dev-mode Vault.

## Phase 1: Snapshot Capture From Dev Vault

This phase is time-sensitive. It must happen before any dev Vault restart.

```bash
vault status
vault read transit/keys/taxtips-federal-specialist
vault read transit/keys/taxtips-ca-specialist
vault read transit/keys/taxtips-tax-director
vault operator raft snapshot save vault-snapshot.snap
sha256sum vault-snapshot.snap > vault-snapshot.snap.sha256
```

Expected result:

- `vault status` shows sealed `false`.
- All three Transit keys are readable.
- Snapshot command succeeds.

If `vault operator raft snapshot save` is unsupported against the current in-memory dev Vault, stop and move to Scenario B.

## Phase 2: Start New Vault With Raft

Install or mount `infrastructure/vault/vault-raft.hcl` as the Vault server config.

```bash
vault server -config=infrastructure/vault/vault-raft.hcl
```

Expected result:

- Vault starts with Integrated Storage.
- Persistent data path is on the mounted volume.
- Audit file path is not under `/tmp`.

## Phase 3: Snapshot Restore

Point `VAULT_ADDR` at the new Raft Vault instance.

```bash
vault status
vault operator raft snapshot restore vault-snapshot.snap
vault status
```

Expected result:

- Restore completes.
- `vault status` shows storage type `raft`.
- Vault is unsealed after the configured unseal process.

## Phase 4: Key Verification

```bash
input="$(printf 'taxtips-migration-test' | base64 | tr -d '\n')"
vault write -field=signature transit/sign/taxtips-federal-specialist input="$input"
vault write -field=signature transit/sign/taxtips-ca-specialist input="$input"
vault write -field=signature transit/sign/taxtips-tax-director input="$input"
```

For each signature:

```bash
vault write transit/verify/<key-name> input="$input" signature="<signature>"
```

Expected result:

- Each verify response includes `valid true`.

## Phase 5: Pubkey Verification Against Repo

Run the Codex-authored verification script:

```bash
infrastructure/vault/vault-migration-verify.sh
```

Expected result for key-preservation Scenario A:

- The script prints `MIGRATION VERIFIED`.
- It exits `0`.
- Committed public keys match the restored Transit keys.

If the script prints `SCENARIO B DETECTED`, stop. Do not sign packs. Follow the Scenario B section.

## Phase 6: Policy Application

Apply the least-privilege policies from this repo.

```bash
vault policy write taxtips-federal-specialist-sign infrastructure/vault/vault-policies/federal-specialist-sign.hcl
vault policy write taxtips-ca-specialist-sign infrastructure/vault/vault-policies/ca-specialist-sign.hcl
vault policy write taxtips-tax-director-sign infrastructure/vault/vault-policies/tax-director-sign.hcl
vault policy write taxtips-verify infrastructure/vault/vault-policies/verify.hcl
vault policy write taxtips-kv-read infrastructure/vault/vault-policies/kv-read.hcl
```

Expected result:

- Each command writes successfully.
- `vault policy read <policy>` matches the repo file.

## Phase 7: Auth Method Setup

Enable AppRole for CI verification tokens and scoped signing role tokens.

```bash
vault auth enable approle

vault write auth/approle/role/taxtips-ci-verify \
  token_policies="taxtips-verify" \
  token_ttl="1h" \
  token_max_ttl="4h"

vault write auth/approle/role/taxtips-federal-specialist-sign \
  token_policies="taxtips-federal-specialist-sign" \
  token_ttl="30m" \
  token_max_ttl="2h"

vault write auth/approle/role/taxtips-ca-specialist-sign \
  token_policies="taxtips-ca-specialist-sign" \
  token_ttl="30m" \
  token_max_ttl="2h"

vault write auth/approle/role/taxtips-tax-director-sign \
  token_policies="taxtips-tax-director-sign" \
  token_ttl="30m" \
  token_max_ttl="2h"
```

Expected result:

- CI token can call `transit/verify/*` only.
- `vault-migration-verify.sh` is run under operator credentials during migration because it must read Transit key metadata and compare public keys.
- CI verification remains least-privilege and does not receive `transit/keys/*` read access.
- Signing tokens can call only their role-specific `transit/sign/<key>` path.
- No CI or signing token has root privileges.

## Phase 8: Root Token Rotation And Revocation

After policies and auth are verified:

```bash
vault token lookup
vault token revoke <migration-root-token-accessor-or-token>
```

Break-glass root token generation must use:

```bash
vault operator generate-root
```

Root tokens are not stored in CI, Vercel, local env files, or repo files.

## Phase 9: Dev Vault Decommission

Only after migration verification succeeds:

```bash
vault status
docker stop taxtips-vault
docker rename taxtips-vault taxtips-vault-dev-retired-20260615
```

Do not delete the old container until the Principal Engineer confirms retained evidence is no longer needed.

## Phase 10: Audit Device Verification

```bash
vault audit list -detailed
vault audit enable file file_path=/vault/audit/vault-audit.log
vault audit list -detailed
```

Expected result:

- File audit device is active.
- File path is persistent, not under `/tmp`.
- New audit entries appear after a test `vault read transit/keys/taxtips-federal-specialist`.

## Scenario B: Key Recreation Path

Use this path only if snapshot capture or restore fails, or if restored key public components do not match committed repo public keys.

1. Stop. Record exact failed command and output.
2. Create new non-exportable Ed25519 keys in persisted Vault:

```bash
vault secrets enable transit
vault write -f transit/keys/taxtips-federal-specialist type=ed25519 exportable=false
vault write -f transit/keys/taxtips-ca-specialist type=ed25519 exportable=false
vault write -f transit/keys/taxtips-tax-director type=ed25519 exportable=false
```

3. Export public components:

```bash
vault read -format=json transit/keys/taxtips-federal-specialist
vault read -format=json transit/keys/taxtips-ca-specialist
vault read -format=json transit/keys/taxtips-tax-director
```

4. Update repo public key files with the new public components.
5. Open PR: `infra: replace Vault Ed25519 pubkeys after key recreation (Scenario B migration)`.
6. Require Principal Engineer and CISO approval before merge.
7. Re-run `sign-gate.yml` and `infrastructure/vault/vault-migration-verify.sh`.
8. Do not sign packs until CI and local verification pass.

## Final Verification Checklist

Each item must be marked pass/fail before D8 is unblocked.

1. `vault status` returns sealed `false`.
2. `vault status` returns storage type `raft`.
3. `taxtips-federal-specialist` key exists.
4. `taxtips-ca-specialist` key exists.
5. `taxtips-tax-director` key exists.
6. Test sign/verify succeeds for all three keys.
7. Vault public keys match committed repo public keys.
8. All five policies exist and match repo HCL.
9. File audit device is active on persistent storage.
10. Root token used for migration is revoked and not present in CI or app config.

## Sign-Off

Principal Engineer: ____________________ Date: __________

CISO: _________________________________ Date: __________

Engineering Lead: ______________________ Date: __________
