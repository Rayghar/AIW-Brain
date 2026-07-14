# AIW Production Deployment Architecture

## Recommended deployment path

AIW should start with managed containers, not Kubernetes.

Recommended pilot/enterprise architecture:

```text
Frontend: Static CDN
Backend: API container
Worker: Separate worker container
Database: Managed PostgreSQL + pgvector
Queue/cache: Redis
Storage: Object storage
Secrets: Secret manager
Auth: OIDC/SAML-ready
Observability: OpenTelemetry + managed logs
LLM: AIW LLM Gateway
```

## Topology

```mermaid
flowchart TB
    USER[Browser Users] --> CDN[CDN / Static Hosting]
    CDN --> WEB[AIW Web Studio]

    WEB --> LB[API Load Balancer]
    LB --> API1[API Container 1]
    LB --> API2[API Container 2]

    API1 --> PG[(Managed PostgreSQL + pgvector)]
    API2 --> PG
    API1 --> REDIS[(Redis Queue / Cache)]
    API2 --> REDIS

    REDIS --> WORKER1[Worker Container]
    REDIS --> WORKER2[Worker Container]

    WORKER1 --> OBJ[(Object Storage)]
    WORKER2 --> OBJ
    API1 --> OBJ
    API2 --> OBJ

    API1 --> LLMGW[LLM Gateway]
    API2 --> LLMGW
    WORKER1 --> LLMGW

    LLMGW --> OPENAI[OpenAI]
    LLMGW --> OTHER[Other LLM Providers]
    LLMGW --> LOCAL[Private Model Endpoint]

    API1 --> OBS[Observability]
    API2 --> OBS
    WORKER1 --> OBS
    WORKER2 --> OBS

    API1 --> SECRETS[Secrets Manager]
    API2 --> SECRETS
    WORKER1 --> SECRETS
    WORKER2 --> SECRETS
```

## Why not Kubernetes immediately?

AIW's current product risk is not orchestration maturity. The core risks are:

- design-intelligence correctness,
- knowledge governance,
- LLM cost control,
- workspace clarity,
- evidence/provenance,
- auditability,
- production verification.

Managed containers reduce operational overhead while remaining production credible.

## Environment model

Recommended environments:

1. Local development.
2. Test/CI.
3. Staging/demo.
4. Production pilot.
5. Production commercial later.

## Minimum production controls

- TLS everywhere.
- OIDC/SAML-ready auth.
- Tenant-aware data model.
- Secret manager.
- Backups and restore drill.
- Redis queue visibility.
- OpenTelemetry logs/metrics/traces.
- Error monitoring.
- LLM token/cost ledger.
- Audit logs for decisions, model changes, knowledge releases, and LLM requests.

## Deployment stages

### Stage 1 — Lean pilot

- One API container.
- One worker container.
- Small PostgreSQL instance.
- Small Redis.
- Static web hosting.
- External LLM provider.

### Stage 2 — Enterprise pilot

- Two API containers behind load balancer.
- Worker pool.
- Managed PostgreSQL with backups/PITR.
- Managed Redis.
- Strong observability.
- OIDC integration.

### Stage 3 — Commercial SaaS

- Multi-tenant control plane.
- API and worker autoscaling.
- Tenant-aware data isolation.
- Metering/billing.
- Data residency policies.
- Stronger audit/event store.
