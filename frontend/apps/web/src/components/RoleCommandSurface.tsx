import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Boxes,
  BrainCircuit,
  CheckCircle2,
  CircleDotDashed,
  DatabaseZap,
  GitCompareArrows,
  GitPullRequestArrow,
  Layers3,
  Network,
  Radar,
  RefreshCw,
  Route,
  ServerCog,
  ShieldCheck,
  Sparkles,
  Waypoints,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { ExperienceProfileId, WorkspaceModeId } from '../lib/experienceProfiles';
import { roleShellDefinition, type RoleShellTarget } from '../lib/roleProductShell';

interface Metric {
  label: string;
  value: string | number;
  detail: string;
  tone?: 'good' | 'warn' | 'risk' | 'neutral';
}


interface CapabilityProduct {
  id: string;
  title: string;
  description: string;
  outcome: string;
  roles: ExperienceProfileId[];
  icon: LucideIcon;
  target: RoleShellTarget;
}

const capabilityProducts: CapabilityProduct[] = [
  { id:'provenance', title:'Provenance Explorer', description:'Trace a recommendation from source commit and atomic claim through Pattern DNA to generated model change.', outcome:'Explainability and reproducibility', roles:['solution-architect','enterprise-architect','reviewer','knowledge-curator'], icon:DatabaseZap, target:{kind:'knowledge',tab:'claims'} },
  { id:'evidence', title:'Evidence Ledger', description:'Inspect checksums, expiry, control coverage and implementation proof without leaving the active architecture context.', outcome:'Review-ready evidence', roles:['reviewer','platform-architect','administrator'], icon:BadgeCheck, target:{kind:'workspace',id:'conformance'} },
  { id:'exchange', title:'Architecture Exchange Centre', description:'Validate, import, compare and export Structurizr, CALM and LikeC4 models with canonical identity preservation.', outcome:'Governed interoperability', roles:['solution-architect','enterprise-architect','administrator'], icon:GitPullRequestArrow, target:{kind:'workspace',id:'comparison'} },
  { id:'provider', title:'Provider Mapping Studio', description:'Map vendor-neutral capabilities to governed AWS, Azure, GCP, portable and on-premises products.', outcome:'Portable realization choices', roles:['solution-architect','platform-architect','enterprise-architect'], icon:ServerCog, target:{kind:'stage',id:'physicalTechnology'} },
  { id:'runtime-design', title:'Runtime-to-Design Studio', description:'Overlay observed topology, drift and SLO evidence onto the intended architecture and prepare remediation.', outcome:'Closed-loop architecture', roles:['platform-architect','reviewer','administrator'], icon:Network, target:{kind:'workspace',id:'drift'} },
  { id:'brain-lab', title:'Architecture Brain Evaluation Lab', description:'Run deterministic benchmark scenarios, calibration proposals and recommendation stability checks.', outcome:'Measurable architecture intelligence', roles:['enterprise-architect','knowledge-curator','administrator'], icon:BrainCircuit, target:{kind:'workspace',id:'pilot'} },
  { id:'workers', title:'Worker Operations Console', description:'Operate durable jobs, heartbeats, retries, cancellation and dead-letter recovery.', outcome:'Production knowledge operations', roles:['administrator','knowledge-curator'], icon:ServerCog, target:{kind:'admin',tab:'repoPilot'} },
];
interface ActionCard {
  id: string;
  title: string;
  description: string;
  meta: string;
  icon: LucideIcon;
  target: RoleShellTarget;
  tone?: 'good' | 'warn' | 'risk' | 'neutral';
}

