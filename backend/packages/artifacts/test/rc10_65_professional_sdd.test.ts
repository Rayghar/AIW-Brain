import { describe, expect, it } from 'vitest';
import { AIW_RELEASE, sampleProject, type KnowledgeLibrary } from '@aiw/domain';
import { composeSdd } from '@aiw/engine';
import { renderAccessibleSddPdf } from '../src/index.js';

const library: KnowledgeLibrary = {
  knowledgeReleaseId: 'AKR-0.10.60',
  libraryId: 'rc10-65-professional-sdd',
  version: '0.10.65',
  status: 'approved',
  generatedAt: '2026-07-12T00:00:00.000Z',
  disclaimer: 'Reference acceptance library',
  qualityAttributes: [], architectureStyles: [], patterns: [], viewpoints: [], evidence: [], rulePacks: [],
};

function decodedPdf(base64: string): string {
  return Buffer.from(base64, 'base64').toString('latin1');
}

describe('rc.10.65 professional SDD delivery', () => {
  it('uses a progressively enriched reference architecture and honest review posture', () => {
    expect(AIW_RELEASE.version).toBe('0.10.0-rc.10.65.1');
    expect(sampleProject.nodes.length).toBeGreaterThanOrEqual(32);
    expect(sampleProject.edges.length).toBeGreaterThanOrEqual(35);
    expect(sampleProject.interfaces?.length).toBeGreaterThanOrEqual(3);
    expect(sampleProject.decisions?.length).toBeGreaterThanOrEqual(2);
    expect(sampleProject.findings?.length).toBeGreaterThanOrEqual(2);
    expect(sampleProject.stageApprovals?.length).toBeGreaterThanOrEqual(4);
  });

  it('renders an executive-ready, tagged and bookmarked PDF with readable landscape views', () => {
    const result = renderAccessibleSddPdf(structuredClone(sampleProject), structuredClone(library));
    const pdf = decodedPdf(result.base64);
    expect(pdf.startsWith('%PDF-1.7')).toBe(true);
    expect(result.pageCount).toBeGreaterThanOrEqual(40);
    expect(result.bookmarkCount).toBeGreaterThanOrEqual(25);
    expect(pdf).toContain('/StructTreeRoot');
    expect(pdf).toContain('/MarkInfo << /Marked true >>');
    expect(pdf).toContain('/Outlines');
    expect(pdf).toContain('/Lang (en-GB)');
    expect(pdf).toContain('Professional Delivery Engine');
    expect(pdf).toContain('(Contents)');
    expect(pdf).toContain('Cross-Stage Traceability');
    expect(pdf).not.toContain('AIW rc.10.60');
    expect(result.profile.tagged).toBe(true);
    expect(result.profile.alternativeTextForDiagrams).toBe(true);
  });

  it('adds executive architecture and completeness sections to the governed SDD narrative', () => {
    const markdown = composeSdd(structuredClone(sampleProject), structuredClone(library));
    expect(markdown).toContain('## 2. Executive architecture summary');
    expect(markdown).toContain('## 19. Architecture completeness, evidence gaps and next actions');
    expect(markdown).toContain('Architecture decision records');
    expect(markdown).toContain('Approval disposition');
    expect(markdown).toContain('Managed PostgreSQL');
    expect(markdown).toContain('Development authentication');
  });
});
