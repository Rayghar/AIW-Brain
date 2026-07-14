import { describe, expect, it } from 'vitest';
import { sampleProject, type KnowledgeLibrary } from '@aiw/domain';
import { compileSolutionDeliveryPack, createArtifactArchive, renderAccessibleSddPdf } from '../src/index.js';

const library: KnowledgeLibrary = {
  knowledgeReleaseId: 'AKR-0.10.60', libraryId: 'rc10-60-test', version: '0.10.60', status: 'approved', generatedAt: '2026-07-11T00:00:00.000Z', disclaimer: 'Test library',
  qualityAttributes: [], architectureStyles: [], patterns: [], viewpoints: [], evidence: [], rulePacks: [],
};

function decodedPdf(base64: string): string {
  return Buffer.from(base64, 'base64').toString('latin1');
}

describe('rc.10.60 accessible and interoperable delivery pack', () => {
  it('renders a multi-page, tagged, bookmarked PDF with diagram alternatives', () => {
    const result = renderAccessibleSddPdf(structuredClone(sampleProject), structuredClone(library));
    const pdf = decodedPdf(result.base64);
    expect(pdf.startsWith('%PDF-1.7')).toBe(true);
    expect(result.pageCount).toBeGreaterThan(10);
    expect(result.bookmarkCount).toBeGreaterThanOrEqual(10);
    expect(pdf).toContain('/StructTreeRoot');
    expect(pdf).toContain('/MarkInfo << /Marked true >>');
    expect(pdf).toContain('/Outlines');
    expect(pdf).toContain('/Lang (en-GB)');
    expect(result.profile.tagged).toBe(true);
    expect(result.profile.alternativeTextForDiagrams).toBe(true);
  });

  it('includes round-trip architecture-as-code, provider mappings and accessible PDF in one reproducible archive', () => {
    const bundle = compileSolutionDeliveryPack(structuredClone(sampleProject), structuredClone(library));
    const paths = bundle.files.map((file) => file.path);
    expect(paths).toContain('handoff/system-design-description-accessible.pdf');
    expect(paths).toContain('handoff/architecture-as-code/workspace.dsl');
    expect(paths).toContain('handoff/architecture-as-code/architecture.calm.json');
    expect(paths).toContain('handoff/architecture-as-code/architecture.c4');
    expect(paths).toContain('handoff/architecture-as-code/round-trip-validation.json');
    expect(paths).toContain('handoff/provider-product-catalog.json');
    const pdf = bundle.files.find((file) => file.path.endsWith('.pdf'))!;
    expect(pdf.encoding).toBe('base64');
    expect(pdf.accessibility?.tagged).toBe(true);
    const archive = createArtifactArchive(bundle, { fileName: 'rc10-60-delivery.zip' });
    expect(archive.bytes.slice(0, 2)).toEqual(new Uint8Array([0x50, 0x4b]));
    expect(archive.fileCount).toBe(bundle.files.length);
  });
});
