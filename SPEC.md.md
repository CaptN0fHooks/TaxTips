# SPEC.md — TipsTax Platform

**The God File. The Source of Truth. The Contract Every Phase Builds Against.**

---

| | |
|---|---|
| **Document** | SPEC.md |
| **Version** | 1.0.0 |
| **Status** | RATIFIED |
| **Issued** | May 2, 2026 |
| **Authority** | Senior Executive Team, TipsTax |
| **Supersedes** | None (initial issue) |
| **Controlling Documents Above This One** | None. SPEC.md is the highest authority for build-phase work. |
| **Documents Subordinate to This One** | All phase design docs, all implementation reports, all code, all rule packs, all infrastructure-as-code, all UI/UX artifacts. |
| **Amendment Authority** | CTO + Tax Director jointly; CEO sign-off for material changes (per §22). |

---

## How to Read This Document

If you are an engineer, tax content author, security reviewer, designer, or auditor on the TipsTax build, this document is your contract. Every section that applies to your phase is binding. Sections that do not apply to your phase still inform the contracts you produce for downstream phases.

If you find a conflict between SPEC.md and any other document — the Build Plan, the Controlling Tax Research Report, a phase prompt, a design doc, an architecture diagram, or a Slack message — **SPEC.md wins**. The single exception: the Controlling Tax Research Report is the higher authority on the substance of tax law itself (what the law says, what the citations are, what the parameters are). SPEC.md is the higher authority on how the platform represents and operates on tax law.

If you find a gap in SPEC.md that blocks your work, you do not work around it. You file a SPEC.md amendment request per §22. While the amendment is pending, you implement the most-defensible interpretation and document it.

If you are reading this in a phase prompt, do not also re-read the Build Plan or the Controlling Report unless SPEC.md explicitly directs you to. SPEC.md is intended to be self-sufficient for build-phase execution.

---

## Table of Contents

1. Product Definition
2. Architectural Principles
3. The Six Phases — Boundaries and Hand-Off Points
4. Repository Layout
5. The Canonical Tax Return Object (TRO)
6. Rule Pack Schema
7. Citation Format and Registry
8. Computation Graph Node ID Convention
9. Tipped-Wage Module Data Contract
10. Forms Inventory and Mailing Address Registry
11. Ambiguity Record Schema
12. Tax Year Loader Interface
13. Internal API Conventions
14. Data Classification and Encryption Scheme
15. Audit Log Schema and Integrity
16. Security Release Gates
17. UI/UX Binding Standards
18. Export Bundle Schema (.ttr.json)
19. Test Contracts and Coverage Floors
20. Versioning, Signing, and Reproducibility
21. Change Control Protocol
22. SPEC.md Amendment Protocol
23. Glossary
24. Appendix A — Hand-Off Contracts (Phase by Phase)
25. Appendix B — Approval Block

---

## 1. Product Definition

TipsTax is an enterprise-grade **tax preparation** platform for W-2 tipped-wage workers (servers, bartenders, and other occupations on the Treasury Tipped Occupation Code list) with deep specialization in federal Form 1040 and California Form 540.

The platform is a tax preparation product, not a tax filing product. The platform never transmits returns to the IRS or California Franchise Tax Board on the user's behalf. The platform produces two interchangeable export formats for every prepared return: a mail-in package and a Portable Export Bundle that uploads cleanly into third-party e-file pathways.

The platform supports four tax years simultaneously: the current tax year and three prior years. As of this SPEC.md issue, the supported years are 2023, 2024, 2025, and 2026.

The platform is California-only and W-2-only at launch. Self-employed (Schedule C) returns, multi-state returns, business returns, foreign income, and amended returns are explicitly out of scope.

### 1.1 Non-Goals

- The platform is not an Authorized e-File Provider. No EFIN. No IRS Software Developer ID. No FTB e-file enrollment. No MeF integration.
- The platform is not a tax advisory service. No CPA chat, no human preparer review, no advisory upsell.
- The platform is not a refund-advance lender. No bank products. No refund transfers.
- The platform does not interpret novel tax positions. Every position taken is grounded in the Controlling Tax Research Report and signed by the Tax Director.

### 1.2 Differentiation

The platform's competitive moat is depth on tipped-wage workers in California, specifically four value drivers documented in the Controlling Tax Research Report:

1. The federal qualified-tip deduction under IRC §224 (tax years 2025–2028, $25,000 cap, MAGI phase-out, TTOC eligibility, FICA still applies, MFS barred).
2. California non-conformity to TCJA §67(g), preserving misc itemized deductions (uniforms, non-slip shoes, union dues, required tools, licensing fees, work-related mileage between job sites) on Schedule CA (540) Part II Line 19 subject to a 2% California-AGI floor.
3. California non-conformity to OBBBA following SB 711, requiring a §224 addback on Schedule CA (540) Part I, Section C, Line 24z for tax years 2025 and 2026 — implemented as default-on behavior, not opt-in.
4. Excess Social Security tax recovery on Schedule 3 Line 11 for multi-employer years, high-frequency in the tipped-worker population.

---

## 2. Architectural Principles

These principles are binding. Any design decision that violates a principle requires an explicit SPEC.md amendment before implementation.

**Principle 1 — Tax law is data, not code.** Brackets, thresholds, phase-outs, standard deduction amounts, credit parameters, eligibility rules, and form-line definitions live in versioned, signed YAML rule packs. Application code may load, validate, address, and serve rule pack values. Application code may not contain bracket numbers, threshold amounts, phase-out math, or eligibility logic.

**Principle 2 — Determinism.** The Tax Engine is pure-functional. The same inputs (a TaxpayerYear object plus a rule pack) always produce the same outputs (a Tax Return Object), byte-identical, on any machine, at any time. No timestamps, no random values, no environment variables, no network calls inside computation.

**Principle 3 — Citation completeness.** Every value on every form, every parameter in every rule pack, every line in every worksheet, every default election in the Optimization Engine carries a citation pointing into the Controlling Tax Research Report, which itself cites primary authority. A value without a citation is a build failure.

**Principle 4 — Year-correct law.** Each tax year is a separate immutable rule pack. The 2023 pack uses pre-OBBBA law (TCJA §67(g) suspension, $10,000 SALT cap, no §224, $2,000 CTC). The 2025 pack uses post-OBBBA law (Schedule 1-A, §224 with $25,000 cap, $40,000 SALT cap with phase-down, $2,200 CTC, $6,000 Senior Bonus). Cross-year contamination is a build failure.

**Principle 5 — Defaults follow the Controlling Report.** Where the Controlling Report flags an ambiguity, SPEC.md inherits the Controlling Report's recommended-default disposition. The platform never silently defaults to an aggressive position. The California §224 addback for 2025 and 2026 returns is default-on; the SSTB transition rule defaults to allow under Notice 2025-69; the CA UEBE flow runs whenever the tipped toggle is set and the user has plausible expenses.

**Principle 6 — No silent OCR.** Any value extracted from a document by optical character recognition is presented to the user for confirmation before any downstream service may consume it. The internal API exposing OCR data must refuse to return any field whose user_confirmed flag is false.

**Principle 7 — Defense in depth on PII.** Tier 1 data (SSN, ITIN, EIN, bank accounts, scanned IDs) is field-level encrypted with envelope KMS using per-tenant Customer Master Keys. Tier 2 data (W-2 amounts, dependents, addresses) is database-at-rest encrypted with row-level tenant isolation. Logs are PII-stripped at the logger layer. No Tier 1 data is ever sent to a third-party APM or analytics provider.

**Principle 8 — Append-only audit.** The audit log is append-only, hash-chained, and written to an isolated AWS account with a different IAM trust boundary. No application service has delete permission. Tamper detection runs as a scheduled job and pages on detection.

**Principle 9 — Honest export, not silent transmission.** The platform produces a Mail-In Package and a Portable Export Bundle (`.ttr.json` plus form-fillable PDFs plus destination guides). The platform never transmits to the IRS or FTB. Marketing language must align: "Prepare here, file anywhere."

**Principle 10 — UI clarity is a non-functional requirement, not a polish item.** Every screen renders at sixth-grade reading level by default; technical terminology is one tap deep. Money figures are large and unambiguous. Every dollar on the final return is tappable to its source. Sixth-grade reading level is verified at build time per §17.

---

## 3. The Six Phases — Boundaries and Hand-Off Points

The build is six phases per Build Plan v2.0. Phases overlap calendrically per the Build Plan's Gantt; SPEC.md governs the contracts between them, not the calendar.

| Phase | Owner | Produces | Consumes |
|-------|-------|----------|----------|
| 1. Tax Content Foundation | Tax Director + Tax Engineering | Eight signed rule packs (us-fed × 4 years, ca-540 × 4 years), validator CLI, smoke test scenarios | Controlling Tax Research Report; SPEC.md |
| 2. Core Platform | VP Engineering | Identity, Document Service, OCR Service, Audit Log, Interview Orchestrator, TaxYearLoader, security baseline | SPEC.md; Phase 1 rule packs |
| 3. Tax Engine & Optimization | Principal Engineer, Tax Engine | Pure-functional Tax Engine, Computation Graph, Optimization Engine, Diff Reporter, conformance suite | SPEC.md; Phase 1 rule packs; Phase 2 platform |
| 4. Tipped-Wage Specialization | Tipped Wages Specialist + Engineering Lead | Tipped interview overlay, TTOC picker, §224 module, Form 4137 logic, CA UEBE flow, CA §224 addback engine | SPEC.md; Phase 1 tipped data; Phase 2 interview orchestrator; Phase 3 engine |
| 5. Forms Renderer + Export | Engineering Lead, Forms | Pixel-accurate PDFs, Mail-In Package Builder, Portable Export Bundle Builder, destination guides | SPEC.md; Phase 1 forms inventory; Phase 3 engine output |
| 6. UI/UX, Hardening, Launch | VP Product + CISO + VP Engineering | React Native + React production clients, accessibility audit, EN/ES localization, pen test, SOC 2 Type I, CPA UAT, launch | SPEC.md; everything from Phases 2–5 |

Hand-off contracts for each phase are formalized in §24 (Appendix A).

---

## 4. Repository Layout

The codebase is a monorepo. The top-level directory structure is binding.

