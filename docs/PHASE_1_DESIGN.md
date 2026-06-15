# PHASE_1_DESIGN.md — TaxTips Platform Phase 1: Tax Content Foundation

| | |
|---|---|
| **Document** | PHASE_1_DESIGN.md |
| **Version** | 1.0.1 |
| **Status** | 🟢 GREEN LIGHT — APPROVED FOR EXECUTION |
| **Issued** | May 3, 2026 |
| **Supersedes** | v1.0.0 (pre-review draft) |
| **Authority** | Senior Lead Development Suite + Executive Team |
| **Governing Docs** | SPEC.md v1.0.0 (GOD FILE) \| CTR May 2, 2026 \| Build Plan v2.0 |
| **Phase Duration** | 6 Weeks (Weeks 1–6 of 36-week build) |
| **Owner** | Tax Director + Tax Engineering Lead |
| **Classification** | Internal — Confidential |

## CHANGELOG — v1.0.0 → v1.0.1

- **[C-1]** §11.2 / §16.1 / §22 Pre-Reg 3: Signing algorithm clarified. RSA-PSS/SHA-256 replaced with Ed25519 (CISO-aligned per prior panel acceptance). All references updated. Pre-Registration 3 revised to match.
- **[C-2]** §8 (all packs) / §16.3 / §17 sign-off table: Year-prefixed pack version convention replaced with pure SemVer ("1.0.0", "1.1.0", "2.0.0") scoped within each pack_id. pack_id encodes the year; version tracks changes within that year's pack. Git tags revised accordingly.
- **[C-3]** §12.2 / §12.3: Stub evaluator Group 6 reclassified. The CA §224 addback is not a computation — it is two parameter assertions. Group 6 removed from computation groups and added as mandatory scenario category within §14 (parameter-assertion type). Stub evaluator now has 6 computation groups.
- **[RENAME]** Global: "TipsTax" / "TIPSTAX" / "tipstax" replaced with "TaxTips" / "TAXTIPS" / "taxtips" throughout.

## Approval Block

| Role | Name | Date | Status |
|------|------|------|--------|
| Tax Director | [Tax Director] | 2026-05-03 | ✅ SIGNED |
| Engineering Lead | [Engineering Lead] | 2026-05-03 | ✅ SIGNED |
| Principal Engineer | [Principal Engineer] | 2026-05-03 | ✅ SIGNED |
| VP Engineering | [VP Engineering] | 2026-05-03 | ✅ SIGNED |

---

This document is the binding execution contract for Phase 1 of the TaxTips Platform build. It supersedes all prior drafts. See the full implementation plan for detailed sections §1–§22 per the approved design document transmitted to the engineering team on May 3, 2026.
