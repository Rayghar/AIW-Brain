# Order-to-Payment Reference Design — Security and Live Operations Report

Tenant: **tenant-reference**

## Identity policy

- SSO required: No
- Development authentication permitted: Yes
- Maximum session age: 480 minutes
- Audit retention: 365 days
- Encryption key reference: env://AIW_DATA_ENCRYPTION_KEY

## Identity providers

| Provider | Type | Status | Issuer |
|---|---|---|---|
| Reference development identity provider | DEVELOPMENT | Enabled | aiw://development |

## Secret references

| Purpose | Provider | Locator | Last rotation |
|---|---|---|---|
| Optional AI-assisted architecture audit | environment | env://OPENAI_API_KEY | — |
| Application-level encryption key reference | environment | env://AIW_DATA_ENCRYPTION_KEY | — |

## Live collaboration controls

- Presence TTL: 45 seconds
- Maximum concurrent editors: 12
- Operation retry limit: 3
- Mutation APIs require tenant and actor alignment and support idempotency keys.
- Activity delivery uses a tenant-scoped event stream; production deployments should place it behind authenticated ingress and a durable broker.