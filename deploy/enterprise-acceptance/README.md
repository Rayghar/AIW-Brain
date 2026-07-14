# AIW managed-enterprise acceptance environment

This stack is a repeatable acceptance target, not a production topology. It provides PostgreSQL/pgvector, MinIO, Keycloak, NATS JetStream, Vault Transit and an OpenTelemetry Collector. Production acceptance still requires organization-owned services, security configuration, backup, recovery, tenant isolation, key custody and accountable sign-off.

Run `docker compose up -d`, apply the AIW database migrations, configure the environment variables documented in `MANAGED_ENTERPRISE_INFRASTRUCTURE_ACCEPTANCE.md`, and run the rc.10.72 acceptance script.
