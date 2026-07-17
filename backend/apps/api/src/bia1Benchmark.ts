import { createHash } from "node:crypto";
import { z } from "zod";

export const BIA1_ACTOR = {
  reviewActorType: "gpt-5.6-sol",
  humanReviewerPresent: false,
  externallyVerified: false,
  developmentDecisionAuthority: true,
  productionAuthority: false,
} as const;

const requiredString = z.string().min(1);
const stringList = z.array(requiredString);
const tracedItemSchema = z.object({
  id: requiredString,
  name: requiredString,
  description: requiredString,
  responsibility: requiredString,
  requirementIds: stringList,
  qualityDriverIds: stringList,
  riskIds: stringList,
  decisionIds: stringList,
}).strict();

export const bia1ArchitecturePackageSchema = z.object({
  scenarioId: z.enum(["BIA1-S1", "BIA1-S2", "BIA1-S3", "BIA1-S4", "BIA1-S5"]),
  mode: z.enum(["aiw-full-brain", "generic-gpt56-sol", "aiw-deterministic-only"]),
  authority: z.literal("candidate"),
  productionAccepted: z.literal(false),
  problemUnderstanding: z.object({
    businessObjective: requiredString,
    scope: stringList,
    actors: stringList,
    journeys: stringList,
    functionalRequirementIds: stringList,
    qualityDrivers: z.array(z.object({ id: requiredString, statement: requiredString, rationale: requiredString }).strict()),
    constraints: stringList,
    assumptions: stringList,
    ambiguities: stringList,
    unresolvedQuestions: stringList,
  }).strict(),
  architectureViews: z.object({
    systemContext: stringList,
    components: z.array(tracedItemSchema),
    interfaces: z.array(z.object({
      id: requiredString,
      name: requiredString,
      source: requiredString,
      target: requiredString,
      owner: requiredString,
      contract: requiredString,
      consistencyAndFailureSemantics: requiredString,
      securityControls: stringList,
      requirementIds: stringList,
    }).strict()),
    dataArchitecture: stringList,
    securityArchitecture: stringList,
    deploymentRuntime: stringList,
    resilienceFailurePaths: stringList,
    observabilityOperations: stringList,
    transitionArchitecture: stringList,
  }).strict(),
  decisions: z.array(z.object({
    id: requiredString,
    title: requiredString,
    selectedOption: requiredString,
    alternatives: stringList,
    rationale: requiredString,
    tradeoffs: stringList,
    consequences: stringList,
    requirementIds: stringList,
    qualityDriverIds: stringList,
    riskIds: stringList,
  }).strict()),
  risks: z.array(z.object({
    id: requiredString,
    description: requiredString,
    impact: z.enum(["low", "medium", "high", "critical"]),
    mitigation: requiredString,
    owner: requiredString,
    requirementIds: stringList,
  }).strict()),
  traceability: z.array(z.object({
    requirementId: requiredString,
    architectureElementIds: stringList,
    decisionIds: stringList,
    riskIds: stringList,
    evidenceRefs: stringList,
    disposition: z.enum(["satisfied", "partially-satisfied", "unresolved"]),
  }).strict()),
  delivery: z.object({
    executiveSummary: requiredString,
    sddSections: z.array(z.object({ heading: requiredString, content: requiredString }).strict()),
    openIssues: stringList,
    implementationRoadmap: stringList,
    acceptanceAndFitnessTests: stringList,
  }).strict(),
  abstentions: stringList,
  unsupportedClaimsRejected: stringList,
  approvedRecordsChanged: z.literal(0),
  designGraphMutations: z.literal(0),
  automaticPromotions: z.literal(0),
}).strict();

export type Bia1ArchitecturePackage = z.infer<typeof bia1ArchitecturePackageSchema>;

export type Bia1Requirement = {
  id: string;
  kind: "functional" | "quality" | "constraint";
  critical: boolean;
  statement: string;
};

export type Bia1Scenario = {
  schemaVersion: "aiw-bia1-scenario-v1";
  scenarioId: "BIA1-S1" | "BIA1-S2" | "BIA1-S3" | "BIA1-S4" | "BIA1-S5";
  title: string;
  businessObjective: string;
  stakeholders: string[];
  requirements: Bia1Requirement[];
  constraints: string[];
  assumptions: string[];
  knownSystems: string[];
  knownIntegrations: string[];
  knownData: string[];
  knownRisks: string[];
  expectedDeliverables: string[];
  evaluatorOnlyReference?: string;
  productionAccepted: false;
};

