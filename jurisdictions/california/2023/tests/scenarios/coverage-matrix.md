# Coverage Matrix - california/2023

Batch 1 — SC-2023-CA-00001 through SC-2023-CA-00050 — complete.

Runner result: 50 PASS / 0 SKIP / 0 FAIL (2026-06-16).

| Coverage Area | Scenarios | Status |
|---|---|---|
| Filing status — Single | 00001, 00006–00016, 00021, 00023, 00025–00027, 00029, 00031, 00034–00036, 00038–00041, 00044, 00046–00047 | ✓ |
| Filing status — MFJ | 00002, 00013, 00024, 00030, 00032, 00037, 00043, 00045, 00048, 00050 | ✓ |
| Filing status — MFS | 00003, 00038 | ✓ |
| Filing status — HoH | 00004, 00028, 00042 | ✓ |
| Filing status — QSS | 00005 | ✓ |
| Combined federal + CA return | 00001–00005, 00047–00049 | ✓ |
| CA-only return | 00006–00046, 00050 | ✓ |
| Standard deduction — CA | 00001–00005, 00008–00011, 00013–00040, 00042, 00044, 00047, 00050 | ✓ |
| Itemized deduction — CA (UEBE wins) | 00006, 00007, 00012, 00039, 00043, 00045 | ✓ |
| UEBE — uniforms | 00006, 00009, 00012, 00039, 00045 | ✓ |
| UEBE — shoes | 00006, 00009, 00012, 00039 | ✓ |
| UEBE — tools | 00007, 00010, 00012 | ✓ |
| UEBE — union dues | 00006, 00009, 00012, 00013, 00039, 00045 | ✓ |
| UEBE — licensing | 00010, 00012, 00045 | ✓ |
| UEBE — mileage (IRS 65.5¢) | 00011, 00012, 00039 | ✓ |
| UEBE 2% floor applied | 00006–00013, 00039, 00041, 00045 | ✓ |
| UEBE floor consumes gross — net zero | 00041 | ✓ |
| CalEITC — max (below phase-out start) | 00014, 00017, 00022, 00034, 00035, 00042 | ✓ |
| CalEITC — phase-out range | 00015, 00018, 00028, 00044, 00045 | ✓ |
| CalEITC — cliff zero at cap | 00016, 00019, 00025, 00029 | ✓ |
| CalEITC — MFS barred | 00038 | ✓ |
| CalEITC — ITIN eligible | 00044 | ✓ |
| YCTC — max (child under 6, low income) | 00017, 00022, 00042 | ✓ |
| YCTC — phase-out range | 00018 | ✓ |
| YCTC — zero above phase-out end | 00019 | ✓ |
| YCTC — ineligible (child age 6) | 00020 | ✓ |
| FYTC — $1,117 | 00021, 00022, 00046, 00049 | ✓ |
| Renter's Credit — single $60 | 00023, 00046, 00047 | ✓ |
| Renter's Credit — MFJ $120 | 00024 | ✓ |
| Renter's Credit — disallowed (AGI > limit) | 00025 | ✓ |
| SDI 0.9% — below wage base | 00001–00031, 00034–00038, 00042–00049 | ✓ |
| SDI — near wage base cap | 00026 | ✓ |
| SDI — at wage base cap exactly | 00040 | ✓ |
| SDI — excess SDI two W-2s | 00027 | ✓ |
| BHST 1% surcharge — single > $1M | 00033 | ✓ |
| BHST 1% surcharge — MFJ > $1M | 00050 | ✓ |
| 9.3% bracket | 00029, 00031 | ✓ |
| Multi-employer (2 W-2s) | 00002, 00024, 00027, 00032, 00048, 00050 | ✓ |
| Multi-employer (3 W-2s) | 00037 | ✓ |
| Zero CA tax liability | 00034 | ✓ |
| Zero CA withholding | 00035 | ✓ |
| Balance due | 00036 | ✓ |
| Dependents — exempt credit | 00004, 00005, 00017–00020, 00022, 00028, 00030, 00042, 00049 | ✓ |
| Commercial differential | 00047–00049 | ✓ |

## Notes

- All 4 CA years (2023–2026) use identical bracket thresholds per `brackets.yaml`.
- CA HoH uses MFJ standard deduction ($10,726) per `standard-deduction.yaml`.
- SDI 2023: 0.9% rate, $153,164 wage base (capped).
- No CTC/ACTC on CA return — use federal anchors for combined scenarios only.
- §224/§225 addback not applicable in 2023 (OBBBA enacted 2025).
