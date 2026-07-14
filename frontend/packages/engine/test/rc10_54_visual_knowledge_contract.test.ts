import { describe, expect, it } from 'vitest';
import {
  createDesignLibrary,
  evaluateKnowledgeAuthority,
  knowledgeRepositoryConnectors,
  sampleProject,
  type KnowledgeLibrary,
} from '@aiw/domain';
import { applyLibraryDrop, previewLibraryDrop } from '../src/index.js';

const library: KnowledgeLibrary = {
  libraryId: 'rc10-54-library', version: 'AKR-0.10.60', status: 'approved', generatedAt: '2026-07-11T00:00:00.000Z', disclaimer: '',
  qualityAttributes: [], architectureStyles: [], patterns: [], viewpoints: [],
};

describe('rc.10.54 intelligence constitution and knowledge-to-model bridge', () => {
  it('prevents discovery knowledge from mutating architecture', () => {
    const receipt = evaluateKnowledgeAuthority({ sourceId: 'GH-SYSTEM-DESIGN-101', state: 'discovery', requestedUse: 'mutate-model', evidenceIds: ['README'] });
    expect(receipt.allowed).toBe(false);
  });

  it('allows approved release-bound evidence to create governed model proposals', () => {
    const receipt = evaluateKnowledgeAuthority({
      sourceId: 'TPL-EVENT-DRIVEN-SERVICE', state: 'approved-production', requestedUse: 'mutate-model',
      knowledgeReleaseId: 'AKR-0.10.60', evidenceIds: ['SRC-INTERNAL-PRINCIPLES'], approvedBy: 'Architecture Knowledge Council',
    });
    expect(receipt.allowed).toBe(true);
  });

  it('exposes a production-scale governed visual palette', () => {
    const records = createDesignLibrary(library);
    expect(records.filter((record) => record.recordType === 'component').length).toBeGreaterThanOrEqual(80);
    expect(records.filter((record) => record.recordType === 'template').length).toBeGreaterThanOrEqual(20);
    expect(records.every((record) => record.knowledgeReleaseId === 'AKR-0.10.60')).toBe(true);
    expect(records.filter((record) => record.approvalStatus !== 'deprecated').every((record) => record.authorityState === 'approved-production')).toBe(true);
  });

  it('registers the four learning repositories as discovery-only', () => {
    const repositories = new Map(knowledgeRepositoryConnectors.map((connector) => [connector.repository, connector]));
    for (const repository of [
      'nilbuild/developer-roadmap',
      'ByteByteGoHq/system-design-101',
      'binhnguyennus/awesome-scalability',
      'ashishps1/awesome-system-design-resources',
    ]) {
      expect(repositories.get(repository)?.lifecycleStatus).toBe('discovery-only');
      expect(repositories.get(repository)?.contentUses).toContain('discovery-only');
    }
  });

  it('applies an approved Pattern DNA topology as model objects, relationships, obligations and an ADR proposal', () => {
    const project = structuredClone(sampleProject);
    project.activeStage = 'applicationRealization';
    const preview = previewLibraryDrop(project, library, 'TPL-EVENT-DRIVEN-SERVICE', 'applicationRealization', { x: 160, y: 120 });
    expect(preview.disposition).not.toBe('blocked');
    expect(preview.nodes.length).toBeGreaterThan(0);
    expect(preview.edges.length).toBeGreaterThan(0);
    expect(preview.obligations.length).toBeGreaterThan(0);
    const applied = applyLibraryDrop(project, preview);
    expect(applied.nodes.length).toBe(project.nodes.length + preview.nodes.length);
    expect(applied.edges.length).toBe(project.edges.length + preview.edges.length);
    expect(applied.decisions.some((decision) => decision.linkedRecordIds.includes('TPL-EVENT-DRIVEN-SERVICE'))).toBe(true);
  });
});
