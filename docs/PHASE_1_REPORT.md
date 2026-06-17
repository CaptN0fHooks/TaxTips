# Phase 1 Report

Date: 2026-06-17
Status: Phase 1 foundation gates executed on `codex/phase1-foundation-completion`

## Executive Summary

Phase 1 tax-content foundation is implemented in repository form: eight versioned rule packs exist for `us-federal` and `california` tax years 2023 through 2026, the D7 smoke corpus is 400 scenarios, and the validator now performs seven pack checks including offline Ed25519 signature verification.

D8 was completed through a Scenario B signing ceremony using an isolated loopback-only Vault Raft instance at `127.0.0.1:18210`. The previous configured Raft database at `/home/mrj_dev/vault-data/raft` could not be opened by Vault in this session, so it was not mutated. New non-exportable Transit Ed25519 keys were created in `/home/mrj_dev/vault-data/phase1-raft`, public keys were recommitted, and all 20 required manifest signatures were generated.

## Deliverable Status

| Deliverable | Status | Evidence |
|---|---|---|
| D1 citation registry | COMPLETE | `schemas/citation-registry.yaml`; validator citation check passes all eight packs. |
| D2 schemas + loader interface | COMPLETE | 14 root schemas plus `schemas/api/tax-year-loader.interface.ts`; see `docs/D2_COMPLETENESS_REPORT.md`. |
| D3 eight rule packs | COMPLETE | `jurisdictions/{us-federal,california}/{2023..2026}` all structure/schema/hash/coherence clean. |
| D4 node IDs | COMPLETE | `schemas/node-ids.yaml` contains 144 scenario-exercised computation graph node IDs. |
| D5 validator CLI | COMPLETE | `tools/rule-pack-validate/src/cli.js` performs 7 checks and verifies Ed25519 signatures. |
| D6 smoke runner | COMPLETE | `tools/rule-pack-test/src/cli.js` executes all authored scenario packs. |
| D7 smoke scenarios | COMPLETE | 400 scenarios: 50 per pack across 8 packs. |
| D8 signed manifests | COMPLETE | 20 Ed25519 signatures: 2 per federal pack, 3 per California pack. |
| D9 Phase 1 report | COMPLETE | This report. |

## Gate Results

| Gate | Result |
|---|---|
| `npm run rule-pack-validate -- --all --report /tmp/phase1-validate-signed.json` | PASS — 8 packs, 7 checks each. |
| `npm run rule-pack-test -- --all --report /tmp/phase1-d7-all.json` | PASS — 400 PASS, 0 SKIP, 0 FAIL. |
| Ed25519 signatures | PASS — validator verifies manifest digest signatures offline against committed public keys. |
| Vault migration verification | PASS — `infrastructure/vault/vault-migration-verify.sh` returned 18 PASS, 0 FAIL against isolated Raft Vault. |

## Signing Ceremony

Signing algorithm: Ed25519.
Signed message: SHA-256 digest of `manifest.yaml`, hex-encoded lowercase.
Signature format: Vault Transit signature (`vault:v*:<base64>`), stored in YAML `.sig` files.

Signer files:

- Federal packs: `federal-specialist.sig`, `tax-director.sig`
- California packs: `california-specialist.sig`, `federal-specialist.sig`, `tax-director.sig`

Public keys:

- `jurisdictions/us-federal/signatures/federal-specialist.pub`
- `jurisdictions/us-federal/signatures/tax-director.pub`
- `jurisdictions/california/signatures/ca-specialist.pub`
- `jurisdictions/california/signatures/tax-director.pub`

## Remaining Operational Notes

The GitHub `sign-gate` workflow can now validate signatures offline through `rule-pack-validate`; it no longer depends on CI reaching the WSL Vault. The local Vault used for signing is still an operational secret system and must be handled under PE/CISO controls before any immutable production tag.

Commercial differential scenario metadata remains pending in 18 scenarios, even though the runner result is pass. Those scenarios are present and counted; product-side commercial verification is tracked separately from the smoke runner pass/fail gate.

## Hand-Off

Phase 2 receives the citation registry, schemas, loader interface, and audit-log schema.
Phase 3 receives eight signed packs, `schemas/node-ids.yaml`, and the TRO schema.
Phase 4 receives `tipped-wages.yaml` for all eight packs, Section 224 parameters, TTOC metadata, and California addback parameters.
Phase 5 receives `forms.yaml`, `mailing-addresses.yaml`, and the TTR bundle schema.
