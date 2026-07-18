import type {
  ArchitectureAttentionItem,
  ArchitectureChangeSet,
  ArchitectureEdge,
  ArchitectureEvidenceStrength,
  ArchitectureInterface,
  ArchitectureNode,
  ArchitectureObligation,
  ArchitectureObligationConcern,
  ArchitectureProject,
  ArchitectureStage,
  ArchitectureValidationPosture,
  StageCoAuthorTarget,
  StageDraftOperation,
} from '@aiw/domain';

interface EvidenceRecord {
  ref: string;
  title: string;
  text: string;
  criticality: ArchitectureObligation['criticality'];
  requirementRefs: string[];
  journeyRefs: string[];
  qualityDriverRefs: string[];
  sourceKind: 'requirement' | 'journey' | 'quality' | 'constraint' | 'objective' | 'context' | 'risk' | 'decision';
}

interface ResponsibilityCluster {
  id: string;
  subjectKey: string;
  label: string;
  concernFamily: 'business' | 'coordination' | 'integration' | 'data' | 'security' | 'resilience' | 'operations' | 'migration' | 'governance' | 'deployment';
  obligations: ArchitectureObligation[];
  criticality: ArchitectureObligation['criticality'];
  evidenceStrength: ArchitectureEvidenceStrength;
}

export interface ArchitectureCompositionResult {
  obligations: ArchitectureObligation[];
  operations: StageDraftOperation[];
  changeSets: ArchitectureChangeSet[];
  attentionQueue: ArchitectureAttentionItem[];
}

const stopWords = new Set([
  'the','a','an','and','or','to','of','for','from','with','without','through','within','into','on','in','by','as','at','is','are','be','being','been','must','shall','should','may','can','could','would','will','system','solution','platform','application','service','user','users','support','provide','enable','ensure','allow','required','requirement','process','manage','management','data','information','business','customer','customers','project','architecture','existing','new','all','each','any','when','where','while','before','after','during','between','across','using','use','used','its','their','that','this','these','those',
]);

const architectureSignalPattern = /\b(manag\w*|captur\w*|process\w*|stor\w*|persist\w*|retriev\w*|publish\w*|consum\w*|rout\w*|integrat\w*|onboard\w*|screen\w*|approv\w*|authori[sz]\w*|notif\w*|reconcil\w*|migrat\w*|monitor\w*|detect\w*|creat\w*|updat\w*|delet\w*|search\w*|discover\w*|access\w*|revok\w*|scal\w*|protect\w*|audit\w*|govern\w*|validat\w*|coordinat\w*|calculat\w*|quot\w*|settl\w*|enrol\w*|enroll\w*|grad\w*|assess\w*|telemetry|payment\w*|fund\w*|claim\w*|policy|student\w*|device\w*|asset\w*|data|customer\w*|agent\w*|workflow\w*|identity|order\w*|transaction\w*|interface\w*|api|event\w*|system|service\w*|platform|availability|resilien\w*|privacy|secur\w*|fraud|sanction\w*|aml|legacy|deploy\w*|region\w*|recover\w*|failure\w*|offline|lineage|contract\w*|beneficiar\w*|ledger|partner\w*|correspondent\w*)\b/i;

function isArchitecturallyRelevant(record: EvidenceRecord): boolean {
  return architectureSignalPattern.test(`${record.title} ${record.text}`);
}

const concernRules: Array<{ concern: ArchitectureObligationConcern; pattern: RegExp }> = [
  { concern: 'identity-security-trust', pattern: /\b(identity|authentication|authori[sz]ation|access control|least privilege|credential|secret|trust boundary|zero trust|device security|secured? (?:edge )?devices?|prompt injection|sanctions|aml|fraud)\b/i },
  { concern: 'privacy-governance', pattern: /\b(privacy|personal data|pii|sensitive data|customer data|student data|restricted content|protect(?:ing)? (?:customer|student|personal|sensitive|restricted)? ?data|masking|tokeni[sz]ation|consent|retention|regulatory|compliance|audit trail)\b/i },
  { concern: 'data-ownership-lineage', pattern: /\b(data owner|ownership|lineage|system of record|authoritative|master data|data product|data contract|quality rule|classification|catalog|metadata)\b/i },
  { concern: 'consistency-transaction-semantics', pattern: /\b(transaction|atomic|consisten|idempoten|duplicate|exactly once|at least once|ordering|ledger|balance|reservation|reconciliation|pending|indeterminate)\b/i },
  { concern: 'failure-compensation', pattern: /\b(failure|retry|timeout|compensat|rollback|dead letter|replay|poison|exception|cancel|recovery path|offline|pending|indeterminate|uncertain outcome)\b/i },
  { concern: 'resilience-recovery', pattern: /\b(availability|resilien\w*|recovery|failover|backup|restore|rto|rpo|disaster|peak\w*|burst|intermittent|degraded|continuity|scale|scaling)\b/i },
  { concern: 'observability-operations', pattern: /\b(observability|monitor|telemetry|trace|metric|log|alert|operat|support team|incident|work order|usage monitoring|cost|latency)\b/i },
  { concern: 'migration-coexistence', pattern: /\b(legacy|moderni[sz]|migration|coexist|cutover|strangler|transition|backfill|dual run|compatibility|cohort)\b/i },
  { concern: 'human-approval-governance', pattern: /\b(human approval|manual approval|access approval|payment approval|approval workflow|reviewer|assessor|four eyes|maker checker|escalation|exception|risk accepted|decision right|human agent)\b/i },
  { concern: 'deployment-isolation', pattern: /\b(region|zone|residency|network|cluster|deployment|edge devices?|edge sites?|isolation|tenant|failure domain|environment|on premise|cloud)\b/i },
  { concern: 'interface-contract', pattern: /\b(api|interface|integrat\w*|event|webhook|message|partner\w*|correspondent\w*|third part\w*|external system|protocol|contract\w*|notification|connector)\b/i },
  { concern: 'journey-coordination', pattern: /\b(workflow|orchestrat|coordinate|journey|process manager|saga|approval flow|fulfil|fulfill|claim|enrol|onboard|routing|assessment|grading)\b/i },
  { concern: 'state-ownership', pattern: /\b(owns|ownership|state|record|store|persist|history|lifecycle|status|inventory|policy|claim\w*|order\w*|account\w*|beneficiar\w*|asset models?)\b/i },
  { concern: 'authority-boundary', pattern: /\b(authoritative|authority|system of record|decision boundary|policy decision|ledger|core|source of truth|approval authority)\b/i },
  { concern: 'business-responsibility', pattern: /.*/ },
];