```
tipstax/
├── SPEC.md                               # This file. Versioned. Amendment-controlled.
├── CONTROLLING_REPORT.pdf                # The Controlling Tax Research Report (read-only reference)
├── BUILD_PLAN.pdf                        # The Production Build Plan v2.0 (read-only reference)
│
├── jurisdictions/                        # Phase 1 — Rule packs. Tax content. Signed.
│   ├── us-federal/
│   │   ├── 2023/
│   │   │   ├── manifest.yaml
│   │   │   ├── brackets.yaml
│   │   │   ├── standard-deduction.yaml
│   │   │   ├── itemized.yaml
│   │   │   ├── credits/
│   │   │   │   ├── eitc.yaml
│   │   │   │   ├── ctc.yaml
│   │   │   │   ├── aotc.yaml
│   │   │   │   └── ... (one file per credit)
│   │   │   ├── tipped-wages.yaml
│   │   │   ├── forms.yaml
│   │   │   ├── mailing-addresses.yaml
│   │   │   ├── ambiguities.yaml
│   │   │   └── signatures/
│   │   │       ├── federal-specialist.sig
│   │   │       ├── tax-director.sig
│   │   │       └── ... 
│   │   ├── 2024/  (same shape)
│   │   ├── 2025/  (same shape; tipped-wages.yaml includes §224 parameters)
│   │   └── 2026/  (same shape)
│   └── california/
│       ├── 2023/  (same shape, plus ca-§224-addback.yaml stub for forward compat)
│       ├── 2024/
│       ├── 2025/  (ca-§224-addback default-on)
│       └── 2026/  (ca-§224-addback default-on)
│
├── schemas/                              # JSON Schema (draft 2020-12) for every rule pack file type.
│   ├── manifest.schema.json
│   ├── brackets.schema.json
│   ├── standard-deduction.schema.json
│   ├── itemized.schema.json
│   ├── credit.schema.json
│   ├── tipped-wages.schema.json
│   ├── forms.schema.json
│   ├── mailing-addresses.schema.json
│   ├── ambiguities.schema.json
│   ├── tax-return-object.schema.json    # The TRO contract (§5)
│   ├── ttr-bundle.schema.json           # The .ttr.json export contract (§18)
│   ├── audit-log-record.schema.json     # The audit log contract (§15)
│   └── api/                              # OpenAPI specs for internal APIs (§13)
│       ├── identity.openapi.yaml
│       ├── document.openapi.yaml
│       ├── ocr.openapi.yaml
│       ├── interview.openapi.yaml
│       ├── tax-engine.openapi.yaml
│       └── forms-renderer.openapi.yaml
│
├── services/                             # Phase 2 — Core Platform services.
│   ├── identity/
│   ├── document/
│   ├── ocr/
│   ├── interview-orchestrator/
│   ├── audit-log/
│   ├── notification/
│   ├── support-backoffice/
│   └── tax-year-loader/                 # The SPEC.md-defined loader interface
│
├── tax-engine/                           # Phase 3 — Pure-functional Tax Engine.
│   ├── computation-graph/
│   ├── optimization-engine/
│   ├── diff-reporter/
│   └── tests/
│       ├── conformance/                 # 1,500+ scenarios per year per pack
│       ├── property/
│       ├── differential/
│       └── mutation/
│
├── tipped-wage-module/                   # Phase 4 — Tipped-Wage layer on Tax Engine.
│   ├── interview-overlay/
│   ├── ttoc-picker/
│   ├── form-4137/
│   ├── section-224/
│   ├── ca-uebe/
│   ├── ca-section-224-addback/
│   └── tests/
│
├── forms-renderer/                       # Phase 5 — PDF + Export.
│   ├── pdf-renderer/
│   ├── form-templates/                  # IRS/FTB form templates
│   ├── mail-in-builder/
│   ├── portable-export-builder/
│   ├── destination-guides/
│   └── tests/
│
├── clients/                              # Phase 6 — Production UX.
│   ├── web/                             # React + TypeScript SPA
│   ├── mobile/                          # React Native (iOS + Android)
│   └── shared/                          # Component library
│
├── infrastructure/                       # Terraform; nothing manual.
│   ├── accounts/
│   ├── modules/
│   └── envs/
│
├── tools/                                # CLIs and developer tools.
│   ├── rule-pack-validate/              # Phase 1 validator
│   ├── rule-pack-test/                  # Phase 1 smoke runner
│   ├── conformance-runner/              # Phase 3 conformance harness
│   ├── pdf-conformance/                 # Phase 5 PDF visual conformance
│   └── audit-log-tamper-check/          # Phase 2 scheduled job
│
├── docs/                                 # Phase reports + design docs.
│   ├── PHASE_1_DESIGN.md
│   ├── PHASE_1_REPORT.md
│   ├── PHASE_2_DESIGN.md
│   ├── PHASE_2_REPORT.md
│   ├── ... (etc per phase)
│   ├── WISP.md
│   ├── FTC_SAFEGUARDS_MAPPING.md
│   ├── SOC2_CONTROL_MATRIX.md
│   ├── THREAT_MODEL.md
│   ├── ACCESSIBILITY_AUDIT.md
│   └── SPEC_AMENDMENTS/                 # Every accepted amendment, with diff and sign-off
│
└── .github/                              # CI/CD definitions.
    └── workflows/
```

Any deviation from this layout requires a SPEC.md amendment.

---

## 5. The Canonical Tax Return Object (TRO)

The Tax Return Object is the single immutable JSON document produced by the Tax Engine after computation completes. It is the source for all rendered artifacts (mail-in PDFs, Portable Export Bundle, audit records). It is the unit of accountability — any reported discrepancy is debugged by reproducing the TRO from inputs and engine version.

### 5.1 TRO Top-Level Shape

```json
{
  "$schema": "https://tipstax.local/schemas/tax-return-object.schema.json",
  "tro_id": "tro_01J5ZK...",
  "tro_version": "1.0.0",
  "created_at": "<ISO-8601 UTC>",
  "tax_year": 2025,
  "jurisdictions": ["us-federal", "california"],

  "engine": {
    "tax_engine_version": "3.4.1",
    "rule_pack_versions": {
      "us-federal/2025": "2025.1.4",
      "california/2025": "2025.1.2"
    },
    "spec_version": "1.0.0"
  },

  "taxpayer": {
    "filer_id": "<opaque tenant-scoped ID, never PII>",
    "filing_status": "single | mfj | mfs | hoh | qss",
    "spouse_filer_id": "<opaque or null>",
    "dependents": [ ... ],
    "residency": { "state": "CA", "rdp_status": false }
  },

  "inputs": {
    "w2s": [ <W2Input>, ... ],
    "1099s": [ ... ],
    "interview": { ... },
    "tipped_overlay": { "<w2_id>": <TippedOverlayInput>, ... }
  },

  "optimization_decision": {
    "scenarios_evaluated": <integer>,
    "chosen_scenario_id": "<scenario id>",
    "diff_report_id": "<diff report id>"
  },

  "forms": {
    "us-federal": {
      "1040":   { "lines": [ <Line>, ... ] },
      "1040-schedule-1":   { "lines": [ ... ] },
      "1040-schedule-1a":  { "lines": [ ... ] },        // 2025+ only
      "1040-schedule-2":   { ... },
      "1040-schedule-3":   { ... },
      "1040-schedule-a":   { ... },                     // if itemizing
      "1040-schedule-8812": { ... },                    // if dependents
      "form-4137":         { ... },                     // if tipped + unreported/disputed
      "form-8863":         { ... },                     // if education
      "form-8880":         { ... },                     // if Saver's Credit
      "form-8959":         { ... },                     // if Additional Medicare
      "form-8962":         { ... },                     // if marketplace
      "form-2441":         { ... }                      // if dependent care
    },
    "california": {
      "form-540":          { "lines": [ ... ] },
      "schedule-ca-540":   { "lines": [ ... ] },
      "schedule-d-540":    { ... },                     // if cap gains
      "schedule-p-540":    { ... },                     // if AMT
      "ftb-3514":          { ... },                     // if CalEITC/YCTC/FYTC
      "ftb-3506":          { ... },                     // if CA C&DC
      "ftb-3853":          { ... }                      // if applicable
    }
  },

  "summary": {
    "federal_total_tax": <decimal>,
    "federal_refund_or_owe": <decimal>,            // negative = owe, positive = refund
    "california_total_tax": <decimal>,
    "california_refund_or_owe": <decimal>,
    "combined_outcome": <decimal>
  },

  "audit_trail": {
    "input_hash": "<SHA-256 of canonicalized inputs>",
    "output_hash": "<SHA-256 of canonicalized forms+summary>",
    "computation_started_at": "<ISO-8601>",
    "computation_completed_at": "<ISO-8601>",
    "audit_log_record_ids": ["...", "..."]
  }
}
```

### 5.2 Line Object

Every form line in the TRO is a `Line` with the following shape:

```json
{
  "line_id": "us-1040/2025/line-11",
  "label": "Adjusted gross income",
  "value": 47384.00,
  "data_type": "currency_usd | integer | boolean | enum | text",
  "computation": {
    "node_id": "us-1040-2025/line-11",
    "inputs": ["us-1040-2025/line-9", "us-1040-2025/line-10"],
    "expression_summary": "line-9 minus line-10"
  },
  "citation": "CTR/A.1/2025|CTR/A.2/2025",
  "provenance": "computed | from_input | from_worksheet | from_optimization",
  "user_input_origin": null | "<input_field_id>",
  "ambiguity_record_id": null | "<ambiguity_id>"
}
```

Every Line MUST have a citation. The Forms Renderer is allowed to ignore the citation when producing the printed PDF (citations are for audit and "Why this number?" in-app explanations) but the citation must be present in the JSON.

### 5.3 TRO Immutability and Reproducibility

A TRO is content-addressable by its output_hash. Re-running the Tax Engine with the same inputs and the same engine + rule pack versions must produce a TRO whose forms and summary serialize to byte-identical JSON. This is a CI-tested invariant per §19.

---

## 6. Rule Pack Schema

This section defines the binding schemas for every YAML file type that appears in a rule pack. The full JSON Schema files live in `/schemas/*.schema.json`; this section defines the shape and the binding semantics.

### 6.1 manifest.yaml

```yaml
pack_id: us-federal/2025
version: 2025.1.4                          # semver; immutable once tagged
spec_version: 1.0.0                        # SPEC.md version this pack conforms to
tax_year: 2025
jurisdiction: us-federal
effective_date: 2025-01-01
controlling_report_version: 2026-05-02     # date stamp of the Controlling Report
files:
  - path: brackets.yaml
    sha256: "ab12..."
  - path: standard-deduction.yaml
    sha256: "cd34..."
  - path: itemized.yaml
    sha256: "ef56..."
  - path: credits/eitc.yaml
    sha256: "..."
  # ... every file in the pack listed
sign_off_log:
  - role: federal_specialist
    name: "<name>"
    date: 2026-06-15
    signature_file: signatures/federal-specialist.sig
  - role: tax_director
    name: "<name>"
    date: 2026-06-16
    signature_file: signatures/tax-director.sig
  # CA packs additionally require california_specialist signature
ambiguity_count: 7
citation_count: 412
```