const req = (id: string, kind: Bia1Requirement["kind"], critical: boolean, statement: string): Bia1Requirement => ({ id, kind, critical, statement });

export const BIA1_SCENARIOS: Bia1Scenario[] = [
  {
    schemaVersion: "aiw-bia1-scenario-v1", scenarioId: "BIA1-S1", title: "Agency Banking", productionAccepted: false,
    businessObjective: "Enable a regulated financial institution to operate a secure agency-banking channel through approved agents while retaining core-banking authority and controlled financial operations.",
    stakeholders: ["Retail customer", "Agency agent", "Agent supervisor", "Operations", "Customer support", "Fraud and risk", "Compliance", "Information security", "Finance and reconciliation", "Core-banking team", "SRE", "Product owner"],
    requirements: [
      req("AB-FR-001","functional",true,"Register, verify, approve and suspend agency agents."), req("AB-FR-002","functional",true,"Authenticate agents and authorize only permitted operations."), req("AB-FR-003","functional",true,"Onboard customers and complete identity verification."), req("AB-FR-004","functional",true,"Support cash deposits and withdrawals with explicit transaction status."), req("AB-FR-005","functional",true,"Support transfers and balance enquiries through the bank."), req("AB-FR-006","functional",true,"Enforce limits, fees, liquidity and fraud policies before financial posting."), req("AB-FR-007","functional",true,"Prevent duplicate financial processing and safely resolve timeout uncertainty."), req("AB-FR-008","functional",true,"Support controlled reversal, settlement, reconciliation and disputes."), req("AB-FR-009","functional",false,"Issue receipts and notifications without making notification delivery the posting authority."), req("AB-FR-010","functional",true,"Retain immutable audit and operational evidence for every financial action."),
      req("AB-QR-001","quality",true,"Remain available during dependency degradation without unsafe offline financial posting."), req("AB-QR-002","quality",true,"Protect personal and financial data using least privilege, encryption and trust boundaries."), req("AB-QR-003","quality",true,"Provide observable end-to-end transaction correlation, failure detection and reconciliation."), req("AB-QR-004","quality",true,"Define recovery, replay, cutover and rollback controls without inventing unapproved numeric targets."),
      req("AB-C-001","constraint",true,"Core banking remains system of record for customer accounts and financial posting."), req("AB-C-002","constraint",true,"Architecture changes require human approval and traceability."), req("AB-C-003","constraint",false,"Remain provider-neutral until physical technology selection."),
    ],
    constraints: ["External identity and payment-switch services may be unavailable or slow.", "Unconfirmed availability, latency, throughput, RTO and RPO targets must remain open questions."],
    assumptions: ["Agents use managed or registered channels.", "The bank can expose governed core-banking and payment-switch interfaces."],
    knownSystems: ["Agent channel", "Core banking", "Identity/KYC provider", "Payment switch", "Fraud platform", "Reconciliation platform"],
    knownIntegrations: ["Core financial posting", "KYC verification", "Payment routing", "Notification delivery", "Finance settlement"],
    knownData: ["Customer identity", "Agent identity", "Account data", "Transaction journal", "Limits and fees", "Audit evidence"],
    knownRisks: ["Duplicate posting", "Agent fraud", "Dependency timeout ambiguity", "Liquidity shortfall", "Privacy breach", "Reconciliation mismatch"],
    expectedDeliverables: ["Context", "Logical application architecture", "Interfaces", "Data ownership", "Security and fraud controls", "Deployment", "Operations", "ADRs", "Traceability", "SDD"],
    evaluatorOnlyReference: "Agency Banking Solution SDD-Ver0.1.pdf; never provide to a generation mode.",
  },
  {
    schemaVersion: "aiw-bia1-scenario-v1", scenarioId: "BIA1-S2", title: "Event-driven fulfilment", productionAccepted: false,
    businessObjective: "Fulfil customer orders reliably across inventory, payment, warehouse and delivery services while making partial failure and reconciliation explicit.",
    stakeholders: ["Customer", "Commerce product owner", "Warehouse operations", "Finance", "Customer support", "Security", "SRE"],
    requirements: [
      req("EF-FR-001","functional",true,"Accept an order and expose authoritative order status."), req("EF-FR-002","functional",true,"Reserve and release inventory under a named owner."), req("EF-FR-003","functional",true,"Authorize, capture, void or refund payment without duplicate charging."), req("EF-FR-004","functional",true,"Create fulfilment and delivery work with cancellation semantics."), req("EF-FR-005","functional",true,"Reconcile stuck, duplicate and out-of-order events."), req("EF-FR-006","functional",false,"Notify customers of material state changes."),
      req("EF-QR-001","quality",true,"Define consistency boundaries, idempotency keys and event ordering assumptions."), req("EF-QR-002","quality",true,"Contain partial failure using retry, dead-letter, compensation and operator recovery paths."), req("EF-QR-003","quality",true,"Correlate commands, events and business state end to end."), req("EF-QR-004","quality",true,"Authenticate producers and consumers and protect sensitive order and payment data."),
      req("EF-C-001","constraint",true,"No distributed transaction spans payment, inventory and fulfilment systems."),
    ],
    constraints: ["Events may be duplicated, delayed or arrive out of order.", "External payment and delivery providers have independent availability."],
    assumptions: ["Each domain can own a durable transactional store.", "Business operations can define compensation policies."],
    knownSystems: ["Order", "Inventory", "Payment", "Fulfilment", "Delivery", "Notification", "Reconciliation"],
    knownIntegrations: ["Command APIs", "Domain events", "Payment provider", "Carrier API"],
    knownData: ["Order", "Inventory reservation", "Payment intent", "Shipment", "Event journal"],
    knownRisks: ["Duplicate charge", "Oversell", "Orphaned reservation", "Lost event", "Inconsistent cancellation"],
    expectedDeliverables: ["Event boundaries", "Ownership", "Consistency model", "Contracts", "Failure paths", "Operational controls", "Traceability"],
  },
  {
    schemaVersion: "aiw-bia1-scenario-v1", scenarioId: "BIA1-S3", title: "Sensitive analytics platform", productionAccepted: false,
    businessObjective: "Provide governed multi-source analytics for authorised model and BI consumers while protecting personal information and preserving lineage, residency and auditability.",
    stakeholders: ["Data owner", "Data steward", "Analyst", "Data scientist", "Privacy officer", "Security", "Auditor", "SRE"],
    requirements: [
      req("SA-FR-001","functional",true,"Ingest governed data from multiple source systems with source ownership."), req("SA-FR-002","functional",true,"Transform and quality-check data with reproducible lineage."), req("SA-FR-003","functional",true,"Provide role- and purpose-bound access for BI and model consumption."), req("SA-FR-004","functional",true,"Apply retention, legal hold and defensible deletion."), req("SA-FR-005","functional",true,"Provide complete access, transformation and export audit evidence."),
      req("SA-QR-001","quality",true,"Classify, encrypt, mask or tokenise sensitive fields across trust boundaries."), req("SA-QR-002","quality",true,"Enforce regional or jurisdictional data-placement constraints."), req("SA-QR-003","quality",true,"Detect data-quality, lineage and pipeline-health failures."), req("SA-QR-004","quality",true,"Recover analytical data products without losing source lineage or access policy."),
      req("SA-C-001","constraint",true,"Analytical stores are not systems of record for operational source data."),
    ],
    constraints: ["Some records contain direct and indirect identifiers.", "Jurisdiction policies vary by dataset and consumer purpose."],
    assumptions: ["Source owners expose change or extract contracts.", "A governed identity platform provides workforce attributes."],
    knownSystems: ["Source systems", "Ingestion plane", "Processing plane", "Governed analytical store", "BI", "Model platform", "Catalog"],
    knownIntegrations: ["Batch/CDC ingestion", "Identity", "Catalog/lineage", "BI queries", "Model feature access"],
    knownData: ["PII", "Operational facts", "Reference data", "Derived features", "Lineage", "Access audit"],
    knownRisks: ["Re-identification", "Residency breach", "Privilege creep", "Lineage loss", "Stale or poor-quality data"],
    expectedDeliverables: ["Classification", "Trust boundaries", "Access model", "Privacy controls", "Lineage", "Recovery", "Traceability"],
  },
  {
    schemaVersion: "aiw-bia1-scenario-v1", scenarioId: "BIA1-S4", title: "Core banking modernisation", productionAccepted: false,
    businessObjective: "Modernise a legacy core-banking estate through governed coexistence and migration with minimal customer disruption and reversible transition states.",
    stakeholders: ["Retail banking", "Operations", "Payments", "Finance", "Regulatory reporting", "Risk", "Security", "Migration office", "SRE", "Customer support"],
    requirements: [
      req("CB-FR-001","functional",true,"Preserve channel access to customer, account, payment and product capabilities throughout migration."), req("CB-FR-002","functional",true,"Integrate product processing with the general ledger and regulatory reporting."), req("CB-FR-003","functional",true,"Support coexistence routing between legacy and target cores by governed migration state."), req("CB-FR-004","functional",true,"Reconcile data and financial postings before, during and after every migration wave."), req("CB-FR-005","functional",true,"Support controlled cutover, rollback and exception handling."), req("CB-FR-006","functional",true,"Migrate batch workloads and end-of-day dependencies without losing operational control."),
      req("CB-QR-001","quality",true,"Minimise customer disruption and define measurable transition service levels."), req("CB-QR-002","quality",true,"Preserve security, auditability and segregation of duties across coexistence."), req("CB-QR-003","quality",true,"Contain operational and data-integrity risk with rehearsed recovery paths."), req("CB-QR-004","quality",true,"Observe business reconciliation and technical health across both estates."),
      req("CB-C-001","constraint",true,"The legacy core cannot be replaced in a single big-bang event."), req("CB-C-002","constraint",true,"Regulatory and general-ledger obligations remain authoritative throughout transition."),
    ],
    constraints: ["Legacy interfaces and batch windows have incomplete documentation.", "Customer and account migration ordering is constrained by product dependencies."],
    assumptions: ["A migration control plane can hold account-level migration state.", "Parallel reconciliation can compare legacy and target outcomes."],
    knownSystems: ["Legacy core", "Channels", "Payments", "Customer information", "Product processors", "General ledger", "Batch scheduler", "Regulatory reporting", "Target core"],
    knownIntegrations: ["Channel APIs", "Payment rails", "GL posting", "Batch files", "Regulatory extracts"],
    knownData: ["Customer", "Account", "Product", "Balance", "Transaction", "Ledger", "Migration state", "Reconciliation evidence"],
    knownRisks: ["Dual posting", "Data divergence", "Failed cutover", "Batch overrun", "Regulatory misreporting", "Customer disruption"],
    expectedDeliverables: ["Current-state diagnosis", "Target architecture", "Transition states", "Migration waves", "Cutover/rollback", "Data strategy", "Risk register", "ADRs"],
  },
  {
    schemaVersion: "aiw-bia1-scenario-v1", scenarioId: "BIA1-S5", title: "AI-powered agentic application", productionAccepted: false,
    businessObjective: "Deliver an enterprise agentic application that coordinates specialist capabilities and tools while bounding autonomy, data access, failure and cost.",
    stakeholders: ["End user", "Business owner", "Human approver", "Security", "Privacy", "Model risk", "Tool owner", "Platform engineering", "SRE", "Auditor"],
    requirements: [
      req("AA-FR-001","functional",true,"Accept user goals and decompose them into governed tasks."), req("AA-FR-002","functional",true,"Coordinate specialist agents or capabilities without implicit privilege sharing."), req("AA-FR-003","functional",true,"Invoke allowlisted tools under explicit purpose, scope and approval policy."), req("AA-FR-004","functional",true,"Maintain governed working and durable memory with retention and tenant boundaries."), req("AA-FR-005","functional",true,"Escalate high-impact, ambiguous or failed actions to a human."), req("AA-FR-006","functional",true,"Record auditable plans, decisions, tool calls, approvals and outcomes."),
      req("AA-QR-001","quality",true,"Resist prompt injection and untrusted tool or retrieved content."), req("AA-QR-002","quality",true,"Contain model, agent and tool failure without cascading authority."), req("AA-QR-003","quality",true,"Enforce data classification, least privilege and tenant isolation."), req("AA-QR-004","quality",true,"Observe quality, safety, latency, cost and policy decisions end to end."),
      req("AA-C-001","constraint",true,"No model or agent may directly mutate approved enterprise state."), req("AA-C-002","constraint",true,"High-impact external actions require deterministic policy and explicit approval."),
    ],
    constraints: ["Models may fail, hallucinate or be unavailable.", "Tool results and retrieved content are untrusted inputs."],
    assumptions: ["Tools expose bounded APIs and service identities.", "A policy engine and approval service are available."],
    knownSystems: ["User experience", "Orchestrator", "Specialist agents", "Tool gateway", "Policy engine", "Memory", "Approval service", "Audit/evaluation plane"],
    knownIntegrations: ["Model gateway", "Enterprise tools", "Identity", "Policy", "Observability", "Evaluation"],
    knownData: ["User goal", "Plan", "Tool inputs/outputs", "Working memory", "Durable memory", "Approval", "Audit evidence"],
    knownRisks: ["Prompt injection", "Excessive agency", "Data leakage", "Tool misuse", "Runaway loop", "Cost/latency runaway", "Unauditable delegation"],
    expectedDeliverables: ["Agent boundaries", "Orchestration", "Tool permissions", "Memory", "Control plane", "Failure containment", "Audit", "Evaluation", "Deployment", "Traceability"],
  },
];

