import { describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { runArchitectureReview } from '@aiw/intelligence';
import knowledgeJson from '../../../apps/web/src/data/knowledge-library.json' with { type: 'json' };
import { compileSolutionDeliveryPack, createArtifactArchive } from '../src/index.js';

describe('Sprint 8.9.1 solution delivery pack and architecture handoff', () => {
  it('builds an evidence-backed architecture handoff pack from the Review Studio output', () => {
    const review = runArchitectureReview(sampleProject, knowledgeJson as never);
    const pack = compileSolutionDeliveryPack(sampleProject, knowledgeJson as never, review);
    const paths = new Set(pack.files.map((file) => file.path));
    expect(paths.has('handoff/manifest.json')).toBe(true);
    expect(paths.has('handoff/executive-summary.md')).toBe(true);
    expect(paths.has('handoff/solution-architecture-document.md')).toBe(true);
    expect(paths.has('handoff/system-design-description.md')).toBe(true);
    expect(paths.has('handoff/document-control.md')).toBe(true);
    expect(paths.has('handoff/interface-register.csv')).toBe(true);
    expect(paths.has('handoff/model-traceability.csv')).toBe(true);
    expect(paths.has('handoff/data-architecture.md')).toBe(true);
    expect(paths.has('handoff/security-architecture.md')).toBe(true);
    expect(paths.has('handoff/resilience-and-operations.md')).toBe(true);
    expect(paths.has('handoff/migration-and-transition.md')).toBe(true);
    expect(paths.has('handoff/diagrams/cross-stage-lineage.mmd')).toBe(true);
    expect(paths.has('handoff/diagrams/data-and-integration-flow.mmd')).toBe(true);
    expect(paths.has('handoff/adr-pack.md')).toBe(true);
    expect(paths.has('handoff/c4/c4-context-view.mmd')).toBe(true);
    expect(paths.has('handoff/c4/c4-container-view.mmd')).toBe(true);
    expect(paths.has('handoff/c4/c4-component-view.mmd')).toBe(true);
    expect(paths.has('handoff/deployment-view.md')).toBe(true);
    expect(paths.has('handoff/integration-catalogue.md')).toBe(true);
    expect(paths.has('handoff/risk-register.md')).toBe(true);
    expect(paths.has('handoff/fitness-tests.md')).toBe(true);
    expect(paths.has('handoff/fitness-tests.json')).toBe(true);
    expect(paths.has('handoff/implementation-backlog.md')).toBe(true);
    expect(paths.has('handoff/evidence-traceability.md')).toBe(true);
    expect(paths.has('handoff/handoff-checklist.md')).toBe(true);
    expect(paths.has('handoff/architecture-review.json')).toBe(true);
    const manifest = JSON.parse(pack.files.find((file) => file.path === 'handoff/manifest.json')!.content);
    expect(manifest.packageType).toBe('solution-delivery-pack');
    expect(manifest.deliveryReadinessScore).toBe(review.deliveryReadinessScore);
    expect(manifest.contents.every((item: { checksum?: string }) => item.checksum?.startsWith('fnv1a-'))).toBe(true);
    expect(pack.files.find((file) => file.path === 'handoff/system-design-description.md')?.content).toContain('Interface, API and event contract register');
    expect(pack.files.find((file) => file.path === 'handoff/system-design-description.md')?.content).toContain('Data architecture');
    expect(pack.files.find((file) => file.path === 'handoff/interface-register.csv')?.mediaType).toBe('text/csv');
  });

  it('packages the handoff pack into a browser-safe zip archive without a server dependency', () => {
    const review = runArchitectureReview(sampleProject, knowledgeJson as never);
    const pack = compileSolutionDeliveryPack(sampleProject, knowledgeJson as never, review);
    const archive = createArtifactArchive(pack, { fileName: 'aiw-handoff-test.zip' });
    expect(archive.mediaType).toBe('application/zip');
    expect(archive.fileName).toBe('aiw-handoff-test.zip');
    expect(archive.fileCount).toBe(pack.files.length);
    expect(archive.bytes[0]).toBe(0x50);
    expect(archive.bytes[1]).toBe(0x4b);
    expect(archive.totalUncompressedBytes).toBeGreaterThan(1000);
  });
});
