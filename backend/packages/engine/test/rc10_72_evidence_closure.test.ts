import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureProject, type CanonicalRequirementRecord } from '@aiw/domain';
import {
  analyseRequirementContradictionsAdvanced,
  applyArchitectureSemanticStaleness,
  buildArchitectureContextGraph,
  detectArchitectureSemanticChanges,
  distillRequirementsDeterministically,
  mergeRequirementsProposal,
} from '../src/index.js';

function project(): ArchitectureProject {
  const value = structuredClone(sampleProject) as ArchitectureProject;
  value.description = 'Agency transaction platform with governed financial processing.';
  value.requirementsIntelligence = undefined;
  value.revision = 30;
  value.nodes = [];
  value.edges = [];
  value.interfaces = [];
  value.decisions = [];
  value.findings = [];
  return value;
}

function requirement(id: string, statement: string, tags: string[] = []): CanonicalRequirementRecord {
  const now = new Date().toISOString();
  return {
    id, title: statement, statement, type: 'quality', priority: 'critical', origin: 'source-derived', status: 'candidate', confidence: 0.9,
    evidenceRefs: [], stakeholderRefs: [], journeyRefs: [], acceptanceCriteria: [], qualityAttributeHints: [], tags, ambiguityFlags: [],
    rationale: 'Test', createdAt: now, updatedAt: now,
  };
}

