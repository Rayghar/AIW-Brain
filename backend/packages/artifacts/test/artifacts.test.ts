import { describe, expect, it } from 'vitest';
import { sampleProject, type KnowledgeLibrary } from '@aiw/domain';
import { compileArtifacts } from '../src/index.js';

const library: KnowledgeLibrary = {
  libraryId: 'library', version: '0.1.0', status: 'draft', generatedAt: '', disclaimer: '',
  qualityAttributes: [], architectureStyles: [], patterns: [], viewpoints: [],
};

describe('artifact compiler', () => {
  it('produces reviewable scaffolding without claiming production readiness', () => {
    const bundle = compileArtifacts(sampleProject, library, []);
    expect(bundle.files.some((file) => file.path === 'architecture/manifest.json')).toBe(true);
    expect(bundle.files.some((file) => file.path === 'docs/collaboration-report.md')).toBe(true);
    expect(bundle.files.some((file) => file.path === 'docs/architecture-drift-report.md')).toBe(true);
    expect(bundle.files.some((file) => file.path === '.github/workflows/aiw-architecture-gate.yml')).toBe(true);
    expect(bundle.files.some((file) => file.path === 'docs/design-intelligence-report.md')).toBe(true);
    expect(bundle.files.some((file) => file.path === 'library/design-library-manifest.json')).toBe(true);
    expect(bundle.files.some((file) => file.path === 'docs/knowledge-integrity-report.md')).toBe(true);
    expect(bundle.files.some((file) => file.path === 'library/trusted-architecture-sources.json')).toBe(true);
    expect(bundle.files.some((file) => file.path === 'library/anti-pattern-catalog.json')).toBe(true);
    expect(bundle.files.some((file) => file.path === 'docs/dynamic-architecture-knowledge-mesh.md')).toBe(true);
    expect(bundle.files.some((file) => file.path === 'knowledge/github-connector-catalog.json')).toBe(true);
    expect(bundle.files.some((file) => file.path === 'knowledge/approved-claims.json')).toBe(true);
    expect(bundle.files.some((file) => file.path === 'docs/pattern-intelligence-and-composition.md')).toBe(true);
    expect(bundle.files.some((file) => file.path === 'knowledge/pattern-dna-corpus.json')).toBe(true);
    expect(bundle.files.some((file) => file.path === 'knowledge/repository-governance-policies.json')).toBe(true);
    expect(bundle.files.some((file) => file.path === 'knowledge/pattern-knowledge-release.json')).toBe(true);
    const terraform = bundle.files.find((file) => file.path === 'infra/main.tf');
    expect(terraform?.content).toContain('not production-ready');
  });
});
