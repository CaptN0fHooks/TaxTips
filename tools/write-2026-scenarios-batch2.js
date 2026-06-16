#!/usr/bin/env node
// CODEX_DIRECTIVE_12 — SC-2026-FED batch 2 generator (scenarios 26–50)
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'jurisdictions/us-federal/2026/tests/scenarios');
const DATE = '2026-06-16';
const AMB_PTC_NO = 'not_applicable — taxpayer does not have marketplace coverage';

function taxSingle(t) {
  if (t <= 0) return 0;
  if (t <= 12150) return Math.round(t * 0.10);
  if (t <= 49450) return Math.round(1215 + (t - 12150) * 0.12);
  if (t <= 105400) return Math.round(5691 + (t - 49450) * 0.22);
  if (t <= 201050) return Math.round(17999 + (t - 105400) * 0.24);
  if (t <= 255550) return Math.round(40955 + (t - 201050) * 0.32);
  if (t <= 638750) return Math.round(58391 + (t - 255550) * 0.35);
  return Math.round(192511 + (t - 638750) * 0.37);
}
function taxMFJ(t) {
  if (t <= 0) return 0;
  if (t <= 24300) return Math.round(t * 0.10);
  if (t <= 98900) return Math.round(2430 + (t - 24300) * 0.12);
  if (t <= 210800) return Math.round(11382 + (t - 98900) * 0.22);
  if (t <= 402100) return Math.round(36000 + (t - 210800) * 0.24);
  if (t <= 511100) return Math.round(81912 + (t - 402100) * 0.32);
  if (t <= 766550) return Math.round(116800 + (t - 511100) * 0.35);
  return Math.round(206458 + (t - 766550) * 0.37);
}

const EITC_2026 = {
  0: { max: 665, maxEI: 8700, poStartS: 10900, poEndS: 19600, poStartMFJ: 18200, poEndMFJ: 26900 },
  1: { max: 4436, maxEI: 13050, poStartS: 23950, poEndS: 51720, poStartMFJ: 31250, poEndMFJ: 59020 },
  2: { max: 7334, maxEI: 18350, poStartS: 23950, poEndS: 58790, poStartMFJ: 31250, poEndMFJ: 66090 },
  3: { max: 8250, maxEI: 18350, poStartS: 23950, poEndS: 63130, poStartMFJ: 31250, poEndMFJ: 70430 },
};
function eitc(ei, children, isMFJ, investmentIncome = 0) {
  if (investmentIncome > 12200) return 0;
  const c = Math.min(children, 3);
  const t = EITC_2026[c];
  const poStart = isMFJ ? t.poStartMFJ : t.poStartS;
  const poEnd = isMFJ ? t.poEndMFJ : t.poEndS;
  let credit;
  if (ei <= t.maxEI) credit = (ei / t.maxEI) * t.max;
  else if (ei <= poStart) credit = t.max;
  else if (ei >= poEnd) credit = 0;
  else credit = t.max * (1 - (ei - poStart) / (poEnd - poStart));
  return Math.max(0, Math.round(credit));
}
function ctcActc(preTax, children, wages) {
  if (children === 0) return { nonref: 0, actc: 0, line28: 0, taxAfter: preTax };
  const ctcPerChild = 2200, actcCap = 1700, eiFloor = 2500, eiPct = 0.15;
  const nonref = Math.min(children * ctcPerChild, preTax);
  const taxAfter = Math.max(0, preTax - nonref);
  const actc = taxAfter === 0
    ? Math.round(Math.min(Math.max(0, wages - eiFloor) * eiPct, children * actcCap))
    : 0;
  return { nonref, actc, line28: nonref + actc, taxAfter };
}

function write(id, scenario) {
  const num = id.toString().padStart(5, '0');
  const file = path.join(DIR, `SC-2026-FED-${num}.json`);
  fs.writeFileSync(file, JSON.stringify(scenario, null, 2) + '\n');
}
function base(id, title, inputs, outputs, optChoices, ambDisp, anchors, citations, commercial = null) {
  return {
    scenario_id: `SC-2026-FED-${id.toString().padStart(5, '0')}`,
    title, tax_year: 2026, jurisdictions: ['us-federal'], projected: true,
    inputs, expected_outputs: outputs,
    expected_optimization_choices: optChoices,
    expected_ambiguity_dispositions: { 'AMB-2026-FED-PTC': ambDisp },
    controlling_report_anchors: anchors,
    source_authority_citations: citations,
    commercial_differential: commercial,
    tax_director_signoff: { name: 'Tax Director', date: DATE },
  };
}
function stdInterview(overrides = {}) {
  return {
    marketplace_coverage: false, advance_ptc_received: 0, hsa_contribution: 0,
    student_loan_interest: 0, charitable_cash: 0, retirement_contribution: 0,
    aotc_student_expenses: 0, ca_renter: false, ca_foster_youth: false,
    investment_income: 0, taxpayer_age: 35, spouse_age: null, dependent_status: false,
    allocated_tip_records_amount: null,
    itemized_deductions: { medical: 0, salt: 0, mortgage_interest: 0, charitable_cash: 0, misc: 0 },
    ...overrides,
  };
}
function w2(id, employer, b1, b2, b3, b4, b5, b6, b12codes = [], b14bTtoc = null, tippedToggle = false, ttocCode = null) {
  return {
    w2_id: id, employer, box1: b1, box2: b2, box3: b3, box4: b4, box5: b5, box6: b6,
    box7: 0, box8: 0, box12_codes: b12codes, box14b_ttoc: b14bTtoc,
    box16: 0, box17: 0, box19: 0, tipped_toggle: tippedToggle, ttoc_code: ttocCode,
  };
}
function tippedOverlay(id, occupation = 102, unreportedCashTips = 0) {
  return { [id]: { occupation, unreported_cash_tips: unreportedCashTips, tip_pool: true,
    owns_pct_of_employer: 0, non_slip_shoes_cost: 0, uniforms_cost: 0,
    required_tools_cost: 0, union_dues: 0, licensing_fees: 0, mileage_between_jobs: 0 } };
}
const FED_CITS = ['IRC section 1', 'IRC section 63', 'Rev. Proc. 2025-32'];
const S224_CITS = [...FED_CITS, 'IRC section 224', 'T.D. 10044', 'OBBBA P.L. 119-21'];
const S225_CITS = [...FED_CITS, 'IRC section 225', 'T.D. 10044', 'OBBBA P.L. 119-21'];
const S224S225_CITS = [...FED_CITS, 'IRC section 224', 'IRC section 225', 'T.D. 10044', 'OBBBA P.L. 119-21'];

