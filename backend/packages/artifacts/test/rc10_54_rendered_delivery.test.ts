import { describe, expect, it } from 'vitest';
import { sampleProject, type ArchitectureProject, type KnowledgeLibrary } from '@aiw/domain';
import { compileSolutionDeliveryPack } from '../src/index.js';

const library: KnowledgeLibrary = {
  libraryId: 'rc10-54-library', version: 'AKR-0.10.60', status: 'approved', generatedAt: '2026-07-11T00:00:00.000Z', disclaimer: '',
  qualityAttributes: [], architectureStyles: [], patterns: [], viewpoints: [],
};

function projectWithViews(): ArchitectureProject {
  const project = structuredClone(sampleProject);
  project.nodes = [
    { id: 'logical-service', kind: 'LogicalService', stage: 'logicalApplication', label: 'Payment Service', properties: { owner: 'Payments' }, lineageFrom: [], positions: { logicalApplication: { x: 120, y: 120 } }, tags: ['payments'], status: 'reviewed' },
    { id: 'api', kind: 'API', stage: 'applicationRealization', label: 'Payments API', properties: { owner: 'Payments' }, lineageFrom: ['logical-service'], positions: { applicationRealization: { x: 120, y: 120 } }, tags: ['api'], status: 'reviewed' },
    { id: 'gateway', kind: 'LogicalTechnologyCapability', stage: 'logicalTechnology', label: 'API Management', properties: { owner: 'Platform' }, lineageFrom: ['api'], positions: { logicalTechnology: { x: 120, y: 120 } }, tags: ['gateway'], status: 'reviewed' },
    { id: 'runtime', kind: 'Runtime', stage: 'physicalTechnology', label: 'Nigeria Runtime', properties: { owner: 'Platform' }, lineageFrom: ['gateway'], positions: { physicalTechnology: { x: 120, y: 120 } }, tags: ['runtime'], status: 'reviewed' },
  ];
  project.edges = [];
  project.interfaces = [{
    id: 'if-payment', name: 'Submit payment', stage: 'applicationRealization', providerNodeId: 'api', consumerNodeIds: ['logical-service'], interactionStyle: 'request-response', protocol: 'HTTPS/REST', operationOrEvent: 'POST /payments', schemaRef: 'openapi.yaml#/paths/~1payments', version: '1.0.0', authentication: 'OAuth 2.0', authorization: 'payments.submit', encryption: 'TLS 1.3', timeoutMs: 3000, retryPolicy: 'No automatic unsafe retry', idempotency: 'Idempotency-Key', ordering: 'Not required', deliveryGuarantee: 'At-most-once request', deadLetterPolicy: 'Not applicable', replayPolicy: 'Not applicable', slo: '99.95%; p95 < 500 ms', dataClassification: 'confidential', owner: 'Payments Platform', lifecycleStatus: 'active', evidenceIds: ['ADR-001','SRC-OPENAPI'], createdAt: '2026-07-11T00:00:00.000Z', updatedAt: '2026-07-11T00:00:00.000Z',
  }];
  return project;
}

describe('rc.10.54 rendered architecture delivery', () => {
  it('includes actual model-derived SVG diagrams and SDD references', () => {
    const bundle = compileSolutionDeliveryPack(projectWithViews(), library);
    const svgFiles = bundle.files.filter((file) => file.mediaType === 'image/svg+xml');
    expect(svgFiles.length).toBeGreaterThanOrEqual(4);
    expect(svgFiles.every((file) => file.content.includes('<svg') && file.content.includes('data-node-id'))).toBe(true);
    const sdd = bundle.files.find((file) => file.path === 'handoff/system-design-description.md');
    expect(sdd?.content).toContain('diagrams/logical-application-architecture.svg');
    expect(sdd?.content).toContain('diagrams/physical-deployment-architecture.svg');
  });

  it('exports the first-class interface contract into delivery evidence', () => {
    const bundle = compileSolutionDeliveryPack(projectWithViews(), library);
    const register = bundle.files.find((file) => file.path === 'handoff/interface-register.csv');
    expect(register?.content).toContain('POST /payments');
    expect(register?.content).toContain('Idempotency-Key');
    expect(register?.content).toContain('SRC-OPENAPI');
  });
});
