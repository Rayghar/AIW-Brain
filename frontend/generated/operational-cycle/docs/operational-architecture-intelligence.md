# Order-to-Payment Reference Design — Operational Architecture Intelligence

## Inventory collectors

| Collector | Provider | Status | Schedule | Last run |
|---|---|---|---|---|
| Reference Kubernetes collector | AWS | healthy | 0 */6 * * * | 2026-07-02T18:36:29.670Z |

## Operational drift

- Cost findings: 1
- Capacity findings: 1
- Resilience findings: 1
- Estimated monthly impact: 350

- **SIGNIFICANT / cost: Cost drift for Managed PostgreSQL** — Observed monthly cost 850 exceeds expected 500. Estimated monthly impact: 350.
- **SIGNIFICANT / capacity: Capacity shortfall for Managed PostgreSQL** — Observed replicas 1 are below intended 2. 
- **HARD / resilience: Resilience drift for Managed PostgreSQL** — Observed failure-domain coverage 1 is below intended 2. 

## Active waivers

- No active drift waivers.