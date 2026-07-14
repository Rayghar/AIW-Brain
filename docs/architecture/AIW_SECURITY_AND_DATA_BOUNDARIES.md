# AIW Security and Data Boundaries

## Boundary model

```mermaid
flowchart LR
    subgraph Client[Client Boundary]
        UI[AIW Web Studio]
    end

    subgraph App[AIW Application Boundary]
        API[API Backend]
        AUTH[Auth / RBAC]
        POLICY[Policy Engine]
        AUDIT[Audit Service]
        LLMGW[LLM Gateway]
    end

    subgraph Data[AIW Data Boundary]
        PG[(PostgreSQL)]
        VEC[(Vector Index)]
        OBJ[(Object Storage)]
        REDIS[(Redis)]
    end

    subgraph External[External Boundary]
        OPENAI[OpenAI]
        OTHER[Other LLMs]
        GITHUB[GitHub]
        IDP[Enterprise Identity Provider]
    end

    UI --> AUTH
    AUTH --> API
    API --> POLICY
    POLICY --> PG
    POLICY --> VEC
    POLICY --> OBJ
    POLICY --> REDIS
    API --> AUDIT
    API --> LLMGW
    LLMGW --> REDACT[Redaction / Prompt Filter]
    REDACT --> OPENAI
    REDACT --> OTHER
    API --> GITHUB
    AUTH --> IDP
    LLMGW --> AUDIT
```

## Key rules

1. No secrets in prompts.
2. No direct UI-to-LLM calls.
3. No raw production credentials in architecture model exports.
4. No unapproved knowledge source activation.
5. No final architecture decision from LLM output alone.
6. Tenant-aware data model from the beginning.
7. All LLM requests logged with metadata.
8. Prompt/response storage policy must be configurable.
9. Redaction is mandatory before external provider calls.
10. Sensitive projects can be routed only to approved private/local providers.

## Audit events

AIW should audit:

- project created/updated,
- model object created/updated/deleted,
- relationship created/updated/deleted,
- stage completed/reopened,
- style accepted,
- pattern accepted,
- obligation armed/resolved,
- knowledge record approved/released,
- LLM request made,
- SDD generated/downloaded,
- admin setting changed,
- provider route changed.
