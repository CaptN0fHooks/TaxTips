# Vault Raft configuration for TaxTips Phase 1 signing infrastructure.
# Target: Vault 2.0.x operator and integrated-storage docs.
# Secrets, tokens, unseal keys, and Transit key material do not belong in this file.
ui = true

storage "raft" {
  # Integrated Storage — persistent path on WSL filesystem (not tmpfs).
  # Directive 2 required backend; Directive 4 §1.3 Phase 1 precondition.
  path    = "/home/mrj_dev/vault-data/raft"
  node_id = "taxtips-vault-raft-1"
}

listener "tcp" {
  address     = "127.0.0.1:8210"
  tls_disable = 1
  # WSL local signing ceremony: loopback-only plain TCP on 8210.
  # Port 8200 is reserved for the dev-mode Vault until decommission (item 1.10).
}

api_addr     = "http://127.0.0.1:8210"
cluster_addr = "http://127.0.0.1:8211"

# WSL does not support mlock — must be true or Vault fails to start.
disable_mlock = true
