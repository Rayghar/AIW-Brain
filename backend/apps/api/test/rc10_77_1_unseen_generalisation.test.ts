import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureProject, type KnowledgeLibrary, type StageCoAuthorTarget } from '@aiw/domain';
import { buildDeterministicStageCoAuthorProposal } from '../src/stageCoAuthorAssistant.js';

const library = JSON.parse(readFileSync(new URL('../../../data/knowledge-library.json', import.meta.url), 'utf8')) as KnowledgeLibrary;
const stages: StageCoAuthorTarget[] = ['logicalApplication', 'applicationRealization', 'logicalTechnology', 'physicalTechnology'];
const holdouts = [
  ['cross-border-sme-payments', 'Cross-border SME Payment Platform', 'Onboard SME beneficiaries, screen sanctions, quote foreign exchange, authorise cross-border payments, reconcile correspondent settlement, recover indeterminate transfers, and require both instant finality and manual approval before final settlement.'],
  ['insurance-claims-modernisation', 'Insurance Claims Modernisation', 'Capture claims, preserve policy authority in a legacy core, protect personal data, coordinate adjuster approval, detect fraud, migrate by cohort, and support rollback while the old and new claim records coexist.'],
  ['university-learning', 'University Digital Learning Platform', 'Enrol students, publish course content, grade assessments, integrate identity and student records, protect learner data, support fast access without a confirmed latency target, and retain an irrelevant preference that the marketing colour is blue.'],
  ['industrial-iot', 'Industrial IoT Predictive Maintenance', 'Ingest edge telemetry, detect asset anomalies, schedule work orders, operate during intermittent connectivity, reconcile offline updates, isolate plant networks, and recover regional processing failures.'],
  ['data-product-marketplace', 'Enterprise Data-product Marketplace', 'Register governed data products, publish contracts and lineage, approve access, enforce residency, meter usage, revoke entitlements, and treat both producer and central governance as the final metadata authority until clarified.'],
  ['regulated-ai-service', 'Regulated AI-assisted Customer Service', 'Assist a human agent, where agent means an employee rather than an autonomous software agent, with governed retrieval, bounded model recommendations, approval, escalation, prompt-injection defence, audit, privacy, and deterministic fallback.'],
] as const;

function project(id: string, name: string, objective: string): ArchitectureProject {
  const value = structuredClone(sampleProject) as ArchitectureProject;
  value.id = `holdout-${id}`;
  value.name = name;
  value.description = objective;
  value.objectives = [objective];
  value.constraints = ['Generated architecture remains candidate authority and requires explicit project review.'];
  value.requirementsIntelligence = undefined;
  value.qualityScenarios = [];
  value.findings = [];
  value.decisions = [];
  value.nodes = [];
  value.edges = [];
  value.interfaces = [];
  return value;
}

function semanticFingerprint(value: ArchitectureProject, stage: StageCoAuthorTarget): string {
  const proposal = buildDeterministicStageCoAuthorProposal({ project: value, library, targetStage: stage });
  const semantic = {
    obligations: proposal.obligations?.map(({ id: _id, ...item }) => item),
    labels: proposal.operations.map((item) => item.label),
    kinds: proposal.operations.map((item) => item.kind),
  };
  return createHash('sha256').update(JSON.stringify(semantic)).digest('hex');
}

describe('rc.10.77.1 evidence-derived Brain generalisation', () => {
  it('builds coherent governed change sets for six unseen domains', () => {
    for (const [id, name, objective] of holdouts) {
      const value = project(id, name, objective);
      for (const targetStage of stages) {
        const proposal = buildDeterministicStageCoAuthorProposal({ project: value, library, targetStage });
        expect(proposal.obligations?.length).toBeGreaterThan(0);
        expect(proposal.changeSets?.length).toBeGreaterThan(0);
        expect(proposal.operations.some((item) => item.kind === 'add-node')).toBe(true);
        expect(proposal.operations.every((item) => item.authority === 'candidate' && item.reviewRequired)).toBe(true);
        expect(proposal.operations.every((item) => (item.obligationRefs?.length ?? 0) > 0)).toBe(true);
        expect(proposal.changeSets?.every((set) => set.operationIds.every((operationId) => proposal.operations.some((item) => item.id === operationId)))).toBe(true);
      }
    }
  });

  it('does not branch on project identity or name', () => {
    const objective = holdouts[0][2];
    const left = project('neutral-left', 'Neutral Alpha', objective);
    const right = project('neutral-right', 'Completely Different Display Name', objective);
    for (const stage of stages) expect(semanticFingerprint(left, stage)).toBe(semanticFingerprint(right, stage));
  });

  it('is sensitive to evidence and not fixed four-node cardinality', () => {
    const sparse = project('sparse', 'Sparse', 'Track asset status.');
    const rich = project('rich', 'Rich', holdouts[2][2]);
    const sparseProposal = buildDeterministicStageCoAuthorProposal({ project: sparse, library, targetStage: 'logicalApplication' });
    const richProposal = buildDeterministicStageCoAuthorProposal({ project: rich, library, targetStage: 'logicalApplication' });
    expect(richProposal.obligations?.length).toBeGreaterThan(sparseProposal.obligations?.length ?? 0);
    expect(richProposal.operations.filter((item) => item.kind === 'add-node').length).not.toBe(4);
  });

  it('produces distinct semantics for materially distinct evidence', () => {
    for (const stage of stages) {
      const fingerprints = holdouts.map(([id, name, objective]) => semanticFingerprint(project(id, name, objective), stage));
      expect(new Set(fingerprints).size, `semantic diversity for ${stage}`).toBe(holdouts.length);
    }
  });

  it('resists irrelevant detail and limits critical mutations to linked obligations', () => {
    const base = project(holdouts[0][0], holdouts[0][1], holdouts[0][2]);
    const irrelevant = structuredClone(base);
    irrelevant.constraints.push('The office wall paint preference is blue.');
    expect(semanticFingerprint(irrelevant, 'logicalApplication')).toBe(semanticFingerprint(base, 'logicalApplication'));

    const changed = structuredClone(base);
    changed.constraints.push('Every payment approval must require phishing-resistant identity and least-privilege authorisation.');
    const before = buildDeterministicStageCoAuthorProposal({ project: base, library, targetStage: 'logicalApplication' });
    const after = buildDeterministicStageCoAuthorProposal({ project: changed, library, targetStage: 'logicalApplication' });
    const beforeIds = new Set(before.obligations?.map((item) => item.id));
    const afterIds = new Set(after.obligations?.map((item) => item.id));
    expect([...afterIds].some((id) => !beforeIds.has(id))).toBe(true);
    expect([...beforeIds].some((id) => afterIds.has(id))).toBe(true);
  });
});
