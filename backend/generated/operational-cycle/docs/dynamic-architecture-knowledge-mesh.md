# Dynamic Architecture Knowledge Mesh

Connectors: **43**
Approved connectors: **30**
Discovery-only connectors: **4**
Seed verified claims: **14**
Claims requiring contradiction review: **0**

## Governance model

1. Retrieve only allowlisted repository paths and create a quarantined snapshot.
2. Use an LLM to extract atomic claims, conditions, limitations and source locations.
3. Deterministically validate source, path, schema, duplication and contradiction posture.
4. Require architecture-expert review and recommendation regression tests.
5. Publish a signed, versioned knowledge release; never auto-publish source or LLM output.

## Source tiers

- Tier 1: official specifications, foundations and vendor architecture centres.
- Tier 2: mature architecture methods, modelling tools and conformance platforms.
- Tier 3: executable reference implementations and curated examples.
- Tier 4: discovery indexes only; these cannot influence production recommendations directly.

## Connector catalogue

- **FINOS Common Architecture Language Model (CALM)** (finos/architecture-as-code) — Tier 1; approved; uses: claim-evidence, pattern-extraction, component-taxonomy, topology-template, interoperability-adapter, architecture-test-generation.
- **Microsoft Azure Architecture Center** (MicrosoftDocs/architecture-center) — Tier 1; approved; uses: claim-evidence, pattern-extraction, anti-pattern-extraction, component-taxonomy, reference-example, quality-attribute-calibration.
- **AWS Serverless Patterns Collection** (aws-samples/serverless-patterns) — Tier 1; approved; uses: pattern-extraction, component-taxonomy, topology-template, reference-example.
- **AWS Solutions Constructs** (awslabs/aws-solutions-constructs) — Tier 1; approved; uses: component-taxonomy, pattern-extraction, topology-template, reference-example.
- **Azure Common Resource Modules / Verified Modules** (Azure/ResourceModules) — Tier 1; approved; uses: component-taxonomy, topology-template, reference-example, interoperability-adapter.
- **Google Cloud Foundation Fabric** (GoogleCloudPlatform/cloud-foundation-fabric) — Tier 1; approved; uses: component-taxonomy, topology-template, reference-example, interoperability-adapter.
- **Domain-Driven Design Crew Methods** (ddd-crew/ddd-starter-modelling-process) — Tier 2; approved; uses: claim-evidence, pattern-extraction, topology-template, reference-example.
- **Apache Camel Enterprise Integration Patterns** (apache/camel) — Tier 1; approved; uses: pattern-extraction, component-taxonomy, topology-template, reference-example.
- **AsyncAPI Specification and Tooling** (asyncapi/spec) — Tier 1; approved; uses: claim-evidence, component-taxonomy, interoperability-adapter, architecture-test-generation, reference-example.
- **Open Application Model** (oam-dev/spec) — Tier 2; approved; uses: component-taxonomy, interoperability-adapter, topology-template, claim-evidence.
- **Kubernetes Patterns Examples** (k8spatterns/examples) — Tier 2; approved; uses: pattern-extraction, topology-template, component-taxonomy, reference-example.
- **Service Mesh Patterns** (service-mesh-patterns/service-mesh-patterns) — Tier 2; approved; uses: pattern-extraction, topology-template, component-taxonomy, reference-example.
- **LikeC4** (likec4/likec4) — Tier 2; approved; uses: interoperability-adapter, reference-example, component-taxonomy.
- **Structurizr DSL and Java Model** (structurizr/java) — Tier 1; approved; uses: interoperability-adapter, reference-example, architecture-test-generation.
- **C4-PlantUML** (plantuml-stdlib/C4-PlantUML) — Tier 2; approved; uses: interoperability-adapter, reference-example.
- **arc42 Architecture Documentation Template** (arc42/arc42-template) — Tier 2; approved; uses: claim-evidence, interoperability-adapter, reference-example.
- **ArchUnit** (TNG/ArchUnit) — Tier 1; approved; uses: architecture-test-generation, reference-example, interoperability-adapter.
- **jQAssistant** (jQAssistant/jqassistant) — Tier 1; approved; uses: architecture-test-generation, interoperability-adapter, component-taxonomy, reference-example.
- **Backstage Software Catalog** (backstage/backstage) — Tier 1; approved; uses: component-taxonomy, interoperability-adapter, reference-example.
- **FINOS AI Reference Architecture Library** (finos/ai-reference-architecture-library) — Tier 1; approved; uses: claim-evidence, topology-template, component-taxonomy, reference-example.
- **SAP Architecture Center** (SAP/architecture-center) — Tier 1; approved; uses: reference-example, component-taxonomy, topology-template, claim-evidence.
- **CNCF TAG Security Reference Architectures** (cncf/tag-security) — Tier 1; approved; uses: claim-evidence, pattern-extraction, quality-attribute-calibration, topology-template.
- **IBM Cloud-Native Patterns** (IBM/cloud-native-patterns) — Tier 2; candidate; uses: pattern-extraction, topology-template, reference-example.
- **Cloud-Native Architecture Quality Model** (r0light/cna-quality-model) — Tier 2; candidate; uses: quality-attribute-calibration, claim-evidence, anti-pattern-extraction.
- **OpenTelemetry Astronomy Shop Demo** (open-telemetry/opentelemetry-demo) — Tier 1; approved; uses: reference-example, component-taxonomy, topology-template, architecture-test-generation.
- **Google Cloud Microservices Demo** (GoogleCloudPlatform/microservices-demo) — Tier 1; approved; uses: reference-example, component-taxonomy, topology-template, architecture-test-generation.
- **Google Cloud Software Delivery Blueprint** (GoogleCloudPlatform/software-delivery-blueprint) — Tier 1; approved; uses: reference-example, component-taxonomy, topology-template, claim-evidence.
- **AWS SaaS Factory EKS Reference Architecture** (aws-samples/aws-saas-factory-eks-reference-architecture) — Tier 1; approved; uses: reference-example, topology-template, component-taxonomy, claim-evidence.
- **Microsoft Agent Skills — Azure Architecture** (MicrosoftDocs/agent-skills) — Tier 2; candidate; uses: reference-example, discovery-only.
- **Java Design Patterns** (iluwatar/java-design-patterns) — Tier 3; candidate; uses: pattern-extraction, reference-example, component-taxonomy.
- **Awesome Software and Architectural Design Patterns** (DovAmir/awesome-design-patterns) — Tier 4; discovery-only; uses: discovery-only.
- **Awesome Software Architecture** (mehdihadeli/awesome-software-architecture) — Tier 4; discovery-only; uses: discovery-only.
- **Awesome Anti-Pattern Index** (fauzisho/awesome-antipattern) — Tier 4; discovery-only; uses: discovery-only.
- **System Design Primer** (donnemartin/system-design-primer) — Tier 4; discovery-only; uses: discovery-only, reference-example.
- **jMolecules Architectural Abstractions** (xmolecules/jmolecules) — Tier 2; approved; uses: component-taxonomy, pattern-extraction, architecture-test-generation, reference-example, interoperability-adapter.
- **Spring Modulith** (spring-projects/spring-modulith) — Tier 2; approved; uses: component-taxonomy, architecture-test-generation, reference-example, interoperability-adapter, claim-evidence.
- **Context Mapper DSL** (ContextMapper/context-mapper-dsl) — Tier 2; approved; uses: pattern-extraction, component-taxonomy, interoperability-adapter, topology-template, reference-example.
- **Context Mapper Discovery Library** (ContextMapper/context-map-discovery) — Tier 2; candidate; uses: interoperability-adapter, architecture-test-generation, reference-example.
- **CNCF Landscape Graph** (cncf/landscape-graph) — Tier 2; candidate; uses: component-taxonomy, discovery-only, interoperability-adapter.
- **Meshery Models and Design Templates** (meshery/meshery) — Tier 2; approved; uses: component-taxonomy, topology-template, interoperability-adapter, reference-example.
- **Git-native Architecture Catalog** (ea-toolkit/architecture-catalog) — Tier 3; candidate; uses: interoperability-adapter, component-taxonomy, reference-example.
- **it@M Reference Architecture Components** (it-at-m/refarch) — Tier 3; candidate; uses: component-taxonomy, reference-example, topology-template.
- **Ardalis Clean Architecture Template** (ardalis/CleanArchitecture) — Tier 3; candidate; uses: reference-example, pattern-extraction, architecture-test-generation.

## Safety boundary

Repository content is untrusted input. Embedded instructions are ignored, content is license-scoped and size-limited, credentials stay outside project data, and publication remains human-controlled.