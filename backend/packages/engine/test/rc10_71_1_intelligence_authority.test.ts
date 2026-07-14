import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureProject, type CanonicalRequirementRecord } from '@aiw/domain';
import {
  detectRequirementConflicts,
  distillRequirementsDeterministically,
  mergeRequirementsProposal,
  migrateLegacyRequirementsProject,
} from '../src/index.js';

function sparseProject(): ArchitectureProject {
  const project = structuredClone(sampleProject) as ArchitectureProject;
  project.description = 'Create a governed agency transaction platform.';
  project.objectives = [];
  project.constraints = [];
  project.assumptions = [];
  project.requirementsIntelligence = undefined;
  project.revision = 20;
  return project;
}

function requirement(id: string, statement: string): CanonicalRequirementRecord {
  const now = new Date().toISOString();
  return {
    id,
    title: statement,
    statement,
    type: 'quality',
    priority: 'critical',
    origin: 'source-derived',
    status: 'candidate',
    confidence: 0.9,
    evidenceRefs: [],
    stakeholderRefs: [],
    journeyRefs: [],
    acceptanceCriteria: [],
    qualityAttributeHints: ['availability'],
    tags: [],
    ambiguityFlags: [],
    rationale: 'Test requirement.',
    createdAt: now,
    updatedAt: now,
  };
}

describe('rc.10.71.1 intelligence authority and semantic context graph', () => {
  it('detects duplicate, contradictory and numeric-target conflicts for human adjudication', () => {
    const conflicts = detectRequirementConflicts([
      requirement('REQ-A', 'The transaction service must remain available for 99.9% of each month.'),
      requirement('REQ-B', 'The transaction service must remain available for 99.99% of each month.'),
      requirement('REQ-C', 'The transaction service must not remain available during maintenance windows.'),
    ]);

    expect(conflicts.some((item) => item.kind === 'numeric-target')).toBe(true);
    expect(conflicts.some((item) => item.kind === 'contradiction')).toBe(true);
    expect(conflicts.every((item) => item.status === 'open')).toBe(true);
  });

  it('builds a typed context graph and marks traced downstream architecture semantically stale after a requirement changes', () => {
    const project = sparseProject();
    const first = distillRequirementsDeterministically({
      project,
      sources: [{ name: 'brief.txt', kind: 'paste', text: 'The platform must process agent cash deposits. The platform must integrate with core banking. The platform must be highly available.' }],
    });
    const accepted = mergeRequirementsProposal(project, first);
    const tracedRequirement = accepted.requirementsIntelligence!.requirements.find((item) => /cash deposits/i.test(item.statement))!;
    const existingNode = accepted.nodes[0]!;
    accepted.nodes = [{
      ...existingNode,
      id: 'NODE-TRACE-1',
      label: 'Deposit Processing Responsibility',
      stage: 'logicalApplication',
      properties: { ...existingNode.properties, requirementRefs: [tracedRequirement.id] },
      lineageFrom: [],
    }];

    const second = distillRequirementsDeterministically({
      project: accepted,
      sources: [{ name: 'brief.txt', kind: 'paste', text: 'The platform must process and reverse agent cash deposits. The platform must integrate with core banking. The platform must be highly available.' }],
    });
    const updated = mergeRequirementsProposal(accepted, second);
    const graph = updated.requirementsIntelligence!.contextGraph!;
    const semanticChanges = updated.requirementsIntelligence!.semanticChanges!;

    expect(graph.nodes.some((item) => item.kind === 'requirement')).toBe(true);
    expect(graph.nodes.some((item) => item.kind === 'journey')).toBe(true);
    expect(graph.nodes.some((item) => item.kind === 'context-package')).toBe(true);
    expect(graph.edges.some((item) => item.sourceId === tracedRequirement.id && item.targetId === 'NODE-TRACE-1')).toBe(true);
    expect(semanticChanges.some((item) => item.changedRef === tracedRequirement.id && item.changeKind === 'modified')).toBe(true);
    expect(graph.nodes.find((item) => item.id === 'NODE-TRACE-1')?.status).toBe('stale');
    expect(graph.stageSlices.find((item) => item.stage === 'logicalApplication')?.staleRefs).toContain('NODE-TRACE-1');
    expect(graph.nodes.filter((item) => item.kind === 'context-package').every((item) => item.status === 'accepted')).toBe(true);
    expect(graph.nodes.filter((item) => ['journey','interaction','participant'].includes(item.kind)).every((item) => item.status !== 'stale')).toBe(true);
  });

  it('migrates legacy fields once and records canonical authority without deleting compatibility projections', () => {
    const project = sparseProject();
    project.objectives = ['Enable agent-assisted customer transactions.'];
    project.constraints = ['Customer data must remain in approved jurisdictions.'];
    project.assumptions = ['Core banking APIs remain available.'];
    project.context.stakeholders = ['Business Owner'];
    project.context.inScopeCapabilities = ['Cash deposit'];

    const migrated = migrateLegacyRequirementsProject(project);
    expect(migrated.revision).toBe(project.revision + 1);
    expect(migrated.requirementsIntelligence?.migrationReceipt?.canonicalAuthority).toBe('requirements-intelligence');
    expect(migrated.requirementsIntelligence?.migrationReceipt?.legacyFieldsRetainedAsProjection).toBe(true);
    expect(migrated.requirementsIntelligence?.requirements.length).toBeGreaterThanOrEqual(4);
    expect(migrateLegacyRequirementsProject(migrated).revision).toBe(migrated.revision);
  });
});
