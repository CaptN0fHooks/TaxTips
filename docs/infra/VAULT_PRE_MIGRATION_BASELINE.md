# Vault Pre-Migration Baseline

Date: 2026-06-15

## Vault Status

- Initialized: true
- Sealed: false
- Version: 2.0.2
- Storage Type: inmem
- HA Enabled: false

## Transit Keys

All three dev-mode Transit keys are present and usable.

| Key | Type | Exportable | Plaintext backup | Supports signing | Public key |
|---|---|---:|---:|---:|---|
| `taxtips-federal-specialist` | ed25519 | false | false | true | `5t4640Uu6gpCN9eazU2QaZxViH4LEAQZ0qU0XZ5Tm5c=` |
| `taxtips-ca-specialist` | ed25519 | false | false | true | `OcPicIR/Xu/r+cErvjHyrc/chawzuVWNNOlT2p6Rqxw=` |
| `taxtips-tax-director` | ed25519 | false | false | true | `Cq4jLuER5/snCMaykr5GAuZxDZofzVUEQGJvdOEFvTs=` |

## Committed Pubkey Hashes

```text
d70760904b3afa2cc0b477f108460e78b6e6e59b5359a0f7c99f8f3161ddf4a3  jurisdictions/us-federal/signatures/federal-specialist.pub
39aca4845de2ba7d1523b148b8a97aad6cdebe6fc1ef9c78861b50d2a8bfc429  jurisdictions/us-federal/signatures/tax-director.pub
a9bf8944ad5613f90dd5e0365e963704b25d679985d07e7e17e273339c62c52b  jurisdictions/california/signatures/ca-specialist.pub
39aca4845de2ba7d1523b148b8a97aad6cdebe6fc1ef9c78861b50d2a8bfc429  jurisdictions/california/signatures/tax-director.pub
```

Directive 4 expected `jurisdictions/california/signatures/tax-director.pub`. That path was missing during baseline capture, so Codex added a public duplicate of the canonical Tax Director key for Scenario B workflows.

## Dev-Mode Sign/Verify Control Baseline

Payload:

```text
TEST_HASH=fa34c3a5ca4c474e02ae67b2b48b0d40c2967b94bcc16b19c159ea141c90e61a
```

Results:

| Key | Verify |
|---|---|
| `taxtips-federal-specialist` | true |
| `taxtips-ca-specialist` | true |
| `taxtips-tax-director` | true |

The control baseline confirms the dev-mode keys can sign and verify before Scenario B recreation. These signatures are test-only and are not pack signatures.
