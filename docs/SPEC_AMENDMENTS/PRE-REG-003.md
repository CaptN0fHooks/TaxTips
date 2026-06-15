# PRE-REG-003 — HSM Signing Algorithm: Ed25519

| | |
|---|---|
| **Amendment ID** | PRE-REG-003 |
| **Filed By** | Principal Engineer |
| **Filed Date** | 2026-05-03 |
| **Status** | PENDING CISO WRITTEN SIGN-OFF |
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
- **Library:** `@noble/ed25519` (implementation in `validator/src/validators/signature-verifier.ts`)

## Rationale for Ed25519 over RSA-PSS/SHA-256

1. Ed25519 is faster to sign and verify (important for CI throughput across 8 packs)
2. Shorter key and signature material (simpler `.pub`/`.sig` file management)
3. No parameter choices (RSA requires key size, padding mode, hash choice selection; Ed25519 has none; eliminates implementation error surface)
4. CISO previously aligned to Ed25519 for platform signing infrastructure

## CISO Written Sign-Off

> [ CISO to insert written sign-off here — REQUIRED before Day 1 of Week 1 signing ceremonies ]
>
> CISO Name: _______________
> Date: _______________
> Signature: _______________

## Amendment Requested

Add explicit algorithm specification (Ed25519) to SPEC.md §20.2 with the canonicalization rules documented above.

## Disposition

| Role | Decision | Date | Notes |
|------|----------|------|-------|
| CISO | PENDING | — | Must confirm before HSM provisioning |
| CTO | PENDING | — | — |
| Tax Director | PENDING | — | — |