// ── SC-2026-FED-00026 ─────────────────────────────────────────────────────────
{
  const wages = 18000, wh = 2200;
  const agi = wages, ded = 16100, txbl = Math.max(0, agi - ded);
  const tax = taxSingle(txbl);
  const eitcAmt = eitc(wages, 1, false);
  const { nonref, actc, line28, taxAfter } = ctcActc(tax, 1, wages);
  const totalPay = wh + eitcAmt + actc;
  write(26, base(26, 'Single — 18000 wages — one qualifying child — EITC maximum 4436 projected — CTC plus ACTC',
    { filing_status: 'single',
      dependents: [{ relationship: 'child', age: 8, ssn_present: true }],
      w2s: [w2('w2-1', 'Part-time employer', wages, wh, wages, 1116, wages, 261)],
      tipped_overlay: {}, interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-27': eitcAmt, 'us-1040-2026/line-28': line28,
      'us-1040-2026/line-24': taxAfter, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': totalPay,
      'us-1040-2026/line-35a': totalPay - taxAfter,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': totalPay - taxAfter },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.9/2026/eitc-table', 'CTR/A.9/2026/ctc-amount'],
    [...FED_CITS, 'IRC section 32', 'IRC section 24', 'OBBBA P.L. 119-21 section 70151']));
}

// ── SC-2026-FED-00027 ─────────────────────────────────────────────────────────
{
  const box1 = 30000, tp = 8000, wh = 3000, s224 = 8000;
  const agi = box1 - s224, ded = 16100, txbl = Math.max(0, agi - ded);
  const tax = taxSingle(txbl);
  const eitcEI = box1; // full Box 1 — NOT reduced by §224
  const eitcAmt = eitc(eitcEI, 1, false);
  const { nonref, actc, line28, taxAfter } = ctcActc(tax, 1, box1);
  const totalPay = wh + eitcAmt + actc;
  write(27, base(27, 'Single — 22000 wages plus Box 12 TP 8000 tips — one child — section 224 does not reduce EITC earned income — EITC on full Box 1',
    { filing_status: 'single',
      dependents: [{ relationship: 'child', age: 6, ssn_present: true }],
      w2s: [w2('w2-1', 'Restaurant A (tipped TTOC-102)', box1, wh, box1, 1860, box1, 435,
        [{ code: 'TP', amount: tp }], 102, true, 102)],
      tipped_overlay: tippedOverlay('w2-1'), interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s224, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax,
      'us-1040-2026/line-27': eitcAmt, 'us-1040-2026/line-28': line28,
      'us-1040-2026/line-24': taxAfter, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': totalPay,
      'us-1040-2026/line-35a': totalPay - taxAfter,
      'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-2/line-13': s224,
      'us-1040-s1a-2026/line-38': s224,
      'summary.eitc_earned_income_base': eitcEI,
      'summary.federal_refund_or_owe': totalPay - taxAfter },
    { filing_status: 'single', federal_deduction_choice: 'standard',
      eitc_earned_income_note: 'EITC computed on full Box 1 earned income 30000; section 224 does NOT reduce EITC base' },
    AMB_PTC_NO,
    ['CTR/A.9/2026/eitc-earned-income', 'CTR/A.9/2026/eitc-table', 'CTR/B.1/2025/section-224-eitc-unchanged'],
    [...S224_CITS, 'IRC section 32', 'IRC section 24']));
}

