# Architecture Decision Records

## ADR-0001: Select STYLE-EVENT-DRIVEN

### Status
Accepted

### Context
The decision applies at logicalApplication within scope logical-order-domain.

### Decision
Decouple order progression from payment provider availability while preserving explicit synchronous query paths where justified.

### Consequences
- The selected style must be evaluated with its prerequisites, obligations and quality-attribute trade-offs.
- Synchronous and asynchronous interactions remain permitted where justified; tensions are recorded rather than hidden.
