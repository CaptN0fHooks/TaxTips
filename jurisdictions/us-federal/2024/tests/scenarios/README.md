# D7 Scenario Coverage - us-federal/2024

Canonical scenario format is JSON.

Minimum gate: 50 complete scenarios, 3 commercial differential scenarios, zero sentinel values, Tax Director sign-off on every scenario.

## Required Coverage

- Filing status: single, mfj, mfs, hoh, qss.
- Standard vs itemized: standard optimal, itemized optimal, borderline crossover.
- Tip income: W-2 Box 7 plus Form 4137, W-2 Box 8 allocated tips.
- Multi-W-2: both tipped, one tipped plus one non-tipped.
- Excess Social Security tax recovery.
- EITC: 0, 1, 2, 3+ children across qualifying, phase-out, and disqualified cases.
- CTC: fully non-refundable, ACTC partially refundable, phased out.
- AOTC: qualifying and partial phase-out.
- PTC: qualifying and excess advance credit repayment.
- Commercial differential: at least 3 scenarios verified against TurboTax, H&R Block, or TaxAct.

Specialists author all inputs, expected outputs, CTR anchors, commercial results, and Tax Director sign-off fields.
