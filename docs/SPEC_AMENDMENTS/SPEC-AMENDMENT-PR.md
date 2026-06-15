# SPEC AMENDMENT: INFRA-001 + INFRA-002 + INFRA-003 + ZERO-COST

PR Type: SPEC.md Amendment per Section 22
SPEC.md version bump: 1.0.0 to 1.1.0
Filed: 2026-06-15
Author: Engineering Lead + CISO + Data/Infrastructure Lead
Required reviewers: CTO + Tax Director

## Motivation

Infrastructure setup session (2026-06-15) provisioned the full TaxTips stack
under a zero-cost operational constraint. Three gaps between the original
SPEC.md AWS-native architecture and the approved stack require formal amendment:

1. AWS KMS replaced by HashiCorp Vault Transit (INFRA-002)
2. Two isolated Supabase projects replaced by single project with audit schema isolation (INFRA-003)
3. Zero-cost operational constraint not yet codified as a binding principle (new)

## Affected Sections

- Section 2 Architectural Principles: Add Principle 11 (zero-cost); update Principle 8 (audit isolation)
- Section 14.2 KMS Key Hierarchy: Replace AWS KMS with Vault Transit
- Section 15.3 Integrity Protection: Replace isolated AWS account with schema isolation plus R2 Object Lock

## Section 2 Principle 8 UPDATED

OLD: The audit log is append-only, hash-chained, and written to an isolated
AWS account with a different IAM trust boundary. No application service has
delete permission. Tamper detection runs as a scheduled job and pages on detection.

NEW: The audit log is append-only, hash-chained, and written to an isolated
schema (audit) within the application database, governed by a dedicated
append-only Postgres role (audit_appender) with no UPDATE or DELETE permission.
No application service outside the audit writer holds credentials to this schema.
A weekly job snapshots the chain head hash to Cloudflare R2 Object Lock
(2555-day Compliance retention) as the immutable off-store backup.
Tamper detection runs as a scheduled job and pages on any chain break.
See Section 15.3 for full integrity specification.

## Section 2 Principle 11 NEW

Principle 11 - Zero-cost infrastructure. The platform operates at zero
infrastructure cost during build and pre-launch phases. No paid cloud
service may be introduced without explicit executive approval recorded
as a SPEC.md amendment. Free-tier limits are a binding constraint on
architectural decisions. Where a free-tier service cannot satisfy a
SPEC.md requirement, the team files an amendment with a compensating
control analysis before proceeding. This principle applies to all
phases and all team members.

## Section 14.2 KMS Key Hierarchy UPDATED

OLD:
- One AWS-managed root CMK per AWS account.
- One platform-controlled CMK per logical environment (dev, staging, prod),
  key-rotation-enabled with annual rotation minimum.
- Per-tenant data keys derived from the platform CMK using KMS GenerateDataKey
  with tenant-bound encryption context. Cached in memory per request, never persisted.
- Signing keys for rule packs live in a separate HSM, never accessible to runtime services.

NEW:
- One HashiCorp Vault Transit engine per logical environment (dev, staging, prod),
  operated as the platform KMS.
- Per-tenant data keys derived from Vault Transit using tenant-bound encryption context.
  Cached in memory per request, never persisted.
- Signing keys live in Vault Transit as non-exportable Ed25519 keys:
  taxtips-federal-specialist, taxtips-ca-specialist, taxtips-tax-director.
  Private keys never leave Vault. Public keys committed to repo at
  jurisdictions/*/signatures/*.pub.
- Vault runs in Docker dev mode during build and pre-launch phases.
  Migration to persistent storage required before production user data is processed.
  Migration requires SPEC.md amendment INFRA-004 and CISO sign-off.
- Cross-tenant decryption impossibility (Section 14.6) preserved via
  tenant-bound encryption contexts at the Vault Transit API layer.

## Section 15.3 Integrity Protection UPDATED

OLD:
- Audit log writes go to an isolated AWS account with its own IAM trust boundary.
- Application services hold append-only credentials. No service has UPDATE or DELETE permission.
- A scheduled tamper-detection job runs hourly.
- A weekly external job snapshots the chain head hash to S3 Object Lock.

NEW:
- Audit log writes go to a dedicated audit schema within the application Supabase
  project (ref: flnavrxbxawctnucxusk). Postgres role audit_appender holds
  append-only credentials. No application service outside the audit writer
  holds credentials to the audit schema.
- Row-level security on all audit tables enforces append-only access at the
  database layer, independent of application credentials.
- A scheduled tamper-detection job runs hourly: walks the chain, recomputes
  hashes, pages on any break detected.
- A weekly job snapshots the chain head hash to Cloudflare R2 bucket
  taxtips-audit-snapshots, configured with 2555-day Compliance-mode Object Lock
  rule (audit-immutability). Immutable for the full lock duration.
- Amendment reference: INFRA-003 (filed 2026-06-15, pending ratification).

## Downstream Impact

- Phase 1: None. Public keys in repo at same path. Validator unchanged.
- Phase 2: Audit service targets audit schema and audit_appender role.
  Vault Transit replaces AWS KMS for field-level encryption.
- Phase 3 through 5: None.
- Phase 6: Vault must migrate to persistent storage before launch. INFRA-004 required.

## Approval Block

| Role | Approval | Date |
|------|----------|------|
| CTO | Pending | |
| Tax Director | Pending | |
