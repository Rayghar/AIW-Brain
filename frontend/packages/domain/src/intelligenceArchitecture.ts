export type AiwIntelligenceLayerId = 'knowledge-memory' | 'deterministic-kernel' | 'experience-intelligence' | 'language-faculty';

export interface AiwIntelligenceLayer {
  id: AiwIntelligenceLayerId;
  name: string;
  owns: string[];
  prohibitedAuthority: string[];
}

export const AIW_INTELLIGENCE_LAYERS: readonly AiwIntelligenceLayer[] = [
  {
    id: 'knowledge-memory',
    name: 'Knowledge Memory',
    owns: ['sources', 'claims', 'Pattern DNA', 'quality attributes', 'tactics', 'templates', 'SDD grammar', 'fitness seeds'],
    prohibitedAuthority: ['runtime scoring by itself', 'unreviewed source promotion'],
  },
  {
    id: 'deterministic-kernel',
    name: 'Deterministic Reasoning Kernel',
    owns: ['ranking', 'graph checks', 'obligations', 'review findings', 'recommendations', 'scorecards'],
    prohibitedAuthority: ['ungoverned facts', 'language-only invention'],
  },
  {
    id: 'experience-intelligence',
    name: 'Experience Intelligence',
    owns: ['stage guidance', 'adaptive palette', 'edge interrogation', 'smart defaults', 'receipts', 'health posture'],
    prohibitedAuthority: ['hidden model mutation', 'silent approval'],
  },
  {
    id: 'language-faculty',
    name: 'Language Faculty',
    owns: ['brief extraction', 'clarification questions', 'explanations', 'ADR narrative drafting'],
    prohibitedAuthority: ['scoring', 'HARD severity', 'knowledge promotion', 'architecture mutation'],
  },
] as const;

export type AiwDesignStageId =
  | 'brief'
  | 'stakeholders'
  | 'quality-drivers'
  | 'patterns-and-tactics'
  | 'canvas-modelling'
  | 'review-studio'
  | 'repository-conformance'
  | 'handoff';

export interface AiwStageIntelligenceContract {
  id: AiwDesignStageId;
  label: string;
  kernelResponsibilities: string[];
  knowledgeDependencies: string[];
  uiExpression: string[];
  approvalRule: string;
  offlineCapable: boolean;
}

export const AIW_STAGE_INTELLIGENCE_CONTRACTS: readonly AiwStageIntelligenceContract[] = [
  {
    id: 'brief',
    label: 'Brief',
    kernelResponsibilities: ['extract candidate drivers', 'surface assumptions', 'detect missing context'],
    knowledgeDependencies: ['stakeholder-concern grammar', 'driver taxonomy', 'measurable scenario grammar'],
    uiExpression: ['driver cards', 'assumption panel', 'missing information prompts'],
    approvalRule: 'Draft extractions require user acceptance before model mutation.',
    offlineCapable: true,
  },
  {
    id: 'stakeholders',
    label: 'Stakeholders',
    kernelResponsibilities: ['map motivations', 'map wishes', 'map concerns', 'link concerns to drivers'],
    knowledgeDependencies: ['stakeholder persona grammar', 'SDD reasoning grammar'],
    uiExpression: ['stakeholder matrix', 'concern-to-driver traceability'],
    approvalRule: 'Stakeholder concerns are reviewable records.',
    offlineCapable: true,
  },
  {
    id: 'quality-drivers',
    label: 'Quality Drivers',
    kernelResponsibilities: ['rank drivers', 'detect quality conflicts', 'map drivers to tactics'],
    knowledgeDependencies: ['quality attributes', 'tactic catalog', 'benchmark scenarios'],
    uiExpression: ['weighted driver matrix', 'scenario sliders', 'trade-off receipts'],
    approvalRule: 'Accepted drivers become review obligations.',
    offlineCapable: true,
  },
  {
    id: 'patterns-and-tactics',
    label: 'Patterns and Tactics',
    kernelResponsibilities: ['recommend patterns', 'arm obligations', 'identify trade-offs'],
    knowledgeDependencies: ['Pattern DNA', 'pattern quality matrix', 'architecture tactics'],
    uiExpression: ['adaptive pattern radar', 'obligation panel', 'decision preview'],
    approvalRule: 'Accepted patterns create traceable obligations.',
    offlineCapable: true,
  },
  {
    id: 'canvas-modelling',
    label: 'Canvas Modelling',
    kernelResponsibilities: ['check cohesion', 'check coupling', 'validate boundaries', 'interrogate edges'],
    knowledgeDependencies: ['component grammar', 'integration tactics', 'architecture practices'],
    uiExpression: ['semantic inspector', 'edge pre-commit review', 'obligation badges'],
    approvalRule: 'Model changes remain previewable and reversible.',
    offlineCapable: true,
  },
  {
    id: 'review-studio',
    label: 'Review Studio',
    kernelResponsibilities: ['score readiness', 'generate findings', 'recommend decisions', 'draft ADRs', 'generate fitness tests'],
    knowledgeDependencies: ['active knowledge release', 'Pattern DNA', 'accepted obligations', 'SDD grammar'],
    uiExpression: ['scorecard', 'findings', 'recommendations', 'ADR and test pack'],
    approvalRule: 'Generated ADRs and tests require human acceptance.',
    offlineCapable: true,
  },
  {
    id: 'repository-conformance',
    label: 'Repository Conformance',
    kernelResponsibilities: ['map assets', 'score evidence coverage', 'plan CI fitness loop'],
    knowledgeDependencies: ['repo asset types', 'conformance controls', 'fitness seeds'],
    uiExpression: ['evidence coverage', 'drift report', 'CI plan'],
    approvalRule: 'Repository writes remain disabled until explicit approval.',
    offlineCapable: false,
  },
  {
    id: 'handoff',
    label: 'Architecture Handoff',
    kernelResponsibilities: ['compose SDD', 'assemble ADR pack', 'compose risk register', 'compose backlog'],
    knowledgeDependencies: ['SDD grammar', 'review output', 'canonical architecture model'],
    uiExpression: ['artifact browser', 'ZIP export', 'traceability manifest'],
    approvalRule: 'Export is user-triggered and traceable.',
    offlineCapable: true,
  },
] as const;

