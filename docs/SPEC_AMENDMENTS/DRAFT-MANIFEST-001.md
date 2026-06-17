# SPEC AMENDMENT: DRAFT-MANIFEST-001

Status: Filed
Type: Minor clarification
Filed: 2026-06-15
Affected sections: SPEC.md §6.1, §20.1
Reviewers required: CTO + Tax Director

## Gap

SPEC.md §6.1 defines the final `manifest.yaml` shape for signed rule packs, and §20.1 requires SemVer for versioned artifacts. Phase 1 incremental authorship needs a structurally valid manifest before tax-content files are authored, but the final manifest cannot be completed until all content files exist and their SHA-256 hashes are computed.

## Amendment

During incremental pack authorship only, a draft `manifest.yaml` may use:

```yaml
version: 0.0.0-draft
effective_date: TBD
files: []
```

`0.0.0-draft` is SemVer 2.0 prerelease syntax and is permitted only for draft manifests.

## Guard

The validator accepts a draft manifest only in file-level validation mode:

```bash
rule-pack-validate --pack <jurisdiction/year> --file manifest.yaml --skip-signatures
```

Full-pack validator-green requires a final manifest. A draft manifest causes full-pack validation to fail with:

```text
draft manifest is valid only for file-level Step 0 validation; full-pack validation requires final manifest
```

This prevents a draft pack from being treated as complete or signable.

## Disposition

Most-defensible interpretation: allow draft manifests for incremental authorship while preserving final-pack strictness. This matches Directive 4 implementation and keeps D3 file-by-file validation possible without weakening D8 signing controls.

## Ratification

This is a minor backward-compatible clarification. CTO and Tax Director review are required. CEO sign-off is not required unless reviewers reclassify the change as material.
