# Order-to-Payment Reference Design — Selection and Decision Trace

## Accepted architecture styles

| Style | Stage | Scope | Rationale |
|---|---|---|---|
| Event-Driven | logicalApplication | logical-order-domain | Decouple order progression from payment provider availability while preserving explicit synchronous query paths where justified. |

## Selected patterns and obligations

| Pattern | Status | Stage | Scope | Open obligations |
|---|---|---|---|---|
| Transactional Outbox | considering | applicationRealization | logical-order-domain | Outbox store; Publisher; Retention |

## Recorded decisions
