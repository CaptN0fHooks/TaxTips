# Vault Snapshot Capture Report

Date: 2026-06-15

## Result

Scenario B triggered. Snapshot capture is unavailable because the current Vault storage backend is `inmem` and does not expose the Raft snapshot path.

## Vault Status

- Initialized: true
- Sealed: false
- Version: 2.0.2
- Storage Type: inmem
- HA Enabled: false

## Key Read Results

All three Transit keys were present at the time of capture attempt:

| Key | Type | Exportable | Plaintext backup | Supports signing | Public key |
|---|---|---:|---:|---:|---|
| `taxtips-federal-specialist` | ed25519 | false | false | true | `5t4640Uu6gpCN9eazU2QaZxViH4LEAQZ0qU0XZ5Tm5c=` |
| `taxtips-ca-specialist` | ed25519 | false | false | true | `OcPicIR/Xu/r+cErvjHyrc/chawzuVWNNOlT2p6Rqxw=` |
| `taxtips-tax-director` | ed25519 | false | false | true | `Cq4jLuER5/snCMaykr5GAuZxDZofzVUEQGJvdOEFvTs=` |

## Snapshot Attempt

Target path:

```text
/home/mrj_dev/vault-snapshots/vault-snapshot-20260615-115404.snap
```

Command failed:

```text
Error taking the snapshot: Error making API request.

URL: GET http://127.0.0.1:8200/v1/sys/storage/raft/snapshot
Code: 404. Errors:

* 1 error occurred:
	* unsupported path
```

Exit code: `2`

No snapshot hash or file size is available because no snapshot file was created.

## Stale Pubkey Fingerprints

These are the currently committed public key fingerprints. If persisted Vault keys are recreated, these become stale and must be replaced through the Scenario B pubkey recommit PR.

```text
d70760904b3afa2cc0b477f108460e78b6e6e59b5359a0f7c99f8f3161ddf4a3  jurisdictions/us-federal/signatures/federal-specialist.pub
39aca4845de2ba7d1523b148b8a97aad6cdebe6fc1ef9c78861b50d2a8bfc429  jurisdictions/us-federal/signatures/tax-director.pub
a9bf8944ad5613f90dd5e0365e963704b25d679985d07e7e17e273339c62c52b  jurisdictions/california/signatures/ca-specialist.pub
39aca4845de2ba7d1523b148b8a97aad6cdebe6fc1ef9c78861b50d2a8bfc429  jurisdictions/california/signatures/tax-director.pub
```

## Required Next Step

Principal Engineer and CISO must authorize Scenario B migration: create new non-exportable Ed25519 Transit keys in persisted Raft Vault, export the new public keys, update the committed `*.pub` files with `infrastructure/vault/scenario-b-pubkey-recommit.sh`, and verify before any signing ceremony.