function roleMetrics(roleId: ExperienceProfileId, project: any, findings: any[], library: any): Metric[] {
  const hard = findings.filter((item) => item.severity === 'HARD').length;
  const advisory = findings.length - hard;
  const approvals = project.stageApprovals ?? [];
  const pendingApprovals = approvals.filter((item: any) => item.status === 'pending').length;
  const runtimeResources = (project.runtimeInventories ?? []).reduce((total: number, item: any) => total + (item.resources?.length ?? 0), 0);
  const drift = (project.driftReports ?? []).reduce((total: number, item: any) => total + (item.findings?.length ?? 0), 0);
  const claims = (library.evidence ?? []).length;
  const patterns = (library.patterns ?? []).length;
  if (roleId === 'enterprise-architect') return [
    { label: 'Portfolio risks', value: hard + advisory, detail: `${hard} hard · ${advisory} advisory`, tone: hard ? 'risk' : advisory ? 'warn' : 'good' },
    { label: 'Reusable assets', value: patterns, detail: 'governed patterns available', tone: 'good' },
    { label: 'Pending decisions', value: pendingApprovals, detail: 'architecture dispositions', tone: pendingApprovals ? 'warn' : 'good' },
    { label: 'Technology concentration', value: new Set((project.nodes ?? []).filter((node: any) => node.stage === 'physicalTechnology').map((node: any) => node.kind)).size, detail: 'physical product families', tone: 'neutral' },
  ];
  if (roleId === 'platform-architect') return [
    { label: 'Intended topology', value: (project.nodes ?? []).filter((node: any) => node.stage === 'physicalTechnology').length, detail: 'physical architecture objects', tone: 'neutral' },
    { label: 'Observed resources', value: runtimeResources, detail: 'runtime inventory resources', tone: runtimeResources ? 'good' : 'warn' },
    { label: 'Drift findings', value: drift, detail: 'intended vs observed gaps', tone: drift ? 'warn' : 'good' },
    { label: 'Control findings', value: findings.length, detail: 'security and conformance signals', tone: hard ? 'risk' : advisory ? 'warn' : 'good' },
  ];
  if (roleId === 'reviewer') return [
    { label: 'Assigned reviews', value: (project.reviewAssignments ?? []).filter((item: any) => item.status !== 'completed').length, detail: 'open review assignments', tone: 'neutral' },
    { label: 'Pending baselines', value: pendingApprovals, detail: 'awaiting disposition', tone: pendingApprovals ? 'warn' : 'good' },
    { label: 'Hard findings', value: hard, detail: 'must be resolved or accepted', tone: hard ? 'risk' : 'good' },
    { label: 'Evidence coverage', value: `${Math.max(0, 100 - findings.length * 4)}%`, detail: 'reference readiness estimate', tone: findings.length > 10 ? 'warn' : 'good' },
  ];
  if (roleId === 'knowledge-curator') return [
    { label: 'Approved patterns', value: patterns, detail: `release ${library.knowledgeReleaseId ?? 'unversioned'}`, tone: 'good' },
    { label: 'Evidence receipts', value: claims, detail: 'governed provenance records', tone: 'good' },
    { label: 'Contradictions', value: 0, detail: 'open conflict queue', tone: 'good' },
    { label: 'Release posture', value: library.status ?? 'unknown', detail: 'active knowledge state', tone: library.status === 'approved' ? 'good' : 'warn' },
  ];
  return [
    { label: 'Production blockers', value: hard + pendingApprovals, detail: 'architecture and approval blockers', tone: hard + pendingApprovals ? 'risk' : 'good' },
    { label: 'Knowledge release', value: library.knowledgeReleaseId ?? 'none', detail: 'active governed release', tone: 'good' },
    { label: 'Runtime resources', value: runtimeResources, detail: 'observed infrastructure', tone: runtimeResources ? 'good' : 'warn' },
    { label: 'Audit events', value: (project.activityEvents ?? project.recentActivity ?? []).length, detail: 'traceability events', tone: 'neutral' },
  ];
}