export type AiwTierId = 'essential' | 'professional' | 'enterprise' | 'sovereign';

export interface AiwTierCapabilityContract {
  id: AiwTierId;
  label: string;
  promise: string;
  includedCapabilities: string[];
  excludedByDefault: string[];
}

export const AIW_TIER_CAPABILITY_CONTRACTS: readonly AiwTierCapabilityContract[] = [
  {
    id: 'essential',
    label: 'Essential',
    promise: 'Governed architecture judgment that works offline.',
    includedCapabilities: ['deterministic kernel', 'pinned knowledge release', 'guided journey', 'Review Studio', 'SDD/handoff export', 'local project storage'],
    excludedByDefault: ['hosted LLM', 'live repository ingestion', 'tenant admin', 'release promotion'],
  },
  {
    id: 'professional',
    label: 'Professional',
    promise: 'The same governed judgment with language assistance.',
    includedCapabilities: ['Essential', 'brief extraction', 'stage advisor', 'explain ranking', 'ADR narrative drafting'],
    excludedByDefault: ['enterprise release governance', 'multi-route model policy', 'tenant-wide audit'],
  },
  {
    id: 'enterprise',
    label: 'Enterprise',
    promise: 'Architecture intelligence the organization can govern, audit and connect to evidence.',
    includedCapabilities: ['Professional', 'admin control plane', 'knowledge ops', 'release manager', 'repo conformance', 'RBAC/OIDC', 'audit export', 'CI fitness loop'],
    excludedByDefault: ['air-gapped zero-egress'],
  },
  {
    id: 'sovereign',
    label: 'Sovereign',
    promise: 'Enterprise intelligence with no data leaving the environment.',
    includedCapabilities: ['Enterprise', 'zero-egress', 'local LLM route', 'local embeddings', 'air-gapped knowledge pack', 'customer-controlled keys'],
    excludedByDefault: ['hosted telemetry', 'hosted model routes'],
  },
] as const;

export interface AiwKnowledgePackActivationRule {
  id: string;
  description: string;
  required: boolean;
}

export const AIW_KNOWLEDGE_PACK_ACTIVATION_RULES: readonly AiwKnowledgePackActivationRule[] = [
  { id: 'manifest-schema-valid', description: 'The manifest must satisfy the active knowledge-pack schema.', required: true },
  { id: 'all-files-present', description: 'Every file listed in the manifest must be present.', required: true },
  { id: 'checksums-match', description: 'Every listed checksum must match the local file bytes.', required: true },
  { id: 'signature-valid', description: 'The pack signature must validate against a trusted key.', required: true },
  { id: 'released-status', description: 'The release status must be approved or released.', required: true },
  { id: 'kernel-compatible', description: 'The pack must declare compatibility with the running deterministic kernel.', required: true },
  { id: 'pin-allows-release', description: 'Tenant or project pinning must allow the release.', required: true },
] as const;
