#!/usr/bin/env node
// CODEX_DIRECTIVE_12 — SC-2026-FED batch 1 generator (scenarios 1–25)
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'jurisdictions/us-federal/2026/tests/scenarios');
const DATE = '2026-06-16';
const AMB_PTC_NO = 'not_applicable — taxpayer does not have marketplace coverage';
const AMB_PTC_QUAL = 'most_defensible — 400% FPL cliff restored per pre-expansion IRC 36B; ARPA/IRA expansion expired after 2025; scenario marked PROVISIONAL; monitor for retroactive Congressional extension';

// ── Tax computation helpers ───────────────────────────────────────────────────
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
function taxHoH(t) {
  if (t <= 0) return 0;
  if (t <= 17350) return Math.round(t * 0.10);
  if (t <= 66150) return Math.round(1735 + (t - 17350) * 0.12);
  if (t <= 105400) return Math.round(7591 + (t - 66150) * 0.22);
  if (t <= 201050) return Math.round(16226 + (t - 105400) * 0.24);
  if (t <= 255550) return Math.round(39182 + (t - 201050) * 0.32);
  if (t <= 638750) return Math.round(56622 + (t - 255550) * 0.35);
  return Math.round(190742 + (t - 638750) * 0.37);
}

// EITC 2026 projected
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

// CTC/ACTC 2026
function ctcActc(preTax, children, wages) {
  if (children === 0) return { nonref: 0, actc: 0, line28: 0 };
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
    title,
    tax_year: 2026,
    jurisdictions: ['us-federal'],
    projected: true,
    inputs,
    expected_outputs: outputs,
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
    marketplace_coverage: false,
    advance_ptc_received: 0,
    hsa_contribution: 0,
    student_loan_interest: 0,
    charitable_cash: 0,
    retirement_contribution: 0,
    aotc_student_expenses: 0,
    ca_renter: false,
    ca_foster_youth: false,
    investment_income: 0,
    taxpayer_age: 35,
    spouse_age: null,
    dependent_status: false,
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
  return {
    [id]: {
      occupation, unreported_cash_tips: unreportedCashTips, tip_pool: true,
      owns_pct_of_employer: 0, non_slip_shoes_cost: 0, uniforms_cost: 0,
      required_tools_cost: 0, union_dues: 0, licensing_fees: 0, mileage_between_jobs: 0,
    },
  };
}

const FED_CITS = ['IRC section 1', 'IRC section 63', 'Rev. Proc. 2025-32'];
const S224_CITS = [...FED_CITS, 'IRC section 224', 'T.D. 10044', 'OBBBA P.L. 119-21'];
const S225_CITS = [...FED_CITS, 'IRC section 225', 'T.D. 10044', 'OBBBA P.L. 119-21'];
const S224S225_CITS = [...FED_CITS, 'IRC section 224', 'IRC section 225', 'T.D. 10044', 'OBBBA P.L. 119-21'];

// ── SC-2026-FED-00001 ─────────────────────────────────────────────────────────
{
  const agi = 45000, ded = 16100, txbl = 28900, tax = taxSingle(txbl);
  const wh = 5500;
  write(1, base(1, 'Single — 45000 W-2 — standard deduction 16100 — no tips — no overtime',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Non-tipped employer', 45000, wh, 45000, 2790, 45000, 653)],
      tipped_overlay: {}, interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - tax,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.2/2026/single', 'CTR/A.4/2026/rate-single'],
    FED_CITS));
}

