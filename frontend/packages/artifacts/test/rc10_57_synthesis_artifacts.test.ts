import { describe, expect, it } from 'vitest';
import { sampleProject } from '@aiw/domain';
import { runArchitectureSimulationSuite, synthesizeArchitectureAlternatives } from '@aiw/engine';
import { compileSynthesisArtifacts } from '../src/index.js';

describe('rc.10.57 synthesis blueprint artifact pack', () => {
  it('embeds all required rendered diagrams and traceability in the SDD handoff', () => {
    const run = synthesizeArchitectureAlternatives({ project: structuredClone(sampleProject), knowledgeReleaseId: 'AKR-0.10.60', strategyIds: ['balanced','resilience-first','security-first','cost-first'], maxAlternatives: 4, requireDiversity: true });
    const alternative = run.alternatives[0]!;
    const simulations = runArchitectureSimulationSuite(run, alternative.id);
    const bundle = compileSynthesisArtifacts(run, alternative.id, simulations, 'Approved test rationale.');
    const paths = bundle.files.map((file) => file.path);
    expect(paths).toContain('synthesis/architecture-blueprint.json');
    expect(paths).toContain('architecture/interface-register.csv');
    expect(paths).toContain('architecture/cross-stage-traceability.csv');
    expect(paths).toContain('architecture/provider-overlays.json');
    expect(paths).toContain('docs/sdd/architecture-synthesis-and-deployment.md');
    const svgFiles = bundle.files.filter((file) => file.mediaType === 'image/svg+xml');
    expect(svgFiles).toHaveLength(10);
    expect(svgFiles.every((file) => file.content.includes('<svg') && file.content.includes('canonical fingerprint'))).toBe(true);
    const sdd = bundle.files.find((file) => file.path === 'docs/sdd/architecture-synthesis-and-deployment.md')!;
    expect(sdd.content.match(/!\[/g)?.length).toBe(10);
    expect(sdd.content).toContain('provider-neutral');
  });
});
