# SPEC.md Amendment INFRA-002
**Status:** Pending ratification
**Filed:** 2026-06-15
**Filed by:** Principal Engineer + CISO
**Reviewers:** CISO + CTO + Tax Director

## Summary
Resolve three SPEC.md gaps via HashiCorp Vault (Docker) + Cloudflare R2 Object Lock.

## Gaps Closed
- GAP 1: Envelope encryption with per-tenant CMKs (Principle 7) -> Vault Transit
- GAP 2: Ed25519 rule-pack signing keys in HSM (SS20.2) -> Vault Transit Ed25519
- GAP 3: Isolated audit-log trust boundary (Principle 8) -> Cloudflare R2 Object Lock

## Implementation
- Vault runs in Docker dev mode; upgrade to persistent mode pre-launch
- Three Ed25519 keys created: taxtips-federal-specialist, taxtips-ca-specialist,
  taxtips-tax-director — all non-exportable
- Public keys committed to repo per SS20.2
- R2 bucket taxtips-audit-snapshots locked at 2555 days

## Most-Defensible Interpretation While Pending
Proceed with Vault Transit + R2 Object Lock as specified above.