A pack with a missing or invalid signature CANNOT be loaded by the TaxYearLoader. This is enforced at load time, not just at build time.

### 6.2 brackets.yaml

```yaml
pack: us-federal/2025
ordinary_income:
  single:
    - { up_to: 11925, rate: 0.10, citation: "CTR/A.4/2025/single-bracket-1" }
    - { up_to: 48475, rate: 0.12, citation: "CTR/A.4/2025/single-bracket-2" }
    - { up_to: 103350, rate: 0.22, citation: "CTR/A.4/2025/single-bracket-3" }
    - { up_to: 197300, rate: 0.24, citation: "CTR/A.4/2025/single-bracket-4" }
    - { up_to: 250525, rate: 0.32, citation: "CTR/A.4/2025/single-bracket-5" }
    - { up_to: 626350, rate: 0.35, citation: "CTR/A.4/2025/single-bracket-6" }
    - { up_to: null,   rate: 0.37, citation: "CTR/A.4/2025/single-bracket-7" }
  mfj:
    - { up_to: 23850, rate: 0.10, citation: "CTR/A.4/2025/mfj-bracket-1" }
    # ...
  hoh:
    # ...
  mfs:
    # ...
  qss:
    # ...
capital_gains:
  single:
    - { up_to: 48350,  rate: 0.00, citation: "CTR/A.5/2025/single-0pct" }
    - { up_to: 533400, rate: 0.15, citation: "CTR/A.5/2025/single-15pct" }
    - { up_to: null,   rate: 0.20, citation: "CTR/A.5/2025/single-20pct" }
  # ...
amt:
  exemption:
    single: { amount: 88100, citation: "CTR/A.8/2025/exemption-single" }
    mfj:    { amount: 137000, citation: "CTR/A.8/2025/exemption-mfj" }
    # ...
  phase_out:
    single: { start: 626350, citation: "CTR/A.8/2025/phaseout-single" }
    mfj:    { start: 1252700, citation: "CTR/A.8/2025/phaseout-mfj" }
    rate: 0.25
```

`up_to: null` means no upper bound (the top bracket). All currency values are decimal USD with explicit cents granularity. Rates are decimal fractions, not percentages (0.22 means 22%).

### 6.3 standard-deduction.yaml

```yaml
pack: us-federal/2025
base:
  single: { amount: 15750, citation: "CTR/A.2/2025/single" }
  mfs:    { amount: 15750, citation: "CTR/A.2/2025/mfs" }
  hoh:    { amount: 23625, citation: "CTR/A.2/2025/hoh" }
  mfj:    { amount: 31500, citation: "CTR/A.2/2025/mfj" }
  qss:    { amount: 31500, citation: "CTR/A.2/2025/qss" }
additional:
  age_65_plus:
    single_or_hoh: { amount: 2000, citation: "CTR/A.2/2025/add-65-single" }
    mfj_mfs_qss:   { amount: 1600, citation: "CTR/A.2/2025/add-65-mfj" }
  blind:
    single_or_hoh: { amount: 2000, citation: "CTR/A.2/2025/add-blind-single" }
    mfj_mfs_qss:   { amount: 1600, citation: "CTR/A.2/2025/add-blind-mfj" }
dependent_floor:
  amount: 1300
  earned_income_plus: 450
  capped_at: "regular_standard_deduction"
  citation: "CTR/A.2/2025/dependent"
senior_bonus_obbba:               # NEW for 2025–2028
  base: { amount: 6000, citation: "CTR/A.2/2025/senior-bonus" }
  mfj_both_65_plus: { amount: 12000, citation: "CTR/A.2/2025/senior-bonus-mfj" }
  phase_out:
    single: { start: 75000, full: 175000, rate: 0.06, citation: "CTR/A.2/2025/senior-bonus-phaseout-single" }
    mfj:    { start: 150000, full: 250000, rate: 0.06, citation: "CTR/A.2/2025/senior-bonus-phaseout-mfj" }
  mfs_eligible: false
  ssn_required: true
  indexed: false
  available_years: [2025, 2026, 2027, 2028]
```

For the 2023 and 2024 packs, `senior_bonus_obbba` is omitted entirely (it does not exist pre-OBBBA). The validator (§20.4) verifies that pre-2025 packs do not contain post-OBBBA fields and that 2025+ packs do.

### 6.4 itemized.yaml

```yaml
pack: us-federal/2025
medical:
  agi_floor: 0.075
  citation: "CTR/A.3/2025/medical"
salt:
  cap: 40000
  cap_mfs: 20000
  phase_down:
    threshold_magi: 500000
    threshold_magi_mfs: 250000
    rate: 0.30
    floor: 10000
  citation: "CTR/A.3/2025/salt-obbba"
  available_years: [2025, 2026, 2027, 2028, 2029]
mortgage_interest:
  acquisition_cap_post_dec_2017: 750000
  acquisition_cap_pre_dec_2017: 1000000
  helo_acquisition_only: true
  citation: "CTR/A.3/2025/mortgage"
charitable_cash_public_charity_agi_pct: 0.60
charitable_floor_2026_plus:           # OBBBA §70106
  agi_floor: 0.005
  effective_year: 2026
  citation: "CTR/A.3/2025/charitable-floor"
casualty:
  federal_disaster_required_through: 2025
  qualified_state_disaster_added: 2026
  citation: "CTR/A.3/2025/casualty"
misc_2pct_suspended: true
misc_2pct_suspension_citation: "CTR/A.3/2025/misc-2pct-suspended"
pease_repealed: true
pease_repeal_citation: "CTR/A.3/2025/pease"
top_bracket_benefit_cap:              # OBBBA §68 cap on 37% bracket itemized benefit
  applicable: true
  effective_value_per_dollar: 0.35
  citation: "CTR/A.3/2025/top-bracket-cap"
```

For California packs (`/california/<year>/itemized.yaml`), the schema is similar but reflects R&TC §17072 conformity to pre-TCJA federal rules. Critically:

```yaml
pack: california/2025
misc_2pct_suspended: false                                  # CA does NOT conform to TCJA suspension
misc_2pct_floor: 0.02
misc_2pct_citation: "CTR/D.1/2025/ca-misc-2pct-allowed"
salt_cap: null                                              # CA does NOT impose the federal SALT cap
salt_addback_state_income_tax: true                         # but state income tax not deductible at CA level
salt_addback_citation: "CTR/C.3/2025/ca-salt"
mortgage_interest_acquisition_cap: 1000000                  # CA pre-TCJA $1M cap retained
home_equity_cap: 100000                                     # any purpose, up to $100K
mortgage_citation: "CTR/C.3/2025/ca-mortgage"
```

### 6.5 credits/*.yaml

One file per credit. Each file declares the credit's parameters, eligibility predicates, computation expression, and refundability. Example for EITC:

```yaml
pack: us-federal/2025
credit_id: eitc
form: schedule-eic
schedule_3_line: null
form_1040_line: 27
refundable: true
filing_status_eligible: [single, mfj, hoh, qss]              # MFS barred except §32(d)
filing_status_citation: "CTR/A.9/2025/eitc-mfs-bar"
ssn_required: [taxpayer, spouse_if_mfj, qualifying_children]
ssn_citation: "CTR/A.9/2025/eitc-ssn"
investment_income_cap: 11950
investment_income_citation: "CTR/A.9/2025/eitc-investment-cap"
parameters_by_qualifying_children:
  0: { max_credit: 649,  earned_income_amt: 8490,  max_amt: 8490,  phase_out_start_single: 10620, phase_out_start_mfj: 17730, phase_out_complete_single: 19104, phase_out_complete_mfj: 26214 }
  1: { max_credit: 4328, earned_income_amt: 12390, max_amt: 12390, phase_out_start_single: 22720, phase_out_start_mfj: 29830, phase_out_complete_single: 50434, phase_out_complete_mfj: 57544 }
  2: { max_credit: 7152, earned_income_amt: 17400, max_amt: 17400, phase_out_start_single: 22720, phase_out_start_mfj: 29830, phase_out_complete_single: 57310, phase_out_complete_mfj: 64420 }
  3: { max_credit: 8046, earned_income_amt: 17400, max_amt: 17400, phase_out_start_single: 22720, phase_out_start_mfj: 29830, phase_out_complete_single: 61555, phase_out_complete_mfj: 68675 }
parameters_citation: "CTR/A.9/2025/eitc-table"
earned_income_definition:
  includes_qualified_tips_in_full: true                       # §224 deduction does NOT reduce EITC base
  citation: "CTR/A.9/2025/eitc-earned-income"
```

### 6.6 tipped-wages.yaml

This file is the heart of the platform. Its schema is rigid and is detailed in §9.

### 6.7 forms.yaml

Forms inventory is detailed in §10.

### 6.8 mailing-addresses.yaml

Mailing-address registry is detailed in §10.

### 6.9 ambiguities.yaml

Ambiguity records are detailed in §11.

---

## 7. Citation Format and Registry

### 7.1 Citation String Format

All citations from rule packs into the Controlling Tax Research Report use the format:

```
CTR/<part>.<section>/<year>[/<anchor>]
```

Where:

- `CTR` is a fixed prefix meaning Controlling Tax Research Report.
- `<part>` is one of `A` (Federal General), `B` (Federal Tipped-Wage), `C` (California General), `D` (California Tipped-Wage), `E` (Forms Inventory), `F` (Mid-Year Changes Tracker).
- `<section>` is the section number within that part.
- `<year>` is the four-digit tax year (or `all` if year-agnostic).
- `<anchor>` is an optional human-readable anchor identifying the specific paragraph or table cell.

Examples:
- `CTR/A.4/2025/single-bracket-3` — federal 22% single bracket for tax year 2025
- `CTR/B.5/2025/cap` — §224 cap for tax year 2025
- `CTR/D.3/2025/addback-default` — CA §224 addback default behavior for tax year 2025
- `CTR/E/2025/form-4137-url` — official PDF URL for Form 4137 tax year 2025
- `CTR/F/2026/notice-2026-10-mileage` — 2026 mileage rate notice in the Mid-Year Changes Tracker

Multiple citations for a single value are joined with `|`:

```yaml
citation: "CTR/A.2/2025/single|CTR/A.2/2025/obbba-bump"
```

### 7.2 Citation Registry

