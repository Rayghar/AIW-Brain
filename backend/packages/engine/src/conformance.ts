import { type ArchitectureConformanceFinding, type ConformanceEvidenceEnvelope } from '@aiw/domain';

function stableHash(value: string): string { let hash = 2166136261; for (let index = 0; index < value.length; index += 1) { hash ^= value.charCodeAt(index); hash = Math.imul(hash, 16777619); } return (hash >>> 0).toString(16).padStart(8, '0'); }
function stableId(prefix: string, value: string): string { return `${prefix}-${stableHash(value)}-${stableHash(value.split('').reverse().join(''))}`; }
function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function asArray(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function text(value: unknown, fallback = ''): string { return typeof value === 'string' ? value : fallback; }
function severity(value: unknown): ArchitectureConformanceFinding['severity'] {
  const normalized = text(value).toLowerCase();
  if (['critical','error','fatal'].includes(normalized)) return 'critical';
  if (['high','major','failure','failed'].includes(normalized)) return 'high';
  if (['warning','warn','medium'].includes(normalized)) return 'warning';
  return 'info';
}

function finding(input: {
  evidence: ConformanceEvidenceEnvelope;
  ruleId: string;
  title: string;
  description: string;
  severity?: ArchitectureConformanceFinding['severity'];
  remediation?: string;
  architectureObjectId?: string;
  decisionId?: string;
  detail?: Record<string, unknown>;
}): ArchitectureConformanceFinding {
  const base = `${input.evidence.id}:${input.ruleId}:${input.title}:${input.architectureObjectId ?? ''}`;
  return {
    id: stableId('CONF', base), evidenceId: input.evidence.id, projectId: input.evidence.projectId, branchId: input.evidence.branchId,
    ruleId: input.ruleId, severity: input.severity ?? 'high', status: 'open', title: input.title, description: input.description,
    ...(input.remediation ? { remediation: input.remediation } : {}), ...(input.architectureObjectId ? { architectureObjectId: input.architectureObjectId } : {}),
    ...(input.decisionId ? { decisionId: input.decisionId } : {}), detail: input.detail ?? {}, createdAt: new Date().toISOString(),
  };
}

function normalizeTestResults(evidence: ConformanceEvidenceEnvelope): ArchitectureConformanceFinding[] {
  const root = asRecord(evidence.payload);
  const candidates = [root.violations, root.failures, root.results, root.tests, root.constraints].flatMap(asArray);
  return candidates.flatMap((item, index) => {
    const row = asRecord(item);
    const status = text(row.status, text(row.outcome, text(row.result))).toLowerCase();
    const passed = row.passed === true || ['passed','success','compliant','ok'].includes(status);
    if (passed) return [];
    const ruleId = text(row.ruleId, text(row.rule, text(row.id, `${evidence.sourceType}-${index + 1}`)));
    const title = text(row.title, text(row.name, `Architecture rule ${ruleId} failed`));
    const description = text(row.message, text(row.description, 'The implementation evidence does not satisfy the governed architecture rule.'));
    const architectureObjectId = text(row.architectureObjectId); const decisionId = text(row.decisionId);
    return [finding({ evidence, ruleId, title, description, severity: severity(row.severity), remediation: text(row.remediation, 'Review the affected architecture decision and either correct the implementation or record a time-bound waiver.'), ...(architectureObjectId ? { architectureObjectId } : {}), ...(decisionId ? { decisionId } : {}), detail: row })];
  });
}

function normalizeTerraform(evidence: ConformanceEvidenceEnvelope): ArchitectureConformanceFinding[] {
  const root = asRecord(evidence.payload);
  const changes = asArray(root.resource_changes ?? root.resourceChanges);
  return changes.flatMap((item, index) => {
    const row = asRecord(item); const change = asRecord(row.change); const actions = asArray(change.actions).map(String);
    if (!actions.includes('delete') && !actions.includes('replace') && !(actions.includes('create') && text(row.address).toLowerCase().includes('public'))) return [];
    const destructive = actions.includes('delete') || actions.includes('replace');
    const architectureObjectId = text(asRecord(row.change).architectureObjectId);
    return [finding({ evidence, ruleId: `terraform:${text(row.address, String(index))}`, title: destructive ? 'Potentially destructive infrastructure change' : 'Potential public infrastructure exposure', description: `Terraform plan actions ${actions.join(', ')} affect ${text(row.address, 'an infrastructure resource')}.`, severity: destructive ? 'high' : 'warning', remediation: 'Compare the plan with the approved physical architecture, resilience obligations and security boundaries before applying.', ...(architectureObjectId ? { architectureObjectId } : {}), detail: row })];
  });
}

function normalizeKubernetes(evidence: ConformanceEvidenceEnvelope): ArchitectureConformanceFinding[] {
  const root = asRecord(evidence.payload); const resources = asArray(root.resources ?? root.items);
  return resources.flatMap((item, index) => {
    const row = asRecord(item); const metadata = asRecord(row.metadata); const spec = asRecord(row.spec); const findings: ArchitectureConformanceFinding[] = [];
    const name = text(metadata.name, `resource-${index + 1}`); const kind = text(row.kind, 'Kubernetes resource');
    if (!asRecord(metadata.annotations)['aiw.io/pattern'] && !asRecord(metadata.labels)['aiw.io/architecture-object']) findings.push(finding({ evidence, ruleId: `k8s:traceability:${kind}:${name}`, title: 'Deployment resource lacks AIW traceability', description: `${kind} ${name} is not linked to a governed pattern or architecture object.`, severity: 'warning', remediation: 'Add approved AIW architecture identifiers as deployment metadata and regenerate conformance evidence.', detail: row }));
    if (kind === 'Service' && text(spec.type) === 'LoadBalancer' && !asRecord(metadata.annotations)['aiw.io/public-ingress-approved']) findings.push(finding({ evidence, ruleId: `k8s:public-ingress:${name}`, title: 'Unapproved public service exposure', description: `Service ${name} uses LoadBalancer without an explicit approved public-ingress marker.`, severity: 'critical', remediation: 'Route exposure through the approved ingress boundary or record an architecture and security approval.', detail: row }));
    return findings;
  });
}

function normalizeRuntime(evidence: ConformanceEvidenceEnvelope): ArchitectureConformanceFinding[] {
  const root = asRecord(evidence.payload); const findings = asArray(root.findings ?? root.driftFindings ?? root.violations);
  return findings.map((item, index) => {
    const row = asRecord(item); const ruleId = text(row.ruleId, text(row.type, `runtime-${index + 1}`));
    const architectureObjectId = text(row.architectureObjectId, text(row.intendedNodeId)); const decisionId = text(row.decisionId);
    return finding({ evidence, ruleId, title: text(row.title, 'Runtime architecture drift detected'), description: text(row.description, text(row.message, 'Observed runtime topology differs from the approved architecture.')), severity: severity(row.severity), remediation: text(row.remediation, 'Reconcile the runtime inventory with the approved model and open a remediation or waiver workflow.'), ...(architectureObjectId ? { architectureObjectId } : {}), ...(decisionId ? { decisionId } : {}), detail: row });
  });
}

export function normalizeConformanceEvidence(evidence: ConformanceEvidenceEnvelope): ArchitectureConformanceFinding[] {
  if (evidence.sourceType === 'terraform') return normalizeTerraform(evidence);
  if (evidence.sourceType === 'kubernetes') return normalizeKubernetes(evidence);
  if (evidence.sourceType === 'runtime-inventory' || evidence.sourceType === 'opentelemetry') return normalizeRuntime(evidence);
  return normalizeTestResults(evidence);
}

export function conformanceEvidenceHash(evidence: ConformanceEvidenceEnvelope): string {
  return `fnv1a-${stableHash(JSON.stringify({ ...evidence, payload: evidence.payload }))}`;
}