const concernFamilies: Record<ArchitectureObligationConcern, ResponsibilityCluster['concernFamily']> = {
  'business-responsibility': 'business',
  'state-ownership': 'data',
  'authority-boundary': 'governance',
  'journey-coordination': 'coordination',
  'interface-contract': 'integration',
  'data-ownership-lineage': 'data',
  'identity-security-trust': 'security',
  'privacy-governance': 'security',
  'consistency-transaction-semantics': 'coordination',
  'failure-compensation': 'resilience',
  'resilience-recovery': 'resilience',
  'observability-operations': 'operations',
  'migration-coexistence': 'migration',
  'human-approval-governance': 'governance',
  'deployment-isolation': 'deployment',
};

function criticalityRank(value: ArchitectureObligation['criticality']): number {
  if (value === 'critical') return 4;
  if (value === 'high') return 3;
  if (value === 'medium') return 2;
  return 1;
}

function stableSlug(value: string): string {
  const parts = value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').split('-').filter(Boolean);
  const collapsed = parts.filter((part, index) => part !== parts[index - 1]);
  return collapsed.join('-').slice(0, 64) || 'obligation';
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function bounded(value: unknown, max = 500): string {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}

function titleCase(value: string): string {
  return value.split(/[-\s]+/).filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function evidenceStrength(recordCount: number, sourceKindCount: number, unresolved: number): ArchitectureEvidenceStrength {
  if (recordCount >= 3 && sourceKindCount >= 2 && unresolved === 0) return 'strong';
  if (recordCount >= 1 && unresolved <= 1) return 'moderate';
  return 'weak';
}

function maxCriticality(values: ArchitectureObligation['criticality'][]): ArchitectureObligation['criticality'] {
  return values.reduce<ArchitectureObligation['criticality']>((best, value) => criticalityRank(value) > criticalityRank(best) ? value : best, 'low');
}

function requirementCriticality(priority: string): ArchitectureObligation['criticality'] {
  if (priority === 'critical') return 'critical';
  if (priority === 'high') return 'high';
  if (priority === 'low') return 'low';
  return 'medium';
}

function subjectKey(title: string, text: string): string {
  const genericTitle = /^(constraint|objective|requirement|quality scenario|finding|decision)\b/i.test(title.trim());
  // A specific title is normally the cleanest bounded-responsibility label.
  // Re-appending the full statement duplicates nouns and makes descriptive
  // quality-scenario prose look like a scenario-specific template.
  const preferred = genericTitle ? text : title;
  const cleaned = preferred
    .replace(/\b(the system|the platform|the solution|the application|must|shall|should|will|is required to|needs to|is able to)\b/gi, ' ')
    .replace(/[^a-zA-Z0-9,;:\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  const actionNouns: Record<string, string> = {
    manage: 'management', capture: 'capture', process: 'processing', store: 'storage', persist: 'persistence', retrieve: 'retrieval',
    publish: 'publication', consume: 'consumption', route: 'routing', integrate: 'integration', onboard: 'onboarding', screen: 'screening',
    approve: 'approval', authorize: 'authorization', authorise: 'authorisation', notify: 'notification', reconcile: 'reconciliation', migrate: 'migration',
    monitor: 'monitoring', detect: 'detection', create: 'creation', update: 'update', delete: 'deletion', search: 'search',
    discover: 'discovery', access: 'access', revoke: 'revocation', scale: 'scaling', protect: 'protection', audit: 'audit',
    govern: 'governance', validate: 'validation', coordinate: 'coordination', calculate: 'calculation', quote: 'quotation', settle: 'settlement',
    enrol: 'enrolment', enroll: 'enrolment', grade: 'grading', assess: 'assessment', reserve: 'reservation', verify: 'verification',
    execute: 'execution', accept: 'acceptance', ingest: 'ingestion', classify: 'classification', mask: 'masking', escalate: 'escalation',
    generate: 'generation', submit: 'submission', assign: 'assignment', schedule: 'scheduling', dispatch: 'dispatch', deliver: 'delivery',
    fulfil: 'fulfilment', fulfill: 'fulfilment', compensate: 'compensation', recover: 'recovery', replicate: 'replication', synchronize: 'synchronization',
    synchronise: 'synchronisation', archive: 'archival', retain: 'retention', train: 'training', infer: 'inference', recommend: 'recommendation',
    review: 'review', decide: 'decision', provision: 'provisioning', deprovision: 'deprovisioning', register: 'registration', authenticate: 'authentication',
    encrypt: 'encryption', decrypt: 'decryption', tokenize: 'tokenization', tokenise: 'tokenisation', measure: 'measurement', alert: 'alerting',
    trace: 'tracing', log: 'logging', retry: 'retry', rollback: 'rollback', backfill: 'backfill', cutover: 'cutover',
    export: 'export', import: 'import', transform: 'transformation', aggregate: 'aggregation', query: 'query', share: 'sharing',
    exchange: 'exchange', transfer: 'transfer', pay: 'payment', collect: 'collection', disburse: 'disbursement', adjudicate: 'adjudication',
    investigate: 'investigation', remediate: 'remediation', configure: 'configuration', deploy: 'deployment', isolate: 'isolation', failover: 'failover',
    backup: 'backup', restore: 'restoration', enrolment: 'enrolment', onboarding: 'onboarding', screening: 'screening', routing: 'routing',
    monitoring: 'monitoring', reconciliation: 'reconciliation', migration: 'migration', approval: 'approval', validation: 'validation', assessment: 'assessment',
    grading: 'grading', discovery: 'discovery', revocation: 'revocation', ingestion: 'ingestion', processing: 'processing', orchestration: 'orchestration',
    coordination: 'coordination', notification: 'notification', payment: 'payment', settlement: 'settlement', delivery: 'delivery', fulfilment: 'fulfilment',
    fulfillment: 'fulfilment', recovery: 'recovery', governance: 'governance', authorization: 'authorization', authorisation: 'authorisation', authentication: 'authentication',
    observability: 'observability', deployment: 'deployment', integration: 'integration', storage: 'storage', retrieval: 'retrieval', decision: 'decision',
    inference: 'inference', recommendation: 'recommendation', escalation: 'escalation', collection: 'collection', disbursement: 'disbursement', registration: 'registration',
    provisioning: 'provisioning', reporting: 'reporting', report: 'reporting', analysis: 'analysis', analyze: 'analysis', analyse: 'analysis',
    anomaly: 'anomaly-detection', predict: 'prediction', prediction: 'prediction', reservation: 'reservation', quotation: 'quotation', cancellation: 'cancellation',
    cancel: 'cancellation',
  };
  const actionWords = new Set(Object.keys(actionNouns));
  const clauses = cleaned.split(/[.;:]/).map((item) => item.trim()).filter(Boolean);
  for (const clause of clauses) {
    const tokens = clause.replace(/,/g, ' , ').split(/\s+/).filter(Boolean);
    const actionIndex = tokens.findIndex((token) => actionWords.has(token));
    if (actionIndex < 0) continue;
    const action = actionNouns[tokens[actionIndex]!] ?? tokens[actionIndex]!;
    const objectTokens: string[] = [];
    for (let index = actionIndex + 1; index < tokens.length && objectTokens.length < 3; index += 1) {
      const token = tokens[index]!;
      if (token === ',' || token === 'and' || token === 'then' || token === 'while' || token === 'when') {
        if (objectTokens.length) break;
        continue;
      }
      if (actionWords.has(token)) continue;
      if (token.length <= 2 || stopWords.has(token)) continue;
      const singular = token.endsWith('ies') && token.length > 4
        ? `${token.slice(0, -3)}y`
        : token.endsWith('s') && !token.endsWith('ss') && token.length > 3
          ? token.slice(0, -1)
          : token;
      objectTokens.push(singular);
    }
    if (objectTokens.length) return stableSlug(`${objectTokens.join('-')}-${action}`);
  }

  const tokens = cleaned.split(/\s+/).filter((token) => token.length > 2 && !stopWords.has(token) && token !== ',');
  const weighted = tokens.filter((token, index) => tokens.indexOf(token) === index).slice(0, 3);
  return stableSlug(weighted.join('-') || title || 'core-responsibility');
}

function concernsFor(text: string): ArchitectureObligationConcern[] {
  const matched = concernRules.filter((rule) => rule.pattern.test(text)).map((rule) => rule.concern);
  const withoutDefault = matched.filter((concern) => concern !== 'business-responsibility');
  return unique(withoutDefault.length ? withoutDefault.slice(0, 8) : ['business-responsibility']);
}

function targetStages(concern: ArchitectureObligationConcern): StageCoAuthorTarget[] {
  switch (concern) {
    case 'business-responsibility':
    case 'state-ownership':
    case 'authority-boundary':
    case 'journey-coordination':
      return ['logicalApplication', 'applicationRealization', 'logicalTechnology', 'physicalTechnology', 'reviewAssurance', 'sddPack'];
    case 'interface-contract':
    case 'data-ownership-lineage':
    case 'identity-security-trust':
    case 'privacy-governance':
    case 'consistency-transaction-semantics':
    case 'failure-compensation':
      return ['logicalApplication', 'applicationRealization', 'logicalTechnology', 'physicalTechnology', 'reviewAssurance', 'sddPack'];
    case 'resilience-recovery':
    case 'observability-operations':
    case 'deployment-isolation':
      return ['applicationRealization', 'logicalTechnology', 'physicalTechnology', 'reviewAssurance', 'sddPack'];
    case 'migration-coexistence':
      return ['logicalApplication', 'applicationRealization', 'logicalTechnology', 'physicalTechnology', 'reviewAssurance', 'sddPack'];
    case 'human-approval-governance':
      return ['logicalApplication', 'applicationRealization', 'reviewAssurance', 'sddPack'];
    default:
      return [];
  }
}

function collectEvidence(project: ArchitectureProject): EvidenceRecord[] {
  const records: EvidenceRecord[] = [];
  for (const requirement of project.requirementsIntelligence?.requirements ?? []) {
    if (requirement.status !== 'accepted') continue;
    records.push({
      ref: `requirement:${requirement.id}`,
      title: requirement.title,
      text: `${requirement.statement} ${requirement.acceptanceCriteria.join(' ')} ${requirement.qualityAttributeHints.join(' ')}`,
      criticality: requirementCriticality(requirement.priority),
      requirementRefs: [`requirement:${requirement.id}`],
      journeyRefs: requirement.journeyRefs.map((id) => id.startsWith('journey:') ? id : `journey:${id}`),
      qualityDriverRefs: requirement.qualityAttributeHints.map((hint) => `quality-hint:${stableSlug(hint)}`),
      sourceKind: 'requirement',
    });
  }
  for (const journey of project.requirementsIntelligence?.journeys ?? []) {
    if (journey.status !== 'accepted') continue;
    const interactionText = journey.paths.flatMap((path) => path.interactions.filter((item) => item.status === 'accepted').map((item) => `${item.label} ${item.interactionKind} ${item.dataObjects.join(' ')} ${item.failureBehaviour ?? ''} ${item.trustBoundaryCrossing ? 'trust boundary' : ''}`)).join(' ');
    records.push({
      ref: `journey:${journey.id}`,
      title: journey.name,
      text: `${journey.goal} ${journey.description} ${journey.qualityHotspots.join(' ')} ${journey.architectureObligations.join(' ')} ${interactionText}`,
      criticality: journey.priority,
      requirementRefs: journey.requirementRefs.map((id) => id.startsWith('requirement:') ? id : `requirement:${id}`),
      journeyRefs: [`journey:${journey.id}`],
      qualityDriverRefs: unique(journey.paths.flatMap((path) => path.interactions.flatMap((item) => item.qualityRefs))),
      sourceKind: 'journey',
    });
  }
  project.qualityScenarios.forEach((scenario) => records.push({
    ref: `quality-scenario:${scenario.id}`,
    title: scenario.attributeId,
    text: `${scenario.source} ${scenario.stimulus} ${scenario.environment} ${scenario.artifact} ${scenario.response} ${scenario.responseMeasure}`,
    criticality: 'high',
    requirementRefs: [], journeyRefs: [], qualityDriverRefs: [`quality-scenario:${scenario.id}`], sourceKind: 'quality',
  }));
  project.constraints.forEach((text, index) => records.push({ ref: `constraint:${index}`, title: `Constraint ${index + 1}`, text, criticality: 'high', requirementRefs: [], journeyRefs: [], qualityDriverRefs: [], sourceKind: 'constraint' }));
  project.objectives.forEach((text, index) => records.push({ ref: `objective:${index}`, title: `Objective ${index + 1}`, text, criticality: 'medium', requirementRefs: [], journeyRefs: [], qualityDriverRefs: [], sourceKind: 'objective' }));
  project.findings.forEach((finding) => records.push({ ref: `finding:${finding.id}`, title: finding.title, text: `${finding.message} ${finding.rationale} ${finding.mitigations.join(' ')}`, criticality: finding.severity === 'HARD' ? 'critical' : finding.severity === 'SIGNIFICANT' ? 'high' : 'medium', requirementRefs: [], journeyRefs: [], qualityDriverRefs: [], sourceKind: 'risk' }));
  project.decisions.filter((decision) => decision.status === 'accepted').forEach((decision) => records.push({ ref: `decision:${decision.id}`, title: decision.title, text: `${decision.context} ${decision.decision} ${decision.consequences.join(' ')}`, criticality: 'high', requirementRefs: [], journeyRefs: [], qualityDriverRefs: [], sourceKind: 'decision' }));
  return records.filter((record) => bounded(`${record.title} ${record.text}`).length > 2);
}

export function compileArchitectureObligations(project: ArchitectureProject, targetStage: StageCoAuthorTarget): ArchitectureObligation[] {
  const records = collectEvidence(project);
  const provisional: ArchitectureObligation[] = [];
  for (const record of records) {
    if (!isArchitecturallyRelevant(record)) continue;
    const combined = `${record.title} ${record.text}`;
    const key = subjectKey(record.title, record.text);
    for (const concern of concernsFor(combined)) {
      if (!targetStages(concern).includes(targetStage)) continue;
      const unresolvedAssumptions: string[] = [];
      if (/\b(fast|quick|high performance|high availability|scalable|real time|near real time)\b/i.test(combined) && !/\b\d+(\.\d+)?\s*(ms|s|sec|seconds|minutes|%|percent|rto|rpo|tps|requests)\b/i.test(combined)) unresolvedAssumptions.push('A measurable quality target has not been confirmed.');
      provisional.push({
        id: `obl-${stableSlug(record.ref)}-${stableSlug(concern)}-${key}`,
        title: `${titleCase(key)} — ${titleCase(concern)}`,
        statement: bounded(record.text, 520),
        concern,
        criticality: record.criticality,
        evidenceStrength: evidenceStrength(1, 1, unresolvedAssumptions.length),
        sourceRefs: [record.ref],
        requirementRefs: record.requirementRefs,
        journeyRefs: record.journeyRefs,
        qualityDriverRefs: record.qualityDriverRefs,
        unresolvedAssumptions,
        targetStages: targetStages(concern),
        satisfactionState: 'unaddressed',
        subjectKey: key,
      });
    }
  }
  const groups = new Map<string, ArchitectureObligation[]>();
  for (const obligation of provisional) {
    const groupKey = `${obligation.concern}:${obligation.subjectKey}`;
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), obligation]);
  }
  return [...groups.values()].map((items) => {
    const first = items[0]!;
    const sourceKinds = new Set(items.flatMap((item) => item.sourceRefs.map((ref) => ref.split(':')[0])));
    const assumptions = unique(items.flatMap((item) => item.unresolvedAssumptions));
    return {
      ...first,
      id: `obl-${stableSlug(first.concern)}-${first.subjectKey}`,
      statement: bounded(items.map((item) => item.statement).join(' '), 680),
      criticality: maxCriticality(items.map((item) => item.criticality)),
      evidenceStrength: evidenceStrength(items.length, sourceKinds.size, assumptions.length),
      sourceRefs: unique(items.flatMap((item) => item.sourceRefs)),
      requirementRefs: unique(items.flatMap((item) => item.requirementRefs)),
      journeyRefs: unique(items.flatMap((item) => item.journeyRefs)),
      qualityDriverRefs: unique(items.flatMap((item) => item.qualityDriverRefs)),
      unresolvedAssumptions: assumptions,
    };
  }).sort((left, right) => criticalityRank(right.criticality) - criticalityRank(left.criticality) || left.id.localeCompare(right.id));
}

function labelForCluster(cluster: ResponsibilityCluster, targetStage: StageCoAuthorTarget): { label: string; kind: ArchitectureNode['kind']; responsibility: string } {
  const subject = titleCase(cluster.subjectKey);
  const family = cluster.concernFamily;
  if (targetStage === 'logicalApplication') {
    const suffix: Record<ResponsibilityCluster['concernFamily'], string> = { business: 'Capability Service', coordination: 'Journey Orchestrator', integration: 'Integration Boundary', data: 'Data Authority', security: 'Trust and Policy Boundary', resilience: 'Reliability Control', operations: 'Operational Control', migration: 'Coexistence Boundary', governance: 'Decision Authority', deployment: 'Deployment Responsibility' };
    const kind: ArchitectureNode['kind'] = family === 'data' ? 'DataDomain' : family === 'security' || family === 'governance' || family === 'resilience' ? 'Control' : 'LogicalService';
    return { label: `${subject} ${suffix[family] ?? 'Responsibility'}`, kind, responsibility: `Owns ${cluster.obligations.map((item) => item.concern.replaceAll('-', ' ')).join(', ')} obligations for ${subject} without assuming a product or deployment topology.` };
  }
  if (targetStage === 'applicationRealization') {
    const suffix: Record<ResponsibilityCluster['concernFamily'], string> = { business: 'Application API', coordination: 'Workflow Worker', integration: 'Adapter', data: 'State Store', security: 'Policy Enforcement Module', resilience: 'Recovery Worker', operations: 'Operations Module', migration: 'Migration Control Service', governance: 'Approval Module', deployment: 'Runtime Unit' };
    const kind: ArchitectureNode['kind'] = family === 'data' ? 'DataStore' : family === 'integration' || family === 'security' ? 'ApplicationComponent' : 'DeployableUnit';
    return { label: `${subject} ${suffix[family] ?? 'Responsibility'}`, kind, responsibility: `Realises ${subject} obligations as a buildable unit with explicit ownership, contracts and failure handling.` };
  }
  if (targetStage === 'logicalTechnology') {
    const suffix: Record<ResponsibilityCluster['concernFamily'], string> = { business: 'Application Runtime Capability', coordination: 'Workflow and Messaging Capability', integration: 'Integration Contract Capability', data: 'Data Management Capability', security: 'Identity and Policy Capability', resilience: 'Resilience and Recovery Capability', operations: 'Observability and Operations Capability', migration: 'Migration and Coexistence Capability', governance: 'Governance Workflow Capability', deployment: 'Isolation and Placement Capability' };
    return { label: `${subject} ${suffix[family] ?? 'Technology Capability'}`, kind: 'LogicalTechnologyCapability', responsibility: `Provides provider-neutral ${family} capabilities required by the accepted ${subject} obligations.` };
  }
  const suffix: Record<ResponsibilityCluster['concernFamily'], string> = { business: 'Application Deployment', coordination: 'Processing Cluster', integration: 'Integration Zone', data: 'Protected Data Zone', security: 'Trust Boundary Zone', resilience: 'Recovery Environment', operations: 'Operations Plane', migration: 'Coexistence Environment', governance: 'Control Plane', deployment: 'Failure Domain' };
  const kind: ArchitectureNode['kind'] = family === 'resilience' || family === 'migration' ? 'Environment' : family === 'integration' || family === 'data' || family === 'security' || family === 'governance' ? 'NetworkZone' : 'DeploymentNode';
  return { label: `${subject} ${suffix[family] ?? 'Responsibility'}`, kind, responsibility: `Makes the physical placement and isolation consequences of ${subject} visible without inventing region, product, node count, RTO or RPO.` };
}

function clusterObligations(obligations: ArchitectureObligation[], targetStage: StageCoAuthorTarget): ResponsibilityCluster[] {
  const groups = new Map<string, ArchitectureObligation[]>();
  for (const obligation of obligations) {
    const family = concernFamilies[obligation.concern];
    const groupingSubject = obligation.subjectKey.split('-').slice(0, 3).join('-') || 'core';
    const key = `${family}:${groupingSubject}`;
    groups.set(key, [...(groups.get(key) ?? []), obligation]);
  }
  const clusters = [...groups.entries()].map(([key, items]) => {
    const [family, ...subjectParts] = key.split(':');
    const sourceKinds = new Set(items.flatMap((item) => item.sourceRefs.map((ref) => ref.split(':')[0])));
    const assumptionCount = unique(items.flatMap((item) => item.unresolvedAssumptions)).length;
    const cluster: ResponsibilityCluster = {
      id: `cluster-${stableSlug(key)}`,
      subjectKey: subjectParts.join(':') || items[0]!.subjectKey,
      label: titleCase(subjectParts.join(':') || items[0]!.subjectKey),
      concernFamily: family as ResponsibilityCluster['concernFamily'],
      obligations: items,
      criticality: maxCriticality(items.map((item) => item.criticality)),
      evidenceStrength: evidenceStrength(items.length, sourceKinds.size, assumptionCount),
    };
    return cluster;
  }).sort((left, right) => criticalityRank(right.criticality) - criticalityRank(left.criticality) || left.id.localeCompare(right.id));
  const maximum = targetStage === 'physicalTechnology' ? 7 : 8;
  return clusters.slice(0, maximum);
}

function upstreamStage(targetStage: StageCoAuthorTarget): ArchitectureStage[] {
  if (targetStage === 'logicalApplication') return ['designIntent'];
  if (targetStage === 'applicationRealization') return ['logicalApplication'];
  if (targetStage === 'logicalTechnology') return ['applicationRealization'];
  if (targetStage === 'physicalTechnology') return ['logicalTechnology'];
  return ['designIntent'];
}

function operationBase(input: { id: string; label: string; targetPath: string; targetId: string; proposedValue: unknown; rationale: string; obligations: ArchitectureObligation[]; changeSetId: string; affectedObjectIds: string[]; alternatives: string[]; tradeOffs: string[]; downstreamEffects: string[] }): StageDraftOperation {
  const obligationRefs = input.obligations.map((item) => item.id);
  const assumptions = unique(input.obligations.flatMap((item) => item.unresolvedAssumptions));
  const evidence = unique(input.obligations.flatMap((item) => item.sourceRefs));
  const requirementRefs = unique(input.obligations.flatMap((item) => item.requirementRefs));
  const qualityDriverRefs = unique(input.obligations.flatMap((item) => item.qualityDriverRefs));
  const strength = evidenceStrength(input.obligations.length, new Set(evidence.map((ref) => ref.split(':')[0])).size, assumptions.length);
  const validationPosture: ArchitectureValidationPosture = evidence.length === 0 ? 'fallback-seed' : assumptions.length ? 'assumption-heavy' : 'supported';
  return {
    id: input.id,
    kind: input.targetPath.startsWith('nodes.') ? 'add-node' : input.targetPath.startsWith('edges.') ? 'add-edge' : 'add-interface',
    label: input.label,
    targetPath: input.targetPath,
    targetId: input.targetId,
    proposedValue: input.proposedValue,
    rationale: input.rationale,
    evidenceRefs: evidence,
    requirementRefs,
    qualityDriverRefs,
    riskRefs: [],
    decisionRefs: [],
    confidence: strength === 'strong' ? 0.82 : strength === 'moderate' ? 0.66 : 0.48,
    validationStatus: evidence.length === 0 || assumptions.some((item) => /measurable quality target/i.test(item)) ? 'requires-clarification' : 'ready',
    missingInformation: assumptions,
    tradeOffs: input.tradeOffs,
    downstreamEffects: input.downstreamEffects,
    candidateState: 'proposed',
    affectedObjectIds: input.affectedObjectIds,
    alternatives: input.alternatives,
    assumptions,
    reviewRequired: true,
    authority: 'candidate',
    obligationRefs,
    changeSetId: input.changeSetId,
    evidenceStrength: strength,
    assumptionBurden: assumptions.length,
    validationPosture,
  };
}

function composeVariant(project: ArchitectureProject, targetStage: StageCoAuthorTarget, clusters: ResponsibilityCluster[], variant: 'separated' | 'consolidated'): { operations: StageDraftOperation[]; changeSet: ArchitectureChangeSet } {
  const stage = targetStage === 'logicalApplication' ? 'logicalApplication' : targetStage === 'applicationRealization' ? 'applicationRealization' : targetStage === 'logicalTechnology' ? 'logicalTechnology' : 'physicalTechnology';
  const changeSetId = `changeset-${stableSlug(project.id)}-${stableSlug(targetStage)}-${variant}`;
  const selectedClusters = variant === 'consolidated' && clusters.length > 3
    ? clusters.reduce<ResponsibilityCluster[]>((acc, cluster) => {
        const existing = acc.find((item) => item.concernFamily === cluster.concernFamily || (item.concernFamily === 'business' && cluster.concernFamily === 'coordination'));
        if (existing) {
          existing.obligations = [...existing.obligations, ...cluster.obligations];
          existing.subjectKey = `${existing.subjectKey}-${cluster.subjectKey}`.split('-').slice(0, 4).join('-');
          existing.criticality = maxCriticality([existing.criticality, cluster.criticality]);
          existing.evidenceStrength = evidenceStrength(existing.obligations.length, new Set(existing.obligations.flatMap((item) => item.sourceRefs.map((ref) => ref.split(':')[0]))).size, unique(existing.obligations.flatMap((item) => item.unresolvedAssumptions)).length);
        } else acc.push({ ...cluster, obligations: [...cluster.obligations] });
        return acc;
      }, []).slice(0, Math.max(2, Math.ceil(clusters.length * 0.65)))
    : clusters;
  const operations: StageDraftOperation[] = [];
  const nodeIds: string[] = [];
  const nodeClusters = new Map<string, ResponsibilityCluster>();
  for (const cluster of selectedClusters) {
    const definition = labelForCluster(cluster, targetStage);
    const nodeId = `aiw-${stableSlug(project.id)}-${stableSlug(stage)}-${variant}-${stableSlug(definition.label)}`;
    nodeIds.push(nodeId);
    nodeClusters.set(nodeId, cluster);
    const node: ArchitectureNode = {
      id: nodeId,
      kind: definition.kind,
      stage,
      label: definition.label,
      description: definition.responsibility,
      properties: {
        responsibility: definition.responsibility,
        obligationRefs: cluster.obligations.map((item) => item.id),
        evidenceStrength: cluster.evidenceStrength,
        candidateLifecycleState: 'proposed',
        candidateAuthority: 'candidate',
        reviewRequired: true,
        upstreamStageRefs: upstreamStage(targetStage),
        compositionVariant: variant,
      },
      lineageFrom: unique(cluster.obligations.flatMap((item) => item.requirementRefs.map((ref) => ref.replace(/^requirement:/, '')))),
      positions: {},
      tags: ['aiw-brain-candidate', 'obligation-derived', cluster.concernFamily, variant],
      status: 'draft',
    };
    operations.push(operationBase({
      id: `add-${nodeId}`,
      label: `Propose ${definition.label}`,
      targetPath: `nodes.${nodeId}`,
      targetId: nodeId,
      proposedValue: node,
      rationale: `${definition.responsibility} The boundary is derived from ${cluster.obligations.length} explicit obligation${cluster.obligations.length === 1 ? '' : 's'} rather than a named scenario template.`,
      obligations: cluster.obligations,
      changeSetId,
      affectedObjectIds: [nodeId],
      alternatives: variant === 'separated' ? ['Consolidate adjacent low-criticality responsibilities when a separate owner, transaction boundary or scaling profile is not justified.'] : ['Separate responsibilities where ownership, trust, change cadence or failure semantics differ materially.'],
      tradeOffs: variant === 'separated' ? ['Improves ownership and failure isolation but increases interface and operating overhead.'] : ['Reduces moving parts but concentrates change, scaling and failure consequences.'],
      downstreamEffects: [`Accepted ${stage} responsibilities become bounded input to the next lifecycle stage.`, 'Later upstream changes mark only obligation-linked candidates stale.'],
    }));
  }
  const relationshipPairs: Array<[string, string, ArchitectureEdge['kind'], string]> = [];
  const integration = nodeIds.find((id) => nodeClusters.get(id)?.concernFamily === 'integration');
  const coordination = nodeIds.find((id) => nodeClusters.get(id)?.concernFamily === 'coordination');
  const business = nodeIds.filter((id) => nodeClusters.get(id)?.concernFamily === 'business');
  const data = nodeIds.find((id) => nodeClusters.get(id)?.concernFamily === 'data');
  const security = nodeIds.find((id) => nodeClusters.get(id)?.concernFamily === 'security');
  if (coordination) business.slice(0, 3).forEach((id) => relationshipPairs.push([coordination, id, 'dependsOn', 'coordinates']));
  if (integration) (business.length ? business : nodeIds.filter((id) => id !== integration).slice(0, 2)).forEach((id) => relationshipPairs.push([id, integration, 'communicatesWith', 'uses governed boundary']));
  if (data) (business.length ? business : nodeIds.filter((id) => id !== data).slice(0, 2)).forEach((id) => relationshipPairs.push([id, data, 'reads', 'uses owned state']));
  if (security) nodeIds.filter((id) => id !== security).slice(0, 3).forEach((id) => relationshipPairs.push([id, security, 'dependsOn', 'enforces policy']));
  if (!relationshipPairs.length && nodeIds.length > 1) {
    for (let index = 0; index < nodeIds.length - 1; index += 1) relationshipPairs.push([nodeIds[index]!, nodeIds[index + 1]!, 'communicatesWith', 'exchanges governed information']);
  }
  const seenPairs = new Set<string>();
  relationshipPairs.slice(0, 8).forEach(([sourceId, targetId, kind, label], index) => {
    const pairKey = `${sourceId}:${targetId}:${kind}`;
    if (sourceId === targetId || seenPairs.has(pairKey)) return;
    seenPairs.add(pairKey);
    const obligations = unique([...(nodeClusters.get(sourceId)?.obligations ?? []), ...(nodeClusters.get(targetId)?.obligations ?? [])].map((item) => item.id)).map((id) => clusters.flatMap((item) => item.obligations).find((item) => item.id === id)!).filter(Boolean);
    const edgeId = `aiw-edge-${stableSlug(project.id)}-${stableSlug(stage)}-${variant}-${index + 1}`;
    const edge: ArchitectureEdge = { id: edgeId, sourceId, targetId, kind, stage, label, properties: { candidateLifecycleState: 'proposed', candidateAuthority: 'candidate', obligationRefs: obligations.map((item) => item.id), compositionVariant: variant } };
    operations.push(operationBase({ id: `add-${edgeId}`, label: `Connect ${nodeClusters.get(sourceId)?.label ?? sourceId} to ${nodeClusters.get(targetId)?.label ?? targetId}`, targetPath: `edges.${edgeId}`, targetId: edgeId, proposedValue: edge, rationale: 'The relationship is derived from shared journey, interface, state or control obligations and makes failure propagation visible.', obligations, changeSetId, affectedObjectIds: [edgeId, sourceId, targetId], alternatives: ['Reverse, remove or mediate the dependency when ownership and authority analysis supports a different flow.'], tradeOffs: ['Every dependency adds latency, availability, versioning and operational consequences that must be governed.'], downstreamEffects: ['Feeds interface, failure-path, security, resilience and deployment analysis.'] }));
  });
  const interfaceObligations = clusters.flatMap((cluster) => cluster.obligations).filter((item) => ['interface-contract','consistency-transaction-semantics','failure-compensation','identity-security-trust'].includes(item.concern));
  if (nodeIds.length > 1 && interfaceObligations.length) {
    const provider = integration ?? coordination ?? nodeIds[1]!;
    const consumer = nodeIds.find((id) => id !== provider) ?? nodeIds[0]!;
    const interfaceId = `aiw-interface-${stableSlug(project.id)}-${stableSlug(stage)}-${variant}`;
    const eventDriven = interfaceObligations.some((item) => /event|asynchronous|message|notification/i.test(item.statement));
    const contract: ArchitectureInterface = {
      id: interfaceId,
      name: `${nodeClusters.get(consumer)?.label ?? 'Consumer'} to ${nodeClusters.get(provider)?.label ?? 'Provider'} contract`,
      stage,
      providerNodeId: provider,
      consumerNodeIds: [consumer],
      interactionStyle: eventDriven ? 'event' : 'request-response',
      protocol: eventDriven ? 'governed event contract; technology undecided' : 'governed interface contract; protocol undecided',
      operationOrEvent: eventDriven ? 'Domain outcome event; exact name requires architect decision' : 'Bounded business operation; exact contract requires architect decision',
      version: 'candidate-v1',
      authentication: interfaceObligations.some((item) => item.concern === 'identity-security-trust') ? 'Required; mechanism requires project decision' : 'Clarify trust and authentication requirement',
      authorization: 'Least privilege; policy decision required',
      encryption: 'Required for classified or trust-boundary-crossing data',
      retryPolicy: 'Retry only explicitly retryable failures with bounded backoff',
      idempotency: interfaceObligations.some((item) => item.concern === 'consistency-transaction-semantics') ? 'Required for consequential or replayable operations' : 'Clarify based on failure and replay semantics',
      ordering: eventDriven ? 'Define per aggregate or workflow only where evidence requires it' : 'Not assumed',
      deliveryGuarantee: eventDriven ? 'At-least-once may be considered with idempotent handling; architect decision required' : 'Explicit success, rejection, pending and indeterminate outcomes required where consequential',
      deadLetterPolicy: 'Quarantine unrecoverable work for governed investigation',
      replayPolicy: 'Replay only with authorisation, audit and idempotency controls',
      slo: 'No target invented; measurable latency and availability objectives require stakeholder confirmation',
      dataClassification: project.context.dataSensitivity === 'restricted' ? 'restricted' : project.context.dataSensitivity === 'confidential' ? 'confidential' : 'internal',
      owner: nodeClusters.get(provider)?.label ?? 'Architect decision required',
      lifecycleStatus: 'proposed',
      evidenceIds: unique(interfaceObligations.flatMap((item) => item.sourceRefs)),
      createdAt: '1970-01-01T00:00:00.000Z',
      updatedAt: '1970-01-01T00:00:00.000Z',
    };
    operations.push(operationBase({ id: `add-${interfaceId}`, label: `Propose ${contract.name}`, targetPath: `interfaces.${interfaceId}`, targetId: interfaceId, proposedValue: contract, rationale: 'The interface is created because explicit interaction, consistency, security or failure obligations cross a candidate responsibility boundary.', obligations: interfaceObligations, changeSetId, affectedObjectIds: [interfaceId, provider, consumer], alternatives: ['Merge the responsibilities if independent ownership and failure isolation do not justify a contract.', 'Use an asynchronous contract when latency coupling and recoverability evidence support it.'], tradeOffs: ['A formal contract improves accountability and testability but creates versioning, compatibility and operational obligations.'], downstreamEffects: ['Creates explicit security, data, resilience, observability and SDD obligations.'] }));
  }
  const allObligations = unique(selectedClusters.flatMap((item) => item.obligations).map((item) => item.id)).map((id) => clusters.flatMap((item) => item.obligations).find((item) => item.id === id)!).filter(Boolean);
  const assumptions = unique(allObligations.flatMap((item) => item.unresolvedAssumptions));
  const strength = evidenceStrength(allObligations.length, new Set(allObligations.flatMap((item) => item.sourceRefs.map((ref) => ref.split(':')[0]))).size, assumptions.length);
  const changeSet: ArchitectureChangeSet = {
    id: changeSetId,
    title: variant === 'separated' ? 'Evidence-separated responsibility boundaries' : 'Consolidated responsibility boundary',
    architectureHypothesis: variant === 'separated' ? 'Separate responsibilities where evidence indicates different ownership, state, trust, scaling or failure semantics.' : 'Consolidate adjacent responsibilities to reduce operating overhead while preserving explicit contracts and controls.',
    stage: targetStage,
    problemAddressed: `${allObligations.length} accepted architecture obligation${allObligations.length === 1 ? '' : 's'} currently need an explicit ${stage} representation.`,
    requirementRefs: unique(allObligations.flatMap((item) => item.requirementRefs)),
    qualityDriverRefs: unique(allObligations.flatMap((item) => item.qualityDriverRefs)),
    obligationRefs: allObligations.map((item) => item.id),
    operationIds: operations.map((item) => item.id),
    canvasDiff: {
      addedNodeIds: operations.filter((item) => item.kind === 'add-node').map((item) => item.targetId!).filter(Boolean),
      modifiedNodeIds: [], removedNodeIds: [],
      addedEdgeIds: operations.filter((item) => item.kind === 'add-edge').map((item) => item.targetId!).filter(Boolean),
      addedInterfaceIds: operations.filter((item) => item.kind === 'add-interface').map((item) => item.targetId!).filter(Boolean),
      affectedAcceptedObjectIds: [],
    },
    interfaceImpact: operations.filter((item) => item.kind === 'add-interface').map((item) => item.label),
    dataSecurityImpact: allObligations.filter((item) => ['data-ownership-lineage','identity-security-trust','privacy-governance'].includes(item.concern)).map((item) => item.title),
    alternatives: [],
    tradeOffs: variant === 'separated' ? ['More explicit boundaries improve ownership and independent change, but increase contracts and operating burden.'] : ['Fewer boundaries simplify delivery, but concentrate failure, scaling and change consequences.'],
    risks: assumptions.length ? ['Unresolved quality or ownership assumptions could change the recommended boundaries.'] : [],
    assumptions,
    fitnessTests: unique(allObligations.flatMap((item) => item.qualityDriverRefs)).map((ref) => `Verify ${ref} against the accepted architecture state.`).slice(0, 8),
    downstreamImpact: [`Acceptance creates candidate ${stage} graph objects.`, 'Only obligation-linked downstream generated candidates become stale when upstream evidence changes.'],
    evidenceStrength: strength,
    assumptionBurden: assumptions.length,
    unresolvedCriticalQuestions: assumptions,
    validationPosture: allObligations.every((item) => item.sourceRefs.length === 0) ? 'fallback-seed' : assumptions.length ? 'assumption-heavy' : 'supported',
    authority: 'candidate',
    reviewState: 'proposed',
  };
  return { operations, changeSet };
}

function buildAttentionQueue(project: ArchitectureProject, obligations: ArchitectureObligation[], targetStage: StageCoAuthorTarget): ArchitectureAttentionItem[] {
  const items: ArchitectureAttentionItem[] = [];
  for (const question of project.requirementsIntelligence?.openQuestions ?? []) {
    if (question.status !== 'open') continue;
    items.push({ id: `attention-question-${question.id}`, kind: 'clarification', severity: question.impact, title: question.question, detail: question.whyItMatters, relatedRefs: [...question.relatedRequirementRefs, ...question.relatedJourneyRefs], actionLabel: 'Open clarification', navigationTarget: `requirements:question:${question.id}` });
  }
  for (const conflict of project.requirementsIntelligence?.conflicts ?? []) {
    if (conflict.status !== 'open') continue;
    items.push({ id: `attention-conflict-${conflict.id}`, kind: 'contradiction', severity: conflict.severity, title: conflict.summary, detail: conflict.rationale, relatedRefs: [conflict.leftRef, conflict.rightRef], actionLabel: 'Resolve contradiction', navigationTarget: `requirements:conflict:${conflict.id}` });
  }
  for (const obligation of obligations.filter((item) => item.unresolvedAssumptions.length || item.evidenceStrength === 'weak')) {
    items.push({ id: `attention-obligation-${obligation.id}`, kind: obligation.concern === 'interface-contract' ? 'interface-gap' : obligation.concern === 'identity-security-trust' || obligation.concern === 'privacy-governance' ? 'security-gap' : obligation.concern === 'failure-compensation' || obligation.concern === 'resilience-recovery' ? 'failure-gap' : 'evidence-gap', severity: obligation.criticality, title: obligation.title, detail: obligation.unresolvedAssumptions.join(' ') || 'The obligation has weak evidence and needs architect confirmation.', relatedRefs: obligation.sourceRefs, actionLabel: 'Inspect obligation', navigationTarget: `${targetStage}:obligation:${obligation.id}` });
  }
  return items.sort((left, right) => criticalityRank(right.severity) - criticalityRank(left.severity)).slice(0, 12);
}

function fallbackObligation(project: ArchitectureProject, targetStage: StageCoAuthorTarget): ArchitectureObligation {
  return {
    id: `obl-fallback-${stableSlug(project.id)}-${stableSlug(targetStage)}`,
    title: 'Clarify the primary bounded responsibility',
    statement: 'The accepted project evidence is insufficient to infer architecture boundaries safely. Start with one reviewable responsibility seed and collect ownership, state, interface, quality and failure information before decomposition.',
    concern: 'business-responsibility',
    criticality: 'medium',
    evidenceStrength: 'weak',
    sourceRefs: [], requirementRefs: [], journeyRefs: [], qualityDriverRefs: [],
    unresolvedAssumptions: ['Primary business responsibility and accountable owner are not confirmed.', 'No sufficient accepted journey or quality evidence is available.'],
    targetStages: [targetStage], satisfactionState: 'unaddressed', subjectKey: 'primary-bounded-responsibility',
  };
}

export function compileArchitectureComposition(project: ArchitectureProject, targetStage: StageCoAuthorTarget): ArchitectureCompositionResult {
  const supported = ['logicalApplication','applicationRealization','logicalTechnology','physicalTechnology'].includes(targetStage);
  if (!supported) return { obligations: [], operations: [], changeSets: [], attentionQueue: buildAttentionQueue(project, [], targetStage) };
  const compiled = compileArchitectureObligations(project, targetStage);
  const obligations = compiled.length ? compiled : [fallbackObligation(project, targetStage)];
  const clusters = clusterObligations(obligations, targetStage);
  const primary = composeVariant(project, targetStage, clusters, 'separated');
  const variants = [primary];
  if (clusters.length >= 4) variants.push(composeVariant(project, targetStage, clusters, 'consolidated'));
  const alternatives = variants.map((variant) => ({
    id: variant.changeSet.id,
    title: variant.changeSet.title,
    summary: variant.changeSet.architectureHypothesis,
    boundaryStrategy: variant.changeSet.title,
    benefits: variant.changeSet.id.endsWith('separated') ? ['Clearer ownership, failure isolation and change boundaries.'] : ['Lower operating and interface overhead.'],
    tradeOffs: variant.changeSet.tradeOffs,
    risks: variant.changeSet.risks,
    hardConstraintFailures: [],
    evidenceStrength: variant.changeSet.evidenceStrength,
    operationIds: variant.changeSet.operationIds,
  }));
  for (const variant of variants) variant.changeSet.alternatives = alternatives.filter((item) => item.id !== variant.changeSet.id);
  return {
    obligations,
    operations: variants.flatMap((variant) => variant.operations),
    changeSets: variants.map((variant) => variant.changeSet),
    attentionQueue: buildAttentionQueue(project, obligations, targetStage),
  };
}