// ── SC-2026-FED-00002 ─────────────────────────────────────────────────────────
{
  const agi = 75000, ded = 32200, txbl = 42800, tax = taxMFJ(txbl);
  const wh = 8500;
  write(2, base(2, 'MFJ — 75000 combined W-2 — standard deduction 32200 — no tips',
    { filing_status: 'mfj', dependents: [],
      w2s: [
        w2('w2-1', 'Taxpayer employer', 45000, 5200, 45000, 2790, 45000, 653),
        w2('w2-2', 'Spouse employer', 30000, 3300, 30000, 1860, 30000, 435),
      ],
      tipped_overlay: {}, interview: stdInterview({ spouse_age: 35 }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - tax,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'mfj', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.2/2026/mfj', 'CTR/A.4/2026/rate-mfj'],
    FED_CITS));
}

// ── SC-2026-FED-00003 ─────────────────────────────────────────────────────────
{
  const agi = 35000, ded = 16100, txbl = 18900, tax = taxSingle(txbl);
  const wh = 3500;
  write(3, base(3, 'MFS — 35000 W-2 — section 224 barred — section 225 barred',
    { filing_status: 'mfs', dependents: [],
      w2s: [w2('w2-1', 'Non-tipped employer', 35000, wh, 35000, 2170, 35000, 508)],
      tipped_overlay: {}, interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - tax,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'mfs', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.2/2026/mfs', 'CTR/B.1/2025/section-224-mfs-bar'],
    [...FED_CITS, 'IRC section 224', 'IRC section 225']));
}

// ── SC-2026-FED-00004 ─────────────────────────────────────────────────────────
{
  const agi = 52000, ded = 24150, txbl = 27850, tax = taxHoH(txbl);
  const wh = 6200;
  write(4, base(4, 'HoH — 52000 W-2 — standard deduction 24150 — one dependent age 19',
    { filing_status: 'hoh',
      dependents: [{ relationship: 'dependent relative', age: 19, ssn_present: true }],
      w2s: [w2('w2-1', 'Non-tipped employer', 52000, wh, 52000, 3224, 52000, 754)],
      tipped_overlay: {}, interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - tax,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'hoh', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.2/2026/hoh', 'CTR/A.4/2026/rate-hoh'],
    FED_CITS));
}

// ── SC-2026-FED-00005 ─────────────────────────────────────────────────────────
{
  const agi = 68000, ded = 32200, txbl = 35800, tax = taxMFJ(txbl);
  const wh = 7500;
  const { nonref, actc, line28, taxAfter } = ctcActc(tax, 1, 68000);
  write(5, base(5, 'QSS — 68000 W-2 — one qualifying child — CTC 2200',
    { filing_status: 'qss',
      dependents: [{ relationship: 'child', age: 8, ssn_present: true }],
      w2s: [w2('w2-1', 'Non-tipped employer', 68000, wh, 68000, 4216, 68000, 986)],
      tipped_overlay: {}, interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-28': line28,
      'us-1040-2026/line-24': taxAfter, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - taxAfter,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - taxAfter },
    { filing_status: 'qss', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.2/2026/qss', 'CTR/A.9/2026/ctc-amount'],
    [...FED_CITS, 'IRC section 24', 'OBBBA P.L. 119-21 section 70151']));
}

// ── SC-2026-FED-00006 ─────────────────────────────────────────────────────────
{
  const s224 = 12000, box1 = 50000, wh = 5800;
  const agi = box1 - s224, ded = 16100, txbl = agi - ded, tax = taxSingle(txbl);
  write(6, base(6, 'Single — W-2 Box 12 TP 12000 — section 224 deduction 12000 below threshold',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Restaurant A (tipped TTOC-102)', box1, wh, box1, 3100, box1, 725,
        [{ code: 'TP', amount: 12000 }], 102, true, 102)],
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
    ['CTR/A.2/2026/single', 'CTR/B.1/2025/section-224-cap', 'CTR/B.1/2026/section-224-w2-box12-tp'],
    S224_CITS));
}

// ── SC-2026-FED-00007 ─────────────────────────────────────────────────────────
{
  const s224 = 25000, box1 = 60000, wh = 7000;
  const agi = box1 - s224, ded = 16100, txbl = agi - ded, tax = taxSingle(txbl);
  write(7, base(7, 'Single — W-2 Box 12 TP 25000 — section 224 capped at 25000',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Restaurant B (tipped TTOC-102)', box1, wh, box1, 3720, box1, 870,
        [{ code: 'TP', amount: 25000 }], 102, true, 102)],
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
    ['CTR/B.1/2025/section-224-cap', 'CTR/B.1/2026/section-224-w2-box12-tp'],
    S224_CITS));
}

// ── SC-2026-FED-00008 ─────────────────────────────────────────────────────────
{
  const box1 = 165000, tp = 20000, wh = 28000;
  const phaseout = Math.round((165000 - 150000) / 1000 * 100);
  const s224 = Math.min(tp, 25000) - phaseout;
  const agi = box1 - s224, ded = 16100, txbl = agi - ded, tax = taxSingle(txbl);
  write(8, base(8, 'Single — MAGI 165000 — Box 12 TP 20000 — section 224 phase-out 1500 — deduction 18500',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'High-income tipped employee (TTOC-102)', box1, wh, box1, 10230, box1, 2393,
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
    ['CTR/B.1/2025/section-224-phaseout-single', 'CTR/B.1/2026/section-224-w2-box12-tp'],
    S224_CITS));
}

// ── SC-2026-FED-00009 ─────────────────────────────────────────────────────────
{
  const box1 = 275000, tp = 25000, wh = 60000;
  const phaseout = Math.round((275000 - 150000) / 1000 * 100);
  const s224 = Math.max(0, Math.min(tp, 25000) - phaseout);
  const agi = box1 - s224, ded = 16100, txbl = agi - ded, tax = taxSingle(txbl);
  write(9, base(9, 'Single — MAGI 275000 — Box 12 TP 25000 — section 224 phase-out 12500 — deduction 12500',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'High-income tipped employee (TTOC-102)', box1, wh, box1, 17050, box1, 3988,
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
    ['CTR/B.1/2025/section-224-phaseout-single', 'CTR/B.1/2026/section-224-w2-box12-tp'],
    S224_CITS));
}

// ── SC-2026-FED-00010 ─────────────────────────────────────────────────────────
{
  const box1 = 400000, tp = 25000, wh = 110000;
  const phaseout = Math.round((400000 - 150000) / 1000 * 100);
  const s224 = Math.max(0, Math.min(tp, 25000) - phaseout);
  const agi = box1, ded = 16100, txbl = agi - ded, tax = taxSingle(txbl);
  write(10, base(10, 'Single — MAGI 400000 — Box 12 TP 25000 — section 224 fully phased out — deduction 0',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'High-income tipped employee (TTOC-102)', box1, wh, box1, 24800, box1, 5800,
        [{ code: 'TP', amount: tp }], 102, true, 102)],
      tipped_overlay: tippedOverlay('w2-1'), interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - tax,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/B.1/2025/section-224-phaseout-single', 'CTR/B.1/2026/section-224-w2-box12-tp'],
    S224_CITS));
}

