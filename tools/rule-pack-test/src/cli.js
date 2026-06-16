#!/usr/bin/env node
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import yaml from 'js-yaml';

const JURISDICTIONS = ['us-federal', 'california'];
const YEARS = ['2023', '2024', '2025', '2026'];

function parseArgs(argv) {
  const reportIndex = argv.indexOf('--report');
  return {
    all: argv.includes('--all'),
    pack: argv.includes('--pack') ? argv[argv.indexOf('--pack') + 1] : null,
    scenario: argv.includes('--scenario') ? argv[argv.indexOf('--scenario') + 1] : null,
    reportPath: reportIndex === -1 ? null : argv[reportIndex + 1],
  };
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

async function scenarioFiles(root, packId, scenarioId) {
  const dir = path.join(root, 'jurisdictions', ...packId.split('/'), 'tests', 'scenarios');
  try {
    return (await readdir(dir))
      .filter((file) => file.startsWith('SC-') && file.endsWith('.json'))
      .filter((file) => !scenarioId || file === `${scenarioId}.json`)
      .sort()
      .map((file) => path.join(dir, file));
  } catch {
    return [];
  }
}

async function readScenario(filePath) {
  const text = await readFile(filePath, 'utf8');
  return filePath.endsWith('.json') ? JSON.parse(text) : yaml.load(text);
}

async function loadRegistry(root) {
  const registryPath = path.join(root, 'schemas', 'citation-registry.yaml');
  if (!(await exists(registryPath))) return new Set();
  const registry = yaml.load(await readFile(registryPath, 'utf8')) ?? {};
  return new Set((registry.citations ?? []).map((entry) => entry.anchor ?? entry.citation ?? entry));
}

function hasSentinel(value) {
  if (value === 'SPECIALIST_MUST_AUTHOR') return true;
  if (Array.isArray(value)) return value.some(hasSentinel);
  if (value && typeof value === 'object') return Object.values(value).some(hasSentinel);
  return false;
}

function validateScenarioShape(scenario, packId, filePath, registry) {
  const errors = [];
  const required = [
    'scenario_id',
    'title',
    'tax_year',
    'jurisdictions',
    'inputs',
    'expected_outputs',
    'expected_optimization_choices',
    'controlling_report_anchors',
    'source_authority_citations',
    'tax_director_signoff',
  ];
  for (const key of required) {
    if (!(key in scenario)) errors.push(`missing required field: ${key}`);
  }
  if (scenario.scenario_id && path.basename(filePath) !== `${scenario.scenario_id}.json`) {
    errors.push('scenario_id must match file name');
  }
  const [jurisdiction, year] = packId.split('/');
  const expectedCode = jurisdiction === 'us-federal' ? 'FED' : 'CA';
  if (scenario.scenario_id && !new RegExp(`^SC-${year}-${expectedCode}-\\d{5}$`).test(scenario.scenario_id)) {
    errors.push(`scenario_id must match SC-${year}-${expectedCode}-<5 digits>`);
  }
  if (String(scenario.tax_year) !== year) errors.push('tax_year does not match pack path');
  if (!Array.isArray(scenario.jurisdictions)) errors.push('jurisdictions must be an array');
  if (!Array.isArray(scenario.controlling_report_anchors)) {
    errors.push('controlling_report_anchors must be an array');
  } else {
    for (const anchor of scenario.controlling_report_anchors) {
      if (!registry.has(anchor)) errors.push(`unresolved CTR anchor: ${anchor}`);
    }
  }
  return errors;
}

function evaluateScenario(scenario, packId, filePath, registry) {
  const errors = validateScenarioShape(scenario, packId, filePath, registry);
  if (errors.length > 0) return { status: 'fail', errors };
  if (hasSentinel(scenario.expected_outputs) || hasSentinel(scenario.expected_optimization_choices) || hasSentinel(scenario.commercial_differential)) {
    return { status: 'skip', errors: [], reason: 'scenario contains SPECIALIST_MUST_AUTHOR sentinel' };
  }
  if (!scenario.tax_director_signoff?.name || !scenario.tax_director_signoff?.date) {
    return { status: 'fail', errors: ['tax_director_signoff.name and date must be populated'] };
  }
  if (
    scenario.tax_director_signoff.name === 'SPECIALIST_MUST_AUTHOR'
    || scenario.tax_director_signoff.date === 'SPECIALIST_MUST_AUTHOR'
  ) {
    return { status: 'fail', errors: ['tax_director_signoff.name and date must be Specialist-authored before execution'] };
  }
  return { status: 'pass', errors: [] };
}

async function runPack(root, packId, scenarioId, registry) {
  const files = await scenarioFiles(root, packId, scenarioId);
  const results = [];
  for (const file of files) {
    const scenario = await readScenario(file);
    results.push({ file: path.relative(root, file), scenario_id: scenario.scenario_id, ...evaluateScenario(scenario, packId, file, registry) });
  }
  const errors = files.length === 0 ? ['no smoke scenarios authored for pack'] : [];
  return {
    pack_id: packId,
    status: errors.length === 0 && results.every((result) => result.status === 'pass' || result.status === 'skip') ? 'pass' : 'fail',
    errors,
    counts: {
      total: results.length,
      pass: results.filter((result) => result.status === 'pass').length,
      fail: results.filter((result) => result.status === 'fail').length,
      skip: results.filter((result) => result.status === 'skip').length,
    },
    scenarios: results,
  };
}

async function main() {
  const root = process.cwd();
  const args = parseArgs(process.argv);
  const packIds = args.all
    ? JURISDICTIONS.flatMap((jurisdiction) => YEARS.map((year) => `${jurisdiction}/${year}`))
    : [args.pack].filter(Boolean);
  if (packIds.length === 0) throw new Error('Use --all or --pack <jurisdiction/year>.');
  const registry = await loadRegistry(root);
  const packs = [];
  for (const packId of packIds) packs.push(await runPack(root, packId, args.scenario, registry));
  const report = {
    tool: 'rule-pack-test',
    spec_section: 'SPEC.md §19.1',
    status: packs.every((pack) => pack.status === 'pass') ? 'pass' : 'fail',
    packs,
  };
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (args.reportPath) await writeFile(args.reportPath, output);
  process.stdout.write(output);
  process.exit(report.status === 'pass' ? 0 : 1);
}

main().catch((error) => {
  const report = { tool: 'rule-pack-test', status: 'error', error: error.message };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(1);
});
