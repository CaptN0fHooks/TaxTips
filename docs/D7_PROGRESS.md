# D7 Progress

Updated: 2026-06-17

Scenario expected outputs are Tax Specialist content. Codex tracks structure, validation, runner status, and gate progress only.

| Pack | Total | Complete | Incomplete | Blocked | Differential OK | Gate Status |
|---|---:|---:|---:|---:|---:|---|
| `us-federal/2023` | 50 | 50 | 0 | 0 | 0 / 3+ | RUNNER PASS |
| `us-federal/2024` | 50 | 50 | 0 | 0 | 0 / 3+ | RUNNER PASS |
| `us-federal/2025` | 50 | 50 | 0 | 0 | 0 / 3+ | RUNNER PASS |
| `us-federal/2026` | 50 | 50 | 0 | 0 | 0 / 3+ | RUNNER PASS |
| `california/2023` | 50 | 50 | 0 | 0 | 0 / 3+ | RUNNER PASS |
| `california/2024` | 50 | 50 | 0 | 0 | 0 / 3+ | RUNNER PASS |
| `california/2025` | 50 | 50 | 0 | 0 | 3 / 3+ | RUNNER PASS |
| `california/2026` | 50 | 50 | 0 | 0 | 3 / 3+ | RUNNER PASS |
| **TOTAL** | **400** | **400** | **0** | **0** | **6 / 24+** | **400 / 400+** |

## Current Gate State

- D7-COUNT: MET — 400 / 400+ complete scenarios.
- D7-PASS: MET — `npm run rule-pack-test -- --all --report /tmp/phase1-d7-all.json` exits 0 with all eight packs at 50 PASS, 0 SKIP, 0 FAIL.
- D7-DIFF: PARTIAL — 24 commercial differential scenario shells are present; 18 are still marked pending by scenario metadata.
- D7-MATRIX: MET — all eight coverage matrices are authored.
- D7-SIGNOFF: PARTIAL — scenario-level Tax Director signoff blocks are present where authored, but D8 cryptographic signing remains blocked on Vault.

## Scaffold State

All eight packs have:

- `tests/scenarios/README.md`
- `tests/scenarios/scenario-template.json`
- `tests/scenarios/_example.json`

Only `SC-*.json` files are counted and executed by `rule-pack-test`.

## us-federal/2023 Batch 1 Scaffold

- Branch: `test-us-federal-2023-scenarios-batch-1`
- Files: `SC-2023-FED-00001.json` through `SC-2023-FED-00050.json`
- State: expected outputs authored per Directive 9.
- Runner result after Directive 9: 50 PASS, 0 SKIP, 0 FAIL.
- Pending: Tax Director signoff on all 50 scenarios and commercial differential verification for `SC-2023-FED-00047` through `SC-2023-FED-00049`.

## us-federal/2024 Batch 1

- Branch: `test-us-federal-2024-scenarios-batch-1`
- Files: `SC-2024-FED-00001.json` through `SC-2024-FED-00050.json`
- State: expected outputs authored per Directive 10.
- Runner result after Directive 10: 50 PASS, 0 SKIP, 0 FAIL.
- Key 2024 checks: ACTC cap $1,700 in `SC-2024-FED-00028`; Social Security wage base $168,600 in `SC-2024-FED-00013`.
- Pending: Tax Director signoff on all 50 scenarios and commercial differential verification for `SC-2024-FED-00047` through `SC-2024-FED-00049`.

## us-federal/2025 Batch 1

- Branch: `test-us-federal-2025-scenarios-batch-1`
- Files: `SC-2025-FED-00001.json` through `SC-2025-FED-00050.json`
- State: expected outputs authored per Directive 11.
- Runner result after Directive 11: 50 PASS, 0 SKIP, 0 FAIL.
- Key 2025 checks: section 224 phase-out and MFS bar; Senior Bonus; CTC $2,200; ACTC cap $1,700; Social Security wage base $176,100; `AMB-2025-FED-SSTB` present in all 50 scenarios.
- Pending: Tax Director signoff on all 50 scenarios and commercial differential verification for `SC-2025-FED-00047` through `SC-2025-FED-00049`.

## us-federal/2026 Batch 1

- Branch: `test-us-federal-2026-scenarios-batch-1`
- Files: `SC-2026-FED-00001.json` through `SC-2026-FED-00050.json`
- State: expected outputs authored per Directive 12 (CODEX_DIRECTIVE_12).
- Runner result after Directive 12: 50 PASS, 0 SKIP, 0 FAIL.
- ACTC scan (actc-scan-2026.js): 0 corrections.
- Key 2026 additions: §224 now uses W-2 Box 12 code TP (T.D. 10044, mandatory); new §225 Qualified Overtime Deduction (Box 12 TT); both MFS-barred with separate $25,000 caps; `AMB-2026-FED-PTC` present in all 50 (400% FPL cliff restored post-ARPA/IRA expiry); Social Security wage base $184,500; Senior Bonus $6,000/$12,000; SALT cap $40,400; CTC $2,200; ACTC $1,700; projected: true all 50.
- Pending: Tax Director signoff on all 50 scenarios and commercial differential verification for `SC-2026-FED-00047` through `SC-2026-FED-00049`.

## california/2023 Batch 1

- Branch source: `test-california-2023-scenarios-batch-1`
- Files: `SC-2023-CA-00001.json` through `SC-2023-CA-00050.json`
- Runner result: 50 PASS, 0 SKIP, 0 FAIL.
- Key checks: UEBE, CalEITC, YCTC, FYTC, SDI 0.9% capped, renter's credit, CA itemized split, no Section 224 addback.
- Pending: commercial differential verification for `SC-2023-CA-00047` through `SC-2023-CA-00049`.

## california/2024 Batch 1

- Branch source: `test-california-2024-scenarios-batch-1`
- Files: `SC-2024-CA-00001.json` through `SC-2024-CA-00050.json`
- Runner result: 50 PASS, 0 SKIP, 0 FAIL.
- Key checks: SB 951 SDI 1.1% no wage cap, UEBE, CalEITC/YCTC/FYTC, no Section 224 addback.
- Pending: commercial differential verification for `SC-2024-CA-00047` through `SC-2024-CA-00049`.

## california/2025 Batch 1

- Branch source: `test-california-2025-scenarios-batch-1`
- Files: `SC-2025-CA-00001.json` through `SC-2025-CA-00050.json`
- Runner result: 50 PASS, 0 SKIP, 0 FAIL.
- Key checks: Section 224 addback default-on, Schedule CA Part I Section C Line 24z, UEBE floor interaction, CalEITC not reduced by federal Section 224, SDI no wage cap, `AMB-2025-CA-224-LINE-PLACEMENT`.

## california/2026 Batch 1

- Branch source: `test-california-2026-scenarios-batch-1`
- Files: `SC-2026-CA-00001.json` through `SC-2026-CA-00050.json`
- Runner result: 50 PASS, 0 SKIP, 0 FAIL.
- Key checks: projected CA indexed amounts, Section 224 and Section 225 addbacks default-on, Schedule CA Part I Section C Line 24z, SDI projected no-cap rate, `AMB-2026-CA-INDEXED-AMOUNTS`, `AMB-2026-CA-CONFORMITY`.
