# AIW Operational Runbook

## Health and readiness

- `/health`: process and version health.
- `/ready`: repository and durable-event readiness.
- `/metrics`: Prometheus metrics.

## Operational architecture cycle

1. Run scheduled provider collectors or import telemetry evidence.
2. Generate structural and operational drift reports.
3. Check active, time-bound waivers.
4. Create a remediation plan from open findings.
5. Obtain independent human approval.
6. Apply the reviewed repository/provider change.
7. Re-collect runtime evidence and confirm closure.

## Incident response

Capture the tenant, project, branch, correlation ID, current revision, outbox backlog, collector status, SLO status and latest drift report before modifying the system.

## Recovery

Restore PostgreSQL from an encrypted tested backup, replay pending outbox records idempotently, restore the last approved architecture revision, and regenerate repository artifacts before reopening editing.
