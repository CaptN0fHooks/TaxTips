import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';

const dir = path.join(process.cwd(), 'jurisdictions/us-federal/2025/tests/scenarios');
const ctcConfig = yaml.load(fs.readFileSync(path.join(process.cwd(), 'jurisdictions/us-federal/2025/credits/ctc.yaml'), 'utf8'));
const childAgeLimit = ctcConfig.ctc.child_age_limit;
const ctcPerChild = ctcConfig.ctc.amount_per_qualifying_child;
const actcCap = ctcConfig.actc.refundable_cap;
const earnedIncomeFloor = ctcConfig.actc.earned_income_floor;
const earnedIncomePercentage = ctcConfig.actc.earned_income_percentage;
const files = fs.readdirSync(dir).filter((file) => file.startsWith('SC-') && file.endsWith('.json')).sort();
let fixed = 0;

for (const file of files) {
  const filePath = path.join(dir, file);
  const scenario = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const outputs = scenario.expected_outputs;
  const children = (scenario.inputs.dependents ?? []).filter((dependent) => dependent.age < childAgeLimit).length;
  if (children === 0 || !Object.prototype.hasOwnProperty.call(outputs, 'us-1040-2025/line-28')) continue;

  const preCreditTax = outputs['us-1040-2025/line-16'] ?? 0;
  const eitc = outputs['us-1040-2025/line-27'] ?? 0;
  const withheld = outputs['us-1040-2025/line-25a'] ?? 0;
  const excessSS = outputs['us-1040-s3-2025/line-11'] ?? 0;
  const aotcRefundable = outputs['us-1040-2025/line-29'] ?? 0;
  const wages = (scenario.inputs.w2s ?? []).reduce((total, w2) => total + (w2.box1 ?? 0), 0);

  const nonrefCtc = Math.min(children * ctcPerChild, preCreditTax);
  const taxAfterCtc = Math.max(0, preCreditTax - nonrefCtc);
  const actc = taxAfterCtc === 0
    ? Math.round(Math.min(Math.max(0, wages - earnedIncomeFloor) * earnedIncomePercentage, children * actcCap))
    : 0;
  const correctLine28 = nonrefCtc + actc;
  const totalTax = taxAfterCtc;
  const totalPayments = withheld + eitc + actc + excessSS + aotcRefundable;
  const refundOrOwe = totalPayments - totalTax;

  if (Math.abs(correctLine28 - (outputs['us-1040-2025/line-28'] ?? 0)) > 1) {
    console.log(`FIXING ${file}: line-28 ${outputs['us-1040-2025/line-28']} -> ${correctLine28}`);
    outputs['us-1040-2025/line-28'] = correctLine28;
    outputs['us-1040-2025/line-24'] = totalTax;
    outputs['us-1040-2025/line-34'] = totalPayments;
    outputs['us-1040-2025/line-35a'] = refundOrOwe > 0 ? refundOrOwe : 0;
    outputs['us-1040-2025/line-37'] = refundOrOwe < 0 ? Math.abs(refundOrOwe) : 0;
    outputs['summary.federal_refund_or_owe'] = refundOrOwe;
    fs.writeFileSync(filePath, `${JSON.stringify(scenario, null, 2)}\n`);
    fixed += 1;
  }
}

console.log(`ACTC scan complete. Fixed: ${fixed} scenarios.`);
