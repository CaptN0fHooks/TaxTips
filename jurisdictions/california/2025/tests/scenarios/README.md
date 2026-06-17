# D7 Scenario Coverage - california/2025

Canonical scenario format is JSON.

Minimum gate: 50 complete scenarios, 3 commercial differential scenarios, zero sentinel values, Tax Director sign-off on every scenario.

## Required Coverage

- All base California coverage: filing statuses, deduction choice, UEBE, CalEITC/YCTC, SDI, nonconformity items.
- Section 224 addback: default-on Schedule CA Part I Section C Line 24z, CA AGI higher by addback amount, addback plus UEBE, and line-placement ambiguity disposition.
- Required ambiguity disposition: `AMB-2025-CA-224-LINE-PLACEMENT`.
- Commercial differential: at least 3 scenarios verified against TurboTax, H&R Block, or TaxAct.

Specialists author all inputs, expected outputs, CTR anchors, commercial results, and Tax Director sign-off fields.