A file `/schemas/citation-registry.yaml` enumerates every legal citation anchor. The validator (§20.4) refuses to load any rule pack containing a citation not present in the registry. The registry is built once from the Controlling Report by Phase 1 and is amended via SPEC.md amendment for any future Controlling Report revision.

Registry entry shape:

```yaml
- citation: "CTR/A.4/2025/single-bracket-3"
  ctr_part: A
  ctr_section: 4
  ctr_year: 2025
  ctr_anchor: single-bracket-3
  primary_authority: "Rev. Proc. 2024-40, as modified by Rev. Proc. 2025-32"
  description: "2025 single-filer 22% bracket threshold ($103,350)"
```

### 7.3 Citation Drift Detection

When the Controlling Report is revised, the citation registry is regenerated. Any rule pack whose citations resolve to different primary authority than at the time of signing must be re-signed. This is enforced by a CI job that compares pack citations to the current registry and fails on drift.

---

## 8. Computation Graph Node ID Convention

The Computation Graph (Phase 3) is a directed acyclic graph whose nodes represent line-level computations. Phase 1 does not build the graph, but Phase 1 defines the IDs the graph will use.

### 8.1 Node ID Format

```
<jurisdiction>-<form>-<year>/<line-or-worksheet-anchor>
```

Examples:

- `us-1040-2025/line-11` — federal 1040 line 11 (AGI) for tax year 2025
- `us-1040-2025/line-13b` — federal 1040 line 13b (qualified tip deduction inflow) for tax year 2025
- `us-schedule-1a-2025/part-2/line-7` — Schedule 1-A Part II Line 7 (total qualified tips) for 2025
- `us-form-4137-2025/line-13` — Form 4137 Line 13 (SS+Medicare on unreported tips) for 2025
- `ca-540-2025/line-19` — California Form 540 Line 19 (CA AGI) for tax year 2025
- `ca-schedule-ca-540-2025/part-1/section-c/line-24z` — the §224 addback line for CA 2025
- `ca-schedule-ca-540-2025/part-2/line-19` — CA UEBE line for CA 2025
- `worksheet/us-2025/qbi-aggregation` — a worksheet computation
- `optimization/2025/filing-status-decision` — an Optimization Engine decision node

### 8.2 Addressability Guarantee

Every value emitted by the Tax Engine into the TRO MUST be addressable by a Computation Graph node ID. The Forms Renderer (Phase 5) resolves form lines to TRO values via these IDs.

### 8.3 ID Stability

Node IDs are stable across rule pack versions within a tax year. If `us-1040-2025/line-11` is the AGI line in pack version 2025.1.0, it remains the AGI line in pack version 2025.99.99. ID renaming requires a SPEC.md amendment.

### 8.4 Cross-Year Equivalence

Node IDs differ across tax years even when the line is semantically identical (`us-1040-2025/line-11` and `us-1040-2024/line-11` are distinct nodes). The Tax Engine never computes across tax years.

---

## 9. Tipped-Wage Module Data Contract

This section is binding for Phase 1 (rule pack content) and Phase 4 (module implementation).

### 9.1 tipped-wages.yaml — Federal Pack Shape (2025+)

```yaml
pack: us-federal/2025

# Form 4137 mechanics — applies all years
form_4137:
  form_id: form-4137
  applicable_when:
    - "any_w2_with_unreported_cash_tips"
    - "any_w2_with_disputed_box_8_allocated_tips"
  worksheet_lines: [1a, 1b, 1c, 1d, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
  ss_rate: 0.062
  medicare_rate: 0.0145
  citation: "CTR/B.1/2025"

# Excess SS tax recovery — applies all years
excess_ss_recovery:
  applies_when: "multi_employer_combined_ss_wages_exceed_wage_base"
  schedule_3_line: 11
  ss_wage_base: 176100                           # 2025 value
  max_employee_ss_tax: 10918.20                  # 2025 value
  citation: "CTR/B.6/2025|CTR/A.11/2025"

# §224 Qualified Tip Deduction — 2025+ only
section_224:
  available: true
  available_years: [2025, 2026, 2027, 2028]
  cap_per_return: 25000
  cap_citation: "CTR/B.5/2025/cap"
  phase_out:
    threshold_magi_single: 150000
    threshold_magi_mfj: 300000
    rate_per_1000_excess: 100
    citation: "CTR/B.5/2025/phaseout"
  magi_definition: "agi + section_911_exclusions + section_931_exclusions + section_933_exclusions"
  magi_citation: "CTR/B.5/2025/magi"
  filing_status_bars: [mfs]
  filing_status_citation: "CTR/B.5/2025/mfs-bar"
  ssn_required: [taxpayer, spouse_if_mfj]
  ssn_citation: "CTR/B.5/2025/ssn"
  ownership_recharacterization:
    threshold_pct: 0.05
    rule: "irrebuttable_disqualification"
    citation: "CTR/B.5/2025/ownership"
  managerial_tip_pool_exclusion: true
  managerial_citation: "CTR/B.5/2025/managerial"
  sstb_transition_relief:
    active: true
    source: "Notice 2025-69"
    expires_when: "ssn final regulations issue + 1 calendar year"
    default_treatment_when_employer_is_sstb: "qualified_if_occupation_in_ttoc"
    flag_for_tax_director_review: true
    citation: "CTR/B.5/2025/sstb"
    ambiguity_record_id: "AMB-2025-FED-SSTB"
  reporting:
    2025:
      method: "transition_relief_per_notice_2025_69"
      default_qualified_tip_source: "w2_box_7_plus_form_4137_line_4"
      citation: "CTR/B.5/2025/reporting-2025"
    2026:
      method: "w2_box_12_code_TP"
      ttoc_w2_box: "14b"
      citation: "CTR/B.5/2026/reporting-2026"
  reduces_fica: false                             # DOES NOT reduce FICA wages
  reduces_eitc_earned_income: false               # DOES NOT reduce EITC base
  reduces_additional_medicare_tax_base: false
  fica_eitc_citation: "CTR/B.5/2025/fica-eitc-disclosure"
  schedule_1a_part: 2
  flow_to_form_1040_line: "13b"

# TTOC List — closed list per T.D. 10044 (2025+)
ttoc:
  source: "T.D. 10044 final regulations"
  source_citation: "CTR/B.5/2025/ttoc-source"
  categories:
    - id: 1
      name: "Beverage & Food Service"
      occupations:
        - { code: 101, label: "Bartenders", citation: "CTR/B.5/2025/ttoc-101" }
        - { code: 102, label: "Wait Staff", citation: "CTR/B.5/2025/ttoc-102" }
        - { code: 103, label: "Food Servers (Nonrestaurant)", citation: "CTR/B.5/2025/ttoc-103" }
        - { code: 104, label: "Dining Room and Cafeteria Attendants", citation: "CTR/B.5/2025/ttoc-104" }
        - { code: 105, label: "Chefs and Cooks", citation: "CTR/B.5/2025/ttoc-105" }
        - { code: 106, label: "Food Preparation Workers", citation: "CTR/B.5/2025/ttoc-106" }
        - { code: 107, label: "Fast Food and Counter Workers", citation: "CTR/B.5/2025/ttoc-107" }
        - { code: 108, label: "Dishwashers", citation: "CTR/B.5/2025/ttoc-108" }
        - { code: 109, label: "Hosts/Hostesses", citation: "CTR/B.5/2025/ttoc-109" }
        - { code: 110, label: "Bakers", citation: "CTR/B.5/2025/ttoc-110" }
    - id: 2
      name: "Entertainment & Events"
      occupations:
        # Gambling dealers, gaming services workers, dancers, musicians/singers (SSTB-flagged),
        # DJs/entertainers, ushers, locker-room attendants
        # ... full list per T.D. 10044
    - id: 3
      name: "Hospitality & Guest Services"
      occupations: # baggage porters/bellhops, concierges, hotel/motel/resort desk clerks, maids, doormen
    - id: 4
      name: "Home Services"
      occupations: # home maintenance/repair, home cleaning, locksmiths, electricians, plumbers, etc.
    - id: 5
      name: "Personal Services"
      occupations: # tour/travel guides, photographers, content creators/influencers, event planners
    - id: 6
      name: "Personal Appearance & Wellness"
      occupations: # barbers/hairdressers, nail techs, estheticians, massage therapists (SSTB-flagged), etc.
    - id: 7
      name: "Recreation & Instruction"
      occupations: # golf caddies, sports/recreation instructors, tour guides
    - id: 8
      name: "Transportation & Delivery"
      occupations: # taxi/rideshare W-2 only, chauffeurs, valet, water taxi, charter boat, delivery, shuttle

# Service charges vs tips
service_charge_discrimination:
  rule: "amounts_with_compulsion_or_employer_set_amount_or_no_recipient_choice = wage_not_tip"
  citation: "CTR/B.8/2025"
  excluded_from_section_224: true
  excluded_from_form_4137: true

# §45B FICA Tip Credit — EMPLOYER ONLY
section_45b:
  applicability: "employer_only"
  surface_in_employee_flow: false
  educational_text_id: "section-45b-employer-only"
  citation: "CTR/B.4/2025"

# Standard mileage rates
standard_mileage:
  business_rate: 0.700
  medical_rate: 0.21
  charitable_rate: 0.14
  citation: "CTR/A.12/2025"
```

For the 2023 and 2024 federal packs, `section_224` is omitted entirely. The `ttoc` block is also omitted (TTOC did not exist pre-2025). The validator enforces this.

### 9.2 tipped-wages.yaml — California Pack Shape (2025/2026)

```yaml
pack: california/2025

ca_uebe:
  active: true
  schedule_ca_540_part: 2
  schedule_ca_540_line: 19
  agi_floor: 0.02
  authority: "R&TC §17072(a)"
  citation: "CTR/D.1/2025"
  prompts:
    - id: uniforms_required_not_adaptable
      label: "Employer-required uniform clothing not adaptable to street wear"
      citation: "CTR/D.1/2025/uniforms"
    - id: non_slip_shoes
      label: "Employer-required non-slip work shoes"
      citation: "CTR/D.1/2025/shoes"
    - id: required_tools
      label: "Employer-required tools (chef knives, bartender tools, hairstylist shears, etc.)"
      citation: "CTR/D.1/2025/tools"
    - id: union_dues
      label: "Union and required professional dues"
      citation: "CTR/D.1/2025/union"
    - id: required_licensing
      label: "Required licensing/permit fees (food handler card, RBS certification, cosmetology license)"
      citation: "CTR/D.1/2025/licensing"
    - id: required_ce
      label: "Employer-required continuing education not reimbursed"
      citation: "CTR/D.1/2025/ce"
    - id: mileage_between_jobsites
      label: "Mileage between two job sites in a single workday (not commuting)"
      citation: "CTR/D.1/2025/mileage"
    - id: cell_phone_work_portion
      label: "Work-related cell phone usage prorated"
      citation: "CTR/D.1/2025/cell"
  mileage_rate: 0.700                         # mirrors federal business rate
  mileage_citation: "CTR/A.12/2025|CTR/D.1/2025/mileage"

ca_section_224_addback:
  active: true
  default_on: true                            # binding default per Principle 5
  schedule_ca_540_part: 1
  schedule_ca_540_section: c
  schedule_ca_540_line: "24z"
  description: "OBBBA §224 Federal Tip Deduction Addback — Non-Conformity"
  source_authority: "R&TC §17024.5; SB 711 conformity date 2025-01-01"
  citation: "CTR/D.3/2025"
  override_requires_tax_director_signoff: true
  reevaluation_trigger: "California enacts conforming legislation"
  ambiguity_record_id: "AMB-2025-CA-224-LINE-PLACEMENT"
```

