import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import type { KnowledgeLibrary } from '@aiw/domain';
import { sampleProject, sprint78PatternCorpus } from '@aiw/domain';
import {
  activeKnowledgeReleaseId,
  approvedPatternRecords,
  buildStageAdvisorPrompt,
  resolveApprovedCitationIds,
  sanitizeStageAdvice,
  selectRelevantKnowledge,
} from '../src/index.js';

const loadLibrary = (): KnowledgeLibrary => JSON.parse(readFileSync(new URL('../../../data/knowledge-library.json', import.meta.url), 'utf8')) as KnowledgeLibrary;

describe('v0.9.6 reconciled knowledge authority', () => {
  it('binds design-time retrieval to the approved corpus release', () => {
    const library = loadLibrary();
    expect(activeKnowledgeReleaseId(library)).toBe('AKR-0.10.60');
    const approved = approvedPatternRecords(library);
    expect(approved.length).toBeGreaterThanOrEqual(200);
    expect(approved.every((record) => record.lifecycle === 'approved' && record.review?.releaseId === 'AKR-0.10.60' && record.evidence.length > 0)).toBe(true);
  });

  it('never admits unknown model citations into stage advice', () => {
    const library = loadLibrary();
    const project = structuredClone(sampleProject);
    project.activeStage = 'logicalApplication';
    const bundle = buildStageAdvisorPrompt(project, library, [], {});
    const allowed = bundle.grounding.ids[0]!;
    const result = sanitizeStageAdvice({
      insights: [
        { title: 'Valid', detail: 'Grounded guidance', kbRef: allowed },
        { title: 'Invented', detail: 'Must be rejected', kbRef: 'PAT-INVENTED-999' },
      ],
      suggestedElements: [
        { kind: 'LogicalService', label: 'Payment Orchestrator', reason: 'Valid suggestion', kbRef: allowed },
        { kind: 'LogicalService', label: 'Unknown', reason: 'Invalid citation', kbRef: 'PAT-INVENTED-999' },
      ],
      counterfactual: 'A change in consistency requirements could alter the recommendation.',
    }, bundle.grounding);
    expect(result.insights).toHaveLength(1);
    expect(result.suggestedElements).toHaveLength(1);
    expect(result.rejectedCitationCount).toBe(2);
    expect(resolveApprovedCitationIds(['PAT-INVENTED-999', allowed], bundle.grounding)).toEqual([allowed]);
  });

  it('uses selected object context while preserving the release whitelist', () => {
    const library = loadLibrary();
    const project = structuredClone(sampleProject);
    project.activeStage = 'logicalApplication';
    const selected = project.nodes.find((node) => node.stage === 'logicalApplication');
    expect(selected).toBeTruthy();
    selected!.tags.push('idempotency', 'retry');
    const relevant = selectRelevantKnowledge(project, library, 12, { selectedNodeId: selected!.id });
    expect(relevant.knowledgeReleaseId).toBe('AKR-0.10.60');
    expect(relevant.ids.length).toBeGreaterThan(0);
    const releaseIds = new Set(sprint78PatternCorpus.filter((record) => relevant.ids.includes(record.id)).map((record) => record.review?.releaseId));
    expect([...releaseIds]).toEqual(['AKR-0.10.60']);
  });
});