export const BIA1_RUBRIC = {
  schemaVersion: "aiw-bia1-rubric-v1",
  frozen: true,
  totalPoints: 100,
  categories: [
    { id: "requirements", name: "Requirements and problem understanding", weight: 12 },
    { id: "quality", name: "Quality-driver reasoning", weight: 10 },
    { id: "coherence", name: "Architecture coherence", weight: 16 },
    { id: "functional", name: "Functional completeness", weight: 10 },
    { id: "interfaces", name: "Interfaces and data ownership", weight: 10 },
    { id: "security", name: "Security, privacy and resilience", weight: 12 },
    { id: "decisions", name: "Decisions, alternatives and trade-offs", weight: 10 },
    { id: "traceability", name: "Requirement-to-design traceability", weight: 10 },
    { id: "grounding", name: "Evidence grounding and unsupported-claim control", weight: 5 },
    { id: "usefulness", name: "Practicality, clarity and SDD usefulness", weight: 5 },
  ],
  aiwFullBrainGates: { overallScore: 85, criticalRequirementCoverage: 95, criticalInterfaceCompleteness: 90, criticalTraceability: 95, criticalSecurityAndResilienceOmissions: 0, unsupportedConsequentialClaims: 0, architectureCoherenceFivePoint: 4, practicalUsefulnessFivePoint: 4 },
  differentiation: { primaryMarginPoints: 10, nearParityPoints: 3, nearParityRequiresMaterialAiwLifecycleAdvantage: true },
  productionAccepted: false,
} as const;