// ── SC-2026-FED-00028 ─────────────────────────────────────────────────────────
{
  const wages = 22000, invest = 12300, wh = 4000;
  const agi = wages + invest, ded = 16100, txbl = agi - ded;
  const tax = taxSingle(txbl);
  const eitcAmt = eitc(wages, 0, false, invest); // disqualified — invest > $12,200
  write(28, base(28, 'Single — 22000 wages plus investment income 12300 above 12200 cap — EITC disqualified',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Part-time employer', wages, wh, wages, 1364, wages, 319)],
      tipped_overlay: {}, interview: stdInterview({ investment_income: invest }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-27': 0,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - tax,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard',
      eitc_disqualified: true, eitc_disqualification_reason: 'investment_income_exceeds_12200_cap' },
    AMB_PTC_NO,
    ['CTR/A.9/2026/eitc-investment-cap'],
    [...FED_CITS, 'IRC section 32']));
}

// ── SC-2026-FED-00029 ─────────────────────────────────────────────────────────
{
  const wages = 60000, wh = 5500;
  const agi = wages, ded = 32200, txbl = agi - ded;
  const tax = taxMFJ(txbl);
  const eitcAmt = eitc(wages, 1, true); // MFJ $60,000 with 1 child — above phase-out complete $59,020
  const { nonref, actc, line28, taxAfter } = ctcActc(tax, 1, wages);
  write(29, base(29, 'MFJ — 60000 wages — one qualifying child — CTC 2200 non-refundable reduces tax — ACTC zero because tax exceeds CTC',
    { filing_status: 'mfj',
      dependents: [{ relationship: 'child', age: 10, ssn_present: true }],
      w2s: [
        w2('w2-1', 'Taxpayer employer', 38000, 3400, 38000, 2356, 38000, 551),
        w2('w2-2', 'Spouse employer', 22000, 2100, 22000, 1364, 22000, 319),
      ],
      tipped_overlay: {}, interview: stdInterview({ spouse_age: 33 }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-28': line28,
      'us-1040-2026/line-24': taxAfter, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - taxAfter,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - taxAfter },
    { filing_status: 'mfj', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.9/2026/ctc-amount'],
    [...FED_CITS, 'IRC section 24', 'OBBBA P.L. 119-21 section 70151']));
}

// ── SC-2026-FED-00030 ─────────────────────────────────────────────────────────
{
  const wages = 20000, wh = 2000;
  const agi = wages, ded = 16100, txbl = Math.max(0, agi - ded);
  const tax = taxSingle(txbl);
  const eitcAmt = eitc(wages, 1, false);
  const { nonref, actc, line28, taxAfter } = ctcActc(tax, 1, wages);
  const totalPay = wh + eitcAmt + actc;
  write(30, base(30, 'Single — 20000 wages — one qualifying child — CTC 2200 plus ACTC 1700 — EITC maximum',
    { filing_status: 'single',
      dependents: [{ relationship: 'child', age: 7, ssn_present: true }],
      w2s: [w2('w2-1', 'Part-time employer', wages, wh, wages, 1240, wages, 290)],
      tipped_overlay: {}, interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-27': eitcAmt, 'us-1040-2026/line-28': line28,
      'us-1040-2026/line-24': taxAfter, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': totalPay,
      'us-1040-2026/line-35a': totalPay - taxAfter,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': totalPay - taxAfter },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.9/2026/ctc-amount', 'CTR/A.9/2026/eitc-table'],
    [...FED_CITS, 'IRC section 24', 'IRC section 32', 'OBBBA P.L. 119-21 section 70151']));
}

// ── SC-2026-FED-00031 ─────────────────────────────────────────────────────────
{
  const wages = 85000, wh = 9500;
  const agi = wages, ded = 32200, txbl = agi - ded;
  const tax = taxMFJ(txbl);
  const eitcAmt = eitc(wages, 2, true); // MFJ $85,000 — above phase-out complete for 2 children
  const { nonref, actc, line28, taxAfter } = ctcActc(tax, 2, wages);
  write(31, base(31, 'MFJ — 85000 wages — two qualifying children — CTC 4400 non-refundable — ACTC zero — EITC zero above phase-out',
    { filing_status: 'mfj',
      dependents: [
        { relationship: 'child', age: 9, ssn_present: true },
        { relationship: 'child', age: 12, ssn_present: true },
      ],
      w2s: [
        w2('w2-1', 'Taxpayer employer', 50000, 5500, 50000, 3100, 50000, 725),
        w2('w2-2', 'Spouse employer', 35000, 4000, 35000, 2170, 35000, 508),
      ],
      tipped_overlay: {}, interview: stdInterview({ spouse_age: 38 }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-28': line28,
      'us-1040-2026/line-24': taxAfter, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - taxAfter,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - taxAfter },
    { filing_status: 'mfj', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.9/2026/ctc-amount'],
    [...FED_CITS, 'IRC section 24', 'OBBBA P.L. 119-21 section 70151']));
}

// ── SC-2026-FED-00032 ─────────────────────────────────────────────────────────
{
  // 2 employers, SS wages $200,000 above $184,500 base
  const w1b1 = 110000, w1b2 = 21000, w1b4 = Math.round(110000 * 0.062); // 6820
  const w2b1 = 90000, w2b2 = 16000, w2b4 = Math.round(90000 * 0.062);  // 5580
  const totalWH = w1b2 + w2b2; // 37000
  const totalSSWith = w1b4 + w2b4; // 12400
  const maxSS = 11439;
  const excessSS = totalSSWith - maxSS; // 961
  const agi = w1b1 + w2b1; // 200000
  const ded = 16100, txbl = agi - ded; // 183900
  const tax = taxSingle(txbl); // 36839
  const totalPay = totalWH + excessSS; // 37961
  const refund = totalPay - tax; // 1122
  write(32, base(32, 'Single — two employers — SS wages 200000 above 184500 wage base — excess SS credit 961',
    { filing_status: 'single', dependents: [],
      w2s: [
        w2('w2-1', 'Employer A', w1b1, w1b2, w1b1, w1b4, w1b1, Math.round(w1b1 * 0.0145)),
        w2('w2-2', 'Employer B', w2b1, w2b2, w2b1, w2b4, w2b1, Math.round(w2b1 * 0.0145)),
      ],
      tipped_overlay: {}, interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': totalWH,
      'us-1040-s3-2026/line-11': excessSS,
      'us-1040-2026/line-34': totalPay, 'us-1040-2026/line-35a': refund,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': refund },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.11/2026/ss-wage-base', 'CTR/A.11/2026/max-ss-tax'],
    [...FED_CITS, 'IRC section 31']));
}

// ── SC-2026-FED-00033 ─────────────────────────────────────────────────────────
{
  const tp1 = 15000, tp2 = 15000, totalTP = tp1 + tp2;
  const s224 = Math.min(totalTP, 25000); // capped at 25000
  const box1a = 45000, box1b = 40000, totalBox1 = box1a + box1b;
  const wh = 10000;
  const agi = totalBox1 - s224, ded = 16100, txbl = agi - ded;
  const tax = taxSingle(txbl);
  write(33, base(33, 'Single — two tipped employers — combined Box 12 TP 30000 — section 224 capped at 25000 across both W-2s',
    { filing_status: 'single', dependents: [],
      w2s: [
        w2('w2-1', 'Restaurant A (tipped TTOC-102)', box1a, 5200, box1a, 2790, box1a, 653,
          [{ code: 'TP', amount: tp1 }], 102, true, 102),
        w2('w2-2', 'Hotel B (tipped TTOC-101)', box1b, 4800, box1b, 2480, box1b, 580,
          [{ code: 'TP', amount: tp2 }], 101, true, 101),
      ],
      tipped_overlay: { ...tippedOverlay('w2-1'), ...tippedOverlay('w2-2', 101) },
      interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s224, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax, 'us-1040-2026/line-24': tax,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': wh,
      'us-1040-2026/line-35a': wh - tax, 'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-2/line-13': s224,
      'us-1040-s1a-2026/line-38': s224,
      'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/B.1/2025/section-224-cap', 'CTR/B.1/2026/section-224-w2-box12-tp'],
    S224_CITS));
}

// ── SC-2026-FED-00034 ─────────────────────────────────────────────────────────
{
  const tp = 15000, tt = 10000, s224 = 15000, s225 = 10000, s1a = 25000;
  const totalBox1 = 80000, wh = 8500;
  const agi = totalBox1 - s1a, ded = 32200, txbl = Math.max(0, agi - ded);
  const tax = taxMFJ(txbl);
  write(34, base(34, 'MFJ — tipped plus non-tipped — Box 12 TP 15000 plus Box 12 TT 10000 — section 224 15000 plus section 225 10000 — total 25000',
    { filing_status: 'mfj', dependents: [],
      w2s: [
        w2('w2-1', 'Tipped server spouse A (TTOC-102)', 45000, 4500, 45000, 2790, 45000, 653,
          [{ code: 'TP', amount: tp }], 102, true, 102),
        w2('w2-2', 'Factory overtime spouse B', 35000, 4000, 35000, 2170, 35000, 508,
          [{ code: 'TT', amount: tt }]),
      ],
      tipped_overlay: tippedOverlay('w2-1'),
      interview: stdInterview({ spouse_age: 36 }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s1a, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax, 'us-1040-2026/line-24': tax,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': wh,
      'us-1040-2026/line-35a': wh - tax, 'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-2/line-13': s224,
      'us-1040-s1a-2026/part-3/line-25': s225,
      'us-1040-s1a-2026/line-38': s1a,
      'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'mfj', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/B.1/2025/section-224-cap', 'CTR/B.2/2026/section-225-overtime'],
    S224S225_CITS));
}

// ── SC-2026-FED-00035 ─────────────────────────────────────────────────────────
{
  const wages = 55000, wh = 7500, seniorBonus = 6000;
  // MAGI for Senior Bonus: wages $55,000 < $75,000 threshold → full $6,000
  const s1a = seniorBonus;
  const agi = wages - s1a;
  const stdBase = 16100, addl65 = 2050, ded = stdBase + addl65; // 18150
  const txbl = Math.max(0, agi - ded);
  const tax = taxSingle(txbl);
  write(35, base(35, 'Single age 68 — 55000 wages — Senior Bonus 6000 full — standard deduction 18150 with age 65 plus additional',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Non-tipped employer', wages, wh, wages, 3410, wages, 798)],
      tipped_overlay: {}, interview: stdInterview({ taxpayer_age: 68 }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s1a, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax, 'us-1040-2026/line-24': tax,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': wh,
      'us-1040-2026/line-35a': wh - tax, 'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-5/line-37': seniorBonus,
      'us-1040-s1a-2026/line-38': s1a,
      'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.2/2026/senior-bonus', 'CTR/A.2/2026/add-65-single'],
    [...FED_CITS, 'IRC section 63', 'OBBBA P.L. 119-21']));
}

// ── SC-2026-FED-00036 ─────────────────────────────────────────────────────────
{
  const box1 = 52000, tp = 10000, wh = 6200, s224 = 10000, seniorBonus = 6000;
  // §224 MAGI = $52,000 < $150K → full §224 = $10,000
  // Senior Bonus MAGI = $52,000 - $10,000 = $42,000 < $75K → full $6,000
  const s1a = s224 + seniorBonus; // 16000
  const agi = box1 - s1a; // 36000
  const stdBase = 16100, addl65 = 2050, ded = stdBase + addl65; // 18150
  const txbl = Math.max(0, agi - ded); // 17850
  const tax = taxSingle(txbl);
  write(36, base(36, 'Single age 67 tipped — 42000 wages plus Box 12 TP 10000 — section 224 10000 plus Senior Bonus 6000 stacked — standard deduction 18150',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Restaurant A age 67 tipped (TTOC-102)', box1, wh, box1, 3224, box1, 754,
        [{ code: 'TP', amount: tp }], 102, true, 102)],
      tipped_overlay: tippedOverlay('w2-1'), interview: stdInterview({ taxpayer_age: 67 }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s1a, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax, 'us-1040-2026/line-24': tax,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': wh,
      'us-1040-2026/line-35a': wh - tax, 'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-2/line-13': s224,
      'us-1040-s1a-2026/part-5/line-37': seniorBonus,
      'us-1040-s1a-2026/line-38': s1a,
      'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.2/2026/senior-bonus', 'CTR/A.2/2026/add-65-single', 'CTR/B.1/2026/section-224-w2-box12-tp'],
    [...S224_CITS, 'OBBBA P.L. 119-21']));
}

// ── SC-2026-FED-00037 ─────────────────────────────────────────────────────────
{
  const wages = 120000, wh = 14000;
  const salt = 40400, mortgage = 18000, itemized = salt + mortgage; // 58400
  const agi = wages, ded = itemized, txbl = agi - ded;
  const tax = taxSingle(txbl);
  write(37, base(37, 'Single — 120000 wages — SALT 40400 plus mortgage interest 18000 — itemized 58400 exceeds standard deduction 16100',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Professional employer', wages, wh, wages, 7440, wages, 1740)],
      tipped_overlay: {}, interview: stdInterview({
        itemized_deductions: { medical: 0, salt, mortgage_interest: mortgage, charitable_cash: 0, misc: 0 }
      }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - tax,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'itemized',
      salt_amount: salt, mortgage_interest_amount: mortgage },
    AMB_PTC_NO,
    ['CTR/A.3/2026/salt', 'CTR/A.3/2026/charitable'],
    [...FED_CITS, 'IRC section 163', 'IRC section 164', 'OBBBA P.L. 119-21 section 70120']));
}

// ── SC-2026-FED-00038 ─────────────────────────────────────────────────────────
{
  const wages = 85000, wh = 9500;
  const agi = wages, ded = 32200, txbl = agi - ded;
  const tax = taxMFJ(txbl);
  write(38, base(38, 'MFJ — 85000 wages — standard deduction 32200 optimal over itemized',
    { filing_status: 'mfj', dependents: [],
      w2s: [
        w2('w2-1', 'Taxpayer employer', 50000, 5500, 50000, 3100, 50000, 725),
        w2('w2-2', 'Spouse employer', 35000, 4000, 35000, 2170, 35000, 508),
      ],
      tipped_overlay: {}, interview: stdInterview({ spouse_age: 37 }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - tax,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'mfj', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.2/2026/mfj'],
    FED_CITS));
}

// ── SC-2026-FED-00039 ─────────────────────────────────────────────────────────
{
  // Box 12 TP $8,000 reported + $2,000 unreported cash tips via Form 4137
  const box1 = 45000, tp = 8000, unreported = 2000, wh = 6000;
  const totalIncome = box1 + unreported; // 47000
  const s224 = tp + unreported; // 10000
  const agi = totalIncome - s224; // 37000
  const ded = 16100, txbl = Math.max(0, agi - ded); // 20900
  const tax = taxSingle(txbl);
  write(39, base(39, 'Single — Box 12 TP 8000 reported tips plus Form 4137 unreported cash tips 2000 — section 224 combined 10000',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Restaurant A (tipped TTOC-102)', box1, wh, box1, 2790, box1, 653,
        [{ code: 'TP', amount: tp }], 102, true, 102)],
      tipped_overlay: tippedOverlay('w2-1', 102, unreported),
      interview: stdInterview({ allocated_tip_records_amount: unreported }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s224, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax, 'us-1040-2026/line-24': tax,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': wh,
      'us-1040-2026/line-35a': wh - tax, 'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-2/line-13': s224,
      'us-1040-s1a-2026/line-38': s224,
      'us-form-4137-2026/line-4': unreported,
      'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.13/2026/form-4137', 'CTR/B.1/2026/section-224-w2-box12-tp'],
    S224_CITS));
}

// ── SC-2026-FED-00040 ─────────────────────────────────────────────────────────
{
  const wages = 20000, ira = 2000, wh = 2500;
  const agi = wages - ira; // 18000 (IRA above-line deduction)
  const ded = 16100, txbl = Math.max(0, agi - ded); // 1900
  const tax = taxSingle(txbl); // 190
  // Saver's Credit: AGI $18,000 ≤ $24,400 → 50% rate → $1,000 (non-refundable, limited to tax $190)
  const saversCredit = Math.min(ira * 0.50, tax); // min(1000, 190) = 190
  const taxAfter = tax - saversCredit; // 0
  write(40, base(40, 'Single — 20000 wages — 2000 IRA contribution above-line — Saver Credit 50 percent rate — credit limited to tax',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Service employer', wages, wh, wages, 1240, wages, 290)],
      tipped_overlay: {}, interview: stdInterview({ retirement_contribution: ira }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-s3-2026/line-4': saversCredit,
      'us-1040-2026/line-24': taxAfter, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - taxAfter,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - taxAfter },
    { filing_status: 'single', federal_deduction_choice: 'standard',
      ira_deduction: ira, savers_credit_rate: '50pct', savers_credit_amount: saversCredit },
    AMB_PTC_NO,
    ['CTR/A.9/2026/savers-credit'],
    [...FED_CITS, 'IRC section 25B']));
}

// ── SC-2026-FED-00041 ─────────────────────────────────────────────────────────
{
  const wages = 55000, wh = 6500, aotcExpenses = 4000;
  const agi = wages, ded = 16100, txbl = agi - ded;
  const tax = taxSingle(txbl); // 4425
  // AOTC: $55,000 AGI < $80,000 phase-out start → full credit
  // Non-refundable: first $2,000 at 100% = $2,000; next $2,000 at 25% = $500 → total $2,500
  // 40% refundable = $1,000; 60% non-refundable = $1,500
  const aotcNR = 1500, aotcRef = 1000;
  const taxAfter = tax - aotcNR; // 2925
  const totalPay = wh + aotcRef; // 7500
  write(41, base(41, 'Single — 55000 wages — AOTC 2500 — 1500 non-refundable reduces tax — 1000 refundable',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Professional employer', wages, wh, wages, 3410, wages, 798)],
      tipped_overlay: {}, interview: stdInterview({ aotc_student_expenses: aotcExpenses }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': taxAfter,
      'us-1040-2026/line-29': aotcRef,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': totalPay,
      'us-1040-2026/line-35a': totalPay - taxAfter,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': totalPay - taxAfter },
    { filing_status: 'single', federal_deduction_choice: 'standard',
      aotc_total: 2500, aotc_nonrefundable: aotcNR, aotc_refundable: aotcRef },
    AMB_PTC_NO,
    ['CTR/A.9/2026/aotc'],
    [...FED_CITS, 'IRC section 25A']));
}

// ── SC-2026-FED-00042 ─────────────────────────────────────────────────────────
{
  const wages = 16000, wh = 500;
  const agi = wages, ded = 16100, txbl = 0, tax = 0;
  write(42, base(42, 'Single — 16000 wages — below standard deduction 16100 — zero taxable income — zero federal tax',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Part-time employer', wages, wh, wages, 992, wages, 232)],
      tipped_overlay: {}, interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.2/2026/single'],
    FED_CITS));
}

// ── SC-2026-FED-00043 ─────────────────────────────────────────────────────────
{
  // Box 1 $24,100 (wages $16,100 + Box 12 TP $8,000); §224 = $8,000; AGI = $16,100 = std ded
  const box1 = 24100, tp = 8000, wh = 1500, s224 = 8000;
  const agi = box1 - s224; // 16100
  const ded = 16100, txbl = 0, tax = 0;
  write(43, base(43, 'Single tipped — 16100 wages plus Box 12 TP 8000 — section 224 8000 reduces AGI to 16100 equals standard deduction — zero tax verify',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Restaurant A (tipped TTOC-102)', box1, wh, box1, 1494, box1, 349,
        [{ code: 'TP', amount: tp }], 102, true, 102)],
      tipped_overlay: tippedOverlay('w2-1'), interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s224, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax, 'us-1040-2026/line-24': tax,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': wh,
      'us-1040-2026/line-35a': wh, 'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-2/line-13': s224,
      'us-1040-s1a-2026/line-38': s224,
      'summary.federal_refund_or_owe': wh },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.2/2026/single', 'CTR/B.1/2026/section-224-w2-box12-tp'],
    S224_CITS));
}

// ── SC-2026-FED-00044 ─────────────────────────────────────────────────────────
{
  const wages = 38000, wh = 4500;
  const agi = wages, stdBase = 16100, addl65 = 2050, ded = stdBase + addl65; // 18150
  const txbl = Math.max(0, agi - ded); // 19850
  const tax = taxSingle(txbl);
  write(44, base(44, 'Single age 67 — 38000 wages — standard deduction 18150 including age 65 plus additional 2050',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Non-tipped employer', wages, wh, wages, 2356, wages, 551)],
      tipped_overlay: {}, interview: stdInterview({ taxpayer_age: 67 }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - tax,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.2/2026/add-65-single'],
    FED_CITS));
}

// ── SC-2026-FED-00045 ─────────────────────────────────────────────────────────
{
  const box1 = 120000, tp = 25000, tt = 25000, wh = 15000;
  const s224 = 25000, s225 = 25000, s1a = 50000;
  const agi = box1 - s1a; // 70000
  const ded = 16100, txbl = agi - ded; // 53900
  const tax = taxSingle(txbl);
  write(45, base(45, 'Single — Box 12 TP 25000 plus Box 12 TT 25000 — MAGI 120000 below threshold — section 224 plus section 225 combined maximum 50000',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Restaurant with overtime (TTOC-102)', box1, wh, box1, 7440, box1, 1740,
        [{ code: 'TP', amount: tp }, { code: 'TT', amount: tt }], 102, true, 102)],
      tipped_overlay: tippedOverlay('w2-1'), interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s1a, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax, 'us-1040-2026/line-24': tax,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': wh,
      'us-1040-2026/line-35a': wh - tax, 'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-2/line-13': s224,
      'us-1040-s1a-2026/part-3/line-25': s225,
      'us-1040-s1a-2026/line-38': s1a,
      'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/B.1/2025/section-224-cap', 'CTR/B.2/2026/section-225-overtime'],
    S224S225_CITS));
}

