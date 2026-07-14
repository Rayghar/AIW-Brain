# AIW rc.10.72.0 External Acceptance Blockers

Generated: 2026-07-13T13:41:37.466103+00:00

| Control | Current state | Evidence available | Required closure |
|---|---|---|---|
| Enterprise KMS/HSM | Blocked | Offline Ed25519 verified; AWS/Azure/GCP/Vault adapters tested | Sign exact manifest hash with organization key and independently verify |
| Remote GitHub | Blocked | Signed local commit/tag/bundle | Push to protected approved repository and retain remote verification/audit |
| PostgreSQL/RLS | Blocked | Schema, migration and repository adapters | Apply to managed target and run cross-tenant substitution tests |
| pgvector retrieval | Blocked | Approved-release retrieval implementation | Index approved records and run tenant-filtered recall/precision tests |
| Object storage | Blocked | S3/MinIO adapter | Write/read/checksum/retention/immutability/protected-delete tests |
| Durable queue | Blocked | Worker/queue contracts | Crash, retry, duplicate delivery, dead-letter, pause/drain tests |
| Enterprise OIDC | Blocked | OIDC/JWKS implementation and local tests | Discovery, rotation, sign-in, role mapping, step-up and expiry tests |
| OpenTelemetry | Blocked | OTLP exporter/runtime | Verify tenant-safe traces, metrics and logs in managed collector |
| Backup/restore | Blocked | Runbooks and contracts | Destructive restore rehearsal with checksum and RTO/RPO evidence |
| Worker recovery | Blocked | Recovery controls | Kill/restart workers during accepted jobs and prove no loss/duplicate mutation |
| Live LLM | Blocked | Gateway, policy, fallback and cost ledger | Run approved task classes against permitted route and verify redaction/timeout/fallback |
| External expert panel | Blocked | Blind protocol and generated variants | Convene independent architects and record blinded scores/disagreements |
| Enterprise pilot | Blocked | Controlled internal pilot | Run authorized live initiative with accountable owners and acceptance gates |