// ── SC-2026-FED-00011 ─────────────────────────────────────────────────────────
{
  const magi = 320000, tp = 30000, wh = 55000;
  const cap = Math.min(tp, 25000);
  const phaseout = Math.round((magi - 300000) / 1000 * 100);
  const s224 = Math.max(0, cap - phaseout);
  const agi = magi - s224, ded = 32200, txbl = agi - ded, tax = taxMFJ(txbl);
  write(11, base(11, 'MFJ — MAGI 320000 — combined Box 12 TP 30000 — section 224 capped then phased to 23000',
    { filing_status: 'mfj', dependents: [],
      w2s: [
        w2('w2-1', 'Restaurant group taxpayer (TTOC-102)', 200000, 32000, 200000, 12400, 200000, 2900,
          [{ code: 'TP', amount: 20000 }], 102, true, 102),
        w2('w2-2', 'Hotel spouse (TTOC-101)', 120000, 23000, 120000, 7440, 120000, 1740,
          [{ code: 'TP', amount: 10000 }], 101, true, 101),
      ],
      tipped_overlay: { ...tippedOverlay('w2-1'), ...tippedOverlay('w2-2', 101) },
      interview: stdInterview({ spouse_age: 38 }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s224, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax, 'us-1040-2026/line-24': tax,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': wh,
      'us-1040-2026/line-35a': wh - tax, 'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-2/line-13': s224,
      'us-1040-s1a-2026/line-38': s224,
      'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'mfj', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/B.1/2025/section-224-phaseout-mfj', 'CTR/B.1/2025/section-224-cap', 'CTR/B.1/2026/section-224-w2-box12-tp'],
    S224_CITS));
}

// ── SC-2026-FED-00012 ─────────────────────────────────────────────────────────
{
  const agi = 45000, ded = 16100, txbl = 28900, tax = taxSingle(txbl), wh = 5500;
  write(12, base(12, 'Single — no Box 12 TP present — occupation not on TTOC list — section 224 zero',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Non-qualifying occupation (no TTOC)', 45000, wh, 45000, 2790, 45000, 653)],
      tipped_overlay: {}, interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - tax,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard',
      section_224_eligible: false, section_224_reason: 'occupation_not_on_ttoc_list' },
    AMB_PTC_NO,
    ['CTR/B.2/2025/ttoc-list', 'CTR/B.1/2026/section-224-w2-box12-tp'],
    S224_CITS));
}