For the 2023 and 2024 California packs, `ca_section_224_addback` is omitted (the federal §224 deduction does not exist pre-2025, so there is nothing to add back). `ca_uebe` exists for all California pack years.

---

## 10. Forms Inventory and Mailing Address Registry

### 10.1 forms.yaml

```yaml
pack: us-federal/2025
forms:
  - form_id: us-1040
    label: "U.S. Individual Income Tax Return"
    revision_date: "2025"
    official_url: "https://www.irs.gov/pub/irs-pdf/f1040.pdf"
    instructions_url: "https://www.irs.gov/pub/irs-pdf/i1040gi.pdf"
    template_path: "forms-renderer/form-templates/us-federal/2025/1040.pdf"
    line_definitions:
      - line_id: "us-1040/2025/line-1a"
        label: "Total amount from Form(s) W-2, box 1"
        line_number: "1a"
        data_type: currency_usd
        provenance: "from_input"
        input_source: "sum_of_w2_box_1"
        citation: "CTR/E/2025/1040-line-1a"
      - line_id: "us-1040/2025/line-1c"
        label: "Unreported tip income (Form 4137)"
        line_number: "1c"
        data_type: currency_usd
        provenance: "computed"
        computation_node: "us-form-4137-2025/line-4"
        citation: "CTR/B.1/2025|CTR/E/2025/1040-line-1c"
      - line_id: "us-1040/2025/line-11"
        label: "Adjusted gross income"
        line_number: "11"
        data_type: currency_usd
        provenance: "computed"
        citation: "CTR/E/2025/1040-line-11"
      - line_id: "us-1040/2025/line-13b"
        label: "Qualified tips and overtime deduction (Schedule 1-A)"
        line_number: "13b"
        data_type: currency_usd
        provenance: "computed"
        computation_node: "us-schedule-1a-2025/part-2/line-7"
        citation: "CTR/B.5/2025"
      # ... every line on the form
  - form_id: us-1040-schedule-1a
    label: "Schedule 1-A — Additional Deductions"
    revision_date: "2025"
    new_in_year: 2025                            # explicit field; Phase 5 hides for pre-2025 years
    official_url: "https://www.irs.gov/pub/irs-pdf/f1040s1a.pdf"
    template_path: "forms-renderer/form-templates/us-federal/2025/schedule-1a.pdf"
    line_definitions:
      # ... including Part II for §224 qualified tips
  # ... every form in the pack
```

For the 2023 and 2024 federal packs, `us-1040-schedule-1a` is absent (the form did not exist). The validator enforces this.

For California packs, the analogous file uses California form IDs (`ca-540`, `ca-schedule-ca-540`, `ca-ftb-3514`, etc.) and FTB-published URLs.

### 10.2 mailing-addresses.yaml

```yaml
pack: us-federal/2025
applicability: "for taxpayers with state of residence = California"
addresses:
  - condition: "with_payment"
    recipient: "Internal Revenue Service"
    line1: "P.O. Box 802501"
    city: "Cincinnati"
    state: "OH"
    zip: "45280-2501"
    citation: "CTR/A.13/2025"
  - condition: "without_payment"
    recipient: "Department of the Treasury"
    line2: "Internal Revenue Service"
    city: "Ogden"
    state: "UT"
    zip: "84201-0002"
    citation: "CTR/A.13/2025"
verification:
  source_url: "https://www.irs.gov/filing/where-to-file-paper-tax-returns-with-or-without-a-payment"
  verified_date: "2026-05-01"
  next_verification_required_by: "2026-12-31"
```

Verification is part of the rule pack release process: addresses must be re-verified against the IRS (or FTB) Where to File table at least annually, and a fresh verification is required within 30 days of any tax-year rule-pack release.

For California packs:

```yaml
pack: california/2025
addresses:
  - condition: "refund_or_no_payment"
    recipient: "Franchise Tax Board"
    line1: "P.O. Box 942840"
    city: "Sacramento"
    state: "CA"
    zip: "94240-0001"
    citation: "CTR/C.13/2025"
  - condition: "balance_due"
    recipient: "Franchise Tax Board"
    line1: "P.O. Box 942867"
    city: "Sacramento"
    state: "CA"
    zip: "94267-0001"
    citation: "CTR/C.13/2025"
```

---

## 11. Ambiguity Record Schema

### 11.1 ambiguities.yaml

```yaml
pack: california/2025
ambiguities:
  - ambiguity_id: AMB-2025-CA-224-LINE-PLACEMENT
    title: "FTB has not issued definitive 2025 Schedule CA (540) line-level guidance for the §224 addback"
    controlling_report_citation: "CTR/D.3/2025/escalate"
    interpretations:
      most_defensible:
        description: "Add back on Schedule CA (540) Part I, Section C, Line 24z with explicit description"
        rationale: "Aligns with FTB Schedule CA 'Other Adjustments' guidance and provides complete audit trail"
      conservative:
        description: "Manual override warning to preparer; require tax-director review before filing any 2025 California return that includes a federal §224 deduction"
        rationale: "Defers to upcoming FTB guidance; minimizes risk of filing on unsupported line"
      aggressive:
        description: "Rely on absence of explicit FTB addback line to argue silent conformity"
        rationale: "FORBIDDEN — explicitly rejected by Controlling Report D.3 in light of SB 711 conformity date and FTB OBBBA-non-conformity statement in 2025 Form 540 booklet"
        forbidden: true
    recommended_default: most_defensible
    reevaluation_trigger: "FTB issues 2025 Schedule CA Errata or 2026 Schedule CA with explicit OBBBA addback line"
    next_check_by: "2026-12-31"
    tax_director_signoff:
      name: ""
      date: ""
      signature_file: ""
    last_reviewed: "2026-05-02"

  - ambiguity_id: AMB-2026-CA-INDEXED-AMOUNTS
    title: "2026 California indexed amounts (standard deduction, EITC, brackets, renter's credit) are projected pending FTB late-summer 2026 publication"
    controlling_report_citation: "CTR/Caveats/2026-ca-indexed"
    interpretations:
      most_defensible:
        description: "Use FTB-projected values flagged as PROJECTED in user-facing copy; refresh once FTB issues final 2026 indexed amounts notice"
      conservative:
        description: "Defer 2026 California return preparation until FTB final indexed amounts publish"
      aggressive:
        description: "Use prior-year values"
        forbidden: true
    recommended_default: most_defensible
    reevaluation_trigger: "FTB publishes 2026 indexed amounts notice (typically late summer 2026)"
    next_check_by: "2026-09-30"
```

### 11.2 Required Ambiguity Records (At Minimum)

Every rule pack MUST include at least the following ambiguities where applicable, sourced from Controlling Report Part F (Mid-Year Changes Tracker) and the Caveats section:

- `AMB-2025-FED-SSTB` — §224 SSTB final regulations pending; transition relief in effect under Notice 2025-69.
- `AMB-2025-CA-224-LINE-PLACEMENT` — FTB has not issued definitive Schedule CA line guidance for §224 addback.
- `AMB-2026-FED-PTC` — 2026 Premium Tax Credit parameters revert to pre-ARPA absent congressional action.
- `AMB-2026-CA-INDEXED-AMOUNTS` — 2026 California indexed amounts projected pending FTB late-summer 2026.
- `AMB-2026-CA-CONFORMITY` — California OBBBA conformity legislation pending; absence of conformity is current operative posture.

---

## 12. Tax Year Loader Interface

The TaxYearLoader is a Phase 2 service that loads Phase 1 rule packs into memory for Phase 3 (Tax Engine), Phase 4 (Tipped-Wage Module), and Phase 5 (Forms Renderer).

### 12.1 Interface Contract (TypeScript)

```typescript
export type Jurisdiction = "us-federal" | "california";
export type TaxYear = 2023 | 2024 | 2025 | 2026;

export interface RulePack {
  readonly pack_id: string;
  readonly version: string;
  readonly spec_version: string;
  readonly tax_year: TaxYear;
  readonly jurisdiction: Jurisdiction;
  readonly manifest: Manifest;
  readonly brackets: Brackets;
  readonly standard_deduction: StandardDeduction;
  readonly itemized: Itemized;
  readonly credits: ReadonlyMap<string, Credit>;
  readonly tipped_wages: TippedWages;
  readonly forms: FormsInventory;
  readonly mailing_addresses: MailingAddresses;
  readonly ambiguities: ReadonlyMap<string, AmbiguityRecord>;
  readonly content_hash: string; // SHA-256 of canonicalized pack
}

export interface TaxYearLoader {
  load(jurisdiction: Jurisdiction, year: TaxYear): Promise<RulePack>;
  // Throws SignatureError if pack lacks required signatures (federal_specialist + tax_director,
  //   plus california_specialist for CA packs).
  // Throws SchemaError if any file fails JSON Schema validation.
  // Throws CitationError if any citation fails registry resolution.
  // Throws YearCoherenceError if pack contains year-incompatible fields.
  // Caches loaded packs in memory. Pack files are immutable; cache lives until process exit.
}
```

### 12.2 Loader Behavior

- The loader is the ONLY path application code uses to access rule pack data. No service parses YAML directly. No service reads from `/jurisdictions/...` paths.
- Loaded packs are deeply frozen. Mutation attempts throw at runtime in development and are no-ops in production.
- Signature verification uses the public keys in `/jurisdictions/<j>/<year>/signatures/*.pub`. Private keys live in the signing-only HSM and are never accessible to runtime services.
- Pack loading is logged (pack_id, version, content_hash, loader version) to the audit log per §15.

---

## 13. Internal API Conventions

### 13.1 Protocol

