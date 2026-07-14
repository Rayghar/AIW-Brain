# AIW Architecture Diagrams Pack

This file contains the core architecture diagrams for AIW rc.10.47.3 and beyond.

## 1. High-level product architecture

```mermaid
flowchart TB
    U[Users / Roles] --> WEB[AIW Web Studio]
    WEB --> API[AIW API]
    API --> KERNEL[Architecture Kernel]
    API --> BRAIN[Brain Signal Engine]
    API --> KNOW[Knowledge Brain / Mind Factory]
    API --> LLMGW[LLM Gateway]
    API --> DB[(PostgreSQL)]
    API --> REDIS[(Redis / Queue)]
    API --> OBJ[(Object Storage)]
    KNOW --> VEC[(pgvector)]
    REDIS --> WORKER[Worker Service]
    LLMGW --> OPENAI[OpenAI]
    LLMGW --> OTHER[Other LLMs]
```

## 2. LLM provider integration

```mermaid
flowchart LR
    UI[Co-Architect Request] --> API[AIW API]
    API --> CTX[Context Builder]
    CTX --> POLICY[Policy / Budget]
    POLICY --> REDACT[Redaction]
    REDACT --> ROUTER[LLM Router]
    ROUTER --> OAI[OpenAI]
    ROUTER --> OTHER[Other Provider]
    ROUTER --> LOCAL[Private Model]
    OAI --> VALIDATE[Validator]
    OTHER --> VALIDATE
    LOCAL --> VALIDATE
    VALIDATE --> AUDIT[Audit + Usage Ledger]
    VALIDATE --> OUT[Structured Output]
```

## 3. Intelligence pipeline

```mermaid
flowchart TB
    MODEL[Architecture Model Change] --> KERNEL[Kernel Recompute]
    KERNEL --> FIND[Findings]
    KNOW[Governed Knowledge] --> FIND
    FIND --> SIGNAL[Brain Signal Engine]
    SIGNAL --> PRIORITY[Signal Prioritizer]
    PRIORITY --> SURFACE[Quiet UI Surfaces]
    SURFACE --> CANVAS[Canvas]
    SURFACE --> LIB[Library]
    SURFACE --> STAGE[Stage Ribbon]
    SURFACE --> INFO[Info Center]
    SURFACE --> RADAR[Decision Radar]
    SURFACE --> COAUTH[Co-Architect]
```

## 4. Brain Signal Engine

```mermaid
flowchart LR
    INPUT[Kernel + Knowledge + LLM + System Findings] --> NORMALIZE[Normalize]
    NORMALIZE --> CLASSIFY[Classify]
    CLASSIFY --> PRIORITIZE[Prioritize]
    PRIORITIZE --> POLICY[Surface Policy]
    POLICY --> BADGES[Badges]
    POLICY --> CHIPS[Chips]
    POLICY --> DOCK[Dock Signal]
    POLICY --> DRAWERS[Info/Radar/Co-Architect]
    POLICY --> GATES[Stage Gates]
```

## 5. Mind Factory / Knowledge Governance

```mermaid
flowchart TB
    SOURCES[Sources] --> INGEST[Ingest]
    INGEST --> EXTRACT[Extract Claims / Patterns]
    EXTRACT --> NORMALIZE[Normalize]
    NORMALIZE --> CONTRA[Contradiction Check]
    CONTRA --> REVIEW[Curator Review]
    REVIEW --> APPROVE{Approve?}
    APPROVE -->|No| REVISE[Revise / Reject]
    APPROVE -->|Yes| RC[Release Candidate]
    RC --> GATES[Governance Gates]
    GATES --> RELEASE[Signed Release]
    RELEASE --> ACTIVE[Active Knowledge Brain]
    ACTIVE --> KERNEL[Architecture Kernel]
    ACTIVE --> SIGNAL[Brain Signal Engine]
```

## 6. Co-Architect sequence

```mermaid
sequenceDiagram
    participant User as Architect
    participant UI as Web Studio
    participant API as API
    participant Kernel as Kernel
    participant Know as Knowledge Brain
    participant GW as LLM Gateway
    participant LLM as OpenAI/Other LLM
    participant Val as Validator
    participant Audit as Audit

    User->>UI: Ask for critique/explanation/draft
    UI->>API: Submit request with project/stage/object context
    API->>Kernel: Get deterministic findings
    API->>Know: Retrieve governed evidence
    API->>GW: Submit structured LLM task
    GW->>LLM: Call selected model
    LLM-->>GW: Return structured response
    GW->>Val: Validate schema and policy
    Val->>Audit: Record metadata and usage
    Val-->>API: Return validated result
    API-->>UI: Show in Co-Architect/Info Center
```

## 7. LLM cost and routing governance

```mermaid
flowchart TB
    REQ[LLM Request] --> TYPE{Task Type}
    TYPE --> CHEAP[Low-cost Route]
    TYPE --> STRONG[High-reasoning Route]
    TYPE --> PRIVATE[Private Route]
    TYPE --> BATCH[Batch Route]
    CHEAP --> BUDGET[Budget Check]
    STRONG --> BUDGET
    PRIVATE --> BUDGET
    BATCH --> BUDGET
    BUDGET --> OK{Allowed?}
    OK -->|No| BLOCK[Block / Approval / Downgrade]
    OK -->|Yes| CACHE{Cached?}
    CACHE -->|Yes| RETURN[Return Cached]
    CACHE -->|No| CALL[Provider Call]
    CALL --> METER[Token Meter]
    METER --> LEDGER[Cost Ledger]
    LEDGER --> AUDIT[Audit]
```

## 8. Production topology

```mermaid
flowchart TB
    USER[Browser] --> CDN[CDN / Static Hosting]
    CDN --> WEB[AIW Web Studio]
    WEB --> LB[Load Balancer]
    LB --> API1[API Container]
    LB --> API2[API Container]
    API1 --> PG[(PostgreSQL + pgvector)]
    API2 --> PG
    API1 --> REDIS[(Redis)]
    API2 --> REDIS
    REDIS --> WORKER1[Worker]
    REDIS --> WORKER2[Worker]
    API1 --> OBJ[(Object Storage)]
    API2 --> OBJ
    WORKER1 --> OBJ
    WORKER2 --> OBJ
    API1 --> LLMGW[LLM Gateway]
    API2 --> LLMGW
    LLMGW --> OAI[OpenAI]
    LLMGW --> OTHER[Other LLMs]
    API1 --> OBS[Observability]
    API2 --> OBS
    WORKER1 --> OBS
    WORKER2 --> OBS
```

## 9. Security and data boundary

```mermaid
flowchart LR
    UI[Web Studio] --> AUTH[Auth/RBAC]
    AUTH --> API[API Backend]
    API --> POLICY[Policy Engine]
    POLICY --> DATA[(PostgreSQL / pgvector / Object Storage)]
    API --> LLMGW[LLM Gateway]
    LLMGW --> REDACT[Redaction]
    REDACT --> PROVIDER[OpenAI / Other LLM]
    API --> AUDIT[Audit Log]
    LLMGW --> AUDIT
```
