# portfolio-digital-channels — Enterprise Architecture Portfolio Intelligence

Generated from 3 governed projects.

## Executive summary

- High-risk projects: 2
- Cross-project dependencies: 3
- Technology-standardization score: 89%
- Reference-architecture compliance: 36%
- Monthly cost variance: USD -350

## Risk and technical-debt heatmap

| Project | Criticality | Risk score | Band | Drivers |
|---|---|---:|---|---|
| Order-to-Payment Reference Design | mission-critical | 44 | high | 6 architecture stages remain unapproved; Open runtime or operational drift |
| Commerce Analytics Platform | high | 43 | high | 2 material technical-debt item(s); 6 architecture stages remain unapproved |
| Customer Identity Platform | mission-critical | 34 | moderate | 6 architecture stages remain unapproved; High inbound dependency centrality |

## Technology standardization

- Preferred technology instances: 2
- Restricted technology instances: 1
- Deprecated technology instances: 1
- Unclassified technology instances: 0

- **SIGNIFICANT: MySQL 5 Reporting Store MySQL 5.7** in project-commerce-analytics — Migrate to PostgreSQL.
- **ADVISORY: RabbitMQ Broker RabbitMQ** in project-commerce-analytics — Migrate to Kafka or managed queue based on workload.

## Cost and technical debt

- Expected monthly cost: USD 4150
- Actual monthly cost: USD 3800
- Annual technical-debt impact: USD 129000

## Recommended investment roadmap

1. **NOW: Reduce architecture risk in Order-to-Payment Reference Design** — 6 architecture stages remain unapproved; Open runtime or operational drift Estimated effort: 22 days; estimated annual benefit: USD 66000.
2. **NOW: Reduce architecture risk in Commerce Analytics Platform** — 2 material technical-debt item(s); 6 architecture stages remain unapproved Estimated effort: 22 days; estimated annual benefit: USD 64500.
3. **NOW: Consolidate deprecated and restricted technology platforms** — 2 technology-standard exceptions require portfolio treatment. Estimated effort: 20 days; estimated annual benefit: USD 40000.
4. **NEXT: Close enterprise reference-architecture gaps** — 2 project/reference assignments remain non-compliant. Estimated effort: 24 days; estimated annual benefit: USD 24000.
5. **NEXT: Productize repeated solution components as architecture building blocks** — 1 repeated component signatures were detected across projects. Estimated effort: 8 days; estimated annual benefit: USD 20000.

## Reuse opportunities

- Building-block reuse score: 50%
- Review these similar components and promote a governed reusable architecture building block. Projects: project-order-to-payment, project-commerce-analytics.