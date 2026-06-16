# Coverage Matrix - us-federal/2024

Minimum: 50 complete scenarios, 3 commercial differential scenarios, zero sentinels.

- Filing status: single, mfj, mfs, hoh, qss.
- Standard vs itemized: standard optimal, itemized optimal, borderline crossover.
- Tip income: Box 7 plus Form 4137; Box 8 allocated tips.
- Multi-W-2: both tipped; one tipped plus one non-tipped.
- Excess Social Security tax recovery.
- EITC: 0, 1, 2, 3+ children across qualifying, phase-out, disqualified.
- CTC, AOTC, PTC coverage.
- Commercial differential: 3+ scenarios.

## Batch 1 Authorship Status

Expected outputs and optimization choices are authored per Directive 10. Commercial
verification fields for the three differential scenarios and Tax Director signoff
remain pending.

| Requirement | Authored Coverage | Complete Coverage |
|---|---:|---:|
| Filing status baseline | 5 / 5 | 5 / 5 |
| Standard vs itemized | 3 / 3 | 3 / 3 |
| Tip income W-2 reporting | 2 / 2 | 2 / 2 |
| Multi-W-2 | 2 / 2 | 2 / 2 |
| Excess Social Security tax recovery | 1 / 1 | 1 / 1 |
| EITC coverage | 13 / 13 | 13 / 13 |
| Child Tax Credit | 3 / 3 | 3 / 3 |
| AOTC | 2 / 2 | 2 / 2 |
| Form 4137 allocated tips | 2 / 2 | 2 / 2 |
| PTC | 2 / 2 | 2 / 2 |
| Saver's Credit | 2 / 2 | 2 / 2 |
| Commercial differential | 3 / 3 | 0 / 3 pending product verification |

## Gate Notes

- Runner status: 50 PASS / 0 SKIP / 0 FAIL.
- Tax Director signoff: pending all 50 scenarios.
- Commercial differential verification: pending `SC-2024-FED-00047`, `SC-2024-FED-00048`, and `SC-2024-FED-00049`.
- 2024 key validation: `SC-2024-FED-00028` uses ACTC cap $1,700; `SC-2024-FED-00013` uses the $168,600 Social Security wage base and $10,453 rounded maximum employee Social Security tax.
