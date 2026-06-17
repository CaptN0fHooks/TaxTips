# PRE-REG-003 — HSM Signing Algorithm: Ed25519

| | |
|---|---|
| **Amendment ID** | PRE-REG-003 |
| **Filed By** | Principal Engineer |
| **Filed Date** | 2026-05-03 |
| **Status** | IMPLEMENTED BY PHASE 1 SCENARIO B; CISO PRODUCTION-HSM REVIEW TRACKED TO PHASE 2 |
| **SPEC.md Sections Affected** | §20.2 (Signed Manifests) |

## Gap Description

SPEC.md §20.2 references signing manifests but does not specify the cryptographic algorithm. The original Phase 1 design draft referenced RSA-PSS/SHA-256. The CISO previously aligned to Ed25519 for platform signing infrastructure.

## Algorithm Specification

- **Algorithm:** Ed25519 (RFC 8032)
- **Key Specification:** 32-byte private key / 32-byte public key (Ed25519 standard)
- **Signature Size:** 64 bytes; `.sig` files base64-encoded (88 characters with padding)
- **Public Key Format:** `.pub` files base64-encoded (44 characters)
- **Message Signed:** SHA-256 hash (hex-encoded, lowercase) of the canonicalized `manifest.yaml`
  - Keys sorted lexicographically (depth-first)
  - No trailing whitespace on any line
  - CRLF normalized to LF
  - No BOM
  - Final newline present
- **Verification Library:** Node.js `crypto` Ed25519 verifier in `tools/rule-pack-validate/src/cli.js`
- **Signing Backend:** HashiCorp Vault Transit Ed25519 keys for Phase 1 Scenario B signing ceremony

## Rationale for Ed25519 over RSA-PSS/SHA-256

1. Ed25519 is faster to sign and verify (important for CI throughput across 8 packs)
2. Shorter key and signature material (simpler `.pub`/`.sig` file management)
3. No parameter choices (RSA requires key size, padding mode, hash choice selection; Ed25519 has none; eliminates implementation error surface)
4. CISO previously aligned to Ed25519 for platform signing infrastructure

## Phase 1 Implementation Disposition

Phase 1 implemented Ed25519 signing through HashiCorp Vault Transit, not a physical HSM. This is a deliberate Scenario B decision: the prior in-memory Vault could not provide durable signing keys, so Phase 1 used an isolated loopback-only Vault Raft instance with non-exportable Transit Ed25519 keys, committed public keys, offline signature verification, and CI `sign-gate` enforcement.

This satisfies the Phase 1 signed-manifest gate. Production HSM/KMS backing remains a Phase 2 CISO infrastructure decision before immutable production tagging.

## Amendment Requested

Add explicit algorithm specification (Ed25519) to SPEC.md §20.2 with the canonicalization rules documented above.

## Disposition

| Role | Decision | Date | Notes |
|------|----------|------|-------|
| CISO | PHASE 1 ACCEPTED; PHASE 2 HSM/KMS REVIEW REQUIRED | 2026-06-17 | Vault Transit accepted for Phase 1 Scenario B; production custody remains Phase 2. |
| CTO | ACCEPTED FOR PHASE 1 | 2026-06-17 | CI sign-gate verifies committed signatures offline. |
| Tax Director | ACCEPTED FOR PHASE 1 | 2026-06-17 | Signed manifests are sufficient for Phase 1 tax-content foundation closure. |