export const BIA1_CRITICAL_OMISSIONS = [
  "unresolved-critical-security-omission", "unresolved-critical-resilience-omission", "missing-critical-interface",
  "mandatory-requirement-contradiction", "unsupported-consequential-claim", "material-component-without-responsibility",
  "material-interface-without-owner", "critical-requirement-without-traceability", "missing-transition-architecture",
  "unbounded-agent-tool-authority", "direct-approved-state-mutation",
] as const;

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a],[b]) => a.localeCompare(b)).map(([key,item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function sha256(value: unknown): string {
  return `sha256:${createHash("sha256").update(typeof value === "string" ? value : canonicalJson(value)).digest("hex")}`;
}

export const BIA1_GOLD_EXPECTATIONS = BIA1_SCENARIOS.map((scenario) => ({
  scenarioId: scenario.scenarioId,
  evaluationOnly: true,
  generationAccessProhibited: true,
  criticalRequirementIds: scenario.requirements.filter((item) => item.critical).map((item) => item.id),
  requiredConcernTerms: scenario.scenarioId === "BIA1-S1" ? ["core banking system of record", "idempotency", "reversal", "reconciliation", "fraud", "liquidity", "least privilege", "audit", "dependency degradation"]
    : scenario.scenarioId === "BIA1-S2" ? ["order ownership", "inventory reservation", "payment idempotency", "outbox", "compensation", "dead letter", "reconciliation", "correlation"]
    : scenario.scenarioId === "BIA1-S3" ? ["classification", "tokenisation or masking", "purpose-bound access", "residency", "lineage", "retention", "audit", "recovery"]
    : scenario.scenarioId === "BIA1-S4" ? ["coexistence", "migration state", "strangler", "reconciliation", "cutover", "rollback", "general ledger", "batch", "regulatory reporting"]
    : ["agent boundary", "tool allowlist", "least privilege", "approval", "prompt injection", "memory boundary", "failure containment", "audit", "evaluation"],
  requiredInterfaceConcerns: scenario.knownIntegrations,
  transitionRequired: scenario.scenarioId === "BIA1-S4",
  agentBoundedAuthorityRequired: scenario.scenarioId === "BIA1-S5",
  alternativeArchitecturesPermitted: true,
}));
