import type { ArchitectureStage, EntityKind } from './types.js';

export const architectureDecompositionLevels = [
  'landscape',
  'system',
  'container',
  'component',
  'code',
  'deployment',
] as const;
export type ArchitectureDecompositionLevel = (typeof architectureDecompositionLevels)[number];

export interface ArchitectureScopeSummary {
  nodeId: string;
  label: string;
  level: ArchitectureDecompositionLevel;
  stage: ArchitectureStage;
  kind: EntityKind;
  parentNodeId?: string | undefined;
  childNodeIds: string[];
  breadcrumbNodeIds: string[];
  sourceRepository?: string | undefined;
  implementationPath?: string | undefined;
}

export const architectureDecompositionIssueKinds = [
  'missing-parent',
  'invalid-parent-level',
  'mixed-abstraction',
  'uncontracted-boundary-crossing',
  'missing-implementation-path',
  'orphan-deployment',
] as const;
export type ArchitectureDecompositionIssueKind = (typeof architectureDecompositionIssueKinds)[number];

export interface ArchitectureDecompositionIssue {
  id: string;
  kind: ArchitectureDecompositionIssueKind;
  severity: 'info' | 'warning' | 'blocker';
  nodeIds: string[];
  message: string;
  remediation: string;
}

export interface ArchitectureDecompositionReport {
  generatedAt: string;
  scopes: ArchitectureScopeSummary[];
  issues: ArchitectureDecompositionIssue[];
  countsByLevel: Record<ArchitectureDecompositionLevel, number>;
  valid: boolean;
}