describe('rc.10.72 evidence closure', () => {
  it('normalizes units, modalities, jurisdiction and authority while refusing automatic legal resolution', () => {
    const conflicts = analyseRequirementContradictionsAdvanced([
      requirement('REQ-1', 'The transaction API SHALL respond within 200 ms.', ['scope:transaction-api','jurisdiction:NG','authority:business-policy']),
      requirement('REQ-2', 'The transaction API SHALL respond within 2 seconds.', ['scope:transaction-api','jurisdiction:NG','authority:business-policy']),
      requirement('REQ-3', 'Customer data SHALL be encrypted at rest.', ['scope:customer-data','jurisdiction:NG','authority:regulation']),
      requirement('REQ-4', 'Customer data SHALL NOT be encrypted at rest.', ['scope:customer-data','jurisdiction:NG','authority:team-guideline']),
      requirement('REQ-5', 'Customer records SHALL be retained for 5 years.', ['scope:customer-records','jurisdiction:NG','authority:regulation','effective:2026-01-01']),
      requirement('REQ-6', 'Customer records SHALL be deleted after 2 years.', ['scope:customer-records','jurisdiction:EU','authority:regulation','effective:2026-01-01']),
    ]);
    expect(conflicts.some((item) => item.kind === 'numeric-target')).toBe(true);
    expect(conflicts.some((item) => item.kind === 'policy-hierarchy')).toBe(true);
    expect(conflicts.some((item) => item.kind === 'legal-review')).toBe(true);
    expect(conflicts.every((item) => item.status === 'open')).toBe(true);
    expect(conflicts.filter((item) => item.analysis?.legalReviewRequired).every((item) => item.analysis?.autoResolutionAllowed === false)).toBe(true);
  });

  it('represents atomic claims, policy, runtime observations and SDD paragraphs in the typed graph', () => {
    const p = project();
    const proposal = distillRequirementsDeterministically({ project: p, sources: [{ name: 'brief.txt', kind: 'paste', text: 'The transaction platform must process agent deposits and integrate with core banking. It must be auditable.' }] });
    const accepted = mergeRequirementsProposal(p, proposal);
    const req = accepted.requirementsIntelligence!.requirements.find((item) => /deposit/i.test(item.statement))!;
    const graph = buildArchitectureContextGraph({
      project: accepted,
      sources: accepted.requirementsIntelligence!.sources,
      evidence: accepted.requirementsIntelligence!.evidence,
      requirements: accepted.requirementsIntelligence!.requirements,
      stakeholders: accepted.requirementsIntelligence!.stakeholders,
      journeys: accepted.requirementsIntelligence!.journeys,
      openQuestions: accepted.requirementsIntelligence!.openQuestions,
      contextPackages: accepted.requirementsIntelligence!.contextPackages,
      supplementalRecords: [
        { id: 'CLAIM-1', kind: 'atomic-claim', label: 'Idempotency claim', summary: 'Financial retry requires a stable idempotency identity.', links: [{ targetId: req.id, kind: 'interprets', rationale: 'The method claim interprets the requirement.' }] },
        { id: 'POLICY-1', kind: 'policy-clause', label: 'Financial posting policy', summary: 'Duplicate financial posting is prohibited.', links: [{ targetId: req.id, kind: 'governs', rationale: 'Policy governs the requirement.' }] },
        { id: 'OBS-1', kind: 'runtime-observation', label: 'Deposit probe', summary: 'Synthetic deposit completed once.', links: [{ targetId: req.id, kind: 'substantiates', rationale: 'Runtime evidence supports the requirement.' }] },
        { id: 'SDD-S1', kind: 'sdd-section', label: 'Transaction architecture', summary: 'Transaction design section.' },
        { id: 'SDD-P1', kind: 'sdd-paragraph', label: 'Idempotency paragraph', summary: 'The transaction boundary enforces idempotency.', links: [{ targetId: 'SDD-S1', kind: 'rendered-in', rationale: 'Paragraph belongs to the section.' }, { targetId: req.id, kind: 'derived-from', rationale: 'Paragraph derives from requirement.' }] },
      ],
    });
    expect(graph.coverage.byNodeKind['atomic-claim']).toBe(1);
    expect(graph.coverage.byNodeKind['policy-clause']).toBe(1);
    expect(graph.coverage.byNodeKind['runtime-observation']).toBe(1);
    expect(graph.coverage.byNodeKind['sdd-paragraph']).toBe(1);
    expect(graph.coverage.atomicClaimCoverage).toBe(1);
    expect(graph.coverage.policyCoverage).toBe(1);
    expect(graph.coverage.runtimeObservationCoverage).toBe(1);
    expect(graph.coverage.sddParagraphCoverage).toBe(1);
  });

  it('infers high-confidence lineage for a legacy object and propagates precise staleness', () => {
    const p = project();
    const proposal = distillRequirementsDeterministically({ project: p, sources: [{ name: 'brief.txt', kind: 'paste', text: 'The platform must process cash deposit transactions and integrate with core banking.' }] });
    const accepted = mergeRequirementsProposal(p, proposal);
    const depositReq = accepted.requirementsIntelligence!.requirements.find((item) => /cash deposit/i.test(item.statement))!;
    const base = structuredClone(sampleProject.nodes[0]!);
    accepted.nodes = [{ ...base, id: 'LEGACY-DEPOSIT', label: `${depositReq.title} processing`, description: depositReq.statement, stage: 'logicalApplication', lineageFrom: [], properties: { ...base.properties, tags: ['cash','deposit','transaction'] } }];
    const graph = buildArchitectureContextGraph({
      project: accepted,
      sources: accepted.requirementsIntelligence!.sources,
      evidence: accepted.requirementsIntelligence!.evidence,
      requirements: accepted.requirementsIntelligence!.requirements,
      stakeholders: accepted.requirementsIntelligence!.stakeholders,
      journeys: accepted.requirementsIntelligence!.journeys,
      openQuestions: accepted.requirementsIntelligence!.openQuestions,
      contextPackages: accepted.requirementsIntelligence!.contextPackages,
    });
    const inferred = graph.edges.find((item) => item.targetId === 'LEGACY-DEPOSIT' && item.kind === 'inferred-lineage');
    expect(inferred).toBeTruthy();
    expect(inferred?.inference?.confidence).toBeGreaterThanOrEqual(0.85);
    expect(inferred?.inference?.requiresReview).toBe(false);

    const changed = accepted.requirementsIntelligence!.requirements.map((item) => item.id === depositReq.id ? { ...item, statement: `${item.statement} and controlled reversal`, updatedAt: new Date(Date.now()+1_000).toISOString() } : item);
    const changes = detectArchitectureSemanticChanges({ previousRequirements: accepted.requirementsIntelligence!.requirements, nextRequirements: changed, nextGraph: graph });
    const stale = applyArchitectureSemanticStaleness(graph, changes);
    expect(changes.find((item) => item.changedRef === depositReq.id)?.affectedRefs).toContain('LEGACY-DEPOSIT');
    expect(stale.nodes.find((item) => item.id === 'LEGACY-DEPOSIT')?.status).toBe('stale');
  });
});
