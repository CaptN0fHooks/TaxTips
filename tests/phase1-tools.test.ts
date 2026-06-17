import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  evaluateScenario,
  hasSentinel,
  runCli as runSmokeCli,
  validateScenarioShape,
} from '../tools/rule-pack-test/src/cli.js';
import {
  collectCitations,
  checkAmbiguities,
  checkCitationRegistry,
  checkManifestHashes,
  checkSchemaShape,
  checkSignatures,
  checkYearCoherence,
  findKey,
  runCli as runValidateCli,
  validateFile,
} from '../tools/rule-pack-validate/src/cli.js';

describe('rule-pack-test CLI module', () => {
  it('passes the full Phase 1 scenario corpus', async () => {
    const { report } = await runSmokeCli(['node', 'cli', '--all']);
    expect(report.status).toBe('pass');
    expect(report.packs).toHaveLength(8);
    expect(report.packs.reduce((total, pack) => total + pack.counts.pass, 0)).toBe(400);
  });

  it('validates one scenario pack and exposes pending commercial verification metadata', async () => {
    const { report } = await runSmokeCli(['node', 'cli', '--pack', 'california/2023']);
    expect(report.status).toBe('pass');
    expect(report.packs[0].counts).toMatchObject({ total: 50, pass: 50, fail: 0, skip: 0 });
    expect(report.packs[0].scenarios.filter((scenario) => scenario.pending.length > 0)).toHaveLength(3);
  });

  it('supports scenario filters and report writing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'taxtips-runner-'));
    const reportPath = join(dir, 'report.json');
    const { report } = await runSmokeCli([
      'node',
      'cli',
      '--pack',
      'us-federal/2026',
      '--scenario',
      'SC-2026-FED-00001',
      '--report',
      reportPath,
    ]);
    expect(report.packs[0].counts.total).toBe(1);
    expect(JSON.parse(await readFile(reportPath, 'utf8')).status).toBe('pass');
  });

  it('detects sentinels and scenario shape errors', () => {
    expect(hasSentinel({ nested: ['SPECIALIST_MUST_AUTHOR'] })).toBe(true);
    const errors = validateScenarioShape({ scenario_id: 'BAD' }, 'us-federal/2025', '/tmp/OTHER.json', new Set());
    expect(errors).toContain('missing required field: title');
    expect(errors).toContain('scenario_id must match file name');
    expect(errors).toContain('tax_year does not match pack path');
  });

  it('marks missing signoff and commercial verification as pending', () => {
    const result = evaluateScenario(
      {
        scenario_id: 'SC-2025-FED-99999',
        title: 'Synthetic pending metadata check',
        tax_year: 2025,
        jurisdictions: ['us-federal'],
        inputs: {},
        expected_outputs: {},
        expected_optimization_choices: {},
        controlling_report_anchors: [],
        source_authority_citations: [],
        tax_director_signoff: {},
        commercial_differential: {},
      },
      'us-federal/2025',
      '/tmp/SC-2025-FED-99999.json',
      new Set(),
    );
    expect(result.status).toBe('pass');
    expect(result.pending).toEqual(['tax_director_signoff', 'commercial_differential_verification']);
  });

  it('skips valid scenarios that still contain authoring sentinels', () => {
    const result = evaluateScenario(
      {
        scenario_id: 'SC-2025-FED-99998',
        title: 'Synthetic sentinel check',
        tax_year: 2025,
        jurisdictions: ['us-federal'],
        inputs: {},
        expected_outputs: { node: 'SPECIALIST_MUST_AUTHOR' },
        expected_optimization_choices: {},
        controlling_report_anchors: [],
        source_authority_citations: [],
        tax_director_signoff: { name: 'Tax Director', date: '2026-06-17' },
      },
      'us-federal/2025',
      '/tmp/SC-2025-FED-99998.json',
      new Set(),
    );
    expect(result.status).toBe('skip');
  });

  it('fails empty packs and rejects missing CLI scope', async () => {
    const { report } = await runSmokeCli(['node', 'cli', '--pack', 'missing/2099']);
    expect(report.status).toBe('fail');
    expect(report.packs[0].errors).toEqual(['no smoke scenarios authored for pack']);
    await expect(runSmokeCli(['node', 'cli'])).rejects.toThrow('Use --all or --pack <jurisdiction/year>.');
  });
});

