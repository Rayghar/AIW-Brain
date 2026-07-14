# Operations Runbook — AIW v0.9.2

## 1. Configuration

Copy `.env.example` to `.env` and set production values. At minimum:

- strong `POSTGRES_PASSWORD` and MinIO credentials;
- `AIW_ALLOW_DEV_AUTH=false` outside controlled development;
- approved OIDC configuration;
- provider secret environment variables for enabled LLM routes;
- GitHub/repository credentials only when the corresponding feature is enabled;
- external signing key path outside the application image.

Model policy rows contain only route metadata and secret-variable references.

## 2. Start the reference stack

```bash
docker compose up -d postgres minio minio-init migrate api web
```

Health checks:

```bash
curl -fsS http://localhost:4100/health
curl -fsS http://localhost:4100/ready
curl -fsS http://localhost:4173/health
```

The user interface is at `http://localhost:4173`.

## 3. Database

Migration 009 must run before tenant model policy, Co-Architect or guidance-interaction persistence is enabled.

```bash
npm run migrate:db
```

Verify RLS policies exist for:

- `llm_runtime_policies`;
- `coarchitect_sessions`;
- `coarchitect_messages`;
- `architecture_ai_reviews`;
- `design_guidance_interactions`.

## 4. LLM provider acceptance

1. Create an approved route in Pattern Intelligence → Brain.
2. Reference a server environment variable; do not paste secrets into policy JSON.
3. Save the policy.
4. Run the active probe for the intended purpose.
5. Confirm provider, model, route, latency and fallback status.
6. Confirm audit storage contains the request fingerprint but not prompt content.
7. Test deterministic fallback by temporarily disabling the route.

## 5. Project persistence acceptance

1. Create a governed project in Project Hub.
2. Edit the brief and confirm autosave returns to `saved`.
3. Open the project in a second session.
4. Save from session A, then attempt a stale save from session B.
5. Confirm a revision conflict is displayed and no overwrite occurs.
6. Create and retrieve a governed snapshot.
7. Restart the API and confirm the project, sessions and snapshot persist.

## 6. Visual coach acceptance

Validate at least one suggestion in each placement: brief, quality, canvas, selected-object inspector and review. Confirm every Pattern DNA recommendation resolves to the approved active knowledge release and the action opens a review step before architecture mutation.

## 7. Collaboration acceptance

Verify presence, activity events, operation idempotency and remote revision behavior with at least two authenticated users. Configure a shared durable event transport before horizontal scale; the in-memory event broker is only a local reference path.

## 8. Backup and recovery

Back up PostgreSQL and MinIO independently. Include the LLM policy table and immutable knowledge objects. Signing private keys must remain in the organization’s secret manager and are not part of application backups.

## 9. Release gates

A release candidate must pass:

```bash
npm run typecheck
npm test
npm run build
npm run security:check
npm audit --audit-level=high
npm run e2e
npm run architecture:gate
npm run intelligence:gate
npm run integration:gate
npm run sprint8_0_2:verify
```

## 10. Rollback

- Roll back the web and API images together.
- Do not drop migration 009 tables during application rollback; they are additive.
- Pin the prior approved knowledge release.
- Restore project data from PostgreSQL backup only when corruption is verified.
- Disable external model routes to force deterministic mode during provider incidents.
