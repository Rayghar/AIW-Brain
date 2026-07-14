# Order-to-Payment Reference Design — Operational Runbook

## Health checks
- `/health` verifies process health.
- `/ready` verifies repository and durable-event readiness.
- `/metrics` exposes Prometheus metrics.

## Incident triage
1. Confirm tenant and correlation ID.
2. Check error rate, p95 latency, outbox backlog and collector health.
3. Compare the latest runtime inventory to the approved architecture.
4. Open or update a remediation plan; do not apply provider changes without approval.

## Drift response
1. Classify the drift as cost, capacity, resilience or structural.
2. Validate whether an active time-bound waiver exists.
3. Generate a remediation plan.
4. Obtain an independent approval.
5. Apply through reviewed repository or provider workflows.
6. Re-collect inventory and close the finding.

## Backup and recovery
- Back up PostgreSQL using encrypted logical or physical backups.
- Test restore procedures on a scheduled basis.
- Preserve architecture snapshots, audit events and repository artifacts according to retention policy.

## Rollback
- Roll back application deployment to the previous signed image.
- Restore the last approved architecture repository revision.
- Do not delete drift evidence; mark remediation actions as rolled back and create a new audit event.