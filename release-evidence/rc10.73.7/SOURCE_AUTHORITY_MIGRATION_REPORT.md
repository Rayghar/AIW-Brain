# Source Authority Migration Report

```json
{
  "schemaVersion": "aiw-source-authority-migration-report-v1",
  "generatedAt": "2026-07-15T09:07:04.985Z",
  "deterministicFixtureTimestamp": "2026-07-15T00:00:00.000Z",
  "productionAccepted": false,
  "reconciledCounts": {
    "total": 47,
    "previousApproved": 30,
    "previousCandidate": 9,
    "previousDiscoveryOnly": 8,
    "acquisitionApproved": 47
  },
  "inventory": [
    {
      "path": "backend/data/rc10_55-global-architecture-intelligence-source-map.json",
      "sha256": "428f5a7f8b532864b98b27380e58e95b1c2d749c2c815a44c46d042f3a6675c8",
      "bytes": 253103
    },
    {
      "path": "frontend/data/rc10_55-global-architecture-intelligence-source-map.json",
      "sha256": "428f5a7f8b532864b98b27380e58e95b1c2d749c2c815a44c46d042f3a6675c8",
      "bytes": 253103
    },
    {
      "path": "backend/data/sprint7_7-github-knowledge-catalog.json",
      "sha256": "e1da9f479233a9c7eeae83ae0a9619f13ffc07248f3b73a4a0e07a4a024d023e",
      "bytes": 86693
    },
    {
      "path": "frontend/data/sprint7_7-github-knowledge-catalog.json",
      "sha256": "e1da9f479233a9c7eeae83ae0a9619f13ffc07248f3b73a4a0e07a4a024d023e",
      "bytes": 86693
    },
    {
      "path": "knowledge-repository/AKR-0.10.72.0/GITHUB-KNOWLEDGE-CATALOG.json",
      "sha256": "26ed2ee3610f3c73f9a67b34e6f324de035eed1214a787c7b24f9b7c0acb7e9d",
      "bytes": 86684
    },
    {
      "path": "backend/data/rc10_73_5-github-conversion-registry.json",
      "sha256": "32901c08312d0daf90227257afc0910edd3986026c05dda1347a2ead9165cc71",
      "bytes": 102452
    },
    {
      "path": "knowledge-repository/AKR-0.10.73.5/GITHUB-CONVERSION-REGISTRY.json",
      "sha256": "32901c08312d0daf90227257afc0910edd3986026c05dda1347a2ead9165cc71",
      "bytes": 102452
    },
    {
      "path": "backend/data/rc10_73_5-pattern-dna2.1.json",
      "sha256": "bdfb8975f8e1fad42ef30133c56413dfe3c9b385b49e7101b82555927ea919d6",
      "bytes": 4785188
    },
    {
      "path": "backend/data/rc10_73_5-pattern-dna-2-1.json",
      "sha256": "bdfb8975f8e1fad42ef30133c56413dfe3c9b385b49e7101b82555927ea919d6",
      "bytes": 4785188
    },
    {
      "path": "knowledge-repository/AKR-0.10.73.5/PATTERN-DNA-2.1.json",
      "sha256": "bdfb8975f8e1fad42ef30133c56413dfe3c9b385b49e7101b82555927ea919d6",
      "bytes": 4785188
    },
    {
      "path": "backend/data/knowledge-release-manifest.json",
      "sha256": "c30e78c5249e7620b980079c2bbab8693a0c357301e305d4cf81db9333a44839",
      "bytes": 3566
    },
    {
      "path": "frontend/data/knowledge-release-manifest.json",
      "sha256": "d1eae533a23d8c240dbc6290178797df20690a606b0aba855d3eaa678551dae9",
      "bytes": 2739
    },
    {
      "path": "knowledge-repository/AKR-0.10.73.5/knowledge-release-manifest.json",
      "missing": true
    },
    {
      "path": "knowledge-repository/AKR-0.10.72.0/knowledge-release-manifest.json",
      "missing": true
    },
    {
      "path": "release-evidence/rc10.73.6/LIVE_GITHUB_ACQUISITION_SUMMARY.json",
      "sha256": "36c0e2a1e850e32f649a31b36d52a66601ad79b256a95f41418be70167ec006d",
      "bytes": 6481
    },
    {
      "path": "release-evidence/rc10.73.6/GITHUB_CONNECTIVITY_PREFLIGHT.json",
      "sha256": "c6fab94b19c8cc44fe4d5961af4b4c0f588f6c0ca49914a358009aafe30e01e7",
      "bytes": 5926
    }
  ],
  "findings": {
    "missingSourcesFromPriorGovernedEstate": [],
    "duplicates": [],
    "renamedOrMovedRepositories": [],
    "archivedRepositoryMetadata": [
      {
        "currentConnectorId": "GH-STRUCTURIZR-JAVA",
        "currentRepository": "structurizr/java",
        "archivedRelatedRepository": "structurizr/dsl",
        "disposition": "recorded historical ingestion risk; no substitution performed"
      }
    ],
    "inconsistentConnectorIds": [],
    "sourceMapDrift": [
      "AKR-0.10.73.5 conversion registry covers the 30 previously approved repositories, not the 47 acquisition-approved repositories.",
      "rc10.73.6 connectivity and acquisition evidence covers the 30 previously approved repositories only.",
      "The frontend AKR-0.10.72.0 manifest is a legacy static verifier input and is not imported by the product runtime; backend AKR-0.10.73.5 is the canonical governed runtime manifest. The versions must not be merged by relabelling either artifact.",
      "Pattern DNA 2.1 references 23 connectors; 24 governed connectors currently have no Pattern DNA record reference."
    ],
    "patternDnaConnectorCoverage": {
      "referencedCount": 23,
      "unreferencedCount": 24,
      "referenced": [
        "GH-APACHE-CAMEL",
        "GH-ARC42",
        "GH-ARCHUNIT",
        "GH-ARDALIS-CLEAN-ARCH",
        "GH-ASYNCAPI",
        "GH-AWS-SOLUTIONS-CONSTRUCTS",
        "GH-AZURE-RESOURCE-MODULES",
        "GH-CNCF-TAG-SECURITY",
        "GH-CONTEXT-MAPPER-DSL",
        "GH-DDD-CREW",
        "GH-FINOS-AI-RA",
        "GH-FINOS-CALM",
        "GH-GCP-CLOUD-FOUNDATION-FABRIC",
        "GH-GCP-MICROSERVICES-DEMO",
        "GH-GCP-SOFTWARE-DELIVERY-BLUEPRINT",
        "GH-JMOLECULES",
        "GH-JQASSISTANT",
        "GH-K8S-PATTERNS",
        "GH-MESHERY",
        "GH-MICROSOFT-AGENT-SKILLS",
        "GH-MICROSOFT-ARCH-CENTER",
        "GH-OAM-SPEC",
        "GH-OTEL-DEMO"
      ],
      "unreferenced": [
        "GH-ARCHITECTURE-CATALOG",
        "GH-AWESOME-ANTIPATTERN",
        "GH-AWESOME-DESIGN-PATTERNS",
        "GH-AWESOME-SCALABILITY",
        "GH-AWESOME-SOFTWARE-ARCH",
        "GH-AWESOME-SYSTEM-DESIGN-RESOURCES",
        "GH-AWS-SAAS-EKS",
        "GH-AWS-SERVERLESS-PATTERNS",
        "GH-BACKSTAGE",
        "GH-C4-PLANTUML",
        "GH-CNA-QUALITY-MODEL",
        "GH-CNCF-LANDSCAPE-GRAPH",
        "GH-CONTEXT-MAP-DISCOVERY",
        "GH-DEVELOPER-ROADMAP",
        "GH-IBM-CLOUD-NATIVE-PATTERNS",
        "GH-ITATM-REFARCH",
        "GH-JAVA-DESIGN-PATTERNS",
        "GH-LIKEC4",
        "GH-SAP-ARCH-CENTER",
        "GH-SERVICE-MESH-PATTERNS",
        "GH-SPRING-MODULITH",
        "GH-STRUCTURIZR-JAVA",
        "GH-SYSTEM-DESIGN-101",
        "GH-SYSTEM-DESIGN-PRIMER"
      ]
    },
    "knowledgeManifestReconciliation": {
      "canonicalGovernedRuntimeManifest": "backend/data/knowledge-release-manifest.json",
      "canonicalReleaseId": "AKR-0.10.73.5",
      "frontendManifest": "frontend/data/knowledge-release-manifest.json",
      "frontendReleaseId": "AKR-0.10.72.0",
      "frontendDisposition": "legacy-static-verifier-input-not-runtime-authority",
      "silentVersionSubstitutionAllowed": false,
      "productionAccepted": false
    }
  },
  "changes": [
    "Added explicit acquisition permission independently of previous lifecycle authority for all 47 dossiers.",
    "Added differentiated source authority class and candidate-only promotion state.",
    "Added permitted/prohibited uses, licence/security disposition, and last immutable/acquisition state.",
    "Changed default acquisition selection from previous lifecycle approved (30) to acquisition approved (47).",
    "Kept productionAccepted false and prohibited acquisition from granting scoring, hard constraints, conformance, or promotion authority."
  ]
}
```
