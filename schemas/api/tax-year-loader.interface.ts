export type Jurisdiction = 'us-federal' | 'california';
export type TaxYear = 2023 | 2024 | 2025 | 2026;

export interface Manifest {
  readonly pack_id: string;
  readonly version: string;
  readonly spec_version: string;
  readonly tax_year: TaxYear;
  readonly jurisdiction: Jurisdiction;
  readonly effective_date: string;
  readonly controlling_report_version: string;
  readonly files: ReadonlyArray<{ readonly path: string; readonly sha256: string }>;
}

export type RulePackSection = Readonly<Record<string, unknown>>;

export interface AmbiguityRecord {
  readonly ambiguity_id: string;
  readonly title: string;
  readonly controlling_report_citation: string;
  readonly recommended_default: string;
}

export interface RulePack {
  readonly pack_id: string;
  readonly version: string;
  readonly spec_version: string;
  readonly tax_year: TaxYear;
  readonly jurisdiction: Jurisdiction;
  readonly manifest: Manifest;
  readonly brackets: RulePackSection;
  readonly standard_deduction: RulePackSection;
  readonly itemized: RulePackSection;
  readonly credits: ReadonlyMap<string, RulePackSection>;
  readonly tipped_wages: RulePackSection;
  readonly forms: RulePackSection;
  readonly mailing_addresses: RulePackSection;
  readonly ambiguities: ReadonlyMap<string, AmbiguityRecord>;
  readonly content_hash: string;
}

export interface TaxYearLoader {
  load(jurisdiction: Jurisdiction, year: TaxYear): Promise<RulePack>;
}