// ── SC-2026-FED-00013 ─────────────────────────────────────────────────────────
{
  const box1 = 52000, tt = 8000, wh = 6500;
  const s225 = tt;
  const agi = box1 - s225, ded = 16100, txbl = agi - ded, tax = taxSingle(txbl);
  write(13, base(13, 'Single — W-2 Box 12 TT 8000 overtime — section 225 deduction 8000 — MAGI below threshold',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Manufacturing employer (FLSA overtime)', box1, wh, box1, 3224, box1, 754,
        [{ code: 'TT', amount: tt }])],
      tipped_overlay: {}, interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s225, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax, 'us-1040-2026/line-24': tax,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': wh,
      'us-1040-2026/line-35a': wh - tax, 'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-3/line-25': s225,
      'us-1040-s1a-2026/line-38': s225,
      'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/B.2/2026/section-225-overtime', 'CTR/B.1/2026/section-224-w2-box12-tp'],
    S225_CITS));
}

// ── SC-2026-FED-00014 ─────────────────────────────────────────────────────────
{
  const box1 = 65000, tp = 10000, tt = 8000, wh = 8000;
  const s224 = 10000, s225 = 8000, s1a = s224 + s225;
  const agi = box1 - s1a, ded = 16100, txbl = agi - ded, tax = taxSingle(txbl);
  write(14, base(14, 'Single — Box 12 TP 10000 tips plus Box 12 TT 8000 overtime — section 224 10000 plus section 225 8000 — total Schedule 1-A 18000',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Restaurant with overtime (TTOC-102)', box1, wh, box1, 4030, box1, 943,
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
    ['CTR/B.1/2025/section-224-cap', 'CTR/B.2/2026/section-225-overtime', 'CTR/B.1/2026/section-224-w2-box12-tp'],
    S224S225_CITS));
}

// ── SC-2026-FED-00015 ─────────────────────────────────────────────────────────
{
  const box1 = 95000, tp = 25000, tt = 25000, wh = 13000;
  const s224 = 25000, s225 = 25000, s1a = 50000;
  const agi = box1 - s1a, ded = 16100, txbl = agi - ded, tax = taxSingle(txbl);
  write(15, base(15, 'Single — Box 12 TP 25000 plus Box 12 TT 25000 — both capped — combined Schedule 1-A 50000 maximum',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'High-tip high-overtime restaurant (TTOC-102)', box1, wh, box1, 5890, box1, 1378,
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

// ── SC-2026-FED-00016 ─────────────────────────────────────────────────────────
{
  const box1 = 50000, tt = 15000, wh = 6000;
  const agi = box1, ded = 16100, txbl = agi - ded, tax = taxSingle(txbl);
  write(16, base(16, 'MFS — Box 12 TT 15000 overtime — section 225 barred for MFS — deduction zero',
    { filing_status: 'mfs', dependents: [],
      w2s: [w2('w2-1', 'Manufacturing employer (FLSA overtime)', box1, wh, box1, 3100, box1, 725,
        [{ code: 'TT', amount: tt }])],
      tipped_overlay: {}, interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - tax,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'mfs', federal_deduction_choice: 'standard',
      section_225_eligible: false, section_225_reason: 'mfs_barred' },
    AMB_PTC_NO,
    ['CTR/B.2/2026/section-225-overtime', 'CTR/B.1/2025/section-224-mfs-bar'],
    S225_CITS));
}

// ── SC-2026-FED-00017 ─────────────────────────────────────────────────────────
{
  const box1 = 200000, tt = 25000, wh = 38000;
  const phaseout = Math.round((200000 - 150000) / 1000 * 100);
  const s225 = Math.max(0, Math.min(tt, 25000) - phaseout);
  const agi = box1 - s225, ded = 16100, txbl = agi - ded, tax = taxSingle(txbl);
  write(17, base(17, 'Single — MAGI 200000 — Box 12 TT 25000 overtime — section 225 phase-out 5000 — deduction 20000',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'High-income overtime employee', box1, wh, box1, 12400, box1, 2900,
        [{ code: 'TT', amount: tt }])],
      tipped_overlay: {}, interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s225, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax, 'us-1040-2026/line-24': tax,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': wh,
      'us-1040-2026/line-35a': wh - tax, 'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-3/line-25': s225,
      'us-1040-s1a-2026/line-38': s225,
      'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/B.2/2026/section-225-overtime', 'CTR/B.1/2025/section-224-phaseout-single'],
    S225_CITS));
}