function roleActions(roleId: ExperienceProfileId, project: any, findings: any[]): ActionCard[] {
  const pending = (project.stageApprovals ?? []).filter((item: any) => item.status === 'pending').length;
  if (roleId === 'enterprise-architect') return [
    { id: 'risk', title: 'Risk concentration', description: 'Inspect cross-project risks, duplicated capabilities and technology concentration.', meta: `${findings.length} current architecture signal(s)`, icon: Radar, target: { kind: 'workspace', id: 'portfolio' }, tone: findings.length ? 'warn' : 'good' },
    { id: 'reuse', title: 'Reuse candidates', description: 'Find reusable patterns, services and platform capabilities before approving new build.', meta: 'Pattern and capability lenses', icon: Boxes, target: { kind: 'workspace', id: 'patterns' } },
    { id: 'standards', title: 'Standards impact', description: 'Review policy obligations, exceptions and affected projects.', meta: `${pending} pending disposition(s)`, icon: ShieldCheck, target: { kind: 'workspace', id: 'governance' }, tone: pending ? 'warn' : 'neutral' },
    { id: 'alternatives', title: 'Architecture alternatives', description: 'Compare branches, snapshots and recommendation options side by side.', meta: `${(project.branches ?? []).length} architecture branch(es)`, icon: GitCompareArrows, target: { kind: 'workspace', id: 'comparison' } },
  ];
  if (roleId === 'platform-architect') return [
    { id: 'topology', title: 'Intended topology', description: 'Model vendor-neutral capabilities and physical deployment in one continuous flow.', meta: 'Logical → physical lineage', icon: Network, target: { kind: 'stage', id: 'physicalTechnology' } },
    { id: 'observed', title: 'Observed architecture', description: 'Run collectors and inspect telemetry-derived runtime topology.', meta: `${(project.runtimeInventories ?? []).length} inventory snapshot(s)`, icon: ServerCog, target: { kind: 'workspace', id: 'runtime' } },
    { id: 'drift', title: 'Drift and remediation', description: 'Compare intended and observed architecture, then prepare governed change sets.', meta: `${(project.driftReports ?? []).length} drift report(s)`, icon: GitPullRequestArrow, target: { kind: 'workspace', id: 'drift' } },
    { id: 'controls', title: 'Controls and SLOs', description: 'Join conformance evidence, security controls and operational service levels.', meta: `${findings.length} control signal(s)`, icon: Activity, target: { kind: 'workspace', id: 'conformance' } },
  ];
  if (roleId === 'reviewer') return [
    { id: 'queue', title: 'Assigned review queue', description: 'Open the evidence-led assurance workspace with findings, model and disposition.', meta: `${pending} baseline(s) awaiting disposition`, icon: ShieldCheck, target: { kind: 'stage', id: 'validationRealization' }, tone: pending ? 'warn' : 'neutral' },
    { id: 'findings', title: 'Findings requiring judgement', description: 'Separate deterministic blockers, advisory risks and accepted exceptions.', meta: `${findings.length} open finding(s)`, icon: AlertTriangle, target: { kind: 'stage', id: 'validationRealization' }, tone: findings.length ? 'warn' : 'good' },
    { id: 'compare', title: 'Compare alternatives', description: 'Test the proposed design against baselines and alternative branches.', meta: `${(project.branches ?? []).length} branch(es) available`, icon: GitCompareArrows, target: { kind: 'workspace', id: 'comparison' } },
    { id: 'evidence', title: 'Evidence ledger', description: 'Inspect conformance evidence, expiry and implementation proof.', meta: 'Read-only assurance path', icon: BadgeCheck, target: { kind: 'workspace', id: 'conformance' } },
  ];
  if (roleId === 'knowledge-curator') return [
    { id: 'claims', title: 'Claim review queue', description: 'Review candidate claims with source context, semantic differences and release impact.', meta: 'Queue-first curation', icon: DatabaseZap, target: { kind: 'knowledge', tab: 'claims' } },
    { id: 'conflicts', title: 'Contradictions', description: 'Resolve conflicting claims without erasing contextual disagreement.', meta: 'Corroboration and conflict evidence', icon: GitCompareArrows, target: { kind: 'knowledge', tab: 'contradictions' } },
    { id: 'normalize', title: 'Normalize vocabulary', description: 'Merge duplicates, aliases and vendor realizations into canonical records.', meta: 'Synonym and duplicate controls', icon: RefreshCw, target: { kind: 'knowledge', tab: 'duplicates' } },
    { id: 'release', title: 'Release impact', description: 'See which recommendations, patterns and stage kits change before promotion.', meta: 'Four-eyes governed promotion', icon: Waypoints, target: { kind: 'admin', tab: 'releases' } },
  ];
  return [
    { id: 'identity', title: 'Identity and tenancy', description: 'Configure OIDC, SAML, RBAC, tenant isolation and policy posture.', meta: 'Security control domain', icon: ShieldCheck, target: { kind: 'admin', tab: 'security' } },
    { id: 'routes', title: 'AI routes and policy', description: 'Manage model routes, authority boundaries, secrets and deterministic fallback.', meta: 'Provider and LLM governance', icon: BrainCircuit, target: { kind: 'admin', tab: 'models' } },
    { id: 'connectors', title: 'Source connectors', description: 'Operate GitHub, GitLab and Azure DevOps refresh and evidence intake.', meta: 'Read-only governed connectors', icon: Route, target: { kind: 'admin', tab: 'repositories' } },
    { id: 'workers', title: 'Worker operations', description: 'Inspect durable jobs, heartbeats, retries, cancellation and dead-letter recovery.', meta: 'Queue and worker operations', icon: ServerCog, target: { kind: 'admin', tab: 'runtime' } },
    { id: 'trust', title: 'Evidence and signing', description: 'Inspect evidence expiry, checksums, managed signing and independent verification.', meta: 'Trust and evidence ledger', icon: BadgeCheck, target: { kind: 'admin', tab: 'audit' } },
    { id: 'readiness', title: 'Production promotion', description: 'Close blockers across workers, durability, signing, telemetry and recovery.', meta: 'Environment promotion gate', icon: CheckCircle2, target: { kind: 'admin', tab: 'production' }, tone: 'warn' },
  ];
}

