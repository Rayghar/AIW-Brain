import { describe, expect, it } from 'vitest';
import { sampleProject, sprint80DefaultSimulationScenarios } from '@aiw/domain';
import { runArchitectureSimulationSuite, synthesizeArchitectureAlternatives } from '@aiw/engine';
import { compileSynthesisArtifacts } from '../src/index.js';

describe('Sprint 8.0 synthesis artifacts', () => {
  it('generates traceable architecture, decision, simulation and conformance artifacts', () => {
    const run = synthesizeArchitectureAlternatives({ project: sampleProject, strategyIds: ['balanced','resilience-first','simplicity-first'] });
    const alternative = run.alternatives[0]!;
    const simulations = runArchitectureSimulationSuite(run, alternative.id, sprint80DefaultSimulationScenarios.slice(0, 2));
    const bundle = compileSynthesisArtifacts(run, alternative.id, simulations, 'Test rationale.');
    expect(bundle.files.some((item) => item.path === 'synthesis/decision-package.json')).toBe(true);
    expect(bundle.files.some((item) => item.path === 'architecture/calm.json')).toBe(true);
    expect(bundle.files.some((item) => item.path === 'diagrams/synthesis-alternative.mmd')).toBe(true);
    expect(bundle.files.some((item) => item.path.startsWith('fitness/'))).toBe(true);
    expect(Object.keys(bundle.manifest.checksums)).toHaveLength(bundle.files.length);
    expect(bundle.manifest.knowledgeReleaseId).toBe('AKR-0.10.60');
  });
});
