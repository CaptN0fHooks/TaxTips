# D7 Smoke Scenario Authorship Guide — us-federal/2023

**Pack:** us-federal/2023
**Minimum scenarios required:** 50
**Trigger:** us-federal/2023 validator-green (achieved 2026-06-15)
**Runner:** `npm run rule-pack-test -- --pack us-federal/2023`

---

## Required Coverage Matrix

### 1. Filing Status Coverage (minimum 10 scenarios)
All five filing statuses must appear in the scenario set:
- Single
- Married Filing Jointly (MFJ)
- Married Filing Separately (MFS)
- Head of Household (HoH)
- Qualifying Surviving Spouse (QSS)

### 2. EITC Coverage (minimum 15 scenarios)
Cover all child counts at three income levels each:

| Children | Typical income | Phase-out boundary | Disqualified (investment > $11K) |
|---|---|---|---|
| 0 | ✓ | ✓ | ✓ |
| 1 | ✓ | ✓ | ✓ |
| 2 | ✓ | ✓ | ✓ |
| 3+ | ✓ | ✓ | ✓ |

Phase-out boundary means: AGI $1 below complete phase-out AND $1 above phase-out start.
MFS filer with children: must show $0 EITC (MFS bar).

### 3. CTC/ACTC Coverage (minimum 4 scenarios)
- Qualifying child, full $2,000 credit
- Partial ACTC refund (income just above $2,500 floor)
- Phase-out boundary ($200,000 single / $400,000 MFJ)
- ODC $500 for non-child dependent

### 4. AOTC Coverage (minimum 3 scenarios)
- Full $2,500 credit below phase-out
- Partial credit in phase-out range
- MFS filer: must show $0 AOTC (MFS bar)

### 5. Standard vs Itemized (minimum 3 scenarios)
Scenarios where itemized deductions exceed standard deduction:
- High mortgage interest + SALT at cap ($10,000)
- Charitable contributions pushing itemized above standard
- Medical expenses above 7.5% AGI floor

### 6. Tip Income — Form 4137 (minimum 5 scenarios)
- Tipped worker with all tips reported (no Form 4137 needed)
- Tipped worker with unreported tips → Form 4137
- W-2 Box 8 allocated tips (employer-allocated)
- Tips causing excess SS tax (see item 7)
- Tip income with EITC interaction (tips in earned income base)

### 7. Multi-W-2 / Excess Social Security Recovery (minimum 3 scenarios)
- Two employers, combined wages below SS wage base ($160,200): no excess recovery
- Two employers, combined wages above SS wage base: excess SS on Schedule 3 Line 11
- Tips from one employer + wages from another crossing wage base

### 8. PTC Reconciliation (minimum 2 scenarios)
- Advance PTC received → reconcile on Form 8962, small repayment
- No advance PTC → claim credit on Form 8962

### 9. Saver's Credit (minimum 2 scenarios)
- Income in 50% tier with retirement contribution
- Income above all tiers: $0 credit

---

## Commercial Differential Testing (minimum 3 scenarios)

At least 3 scenarios MUST be verified against TurboTax, H&R Block, or TaxAct.

For each:
1. Enter identical inputs into the commercial product
2. Record the exact refund or balance-due amount
3. If our expected output matches within $1: set `commercial_verification.commercial_match: true`
4. If discrepancy > $1: complete the `reconciliation_note` field — scenario is blocked until Tax Director approves

---

## How to Author a Scenario

Use the template file `scenario-template.yaml` in this directory.

**test_id format:** `fed-2023-NNN-brief-slug`
Example: `fed-2023-001-single-no-tips-standard-ded`
         `fed-2023-022-mfj-eitc-2children-phaseout`

**Input values:** Use actual dollar amounts from the CTR or commercial product verification.
Dollar amounts in scenario files are test data — they are authored here, not in code.

**Expected outputs:** Calculate from the CTR parameters or verify against a commercial product.
Do NOT ask Codex to compute expected outputs — that is a tax calculation.

---

## Scenario File Location

```
jurisdictions/us-federal/2023/tests/scenarios/<test-id>.yaml
```

---

## Running the Smoke Suite

```bash
# Single pack
npm run rule-pack-test -- --pack us-federal/2023

# All packs
npm run rule-pack-test -- --all
```

Target: 100% pass rate. Any failure requires investigation before D8.
