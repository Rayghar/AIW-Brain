// Curated projection of the manifest-verified AKR pilot. Full-record hashes preserve existing receipts.
export const KNOWLEDGE_PACK = {
  "id": "AIW-EXPLORER-AKR-PILOT-1",
  "releaseId": "AKR-0.10.73.5",
  "releaseStatus": "approved-for-controlled-pilot",
  "productionAccepted": false,
  "use": "Descriptive guidance and architect-reviewed model proposals",
  "scoring": false,
  "liveSourceRefresh": false,
  "sourceFile": "AKR-0.10.73.5/PATTERN-DNA-2.1.json",
  "sourceSha256": "bdfb8975f8e1fad42ef30133c56413dfe3c9b385b49e7101b82555927ea919d6",
  "manifestSha256": "c30e78c5249e7620b980079c2bbab8693a0c357301e305d4cf81db9333a44839",
  "records": [
    {
      "id": "STYLE-LAYERED",
      "name": "Layered",
      "problem": "Address architecture forces for Layered without hiding its operational and governance consequences.",
      "context": [
        "Use when Layered is relevant to the selected application scope.",
        "Evaluate against project constraints, quality scenarios, team capability and existing architecture decisions."
      ],
      "prerequisites": [
        "Named owner and measurable quality scenario for Layered."
      ],
      "benefits": null,
      "tradeoffs": null,
      "failureModes": [
        "Misapplying Layered can add complexity without improving the priority quality attributes.",
        "Layered is applied outside its stated context or without prerequisites.",
        "Generated topology exists but required contracts or obligations are not implemented."
      ],
      "counterfactualExplanation": "Do not select Layered when prerequisites are absent, a simpler alternative meets the quality scenarios, or the team cannot sustain its operational obligations.",
      "obligations": [
        {
          "category": "delivery",
          "description": "Define ownership, monitoring, failure handling and review criteria introduced by Layered.",
          "id": "OBL-LAYERED-01",
          "mandatory": true,
          "title": "Layered operating obligation",
          "verificationHint": "Confirm the obligation is linked to an owner, a measurable control and an architecture fitness function where possible."
        }
      ],
      "knowledgeAuthority": {
        "activeUse": "descriptive-and-editorial-composition-only",
        "candidateKnowledgeInfluence": "blocked",
        "compositionReady": true,
        "conformanceReady": false,
        "descriptive": true,
        "discoveryKnowledgeInfluence": "blocked",
        "reasoningReady": false,
        "scoringCalibrated": false,
        "unsupportedNumericalQualityScoresInfluence": "blocked-unless-expert-calibrated-with-live-claim-lineage"
      },
      "lineageSummary": {
        "claimIds": [
          "PCLM-STYLE-LAYERED-GH-ARC42-03",
          "PCLM-STYLE-LAYERED-GH-ARDALIS-CLEAN-ARCH-02",
          "PCLM-STYLE-LAYERED-GH-MICROSOFT-ARCH-CENTER-01"
        ],
        "directSourceClaimCount": 0,
        "editorialSynthesisClaimCount": 3,
        "liveImmutableSourceClaimCount": 0
      },
      "applicabilityRules": [
        "The selected scope must contain a application-relevant responsibility or capability."
      ],
      "risks": [
        "Misapplying Layered can add complexity without improving the priority quality attributes."
      ],
      "alternatives": [],
      "sourcePointer": "/records/0",
      "recordSha256": "2a98b33ad6694b2c4785dbf093a30449f00417c12525897b0221c162706b4298",
      "claims": []
    },
    {
      "id": "STYLE-MICROSERVICES",
      "name": "Microservices",
      "problem": "A large solution needs independently owned change and scaling boundaries, but a single deployment unit causes coordination bottlenecks, broad regression risk or unequal scaling cost.",
      "context": [
        "Multiple stable business capabilities change at different rates and can be owned by long-lived teams.",
        "Independent deployment or selective scaling has measurable value that exceeds the cost of distributed operations.",
        "The organization can operate service discovery, secure service-to-service communication, observability and automated delivery."
      ],
      "prerequisites": [
        "Bounded contexts or capability ownership are documented.",
        "API and event contract governance is available.",
        "Central identity, secrets, observability and deployment automation are production-ready."
      ],
      "benefits": null,
      "tradeoffs": null,
      "failureModes": [
        "Chatty synchronous dependencies can create a distributed monolith with worse reliability than the original system.",
        "Duplicated data and eventual consistency can surprise business users and reconciliation processes.",
        "Service proliferation increases platform, security, observability and on-call burden.",
        "Microservices is applied outside its stated context or without prerequisites.",
        "Generated topology exists but required contracts or obligations are not implemented."
      ],
      "counterfactualExplanation": "Do not select Microservices when prerequisites are absent, a simpler alternative meets the quality scenarios, or the team cannot sustain its operational obligations.",
      "obligations": [
        {
          "category": "governance",
          "description": "Assign accountable ownership, measurable acceptance criteria and review cadence for Microservices.",
          "id": "OBL-MICROSERVICES-OWNERSHIP",
          "mandatory": true,
          "title": "Own Microservices lifecycle",
          "verificationHint": "The architecture decision links an owner, quality scenario and review date."
        },
        {
          "category": "operations",
          "description": "Define telemetry, failure handling and fitness functions that prove the intended Microservices properties.",
          "id": "OBL-MICROSERVICES-OPERATIONS",
          "mandatory": true,
          "title": "Validate Microservices in operation",
          "verificationHint": "Automated tests and runtime evidence are attached to the architecture decision."
        }
      ],
      "knowledgeAuthority": {
        "activeUse": "descriptive-and-editorial-composition-only",
        "candidateKnowledgeInfluence": "blocked",
        "compositionReady": true,
        "conformanceReady": false,
        "descriptive": true,
        "discoveryKnowledgeInfluence": "blocked",
        "reasoningReady": false,
        "scoringCalibrated": false,
        "unsupportedNumericalQualityScoresInfluence": "blocked-unless-expert-calibrated-with-live-claim-lineage"
      },
      "lineageSummary": {
        "claimIds": [
          "PCLM-STYLE-MICROSERVICES-GH-ARC42-03",
          "PCLM-STYLE-MICROSERVICES-GH-ARDALIS-CLEAN-ARCH-02",
          "PCLM-STYLE-MICROSERVICES-GH-MICROSOFT-ARCH-CENTER-01"
        ],
        "directSourceClaimCount": 0,
        "editorialSynthesisClaimCount": 3,
        "liveImmutableSourceClaimCount": 0
      },
      "applicabilityRules": [
        "At least two stable business capability boundaries and named owning teams are identified.",
        "A measurable need exists for independent deployment, selective scaling or failure isolation.",
        "Operational maturity covers automated delivery, telemetry, incident response and service ownership."
      ],
      "risks": [
        "Chatty synchronous dependencies can create a distributed monolith with worse reliability than the original system.",
        "Duplicated data and eventual consistency can surprise business users and reconciliation processes.",
        "Service proliferation increases platform, security, observability and on-call burden."
      ],
      "alternatives": [
        "STYLE-MODULAR-MONOLITH",
        "STYLE-LAYERED"
      ],
      "sourcePointer": "/records/4",
      "recordSha256": "571ab129cf82427ff2ce9249ec16cc7a9cdfa06e86fb21646e5ac74fa08aa810",
      "claims": []
    },
    {
      "id": "PAT-EVENT-SOURCING",
      "name": "Event Sourcing",
      "problem": "The system needs authoritative history, temporal reasoning or multiple derived views that cannot be reconstructed reliably from mutable current-state records.",
      "context": [
        "Domain events are stable business facts with clear ownership and ordering.",
        "Audit, temporal reconstruction or event-based integration has explicit business value.",
        "The organization can govern event schemas, snapshots, replay and sensitive-data handling for the lifetime of the system."
      ],
      "prerequisites": [
        "Event schema compatibility, upcasting and ownership policies are defined.",
        "Snapshot and projection rebuild procedures are tested at expected data volume.",
        "Privacy, retention and legal-hold requirements are mapped to event payload design."
      ],
      "benefits": null,
      "tradeoffs": null,
      "failureModes": [
        "Event schema mistakes persist for the lifetime of the stream and complicate replay.",
        "Replaying old events can repeat external side effects if boundaries are not strict.",
        "Immutable personal data can conflict with erasure obligations.",
        "Event Sourcing is applied outside its stated context or without prerequisites.",
        "Generated topology exists but required contracts or obligations are not implemented."
      ],
      "counterfactualExplanation": "Do not select Event Sourcing when prerequisites are absent, a simpler alternative meets the quality scenarios, or the team cannot sustain its operational obligations.",
      "obligations": [
        {
          "category": "governance",
          "description": "Assign accountable ownership, measurable acceptance criteria and review cadence for Event Sourcing.",
          "id": "OBL-EVENT-SOURCING-OWNERSHIP",
          "mandatory": true,
          "title": "Own Event Sourcing lifecycle",
          "verificationHint": "The architecture decision links an owner, quality scenario and review date."
        },
        {
          "category": "operations",
          "description": "Define telemetry, failure handling and fitness functions that prove the intended Event Sourcing properties.",
          "id": "OBL-EVENT-SOURCING-OPERATIONS",
          "mandatory": true,
          "title": "Validate Event Sourcing in operation",
          "verificationHint": "Automated tests and runtime evidence are attached to the architecture decision."
        }
      ],
      "knowledgeAuthority": {
        "activeUse": "controlled-pilot-reasoning",
        "candidateKnowledgeInfluence": "blocked",
        "compositionReady": true,
        "conformanceReady": true,
        "descriptive": true,
        "discoveryKnowledgeInfluence": "blocked",
        "reasoningReady": true,
        "scoringCalibrated": false,
        "unsupportedNumericalQualityScoresInfluence": "blocked-unless-expert-calibrated-with-live-claim-lineage"
      },
      "lineageSummary": {
        "claimIds": [
          "KCLM-AZURE-EVENT-SOURCING",
          "PCLM-PAT-EVENT-SOURCING-GH-FINOS-CALM-03",
          "PCLM-PAT-EVENT-SOURCING-GH-GCP-CLOUD-FOUNDATION-FABRIC-02",
          "PCLM-PAT-EVENT-SOURCING-GH-MICROSOFT-ARCH-CENTER-01"
        ],
        "directSourceClaimCount": 1,
        "editorialSynthesisClaimCount": 3,
        "liveImmutableSourceClaimCount": 0
      },
      "applicabilityRules": [
        "Events represent domain facts, not technical CRUD changes.",
        "Aggregate boundaries and concurrency rules provide deterministic ordering.",
        "Replay is side-effect free and projection rebuild objectives are measurable."
      ],
      "risks": [
        "Event schema mistakes persist for the lifetime of the stream and complicate replay.",
        "Replaying old events can repeat external side effects if boundaries are not strict.",
        "Immutable personal data can conflict with erasure obligations."
      ],
      "alternatives": [
        "PAT-AUDIT-LOG",
        "PAT-TEMPORAL-TABLE"
      ],
      "sourcePointer": "/records/87",
      "recordSha256": "c5c0a708109fd9e11ddfd2940979143179951d1e75fd00df1f3c9657770aed29",
      "claims": [
        {
          "objectId": "KOBJ-KCLM-AZURE-EVENT-SOURCING",
          "claimId": "KCLM-AZURE-EVENT-SOURCING",
          "objectClass": "atomic-source-claim",
          "statement": "Immutable event stores can conflict with data-erasure obligations, so sensitive personal data should be separated or protected with a deliberate deletion strategy.",
          "conditions": [
            "events are append-only",
            "personal data is stored in event payloads"
          ],
          "limitations": [
            "The exact regulatory solution depends on jurisdiction and legal interpretation"
          ],
          "provenance": {
            "connectorId": "GH-MICROSOFT-ARCH-CENTER",
            "derivation": "human",
            "exactLocation": true,
            "excerptHash": "seed-event-sourcing-privacy",
            "heading": "Issues and considerations",
            "liveImmutableRevision": false,
            "path": "docs/patterns/event-sourcing.md",
            "repository": "MicrosoftDocs/architecture-center",
            "revision": "seed-2026-07-02"
          },
          "authority": {
            "compositionEligible": false,
            "conformanceEligible": false,
            "descriptiveEligible": true,
            "environment": "controlled-pilot-seed",
            "reasoningEligible": true,
            "scoringEligible": false
          }
        }
      ]
    },
    {
      "id": "PAT-TRANSACTIONAL-OUTBOX",
      "name": "Transactional Outbox",
      "problem": "A service must update its database and notify other systems, but writing to the database and broker separately can leave one side committed while the other fails.",
      "context": [
        "A service owns a transactional database and emits integration events derived from committed state changes.",
        "Cross-resource distributed transactions are unavailable, undesirable or unsupported.",
        "At-least-once publication is acceptable when consumers are idempotent."
      ],
      "prerequisites": [
        "A stable event identifier and idempotency key strategy are defined.",
        "Outbox retention, retry, poison-message and replay procedures are owned.",
        "Event schemas and compatibility policy are governed."
      ],
      "benefits": null,
      "tradeoffs": null,
      "failureModes": [
        "Relay lag can delay downstream visibility and hide growing operational debt.",
        "Poor partitioning or ordering keys can publish related events out of business order.",
        "Deleting outbox rows too early can make recovery or audit impossible.",
        "Transactional Outbox is applied outside its stated context or without prerequisites.",
        "Generated topology exists but required contracts or obligations are not implemented."
      ],
      "counterfactualExplanation": "Do not select Transactional Outbox when prerequisites are absent, a simpler alternative meets the quality scenarios, or the team cannot sustain its operational obligations.",
      "obligations": [
        {
          "category": "operations",
          "description": "Own relay availability, backlog age, retries, poison records, retention and replay procedures.",
          "id": "OBL-OUTBOX-RELAY",
          "mandatory": true,
          "title": "Operate and monitor the outbox relay",
          "verificationHint": "Alert on oldest unpublished record and prove replay from a controlled checkpoint."
        },
        {
          "category": "reliability",
          "description": "Every emitted message carries a stable event identifier and consumers suppress duplicate effects.",
          "id": "OBL-OUTBOX-IDEMPOTENCY",
          "mandatory": true,
          "title": "Enforce downstream idempotency",
          "verificationHint": "Run duplicate-delivery tests and verify one business effect per event identifier."
        }
      ],
      "knowledgeAuthority": {
        "activeUse": "descriptive-and-editorial-composition-only",
        "candidateKnowledgeInfluence": "blocked",
        "compositionReady": true,
        "conformanceReady": false,
        "descriptive": true,
        "discoveryKnowledgeInfluence": "blocked",
        "reasoningReady": false,
        "scoringCalibrated": false,
        "unsupportedNumericalQualityScoresInfluence": "blocked-unless-expert-calibrated-with-live-claim-lineage"
      },
      "lineageSummary": {
        "claimIds": [
          "PCLM-PAT-TRANSACTIONAL-OUTBOX-GH-APACHE-CAMEL-01",
          "PCLM-PAT-TRANSACTIONAL-OUTBOX-GH-ASYNCAPI-02",
          "PCLM-PAT-TRANSACTIONAL-OUTBOX-GH-MICROSOFT-ARCH-CENTER-03"
        ],
        "directSourceClaimCount": 0,
        "editorialSynthesisClaimCount": 3,
        "liveImmutableSourceClaimCount": 0
      },
      "applicabilityRules": [
        "The business change and outbox insert can commit in one local transaction.",
        "Consumers can tolerate at-least-once delivery and implement idempotency.",
        "An outbox relay or change-data-capture mechanism can be operated and monitored."
      ],
      "risks": [
        "Relay lag can delay downstream visibility and hide growing operational debt.",
        "Poor partitioning or ordering keys can publish related events out of business order.",
        "Deleting outbox rows too early can make recovery or audit impossible."
      ],
      "alternatives": [
        "PAT-CHANGE-DATA-CAPTURE",
        "PAT-SAGA-BOUNDARY"
      ],
      "sourcePointer": "/records/69",
      "recordSha256": "e277f877d76f7b3351e998f73f8d9929989b63e0db652bc732f611a4702e06da",
      "claims": []
    },
    {
      "id": "PAT-CIRCUIT-BREAKER",
      "name": "Circuit Breaker",
      "problem": "Repeated calls to an unhealthy dependency consume threads, connections and timeouts, causing local resource exhaustion and propagating a remote failure through the system.",
      "context": [
        "A remote dependency can fail partially or become slow while callers continue receiving traffic.",
        "The caller has a fallback, queued path or explicit degraded response.",
        "Failure rates and latency can be observed at the correct dependency boundary."
      ],
      "prerequisites": [
        "Dependency SLOs, timeout budgets and failure thresholds are defined.",
        "Metrics expose open/half-open state, rejection rate and downstream health.",
        "Retry policies use jitter and are coordinated with the breaker."
      ],
      "benefits": null,
      "tradeoffs": null,
      "failureModes": [
        "Poor thresholds can oscillate between open and closed states or reject healthy traffic.",
        "A fallback can conceal prolonged dependency failure and create silent data quality issues.",
        "Independent breakers across many instances can synchronize recovery probes.",
        "Circuit Breaker is applied outside its stated context or without prerequisites.",
        "Generated topology exists but required contracts or obligations are not implemented."
      ],
      "counterfactualExplanation": "Do not select Circuit Breaker when prerequisites are absent, a simpler alternative meets the quality scenarios, or the team cannot sustain its operational obligations.",
      "obligations": [
        {
          "category": "reliability",
          "description": "Timeout, failure threshold, open duration and half-open probes are derived from measured dependency behavior.",
          "id": "OBL-CB-SLO",
          "mandatory": true,
          "title": "Calibrate breaker thresholds from dependency SLOs",
          "verificationHint": "Load and failure tests demonstrate bounded resource use and controlled recovery."
        },
        {
          "category": "operations",
          "description": "Operations can see state transitions, rejected calls, fallback use and affected business capabilities.",
          "id": "OBL-CB-VISIBILITY",
          "mandatory": true,
          "title": "Expose breaker state and degraded behavior",
          "verificationHint": "Dashboards and alerts identify open circuits and fallback rates per dependency."
        }
      ],
      "knowledgeAuthority": {
        "activeUse": "descriptive-and-editorial-composition-only",
        "candidateKnowledgeInfluence": "blocked",
        "compositionReady": true,
        "conformanceReady": false,
        "descriptive": true,
        "discoveryKnowledgeInfluence": "blocked",
        "reasoningReady": false,
        "scoringCalibrated": false,
        "unsupportedNumericalQualityScoresInfluence": "blocked-unless-expert-calibrated-with-live-claim-lineage"
      },
      "lineageSummary": {
        "claimIds": [
          "PCLM-PAT-CIRCUIT-BREAKER-GH-AWS-SOLUTIONS-CONSTRUCTS-02",
          "PCLM-PAT-CIRCUIT-BREAKER-GH-GCP-MICROSERVICES-DEMO-03",
          "PCLM-PAT-CIRCUIT-BREAKER-GH-MICROSOFT-ARCH-CENTER-01"
        ],
        "directSourceClaimCount": 0,
        "editorialSynthesisClaimCount": 3,
        "liveImmutableSourceClaimCount": 0
      },
      "applicabilityRules": [
        "Timeouts are bounded and shorter than the end-to-end request budget.",
        "Circuit state is scoped per dependency and operation rather than globally.",
        "Fallback behavior is safe, observable and acceptable to the business."
      ],
      "risks": [
        "Poor thresholds can oscillate between open and closed states or reject healthy traffic.",
        "A fallback can conceal prolonged dependency failure and create silent data quality issues.",
        "Independent breakers across many instances can synchronize recovery probes."
      ],
      "alternatives": [
        "PAT-LOAD-SHEDDING",
        "PAT-QUEUE-BASED-LOAD-LEVELING"
      ],
      "sourcePointer": "/records/112",
      "recordSha256": "080e611fbbf28ba28fc87aaea1d703108e7f2f7516217f5892900612cc6747bd",
      "claims": []
    },
    {
      "id": "PAT-RETRY-WITH-BACKOFF",
      "name": "Retry with Backoff",
      "problem": "A temporary network or dependency failure may succeed on a later attempt, but immediate or unlimited retries can multiply traffic and extend outages.",
      "context": [
        "The operation is idempotent or protected by an idempotency key.",
        "Failures can be classified as transient, permanent or unknown.",
        "The retry budget fits within the caller and end-to-end latency objectives."
      ],
      "prerequisites": [
        "Timeouts are shorter than retry and request budgets.",
        "Circuit breaker and load-shedding behavior are coordinated.",
        "Duplicate suppression or idempotency is tested."
      ],
      "benefits": null,
      "tradeoffs": null,
      "failureModes": [
        "Nested retries can create exponential traffic multiplication.",
        "Long retry windows can hold scarce resources and violate user latency targets.",
        "Retrying during overload can prevent the dependency from recovering.",
        "Retry with Backoff is applied outside its stated context or without prerequisites.",
        "Generated topology exists but required contracts or obligations are not implemented."
      ],
      "counterfactualExplanation": "Do not select Retry with Backoff when prerequisites are absent, a simpler alternative meets the quality scenarios, or the team cannot sustain its operational obligations.",
      "obligations": [
        {
          "category": "governance",
          "description": "Assign accountable ownership, measurable acceptance criteria and review cadence for Retry with Backoff.",
          "id": "OBL-RETRY-WITH-BACKOFF-OWNERSHIP",
          "mandatory": true,
          "title": "Own Retry with Backoff lifecycle",
          "verificationHint": "The architecture decision links an owner, quality scenario and review date."
        },
        {
          "category": "operations",
          "description": "Define telemetry, failure handling and fitness functions that prove the intended Retry with Backoff properties.",
          "id": "OBL-RETRY-WITH-BACKOFF-OPERATIONS",
          "mandatory": true,
          "title": "Validate Retry with Backoff in operation",
          "verificationHint": "Automated tests and runtime evidence are attached to the architecture decision."
        }
      ],
      "knowledgeAuthority": {
        "activeUse": "descriptive-and-editorial-composition-only",
        "candidateKnowledgeInfluence": "blocked",
        "compositionReady": true,
        "conformanceReady": false,
        "descriptive": true,
        "discoveryKnowledgeInfluence": "blocked",
        "reasoningReady": false,
        "scoringCalibrated": false,
        "unsupportedNumericalQualityScoresInfluence": "blocked-unless-expert-calibrated-with-live-claim-lineage"
      },
      "lineageSummary": {
        "claimIds": [
          "PCLM-PAT-RETRY-WITH-BACKOFF-GH-AWS-SOLUTIONS-CONSTRUCTS-02",
          "PCLM-PAT-RETRY-WITH-BACKOFF-GH-GCP-MICROSERVICES-DEMO-03",
          "PCLM-PAT-RETRY-WITH-BACKOFF-GH-MICROSOFT-ARCH-CENTER-01"
        ],
        "directSourceClaimCount": 0,
        "editorialSynthesisClaimCount": 3,
        "liveImmutableSourceClaimCount": 0
      },
      "applicabilityRules": [
        "Only explicitly transient errors are retried.",
        "Attempt count, elapsed time and backoff ceiling are bounded.",
        "Jitter is applied and metrics expose retries by dependency and result."
      ],
      "risks": [
        "Nested retries can create exponential traffic multiplication.",
        "Long retry windows can hold scarce resources and violate user latency targets.",
        "Retrying during overload can prevent the dependency from recovering."
      ],
      "alternatives": [
        "PAT-DEAD-LETTER-CHANNEL",
        "PAT-QUEUE-BASED-LOAD-LEVELING"
      ],
      "sourcePointer": "/records/113",
      "recordSha256": "4e6c11a8eeb4cb2cf373d78845da7c9b1d9f625e86f0025ba979620d0164fca9",
      "claims": []
    },
    {
      "id": "PAT-BULKHEAD",
      "name": "Bulkhead",
      "problem": "Shared resource pools allow one slow dependency or high-volume workload to exhaust threads, connections or memory and cause a system-wide outage.",
      "context": [
        "Workloads have different criticality, latency or failure characteristics.",
        "Capacity can be partitioned without violating essential minimum throughput.",
        "The platform can observe saturation and rebalance limits safely."
      ],
      "prerequisites": [
        "Workload classes, priorities and capacity assumptions are documented.",
        "Load tests verify isolation and graceful rejection.",
        "Operational procedures allow safe tuning without restart where possible."
      ],
      "benefits": null,
      "tradeoffs": null,
      "failureModes": [
        "Over-partitioning can waste capacity and reduce total throughput.",
        "Incorrect limits can starve a critical workload or hide a capacity shortage.",
        "Partitions may not isolate failures if they converge on the same database or broker.",
        "Bulkhead is applied outside its stated context or without prerequisites.",
        "Generated topology exists but required contracts or obligations are not implemented."
      ],
      "counterfactualExplanation": "Do not select Bulkhead when prerequisites are absent, a simpler alternative meets the quality scenarios, or the team cannot sustain its operational obligations.",
      "obligations": [
        {
          "category": "governance",
          "description": "Assign accountable ownership, measurable acceptance criteria and review cadence for Bulkhead.",
          "id": "OBL-BULKHEAD-OWNERSHIP",
          "mandatory": true,
          "title": "Own Bulkhead lifecycle",
          "verificationHint": "The architecture decision links an owner, quality scenario and review date."
        },
        {
          "category": "operations",
          "description": "Define telemetry, failure handling and fitness functions that prove the intended Bulkhead properties.",
          "id": "OBL-BULKHEAD-OPERATIONS",
          "mandatory": true,
          "title": "Validate Bulkhead in operation",
          "verificationHint": "Automated tests and runtime evidence are attached to the architecture decision."
        }
      ],
      "knowledgeAuthority": {
        "activeUse": "descriptive-and-editorial-composition-only",
        "candidateKnowledgeInfluence": "blocked",
        "compositionReady": true,
        "conformanceReady": false,
        "descriptive": true,
        "discoveryKnowledgeInfluence": "blocked",
        "reasoningReady": false,
        "scoringCalibrated": false,
        "unsupportedNumericalQualityScoresInfluence": "blocked-unless-expert-calibrated-with-live-claim-lineage"
      },
      "lineageSummary": {
        "claimIds": [
          "PCLM-PAT-BULKHEAD-GH-AWS-SOLUTIONS-CONSTRUCTS-02",
          "PCLM-PAT-BULKHEAD-GH-GCP-MICROSERVICES-DEMO-03",
          "PCLM-PAT-BULKHEAD-GH-MICROSOFT-ARCH-CENTER-01"
        ],
        "directSourceClaimCount": 0,
        "editorialSynthesisClaimCount": 3,
        "liveImmutableSourceClaimCount": 0
      },
      "applicabilityRules": [
        "The isolated resource and failure domain are explicitly identified.",
        "Each partition has saturation metrics, queue limits and rejection behavior.",
        "Critical workloads retain reserved capacity during stress."
      ],
      "risks": [
        "Over-partitioning can waste capacity and reduce total throughput.",
        "Incorrect limits can starve a critical workload or hide a capacity shortage.",
        "Partitions may not isolate failures if they converge on the same database or broker."
      ],
      "alternatives": [
        "PAT-CELL-BASED-ARCHITECTURE",
        "PAT-QUEUE-BASED-LOAD-LEVELING"
      ],
      "sourcePointer": "/records/115",
      "recordSha256": "a5450ed9123f3560015d6569a8750a702b793b7cee673e8b49b1e6a33cf8abb0",
      "claims": []
    },
    {
      "id": "PAT-ZERO-TRUST",
      "name": "Zero Trust",
      "problem": "Perimeter trust allows a compromised internal identity, device or workload to move laterally and access resources beyond its legitimate business purpose.",
      "context": [
        "Users, agents, services or devices access resources across cloud, on-premises and partner boundaries.",
        "Identity, policy decision and telemetry services can be made highly available.",
        "Sensitive data and regulated operations require fine-grained, auditable access decisions."
      ],
      "prerequisites": [
        "Identity lifecycle, device posture and workload identity foundations are mature.",
        "Policy-as-code, secrets management and certificate rotation are automated.",
        "Break-glass access and policy outage behavior are approved and tested."
      ],
      "benefits": null,
      "tradeoffs": null,
      "failureModes": [
        "Policy sprawl can create inconsistent access decisions and difficult incident diagnosis.",
        "Identity or policy service failure can become a broad availability dependency.",
        "Overly aggressive controls can impair frontline or low-connectivity operations.",
        "Zero Trust is applied outside its stated context or without prerequisites.",
        "Generated topology exists but required contracts or obligations are not implemented."
      ],
      "counterfactualExplanation": "Do not select Zero Trust when prerequisites are absent, a simpler alternative meets the quality scenarios, or the team cannot sustain its operational obligations.",
      "obligations": [
        {
          "category": "security",
          "description": "Authentication strength, least-privilege policy, credential lifetime and revocation are centrally governed and tested.",
          "id": "OBL-ZT-POLICY",
          "mandatory": true,
          "title": "Govern policy and identity lifecycle",
          "verificationHint": "Policy tests cover critical allow, deny and break-glass paths."
        },
        {
          "category": "reliability",
          "description": "Each protected operation has approved fail-open or fail-closed behavior and resilient policy enforcement.",
          "id": "OBL-ZT-RESILIENCE",
          "mandatory": true,
          "title": "Design policy-service failure behavior",
          "verificationHint": "Failure exercises verify the approved behavior without uncontrolled access."
        }
      ],
      "knowledgeAuthority": {
        "activeUse": "descriptive-and-editorial-composition-only",
        "candidateKnowledgeInfluence": "blocked",
        "compositionReady": true,
        "conformanceReady": false,
        "descriptive": true,
        "discoveryKnowledgeInfluence": "blocked",
        "reasoningReady": false,
        "scoringCalibrated": false,
        "unsupportedNumericalQualityScoresInfluence": "blocked-unless-expert-calibrated-with-live-claim-lineage"
      },
      "lineageSummary": {
        "claimIds": [
          "PCLM-PAT-ZERO-TRUST-GH-CNCF-TAG-SECURITY-01",
          "PCLM-PAT-ZERO-TRUST-GH-FINOS-CALM-03",
          "PCLM-PAT-ZERO-TRUST-GH-MICROSOFT-ARCH-CENTER-02"
        ],
        "directSourceClaimCount": 0,
        "editorialSynthesisClaimCount": 3,
        "liveImmutableSourceClaimCount": 0
      },
      "applicabilityRules": [
        "Every protected resource has a named owner and data classification.",
        "Workload and user identities are strongly authenticated and short-lived credentials are supported.",
        "Policy decisions and enforcement outcomes are logged without exposing secrets."
      ],
      "risks": [
        "Policy sprawl can create inconsistent access decisions and difficult incident diagnosis.",
        "Identity or policy service failure can become a broad availability dependency.",
        "Overly aggressive controls can impair frontline or low-connectivity operations."
      ],
      "alternatives": [
        "PAT-PERIMETER-SECURITY"
      ],
      "sourcePointer": "/records/137",
      "recordSha256": "a7a2d46256d702c436a454c8d595e6ca26b7a39cde3f2ce4fc4d1392c00bfb4f",
      "claims": []
    }
  ],
  "curationRevision": 2
};
