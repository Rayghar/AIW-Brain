import {
  createId,
  type ArchitectureNode,
  type ArchitectureProject,
  type AuditResult,
  type ChangeProposal,
  type Finding,
  type KnowledgeLibrary,
} from '@aiw/domain';
import { validateProject } from './validation.js';

function proposalFromFinding(finding: Finding, project: ArchitectureProject): ChangeProposal | null {
  if (finding.ruleId === 'INT-ASYNC-NO-MESSAGING-CAPABILITY') {
    const node: ArchitectureNode = {
      id: createId('logical-tech'),
      kind: 'LogicalTechnologyCapability',
      stage: 'logicalTechnology',
      label: 'Message Broker Capability',
      description: 'Logical asynchronous transport with delivery, retry and dead-letter responsibilities.',
      properties: { deliveryGuarantee: 'at-least-once', deadLetterRequired: true, schemaGovernanceRequired: true },
      lineageFrom: finding.affectedNodeIds,
      positions: { logicalTechnology: { x: 520, y: 220 } },
      tags: ['messaging', 'ai-proposed'],
      status: 'draft',
    };
    return {
      id: createId('proposal'),
      title: 'Add logical messaging capability',
      rationale: finding.rationale,
      severity: finding.severity,
      operations: [{ type: 'ADD_NODE', node }],
      evidenceRecordIds: ['PAT-TRANSACTIONAL-OUTBOX'],
      selected: true,
    };
  }

  if (finding.ruleId === 'SEC-PUBLIC-NO-ACCESS-CONTROL') {
    const node: ArchitectureNode = {
      id: createId('control'),
      kind: 'Control',
      stage: 'applicationRealization',
      label: 'Identity and Access Control',
      description: 'Authentication and authorization control for public interfaces.',
      properties: { authentication: true, authorization: true },
      lineageFrom: finding.affectedNodeIds,
      positions: { applicationRealization: { x: 460, y: 60 } },
      tags: ['security', 'ai-proposed'],
      status: 'draft',
    };
    return {
      id: createId('proposal'),
      title: 'Add access-control responsibility',
      rationale: finding.rationale,
      severity: finding.severity,
      operations: [{ type: 'ADD_NODE', node }],
      evidenceRecordIds: [],
      selected: true,
    };
  }

  if (finding.ruleId === 'DEPLOY-HA-SINGLE-FAILURE-DOMAIN') {
    const nodeId = finding.affectedNodeIds[0];
    if (!nodeId) return null;
    return {
      id: createId('proposal'),
      title: 'Increase deployment redundancy',
      rationale: finding.rationale,
      severity: finding.severity,
      operations: [{
        type: 'UPDATE_NODE',
        nodeId,
        patch: { properties: { replicas: 2, availabilityZones: 2, redundancyRationale: 'High-availability design driver' } },
      }],
      evidenceRecordIds: [],
      selected: true,
    };
  }

  return null;
}

export function runDeterministicAudit(project: ArchitectureProject, library: KnowledgeLibrary): AuditResult {
  const findings = validateProject(project, library);
  const proposals = findings
    .map((item) => proposalFromFinding(item, project))
    .filter((item): item is ChangeProposal => item !== null);
  const penalty = findings.reduce((sum, item) => sum + (item.severity === 'HARD' ? 25 : item.severity === 'SIGNIFICANT' ? 12 : 4), 0);
  return {
    id: createId('audit'),
    createdAt: new Date().toISOString(),
    source: 'deterministic',
    summary: findings.length === 0
      ? 'No deterministic architecture findings were identified.'
      : `${findings.length} finding(s) identified. ${proposals.length} change proposal(s) are available for selective review.`,
    healthScore: Math.max(0, 100 - penalty),
    findings,
    proposals,
  };
}