describe('rule-pack-validate CLI module', () => {
  it('passes all seven validation checks for all eight packs', async () => {
    const { report } = await runValidateCli(['node', 'cli', '--all']);
    expect(report.status).toBe('pass');
    expect(report.packs).toHaveLength(8);
    expect(report.packs.every((pack) => pack.checks.length === 7)).toBe(true);
  });

  it('supports file-level and skip-signature validation modes', async () => {
    const { report } = await runValidateCli([
      'node',
      'cli',
      '--pack',
      'us-federal/2026',
      '--file',
      'manifest.yaml',
      '--skip-signatures',
    ]);
    expect(report.status).toBe('pass');
    expect(report.signature_check).toBe('skipped_dev_mode');
  });

  it('supports non-manifest file-level validation and report writing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'taxtips-validator-'));
    const reportPath = join(dir, 'report.json');
    const { report } = await runValidateCli([
      'node',
      'cli',
      '--pack',
      'california/2024',
      '--file',
      'brackets.yaml',
      '--report',
      reportPath,
    ]);
    expect(report.status).toBe('pass');
    expect(report.packs[0].checks.map((check) => check.name)).toEqual([
      'file_exists',
      'schema_validation',
      'citation_registry',
      'year_coherence',
    ]);
    expect(JSON.parse(await readFile(reportPath, 'utf8')).status).toBe('pass');
  });

  it('supports non-YAML file-level validation without schema expansion', async () => {
    const { report } = await runValidateCli([
      'node',
      'cli',
      '--pack',
      'us-federal/2026',
      '--file',
      'CHANGELOG.md',
    ]);
    expect(report.status).toBe('pass');
    expect(report.packs[0].checks).toEqual([{ name: 'file_exists', status: 'pass', errors: [] }]);
  });

  it('collects CTR citations and finds nested keys', () => {
    expect(collectCitations({ a: 'CTR/A/2025|CTR/B/2025/detail' })).toEqual(['CTR/A/2025', 'CTR/B/2025/detail']);
    expect(findKey({ a: [{ b: { section_224: true } }] }, 'section_224')).toBe(true);
    expect(findKey({ a: [{ b: false }] }, 'section_224')).toBe(false);
  });

  it('reports citation and year-coherence failures', async () => {
    const pack = { id: 'us-federal/2023', jurisdiction: 'us-federal', year: '2023', dir: 'jurisdictions/us-federal/2023' };
    const citation = await checkCitationRegistry(pack, new Set(['CTR/A/2025']), { file: { citation: 'CTR/MISSING/2025|BAD' } });
    expect(citation.status).toBe('fail');
    expect(citation.errors).toContain('citation not in registry: CTR/MISSING/2025');
    expect(citation.errors).toContain('invalid citation format: BAD');

    const preObbba = checkYearCoherence(pack, { file: { section_224: {} } });
    expect(preObbba.status).toBe('fail');
    expect(preObbba.errors).toContain('pre-OBBBA pack contains section_224');

    const obbba = checkYearCoherence(
      { id: 'california/2025', jurisdiction: 'california', year: '2025', dir: 'jurisdictions/california/2025' },
      { 'tipped-wages.yaml': { pack: 'california/2025' } },
    );
    expect(obbba.status).toBe('fail');
  });

  it('reports ambiguity and file-level validation failures', async () => {
    const pack = { id: 'california/2026', jurisdiction: 'california', year: '2026', dir: 'jurisdictions/california/2026' };
    const ambiguity = checkAmbiguities(pack, {
      'ambiguities.yaml': {
        ambiguities: [
          {
            ambiguity_id: 'AMB-2026-CA-INDEXED-AMOUNTS',
            interpretations: { aggressive: { forbidden: false } },
          },
        ],
      },
    });
    expect(ambiguity.status).toBe('fail');
    expect(ambiguity.errors).toContain('missing required ambiguity AMB-2026-CA-CONFORMITY');
    expect(ambiguity.errors).toContain('aggressive interpretation not forbidden: AMB-2026-CA-INDEXED-AMOUNTS');

    const missing = await validateFile(pack, new Set(), 'missing.yaml');
    expect(missing.status).toBe('fail');
    expect(missing.checks[0].errors).toEqual(['missing missing.yaml']);
    await expect(runValidateCli(['node', 'cli'])).rejects.toThrow('Use --all or --pack <jurisdiction/year>.');
  });

  it('reports manifest hash failures', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'taxtips-hashes-'));
    const pack = { id: 'synthetic/2099', jurisdiction: 'synthetic', year: '2099', dir };
    expect((await checkManifestHashes(pack, {})).errors).toEqual(['manifest.yaml missing files list']);

    const incomplete = await checkManifestHashes(pack, { 'manifest.yaml': { files: [{}] } });
    expect(incomplete.errors).toEqual(['manifest file entry missing path or sha256']);

    const missing = await checkManifestHashes(pack, { 'manifest.yaml': { files: [{ path: 'missing.yaml', sha256: 'abc' }] } });
    expect(missing.errors).toEqual(['manifest references missing file: missing.yaml']);

    await writeFile(join(dir, 'file.yaml'), 'content\n');
    const mismatch = await checkManifestHashes(pack, { 'manifest.yaml': { files: [{ path: 'file.yaml', sha256: 'abc' }] } });
    expect(mismatch.errors).toEqual(['sha256 mismatch: file.yaml']);
  });

  it('reports invalid manifest schema and malformed signature material', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'taxtips-signature-errors-'));
    await mkdir(join(dir, 'signatures'));
    const pack = { id: 'us-federal/2099', jurisdiction: 'us-federal', year: '2099', dir };
    await writeFile(join(dir, 'manifest.yaml'), 'pack_id: us-federal/2099\nversion: bad\n');
    await writeFile(
      join(dir, 'signatures', 'federal-specialist.sig'),
      [
        'algorithm: Ed25519',
        'message: sha256(manifest.yaml)',
        'message_sha256: mismatch',
        'signature: ""',
        '',
      ].join('\n'),
    );
    await writeFile(
      join(dir, 'signatures', 'tax-director.sig'),
      [
        'algorithm: Ed25519',
        'message: sha256(manifest.yaml)',
        'message_sha256: mismatch',
        `signature: vault:v1:${Buffer.alloc(64).toString('base64')}`,
        '',
      ].join('\n'),
    );

    const schema = await checkSchemaShape(pack);
    expect(schema.status).toBe('fail');
    expect(schema.errors).toContain('manifest version must be SemVer');

    const signatures = await checkSignatures(pack);
    expect(signatures.status).toBe('fail');
    expect(signatures.errors).toContain('federal-specialist.sig missing signature material');
    expect(signatures.errors).toContain('tax-director.sig Ed25519 verification failed');
  });

  it('reports missing required signature files', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'taxtips-signatures-'));
    await writeFile(join(dir, 'manifest.yaml'), 'pack_id: synthetic/2099\n');
    const result = await checkSignatures({ id: 'us-federal/2099', jurisdiction: 'us-federal', year: '2099', dir });
    expect(result.status).toBe('fail');
    expect(result.errors).toContain('missing federal-specialist.sig');
    expect(result.errors).toContain('missing tax-director.sig');
  });
});
