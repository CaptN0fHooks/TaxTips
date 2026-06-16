# D7 Scenario Coverage - us-federal/2026

Canonical scenario format is JSON.

Minimum gate: 50 complete scenarios, 3 commercial differential scenarios, zero sentinel values, Tax Director sign-off on every scenario.

## Required Coverage

- All base federal coverage: filing statuses, deduction choice, tips/Form 4137, multi-W-2, excess Social Security, EITC, CTC, AOTC, PTC.
- Section 224: single/MFJ phase-out coverage, MFS barred, multi-employer cap, SSTB transition relief, ownership disqualification.
- Section 225 overtime: claimed, combined with Section 224, and barred for MFS.
- W-2 Box 12 TP and Box 14b TTOC reporting cases.
- PTC ambiguity and provisional treatment where marketplace coverage applies.
- Required ambiguity dispositions: `AMB-2025-FED-SSTB`, `AMB-2026-FED-PTC`.
- Commercial differential: at least 3 scenarios verified against TurboTax, H&R Block, or TaxAct.

Specialists author all inputs, expected outputs, CTR anchors, commercial results, and Tax Director sign-off fields.
