import { useEffect, useMemo, useState } from 'react';
import {
  BrainCircuit,
  CheckCircle2,
  ClipboardCheck,
  DatabaseZap,
  Flag,
  GitBranch,
  LibraryBig,
  ListChecks,
  RefreshCw,
  Route,
  ScrollText,
  ServerCog,
  ShieldCheck,
  UserCog,
  SlidersHorizontal,
  KeyRound,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { getJson, postJson, putJson, deleteJson } from '../../lib/apiClient';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { StudioActionStrip, StudioDataTable, StudioOperatorChecklist, StudioPipelineBoard, StudioWorkflowPanel, type StudioPipelineStep } from '../../components/StudioSpecialistSurfaces';

type Tab = 'overview' | 'production' | 'models' | 'repositories' | 'repoPilot' | 'mindFactory' | 'sources' | 'patterns' | 'releases' | 'security' | 'tenant' | 'audit';
const ADMIN_TAB_IDS: Tab[] = ['overview', 'production', 'models', 'repositories', 'repoPilot', 'mindFactory', 'sources', 'patterns', 'releases', 'security', 'tenant', 'audit'];

type ControlPlaneSnapshot = {
  generatedAt: string;
  readiness: number;
  counts: { modelRoutes: number; activeModelRoutes: number; repositoryConnectors: number; knowledgeSources: number; approvedProductionSources: number; auditEvents: number; featureFlags: number; roleAssignments?: number; tenantPolicies?: number };
  safety: { llmIsAuthority: false; repositoryWritesDefaultDisabled: true; candidateKnowledgeCanScore: false; productionFinalizationFailClosed: true };
};

type AdminSummary = {
  knowledge: { releaseId: string; totalRecords: number; candidateRecords: number; productionRecords: number; unresolvedContradictions: number };
  queues: { claimReview: number; contradictions: number; sourceRefresh: number };
  queuesRecordedDecisions: { claims: number; triage: number };
  releasePins: unknown[];
  llm: { configured: boolean; provider: string | null };
  githubMesh: { enabled: boolean };
};

type ModelRoute = {
  id: string;
  provider: string;
  model: string;
  purpose: string;
  enabled: boolean;
  deterministicOnly: boolean;
  structuredOutputRequired?: boolean;
  allowedWorkspaces?: string[];
  dataSensitivity?: string;
  environmentScope?: string;
  updatedBy?: string;
  updatedAt?: string;
};

type RepositoryConnector = {
  id: string;
  provider: string;
  repositoryUrl: string;
  defaultBranch?: string;
  allowedPaths?: string[];
  evidenceKinds: string[];
  writeEnabled: boolean;
  prRequiresApproval: boolean;
  architectureMutationRequiresApproval?: boolean;
  evidenceClassificationRequired?: boolean;
  lastTestResult?: string;
};

type KnowledgeSource = {
  id: string;
  title: string;
  sourceType?: string;
  posture?: string;
  status?: string;
  licence?: string;
  reviewOwner?: string;
  trustTier?: string;
  refreshCadenceDays?: number;
};

type AuditEvent = { at: string; actor: string; action: string; subject: string; detail: string };

type TenantSettingsPayload = { settings: Record<string, { key?: string; value?: unknown; updatedAt?: string; updatedBy?: string } | unknown>; flags: Record<string, { flag?: string; enabled?: boolean; scope?: string; updatedAt?: string; updatedBy?: string } | boolean> };

type RoleAssignment = { assignmentId: string; subject: string; email?: string; roles: string[]; source: string; active: boolean; updatedAt: string; expiresAt?: string };
type RoleMappingRule = { ruleId: string; claim: string; match: string; roles: string[]; enabled: boolean; updatedAt: string };
type TenantPolicy = { tenantId: string; mode: string; requireSso: boolean; allowDevelopmentAuth: boolean; allowedIdentityProviderIds: string[]; auditRetentionDays: number; repositoryWritePolicy: string; candidateKnowledgePolicy: string; updatedAt: string };
type SecurityPosture = { generatedAt: string; mode: string; summary: { passed: number; failed: number; productionReady: boolean }; guardrails: Record<string, string | boolean>; checks: Array<{ checkId: string; ok: boolean; severity: string; detail: string }>; principal?: { subject: string; roles: string[]; authMode: string } };
type SecurityPayload = { roles: string[]; defaultRolePermissions: Record<string, string[]>; assignments: RoleAssignment[]; mappingRules: RoleMappingRule[] };
type TenantPolicyPayload = { policies: TenantPolicy[] };
type PerformancePayload = { generatedAt: string; checks: Array<{ checkId: string; ok: boolean; measurement: string; threshold: string; recommendation: string }> };

type RepositoryAssetDetection = { kind: string; path: string; confidence: number; reason: string; controlsSeeded: string[] };
type RepositoryConformanceControl = { id: string; title: string; evidenceKind: string; sourcePath: string; severity: string; fitnessTestSeed: string; humanApprovalRequired: boolean };
type RepositoryPilotScan = { scanId: string; connectorId: string; completedAt: string; coverage: { coverageScore: number; detectedKinds: string[]; missingKinds: string[]; detections: RepositoryAssetDetection[]; writePolicy: string; architectureMutationPolicy: string }; controls: RepositoryConformanceControl[]; warnings: string[] };
type CiFitnessLoopPlan = { connectorId: string; generatedAt: string; workflowName: string; requiredInputs: string[]; proposedChecks: string[]; prCreation: string; repositoryWrites: string };
type RuntimeEvidenceIngestionPlan = { connectorId: string; generatedAt: string; sources: string[]; acceptedFormats: string[]; runtimeMutationPolicy: string };
type RepositoryPilotPayload = { connectors: RepositoryConnector[]; scans: RepositoryPilotScan[]; fitnessLoops: CiFitnessLoopPlan[]; runtimePlans: RuntimeEvidenceIngestionPlan[]; doctrine: Record<string, string> };

type MindFactorySnapshot = { snapshotId: string; sourceId: string; sourceTitle: string; status: string; license?: string; contentHash: string; capturedAt: string };
type MindFactoryClaim = { claimId: string; subject: string; predicate: string; status: string; nonScoring: boolean; reviewerRequired: boolean; confidence: string };
type MindFactoryJob = { jobId: string; operation: string; status: string; workerQueue: string; queuedAt: string; queuedBy: string; sourceId?: string; snapshotId?: string; releaseId?: string };
type MindFactoryActivation = { packId: string; releaseId: string; tenantId: string; activationMode: string; pinned: boolean; activatedAt: string };
type MindFactoryTimelineEvent = { at: string; actor: string; action: string; subject: string; detail: string; phase: string };
type MindFactoryPayload = { pipeline: string[]; counts: Record<string, number>; snapshots: MindFactorySnapshot[]; candidateClaims: MindFactoryClaim[]; workerJobs: MindFactoryJob[]; packExports: Array<{ packId: string; releaseId: string; signature?: { value?: string } }>; activations: MindFactoryActivation[]; providerBindings?: Array<{ planId: string; provider: string; mode: string; readiness: string }>; kmsGuides?: Array<{ guideId: string; provider: string; zeroEgressPosture: string }>; aiwKpackExports?: Array<{ fileName: string; manifest: { releaseId: string; packId: string } }>; aiwKpackImports?: Array<{ status: string; releaseId?: string; packId?: string }>; timeline: MindFactoryTimelineEvent[]; authority: Record<string, unknown> };


type PatternDnaEditableField = 'qualityAttributeImpact' | 'obligations' | 'risks' | 'mitigations' | 'pairsWellWith' | 'conflictsWith' | 'aliases' | 'vendorRealizations' | 'requires' | 'fitnessTestMappings' | 'impactNote';
type PatternSummary = { id: string; name: string; category: string; status: string; draft?: boolean; curated?: boolean; impacts?: Record<string, number>; aliases?: string[]; pairsWellWith?: string[]; conflictsWith?: string[]; obligations?: string[]; risks?: string[]; mitigations?: string[]; vendorRealizations?: string[]; requires?: string[]; evidence?: string[]; impactNote?: string };
type PatternDnaEditRecord = { editId: string; patternId: string; field: PatternDnaEditableField; value: unknown; editor: string; rationale: string; stagedAt: string; status: string };
type PatternDnaPayload = { summary: { totalPatterns: number; draftOrUncuratedPatterns: number; stagedEdits: number; obligationCoverage: number; evidenceCoverage: number; compatibilityCoverage: number }; staged: number; stagedEdits: PatternDnaEditRecord[]; patterns: PatternSummary[] };

type ReleaseValidation = { allowed: boolean; checkedAt?: string; checks?: Array<{ id: string; ok: boolean; severity?: string; detail: string }> };
type ReleaseCandidate = { candidateId: string; status: string; baseReleaseId: string; proposedReleaseId?: string; createdBy?: string; createdAt?: string; updatedAt?: string; changeCount: number; validation?: ReleaseValidation };
type ReleaseManifest = { releaseId: string; candidateId: string; baseReleaseId: string; promotedBy: string; promotedAt: string; changeCount: number; provenance?: { candidateKnowledgeInfluence?: string; llmAuthority?: string } };
type ReleasePin = { scope: string; scopeId: string; releaseId: string; pinnedBy: string; pinnedAt: string };


const routeDefaults = { id: '', provider: 'openai', model: '', purpose: 'architecture-reasoning', dataSensitivity: 'internal', environmentScope: 'local' };
const connectorDefaults = { id: '', provider: 'github', repositoryUrl: '', defaultBranch: 'main', evidenceKinds: 'adr,docs,openapi', allowedPaths: 'docs,adr,openapi,asyncapi,terraform,kubernetes,.github/workflows' };
const sourceDefaults = { id: '', title: '', sourceType: 'repository', licence: '', reviewOwner: '', trustTier: 'candidate', refreshCadenceDays: '30' };
const flagDefaults = { flag: '', enabled: true };
const roleAssignmentDefaults = { subject: '', email: '', roles: 'auditor', source: 'manual', active: true };
const roleMappingDefaults = { claim: 'groups', match: 'AIW-Architects', roles: 'enterprise-architect', enabled: true };
const tenantPolicyDefaults = { mode: 'pilot', requireSso: false, allowDevelopmentAuth: true, allowedIdentityProviderIds: 'idp-reference-development', auditRetentionDays: '365', repositoryWritePolicy: 'deny', candidateKnowledgePolicy: 'blocked-from-production' };
const pinDefaults = { scope: 'tenant', scopeId: 'default', releaseId: '' };

const ADMIN_LOCAL_GUIDES: Record<Tab, { title: string; detail: string; actions: string[] }> = {
  overview: {
    title: 'Local control center preview',
    detail: 'The control-plane overview is showing deterministic defaults and bundled readiness posture until the Admin API responds.',
    actions: ['Start the backend API', 'Configure ADMIN_API_BASE_URL or Vite proxy', 'Refresh the control plane'],
  },
  production: {
    title: 'Production readiness preview',
    detail: 'Readiness checks are visible as a launch checklist, but live evidence, worker status and release pins need backend connectivity.',
    actions: ['Connect PostgreSQL/pgvector', 'Enable worker service', 'Load release manifests and audit evidence'],
  },
  models: {
    title: 'Model route local mode',
    detail: 'AIW remains deterministic-only until governed LLM routes and provider secrets are available from the backend.',
    actions: ['Create a model route in the API', 'Store provider keys in secrets', 'Run a route test before enabling'],
  },
  repositories: {
    title: 'Repository connector local mode',
    detail: 'Repository evidence is disabled in local preview. Connectors must be registered as read-only before scans can run.',
    actions: ['Create a read-only connector', 'Set allowed paths and evidence kinds', 'Run connector test and pilot scan'],
  },
  repoPilot: {
    title: 'Repository pilot awaiting evidence',
    detail: 'Pilot scans, CI fitness loops and runtime ingestion plans require a configured repository connector.',
    actions: ['Register connector', 'Run pilot scan', 'Generate controls and fitness loop plan'],
  },
  mindFactory: {
    title: 'Mind Factory local mode',
    detail: 'The knowledge pipeline is visible, but snapshots, claims, worker jobs and activations require the Admin API and worker runtime.',
    actions: ['Capture source snapshot', 'Queue extraction job', 'Export and activate signed knowledge pack'],
  },
  sources: {
    title: 'Knowledge source local mode',
    detail: 'Bundled sources may still display, but registered source posture and refresh history need backend storage.',
    actions: ['Register source', 'Assign review owner', 'Set trust tier and refresh cadence'],
  },
  patterns: {
    title: 'Pattern DNA local mode',
    detail: 'Pattern relationships remain readable, but staged edits and release candidate creation require backend persistence.',
    actions: ['Stage Pattern DNA edit', 'Preview release impact', 'Promote through knowledge release gates'],
  },
  releases: {
    title: 'Release manager local mode',
    detail: 'Release validation, approval, promotion and pinning are disabled until the release API is available.',
    actions: ['Validate candidate', 'Approve with reviewer identity', 'Promote and pin release'],
  },
  security: {
    title: 'Security and RBAC local mode',
    detail: 'Security posture is shown as a configuration path; live role assignments and tenant policy checks need backend identity services.',
    actions: ['Configure OIDC/SSO', 'Map claims to roles', 'Run RLS acceptance'],
  },
  tenant: {
    title: 'Tenant settings local mode',
    detail: 'Feature flags and policies need tenant persistence before they can govern production behaviour.',
    actions: ['Save tenant policy', 'Set feature flags', 'Verify policy audit trail'],
  },
  audit: {
    title: 'Audit trail local mode',
    detail: 'Audit rows are empty until backend mutations are recorded. This state is safe for local preview, not production proof.',
    actions: ['Perform governed admin change', 'Refresh audit trail', 'Export audit evidence'],
  },
};

function AdminLocalModePanel({ tab, reason }: { tab: Tab; reason: string | null }) {
  const guide = ADMIN_LOCAL_GUIDES[tab];
  return (
    <article className="admin-local-tab-guide" role="note" aria-label="Admin local mode guidance">
      <WifiOff size={17}/>
      <div>
        <strong>{guide.title}</strong>
        <p>{guide.detail}</p>
        <ul>{guide.actions.map((action) => <li key={action}>{action}</li>)}</ul>
        {reason ? <small>Connection detail: {reason}</small> : null}
      </div>
    </article>
  );
}


const ADMIN_DEMO_SEED = {
  snapshot: {
    generatedAt: new Date().toISOString(),
    readiness: 82,
    counts: { modelRoutes: 2, activeModelRoutes: 1, repositoryConnectors: 2, knowledgeSources: 4, approvedProductionSources: 2, auditEvents: 3, featureFlags: 3, roleAssignments: 3, tenantPolicies: 1 },
    safety: { llmIsAuthority: false as false, repositoryWritesDefaultDisabled: true as true, candidateKnowledgeCanScore: false as false, productionFinalizationFailClosed: true as true },
  },
  summary: {
    knowledge: { releaseId: 'AKR-0.88-demo', totalRecords: 218, candidateRecords: 14, productionRecords: 184, unresolvedContradictions: 2 },
    queues: { claimReview: 8, contradictions: 2, sourceRefresh: 3 },
    queuesRecordedDecisions: { claims: 11, triage: 5 },
    releasePins: [{ scope: 'tenant', releaseId: 'AKR-0.88-demo' }],
    llm: { configured: true, provider: 'governed-route' },
    githubMesh: { enabled: true },
  },
  routes: [
    { id: 'coarchitect-primary', provider: 'openai', model: 'gpt-4.1-mini', purpose: 'guided-authoring', enabled: true, deterministicOnly: false, structuredOutputRequired: true, dataSensitivity: 'internal', environmentScope: 'pilot', updatedBy: 'demo-admin', updatedAt: new Date().toISOString() },
    { id: 'deterministic-fallback', provider: 'offline-deterministic', model: 'kernel', purpose: 'architecture-reasoning', enabled: true, deterministicOnly: true, dataSensitivity: 'internal', environmentScope: 'local', updatedBy: 'system', updatedAt: new Date().toISOString() },
  ],
  connectors: [
    { id: 'payments-platform-main', provider: 'github', repositoryUrl: 'https://github.com/example/payments-platform', defaultBranch: 'main', allowedPaths: ['docs','adr','openapi','.github/workflows'], evidenceKinds: ['adr','openapi','workflow'], writeEnabled: false, prRequiresApproval: true, architectureMutationRequiresApproval: true, evidenceClassificationRequired: true, lastTestResult: 'demo-ready' },
    { id: 'mobile-channel-evidence', provider: 'github', repositoryUrl: 'https://github.com/example/mobile-channel', defaultBranch: 'main', allowedPaths: ['docs','architecture'], evidenceKinds: ['docs','diagram'], writeEnabled: false, prRequiresApproval: true, architectureMutationRequiresApproval: true, evidenceClassificationRequired: true, lastTestResult: 'demo-ready' },
  ],
  sources: [
    { id: 'cambridge-sdd', title: 'Cambridge SDD Reasoning Grammar', sourceType: 'document', posture: 'approved', status: 'production', licence: 'approved-internal-reference', reviewOwner: 'Knowledge Curator', trustTier: 'approved', refreshCadenceDays: 90 },
    { id: 'pattern-dna-library', title: 'Pattern DNA Library', sourceType: 'repository', posture: 'approved', status: 'production', licence: 'curated', reviewOwner: 'Architecture Council', trustTier: 'approved', refreshCadenceDays: 30 },
  ],
  audit: [
    { at: new Date().toISOString(), actor: 'demo-admin', action: 'seeded', subject: 'control-plane', detail: 'Demo seed loaded for offline operator walkthrough.' },
    { at: new Date(Date.now() - 3600000).toISOString(), actor: 'knowledge-curator', action: 'approved', subject: 'AKR-0.88-demo', detail: 'Signed knowledge pack approved for demo tenant.' },
    { at: new Date(Date.now() - 7200000).toISOString(), actor: 'platform-architect', action: 'tested', subject: 'repository connector', detail: 'Repository connector validated as read-only.' },
  ],
  releaseCandidates: [{ candidateId: 'AKR-0.89-candidate', status: 'validation-ready', baseReleaseId: 'AKR-0.88-demo', changeCount: 12 }],
  releaseManifests: [{ releaseId: 'AKR-0.88-demo', candidateId: 'AKR-0.88-candidate', baseReleaseId: 'AKR-0.87', promotedBy: 'knowledge-curator', promotedAt: new Date().toISOString(), changeCount: 34 }],
  releasePins: [{ scope: 'tenant', scopeId: 'demo-tenant', releaseId: 'AKR-0.88-demo', pinnedBy: 'demo-admin', pinnedAt: new Date().toISOString() }],
};

const patternEditDefaults = { patternId: '', field: 'obligations' as PatternDnaEditableField, value: '', rationale: '' };
const mindSnapshotDefaults = { sourceId: 'cambridge-sdd', sourceTitle: 'Cambridge SDD Reasoning Grammar', sourceType: 'document', license: 'approved-internal-reference', provenanceUrl: 'file://cambridge-sdd', content: 'stakeholders drivers quality attributes decisions trade-offs risks components interfaces SDD architecture views' };
const mindPackDefaults = { releaseId: 'akr-reference-release', tenantId: 'tenant-reference', activationMode: 'enterprise-tenant' };


function safeDate(value?: string) {
  if (!value) return '—';
  return value.slice(0, 19).replace('T', ' ');
}

function splitCsv(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function StatusPill({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={active ? 'admin-pill admin-pill--ok' : 'admin-pill'}>{active ? <CheckCircle2 size={12}/> : null}{children}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="admin-field"><span>{label}</span>{children}</label>;
}

export function AdminControlPlaneWorkspace() {
  const experienceProfile = useWorkspaceStore((state) => state.experienceProfile);
  const [tab, setTab] = useState<Tab>(() => {
    const saved = typeof window === 'undefined' ? null : window.sessionStorage.getItem('aiw.activeAdminTab');
    return saved && ADMIN_TAB_IDS.includes(saved as Tab) ? saved as Tab : 'overview';
  });
  const [snapshot, setSnapshot] = useState<ControlPlaneSnapshot | null>(null);
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [routes, setRoutes] = useState<ModelRoute[]>([]);
  const [connectors, setConnectors] = useState<RepositoryConnector[]>([]);
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [bundledSources, setBundledSources] = useState<KnowledgeSource[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [releaseCandidates, setReleaseCandidates] = useState<ReleaseCandidate[]>([]);
  const [releaseManifests, setReleaseManifests] = useState<ReleaseManifest[]>([]);
  const [releasePins, setReleasePins] = useState<ReleasePin[]>([]);
  const [repoPilot, setRepoPilot] = useState<RepositoryPilotPayload | null>(null);
  const [mindFactory, setMindFactory] = useState<MindFactoryPayload | null>(null);
  const [patternDna, setPatternDna] = useState<PatternDnaPayload | null>(null);
  const [patternDraft, setPatternDraft] = useState(patternEditDefaults);
  const [tenant, setTenant] = useState<TenantSettingsPayload>({ settings: {}, flags: {} });
  const [security, setSecurity] = useState<SecurityPayload | null>(null);
  const [securityPosture, setSecurityPosture] = useState<SecurityPosture | null>(null);
  const [tenantPolicies, setTenantPolicies] = useState<TenantPolicy[]>([]);
  const [performanceChecks, setPerformanceChecks] = useState<PerformancePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [degradedReason, setDegradedReason] = useState<string | null>(null);
  const [demoSeedLoaded, setDemoSeedLoaded] = useState(false);
  const [routeDraft, setRouteDraft] = useState(routeDefaults);
  const [connectorDraft, setConnectorDraft] = useState(connectorDefaults);
  const [sourceDraft, setSourceDraft] = useState(sourceDefaults);
  const [flagDraft, setFlagDraft] = useState(flagDefaults);
  const [roleDraft, setRoleDraft] = useState(roleAssignmentDefaults);
  const [roleMapDraft, setRoleMapDraft] = useState(roleMappingDefaults);
  const [tenantPolicyDraft, setTenantPolicyDraft] = useState(tenantPolicyDefaults);
  const [pinDraft, setPinDraft] = useState(pinDefaults);
  const [mindSnapshotDraft, setMindSnapshotDraft] = useState(mindSnapshotDefaults);
  const [mindPackDraft, setMindPackDraft] = useState(mindPackDefaults);

  useEffect(() => {
    const handler = (event: Event) => {
      const next = (event as CustomEvent<{ tab?: string }>).detail?.tab;
      if (next && ADMIN_TAB_IDS.includes(next as Tab)) { window.sessionStorage.setItem('aiw.activeAdminTab', next); setTab(next as Tab); }
    };
    window.addEventListener('aiw:admin-tab', handler);
    return () => window.removeEventListener('aiw:admin-tab', handler);
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      if (experienceProfile === 'reviewer') {
        const auditData = await getJson<{ events: AuditEvent[] }>('/api/admin/audit');
        setAudit(auditData.events);
        setDegradedReason(null);
        setDemoSeedLoaded(false);
        return;
      }

      if (experienceProfile === 'knowledge-curator') {
        const [sourceData, auditData, releaseData, manifestData, pinData, patternData, mindFactoryData] = await Promise.all([
          getJson<{ bundled: KnowledgeSource[]; registered: KnowledgeSource[] }>('/api/admin/knowledge-sources'),
          getJson<{ events: AuditEvent[] }>('/api/admin/audit'),
          getJson<{ candidates: ReleaseCandidate[] }>('/api/knowledge-releases'),
          getJson<{ manifests: ReleaseManifest[] }>('/api/knowledge-releases/released'),
          getJson<{ pins: ReleasePin[] }>('/api/knowledge-releases/pins'),
          getJson<PatternDnaPayload>('/api/admin/pattern-dna'),
          getJson<MindFactoryPayload>('/api/admin/mind-factory'),
        ]);
        setBundledSources(sourceData.bundled);
        setSources(sourceData.registered);
        setAudit(auditData.events);
        setReleaseCandidates(releaseData.candidates);
        setReleaseManifests(manifestData.manifests);
        setReleasePins(pinData.pins);
        setPatternDna(patternData);
        setMindFactory(mindFactoryData);
        setDegradedReason(null);
        setDemoSeedLoaded(false);
        return;
      }

      if (experienceProfile === 'enterprise-architect') {
        const [sourceData, auditData, releaseData, manifestData, pinData] = await Promise.all([
          getJson<{ bundled: KnowledgeSource[]; registered: KnowledgeSource[] }>('/api/admin/knowledge-sources'),
          getJson<{ events: AuditEvent[] }>('/api/admin/audit'),
          getJson<{ candidates: ReleaseCandidate[] }>('/api/knowledge-releases'),
          getJson<{ manifests: ReleaseManifest[] }>('/api/knowledge-releases/released'),
          getJson<{ pins: ReleasePin[] }>('/api/knowledge-releases/pins'),
        ]);
        setBundledSources(sourceData.bundled);
        setSources(sourceData.registered);
        setAudit(auditData.events);
        setReleaseCandidates(releaseData.candidates);
        setReleaseManifests(manifestData.manifests);
        setReleasePins(pinData.pins);
        setDegradedReason(null);
        setDemoSeedLoaded(false);
        return;
      }

      const [snapshotData, summaryData, routeData, connectorData, sourceData, auditData, tenantData, releaseData, manifestData, pinData, patternData, repoPilotData, mindFactoryData, securityData, securityPostureData, tenantPolicyData, performanceData] = await Promise.all([
        getJson<ControlPlaneSnapshot>('/api/admin/control-plane'),
        getJson<AdminSummary>('/api/admin/summary'),
        getJson<{ routes: ModelRoute[] }>('/api/admin/model-routes'),
        getJson<{ connectors: RepositoryConnector[] }>('/api/admin/repository-connectors'),
        getJson<{ bundled: KnowledgeSource[]; registered: KnowledgeSource[] }>('/api/admin/knowledge-sources'),
        getJson<{ events: AuditEvent[] }>('/api/admin/audit'),
        getJson<TenantSettingsPayload>('/api/admin/tenant-settings'),
        getJson<{ candidates: ReleaseCandidate[] }>('/api/knowledge-releases'),
        getJson<{ manifests: ReleaseManifest[] }>('/api/knowledge-releases/released'),
        getJson<{ pins: ReleasePin[] }>('/api/knowledge-releases/pins'),
        getJson<PatternDnaPayload>('/api/admin/pattern-dna'),
        getJson<RepositoryPilotPayload>('/api/admin/repository-conformance/pilot'),
        getJson<MindFactoryPayload>('/api/admin/mind-factory'),
        getJson<SecurityPayload>('/api/admin/security/roles'),
        getJson<SecurityPosture>('/api/admin/security/posture'),
        getJson<TenantPolicyPayload>('/api/admin/security/tenant-policies'),
        getJson<PerformancePayload>('/api/admin/security/performance-checks'),
      ]);
      setSnapshot(snapshotData);
      setSummary(summaryData);
      setRoutes(routeData.routes);
      setConnectors(connectorData.connectors);
      setBundledSources(sourceData.bundled);
      setSources(sourceData.registered);
      setAudit(auditData.events);
      setReleaseCandidates(releaseData.candidates);
      setReleaseManifests(manifestData.manifests);
      setReleasePins(pinData.pins);
      setPatternDna(patternData);
      setRepoPilot(repoPilotData);
      setMindFactory(mindFactoryData);
      setTenant(tenantData);
      setSecurity(securityData);
      setSecurityPosture(securityPostureData);
      setTenantPolicies(tenantPolicyData.policies);
      setPerformanceChecks(performanceData);
      setDegradedReason(null);
      setDemoSeedLoaded(false);
    } catch (error) {
      const reason = String((error as { message?: string }).message ?? error);
      setDegradedReason(reason);
      setNotice(null);
    } finally {
      setLoading(false);
    }
  };

  const loadDemoSeed = () => {
    setSnapshot(ADMIN_DEMO_SEED.snapshot);
    setSummary(ADMIN_DEMO_SEED.summary);
    setRoutes(ADMIN_DEMO_SEED.routes);
    setConnectors(ADMIN_DEMO_SEED.connectors);
    setSources(ADMIN_DEMO_SEED.sources);
    setBundledSources([]);
    setAudit(ADMIN_DEMO_SEED.audit);
    setReleaseCandidates(ADMIN_DEMO_SEED.releaseCandidates);
    setReleaseManifests(ADMIN_DEMO_SEED.releaseManifests);
    setReleasePins(ADMIN_DEMO_SEED.releasePins);
    setTenant({ settings: { mode: { key: 'mode', value: 'demo-pilot', updatedAt: new Date().toISOString(), updatedBy: 'demo-admin' } }, flags: { brainAlive: { flag: 'brainAlive', enabled: true, scope: 'demo', updatedAt: new Date().toISOString(), updatedBy: 'demo-admin' }, quietIntelligence: { flag: 'quietIntelligence', enabled: true, scope: 'demo', updatedAt: new Date().toISOString(), updatedBy: 'demo-admin' } } });
    setSecurity({ roles: ['administrator', 'solution-architect', 'reviewer'], defaultRolePermissions: { administrator: ['admin:*'], 'solution-architect': ['design:write'], reviewer: ['review:read'] }, assignments: [
      { assignmentId: 'demo-admin', subject: 'demo-admin', email: 'admin@example.com', roles: ['administrator'], source: 'demo-seed', active: true, updatedAt: new Date().toISOString() },
      { assignmentId: 'demo-architect', subject: 'demo-architect', email: 'architect@example.com', roles: ['solution-architect'], source: 'demo-seed', active: true, updatedAt: new Date().toISOString() },
    ], mappingRules: [{ ruleId: 'demo-aiw-admins', claim: 'groups', match: 'AIW-Admins', roles: ['administrator'], enabled: true, updatedAt: new Date().toISOString() }] });
    setTenantPolicies([{ tenantId: 'demo-tenant', mode: 'pilot', requireSso: false, allowDevelopmentAuth: true, allowedIdentityProviderIds: ['idp-demo'], auditRetentionDays: 365, repositoryWritePolicy: 'deny', candidateKnowledgePolicy: 'blocked-from-production', updatedAt: new Date().toISOString() }]);
    setPerformanceChecks({ generatedAt: new Date().toISOString(), checks: [
      { checkId: 'postgres-ready', ok: true, measurement: 'demo', threshold: 'configured', recommendation: 'Connect production PostgreSQL before launch.' },
      { checkId: 'audit-present', ok: true, measurement: '3 events', threshold: '>=1', recommendation: 'Use immutable audit storage in production.' },
    ] });
    setDegradedReason('Demo seed loaded locally. Backend API still required for production mutations.');
    setDemoSeedLoaded(true);
    setNotice('Admin demo seed loaded. Use this for local walkthroughs; connect backend services before production.');
  };

  useEffect(() => { void refresh(); }, [experienceProfile]);

  const readiness = snapshot?.readiness ?? 0;
  const productionSafe = snapshot ? Object.values(snapshot.safety).every((value) => value === true || value === false) && !snapshot.safety.llmIsAuthority && snapshot.safety.repositoryWritesDefaultDisabled && snapshot.safety.productionFinalizationFailClosed : false;
  const allTabs: Array<{ id: Tab; label: string; icon: React.ReactNode; count?: number }> = [
    { id: 'overview', label: 'Control center', icon: <ServerCog size={15}/> },
    { id: 'production', label: 'Production readiness', icon: <ClipboardCheck size={15}/> },
    { id: 'models', label: 'Model routes', icon: <BrainCircuit size={15}/>, count: routes.length },
    { id: 'repositories', label: 'Repositories', icon: <GitBranch size={15}/>, count: connectors.length },
    { id: 'repoPilot', label: 'Repo pilot', icon: <DatabaseZap size={15}/>, count: repoPilot?.scans.length ?? 0 },
    { id: 'mindFactory', label: 'Mind factory', icon: <BrainCircuit size={15}/>, count: (mindFactory?.counts.snapshots ?? 0) + (mindFactory?.counts.workerJobs ?? 0) + (mindFactory?.counts.activations ?? 0) },
    { id: 'sources', label: 'Knowledge sources', icon: <LibraryBig size={15}/>, count: sources.length + bundledSources.length },
    { id: 'patterns', label: 'Pattern DNA', icon: <LibraryBig size={15}/>, count: patternDna?.staged ?? 0 },
    { id: 'releases', label: 'Releases', icon: <ClipboardCheck size={15}/>, count: releaseCandidates.length + releaseManifests.length },
    { id: 'security', label: 'Security & RBAC', icon: <UserCog size={15}/>, count: (security?.assignments.length ?? 0) + tenantPolicies.length },
    { id: 'tenant', label: 'Tenant & flags', icon: <SlidersHorizontal size={15}/>, count: Object.keys(tenant.flags).length },
    { id: 'audit', label: 'Audit trail', icon: <ScrollText size={15}/>, count: audit.length },
  ];
  const allowedTabsByRole: Partial<Record<typeof experienceProfile, Tab[]>> = {
    reviewer: ['audit'],
    'knowledge-curator': ['mindFactory','sources','patterns','releases','audit'],
    'enterprise-architect': ['releases','sources','audit'],
  };
  const allowedTabs = allowedTabsByRole[experienceProfile];
  const tabs = allowedTabs ? allTabs.filter((item) => allowedTabs.includes(item.id)) : allTabs;

  useEffect(() => {
    if (!allowedTabs || allowedTabs.includes(tab)) return;
    setTab(allowedTabs[0] ?? 'overview');
  }, [experienceProfile, tab]);

  const captureMindSnapshot = async () => {
    if (!mindSnapshotDraft.sourceId || !mindSnapshotDraft.content) { setNotice('Mind Factory source id and content are required.'); return; }
    await postJson(`/api/admin/mind-factory/sources/${encodeURIComponent(mindSnapshotDraft.sourceId)}/snapshot`, mindSnapshotDraft);
    setNotice('Mind Factory snapshot captured into quarantine. Candidate claims remain non-scoring.');
    await refresh();
  };

  const extractLatestMindClaims = async () => {
    const latest = mindFactory?.snapshots?.[mindFactory.snapshots.length - 1];
    if (!latest) { setNotice('Capture a source snapshot first.'); return; }
    await postJson(`/api/admin/mind-factory/snapshots/${latest.snapshotId}/extract-claims`, { content: mindSnapshotDraft.content });
    setNotice('Candidate claims extracted. Reviewer approval and release promotion are still required.');
    await refresh();
  };

  const normalizeMindClaims = async () => {
    await postJson('/api/admin/mind-factory/claims/normalize', {});
    setNotice('Mind Factory claims normalized for duplicates, synonyms, contradictions and corroboration.');
    await refresh();
  };

  const previewMindReleaseImpact = async () => {
    await postJson('/api/admin/mind-factory/release-impact-preview', { baseReleaseId: 'akr-current', candidateReleaseId: mindPackDraft.releaseId });
    setNotice('Release impact preview generated. Candidate knowledge remains preview-only.');
    await refresh();
  };

  const queueMindWorker = async (operation: 'source-refresh' | 'claim-extraction') => {
    const path = operation === 'source-refresh' ? '/api/admin/mind-factory/jobs/source-refresh' : '/api/admin/mind-factory/jobs/claim-extraction';
    const latest = mindFactory?.snapshots?.[mindFactory.snapshots.length - 1];
    await postJson(path, operation === 'source-refresh' ? { sourceId: mindSnapshotDraft.sourceId } : { snapshotId: latest?.snapshotId });
    setNotice(`${operation} worker plan queued for target-environment execution.`);
    await refresh();
  };

  const exportMindPack = async () => {
    const result = await postJson<{ manifest: { packId: string; releaseId: string } }>('/api/admin/mind-factory/knowledge-pack/export', { releaseId: mindPackDraft.releaseId });
    setNotice(`Knowledge pack manifest exported: ${result.manifest.packId}.`);
    await refresh();
  };

  const activateLatestMindPack = async () => {
    const manifest = mindFactory?.packExports?.[mindFactory.packExports.length - 1];
    if (!manifest) { setNotice('Export a signed knowledge pack manifest first.'); return; }
    await postJson('/api/admin/mind-factory/knowledge-pack/activate', { manifest, tenantId: mindPackDraft.tenantId, activationMode: mindPackDraft.activationMode });
    setNotice('Knowledge pack activation verified and recorded for tenant/project pinning.');
    await refresh();
  };

  const createProviderFetchPlan = async () => {
    await postJson('/api/admin/mind-factory/provider-bindings/repository/fetch-plan', { connectorId: connectors[0]?.id, provider: connectors[0]?.provider ?? 'github', repositoryUrl: connectors[0]?.repositoryUrl ?? 'https://github.com/example/aiw-reference', allowedPaths: connectors[0]?.allowedPaths ?? ['docs/architecture','adr','openapi'], tokenRef: 'AIW_GITHUB_TOKEN', allowLiveNetwork: false });
    setNotice('Read-only provider fetch plan created. Output remains quarantined.');
    await refresh();
  };

  const createKmsGuide = async () => {
    await postJson('/api/admin/mind-factory/provider-bindings/kms/guide', { provider: 'reference-local', keyRef: 'aiw/reference/mind-factory' });
    setNotice('KMS provider binding guide created. Key material is never stored.');
    await refresh();
  };

  const exportAiwKpack = async () => {
    const manifest = mindFactory?.packExports?.[mindFactory.packExports.length - 1];
    if (!manifest) { setNotice('Export a signed pack manifest first.'); return; }
    const result = await postJson<{ fileName: string }>('/api/admin/mind-factory/aiw-kpack/export', { manifest, tenantId: mindPackDraft.tenantId });
    setNotice(`.aiw-kpack envelope exported: ${result.fileName}.`);
    await refresh();
  };

  const importLatestAiwKpack = async () => {
    const envelope = mindFactory?.aiwKpackExports?.[mindFactory.aiwKpackExports.length - 1];
    if (!envelope) { setNotice('Export an .aiw-kpack envelope first.'); return; }
    await postJson('/api/admin/mind-factory/aiw-kpack/import', { envelope, tenantId: mindPackDraft.tenantId });
    setNotice('.aiw-kpack verified. Activation still requires explicit pinning.');
    await refresh();
  };

  const registerRoute = async () => {
    if (!routeDraft.id || !routeDraft.model) { setNotice('Route id and model are required.'); return; }
    await postJson('/api/admin/model-routes', { ...routeDraft, structuredOutputRequired: true, allowedWorkspaces: ['activation','synthesis','patterns','governance'] });
    setNotice('Model route saved. LLM remains enrichment-only, never authority.');
    setRouteDraft(routeDefaults);
    await refresh();
  };

  const toggleRoute = async (route: ModelRoute) => {
    await putJson(`/api/admin/model-routes/${route.id}`, { ...route, enabled: !route.enabled });
    setNotice(`Route ${route.id} ${route.enabled ? 'disabled' : 'enabled'}.`);
    await refresh();
  };

  const deleteRoute = async (route: ModelRoute) => {
    await deleteJson(`/api/admin/model-routes/${route.id}`);
    setNotice(`Route ${route.id} deleted.`);
    await refresh();
  };

  const testRoute = async (route: ModelRoute) => {
    const result = await postJson<{ providerConfigured: boolean; authority: string }>(`/api/admin/model-routes/${route.id}/test`, {});
    setNotice(`Route ${route.id} test: providerConfigured=${result.providerConfigured}; authority=${result.authority}.`);
    await refresh();
  };

  const registerConnector = async () => {
    if (!connectorDraft.id || !connectorDraft.repositoryUrl) { setNotice('Connector id and repository URL are required.'); return; }
    await postJson('/api/admin/repository-connectors', { ...connectorDraft, allowedPaths: splitCsv(connectorDraft.allowedPaths), evidenceKinds: splitCsv(connectorDraft.evidenceKinds), writeEnabled: false });
    setNotice('Repository connector registered read-only. PR and architecture mutation require explicit approval.');
    setConnectorDraft(connectorDefaults);
    await refresh();
  };

  const testConnector = async (connector: RepositoryConnector) => {
    const result = await postJson<{ configValid: boolean; credentialPresent: boolean; liveScan: string }>(`/api/admin/repository-connectors/${connector.id}/test`, {});
    setNotice(`Connector ${connector.id}: config=${result.configValid}; credential=${result.credentialPresent}; ${result.liveScan}`);
    await refresh();
  };


  const scanConnector = async (connector: RepositoryConnector) => {
    const result = await postJson<{ scan: RepositoryPilotScan }>(`/api/admin/repository-conformance/connectors/${connector.id}/scan`, {});
    setNotice(`Repository scan ${result.scan.scanId}: ${result.scan.coverage.coverageScore}% evidence coverage; ${result.scan.controls.length} controls seeded.`);
    await refresh();
  };

  const generateRepositoryControls = async (connector: RepositoryConnector) => {
    const result = await postJson<{ controls: RepositoryConformanceControl[] }>(`/api/admin/repository-conformance/connectors/${connector.id}/generate-controls`, {});
    setNotice(`${result.controls.length} repository conformance controls generated. Human approval required before enforcement.`);
    await refresh();
  };

  const generateFitnessLoop = async (connector: RepositoryConnector) => {
    const result = await postJson<{ plan: CiFitnessLoopPlan }>(`/api/admin/repository-conformance/connectors/${connector.id}/fitness-loop`, {});
    setNotice(`CI fitness-loop plan generated: ${result.plan.workflowName}; PR creation remains preview-only.`);
    await refresh();
  };

  const generateRuntimeEvidencePlan = async (connector: RepositoryConnector) => {
    const result = await postJson<{ plan: RuntimeEvidenceIngestionPlan }>(`/api/admin/repository-conformance/connectors/${connector.id}/runtime-ingestion`, {});
    setNotice(`Runtime evidence plan generated for ${result.plan.sources.length} evidence source(s).`);
    await refresh();
  };

  const registerSource = async () => {
    if (!sourceDraft.id || !sourceDraft.title) { setNotice('Source id and title are required.'); return; }
    await postJson('/api/admin/knowledge-sources', { ...sourceDraft, refreshCadenceDays: Number(sourceDraft.refreshCadenceDays || 30) });
    setNotice('Knowledge source registered into discovery posture. Approval requires licence and review owner.');
    setSourceDraft(sourceDefaults);
    await refresh();
  };

  const changeSourcePosture = async (source: KnowledgeSource, target: string) => {
    await postJson(`/api/admin/knowledge-sources/${source.id}/posture`, { target });
    setNotice(`Source ${source.id} moved to ${target}.`);
    await refresh();
  };

  const saveFlag = async () => {
    if (!flagDraft.flag) { setNotice('Feature flag name is required.'); return; }
    await postJson('/api/admin/feature-flags', flagDraft);
    setNotice(`Feature flag ${flagDraft.flag} saved.`);
    setFlagDraft(flagDefaults);
    await refresh();
  };

  const validateRelease = async (candidate: ReleaseCandidate) => {
    const result = await postJson<{ validation: ReleaseValidation }>(`/api/knowledge-releases/${candidate.candidateId}/validate`, { openContradictions: 0, licenseBlockers: 0, regressionFailures: 0, candidateInfluencesProduction: false });
    setNotice(`Candidate ${candidate.candidateId} validation: ${result.validation.allowed ? 'allowed' : 'blocked'}.`);
    await refresh();
  };

  const approveRelease = async (candidate: ReleaseCandidate) => {
    await postJson(`/api/knowledge-releases/${candidate.candidateId}/approve`, {});
    setNotice(`Candidate ${candidate.candidateId} approved for promotion.`);
    await refresh();
  };

  const promoteRelease = async (candidate: ReleaseCandidate) => {
    await postJson(`/api/knowledge-releases/${candidate.candidateId}/promote`, { releaseId: candidate.proposedReleaseId || undefined });
    setNotice(`Candidate ${candidate.candidateId} promoted into a governed knowledge release.`);
    await refresh();
  };

  const rollbackRelease = async (candidate: ReleaseCandidate) => {
    await postJson(`/api/knowledge-releases/${candidate.candidateId}/rollback`, { reason: 'Admin rollback requested from release manager.' });
    setNotice(`Candidate ${candidate.candidateId} rolled back.`);
    await refresh();
  };

  const pinRelease = async () => {
    if (!pinDraft.releaseId || !pinDraft.scopeId) { setNotice('Release id and scope id are required.'); return; }
    await postJson('/api/knowledge-releases/pin', pinDraft);
    setNotice(`Release ${pinDraft.releaseId} pinned to ${pinDraft.scope}:${pinDraft.scopeId}.`);
    setPinDraft(pinDefaults);
    await refresh();
  };



  const parsePatternValue = () => {
    if (patternDraft.field === 'qualityAttributeImpact') {
      try { return JSON.parse(patternDraft.value || '{}') as Record<string, number>; } catch { return {}; }
    }
    if (patternDraft.field === 'impactNote') return patternDraft.value;
    return splitCsv(patternDraft.value);
  };

  const stagePatternEdit = async () => {
    if (!patternDraft.patternId || !patternDraft.rationale) { setNotice('Pattern and rationale are required.'); return; }
    const result = await postJson<{ edit: PatternDnaEditRecord; stagedCount: number }>(`/api/admin/pattern-dna/${patternDraft.patternId}/stage`, { field: patternDraft.field, value: parsePatternValue(), rationale: patternDraft.rationale });
    setNotice(`Pattern DNA edit staged: ${result.edit.patternId}.${result.edit.field}. ${result.stagedCount} active staged edit(s).`);
    setPatternDraft(patternEditDefaults);
    await refresh();
  };

  const discardPatternEdit = async (edit: PatternDnaEditRecord) => {
    await deleteJson(`/api/admin/pattern-dna/staged/${edit.editId}`);
    setNotice(`Discarded Pattern DNA edit ${edit.editId}.`);
    await refresh();
  };

  const materializePatternCandidate = async () => {
    const result = await postJson<{ candidate: { candidateId: string; changeCount: number } }>('/api/admin/pattern-dna/candidate', {});
    setNotice(`Pattern DNA candidate created: ${result.candidate.candidateId} with ${result.candidate.changeCount} change(s).`);
    await refresh();
  };



  const saveRoleAssignment = async () => {
    if (!roleDraft.subject || !roleDraft.roles) { setNotice('Subject and roles are required.'); return; }
    await postJson('/api/admin/security/role-assignments', { ...roleDraft, roles: splitCsv(roleDraft.roles) });
    setNotice(`Role assignment saved for ${roleDraft.subject}.`);
    setRoleDraft(roleAssignmentDefaults);
    await refresh();
  };

  const saveRoleMapping = async () => {
    if (!roleMapDraft.claim || !roleMapDraft.match || !roleMapDraft.roles) { setNotice('Claim, match value and roles are required.'); return; }
    await postJson('/api/admin/security/role-mapping-rules', { ...roleMapDraft, roles: splitCsv(roleMapDraft.roles) });
    setNotice(`OIDC role mapping saved for ${roleMapDraft.claim}=${roleMapDraft.match}.`);
    setRoleMapDraft(roleMappingDefaults);
    await refresh();
  };

  const saveTenantPolicy = async () => {
    await postJson('/api/admin/security/tenant-policies', { ...tenantPolicyDraft, allowedIdentityProviderIds: splitCsv(tenantPolicyDraft.allowedIdentityProviderIds), auditRetentionDays: Number(tenantPolicyDraft.auditRetentionDays || 365), maxSessionMinutes: 480, runtimeEvidencePolicy: 'evidence-only' });
    setNotice(`Tenant policy saved in ${tenantPolicyDraft.mode} mode.`);
    await refresh();
  };

  const runRlsAcceptance = async () => {
    const result = await postJson<{ checks: Array<{ ok: boolean }> }>('/api/admin/security/rls-acceptance', {});
    setNotice(`RLS acceptance completed: ${result.checks.filter((check) => check.ok).length}/${result.checks.length} checks passed.`);
    await refresh();
  };

  const keyMetrics = useMemo(() => [
    { label: 'Readiness', value: `${readiness}%`, icon: <ServerCog/> },
    { label: 'Model routes', value: String(snapshot?.counts.modelRoutes ?? routes.length), icon: <Route/> },
    { label: 'Knowledge sources', value: String(snapshot?.counts.knowledgeSources ?? sources.length), icon: <LibraryBig/> },
    { label: 'Connectors', value: String(snapshot?.counts.repositoryConnectors ?? connectors.length), icon: <GitBranch/> },
    { label: 'Audit events', value: String(snapshot?.counts.auditEvents ?? audit.length), icon: <ScrollText/> },
    { label: 'RBAC grants', value: String(snapshot?.counts.roleAssignments ?? security?.assignments.length ?? 0), icon: <UserCog/> },
  ], [readiness, snapshot, routes.length, sources.length, connectors.length, audit.length, security?.assignments.length]);

  const adminPipelineSteps = useMemo<StudioPipelineStep[]>(() => [
    { id: 'identity', label: 'Identity & RBAC', detail: 'Roles, mappings and tenant guardrails protect admin mutation paths.', status: (security?.assignments.length ?? 0) > 0 ? 'done' : 'watch', metric: security?.assignments.length ?? 0 },
    { id: 'models', label: 'Model routes', detail: 'LLM routes enrich language only; deterministic kernel remains the authority.', status: routes.some((route) => route.enabled) ? 'done' : 'ready', metric: routes.length },
    { id: 'connectors', label: 'Connectors', detail: 'Repository evidence connectors remain read-only and path-constrained.', status: connectors.length > 0 ? 'active' : 'ready', metric: connectors.length },
    { id: 'knowledge', label: 'Knowledge release', detail: 'Production scoring uses pinned approved releases only.', status: (summary?.knowledge?.unresolvedContradictions ?? 0) > 0 ? 'blocked' : 'done', metric: summary?.knowledge?.releaseId ?? 'AKR' },
    { id: 'audit', label: 'Auditability', detail: 'Admin changes must be reconstructable by actor, time, subject and rationale.', status: audit.length > 0 ? 'done' : 'watch', metric: audit.length },
  ], [audit.length, connectors.length, routes, security?.assignments.length, summary?.knowledge?.releaseId, summary?.knowledge?.unresolvedContradictions]);

  const productionReadinessItems = useMemo(() => [
    { area: 'Identity and access', status: securityPosture?.summary.productionReady ? 'verified' : 'pending', ownerAction: 'Configure OIDC/SSO, map groups to AIW roles, save production tenant policy with development auth disabled.', adminSurface: 'Security & RBAC', evidence: securityPosture?.summary.productionReady ? 'Security posture reports production ready.' : 'Run security posture and RLS acceptance after configuring SSO.' },
    { area: 'LLM provider routes and keys', status: routes.some((route) => route.enabled) ? 'configured' : 'pending', ownerAction: 'Create one or more model routes, store provider keys in the environment secret manager, test each route, then enable only approved routes.', adminSurface: 'Model routes', evidence: routes.some((route) => route.enabled) ? `${routes.filter((route) => route.enabled).length} enabled route(s).` : 'No enabled model route yet.' },
    { area: 'GitHub repository evidence', status: connectors.length > 0 && connectors.every((connector) => !connector.writeEnabled) ? 'configured' : 'pending', ownerAction: 'Create read-only GitHub App/token, register allowed repositories and paths, test connector credentials, then run repository pilot scan.', adminSurface: 'Repositories / Repo pilot', evidence: connectors.length > 0 ? `${connectors.length} connector(s), writes ${connectors.some((connector) => connector.writeEnabled) ? 'review required' : 'blocked by default'}.` : 'No repository connector registered.' },
    { area: 'Mind Factory pipeline', status: (mindFactory?.counts?.activations ?? 0) > 0 ? 'verified' : (mindFactory?.counts?.workerJobs ?? 0) > 0 ? 'configured' : 'pending', ownerAction: 'Capture source snapshot, extract candidate claims, normalize contradictions, queue worker execution, export signed pack, import/activate and pin release.', adminSurface: 'Mind factory', evidence: `${mindFactory?.counts?.snapshots ?? 0} snapshot(s), ${mindFactory?.counts?.workerJobs ?? 0} worker job(s), ${mindFactory?.counts?.activations ?? 0} activation(s).` },
    { area: 'Knowledge governance', status: releasePins.length > 0 && releaseManifests.length > 0 ? 'verified' : 'pending', ownerAction: 'Validate candidates, approve with named reviewer, promote signed release, pin by tenant/project, and document rollback path.', adminSurface: 'Releases / Knowledge sources / Pattern DNA', evidence: `${releaseManifests.length} release manifest(s), ${releasePins.length} pin(s).` },
    { area: 'KMS and signing', status: (mindFactory?.kmsGuides?.length ?? 0) > 0 ? 'configured' : 'pending', ownerAction: 'Bind production KMS key reference, sign knowledge pack manifests, verify signatures during import/activation, retain signing evidence.', adminSurface: 'Mind factory', evidence: `${mindFactory?.kmsGuides?.length ?? 0} KMS binding guide(s).` },
    { area: 'Worker runtime', status: (mindFactory?.counts?.workerJobs ?? 0) > 0 ? 'configured' : 'pending', ownerAction: 'Run worker service under process manager/container runtime, verify heartbeat/logs, retry failed jobs, and prove it can execute Mind Factory jobs.', adminSurface: 'Mind factory', evidence: `${mindFactory?.counts?.workerJobs ?? 0} queued/visible job(s).` },
    { area: 'Durability and audit', status: performanceChecks?.checks.every((check) => check.ok) && audit.length > 0 ? 'verified' : 'pending', ownerAction: 'Use PostgreSQL/pgvector, object storage, backups, audit retention, route-permission report and performance checks. Do not use memory mode in production.', adminSurface: 'Security & RBAC / Audit trail', evidence: `${audit.length} audit event(s); ${performanceChecks?.checks.filter((check) => check.ok).length ?? 0}/${performanceChecks?.checks.length ?? 0} performance checks passing.` },
  ], [audit.length, connectors, mindFactory, performanceChecks, releaseManifests.length, releasePins.length, routes, securityPosture]);

  const productionBlockers = productionReadinessItems.filter((item) => item.status === 'pending').length;

  return (
    <section className="enterprise-workspace admin-control-plane">
      {tab === 'overview' ? <header className="workspace-hero admin-hero">
        <div>
          <span className="eyebrow"><ServerCog size={14}/> Enterprise Admin Control Plane</span>
          <h2>Govern the intelligence substrate of AIW</h2>
          <p>One authority surface for model routes, repository evidence, knowledge sources, tenant policies, release controls and auditability.</p>
        </div>
        <div className="activation-score-card readiness-stage-card">
          <span>Acceptance state</span><strong>{productionBlockers === 0 ? 'Runtime verified' : 'Reference functional'}</strong><small>{productionBlockers} production blocker(s) · configuration is not production acceptance</small>
        </div>
      </header> : <header className="admin-task-header">
        <div><span className="eyebrow">Admin task workspace</span><h2>{tabs.find((item) => item.id === tab)?.label ?? tab}</h2><p>The requested control is shown first. Control-plane overview and launch guidance remain on Control Center.</p></div>
        {experienceProfile === 'administrator' ? <button type="button" onClick={() => setTab('overview')}>Back to Control Center</button> : <span className="admin-role-scope">Scoped for {experienceProfile.replaceAll('-', ' ')}</span>}
      </header>}

      <div className="admin-command-strip">
        <button type="button" onClick={() => void refresh()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} size={15}/> Refresh control plane</button>
        <StatusPill active={productionSafe}>Fail-closed finalization</StatusPill>
        <StatusPill active={Boolean(summary?.llm?.configured)}>LLM {summary?.llm?.configured ? summary?.llm?.provider : 'deterministic-only'}</StatusPill>
        <StatusPill active={Boolean(summary?.githubMesh?.enabled)}>Repository evidence {summary?.githubMesh?.enabled ? 'enabled' : 'not enabled'}</StatusPill>
      </div>

      {degradedReason ? <article className="admin-offline-state" role="status" aria-live="polite">
        <WifiOff size={18}/>
        <div>
          <strong>{demoSeedLoaded ? 'Local admin demo seed loaded — backend still required for production.' : 'Admin API is unavailable — running local control-plane preview.'}</strong>
          <p>{demoSeedLoaded ? 'Demo routes, repository connectors, knowledge sources, security assignments and audit examples are loaded for walkthroughs. Live mutations, workers and repository checks still require the backend.' : 'AIW is preserving the operator workflow with deterministic defaults. Configure the backend API, environment variables and admin routes to enable live mutations, workers, audit refresh and repository checks.'}</p>
          <small>Last connection detail: {degradedReason}</small>
        </div>
        <button type="button" onClick={() => void refresh()} disabled={loading}>Retry connection</button>
        {!demoSeedLoaded ? <button type="button" onClick={loadDemoSeed}>Load demo seed</button> : <span className="admin-demo-seed-note">Demo seed active</span>}
      </article> : null}
      {notice ? <p className="admin-cc__notice">{notice}</p> : null}

      {tab === 'overview' ? <>
      <StudioPipelineBoard
        eyebrow="Control-plane operating model"
        title="Governed substrate readiness from identity to release activation"
        description="Admin now reads as an operator cockpit: each control area has a clear posture, operational meaning and next action instead of a flat collection of technical tabs."
        steps={adminPipelineSteps}
      />

      <StudioOperatorChecklist
        title="Admin launch checklist"
        description="Use this to separate demo readiness from enterprise readiness before sharing AIW with broader stakeholders."
        items={[
          { id: 'kernel-safe', title: 'Kernel authority preserved', detail: productionSafe ? 'Production finalization is fail-closed and candidate knowledge cannot score.' : 'Review safety settings before enabling production use.', tone: productionSafe ? 'ok' : 'blocked' },
          { id: 'worker-health', title: 'Worker operations visible', detail: `${mindFactory?.workerJobs.length ?? 0} Mind Factory job(s) visible for operator review.`, tone: (mindFactory?.workerJobs.length ?? 0) > 0 ? 'ok' : 'neutral' },
          { id: 'connector-safety', title: 'Repository writes blocked', detail: connectors.some((connector) => connector.writeEnabled) ? 'One or more connectors allow writes; review approval posture.' : 'Connectors are read-only by default.', tone: connectors.some((connector) => connector.writeEnabled) ? 'blocked' : 'ok' },
          { id: 'audit-proof', title: 'Audit trail present', detail: `${audit.length} audit event(s) are available for traceability.`, tone: audit.length > 0 ? 'ok' : 'watch' },
        ]}
      />

      </> : null}

      <nav className="admin-tabs admin-tabs--sticky" role="tablist" aria-label="Admin control plane sections">
        {tabs.map((item) => <button type="button" key={item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.icon}{item.label}{typeof item.count === 'number' ? <span>{item.count}</span> : null}</button>)}
      </nav>

      {tab === 'overview' ? <StudioActionStrip
        title="Guided admin workflows"
        detail="High-impact operations now follow a simple pattern: capture required inputs, validate safety constraints, preview the governed change, then submit."
        actions={[
          { label: 'Capture', detail: 'Collect only the fields needed for the selected task.', tone: 'neutral' },
          { label: 'Validate', detail: 'Show required fields and safety rules before submit.', tone: 'watch' },
          { label: 'Preview', detail: 'Summarise what AIW will record and what remains blocked.', tone: 'ok' },
          { label: 'Submit', detail: 'Execute the operation with audit and refresh feedback.', tone: 'ok' },
        ]}
      /> : null}

      {degradedReason ? <AdminLocalModePanel tab={tab} reason={degradedReason} /> : null}

      {tab === 'production' ? <div className="admin-section-stack">
        <article className="admin-wide-card production-readiness-card">
          <h3><ClipboardCheck size={17}/> Production readiness command center</h3>
          <p>This view turns the Admin portal into an production-readiness checklist for production launch. The target state is: governed identity, tested LLM routes, read-only repository evidence, reviewed knowledge releases, signed knowledge packs, worker execution, durable storage and auditable tenant policies.</p>
          <div className="admin-mini-grid">
            <span>Open blockers <strong>{productionBlockers}</strong></span>
            <span>Enabled LLM routes <strong>{routes.filter((route) => route.enabled).length}</strong></span>
            <span>Read-only connectors <strong>{connectors.filter((connector) => !connector.writeEnabled).length}/{connectors.length}</strong></span>
            <span>Release pins <strong>{releasePins.length}</strong></span>
          </div>
        </article>
        <div className="admin-readiness-grid">
          {productionReadinessItems.map((item) => <article className={`admin-readiness-item ${item.status}`} key={item.area}>
            <div><span className="eyebrow">{item.adminSurface}</span><h3>{item.area}</h3></div>
            <strong>{item.status}</strong>
            <p>{item.ownerAction}</p>
            <small>{item.evidence}</small>
          </article>)}
        </div>
        <article className="admin-wide-card">
          <h3><KeyRound size={17}/> Required environment and secret references</h3>
          <ul className="admin-check-list">
            <li><CheckCircle2 size={14}/> <strong>Identity:</strong> OIDC issuer, client id, JWKS/metadata URL, role/group claim mapping and production tenant policy.</li>
            <li><CheckCircle2 size={14}/> <strong>LLM:</strong> Provider API keys stored outside source control, route scopes, structured-output policy and active route probes.</li>
            <li><CheckCircle2 size={14}/> <strong>GitHub:</strong> Read-only GitHub App installation or fine-grained token, repository allowlist and path allowlist.</li>
            <li><CheckCircle2 size={14}/> <strong>Knowledge:</strong> Object-store bucket/path for snapshots and releases, KMS key reference, release pinning policy and rollback owner.</li>
            <li><CheckCircle2 size={14}/> <strong>Runtime:</strong> PostgreSQL/pgvector DSN, worker process, API base URL, telemetry sink, backup location and audit retention.</li>
          </ul>
        </article>
      </div> : null}

      {tab === 'overview' ? <div className="admin-overview-grid">
        {keyMetrics.map((metric) => <article className="admin-metric-card" key={metric.label}>{metric.icon}<span>{metric.label}</span><strong>{metric.value}</strong></article>)}
        <article className="admin-wide-card">
          <h3><ListChecks size={17}/> Global launch trust posture</h3>
          <ul className="admin-check-list">
            <li><CheckCircle2 size={14}/> LLM enrichment does not own scoring, policy, release approval or architecture mutation.</li>
            <li><CheckCircle2 size={14}/> Repository connectors are read-only by default; writes and PR creation require explicit approval.</li>
            <li><CheckCircle2 size={14}/> Candidate knowledge is excluded from production scoring until promoted through a release flow.</li>
            <li><CheckCircle2 size={14}/> Admin mutations are audit logged with actor, action, subject and rationale/context.</li>
          </ul>
        </article>
        <article className="admin-wide-card">
          <h3><DatabaseZap size={17}/> Work queues</h3>
          <div className="admin-mini-grid">
            <span>Claims awaiting review <strong>{summary?.queues?.claimReview ?? 0}</strong></span>
            <span>Contradictions <strong>{summary?.queues?.contradictions ?? 0}</strong></span>
            <span>Sources needing refresh <strong>{summary?.queues?.sourceRefresh ?? 0}</strong></span>
            <span>Recorded decisions <strong>{(summary?.queuesRecordedDecisions?.claims ?? 0) + (summary?.queuesRecordedDecisions?.triage ?? 0)}</strong></span>
          </div>
        </article>
      </div> : null}

      {tab === 'models' ? <div className="admin-section-stack">
        <StudioWorkflowPanel
          eyebrow="Model route workflow"
          title="Register governed model route"
          description="Use a step-by-step preview before any model route is saved. This keeps LLM routing explicit, scoped and enrichment-only."
          steps={[
            { id: 'identity', title: 'Identify route', detail: 'Give the route a stable id and provider/model reference.', status: routeDraft.id && routeDraft.model ? 'complete' : 'current' },
            { id: 'scope', title: 'Scope usage', detail: 'Choose purpose, data sensitivity and target environment before activation.', status: routeDraft.purpose && routeDraft.dataSensitivity ? 'complete' : 'pending' },
            { id: 'preview', title: 'Preview authority', detail: 'Confirm this route cannot become scoring, policy or release authority.', status: routeDraft.id && routeDraft.model ? 'current' : 'pending' },
          ]}
          validation={[
            'Structured output is required for routed LLM usage.',
            'Allowed workspaces are constrained to guided authoring and review support.',
            'The deterministic kernel remains authority for scoring, policy and release approval.',
          ]}
          disabledReason={!routeDraft.id || !routeDraft.model ? 'Route id and model are required before submit.' : undefined}
          previewFacts={[
            { label: 'Route', value: routeDraft.id || 'not set', tone: routeDraft.id ? 'ok' : 'watch' },
            { label: 'Provider/model', value: `${routeDraft.provider}/${routeDraft.model || 'not set'}`, tone: routeDraft.model ? 'ok' : 'watch' },
            { label: 'Purpose', value: routeDraft.purpose, tone: 'neutral' },
            { label: 'Authority', value: 'enrichment-only; never architecture authority', tone: 'ok' },
          ]}
          submitLabel="Save governed route"
          onSubmit={() => void registerRoute()}
        >
          <div className="admin-form-grid">
            <Field label="Route id"><input value={routeDraft.id} onChange={(e) => setRouteDraft({ ...routeDraft, id: e.target.value })} placeholder="coarchitect-primary" /></Field>
            <Field label="Provider"><select value={routeDraft.provider} onChange={(e) => setRouteDraft({ ...routeDraft, provider: e.target.value })}>{['openai','azure-openai','anthropic','gemini','xai','qwen','deepseek','local','custom','offline-deterministic'].map((p) => <option key={p}>{p}</option>)}</select></Field>
            <Field label="Model"><input value={routeDraft.model} onChange={(e) => setRouteDraft({ ...routeDraft, model: e.target.value })} placeholder="gpt-4.1-mini or private-model-id" /></Field>
            <Field label="Purpose"><select value={routeDraft.purpose} onChange={(e) => setRouteDraft({ ...routeDraft, purpose: e.target.value })}>{['architecture-reasoning','knowledge-extraction','explanation','guided-authoring','adr-drafting','general'].map((p) => <option key={p}>{p}</option>)}</select></Field>
            <Field label="Data sensitivity"><select value={routeDraft.dataSensitivity} onChange={(e) => setRouteDraft({ ...routeDraft, dataSensitivity: e.target.value })}>{['public','internal','confidential','restricted'].map((p) => <option key={p}>{p}</option>)}</select></Field>
            <Field label="Environment"><select value={routeDraft.environmentScope} onChange={(e) => setRouteDraft({ ...routeDraft, environmentScope: e.target.value })}>{['local','pilot','production'].map((p) => <option key={p}>{p}</option>)}</select></Field>
          </div>
        </StudioWorkflowPanel>
        <Table title="Registered routes" empty="No model routes registered. AIW remains deterministic-only." rows={routes.map((route) => ({ key: route.id, cells: [route.id, `${route.provider}/${route.model}`, route.purpose, route.enabled ? 'enabled' : 'disabled', route.deterministicOnly ? 'deterministic' : 'enrichment'], actions: <><button type="button" onClick={() => void testRoute(route)}>Test</button><button type="button" onClick={() => void toggleRoute(route)}>{route.enabled ? 'Disable' : 'Enable'}</button><button type="button" onClick={() => void deleteRoute(route)}><Trash2 size={12}/> Delete</button></> }))}/>
      </div> : null}

      {tab === 'repositories' ? <div className="admin-section-stack">
        <StudioWorkflowPanel
          eyebrow="Repository connector workflow"
          title="Register read-only repository connector"
          description="Guide repository onboarding through identity, evidence scope and safety preview before connector registration."
          steps={[
            { id: 'identity', title: 'Identify repository', detail: 'Capture connector id, provider and repository URL.', status: connectorDraft.id && connectorDraft.repositoryUrl ? 'complete' : 'current' },
            { id: 'evidence', title: 'Constrain evidence', detail: 'Limit scans to approved evidence kinds and allowed paths.', status: connectorDraft.evidenceKinds && connectorDraft.allowedPaths ? 'complete' : 'pending' },
            { id: 'safety', title: 'Confirm safety', detail: 'Repository writes and PR creation remain blocked unless separately approved.', status: 'current' },
          ]}
          validation={[
            'Connector is registered as read-only.',
            'Allowed paths constrain where AIW may inspect evidence.',
            'Architecture mutation remains human-approved and never automatic.',
          ]}
          disabledReason={!connectorDraft.id || !connectorDraft.repositoryUrl ? 'Connector id and repository URL are required before submit.' : undefined}
          previewFacts={[
            { label: 'Connector', value: connectorDraft.id || 'not set', tone: connectorDraft.id ? 'ok' : 'watch' },
            { label: 'Provider', value: connectorDraft.provider, tone: 'neutral' },
            { label: 'Repository', value: connectorDraft.repositoryUrl || 'not set', tone: connectorDraft.repositoryUrl ? 'ok' : 'watch' },
            { label: 'Write policy', value: 'read-only registration', tone: 'ok' },
          ]}
          submitLabel="Register read-only connector"
          onSubmit={() => void registerConnector()}
        >
          <div className="admin-form-grid">
            <Field label="Connector id"><input value={connectorDraft.id} onChange={(e) => setConnectorDraft({ ...connectorDraft, id: e.target.value })} placeholder="payments-platform-main" /></Field>
            <Field label="Provider"><select value={connectorDraft.provider} onChange={(e) => setConnectorDraft({ ...connectorDraft, provider: e.target.value })}>{['github','gitlab','azure-devops','bitbucket'].map((p) => <option key={p}>{p}</option>)}</select></Field>
            <Field label="Repository URL"><input value={connectorDraft.repositoryUrl} onChange={(e) => setConnectorDraft({ ...connectorDraft, repositoryUrl: e.target.value })} placeholder="https://github.com/org/repo" /></Field>
            <Field label="Default branch"><input value={connectorDraft.defaultBranch} onChange={(e) => setConnectorDraft({ ...connectorDraft, defaultBranch: e.target.value })} /></Field>
            <Field label="Evidence kinds"><input value={connectorDraft.evidenceKinds} onChange={(e) => setConnectorDraft({ ...connectorDraft, evidenceKinds: e.target.value })} /></Field>
            <Field label="Allowed paths"><input value={connectorDraft.allowedPaths} onChange={(e) => setConnectorDraft({ ...connectorDraft, allowedPaths: e.target.value })} /></Field>
          </div>
        </StudioWorkflowPanel>
        <Table title="Repository evidence connectors" empty="No repository connectors registered." rows={connectors.map((c) => ({ key: c.id, cells: [c.id, c.provider, c.repositoryUrl, c.evidenceKinds.join(', ') || '—', c.writeEnabled ? 'writes enabled' : 'read-only'], actions: <button type="button" onClick={() => void testConnector(c)}>Test</button> }))}/>
      </div> : null}


      {tab === 'repoPilot' ? <div className="admin-section-stack">
        <article className="admin-wide-card">
          <h3><DatabaseZap size={17}/> Repository and Conformance Pilot</h3>
          <p>Run read-only repository onboarding, detect architecture evidence, generate conformance controls, create a CI fitness-loop plan and prepare runtime evidence ingestion. Repository writes and PR creation remain blocked unless explicitly approved.</p>
          <div className="admin-mini-grid">
            <span>Connectors <strong>{connectors.length}</strong></span>
            <span>Scans <strong>{repoPilot?.scans.length ?? 0}</strong></span>
            <span>Fitness-loop plans <strong>{repoPilot?.fitnessLoops.length ?? 0}</strong></span>
            <span>Runtime plans <strong>{repoPilot?.runtimePlans.length ?? 0}</strong></span>
          </div>
          <ul className="admin-check-list">
            <li><CheckCircle2 size={14}/> {repoPilot?.doctrine.repositoryWrites ?? 'repository writes disabled-by-default'}</li>
            <li><CheckCircle2 size={14}/> {repoPilot?.doctrine.prCreation ?? 'PR creation preview-only requires approval'}</li>
            <li><CheckCircle2 size={14}/> {repoPilot?.doctrine.architectureMutation ?? 'architecture mutation requires human approval'}</li>
            <li><CheckCircle2 size={14}/> {repoPilot?.doctrine.runtimeEvidence ?? 'runtime evidence is evidence-only'}</li>
          </ul>
        </article>
        <Table title="Repository onboarding actions" empty="Register a repository connector first." rows={connectors.map((connector) => ({ key: connector.id, cells: [connector.id, connector.provider, connector.repositoryUrl, connector.defaultBranch ?? 'main', connector.writeEnabled ? 'unsafe writes enabled' : 'read-only'], actions: <><button type="button" onClick={() => void scanConnector(connector)}>Scan</button><button type="button" onClick={() => void generateRepositoryControls(connector)}>Controls</button><button type="button" onClick={() => void generateFitnessLoop(connector)}>CI loop</button><button type="button" onClick={() => void generateRuntimeEvidencePlan(connector)}>Runtime plan</button></> }))}/>
        <Table title="Evidence coverage scans" empty="No repository evidence scans yet." rows={(repoPilot?.scans ?? []).map((scan) => ({ key: scan.scanId, cells: [scan.scanId, scan.connectorId, safeDate(scan.completedAt), `${scan.coverage.coverageScore}%`, scan.coverage.detectedKinds.join(', ') || '—', scan.coverage.missingKinds.join(', ') || 'none', `${scan.controls.length} controls`], actions: null }))}/>
        <Table title="Detected architecture assets" empty="Run a scan to detect architecture evidence." rows={(repoPilot?.scans?.[0]?.coverage.detections ?? []).map((asset, index) => ({ key: `${asset.kind}-${asset.path}-${index}`, cells: [asset.kind, asset.path, `${asset.confidence}%`, asset.reason, asset.controlsSeeded.join('; ')], actions: null }))}/>
        <Table title="CI fitness-loop plans" empty="No CI fitness-loop plan generated yet." rows={(repoPilot?.fitnessLoops ?? []).map((plan) => ({ key: `${plan.connectorId}-${plan.generatedAt}`, cells: [plan.connectorId, plan.workflowName, safeDate(plan.generatedAt), `${plan.proposedChecks.length} checks`, plan.prCreation, plan.repositoryWrites], actions: null }))}/>
        <Table title="Runtime evidence ingestion plans" empty="No runtime evidence plan generated yet." rows={(repoPilot?.runtimePlans ?? []).map((plan) => ({ key: `${plan.connectorId}-${plan.generatedAt}`, cells: [plan.connectorId, safeDate(plan.generatedAt), plan.sources.join(', '), plan.acceptedFormats.join(', '), plan.runtimeMutationPolicy], actions: null }))}/>
      </div> : null}

      {tab === 'sources' ? <div className="admin-section-stack">
        <StudioWorkflowPanel
          eyebrow="Knowledge source workflow"
          title="Register governed knowledge source"
          description="Separate discovery metadata, licensing posture and review ownership before a source can join the knowledge pipeline."
          steps={[
            { id: 'identify', title: 'Identify source', detail: 'Capture the source id, title and source type.', status: sourceDraft.id && sourceDraft.title ? 'complete' : 'current' },
            { id: 'license', title: 'Record licence', detail: 'Capture licence and trust tier before any source can progress beyond discovery.', status: sourceDraft.licence ? 'complete' : 'pending' },
            { id: 'review', title: 'Assign owner', detail: 'Assign a named review owner and refresh cadence.', status: sourceDraft.reviewOwner ? 'complete' : 'pending' },
          ]}
          validation={[
            'New sources enter discovery/candidate posture first.',
            'Licence and review owner are visible before release promotion.',
            'Refresh cadence is recorded for worker scheduling and stale-source alerts.',
          ]}
          disabledReason={!sourceDraft.id || !sourceDraft.title ? 'Source id and title are required before submit.' : undefined}
          previewFacts={[
            { label: 'Source', value: sourceDraft.id || 'not set', tone: sourceDraft.id ? 'ok' : 'watch' },
            { label: 'Title', value: sourceDraft.title || 'not set', tone: sourceDraft.title ? 'ok' : 'watch' },
            { label: 'Licence', value: sourceDraft.licence || 'not recorded', tone: sourceDraft.licence ? 'ok' : 'watch' },
            { label: 'Review owner', value: sourceDraft.reviewOwner || 'not assigned', tone: sourceDraft.reviewOwner ? 'ok' : 'watch' },
          ]}
          submitLabel="Register discovery source"
          onSubmit={() => void registerSource()}
        >
          <div className="admin-form-grid">
            <Field label="Source id"><input value={sourceDraft.id} onChange={(e) => setSourceDraft({ ...sourceDraft, id: e.target.value })} placeholder="SRC-SYSTEM-DESIGN-PRIMER" /></Field>
            <Field label="Title"><input value={sourceDraft.title} onChange={(e) => setSourceDraft({ ...sourceDraft, title: e.target.value })} /></Field>
            <Field label="Type"><select value={sourceDraft.sourceType} onChange={(e) => setSourceDraft({ ...sourceDraft, sourceType: e.target.value })}>{['repository','book','internal-standard','vendor-doc','regulatory','benchmark-scenario-library'].map((p) => <option key={p}>{p}</option>)}</select></Field>
            <Field label="Licence"><input value={sourceDraft.licence} onChange={(e) => setSourceDraft({ ...sourceDraft, licence: e.target.value })} /></Field>
            <Field label="Review owner"><input value={sourceDraft.reviewOwner} onChange={(e) => setSourceDraft({ ...sourceDraft, reviewOwner: e.target.value })} /></Field>
            <Field label="Refresh cadence days"><input value={sourceDraft.refreshCadenceDays} onChange={(e) => setSourceDraft({ ...sourceDraft, refreshCadenceDays: e.target.value })} /></Field>
          </div>
        </StudioWorkflowPanel>
        <Table title="Registered knowledge sources" empty="No registered sources yet." rows={sources.map((s) => ({ key: s.id, cells: [s.id, s.title, s.sourceType ?? '—', s.posture ?? 'discovery', s.licence ?? 'licence not recorded'], actions: <><button type="button" onClick={() => void changeSourcePosture(s, 'candidate')}>Candidate</button><button type="button" onClick={() => void changeSourcePosture(s, 'approved-advisory')}>Advisory</button><button type="button" onClick={() => void changeSourcePosture(s, 'approved-production')}>Production</button></> }))}/>
        <Table title="Bundled governed sources" empty="No bundled sources loaded." rows={bundledSources.slice(0, 10).map((s) => ({ key: s.id, cells: [s.id, s.title, s.sourceType ?? '—', s.status ?? 'bundled', 'data registry'], actions: null }))}/>
      </div> : null}


      {tab === 'patterns' ? <div className="admin-section-stack">
        <article className="admin-wide-card">
          <h3><LibraryBig size={17}/> Pattern DNA Operations</h3>
          <p>Govern pattern aliases, vendor realizations, compatibility/conflict matrices, obligations, risks, mitigations, fitness-test mappings and quality impacts. Edits are staged durably and must become a knowledge-release candidate before they can influence production recommendations.</p>
          <div className="admin-mini-grid">
            <span>Total patterns <strong>{patternDna?.summary.totalPatterns ?? 0}</strong></span>
            <span>Draft/uncurated <strong>{patternDna?.summary.draftOrUncuratedPatterns ?? 0}</strong></span>
            <span>Staged edits <strong>{patternDna?.summary.stagedEdits ?? 0}</strong></span>
            <span>Obligation coverage <strong>{patternDna?.summary.obligationCoverage ?? 0}%</strong></span>
            <span>Evidence coverage <strong>{patternDna?.summary.evidenceCoverage ?? 0}%</strong></span>
            <span>Compatibility coverage <strong>{patternDna?.summary.compatibilityCoverage ?? 0}%</strong></span>
          </div>
        </article>
        <article className="admin-form-card">
          <h3><LibraryBig size={17}/> Stage Pattern DNA edit</h3>
          <div className="admin-form-grid">
            <Field label="Pattern"><select value={patternDraft.patternId} onChange={(e) => setPatternDraft({ ...patternDraft, patternId: e.target.value })}><option value="">Select pattern</option>{(patternDna?.patterns ?? []).map((pattern) => <option key={pattern.id} value={pattern.id}>{pattern.name}</option>)}</select></Field>
            <Field label="Field"><select value={patternDraft.field} onChange={(e) => setPatternDraft({ ...patternDraft, field: e.target.value as PatternDnaEditableField, value: e.target.value === 'qualityAttributeImpact' ? '{"security":1}' : '' })}>{['obligations','risks','mitigations','pairsWellWith','conflictsWith','aliases','vendorRealizations','requires','fitnessTestMappings','qualityAttributeImpact','impactNote'].map((field) => <option key={field}>{field}</option>)}</select></Field>
            <Field label={patternDraft.field === 'qualityAttributeImpact' ? 'Value JSON' : patternDraft.field === 'impactNote' ? 'Value text' : 'Value CSV'}><input value={patternDraft.value} onChange={(e) => setPatternDraft({ ...patternDraft, value: e.target.value })} placeholder={patternDraft.field === 'qualityAttributeImpact' ? '{"security":2,"operability":1}' : 'entry one, entry two'} /></Field>
            <Field label="Rationale"><input value={patternDraft.rationale} onChange={(e) => setPatternDraft({ ...patternDraft, rationale: e.target.value })} placeholder="Why this pattern DNA change is being staged" /></Field>
          </div>
          <button type="button" onClick={() => void stagePatternEdit()}>Stage governed edit</button>
          <button type="button" onClick={() => void materializePatternCandidate()} disabled={!patternDna?.summary.stagedEdits}>Create release candidate from staged edits</button>
        </article>
        <Table title="Pattern DNA library" empty="No pattern records loaded." rows={(patternDna?.patterns ?? []).map((pattern) => ({ key: pattern.id, cells: [pattern.name, pattern.category, pattern.status, pattern.curated ? 'curated' : pattern.draft ? 'needs curation' : 'review', `${pattern.obligations?.length ?? 0} obligations`, `${pattern.pairsWellWith?.length ?? 0}/${pattern.conflictsWith?.length ?? 0} compat/conflict`], actions: null }))}/>
        <Table title="Durable staged Pattern DNA edits" empty="No active staged Pattern DNA edits." rows={(patternDna?.stagedEdits ?? []).filter((edit) => edit.status === 'staged').map((edit) => ({ key: edit.editId, cells: [edit.editId, edit.patternId, edit.field, safeDate(edit.stagedAt), edit.editor, edit.rationale], actions: <button type="button" onClick={() => void discardPatternEdit(edit)}>Discard</button> }))}/>
      </div> : null}

      {tab === 'releases' ? <div className="admin-section-stack">
        <article className="admin-wide-card">
          <h3><ClipboardCheck size={17}/> Knowledge Release Manager</h3>
          <p>Candidate knowledge is durable but isolated until validation and promotion. Promotion writes a release manifest with provenance, no-LLM authority, rollback support and blocked candidate-to-production leakage.</p>
          <div className="admin-mini-grid">
            <span>Candidate releases <strong>{releaseCandidates.length}</strong></span>
            <span>Released manifests <strong>{releaseManifests.length}</strong></span>
            <span>Release pins <strong>{releasePins.length}</strong></span>
            <span>Latest manifest <strong>{releaseManifests[0]?.releaseId ?? '—'}</strong></span>
          </div>
        </article>
        <Table title="Release candidates" empty="No release candidates yet. Stage Pattern DNA or knowledge changes to create one." rows={releaseCandidates.map((candidate) => ({ key: candidate.candidateId, cells: [candidate.candidateId, candidate.status, candidate.baseReleaseId, candidate.proposedReleaseId ?? 'generated on promotion', String(candidate.changeCount), candidate.validation?.allowed ? 'validated' : 'not validated'], actions: <><button type="button" onClick={() => void validateRelease(candidate)}>Validate</button><button type="button" onClick={() => void approveRelease(candidate)}>Approve</button><button type="button" onClick={() => void promoteRelease(candidate)}>Promote</button><button type="button" onClick={() => void rollbackRelease(candidate)}>Rollback</button></> }))}/>
        <article className="admin-form-card">
          <h3><Flag size={17}/> Pin release</h3>
          <div className="admin-form-grid">
            <Field label="Scope"><select value={pinDraft.scope} onChange={(e) => setPinDraft({ ...pinDraft, scope: e.target.value })}><option value="tenant">tenant</option><option value="project">project</option></select></Field>
            <Field label="Scope id"><input value={pinDraft.scopeId} onChange={(e) => setPinDraft({ ...pinDraft, scopeId: e.target.value })} /></Field>
            <Field label="Release id"><input value={pinDraft.releaseId} onChange={(e) => setPinDraft({ ...pinDraft, releaseId: e.target.value })} placeholder={releaseManifests[0]?.releaseId ?? 'AKR-...'} /></Field>
          </div>
          <button type="button" onClick={() => void pinRelease()}>Pin governed release</button>
        </article>
        <Table title="Released manifests" empty="No promoted knowledge releases yet." rows={releaseManifests.map((manifest) => ({ key: manifest.releaseId, cells: [manifest.releaseId, manifest.candidateId, manifest.baseReleaseId, String(manifest.changeCount), manifest.promotedBy, safeDate(manifest.promotedAt), manifest.provenance?.candidateKnowledgeInfluence ?? 'blocked-until-promotion'], actions: null }))}/>
        <Table title="Release pins" empty="No tenant or project release pins." rows={releasePins.map((pin, index) => ({ key: `${pin.scope}-${pin.scopeId}-${index}`, cells: [pin.scope, pin.scopeId, pin.releaseId, pin.pinnedBy, safeDate(pin.pinnedAt)], actions: null }))}/>
      </div> : null}


      {tab === 'mindFactory' ? <div className="admin-section-stack">
        <article className="admin-wide-card">
          <h3><BrainCircuit size={17}/> Mind Factory — Quarantine, Worker Orchestration and Signed-Pack Activation</h3>
          <p>This surface administers the governed intelligence substrate: source snapshots enter quarantine, candidate claims remain non-scoring, workers are queued as explicit plans, and signed knowledge packs activate only after verification and tenant/project pinning.</p>
          <div className="admin-mini-grid">
            <span>Snapshots <strong>{mindFactory?.counts.snapshots ?? 0}</strong></span>
            <span>Candidate claims <strong>{mindFactory?.counts.candidateClaims ?? 0}</strong></span>
            <span>Worker jobs <strong>{mindFactory?.counts.workerJobs ?? 0}</strong></span>
            <span>Activations <strong>{mindFactory?.counts.activations ?? 0}</strong></span>
          </div>
        </article>
        <article className="admin-form-card">
          <h3><DatabaseZap size={17}/> Quarantine source snapshot</h3>
          <div className="admin-form-grid">
            <Field label="Source id"><input value={mindSnapshotDraft.sourceId} onChange={(e) => setMindSnapshotDraft({ ...mindSnapshotDraft, sourceId: e.target.value })} /></Field>
            <Field label="Source title"><input value={mindSnapshotDraft.sourceTitle} onChange={(e) => setMindSnapshotDraft({ ...mindSnapshotDraft, sourceTitle: e.target.value })} /></Field>
            <Field label="Source type"><input value={mindSnapshotDraft.sourceType} onChange={(e) => setMindSnapshotDraft({ ...mindSnapshotDraft, sourceType: e.target.value })} /></Field>
            <Field label="License"><input value={mindSnapshotDraft.license} onChange={(e) => setMindSnapshotDraft({ ...mindSnapshotDraft, license: e.target.value })} /></Field>
            <Field label="Provenance URL"><input value={mindSnapshotDraft.provenanceUrl} onChange={(e) => setMindSnapshotDraft({ ...mindSnapshotDraft, provenanceUrl: e.target.value })} /></Field>
            <Field label="Reference content"><textarea value={mindSnapshotDraft.content} onChange={(e) => setMindSnapshotDraft({ ...mindSnapshotDraft, content: e.target.value })} rows={4} /></Field>
          </div>
          <button type="button" onClick={() => void captureMindSnapshot()}>Capture quarantined snapshot</button>
          <button type="button" onClick={() => void extractLatestMindClaims()}>Extract candidate claims</button>
          <button type="button" onClick={() => void normalizeMindClaims()}>Normalize claims</button>
          <button type="button" onClick={() => void previewMindReleaseImpact()}>Preview release impact</button>
        </article>
        <article className="admin-form-card">
          <h3><RefreshCw size={17}/> Worker orchestration</h3>
          <p>Queues governed worker plans. The API records the plan; target environments execute actual cloning, extraction, signing and promotion through their worker runtime.</p>
          <button type="button" onClick={() => void queueMindWorker('source-refresh')}>Queue source refresh worker</button>
          <button type="button" onClick={() => void queueMindWorker('claim-extraction')}>Queue claim extraction worker</button>
        </article>
        <article className="admin-form-card">
          <h3><ClipboardCheck size={17}/> Signed knowledge-pack activation</h3>
          <div className="admin-form-grid">
            <Field label="Release id"><input value={mindPackDraft.releaseId} onChange={(e) => setMindPackDraft({ ...mindPackDraft, releaseId: e.target.value })} /></Field>
            <Field label="Tenant id"><input value={mindPackDraft.tenantId} onChange={(e) => setMindPackDraft({ ...mindPackDraft, tenantId: e.target.value })} /></Field>
            <Field label="Activation mode"><select value={mindPackDraft.activationMode} onChange={(e) => setMindPackDraft({ ...mindPackDraft, activationMode: e.target.value })}><option value="enterprise-tenant">enterprise-tenant</option><option value="offline-essential">offline-essential</option><option value="sovereign-airgapped">sovereign-airgapped</option></select></Field>
          </div>
          <button type="button" onClick={() => void exportMindPack()}>Export signed pack manifest</button>
          <button type="button" onClick={() => void activateLatestMindPack()}>Activate latest exported pack</button>
        </article>
        <article className="admin-form-card">
          <h3><GitBranch size={17}/> Live provider binding and .aiw-kpack UX</h3>
          <p>Creates runbook-ready provider plans and portable .aiw-kpack envelopes. Repository fetch remains read-only; KMS signs manifest hashes only; activation remains tenant/project scoped.</p>
          <button type="button" onClick={() => void createProviderFetchPlan()}>Create read-only provider fetch plan</button>
          <button type="button" onClick={() => void createKmsGuide()}>Create KMS binding guide</button>
          <button type="button" onClick={() => void exportAiwKpack()}>Export .aiw-kpack envelope</button>
          <button type="button" onClick={() => void importLatestAiwKpack()}>Verify latest .aiw-kpack import</button>
          <div className="admin-mini-grid">
            <span>Provider plans <strong>{mindFactory?.counts.providerBindings ?? 0}</strong></span>
            <span>KMS guides <strong>{mindFactory?.counts.kmsGuides ?? 0}</strong></span>
            <span>.aiw-kpack exports <strong>{mindFactory?.counts.aiwKpackExports ?? 0}</strong></span>
            <span>.aiw-kpack imports <strong>{mindFactory?.counts.aiwKpackImports ?? 0}</strong></span>
          </div>
        </article>
        <Table title="Quarantined snapshots" empty="No quarantined snapshots yet." rows={(mindFactory?.snapshots ?? []).map((item) => ({ key: item.snapshotId, cells: [item.snapshotId, item.sourceId, item.sourceTitle, item.status, item.license ?? '—', safeDate(item.capturedAt)], actions: null }))}/>
        <Table title="Candidate claims" empty="No candidate claims yet." rows={(mindFactory?.candidateClaims ?? []).map((claim) => ({ key: claim.claimId, cells: [claim.claimId, claim.subject, claim.predicate, claim.status, claim.nonScoring ? 'non-scoring' : 'scoring', claim.confidence], actions: null }))}/>
        <Table title="Worker jobs" empty="No worker jobs queued." rows={(mindFactory?.workerJobs ?? []).map((job) => ({ key: job.jobId, cells: [job.jobId, job.operation, job.status, job.workerQueue, job.sourceId ?? job.snapshotId ?? '—', safeDate(job.queuedAt)], actions: null }))}/>
        <Table title="Knowledge-pack activations" empty="No knowledge packs activated." rows={(mindFactory?.activations ?? []).map((activation) => ({ key: `${activation.packId}-${activation.activatedAt}`, cells: [activation.packId, activation.releaseId, activation.tenantId, activation.activationMode, activation.pinned ? 'pinned' : 'not pinned', safeDate(activation.activatedAt)], actions: null }))}/>
        <Table title="Provider fetch plans" empty="No provider fetch plans yet." rows={(mindFactory?.providerBindings ?? []).map((plan) => ({ key: plan.planId, cells: [plan.planId, plan.provider, plan.mode, plan.readiness], actions: null }))}/>
        <Table title=".aiw-kpack imports" empty="No .aiw-kpack imports yet." rows={(mindFactory?.aiwKpackImports ?? []).map((item, index) => ({ key: `${item.packId ?? item.releaseId ?? index}`, cells: [item.status, item.releaseId ?? "—", item.packId ?? "—"], actions: null }))}/>
        <Table title="Mind Factory audit timeline" empty="No Mind Factory audit events yet." rows={(mindFactory?.timeline ?? []).map((event, index) => ({ key: `${event.at}-${index}`, cells: [safeDate(event.at), event.phase, event.actor, event.action, event.subject, event.detail], actions: null }))}/>
      </div> : null}


      {tab === 'security' ? <div className="admin-section-stack">
        <article className="admin-wide-card">
          <h3><UserCog size={17}/> Enterprise Security, RBAC and Scale Hardening</h3>
          <p>Production mode now requires explicit roles from OIDC/proxy-verified claims or governed assignments. Development auth is treated as a local-only profile and is blocked by production tenant policy.</p>
          <div className="admin-mini-grid">
            <span>Mode <strong>{securityPosture?.mode ?? '—'}</strong></span>
            <span>Checks passed <strong>{securityPosture ? `${securityPosture.summary.passed}/${securityPosture.summary.passed + securityPosture.summary.failed}` : '—'}</strong></span>
            <span>Principal auth <strong>{securityPosture?.principal?.authMode ?? '—'}</strong></span>
            <span>Principal roles <strong>{securityPosture?.principal?.roles?.join(', ') || 'none'}</strong></span>
          </div>
        </article>
        <article className="admin-form-card">
          <h3><UserCog size={17}/> Assign enterprise role</h3>
          <div className="admin-form-grid">
            <Field label="Subject"><input value={roleDraft.subject} onChange={(e) => setRoleDraft({ ...roleDraft, subject: e.target.value })} placeholder="user@example.com or subject id" /></Field>
            <Field label="Email"><input value={roleDraft.email} onChange={(e) => setRoleDraft({ ...roleDraft, email: e.target.value })} placeholder="optional" /></Field>
            <Field label="Roles CSV"><input value={roleDraft.roles} onChange={(e) => setRoleDraft({ ...roleDraft, roles: e.target.value })} placeholder="auditor,security-admin" /></Field>
            <Field label="Active"><select value={String(roleDraft.active)} onChange={(e) => setRoleDraft({ ...roleDraft, active: e.target.value === 'true' })}><option value="true">true</option><option value="false">false</option></select></Field>
          </div>
          <button type="button" onClick={() => void saveRoleAssignment()}>Save role assignment</button>
        </article>
        <article className="admin-form-card">
          <h3><ShieldCheck size={17}/> OIDC role mapping</h3>
          <div className="admin-form-grid">
            <Field label="Claim path"><input value={roleMapDraft.claim} onChange={(e) => setRoleMapDraft({ ...roleMapDraft, claim: e.target.value })} placeholder="groups or realm_access.roles" /></Field>
            <Field label="Match value"><input value={roleMapDraft.match} onChange={(e) => setRoleMapDraft({ ...roleMapDraft, match: e.target.value })} placeholder="AIW-Admins" /></Field>
            <Field label="Roles CSV"><input value={roleMapDraft.roles} onChange={(e) => setRoleMapDraft({ ...roleMapDraft, roles: e.target.value })} placeholder="platform-admin" /></Field>
            <Field label="Enabled"><select value={String(roleMapDraft.enabled)} onChange={(e) => setRoleMapDraft({ ...roleMapDraft, enabled: e.target.value === 'true' })}><option value="true">true</option><option value="false">false</option></select></Field>
          </div>
          <button type="button" onClick={() => void saveRoleMapping()}>Save OIDC mapping rule</button>
        </article>
        <article className="admin-form-card">
          <h3><SlidersHorizontal size={17}/> Tenant policy</h3>
          <div className="admin-form-grid">
            <Field label="Mode"><select value={tenantPolicyDraft.mode} onChange={(e) => setTenantPolicyDraft({ ...tenantPolicyDraft, mode: e.target.value })}><option value="development">development</option><option value="pilot">pilot</option><option value="production">production</option></select></Field>
            <Field label="Require SSO"><select value={String(tenantPolicyDraft.requireSso)} onChange={(e) => setTenantPolicyDraft({ ...tenantPolicyDraft, requireSso: e.target.value === 'true' })}><option value="true">true</option><option value="false">false</option></select></Field>
            <Field label="Allow dev auth"><select value={String(tenantPolicyDraft.allowDevelopmentAuth)} onChange={(e) => setTenantPolicyDraft({ ...tenantPolicyDraft, allowDevelopmentAuth: e.target.value === 'true' })}><option value="false">false</option><option value="true">true</option></select></Field>
            <Field label="Identity providers CSV"><input value={tenantPolicyDraft.allowedIdentityProviderIds} onChange={(e) => setTenantPolicyDraft({ ...tenantPolicyDraft, allowedIdentityProviderIds: e.target.value })} /></Field>
            <Field label="Audit retention days"><input value={tenantPolicyDraft.auditRetentionDays} onChange={(e) => setTenantPolicyDraft({ ...tenantPolicyDraft, auditRetentionDays: e.target.value })} /></Field>
            <Field label="Repository writes"><select value={tenantPolicyDraft.repositoryWritePolicy} onChange={(e) => setTenantPolicyDraft({ ...tenantPolicyDraft, repositoryWritePolicy: e.target.value })}><option value="deny">deny</option><option value="review-required">review-required</option></select></Field>
          </div>
          <button type="button" onClick={() => void saveTenantPolicy()}>Save tenant policy</button>
          <button type="button" onClick={() => void runRlsAcceptance()}>Run RLS acceptance</button>
        </article>
        <Table title="Role assignments" empty="No role assignments saved." rows={(security?.assignments ?? []).map((assignment) => ({ key: assignment.assignmentId, cells: [assignment.subject, assignment.email ?? '—', assignment.roles.join(', '), assignment.source, assignment.active ? 'active' : 'inactive', safeDate(assignment.updatedAt)], actions: null }))}/>
        <Table title="OIDC role mapping rules" empty="No OIDC role mapping rules saved." rows={(security?.mappingRules ?? []).map((rule) => ({ key: rule.ruleId, cells: [rule.claim, rule.match, rule.roles.join(', '), rule.enabled ? 'enabled' : 'disabled', safeDate(rule.updatedAt)], actions: null }))}/>
        <Table title="Tenant policies" empty="No tenant policies saved." rows={tenantPolicies.map((policy) => ({ key: policy.tenantId, cells: [policy.tenantId, policy.mode, `SSO=${policy.requireSso}`, `devAuth=${policy.allowDevelopmentAuth}`, policy.repositoryWritePolicy, policy.candidateKnowledgePolicy, safeDate(policy.updatedAt)], actions: null }))}/>
        <Table title="Security posture checks" empty="No security posture checks returned." rows={(securityPosture?.checks ?? []).map((check) => ({ key: check.checkId, cells: [check.checkId, check.ok ? 'pass' : 'fail', check.severity, check.detail], actions: null }))}/>
        <Table title="Performance and scale checks" empty="No performance checks returned." rows={(performanceChecks?.checks ?? []).map((check) => ({ key: check.checkId, cells: [check.checkId, check.ok ? 'pass' : 'review', check.measurement, check.threshold, check.recommendation], actions: null }))}/>
      </div> : null}

      {tab === 'tenant' ? <div className="admin-section-stack">
        <article className="admin-form-card">
          <h3><Flag size={17}/> Feature flag</h3>
          <div className="admin-form-grid">
            <Field label="Flag"><input value={flagDraft.flag} onChange={(e) => setFlagDraft({ ...flagDraft, flag: e.target.value })} placeholder="enable-knowledge-ops-v2" /></Field>
            <Field label="Enabled"><select value={String(flagDraft.enabled)} onChange={(e) => setFlagDraft({ ...flagDraft, enabled: e.target.value === 'true' })}><option value="true">true</option><option value="false">false</option></select></Field>
          </div>
          <button type="button" onClick={() => void saveFlag()}>Save feature flag</button>
        </article>
        <Table title="Feature flags" empty="No feature flags saved." rows={Object.entries(tenant.flags).map(([key, value]) => ({ key, cells: [key, String(typeof value === 'boolean' ? value : value?.enabled), typeof value === 'boolean' ? 'tenant' : String(value?.scope ?? 'tenant'), typeof value === 'boolean' ? '—' : safeDate(value?.updatedAt)], actions: null }))}/>
      </div> : null}

      {tab === 'audit' ? <Table title="Admin audit trail" empty="No admin audit events recorded." rows={audit.map((event, index) => ({ key: `${event.at}-${index}`, cells: [safeDate(event.at), event.actor, event.action, event.subject, event.detail], actions: null }))}/> : null}
    </section>
  );
}

function Table({ title, empty, rows }: { title: string; empty: string; rows: Array<{ key: string; cells: React.ReactNode[]; actions: React.ReactNode }> }) {
  const maxCells = Math.max(1, ...rows.map((row) => row.cells.length));
  const columns = Array.from({ length: maxCells }, (_, index) => ({
    key: `c${index}`,
    title: index === 0 ? 'Item' : index === 1 ? 'Context' : index === 2 ? 'Status' : `Detail ${index + 1}`,
  }));
  return (
    <StudioDataTable
      title={title}
      description="Operator-grade searchable table with row preview, explicit empty states and inline actions."
      columns={columns}
      emptyTitle={empty}
      emptyDetail="No records were returned for this section. The empty state is intentional so admin users do not mistake missing data for a broken page."
      rows={rows.map((row) => ({
        id: row.key,
        cells: Object.fromEntries(row.cells.map((cell, index) => [`c${index}`, cell])),
        summary: row.cells.map((cell) => String(cell ?? '')).join(' · '),
        preview: <dl className="studio-preview-facts">{row.cells.map((cell, index) => <><dt key={`dt-${index}`}>{columns[index]?.title ?? `Field ${index + 1}`}</dt><dd key={`dd-${index}`}>{cell}</dd></>)}</dl>,
        actions: row.actions,
      }))}
    />
  );
}
