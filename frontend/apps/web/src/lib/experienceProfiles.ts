export type ExperienceProfileId =
  | 'solution-architect'
  | 'enterprise-architect'
  | 'platform-architect'
  | 'reviewer'
  | 'knowledge-curator'
  | 'administrator';

export type WorkspaceModeId =
  | 'cockpit'
  | 'design'
  | 'activation'
  | 'admin'
  | 'quality'
  | 'portfolio'
  | 'governance'
  | 'comparison'
  | 'collaboration'
  | 'security'
  | 'drift'
  | 'conformance'
  | 'operations'
  | 'knowledge'
  | 'patterns'
  | 'synthesis'
  | 'runtime'
  | 'pilot';

export interface ExperienceProfile {
  id: ExperienceProfileId;
  label: string;
  description: string;
  visibleWorkspaces: WorkspaceModeId[];
  preferredWorkspaces: WorkspaceModeId[];
  readOnly: boolean;
  apiRoles: string[];
  capabilities: string[];
}

export const experienceProfiles: ExperienceProfile[] = [
  {
    id: 'solution-architect',
    label: 'Solution Architect',
    description: 'Brief, quality scenarios, design, patterns, synthesis and review.',
    visibleWorkspaces: ['cockpit','design','activation','quality','patterns','synthesis','governance','collaboration','security','conformance','comparison'],
    preferredWorkspaces: ['cockpit','activation','design','quality','patterns','synthesis'],
    readOnly: false,
    apiRoles: ['solution-architect'],
    capabilities: ['architecture.read','architecture.write','review.read','artifact.generate'],
  },
  {
    id: 'enterprise-architect',
    label: 'Enterprise Architect',
    description: 'Portfolio, standards, governance, knowledge and cross-solution risk.',
    visibleWorkspaces: ['cockpit','portfolio','governance','comparison','conformance','knowledge','patterns','pilot','admin'],
    preferredWorkspaces: ['cockpit','activation','portfolio','pilot','governance','knowledge','comparison'],
    readOnly: false,
    apiRoles: ['enterprise-architect'],
    capabilities: ['architecture.read','review.read','review.disposition','portfolio.read'],
  },
  {
    id: 'platform-architect',
    label: 'Platform Architect',
    description: 'Technology realization, operational posture, drift and conformance.',
    visibleWorkspaces: ['cockpit','design','security','runtime','drift','conformance','operations','governance','comparison'],
    preferredWorkspaces: ['cockpit','activation','design','conformance','operations','drift','security'],
    readOnly: false,
    apiRoles: ['platform-architect'],
    capabilities: ['architecture.read','architecture.write','review.read','platform.evidence'],
  },
  {
    id: 'reviewer',
    label: 'Reviewer',
    description: 'Read-focused review, governance, comparison and evidence inspection.',
    visibleWorkspaces: ['cockpit','design','governance','comparison','collaboration','security','conformance','admin'],
    preferredWorkspaces: ['cockpit','activation','governance','comparison','design'],
    readOnly: true,
    apiRoles: ['architecture-reviewer'],
    capabilities: ['architecture.read','review.read','review.disposition'],
  },
  {
    id: 'knowledge-curator',
    label: 'Knowledge Curator',
    description: 'Source governance, Pattern DNA quality, calibration and release operations.',
    visibleWorkspaces: ['cockpit','knowledge','patterns','quality','governance','pilot','admin'],
    preferredWorkspaces: ['cockpit','knowledge','patterns','pilot','quality','admin'],
    readOnly: false,
    apiRoles: ['knowledge-curator'],
    capabilities: ['architecture.read','review.read','knowledge.curate'],
  },
  {
    id: 'administrator',
    label: 'Administrator',
    description: 'All workspaces, provider configuration, security and platform readiness.',
    visibleWorkspaces: ['cockpit','portfolio','governance','comparison','conformance','knowledge','patterns','pilot','admin'],
    preferredWorkspaces: ['cockpit','admin','activation','runtime','pilot','security','knowledge','operations'],
    readOnly: false,
    apiRoles: ['platform-admin'],
    capabilities: ['architecture.read','review.read','review.disposition','portfolio.read','platform.evidence','knowledge.curate','admin.operate'],
  },
];

export function experienceProfile(id: ExperienceProfileId): ExperienceProfile {
  return experienceProfiles.find((profile) => profile.id === id) ?? experienceProfiles[0]!;
}
