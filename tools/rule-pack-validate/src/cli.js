#!/usr/bin/env node
import { createHash, createPublicKey, verify as verifySignature } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import yaml from 'js-yaml';

const JURISDICTIONS = ['us-federal', 'california'];
const YEARS = ['2023', '2024', '2025', '2026'];
const BASE_FILES = [
  'manifest.yaml',
  'brackets.yaml',
  'standard-deduction.yaml',
  'itemized.yaml',
  'tipped-wages.yaml',
  'forms.yaml',
  'mailing-addresses.yaml',
  'ambiguities.yaml',
  'CHANGELOG.md',
];
const PRE_OBBBA_YEARS = new Set(['2023', '2024']);
const OBBBA_YEARS = new Set(['2025', '2026']);
const REQUIRED_AMBIGUITIES = new Map([
  ['us-federal/2025', ['AMB-2025-FED-SSTB']],
  ['us-federal/2026', ['AMB-2026-FED-PTC']],
  ['california/2025', ['AMB-2025-CA-224-LINE-PLACEMENT']],
  ['california/2026', ['AMB-2026-CA-INDEXED-AMOUNTS', 'AMB-2026-CA-CONFORMITY']],
]);

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  const reportIndex = argv.indexOf('--report');
  return {
    all: args.has('--all'),
    pack: argv.includes('--pack') ? argv[argv.indexOf('--pack') + 1] : null,
    file: argv.includes('--file') ? argv[argv.indexOf('--file') + 1] : null,
    reportPath: reportIndex === -1 ? null : argv[reportIndex + 1],
    skipSignatures: args.has('--skip-signatures'),
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

async function readYaml(filePath) {
  const text = await readFile(filePath, 'utf8');
  return yaml.load(text);
}

function pass(name) {
  return { name, status: 'pass', errors: [] };
}

function fail(name, errors) {
  return { name, status: 'fail', errors };
}

function collectCitations(value, citations = []) {
  if (typeof value === 'string') {
    if (value.startsWith('CTR/')) citations.push(...value.split('|'));
    return citations;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectCitations(item, citations);
    return citations;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) collectCitations(item, citations);
  }
  return citations;
}

function findKey(value, keyName) {
  if (Array.isArray(value)) return value.some((item) => findKey(item, keyName));
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => key === keyName || findKey(item, keyName));
}

async function loadRegistry(root) {
  const registryPath = path.join(root, 'schemas', 'citation-registry.yaml');
  const registry = (await readYaml(registryPath)) ?? {};
  return new Set((registry.citations ?? []).map((entry) => entry.anchor ?? entry.citation ?? entry));
}

async function discoverPacks(root) {
  const packs = [];
  for (const jurisdiction of JURISDICTIONS) {
    for (const year of YEARS) {
      packs.push({ jurisdiction, year, id: `${jurisdiction}/${year}`, dir: path.join(root, 'jurisdictions', jurisdiction, year) });
    }
  }
  return packs;
}

async function checkPackStructure(pack) {
  const errors = [];
  for (const file of BASE_FILES) {
    const filePath = path.join(pack.dir, file);
    if (!(await exists(filePath))) errors.push(`missing ${file}`);
  }
  const creditsDir = path.join(pack.dir, 'credits');
  if (!(await exists(creditsDir))) {
    errors.push('missing credits directory');
  } else if ((await readdir(creditsDir)).filter((file) => file.endsWith('.yaml')).length === 0) {
    errors.push('credits directory has no credit YAML files');
  }
  return errors.length === 0 ? pass('pack_structure') : fail('pack_structure', errors);
}

