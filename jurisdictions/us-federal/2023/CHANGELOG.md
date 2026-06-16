# Changelog — us-federal/2023

## 1.0.0 — 2026-06-15

**Authors:** Tax Director / Federal Specialist (Mike J.)
**CTR version:** Controlling Tax Research Report, May 2, 2026
**Ambiguity count:** 0 (NONE-APPLICABLE — pre-OBBBA year)
**Citation count:** 64 (CTR/A.2–A.4, A.9, A.11–A.13 / 2023)
**Smoke scenario count:** pending D7 authorship

### Content
- `brackets.yaml` — 7-rate federal brackets for all 5 filing statuses (Single, MFS, MFJ, QSS, HoH); IRC §1(j); Rev. Proc. 2022-38
- `standard-deduction.yaml` — base deductions + age 65+/blind add-ons + dependent floor; IRC §63(c)(f); Rev. Proc. 2022-38
- `itemized.yaml` — SALT cap $10,000, misc 2% suspended (TCJA §67(g)), Pease suspended, mortgage/charitable limits
- `credits/eitc.yaml` — EITC table (max $7,430 for 3+ children), phase-out thresholds, investment cap $11,000; IRC §32
- `credits/ctc.yaml` — CTC $2,000/child, ACTC refundable cap $1,600, ODC $500; IRC §24
- `credits/aotc.yaml` — AOTC max $2,500, 40% refundable, phase-out $80K–$90K single / $160K–$180K MFJ; IRC §25A
- `credits/savers.yaml` — Saver's Credit 50/20/10% tiers; IRC §25B
- `credits/ptc.yaml` — PTC with ARPA/IRA cliff repeal active through 2025; IRC §36B
- `tipped-wages.yaml` — Form 4137 unreported tip mechanics, W-2 Box 8, excess SS recovery Schedule 3 Line 11; no §224 (pre-OBBBA); no TTOC (pre-2026)
- `forms.yaml` — Forms 1040, Schedules 1/2/3/A, Form 4137, Schedules EIC/8812, Forms 8863/8962; no Schedule 1-A (pre-2025)
- `mailing-addresses.yaml` — CA resident federal mailing addresses: with payment (SF CA), without payment (Ogden UT); verified 2026-06-15
- `ambiguities.yaml` — NONE-APPLICABLE; all 5 pre-registered ambiguity IDs confirmed inapplicable to TY2023 federal; Tax Director attested 2026-06-15

### Notes
- Pre-OBBBA year: §224 qualified tip deduction does not exist
- TCJA rates and SALT cap apply
- CA non-conformity to §67(g) suspension: documented in itemized.yaml note
- Signing ceremony: pending Vault Raft migration completion and D7 smoke scenarios