All internal service-to-service APIs are HTTP/JSON over mTLS within the VPC. OpenAPI 3.1 specifications live in `/schemas/api/*.openapi.yaml` and are the binding contract.

### 13.2 Versioning

All endpoint paths are prefixed with `/v<major>/`. Breaking changes require a new major version. Old versions remain available for at least one full filing season after deprecation announcement.

### 13.3 Error Shape

```json
{
  "error": {
    "code": "TENANT_ISOLATION_VIOLATION",
    "message": "Resource does not belong to the requesting tenant.",
    "trace_id": "abc123...",
    "retriable": false
  }
}
```

Error codes are enumerated in `/schemas/api/error-codes.yaml`. New codes require an OpenAPI update and CI must fail on undocumented codes.

### 13.4 Authentication

All internal calls authenticate via mTLS client certificates issued per service. User-context calls additionally carry a signed user-session token; tenant ID extracted from the token is enforced at the data layer (never trusted from request headers).

### 13.5 Idempotency

All write endpoints accept an `Idempotency-Key` header. The platform deduplicates within 24 hours.

### 13.6 Rate Limiting

All endpoints have rate limits documented in their OpenAPI spec. Exceeding rate limit returns HTTP 429 with `Retry-After`.

---

## 14. Data Classification and Encryption Scheme

### 14.1 Tier Definitions

| Tier | Examples | Encryption Requirement |
|------|----------|------------------------|
| Tier 1 — Restricted | SSN, ITIN, EIN, bank account & routing numbers, scanned ID images | Field-level envelope encryption with per-tenant CMK; never logged; never sent to third-party APM/analytics; masked in all UIs by default; break-glass access required for full view |
| Tier 2 — Confidential | W-2 line amounts, dependent info, addresses, employer names, occupation, tipped-toggle state, all interview answers | Database-at-rest encryption with KMS; row-level tenant isolation; access logged to audit log |
| Tier 3 — Internal | De-identified aggregates, support tickets without taxpayer detail, system metrics | Standard access controls; business-need basis |

### 14.2 KMS Key Hierarchy

- One AWS-managed root CMK per AWS account.
- One platform-controlled CMK per logical environment (dev, staging, prod), key-rotation-enabled with annual rotation minimum.
- Per-tenant data keys derived from the platform CMK using KMS GenerateDataKey with tenant-bound encryption context. Data keys are cached in memory for the duration of a request and never persisted.
- Signing keys for rule packs live in a separate HSM, never accessible to runtime services.

### 14.3 Key Escrow

A break-glass escrow procedure is documented in WISP.md. Two officers (CEO + CISO) jointly hold the recovery materials in geographically separated tamper-evident storage. Escrow access is itself logged.

### 14.4 Field-Level Encryption Implementation

```
Plaintext SSN
  → AEAD encrypt with per-tenant data key (encryption context: tenant_id + field_name)
  → Store ciphertext + KMS key reference + nonce in PostgreSQL
  → Decrypt only at the API boundary, only for authorized callers, never into logs
```

A library function `withDecryptedField(tenant_id, field_name, ciphertext, callback)` is the only legal access path. Callers pass a closure; the plaintext exists only inside the closure scope.

### 14.5 Logging Redaction

The structured logger applies field-level redaction at the logger layer, not in application code. Reserved field names (`ssn`, `itin`, `ein`, `bank_account`, `routing_number`, `password`, `token`, `secret`) are auto-redacted. Application code is forbidden from logging Tier 1 data even with redaction; a CI lint check enforces this.

### 14.6 Cross-Tenant Decryption Impossibility

Per-tenant KMS encryption contexts mean a request authenticated as tenant A cannot decrypt tenant B's data even if it gets the ciphertext, because the KMS decrypt call requires the matching encryption context. This is a structural guarantee, not a policy.

---

## 15. Audit Log Schema and Integrity

### 15.1 Audit Log Record Shape

```json
{
  "record_id": "audit_01J5ZK...",
  "previous_record_hash": "<SHA-256 of previous record's canonical JSON>",
  "this_record_hash": "<SHA-256 of this record's canonical JSON, excluding this_record_hash itself>",
  "occurred_at": "<ISO-8601 UTC>",
  "tenant_id": "<opaque>",
  "actor": {
    "type": "user | service | scheduled_job | support_agent",
    "actor_id": "<opaque>",
    "ip_address": "<source IP>",                 // null for service/job
    "user_agent": "<UA>"                         // null for service/job
  },
  "action": {
    "category": "auth | document | ocr | interview | computation | export | support | admin",
    "verb": "created | updated | viewed | deleted | exported | failed",
    "resource_type": "<resource type>",
    "resource_id": "<resource ID>"
  },
  "context": {
    "tax_year": null | integer,
    "tro_id": null | "<TRO ID>",
    "rule_pack_versions": null | { ... }
  },
  "outcome": "success | failure",
  "failure_reason": null | "<reason code>",
  "additional_data": { /* Tier 3 only; PII stripped */ }
}
```

### 15.2 Hash Chaining

