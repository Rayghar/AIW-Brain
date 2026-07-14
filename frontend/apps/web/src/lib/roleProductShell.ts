import type { ExperienceProfileId, WorkspaceModeId } from './experienceProfiles';
import type { ArchitectureStage } from '@aiw/domain';

export type RoleShellTarget =
  | { kind: 'workspace'; id: WorkspaceModeId }
  | { kind: 'stage'; id: ArchitectureStage }
  | { kind: 'admin'; tab: string }
  | { kind: 'knowledge'; tab: string };

export interface RoleShellLens {
  id: string;
  label: string;
  caption: string;
  target: RoleShellTarget;
}

export interface RoleShellDefinition {
  id: ExperienceProfileId;
  shell: string;
  shortShell: string;
  purpose: string;
  primaryAction: string;
  lenses: RoleShellLens[];
}

export const roleShellDefinitions: Record<ExperienceProfileId, RoleShellDefinition> = {
  'solution-architect': {
    id: 'solution-architect',
    shell: 'Architecture Studio',
    shortShell: 'Studio',
    purpose: 'Turn intent into a complete, traceable and reviewable solution model.',
    primaryAction: 'Continue architecture',
    lenses: [
      { id: 'brief', label: 'Brief', caption: 'Mission and constraints', target: { kind: 'stage', id: 'designIntent' } },
      { id: 'drivers', label: 'Drivers', caption: 'Quality scenarios', target: { kind: 'workspace', id: 'quality' } },
      { id: 'model', label: 'Model', caption: 'Canvas and Viewbook', target: { kind: 'stage', id: 'logicalApplication' } },
      { id: 'patterns', label: 'Compose', caption: 'Patterns and topology', target: { kind: 'workspace', id: 'patterns' } },
      { id: 'synthesis', label: 'Options', caption: 'Compare alternatives', target: { kind: 'workspace', id: 'synthesis' } },
      { id: 'review', label: 'Review', caption: 'Evidence and handoff', target: { kind: 'stage', id: 'validationRealization' } },
    ],
  },
  'enterprise-architect': {
    id: 'enterprise-architect',
    shell: 'Portfolio Intelligence Studio',
    shortShell: 'Portfolio',
    purpose: 'See cross-project risk, reuse, standards impact and investment decisions in one place.',
    primaryAction: 'Open portfolio intelligence',
    lenses: [
      { id: 'portfolio', label: 'Portfolio', caption: 'Health and concentration', target: { kind: 'workspace', id: 'cockpit' } },
      { id: 'risk', label: 'Risk', caption: 'Cross-project exposure', target: { kind: 'workspace', id: 'portfolio' } },
      { id: 'reuse', label: 'Reuse', caption: 'Capability duplication', target: { kind: 'workspace', id: 'portfolio' } },
      { id: 'standards', label: 'Standards', caption: 'Impact and exceptions', target: { kind: 'workspace', id: 'governance' } },
      { id: 'compare', label: 'Compare', caption: 'Alternatives and branches', target: { kind: 'workspace', id: 'comparison' } },
      { id: 'evaluation', label: 'Evaluation Lab', caption: 'Architecture outcome proof', target: { kind: 'workspace', id: 'pilot' } },
    ],
  },
  'platform-architect': {
    id: 'platform-architect',
    shell: 'Platform Architecture Command Surface',
    shortShell: 'Platform',
    purpose: 'Connect intended topology, observed runtime, drift, controls and SLO evidence.',
    primaryAction: 'Open platform topology',
    lenses: [
      { id: 'intended', label: 'Intended', caption: 'Logical capabilities', target: { kind: 'stage', id: 'logicalTechnology' } },
      { id: 'topology', label: 'Topology', caption: 'Physical deployment', target: { kind: 'stage', id: 'physicalTechnology' } },
      { id: 'observed', label: 'Observed', caption: 'Runtime inventory', target: { kind: 'workspace', id: 'runtime' } },
      { id: 'drift', label: 'Drift', caption: 'Intended vs actual', target: { kind: 'workspace', id: 'drift' } },
      { id: 'controls', label: 'Controls', caption: 'Security and conformance', target: { kind: 'workspace', id: 'conformance' } },
      { id: 'slos', label: 'SLOs', caption: 'Operational posture', target: { kind: 'workspace', id: 'operations' } },
    ],
  },
  reviewer: {
    id: 'reviewer',
    shell: 'Architecture Assurance Studio',
    shortShell: 'Assurance',
    purpose: 'Review findings, model evidence and disposition without entering producer workflows.',
    primaryAction: 'Open assigned review queue',
    lenses: [
      { id: 'queue', label: 'Queue', caption: 'Assigned reviews', target: { kind: 'stage', id: 'validationRealization' } },
      { id: 'findings', label: 'Findings', caption: 'Risk and decisions', target: { kind: 'stage', id: 'validationRealization' } },
      { id: 'compare', label: 'Compare', caption: 'Alternatives and baselines', target: { kind: 'workspace', id: 'comparison' } },
      { id: 'evidence', label: 'Evidence', caption: 'Conformance ledger', target: { kind: 'workspace', id: 'conformance' } },
      { id: 'governance', label: 'Governance', caption: 'Approvals and obligations', target: { kind: 'workspace', id: 'governance' } },
      { id: 'audit', label: 'Audit', caption: 'Traceability events', target: { kind: 'admin', tab: 'audit' } },
    ],
  },
  'knowledge-curator': {
    id: 'knowledge-curator',
    shell: 'Knowledge Studio',
    shortShell: 'Knowledge',
    purpose: 'Triage claims, resolve conflicts, normalize records and publish governed releases.',
    primaryAction: 'Open curation queue',
    lenses: [
      { id: 'queue', label: 'Queue', caption: 'Claims awaiting review', target: { kind: 'knowledge', tab: 'claims' } },
      { id: 'conflicts', label: 'Conflicts', caption: 'Contradictions', target: { kind: 'knowledge', tab: 'contradictions' } },
      { id: 'normalize', label: 'Normalize', caption: 'Duplicates and aliases', target: { kind: 'knowledge', tab: 'duplicates' } },
      { id: 'sources', label: 'Sources', caption: 'Authority and refresh', target: { kind: 'knowledge', tab: 'sources' } },
      { id: 'dna', label: 'Pattern DNA', caption: 'Editorial completeness', target: { kind: 'admin', tab: 'patterns' } },
      { id: 'release', label: 'Release', caption: 'Promote and pin', target: { kind: 'admin', tab: 'releases' } },
    ],
  },
  administrator: {
    id: 'administrator',
    shell: 'AIW Control Plane',
    shortShell: 'Control',
    purpose: 'Operate identity, providers, connectors, workers, releases, evidence and recovery.',
    primaryAction: 'Open control plane',
    lenses: [
      { id: 'overview', label: 'Overview', caption: 'Platform posture', target: { kind: 'admin', tab: 'overview' } },
      { id: 'identity', label: 'Identity', caption: 'Tenant and RBAC', target: { kind: 'admin', tab: 'security' } },
      { id: 'routes', label: 'AI routes', caption: 'Models and policies', target: { kind: 'admin', tab: 'models' } },
      { id: 'sources', label: 'Connectors', caption: 'Repositories and refresh', target: { kind: 'admin', tab: 'repositories' } },
      { id: 'workers', label: 'Workers', caption: 'Queues and jobs', target: { kind: 'admin', tab: 'repoPilot' } },
      { id: 'readiness', label: 'Readiness', caption: 'Promotion gates', target: { kind: 'admin', tab: 'production' } },
    ],
  },
};

export function roleShellDefinition(id: ExperienceProfileId) {
  return roleShellDefinitions[id] ?? roleShellDefinitions['solution-architect'];
}
