# Gate 6B Final Pilot Selection Quality Audit

Generated: 2026-07-16T08:53:27.782Z

Status: **deterministic QA complete; pilot not started**. Production accepted: **false**.

## Outcome

- Final selection records: 204 / 220 maximum
- Meaningful model-input units: 172
- Non-model controls and abstentions: 32
- Existing cases demoted by content QA: 20
- Supplementary meaningful coverage units: 2
- Repositories kept visible: 47 / 47
- Excerpt-hash replay failures: 0
- Network calls: 0
- Model calls: 0
- Selection fingerprint: `sha256:b6e10234c02bf9d1417a39bf52451e4a8b26cd800ae1c018dc1ea1005cb3ed38`

Repository quotas were not used to manufacture model inputs. Heading-only, placeholder, one-to-three-token, label-only, non-propositional, missing-parser and hash-invalid cases are retained as controls or abstentions and are excluded from model execution.

## Meaningful coverage

| Topic | Target | Actual | Result |
|---|---:|---:|---|
| modernisation | 5 | 14 | met |
| resilience | 5 | 43 | met |
| observability | 5 | 25 | met |
| agentic-architecture | 5 | 14 | met |
| security-and-trust-boundaries | 8 | 57 | met |
| interfaces-and-data-obligations | 8 | 98 | met |
| reference-architecture-and-genome | 8 | 139 | met |
| causal-pattern-dna | 8 | 63 | met |
| contradiction | 6 | 6 | met |
| abstention-and-missing-evidence | 12 | 12 | met |

## Reclassified existing cases

| Connector | Semantic unit | Original slot | Audited disposition | Reason |
|---|---|---|---|---|
| GH-ARC42 | SEMU-b1db9a385e2c1707c3d71c68 | claim-bearing-primary | insufficient-evidence-control | one-to-three-token-fragment, insufficient-propositional-content |
| GH-ARC42 | SEMU-455ab8064205693fccf8ed63 | deliberate-non-claim | non-claim-control | one-to-three-token-fragment, insufficient-propositional-content |
| GH-ARC42 | SEMU-6db96c9f75c6720d78673b9c | complex-ambiguous-contradictory-or-cross-file | insufficient-evidence-control | one-to-three-token-fragment, insufficient-propositional-content |
| GH-ARCHITECTURE-CATALOG | SEMU-5b3c3b38a0f582784ee738ef | claim-bearing-primary | insufficient-evidence-control | insufficient-propositional-content |
| GH-ARCHUNIT | SEMU-4a2234fcc4916813044d504c | deliberate-non-claim | non-claim-control | insufficient-propositional-content |
| GH-ARDALIS-CLEAN-ARCH | SEMU-d324dd720c046fc056a7b6e2 | deliberate-non-claim | non-claim-control | insufficient-propositional-content |
| GH-AWESOME-SOFTWARE-ARCH | SEMU-45d94af092c610de58e0552b | deliberate-non-claim | non-claim-control | one-to-three-token-fragment, insufficient-propositional-content |
| GH-AWESOME-SYSTEM-DESIGN-RESOURCES | SEMU-ebe9e51e02092162daa7b85c | deliberate-non-claim | non-claim-control | one-to-three-token-fragment, insufficient-propositional-content |
| GH-AWESOME-SYSTEM-DESIGN-RESOURCES | SEMU-2d7c917c195d728f897ecb16 | complex-ambiguous-contradictory-or-cross-file | insufficient-evidence-control | insufficient-propositional-content |
| GH-DDD-CREW | SEMU-70eaeb6fdf2a703353eeedbd | claim-bearing-primary | insufficient-evidence-control | insufficient-propositional-content |
| GH-FINOS-CALM | SEMU-0468ad001049217181a6743d | deliberate-non-claim | non-claim-control | insufficient-propositional-content |
| GH-GCP-MICROSERVICES-DEMO | SEMU-f6aa8e746a8a15ca7241a7f4 | claim-bearing-materially-different | insufficient-evidence-control | one-to-three-token-fragment, insufficient-propositional-content |
| GH-GCP-MICROSERVICES-DEMO | SEMU-58ed0d6043528b70796e4d11 | deliberate-non-claim | non-claim-control | one-to-three-token-fragment, insufficient-propositional-content |
| GH-ITATM-REFARCH | SEMU-2cdbbc537b99881dc3379ba2 | claim-bearing-primary | insufficient-evidence-control | one-to-three-token-fragment, insufficient-propositional-content |
| GH-MICROSOFT-AGENT-SKILLS | SEMU-98605a7f9371775f15c91ffb | claim-bearing-primary | insufficient-evidence-control | insufficient-propositional-content |
| GH-MICROSOFT-AGENT-SKILLS | SEMU-3c63508602435b37235b9d61 | deliberate-non-claim | non-claim-control | insufficient-propositional-content |
| GH-SERVICE-MESH-PATTERNS | SEMU-809c93a59e50a297e45a0604 | claim-bearing-materially-different | insufficient-evidence-control | template-or-placeholder |
| GH-SERVICE-MESH-PATTERNS | SEMU-084d0b3281a6a8aaff1708f9 | complex-ambiguous-contradictory-or-cross-file | insufficient-evidence-control | template-or-placeholder |
| GH-SPRING-MODULITH | SEMU-14d982ee085c67021daed594 | claim-bearing-materially-different | insufficient-evidence-control | insufficient-propositional-content |
| GH-SYSTEM-DESIGN-PRIMER | SEMU-c603a3b54a3b4e153dd13b2a | deliberate-non-claim | non-claim-control | insufficient-propositional-content |

The gold set remains provisional and has not been independently reviewed. Candidate authority, individual provenance, source-gap controls and exact source-occurrence mappings are preserved.
