# AIW Production Deployment Checklist

## Before deployment

- [ ] Frontend build passes.
- [ ] Backend build passes.
- [ ] Worker build passes.
- [ ] Structure gates pass.
- [ ] Internal dependency gates pass.
- [ ] Golden journey E2E passes.
- [ ] Environment variables reviewed.
- [ ] Secrets are stored in secret manager, not `.env` files.
- [ ] PostgreSQL backup policy configured.
- [ ] Redis persistence/backup posture reviewed.
- [ ] Object storage bucket encryption enabled.
- [ ] TLS configured.
- [ ] OIDC/SAML integration configured.
- [ ] LLM budgets configured.
- [ ] LLM provider routes configured.
- [ ] Prompt/response audit storage policy approved.
- [ ] Observability endpoint configured.

## Runtime checks

- [ ] API health endpoint healthy.
- [ ] Worker health endpoint healthy.
- [ ] Queue processing healthy.
- [ ] Database migrations applied.
- [ ] SDD artifact generation works.
- [ ] LLM Gateway budget checks work.
- [ ] Cost ledger records usage.
- [ ] Audit log records key events.
- [ ] Knowledge release activation works.
- [ ] Project creation golden path works.

## Production guardrails

- [ ] No UI-to-LLM direct calls.
- [ ] No provider API keys in frontend bundle.
- [ ] Redaction enabled before external LLM calls.
- [ ] Tenant-aware policies enabled.
- [ ] Rate limits enabled.
- [ ] Error monitoring enabled.
- [ ] Alerting configured for failed workers and LLM spend anomalies.