async function checkSchemaShape(pack) {
  const errors = [];
  const files = await loadPackFiles(pack);
  const manifest = files['manifest.yaml'];
  if (!manifest) {
    errors.push('manifest.yaml is empty or invalid');
  } else {
    const draft = manifest.version === '0.0.0-draft';
    if (manifest.pack_id !== pack.id) errors.push('manifest pack_id does not match path');
    if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(String(manifest.version))) errors.push('manifest version must be SemVer');
    if (draft) errors.push('draft manifest is valid only for file-level Step 0 validation; full-pack validation requires final manifest');
    if (String(manifest.tax_year) !== pack.year) errors.push('manifest tax_year does not match path');
    if (manifest.jurisdiction !== pack.jurisdiction) errors.push('manifest jurisdiction does not match path');
    if (!draft && !/^\d{4}-\d{2}-\d{2}$/.test(String(manifest.effective_date))) errors.push('manifest effective_date must be ISO date');
    if (draft && manifest.effective_date !== 'TBD') errors.push('draft manifest effective_date must be TBD');
    if (!Array.isArray(manifest.files)) errors.push('manifest files list must be an array');
    if (!draft && Array.isArray(manifest.files) && manifest.files.length === 0) errors.push('manifest files list is empty');
  }
  for (const file of BASE_FILES.filter((item) => item.endsWith('.yaml') && item !== 'manifest.yaml')) {
    if (files[file]?.pack !== pack.id) errors.push(`${file} pack does not match path`);
  }
  if (files['forms.yaml'] && !Array.isArray(files['forms.yaml'].forms)) errors.push('forms.yaml missing forms array');
  if (files['mailing-addresses.yaml'] && !Array.isArray(files['mailing-addresses.yaml'].destinations)) {
    errors.push('mailing-addresses.yaml missing destinations array');
  }
  if (files['ambiguities.yaml'] && !Array.isArray(files['ambiguities.yaml'].ambiguities)) {
    errors.push('ambiguities.yaml missing ambiguities array');
  }
  return errors.length === 0 ? pass('schema_validation') : fail('schema_validation', errors);
}

async function loadPackFiles(pack) {
  const files = {};
  for (const file of BASE_FILES.filter((item) => item.endsWith('.yaml'))) {
    const filePath = path.join(pack.dir, file);
    if (await exists(filePath)) files[file] = await readYaml(filePath);
  }
  return files;
}

async function checkCitationRegistry(pack, registry, files) {
  const citations = Object.values(files).flatMap((file) => collectCitations(file));
  const errors = [];
  for (const citation of citations) {
    if (!/^CTR\/[^/]+\/\d{4}(\/[^|]+)?$/.test(citation)) errors.push(`invalid citation format: ${citation}`);
    if (!registry.has(citation)) errors.push(`citation not in registry: ${citation}`);
  }
  return errors.length === 0 ? pass('citation_registry') : fail('citation_registry', errors);
}

function checkYearCoherence(pack, files) {
  const errors = [];
  if (PRE_OBBBA_YEARS.has(pack.year)) {
    for (const file of Object.values(files)) {
      if (findKey(file, 'senior_bonus_obbba')) errors.push('pre-OBBBA pack contains senior_bonus_obbba');
      if (findKey(file, 'section_224')) errors.push('pre-OBBBA pack contains section_224');
      if (findKey(file, 'schedule_1a')) errors.push('pre-OBBBA pack contains schedule_1a');
    }
  }
  if (OBBBA_YEARS.has(pack.year) && files['tipped-wages.yaml'] && !findKey(files['tipped-wages.yaml'], 'section_224')) {
    errors.push('OBBBA-year pack missing section_224 tipped-wage block');
  }
  if (pack.year === '2026' && files['tipped-wages.yaml'] && !findKey(files['tipped-wages.yaml'], 'reporting_2026')) {
    errors.push('tax year 2026 pack missing reporting_2026 tipped-wage block');
  }
  if (pack.jurisdiction === 'california' && OBBBA_YEARS.has(pack.year) && !findKey(files, 'ca_section_224_addback')) {
    errors.push('California OBBBA-year pack missing ca_section_224_addback block');
  }
  return errors.length === 0 ? pass('year_coherence') : fail('year_coherence', errors);
}

