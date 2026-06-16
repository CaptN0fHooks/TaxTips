# D7 Progress

Updated: 2026-06-16

Scenario expected outputs are Tax Specialist content. Codex tracks structure, validation, runner status, and gate progress only.

| Pack | Total | Complete | Incomplete | Blocked | Differential OK | Gate Status |
|---|---:|---:|---:|---:|---:|---|
| `us-federal/2023` | 50 | 50 | 0 | 0 | 0 / 3+ | PENDING TAX DIRECTOR SIGN-OFF |
| `us-federal/2024` | 50 | 50 | 0 | 0 | 0 / 3+ | PENDING TAX DIRECTOR SIGN-OFF |
| `us-federal/2025` | 50 | 50 | 0 | 0 | 0 / 3+ | PENDING TAX DIRECTOR SIGN-OFF |
| `us-federal/2026` | 50 | 50 | 0 | 0 | 3 / 3+ | PENDING TAX DIRECTOR SIGN-OFF |
| `california/2023` | 0 | 0 | 0 | 0 | 0 / 3+ | NOT MET |
| `california/2024` | 0 | 0 | 0 | 0 | 0 / 3+ | NOT MET |
| `california/2025` | 0 | 0 | 0 | 0 | 0 / 3+ | NOT MET |
| `california/2026` | 0 | 0 | 0 | 0 | 0 / 3+ | NOT MET |
| **TOTAL** | **200** | **200** | **0** | **0** | **3 / 24+** | **200 / 400+** |

## Current Gate State

- D7-COUNT: PARTIAL — 200 / 400+ complete scenarios.
- D7-PASS: PARTIAL — `us-federal/2023`, `us-federal/2024`, `us-federal/2025`, and `us-federal/2026` pass; remaining 4 packs have no authored scenarios.
- D7-DIFF: PARTIAL — `us-federal/2026` has 3 commercial differential scenarios (pending verification); others pending.
- D7-MATRIX: PARTIAL — `us-federal/2023`, `us-federal/2024`, `us-federal/2025`, and `us-federal/2026` coverage matrices authored.
- D7-SIGNOFF: NOT MET — Tax Director signoff pending for all four federal packs.

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
