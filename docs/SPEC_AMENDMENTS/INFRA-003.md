# SPEC.md Amendment INFRA-003
**Status:** Pending ratification
**Filed:** 2026-06-15
**Filed by:** CISO + Data/Infrastructure Lead
**Reviewers:** CISO + CTO + Tax Director

## Summary
Single Supabase project for both application DB and audit log,
replacing the two-project isolation model in SPEC.md §15.3.

## Reason
Supabase free tier limits 2 active projects per user across all orgs.
taxtips-app (flnavrxbxawctnucxusk) is the single project.

## Compensating Controls
- Audit log lives in dedicated schema: audit
- Separate Postgres role: audit_appender (append-only, no UPDATE/DELETE)
- Application services have zero access to audit schema
- Cloudflare R2 Object Lock (2555 days) provides immutable off-store snapshots
- Hash-chaining per SPEC.md §15.2 enforced in application layer

## Most-Defensible Interpretation While Pending
Single project with schema-level isolation and R2 Object Lock backup.