async function checkSignatures(pack) {
  const required = pack.jurisdiction === 'california'
    ? [
        ['california-specialist.sig', 'jurisdictions/california/signatures/ca-specialist.pub'],
        ['federal-specialist.sig', 'jurisdictions/us-federal/signatures/federal-specialist.pub'],
        ['tax-director.sig', 'jurisdictions/california/signatures/tax-director.pub'],
      ]
    : [
        ['federal-specialist.sig', 'jurisdictions/us-federal/signatures/federal-specialist.pub'],
        ['tax-director.sig', 'jurisdictions/us-federal/signatures/tax-director.pub'],
      ];
  const errors = [];
  const manifestPath = path.join(pack.dir, 'manifest.yaml');
  const manifestDigest = createHash('sha256').update(await readFile(manifestPath)).digest('hex');
  for (const [signature, publicKeyPath] of required) {
    const signaturePath = path.join(pack.dir, 'signatures', signature);
    if (!(await exists(signaturePath))) {
      errors.push(`missing ${signature}`);
      continue;
    }
    const signatureRecord = await readYaml(signaturePath);
    if (signatureRecord?.algorithm !== 'Ed25519') errors.push(`${signature} algorithm must be Ed25519`);
    if (signatureRecord?.message !== 'sha256(manifest.yaml)') errors.push(`${signature} message must be sha256(manifest.yaml)`);
    if (signatureRecord?.message_sha256 !== manifestDigest) errors.push(`${signature} message_sha256 does not match manifest.yaml`);
    const signatureValue = String(signatureRecord?.signature ?? '');
    const encodedSignature = signatureValue.split(':').at(-1);
    if (!encodedSignature) {
      errors.push(`${signature} missing signature material`);
      continue;
    }
    try {
      const publicKeyBytes = Buffer.from((await readFile(path.join(process.cwd(), publicKeyPath), 'utf8')).trim(), 'base64');
      const publicKey = createPublicKey({
        key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), publicKeyBytes]),
        format: 'der',
        type: 'spki',
      });
      const valid = verifySignature(null, Buffer.from(manifestDigest, 'utf8'), publicKey, Buffer.from(encodedSignature, 'base64'));
      if (!valid) errors.push(`${signature} Ed25519 verification failed`);
    } catch (error) {
      errors.push(`${signature} verification error: ${error.message}`);
    }
  }
  return errors.length === 0 ? pass('signature_files') : fail('signature_files', errors);
}

function skipSignatures() {
  return {
    name: 'signature_files',
    status: 'skipped',
    errors: [],
    signature_check: 'skipped_dev_mode',
    message: '⚠️  DEVELOPMENT MODE: signature check skipped. Vault persistence required before production signing.',
  };
}

async function checkManifestHashes(pack, files) {
  const manifest = files['manifest.yaml'];
  if (!manifest?.files) return fail('manifest_hashes', ['manifest.yaml missing files list']);
  const errors = [];
  for (const entry of manifest.files) {
    if (!entry.path || !entry.sha256) {
      errors.push('manifest file entry missing path or sha256');
      continue;
    }
    const target = path.join(pack.dir, entry.path);
    if (!(await exists(target))) {
      errors.push(`manifest references missing file: ${entry.path}`);
      continue;
    }
    const digest = createHash('sha256').update(await readFile(target)).digest('hex');
    if (digest !== entry.sha256) errors.push(`sha256 mismatch: ${entry.path}`);
  }
  return errors.length === 0 ? pass('manifest_hashes') : fail('manifest_hashes', errors);
}

function checkAmbiguities(pack, files) {
  const ambiguities = files['ambiguities.yaml']?.ambiguities ?? [];
  const errors = [];
  const ids = new Set(ambiguities.map((record) => record.ambiguity_id));
  for (const required of REQUIRED_AMBIGUITIES.get(pack.id) ?? []) {
    if (!ids.has(required)) errors.push(`missing required ambiguity ${required}`);
  }
  for (const record of ambiguities) {
    const aggressive = record.interpretations?.aggressive;
    if (aggressive && aggressive.forbidden !== true) errors.push(`aggressive interpretation not forbidden: ${record.ambiguity_id}`);
  }
  return errors.length === 0 ? pass('ambiguity_completeness') : fail('ambiguity_completeness', errors);
}

function isPassing(check) {
  return check.status === 'pass' || check.status === 'skipped';
}