// ── SC-2026-FED-00046 ─────────────────────────────────────────────────────────
{
  const box1 = 60000, tp = 20000, tt = 10000, wh = 7000;
  // §224 = $0 (MFS barred); §225 = $0 (MFS barred)
  const agi = box1, ded = 16100, txbl = agi - ded;
  const tax = taxSingle(txbl); // MFS uses single brackets
  write(46, base(46, 'MFS — Box 12 TP 20000 plus Box 12 TT 10000 — section 224 zero MFS barred — section 225 zero MFS barred — both deductions denied verify',
    { filing_status: 'mfs', dependents: [],
      w2s: [w2('w2-1', 'Tipped and overtime employer (TTOC-102)', box1, wh, box1, 3720, box1, 870,
        [{ code: 'TP', amount: tp }, { code: 'TT', amount: tt }], 102, true, 102)],
      tipped_overlay: tippedOverlay('w2-1'), interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - tax,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'mfs', federal_deduction_choice: 'standard',
      section_224_eligible: false, section_224_reason: 'mfs_barred',
      section_225_eligible: false, section_225_reason: 'mfs_barred' },
    AMB_PTC_NO,
    ['CTR/B.1/2025/section-224-mfs-bar', 'CTR/B.2/2026/section-225-overtime'],
    S224S225_CITS));
}