function navigate(target: RoleShellTarget, setWorkspaceMode: (mode: WorkspaceModeId) => void, setActiveStage: (stage: any) => void) {
  if (target.kind === 'stage') {
    setActiveStage(target.id);
    setWorkspaceMode('design');
    return;
  }
  if (target.kind === 'workspace') {
    setWorkspaceMode(target.id);
    return;
  }
  if (target.kind === 'admin') {
    window.sessionStorage.setItem('aiw.activeAdminTab', target.tab);
    setWorkspaceMode('admin');
    window.setTimeout(() => window.dispatchEvent(new CustomEvent('aiw:admin-tab', { detail: { tab: target.tab } })), 0);
    return;
  }
  window.sessionStorage.setItem('aiw.activeKnowledgeTab', target.tab);
  setWorkspaceMode('knowledge');
  window.setTimeout(() => window.dispatchEvent(new CustomEvent('aiw:knowledge-tab', { detail: { tab: target.tab } })), 0);
}

export function RoleCommandSurface() {
  const roleId = useWorkspaceStore((state) => state.experienceProfile);
  const project = useWorkspaceStore((state) => state.project) as any;
  const findings = useWorkspaceStore((state) => state.findings) as any[];
  const library = useWorkspaceStore((state) => state.library) as any;
  const setWorkspaceMode = useWorkspaceStore((state) => state.setWorkspaceMode);
  const setActiveStage = useWorkspaceStore((state) => state.setActiveStage);
  const definition = roleShellDefinition(roleId);
  const metrics = roleMetrics(roleId, project, findings, library);
  const actions = roleActions(roleId, project, findings);
  const products = capabilityProducts.filter((item) => item.roles.includes(roleId));
  const open = (target: RoleShellTarget) => navigate(target, setWorkspaceMode, setActiveStage);

  return (
    <section className={`role-command-surface role-command-surface--${roleId}`} data-testid="role-command-surface">
      <header className="role-command-surface__hero">
        <div>
          <span className="eyebrow"><Sparkles size={14}/> {definition.shortShell} workspace</span>
          <h1>{definition.shell}</h1>
          <p>{definition.purpose}</p>
        </div>
        <button type="button" className="button button--primary" onClick={() => open(definition.lenses[0]!.target)}>
          {definition.primaryAction} <ArrowRight size={15}/>
        </button>
      </header>

      <div className="role-command-surface__metrics" aria-label="Role workspace metrics">
        {metrics.map((metric) => <article key={metric.label} className={`tone-${metric.tone ?? 'neutral'}`}>
          <span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small>
        </article>)}
      </div>

      <section className="role-command-surface__now" aria-label="What needs attention now">
        <div className="role-command-surface__section-heading">
          <div><span className="eyebrow">Work that matters now</span><h2>Choose a task, not a generic module</h2></div>
          <small>{project.name} · revision {project.revision}</small>
        </div>
        <div className="role-command-surface__actions">
          {actions.map((action) => {
            const Icon = action.icon;
            return <button key={action.id} type="button" className={`tone-${action.tone ?? 'neutral'}`} onClick={() => open(action.target)}>
              <span className="role-command-surface__action-icon"><Icon size={18}/></span>
              <span><strong>{action.title}</strong><small>{action.description}</small><b>{action.meta}</b></span>
              <ArrowRight size={15}/>
            </button>;
          })}
        </div>
      </section>


      <section className="role-command-surface__capabilities" aria-label="Differentiating AIW capability products">
        <div className="role-command-surface__section-heading"><div><span className="eyebrow">Differentiating capability surface</span><h2>Use the intelligence already implemented in the platform</h2></div><small>{products.length} role-relevant product(s)</small></div>
        <div className="role-command-surface__capability-grid">{products.map((product) => { const Icon = product.icon; return <button key={product.id} type="button" onClick={() => open(product.target)}><Icon size={18}/><span><strong>{product.title}</strong><small>{product.description}</small><b>{product.outcome}</b></span><ArrowRight size={14}/></button>; })}</div>
      </section>

      <section className="role-command-surface__model-strip" aria-label="Canonical architecture summary">
        <div><Layers3 size={16}/><span><strong>{project.nodes?.length ?? 0}</strong><small>canonical objects</small></span></div>
        <div><Route size={16}/><span><strong>{project.edges?.length ?? 0}</strong><small>semantic relationships</small></span></div>
        <div><CircleDotDashed size={16}/><span><strong>{project.interfaces?.length ?? 0}</strong><small>interface contracts</small></span></div>
        <div><BadgeCheck size={16}/><span><strong>{project.stageApprovals?.filter((item: any) => item.status === 'approved').length ?? 0}</strong><small>approved stage baselines</small></span></div>
      </section>
    </section>
  );
}