async function validatePack(root, pack, registry, options) {
  const structure = await checkPackStructure(pack);
  const schema = await checkSchemaShape(pack);
  const files = await loadPackFiles(pack);
  const checks = [
    structure,
    schema,
    await checkCitationRegistry(pack, registry, files),
    checkYearCoherence(pack, files),
    options.skipSignatures ? skipSignatures() : await checkSignatures(pack),
    await checkManifestHashes(pack, files),
    checkAmbiguities(pack, files),
  ];
  return { pack_id: pack.id, status: checks.every(isPassing) ? 'pass' : 'fail', checks };
}

async function validateFile(pack, registry, file) {
  const filePath = path.join(pack.dir, file);
  const existsCheck = await exists(filePath) ? pass('file_exists') : fail('file_exists', [`missing ${file}`]);
  if (existsCheck.status === 'fail') {
    return { pack_id: pack.id, file, status: 'fail', checks: [existsCheck] };
  }
  const data = file.endsWith('.yaml') ? await readYaml(filePath) : null;
  const checks = [existsCheck];
  if (file === 'manifest.yaml') {
    const errors = [];
    const draft = data?.version === '0.0.0-draft';
    if (data?.pack_id !== pack.id) errors.push('manifest pack_id does not match path');
    if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(String(data?.version))) errors.push('manifest version must be SemVer');
    if (String(data?.tax_year) !== pack.year) errors.push('manifest tax_year does not match path');
    if (data?.jurisdiction !== pack.jurisdiction) errors.push('manifest jurisdiction does not match path');
    if (!draft && !/^\d{4}-\d{2}-\d{2}$/.test(String(data?.effective_date))) errors.push('manifest effective_date must be ISO date');
    if (draft && data?.effective_date !== 'TBD') errors.push('draft manifest effective_date must be TBD');
    if (!Array.isArray(data?.files)) errors.push('manifest files list must be an array');
    checks.push(errors.length === 0 ? pass('schema_validation') : fail('schema_validation', errors));
  } else if (file.endsWith('.yaml')) {
    checks.push(data?.pack === pack.id ? pass('schema_validation') : fail('schema_validation', [`${file} pack does not match path`]));
    checks.push(await checkCitationRegistry(pack, registry, { [file]: data }));
    checks.push(checkYearCoherence(pack, { [file]: data }));
  }
  return { pack_id: pack.id, file, status: checks.every(isPassing) ? 'pass' : 'fail', checks };
}

async function runCli(argv = process.argv, root = process.cwd()) {
  const args = parseArgs(argv);
  const registry = await loadRegistry(root);
  const packs = args.all ? await discoverPacks(root) : (await discoverPacks(root)).filter((pack) => pack.id === args.pack);
  if (packs.length === 0) throw new Error('Use --all or --pack <jurisdiction/year>.');
  if (args.skipSignatures) {
    process.stderr.write('⚠️  DEVELOPMENT MODE: signature check skipped. Vault persistence required before production signing.\n');
  }
  const packReports = [];
  for (const pack of packs) {
    packReports.push(args.file ? await validateFile(pack, registry, args.file) : await validatePack(root, pack, registry, args));
  }
  const report = {
    tool: 'rule-pack-validate',
    spec_section: 'SPEC.md §20.4',
    signature_check: args.skipSignatures ? 'skipped_dev_mode' : 'required',
    status: packReports.every((pack) => pack.status === 'pass') ? 'pass' : 'fail',
    packs: packReports,
  };
  const output = `${JSON.stringify(report, null, 2)}\n`;
  if (args.reportPath) await writeFile(args.reportPath, output);
  return { report, output };
}

/* c8 ignore start */
async function main() {
  const { report, output } = await runCli();
  process.stdout.write(output);
  process.exit(report.status === 'pass' ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    const report = { tool: 'rule-pack-validate', status: 'error', error: error.message };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exit(1);
  });
}
/* c8 ignore stop */

export {
  checkAmbiguities,
  checkCitationRegistry,
  checkManifestHashes,
  checkPackStructure,
  checkSchemaShape,
  checkSignatures,
  checkYearCoherence,
  collectCitations,
  discoverPacks,
  exists,
  findKey,
  loadRegistry,
  parseArgs,
  runCli,
  validateFile,
  validatePack,
};