// ── SC-2026-FED-00018 ─────────────────────────────────────────────────────────
{
  const s224 = 15000, box1 = 55000, wh = 6500;
  const agi = box1 - s224, ded = 16100, txbl = agi - ded, tax = taxSingle(txbl);
  write(18, base(18, 'Single — Box 12 TP 15000 — Box 14b TTOC code valid and matches platform selection — section 224 15000',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Bar and grill (TTOC-102 validated)', box1, wh, box1, 3410, box1, 798,
        [{ code: 'TP', amount: 15000 }], 102, true, 102)],
      tipped_overlay: tippedOverlay('w2-1'), interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s224, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax, 'us-1040-2026/line-24': tax,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': wh,
      'us-1040-2026/line-35a': wh - tax, 'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-2/line-13': s224,
      'us-1040-s1a-2026/line-38': s224,
      'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard',
      ttoc_validation: 'TTOC_MATCH_CONFIRMED' },
    AMB_PTC_NO,
    ['CTR/B.1/2026/section-224-box14b-ttoc', 'CTR/B.2/2025/ttoc-list'],
    S224_CITS));
}

// ── SC-2026-FED-00019 ─────────────────────────────────────────────────────────
{
  const s224 = 15000, box1 = 55000, wh = 6500;
  const agi = box1 - s224, ded = 16100, txbl = agi - ded, tax = taxSingle(txbl);
  write(19, base(19, 'Single — Box 12 TP 15000 — Box 14b TTOC mismatch — platform warns but uses Box 12 TP amount — section 224 15000',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Catering employer (TTOC mismatch scenario)', box1, wh, box1, 3410, box1, 798,
        [{ code: 'TP', amount: 15000 }], 201, true, 102)],
      tipped_overlay: tippedOverlay('w2-1'), interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s224, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax, 'us-1040-2026/line-24': tax,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': wh,
      'us-1040-2026/line-35a': wh - tax, 'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-2/line-13': s224,
      'us-1040-s1a-2026/line-38': s224,
      'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard',
      ttoc_validation: 'TTOC_MISMATCH_WARNING',
      ttoc_note: 'Box 14b TTOC code 201 does not match platform-selected occupation 102; platform warns taxpayer; Box 12 TP amount used for section 224' },
    AMB_PTC_NO,
    ['CTR/B.1/2026/section-224-box14b-ttoc', 'CTR/B.2/2025/ttoc-list'],
    S224_CITS));
}