Each record carries `previous_record_hash` (SHA-256 of the prior record's canonical JSON). Records are written in strict insertion order. The first record in the chain has `previous_record_hash = "GENESIS"`.

`this_record_hash` is computed over the canonical JSON of the record excluding the `this_record_hash` field itself. The next record's `previous_record_hash` equals this value.

### 15.3 Integrity Protection

- Audit log writes go to an isolated AWS account with its own IAM trust boundary.
- Application services hold append-only credentials. No service has UPDATE or DELETE permission.
- A scheduled tamper-detection job runs hourly: it walks the chain, recomputes hashes, and pages on any break.
- A weekly external job snapshots the chain head hash to an off-account immutable store (S3 Object Lock).

### 15.4 Required Audit Events

At minimum, the following events MUST be logged:

- Authentication: login success, login failure, MFA enrollment, MFA challenge, MFA failure, password reset, account recovery initiation and completion.
- Document: upload, download, deletion, OCR start, OCR completion, OCR confirmation, OCR correction.
- Tax engine: rule pack load (with version + content hash), computation start, computation completion (with TRO content hash), optimization decision recorded.
- Export: mail-in package generated, portable bundle generated, with the exact bundle hash.
- Support: every back-office view of a user record, every break-glass access (with reason code).
- Admin: rule pack signing event, SPEC.md amendment merge, infrastructure change apply.

### 15.5 Retention

Audit logs are retained for at least 7 years. Tax records (TROs and inputs) are retained for at least 3 years per IRC §6501; user-initiated deletion may erase Tier 1 fields after the 3-year minimum, but audit log entries remain.

---

## 16. Security Release Gates

The following gates are merge-blocking. CI must fail on any violation; manual override is forbidden without CISO sign-off recorded as an audit event.

| Gate | Tool / Mechanism | Threshold |
|------|------------------|-----------|
| SAST | Semgrep with security ruleset | Zero high or critical findings |
| SCA / Dependency vulnerabilities | Snyk or equivalent | Zero high or critical CVEs |
| Secret scanning | gitleaks + GitHub native | Zero detected secrets |
| License compliance | Open Source Review Toolkit or similar | Zero copyleft licenses in production deps without explicit approval |
| Tenant isolation tests | Custom integration suite | 100% pass |
| Encryption tests | Custom test verifying Tier 1 unreadability from raw DB snapshot | 100% pass |
| Audit log integrity tests | Insert + perturb + detect | 100% pass |
| OCR confirmation tests | Verify no downstream API returns unconfirmed fields | 100% pass |
| Logging redaction tests | Static analysis + runtime fuzzing of log statements | Zero PII leaks detected |
| API schema conformance | OpenAPI validator vs implementation | 100% pass |
| Performance budget | Per-API p50/p99 measurements | Within budgets defined in PHASE_2_DESIGN.md |
| WISP control evidence | Vanta automated checks | 100% controls passing |
| Infrastructure-as-code drift | Terraform plan vs deployed state | Zero unexpected drift |

---

## 17. UI/UX Binding Standards

Phase 6 owns the production clients. Phase 6's design must comply with the following binding standards.

### 17.1 Reading Level

All user-facing copy is verified at sixth-grade reading level (Flesch-Kincaid grade ≤ 6.0) by an automated CI check on the localization bundles. Technical tax terminology MAY appear inside expandable explanations behind a one-tap interaction; the primary label MUST be plain English.

### 17.2 Money Display

Monetary results displayed prominently (refund, balance due, total tax) MUST use display sizes ≥ 56pt on mobile, ≥ 72pt on web. Smaller monetary values use ≥ 24pt. All money values use the `currency_usd` formatter that renders with `$` prefix, comma thousand separators, and explicit two-decimal cents (or "rounded to dollars" when rule packs specify dollar-rounding).

### 17.3 Tappable Provenance

Every monetary value on the Review screen MUST be tappable to reveal: (a) the source — input, computation, or worksheet — (b) the citation, in plain English, and (c) the path of inputs that produced it. The Tax Engine's TRO carries this information; the client surfaces it.

### 17.4 Accessibility

WCAG 2.1 AA is the minimum, verified by a certified third-party audit before launch. Specific bindings:

- Every interactive element keyboard-navigable.
- Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text.
- All form inputs have associated `<label>` elements.
- Touch targets ≥ 44pt × 44pt on mobile.
- Dynamic Type and high-contrast modes supported.
- VoiceOver and TalkBack tested every sprint.
- No exclusively-color-coded information (e.g., refund-vs-owe must use color AND a sign or icon).

### 17.5 Localization

English and Spanish at launch. Every translated tax term reviewed by a credentialed bilingual tax professional. No machine translation of tax terminology.

### 17.6 Honest Disclosure

Wherever the Tipped-Wage Module would be misinterpreted, a plain-English disclosure MUST appear adjacent to the value. Specifically: the §224 deduction explanation MUST include "This does not lower your Social Security or Medicare tax — those still apply to all your tips. It also does not change your eligibility for Earned Income Credit." This is a binding copy requirement, not a guideline.

### 17.7 No Dark Patterns

The platform MUST NOT use deceptive UI patterns. Specifically forbidden:

- Pre-checked opt-ins for marketing or data sharing.
- "Are you sure you want to leave?" interstitials when the user attempts to cancel or export.
- Visual ranking of upsells over the primary user action.
- Withholding completed work behind a payment screen the user did not anticipate.

### 17.8 Loading States

All loading indicators communicate concrete progress when possible ("Reading your W-2... 3 of 5 fields confirmed") rather than indeterminate spinners. Indeterminate spinners are permitted only for operations with truly unknown duration, and even then must time out with a recoverable error message.

---

## 18. Export Bundle Schema (.ttr.json)

The Portable Export Bundle is a ZIP archive containing the canonical TipsTax Return file (`.ttr.json`) plus PDFs and supporting files.

### 18.1 Bundle Layout

```
<filer_id>-<tax_year>-<bundle_version>.zip
├── manifest.json                          # File inventory with SHA-256 hashes
├── return.ttr.json                        # The canonical .ttr.json (signed)
├── return.ttr.json.sig                    # Detached signature
├── federal/
│   ├── form-1040.pdf                      # Form-fillable, AcroForm preserved
│   ├── schedule-1.pdf
│   ├── schedule-1a.pdf                    # 2025+ only
│   ├── schedule-2.pdf
│   ├── schedule-3.pdf
│   ├── form-4137.pdf                      # if applicable
│   └── ... (all required federal forms)
├── california/
│   ├── form-540.pdf
│   ├── schedule-ca-540.pdf
│   ├── ftb-3514.pdf                       # if applicable
│   └── ...
├── source-documents/
│   ├── w2-<employer>-<id>.pdf             # Original uploads
│   └── ...
├── csv/
│   ├── federal-line-items.csv             # form-line-value rows
│   └── california-line-items.csv
├── irs-fillable-mapping/
│   └── (pre-filled IRS Free File Fillable Forms PDFs)
└── destination-guides/
    ├── irs-free-file-fillable-forms.pdf
    ├── ca-calfile.pdf
    ├── (other destination guides)
    └── README.txt
```

### 18.2 .ttr.json Top-Level Shape

The `.ttr.json` is the canonical TRO from §5 plus an export envelope:

```json
{
  "$schema": "https://tipstax.local/schemas/ttr-bundle.schema.json",
  "ttr_version": "1.0.0",
  "exported_at": "<ISO-8601 UTC>",
  "bundle_id": "bundle_01J5ZK...",
  "tax_return_object": { /* full TRO from §5 */ },
  "export_envelope": {
    "exported_for": "<filer_id>",
    "platform_certificate_thumbprint": "<sha256>",
    "engine_version": "3.4.1",
    "spec_version": "1.0.0",
    "destination_hint": null | "irs-fillable" | "calfile" | "consumer-import" | "cpa-import"
  }
}
```

### 18.3 Signature

The `.ttr.json` is detached-signed with the platform export certificate. Verification public key is published at a stable URL so destination platforms can verify bundle integrity.

### 18.4 Manifest

```json
{
  "manifest_version": "1.0.0",
  "bundle_id": "bundle_01J5ZK...",
  "created_at": "<ISO-8601 UTC>",
  "files": [
    { "path": "return.ttr.json", "size": 28471, "sha256": "..." },
    { "path": "federal/form-1040.pdf", "size": 184932, "sha256": "..." },
    ...
  ],
  "tax_year": 2025,
  "engine_version": "3.4.1"
}
```

### 18.5 PDF Form-Fillability

PDFs in the bundle preserve AcroForm fields. The Forms Renderer (Phase 5) populates fields with values; flattening is forbidden for export PDFs (mail-in PDFs may be flattened for print-quality). Field names follow the IRS / FTB published form field naming where available.

### 18.6 Destination Guides

A short, accurate, screenshot-driven PDF for each supported destination. Tone is honest: "Open the destination, click Import, select the bundle file. If your destination does not accept imports, follow the manual entry instructions on page 2." The platform NEVER claims integration with a destination without that destination's formal acknowledgment.

---

## 19. Test Contracts and Coverage Floors

### 19.1 Coverage Floors

| Component | Line Coverage | Branch Coverage | Mutation Catch Rate |
|-----------|---------------|-----------------|---------------------|
| Tax Engine (Phase 3) | ≥ 90% | ≥ 85% | ≥ 95% |
| Tipped-Wage Module (Phase 4) | ≥ 90% | ≥ 85% | ≥ 95% |
| Forms Renderer (Phase 5) | ≥ 85% | ≥ 75% | ≥ 90% |
| Core Platform services (Phase 2) | ≥ 85% | ≥ 75% | N/A |
| Rule pack validator and test runner (Phase 1) | ≥ 90% | ≥ 80% | N/A |

CI fails on any regression below floor.

### 19.2 Conformance Test Scenario Schema

Each conformance scenario is a JSON file with the following shape:

```json
{
  "scenario_id": "SC-2025-FED-01284",
  "title": "Single tipped server, two W-2s, EITC eligible, §224 phase-out boundary",
  "tax_year": 2025,
  "jurisdictions": ["us-federal", "california"],
  "inputs": {
    "filing_status": "single",
    "dependents": [],
    "w2s": [ { "employer": "Restaurant A", "box1": 18400, "box3": 19200, "box4": 1190.40, "box5": 19200, "box6": 278.40, "box7": 800, "box8": 0, "box14_codes": [], "tipped_toggle": true, "ttoc_code": 102 }, ... ],
    "tipped_overlay": { "<w2_id>": { "occupation": 102, "unreported_cash_tips": 250, "tip_pool": false, "non_slip_shoes_cost": 280, "uniforms_cost": 150, "union_dues": 0 } },
    "interview": { ... }
  },
  "expected_outputs": {
    "us-1040/2025/line-1a": 36800,
    "us-1040/2025/line-1c": 250,
    "us-1040/2025/line-11": 36800,
    "us-1040/2025/line-13b": 800,
    "us-1040/2025/line-27": "<computed EITC>",
    "ca-540/2025/line-19": "<computed CA AGI>",
    "ca-schedule-ca-540/2025/part-1/section-c/line-24z": 800,
    "ca-schedule-ca-540/2025/part-2/line-19": "<computed UEBE>",
    "summary.federal_refund_or_owe": "<value>",
    "summary.california_refund_or_owe": "<value>"
  },
  "expected_optimization_choices": {
    "filing_status": "single",
    "federal_deduction_choice": "standard",
    "california_deduction_choice": "itemized"
  },
  "expected_ambiguity_dispositions": {
    "AMB-2025-FED-SSTB": "most_defensible_default_applied"
  },
  "controlling_report_anchors": ["CTR/B.5/2025", "CTR/D.1/2025", "CTR/D.3/2025"],
  "source_authority_citations": ["IRC §224", "Notice 2025-69", "R&TC §17072(a)", "R&TC §17024.5"],
  "tax_director_signoff": { "name": "", "date": "" }
}
```

### 19.3 Required Conformance Scenarios per Pack

- ≥ 1,500 scenarios per tax year per jurisdiction (so ≥ 12,000 across the 8 packs).
- Coverage requirements:
  - Every filing status for every year.
  - Every credit at typical, edge (boundary), and disqualified states.
  - Every tipped occupation category (8 TTOC categories) at least 5 scenarios each for 2025+.
  - Multi-W-2 scenarios at every tipped/non-tipped combination.
  - §224 phase-out boundary scenarios (just-below, just-above, full phase-out).
  - California §224 addback verification on every 2025 and 2026 scenario where federal §224 applies.
  - EITC edge cases including investment-income cap.
  - PTC reconciliation including excess advance credit repayment.
  - Multi-state W-2 with CA residence (out-of-state W-2).
  - Excess SS tax recovery for multi-employer years.
  - Form 4137 for unreported and disputed allocated tips.

### 19.4 Property-Based Test Invariants

The Tax Engine MUST satisfy the following property-based tests:

- **Idempotence:** running the engine twice on the same inputs produces byte-identical TROs.
- **Monotonicity (withholding):** increasing withholding by $X never decreases refund (and never increases balance due) by more than $X, modulo phase-out interactions.
- **Non-negativity:** total tax ≥ 0 (negative tax does not exist; what's negative is refund).
- **Sum invariants:** Schedule 1 total = sum of Schedule 1 line items; total tax = sum of components.
- **Filing status closure:** for any input with multiple legal filing statuses, every legal status produces a valid (non-error) TRO.

### 19.5 Differential Testing

100+ scenarios per tax year per jurisdiction MUST be benchmarked against two commercial tax products. Material discrepancies (>$1) require a written reconciliation memo signed by the Tax Director before merge.

### 19.6 Mutation Testing

Random rule-pack perturbations (perturb a single bracket threshold, flip a phase-out direction, swap a citation) MUST be caught by the test suite at the rates in §19.1.

### 19.7 PDF Conformance Testing

Every generated PDF MUST be:

- Rasterized at 300 DPI and OCR'd back; round-trip values match source within 0.0% tolerance for dollar amounts.
- Visually compared to the IRS / FTB published form template at sub-pixel granularity for layout fidelity.
- Validated for AcroForm preservation in export bundles (no flattening).

---

## 20. Versioning, Signing, and Reproducibility

### 20.1 SemVer Across the Platform

All internally-versioned artifacts (rule packs, Tax Engine, services, schemas, SPEC.md itself) use SemVer 2.0.

- Major: incompatible change requiring downstream phase update.
- Minor: backward-compatible feature addition.
- Patch: backward-compatible bug fix.

### 20.2 Rule Pack Signing

Each rule pack is signed with detached signatures from the required roles:

- Federal pack: Federal Specialist + Tax Director.
- California pack: California Specialist + Federal Specialist + Tax Director (Federal Specialist signs because the California pack inherits federal definitions).

Signing keys live in an HSM. Public keys are checked into the repo. The TaxYearLoader verifies signatures on every load.

### 20.3 Reproducible Builds

- All artifacts MUST be reproducible byte-for-byte from source.
- No timestamps in build outputs (use `SOURCE_DATE_EPOCH`).
- No machine-specific paths (use relative paths and toolchain wrappers).
- Locked dependency versions (lockfiles committed; no version ranges in production).
- CI verifies reproducibility by building twice and diffing.

### 20.4 Validator CLI Behavior

The `rule-pack-validate` CLI MUST:

- Return zero exit only when ALL checks pass: schema validation, citation registry resolution, year coherence, signature verification, manifest hash consistency, ambiguity completeness.
- Emit a machine-readable validation report (JSON) regardless of exit code.
- Be runnable in CI and locally with identical results.

---

## 21. Change Control Protocol

### 21.1 Rule Pack Changes

Once a rule pack is tagged at a SemVer, it is immutable. Corrections require a new version:

1. Branch from the tagged pack.
2. Edit the YAML.
3. Update `manifest.yaml` with new SemVer and updated file SHA-256 hashes.
4. Run `rule-pack-validate` locally; fix any failures.
5. Open PR; CI runs full validation.
6. Required reviewers: Federal Specialist + Tax Director (CA packs additionally California Specialist).
7. On approval, sign the new manifest with each role's private key (HSM operation).
8. Commit the detached signatures.
9. Merge.
10. Tag with the new SemVer.
11. Add changelog entry to `/jurisdictions/<j>/<year>/CHANGELOG.md`.

### 21.2 Tax Engine Changes

Tax Engine changes follow standard software change control plus:

- Every change runs the full conformance suite.
- Material output changes (any TRO line value change > $1 in any conformance scenario) require Tax Director sign-off recorded in the PR.
- Engine version bumps trigger a regression test against every prior-year computed return in the system; outputs must remain byte-identical unless the change is a deliberate correction documented in the changelog.

### 21.3 Mid-Season Rule Changes

If a tax authority issues guidance during filing season that changes rule pack content, the Mid-Year Changes Tracker process activates:

1. Tax Content team drafts a new pack version within 48 hours.
2. Sign-off chain expedited (Tax Director + at least one Specialist; outside CPA consulted).
3. Deploy to production.
4. Public-facing changelog entry visible to users.
5. All in-flight returns prepared under the prior pack flagged for user review.

---

## 22. SPEC.md Amendment Protocol

SPEC.md is itself versioned (`spec_version` in every artifact).

### 22.1 Amendment Triggers

A SPEC.md amendment is required when:

- Any binding contract in this document needs to change.
- A later phase identifies a gap that blocks work.
- The Controlling Tax Research Report is revised in a way that changes the platform's data shape (not just parameter values).
- A regulatory change requires a new artifact type or a new compliance gate.

### 22.2 Amendment Process

1. Author opens PR titled `SPEC AMENDMENT: <short title>` with a diff.
2. PR description includes: motivation, affected phases, downstream impact analysis, migration plan.
3. Required reviewers: CTO + Tax Director.
4. Material amendments (touching architectural principles in §2, Tier 1 data handling in §14, security gates in §16, or accuracy SLO) additionally require CEO sign-off.
5. On approval, SPEC.md SemVer is bumped:
   - Major: any phase contract change.
   - Minor: new section, new optional field.
   - Patch: clarification, typo, citation correction.
6. Amendment is committed with a note in `/docs/SPEC_AMENDMENTS/<spec_version>.md` summarizing the change and disposition.
7. All phase teams are notified and acknowledge in writing within 5 business days.
8. Open work touching the amended sections must rebase against the new SPEC.md.

### 22.3 Forbidden Amendments

The following CANNOT be amended without a formal Board resolution:

- Principle 1 (tax law as data, not code).
- Principle 6 (no silent OCR).
- Principle 8 (append-only audit log).
- Principle 9 (no e-file transmission).
- The non-goals enumerated in §1.1.

---

## 23. Glossary

| Term | Definition |
|------|------------|
| Controlling Tax Research Report (CTR) | The May 2, 2026 tax research document covering federal Form 1040 and California Form 540 for tax years 2023–2026. Primary tax-law authority for the platform. |
| Rule Pack | A versioned, signed, immutable bundle of YAML files representing the tax law for a single jurisdiction in a single tax year. Eight rule packs total. |
| TaxYearLoader | The Phase 2 service that loads rule packs into memory for downstream phases. Only legal access path to rule pack data. |
| Tax Engine | The Phase 3 pure-functional computation core that produces a Tax Return Object from a TaxpayerYear plus a rule pack. |
| Tax Return Object (TRO) | The canonical immutable JSON document produced by the Tax Engine. Source for all rendered artifacts. |
| Optimization Engine | Subsystem of the Tax Engine that enumerates legal election combinations and selects the lowest-combined-liability scenario. |
| Computation Graph | DAG of line-level computations inside the Tax Engine. Nodes are addressable by Computation Graph node IDs (§8). |
| Tipped-Wage Module | The Phase 4 layer over the Tax Engine implementing tipped-worker-specific logic per Controlling Report Parts B and D. |
| TTOC | Treasury Tipped Occupation Code; the closed list of approximately 70 occupations qualifying for §224 per T.D. 10044. |
| §224 | IRC §224, the federal qualified-tip deduction enacted by OBBBA, available 2025–2028. |
| OBBBA | One Big Beautiful Bill Act, P.L. 119-21, enacted July 4, 2025. |
| SB 711 | California Conformity Act of 2025; advanced California IRC conformity to January 1, 2025; does NOT pick up OBBBA. |
| SSTB | Specified Service Trade or Business under IRC §199A(d)(2); §224 excludes SSTB tips subject to Notice 2025-69 transition relief. |
| MAGI | Modified Adjusted Gross Income; for §224 = AGI + §911/§931/§933 add-backs. |
| MFS | Married Filing Separately; categorically barred from §224, EITC, AOTC, Saver's Credit, OBBBA Senior Bonus. |
| UEBE | Unreimbursed Employee Business Expenses; deductible federally pre-TCJA; deductible in California in all four supported years subject to 2% AGI floor. |
| Form 4137 | Social Security and Medicare Tax on Unreported Tip Income. |
| Schedule 1-A | IRS form first issued for tax year 2025 capturing OBBBA additional deductions including §224. |
| Schedule CA (540) | California schedule for federal-to-state income and deduction adjustments. Part I, Section C, Line 24z is the §224 addback line per Controlling Report D.3. |
| FICA Tip Credit | IRC §45B; an EMPLOYER credit, never an employee benefit. Platform never surfaces in employee flows. |
| .ttr.json | TipsTax Return file format; canonical signed JSON of the prepared return for export portability. |
| Mail-In Package | Per-tax-year ZIP containing filing instructions, federal return PDFs, California return PDFs, source document copies, return summary one-pager. |
| Portable Export Bundle | Per-tax-year ZIP for upload to third-party e-file destinations; contains form-fillable PDFs, .ttr.json, IRS Free File Fillable Forms pre-fills, CSV line-item export, destination guides, manifest with SHA-256 hashes. |
| WISP | Written Information Security Plan, required by IRS Pub 4557 and FTC Safeguards Rule. |
| Tier 1 Data | SSN, ITIN, EIN, bank account & routing numbers, scanned IDs. Field-level encrypted with per-tenant CMK. |
| Tier 2 Data | W-2 amounts, dependents, addresses, employer names, interview answers. Database-at-rest encrypted with row-level tenant isolation. |
| Ambiguity Record | Structured representation of a Controlling Report AMBIGUITY/ESCALATE flag, including three interpretations and a recommended default. |

---

## 24. Appendix A — Hand-Off Contracts (Phase by Phase)

### 24.1 Phase 1 → Phase 2 Hand-Off

Phase 2 may consume from Phase 1:

- Eight signed rule packs at the paths specified in §4.
- The validator CLI (`rule-pack-validate`) for use in CI.
- The smoke test runner (`rule-pack-test`) for use in CI.
- The citation registry (`/schemas/citation-registry.yaml`) for use by the TaxYearLoader.

Phase 2 MUST implement the TaxYearLoader interface in §12 against Phase 1 rule packs without any other access path to rule pack data.

### 24.2 Phase 1 → Phase 3 Hand-Off

Phase 3 may consume from Phase 1:

- All rule pack content, accessed exclusively via the TaxYearLoader (Phase 2's implementation).
- The Computation Graph node ID convention (§8).
- The forms inventory (§10) for line definitions.
- The ambiguity records (§11) including their recommended-default dispositions.

Phase 3 MUST address every value in every emitted TRO by a Computation Graph node ID. Phase 3 MUST attach a citation to every emitted Line.

### 24.3 Phase 1 → Phase 4 Hand-Off

Phase 4 may consume from Phase 1:

- The tipped-wages section of every rule pack (§9).
- The TTOC list (categories and codes).
- The §224 parameters and decision-tree inputs.
- The Form 4137 worksheet definition.
- The CA UEBE prompt schema.
- The CA §224 addback flag (default-on for 2025/2026 California packs).

Phase 4 MUST NOT hard-code any TTOC code, threshold, or rate in module code; all values come from rule packs.

### 24.4 Phase 1 → Phase 5 Hand-Off

Phase 5 may consume from Phase 1:

- The forms inventory (§10) for form line definitions, official URLs, template paths.
- The mailing address registry (§10.2).

Phase 5 MUST render every line per its definition. Phase 5 MUST verify that every form in a generated package has a verified mailing address (§10.2 verification metadata) within the verification window.

### 24.5 Phase 2 → Phase 3 Hand-Off

Phase 3 may consume from Phase 2:

- The TaxYearLoader (§12) for rule pack access.
- The Audit Log Service (§15) for emitting computation events.
- The internal API conventions (§13) for any service-to-service contracts.

Phase 3 MUST emit audit events for: rule pack load, computation start, computation completion (with TRO content hash), optimization decision recorded.

### 24.6 Phase 2 → Phase 4 Hand-Off

Phase 4 may consume from Phase 2:

- The Interview Orchestrator engine, into which Phase 4 inserts the tipped-wage interview overlay question DAG.
- The Document Service for reading W-2 source data via OCR-confirmed fields only.
- The TaxYearLoader for tipped-wage rule pack content.

### 24.7 Phase 2 → Phase 5 Hand-Off

Phase 5 may consume from Phase 2:

- The Document Service for reading source documents to include in Mail-In Packages.
- The Audit Log Service for emitting export events.

### 24.8 Phase 3 → Phase 5 Hand-Off

Phase 5 may consume from Phase 3:

- The Tax Return Object (§5) as the source for all rendered artifacts.

Phase 5 MUST resolve every form line value from the TRO; no recomputation in the renderer.

### 24.9 Phase 3 → Phase 6 Hand-Off

Phase 6 may consume from Phase 3:

- The TRO and Diff Reporter for rendering the "Why this return?" explanation.
- The optimization scenarios for displaying the comparison.

### 24.10 Phase 4 → Phase 6 Hand-Off

Phase 6 may consume from Phase 4:

- The tipped overlay state for rendering the per-W-2 toggle and TTOC picker.
- The CA UEBE expense entries for rendering the California stack moment (§17.6 honest disclosure binding).

### 24.11 Phase 5 → Phase 6 Hand-Off

Phase 6 may consume from Phase 5:

- The Mail-In Package and Portable Export Bundle generators for rendering the "Mail it" and "E-file it elsewhere" export choice.
- Pre-rendered destination guides for in-app display.

---

## 25. Appendix B — Approval Block

This SPEC.md takes effect upon all listed signatures.

| Role | Name / Signature | Date |
|------|------------------|------|
| CEO | | |
| CTO | | |
| Chief Compliance Officer | | |
| VP Engineering | | |
| CISO | | |
| Tax Director | | |
| VP Product | | |
| General Counsel | | |

---

**— END OF SPEC.md v1.0.0 —**

This document is the source of truth. When it conflicts with anything else, this document wins. When it has a gap, file an amendment. Do not work around it.
