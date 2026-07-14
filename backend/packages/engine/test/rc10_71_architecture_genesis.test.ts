import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureProject } from '@aiw/domain';
import { distillRequirementsDeterministically, mergeRequirementsProposal, resolveRequirementConflict } from '../src/requirementsGenesis.js';

function sparseProject(): ArchitectureProject {
  const project = structuredClone(sampleProject) as ArchitectureProject;
  project.description = 'Create an agency banking platform for agents and customers.';
  project.objectives = [];
  project.constraints = [];
  project.assumptions = [];
  project.qualityScenarios = [];
  project.requirementsIntelligence = undefined;
  project.revision = 12;
  return project;
}

const brief = `
AGENCY BANKING SOLUTION BRIEF
The solution must enable agents to register customers, complete identity verification, accept cash deposits, perform cash withdrawals and initiate transfers through the bank.
Customers and agents require clear transaction status and support for failed transaction reversal.
The platform integrates with the core banking platform, identity provider and payment switch.
The solution must be highly available, fast and secure during peak transaction periods.
Operations must reconcile transactions, investigate disputes and retain an auditable record of activity.
Customer information must remain within approved jurisdictions.
`;

describe('rc.10.71 architecture genesis', () => {
  it('distils governed requirements, stakeholders, journeys and stage-specific architecture context without mutating the project', () => {
    const project = sparseProject();
    const before = JSON.stringify(project);
    const proposal = distillRequirementsDeterministically({
      project,
      sources: [{ name: 'Agency Banking Brief.md', kind: 'markdown', classification: 'confidential', text: brief }],
      knowledgeReleaseId: 'CAMBRIDGE-SA-1.0',
    });

    expect(proposal.schemaVersion).toBe('1.0');
    expect(proposal.sourceRecords).toHaveLength(1);
    expect(proposal.evidence.length).toBeGreaterThan(0);
    expect(proposal.requirements.length).toBeGreaterThanOrEqual(6);
    expect(proposal.requirements.every((item) => item.evidenceRefs.length > 0)).toBe(true);
    expect(proposal.stakeholders.some((item) => /agent/i.test(item.name))).toBe(true);
    expect(proposal.journeys.length).toBeGreaterThanOrEqual(3);
    expect(proposal.journeys.every((item) => item.paths.some((path) => path.kind === 'happy'))).toBe(true);
    expect(proposal.journeys.some((item) => item.paths.some((path) => path.kind === 'failure' || path.kind === 'recovery'))).toBe(true);
    expect(proposal.contextPackages.map((item) => item.target)).toEqual(expect.arrayContaining(['qualityDrivers','systemContext','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','reviewAssurance','sddPack']));
    expect(proposal.contextPackages.find((item) => item.target === 'systemContext')?.journeyRefs.length).toBeGreaterThan(0);
    const interaction = proposal.contextGraph?.nodes.find((item) => item.kind === 'interaction');
    expect(interaction).toBeTruthy();
    expect(proposal.contextGraph?.edges.some((item) => item.targetId === interaction?.id && item.kind === 'participates-in')).toBe(true);
    expect(proposal.contextGraph?.edges.some((item) => item.sourceId === interaction?.id && item.kind === 'communicates-with')).toBe(true);
    expect(JSON.stringify(project)).toBe(before);
  });

  it('surfaces unsupported quality targets as ambiguity and clarification rather than inventing numeric measures', () => {
    const proposal = distillRequirementsDeterministically({
      project: sparseProject(),
      sources: [{ name: 'Idea.txt', kind: 'idea', text: 'The agent transaction service must be highly available, fast, scalable and secure during peak periods.' }],
    });

    expect(proposal.requirements.some((item) => item.ambiguityFlags.includes('Unmeasured qualitative target'))).toBe(true);
    expect(proposal.openQuestions.some((item) => /measurable latency|throughput|availability|recovery/i.test(item.question))).toBe(true);
    expect(JSON.stringify(proposal)).not.toMatch(/99\.9|500\s*ms|1000\s*(?:tps|rps)/i);
  });

  it('accepts a reviewed proposal atomically, hydrates the canonical project context and rejects stale proposals', () => {
    const project = sparseProject();
    const proposal = distillRequirementsDeterministically({ project, sources: [{ name: 'Brief.txt', kind: 'paste', text: brief }] });
    const next = mergeRequirementsProposal(project, proposal, 'CAMBRIDGE-SA-1.0');

    expect(next.revision).toBe(project.revision + 1);
    expect(next.requirementsIntelligence?.knowledgeReleaseId).toBe('CAMBRIDGE-SA-1.0');
    expect(next.requirementsIntelligence?.requirements.some((item) => item.status === 'accepted')).toBe(true);
    expect(next.requirementsIntelligence?.requirements.some((item) => item.status === 'candidate')).toBe(false);
    expect(next.requirementsIntelligence?.requirements.filter((item) => item.status === 'needs-clarification').every((item) => item.ambiguityFlags.length > 0)).toBe(true);
    expect(next.requirementsIntelligence?.journeys.every((item) => item.status === 'accepted')).toBe(true);
    expect(next.context.stakeholders?.length).toBeGreaterThan(0);
    expect(next.context.inScopeCapabilities?.length).toBeGreaterThan(0);
    expect(() => mergeRequirementsProposal(next, proposal)).toThrow('STALE_REQUIREMENTS_PROPOSAL');
  });

  it('blocks unresolved conflicts and preserves an auditable disposition in the canonical model', () => {
    const project = sparseProject();
    const proposal = distillRequirementsDeterministically({ project, sources: [{ name: 'Conflicting brief.txt', kind: 'paste', text: 'The platform shall allow agents to complete offline cash withdrawal. The platform shall not allow agents to complete offline cash withdrawal. The platform must integrate with core banking and retain an audit trail.' }] });
    const first = proposal.conflicts?.[0];
    expect(first).toBeTruthy();
    expect(() => mergeRequirementsProposal(project, proposal)).toThrow('UNRESOLVED_REQUIREMENTS_CONFLICTS');
    const reviewed = { ...proposal, conflicts: (proposal.conflicts ?? []).map((item) => ({ ...item, status: 'accepted-variance' as const, resolution: 'Offline withdrawal is allowed only in the explicitly approved degraded operating mode.' })) };
    const accepted = mergeRequirementsProposal(project, reviewed);
    expect(accepted.requirementsIntelligence?.conflicts?.every((item) => item.status !== 'open')).toBe(true);
    const reopened = { ...accepted, requirementsIntelligence: { ...accepted.requirementsIntelligence!, conflicts: accepted.requirementsIntelligence!.conflicts?.map((item, index) => index === 0 ? { ...item, status: 'open' as const, resolution: undefined } : item) } };
    const resolved = resolveRequirementConflict(reopened, { conflictId: first!.id, status: 'resolved', resolution: 'The canonical requirement requires identity-verified online processing; offline execution is excluded.' });
    expect(resolved.revision).toBe(reopened.revision + 1);
    expect(resolved.requirementsIntelligence?.conflicts?.find((item) => item.id === first!.id)?.status).toBe('resolved');
    expect(resolved.requirementsIntelligence?.health.contradictionCount).toBe(0);
  });
});