// ── SC-2026-FED-00020 ─────────────────────────────────────────────────────────
{
  const box1 = 41000, tp = 8000, tt = 5000, wh = 3000;
  const s224 = 8000, s225 = 5000, s1a = 13000;
  const agi = box1 - s1a, ded = 16100, txbl = Math.max(0, agi - ded);
  const tax = taxSingle(txbl);
  const eitcEI = box1; // NOT reduced by §224/§225
  const eitcAmt = eitc(eitcEI, 0, false, 0); // 0 children — above phase-out at $41,000
  write(20, base(20, 'Single — 28000 base wages plus Box 12 TP 8000 tips plus Box 12 TT 5000 overtime — section 224 plus 225 do not reduce EITC earned income — EITC zero above phase-out',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Restaurant with overtime (TTOC-102)', box1, wh, box1, 2542, box1, 595,
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
      'summary.eitc_earned_income_base': eitcEI,
      'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard',
      eitc_earned_income_note: 'EITC computed on full Box 1 earned income 41000; section 224 and section 225 do NOT reduce EITC base per OBBBA section 70201' },
    AMB_PTC_NO,
    ['CTR/A.9/2026/eitc-earned-income', 'CTR/B.1/2025/section-224-eitc-unchanged'],
    S224S225_CITS));
}

// ── SC-2026-FED-00021 ─────────────────────────────────────────────────────────
{
  const box1 = 24000, tp = 6000, wh = 2500;
  const s224 = 6000;
  const agi = box1 - s224, ded = 16100, txbl = Math.max(0, agi - ded);
  const tax = taxSingle(txbl);
  const eitcEI = box1; // NOT reduced by §224
  const eitcAmt = eitc(eitcEI, 1, false, 0);
  const { nonref, actc, line28, taxAfter } = ctcActc(tax, 1, box1);
  const totalPay = wh + eitcAmt + actc;
  write(21, base(21, 'Single — 18000 wages plus Box 12 TP 6000 tips — one qualifying child — EITC base is full Box 1 not reduced by section 224 — verify',
    { filing_status: 'single',
      dependents: [{ relationship: 'child', age: 8, ssn_present: true }],
      w2s: [w2('w2-1', 'Restaurant A (tipped TTOC-102)', box1, wh, box1, 1488, box1, 348,
        [{ code: 'TP', amount: tp }], 102, true, 102)],
      tipped_overlay: tippedOverlay('w2-1'), interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-13b': s224, 'us-1040-2026/line-15': txbl,
      'us-1040-2026/line-16': tax,
      'us-1040-2026/line-27': eitcAmt,
      'us-1040-2026/line-28': line28,
      'us-1040-2026/line-24': taxAfter, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': totalPay,
      'us-1040-2026/line-35a': totalPay - taxAfter,
      'us-1040-2026/line-37': 0,
      'us-1040-s1a-2026/part-2/line-13': s224,
      'us-1040-s1a-2026/line-38': s224,
      'summary.eitc_earned_income_base': eitcEI,
      'summary.federal_refund_or_owe': totalPay - taxAfter },
    { filing_status: 'single', federal_deduction_choice: 'standard',
      eitc_earned_income_note: 'EITC computed on full Box 1 earned income 24000; section 224 does NOT reduce EITC base' },
    AMB_PTC_NO,
    ['CTR/A.9/2026/eitc-earned-income', 'CTR/A.9/2026/eitc-table', 'CTR/A.9/2026/ctc-amount'],
    [...S224_CITS, 'IRC section 32', 'IRC section 24']));
}

// ── SC-2026-FED-00022 ─────────────────────────────────────────────────────────
{
  const agi = 28000, ded = 16100, txbl = 11900, tax = taxSingle(txbl), wh = 3500;
  write(22, base(22, 'Single — 28000 wages — marketplace coverage — income 200 percent FPL — PTC qualifying below 400 percent cliff — PROVISIONAL',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Service employer', agi, wh, agi, 1736, agi, 406)],
      tipped_overlay: {}, interview: stdInterview({ marketplace_coverage: true }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - tax,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': wh - tax,
      'summary.ptc_status': 'PROVISIONAL — PTC potentially available below 400% FPL cliff; final amount subject to Form 8962 computation' },
    { filing_status: 'single', federal_deduction_choice: 'standard',
      ptc_disposition: 'PROVISIONAL — most_defensible — 400% FPL cliff applies in 2026' },
    AMB_PTC_QUAL,
    ['CTR/A.9/2026/ptc'],
    [...FED_CITS, 'IRC section 36B', 'ARPA section 9661']));
}

