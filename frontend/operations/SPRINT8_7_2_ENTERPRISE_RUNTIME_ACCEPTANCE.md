# Sprint 8.7.2 — Enterprise Runtime Acceptance

## Purpose

Sprint 8.7.2 converts enterprise adapters from configuration claims into active, evidence-bearing acceptance probes. **Configured** means a route and secret reference exist. **Verified** means the named active probe completed successfully and evidence was retained. A service is **configured** when the runtime has a route and secret reference. It is **verified** only when the target runtime completes the named probe.

## Active probes

| Check | Active proof |
|---|---|
| PostgreSQL/RLS | Database connection, server version, RLS-enabled tables and tenant policies |
| Object storage | Write, read, SHA-256 verification and delete round trip |
| pgvector | Extension presence and approved-index health |
| OIDC | Issuer discovery and JWKS retrieval; end-to-end login remains a separate acceptance |
| GitHub | Authenticated repository metadata and permission probe against an acceptance repository |
| LLM route | Governed structured-output request using public-classification test data |
| OTLP | Synthetic trace export accepted by the configured collector |
| Signing trust | Protected key-path readability or PEM envelope presence |

## Run

```bash
npm ci
npm run build
npm run enterprise:acceptance
```

Run selected probes:

```bash
npm run enterprise:acceptance -- --active=ACC-POSTGRES,ACC-OBJECT-STORE,ACC-VECTOR,ACC-OIDC,ACC-OTEL,ACC-SIGNING
```

Fail the command unless every required probe is verified:

```bash
npm run enterprise:acceptance -- --enforce
```

The report is written to `ENTERPRISE_RUNTIME_ACCEPTANCE.json`.

## Startup enforcement

Set:

```text
AIW_RUNTIME_ACCEPTANCE_MODE=enforce
AIW_RUNTIME_REQUIRED_CHECKS=ACC-POSTGRES,ACC-OBJECT-STORE,ACC-VECTOR,ACC-OIDC,ACC-OTEL,ACC-SIGNING
```

The API refuses to listen when any required check is not verified. Use `report` mode for local/offline development.

## Authorization

Only identities listed in `AIW_RUNTIME_ACCEPTANCE_OPERATORS` may execute active probes. Development mode permits the reference `user-owner` identity when the operator list is empty. Passive posture and retained evidence remain readable to authenticated tenant users.

## Local enterprise profile

```bash
docker compose --profile enterprise up --build
```

This profile adds Keycloak discovery/JWKS and an OpenTelemetry Collector to PostgreSQL/pgvector and MinIO. No test user or default administrator password is packaged. Set `KEYCLOAK_ADMIN_PASSWORD` explicitly and create acceptance identities through the local administration console when end-to-end login testing is required.

## Honest boundary

- OIDC discovery does not prove every login, claim mapping or revocation path.
- GitHub metadata permission does not replace a real generated PR and CI evidence-return test.
- LLM reachability does not make a model authoritative for scoring or policy.
- Verified probes still require accountable environment sign-off and retained operational evidence.