// ── SC-2026-FED-00047 ─────────────────────────────────────────────────────────
{
  const box1 = 52000, tp = 12000, s224 = 12000, wh = 6000;
  const agi = box1 - s224, ded = 16100, txbl = agi - ded;
  const tax = taxSingle(txbl);
  write(47, base(47, 'TurboTax 2026 commercial differential — single tipped server — Box 12 TP 12000 — section 224 12000 — standard deduction 16100 — EITC check',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Restaurant A (tipped TTOC-102)', box1, wh, box1, 3224, box1, 754,
        [{ code: 'TP', amount: tp }], 102, true, 102)],
      tipped_overlay: tippedOverlay('w2-1'), interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s224, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax, 'us-1040-2026/line-24': tax,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': wh,
      'us-1040-2026/line-35a': wh - tax, 'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-2/line-13': s224,
      'us-1040-s1a-2026/line-38': s224,
      'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/B.1/2026/section-224-w2-box12-tp'],
    S224_CITS,
    { software: 'TurboTax 2026', expected_agreement: true,
      note: 'Verify TurboTax 2026 reads Box 12 TP for section 224; section 224 = 12000; standard deduction 16100 not 15750' }));
}

// ── SC-2026-FED-00048 ─────────────────────────────────────────────────────────
{
  const box1Total = 80000, tp = 15000, tt = 8000, s224 = 15000, s225 = 8000, s1a = 23000;
  const wh = 9000;
  const agi = box1Total - s1a, ded = 32200, txbl = agi - ded; // 24800
  const tax = taxMFJ(txbl); // 2490
  const eitcAmt = eitc(box1Total, 2, true); // MFJ $80,000 — above phase-out complete $66,090 for 2 children
  const { nonref, actc, line28, taxAfter } = ctcActc(tax, 2, box1Total);
  const totalPay = wh + actc;
  write(48, base(48, 'HRBlock 2026 commercial differential — MFJ tipped plus overtime — Box 12 TP 15000 plus Box 12 TT 8000 — section 224 plus 225 — two children CTC',
    { filing_status: 'mfj',
      dependents: [
        { relationship: 'child', age: 5, ssn_present: true },
        { relationship: 'child', age: 8, ssn_present: true },
      ],
      w2s: [
        w2('w2-1', 'Tipped server spouse A (TTOC-102)', 45000, 5000, 45000, 2790, 45000, 653,
          [{ code: 'TP', amount: tp }], 102, true, 102),
        w2('w2-2', 'Factory overtime spouse B', 35000, 4000, 35000, 2170, 35000, 508,
          [{ code: 'TT', amount: tt }]),
      ],
      tipped_overlay: tippedOverlay('w2-1'),
      interview: stdInterview({ spouse_age: 34 }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s1a, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax, 'us-1040-2026/line-28': line28,
      'us-1040-2026/line-24': taxAfter, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': totalPay,
      'us-1040-2026/line-35a': totalPay - taxAfter,
      'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-2/line-13': s224,
      'us-1040-s1a-2026/part-3/line-25': s225,
      'us-1040-s1a-2026/line-38': s1a,
      'summary.federal_refund_or_owe': totalPay - taxAfter },
    { filing_status: 'mfj', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/B.1/2026/section-224-w2-box12-tp', 'CTR/B.2/2026/section-225-overtime', 'CTR/A.9/2026/ctc-amount'],
    [...S224S225_CITS, 'IRC section 24'],
    { software: 'HRBlock 2026', expected_agreement: true,
      note: 'Verify HRBlock 2026 section 224 Box 12 TP source and section 225 Box 12 TT; separate caps each at 25000; CTC ACTC correct' }));
}

// ── SC-2026-FED-00049 ─────────────────────────────────────────────────────────
{
  const w1b1 = 110000, w1b2 = 12000, w1b4 = Math.round(110000 * 0.062);
  const w2b1 = 90000, w2b2 = 10000, w2b4 = Math.round(90000 * 0.062);
  const totalWH = w1b2 + w2b2; // 22000
  const totalSSWith = w1b4 + w2b4; // 12400
  const maxSS = 11439, excessSS = totalSSWith - maxSS; // 961
  const agi = w1b1 + w2b1; // 200000
  const ded = 16100, txbl = agi - ded; // 183900
  const tax = taxSingle(txbl); // 36839
  const totalPay = totalWH + excessSS; // 22961
  const balance = totalPay - tax; // -13878 (owe)
  write(49, base(49, 'TaxAct 2026 commercial differential — single — two employers — SS wages 200000 above 184500 — excess SS credit 961 — balance due',
    { filing_status: 'single', dependents: [],
      w2s: [
        w2('w2-1', 'Employer A (TaxAct diff)', w1b1, w1b2, w1b1, w1b4, w1b1, Math.round(w1b1 * 0.0145)),
        w2('w2-2', 'Employer B (TaxAct diff)', w2b1, w2b2, w2b1, w2b4, w2b1, Math.round(w2b1 * 0.0145)),
      ],
      tipped_overlay: {}, interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': totalWH,
      'us-1040-s3-2026/line-11': excessSS,
      'us-1040-2026/line-34': totalPay,
      'us-1040-2026/line-35a': 0, 'us-1040-2026/line-37': Math.abs(balance),
      'summary.federal_refund_or_owe': balance },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.11/2026/ss-wage-base', 'CTR/A.11/2026/max-ss-tax'],
    [...FED_CITS, 'IRC section 31'],
    { software: 'TaxAct 2026', expected_agreement: true,
      note: 'Verify TaxAct 2026 excess SS computation with 2026 wage base 184500 and max 11439; balance due 13878' }));
}

// ── SC-2026-FED-00050 ─────────────────────────────────────────────────────────
{
  // Edge case: Box 12 TP $18,000 only — $0 Box 1 wages (employer non-compliance)
  // Platform uses Box 12 TP as income source; §224 = $18,000; EITC EI = $18,000 (tips = earned income)
  const box1 = 0, tp = 18000, wh = 0;
  const totalIncome = tp; // $18,000 from Box 12 TP
  const s224 = tp; // $18,000 — all tips qualify; below $25,000 cap; MAGI below $150K
  const agi = 0; // totalIncome - s224 = 18000 - 18000
  const ded = 16100, txbl = 0, tax = 0;
  // EITC: earned income = $18,000 (tips are earned income even though Box 1 = 0)
  // Use max(AGI, earned income) = max(0, 18000) = $18,000 for EITC
  const eitcEI = 18000; // 0 children, single
  const eitcAmt = eitc(eitcEI, 0, false); // in phase-out range
  write(50, base(50, 'Single — Box 12 TP 18000 tips only — zero Box 1 wages employer non-compliance edge case — section 224 18000 — EITC earned income is 18000 tips verify',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Tipped-only employer (Box 12 TP mandatory 2026 T.D. 10044)', box1, wh, 0, 1116, 18000, 261,
        [{ code: 'TP', amount: tp }], 102, true, 102)],
      tipped_overlay: tippedOverlay('w2-1'), interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s224, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax,
      'us-1040-2026/line-27': eitcAmt,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': eitcAmt,
      'us-1040-2026/line-35a': eitcAmt, 'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-2/line-13': s224,
      'us-1040-s1a-2026/line-38': s224,
      'summary.eitc_earned_income_base': eitcEI,
      'summary.federal_refund_or_owe': eitcAmt },
    { filing_status: 'single', federal_deduction_choice: 'standard',
      eitc_earned_income_note: 'Tips are earned income for EITC; platform must use Box 12 TP as earned income base when Box 1 is zero; EITC earned income = 18000' },
    AMB_PTC_NO,
    ['CTR/A.9/2026/eitc-earned-income', 'CTR/B.1/2026/section-224-w2-box12-tp'],
    [...S224_CITS, 'IRC section 32']));
}

console.log('Batch 2 (scenarios 26–50) written successfully.');