// ── SC-2026-FED-00023 ─────────────────────────────────────────────────────────
{
  const agi = 52000, ded = 16100, txbl = 35900, tax = taxSingle(txbl), wh = 6200;
  write(23, base(23, 'Single — 52000 wages — marketplace — income approximately 410 percent FPL — PTC disqualified by 400 percent cliff restoration',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Mid-income employer', agi, wh, agi, 3224, agi, 754)],
      tipped_overlay: {}, interview: stdInterview({ marketplace_coverage: true }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': wh, 'us-1040-2026/line-35a': wh - tax,
      'us-1040-2026/line-37': 0,
      'summary.ptc_amount': 0,
      'summary.ptc_status': 'DISQUALIFIED — income exceeds 400% FPL cliff under pre-expansion IRC 36B',
      'summary.federal_refund_or_owe': wh - tax },
    { filing_status: 'single', federal_deduction_choice: 'standard',
      ptc_disposition: 'PTC denied — income approximately 410% FPL exceeds restored 400% cliff' },
    AMB_PTC_QUAL,
    ['CTR/A.9/2026/ptc'],
    [...FED_CITS, 'IRC section 36B', 'ARPA section 9661']));
}

// ── SC-2026-FED-00024 ─────────────────────────────────────────────────────────
{
  const wages = 52000, advPtc = 3600, wh = 6200;
  const agi = wages, ded = 16100, txbl = agi - ded, incomeTax = taxSingle(txbl);
  const totalTax = incomeTax + advPtc; // full repayment of advance PTC
  const refund = wh - totalTax; // negative = owe
  write(24, base(24, 'Single — advance PTC 3600 received — income crosses 400 percent FPL — full advance PTC repayment required — Form 8962 clawback',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Mid-income employer', wages, wh, wages, 3224, wages, 754)],
      tipped_overlay: {}, interview: stdInterview({ marketplace_coverage: true, advance_ptc_received: advPtc }) },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': incomeTax,
      'us-1040-2026/line-24': totalTax,
      'us-1040-2026/line-25a': wh, 'us-1040-2026/line-34': wh,
      'us-1040-2026/line-35a': 0, 'us-1040-2026/line-37': Math.abs(refund),
      'us-form-8962-2026/line-29': advPtc,
      'summary.ptc_repayment': advPtc,
      'summary.ptc_status': 'FULL REPAYMENT — income exceeds 400% FPL cliff; advance PTC 3600 fully repaid per Form 8962',
      'summary.federal_refund_or_owe': refund },
    { filing_status: 'single', federal_deduction_choice: 'standard',
      ptc_disposition: 'Full advance PTC repayment required — 400% FPL cliff restored' },
    AMB_PTC_QUAL,
    ['CTR/A.9/2026/ptc'],
    [...FED_CITS, 'IRC section 36B', 'ARPA section 9661']));
}

// ── SC-2026-FED-00025 ─────────────────────────────────────────────────────────
{
  const wages = 8000, wh = 0;
  const agi = wages, ded = 16100, txbl = 0, tax = 0;
  const eitcAmt = eitc(wages, 0, false, 0);
  const totalPay = wh + eitcAmt;
  write(25, base(25, 'Single — 8000 wages — zero children — EITC projected 2026',
    { filing_status: 'single', dependents: [],
      w2s: [w2('w2-1', 'Part-time employer', wages, wh, wages, 496, wages, 116)],
      tipped_overlay: {}, interview: stdInterview() },
    { 'us-1040-2026/line-11': agi, 'us-1040-2026/line-12': ded,
      'us-1040-2026/line-15': txbl, 'us-1040-2026/line-16': tax,
      'us-1040-2026/line-27': eitcAmt,
      'us-1040-2026/line-24': tax, 'us-1040-2026/line-25a': wh,
      'us-1040-2026/line-34': totalPay, 'us-1040-2026/line-35a': totalPay,
      'us-1040-2026/line-37': 0, 'summary.federal_refund_or_owe': totalPay },
    { filing_status: 'single', federal_deduction_choice: 'standard' },
    AMB_PTC_NO,
    ['CTR/A.9/2026/eitc-table'],
    [...FED_CITS, 'IRC section 32']));
}

console.log('Batch 1 (scenarios 1–25) written successfully.');
