import type {
  ArchitectureContextPackage,
  ArchitectureContextTarget,
  ArchitectureProject,
  CanonicalRequirementRecord,
  JourneyInteraction,
  JourneyParticipant,
  RequirementEvidenceReference,
  RequirementConflict,
  RequirementOpenQuestion,
  RequirementOrigin,
  RequirementRecordType,
  RequirementSourceKind,
  RequirementSourceRecord,
  RequirementStakeholder,
  RequirementsDistillationProposal,
  RequirementsHealthAssessment,
  RequirementsHealthGap,
  SolutionJourney,
} from '@aiw/domain';
import { applyArchitectureSemanticStaleness, buildArchitectureContextGraph, detectArchitectureSemanticChanges } from './architectureContextGraph.js';

export interface RequirementsSourceInput {
  id?: string;
  name: string;
  mediaType?: string;
  kind?: RequirementSourceKind;
  classification?: 'public'|'internal'|'confidential'|'restricted';
  text: string;
}

function hashText(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

function slug(value: string, fallback = 'record'): string {
  const result = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 58);
  return result || fallback;
}

function unique(items: string[], limit = 100): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))].slice(0, limit);
}

function clampScore(value: number): number { return Math.max(0, Math.min(100, Math.round(value))); }

function splitSections(text: string): Array<{ heading: string; text: string }> {
  const normalized = text.replace(/\r/g, '').trim();
  if (!normalized) return [];
  const lines = normalized.split('\n');
  const sections: Array<{ heading: string; lines: string[] }> = [];
  let current = { heading: 'Source content', lines: [] as string[] };
  const headingPattern = /^(?:#{1,6}\s+|\d+(?:\.\d+)*[.)]?\s+|[A-Z][A-Z0-9 /&()-]{4,80}$)/;
  for (const raw of lines) {
    const line = raw.trim();
    if (line && headingPattern.test(line) && line.length < 120) {
      if (current.lines.some(Boolean)) sections.push(current);
      current = { heading: line.replace(/^#{1,6}\s+/, '').replace(/^\d+(?:\.\d+)*[.)]?\s+/, '').trim(), lines: [] };
    } else current.lines.push(raw);
  }
  if (current.lines.some(Boolean)) sections.push(current);
  if (!sections.length) return [{ heading: 'Source content', text: normalized }];
  return sections.map((item) => ({ heading: item.heading, text: item.lines.join('\n').trim() })).filter((item) => item.text);
}

function sentences(text: string): string[] {
  return unique(text.replace(/\n+/g, '. ').split(/(?<=[.!?;])\s+|\s+[•*-]\s+/).map((item) => item.replace(/^[-*•\d.)\s]+/, '').trim()).filter((item) => item.length >= 12), 400);
}

function titleFor(statement: string): string {
  const words = statement.replace(/^(the|a|an)\s+/i, '').split(/\s+/).slice(0, 9).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1).replace(/[.,;:]$/, '');
}

function classifyRequirement(statement: string): RequirementRecordType {
  const text = statement.toLowerCase();
  if (/assum|expected|estimated|likely|initially/.test(text)) return 'assumption';
  if (/depend|relies on|prerequisite|provided by/.test(text)) return 'dependency';
  if (/constraint|must use|must not|cannot|deadline|budget|residen|jurisdiction|legacy|mandate|prohibit/.test(text)) return 'constraint';
  if (/security|privacy|encrypt|authoriz|authenticat|fraud|audit|threat|vulnerab/.test(text)) return 'security';
  if (/availability|latency|performance|throughput|scalab|recover|rto|rpo|resilien|maintainab|usability|accessibility/.test(text)) return 'quality';
  if (/data|record|information|retention|classification|consent|lineage|report/.test(text)) return 'data';
  if (/integrat|interface|api|event|message|external system|core banking|switch|provider/.test(text)) return 'integration';
  if (/monitor|support|operate|backup|restore|deploy|observab|alert|reconcile|settle/.test(text)) return 'operational';
  if (/rule|only when|not allowed|eligib|limit|policy/.test(text)) return 'business-rule';
  if (/objective|outcome|reduce|increase|improve|enable|grow|revenue|cost/.test(text)) return 'business';
  return 'functional';
}

function priorityFor(statement: string): CanonicalRequirementRecord['priority'] {
  const text = statement.toLowerCase();
  if (/critical|shall|must|no .* lost|regulat|mandatory|zero|never/.test(text)) return 'critical';
  if (/required|should|high priority|important/.test(text)) return 'high';
  if (/may|could|nice to have|optional/.test(text)) return 'low';
  return 'medium';
}

function qualityHints(statement: string): string[] {
  const text = statement.toLowerCase();
  const hints: string[] = [];
  const map: Array<[RegExp,string]> = [
    [/available|uptime|outage|continuity/, 'availability'], [/recover|rto|rpo|failover|backup/, 'recoverability'],
    [/latency|response time|fast|performance/, 'performance'], [/volume|scale|throughput|concurrent|peak/, 'scalability'],
    [/security|fraud|unauthor|credential|encrypt/, 'security'], [/privacy|personal data|consent/, 'privacy'],
    [/audit|trace|non.repudiation/, 'auditability'], [/maintain|change|modif|extensib/, 'modifiability'],
    [/integrat|interoperab|api|event/, 'interoperability'], [/monitor|observab|alert|telemetry/, 'observability'],
    [/accessib|usab|intuitive/, 'usability'],
  ];
  for (const [pattern, hint] of map) if (pattern.test(text)) hints.push(hint);
  return unique(hints, 6);
}

function ambiguityFlags(statement: string, type: RequirementRecordType): string[] {
  const flags: string[] = [];
  if (/\b(fast|quickly|seamless|robust|scalable|secure|user-friendly|efficient|real-time|highly available)\b/i.test(statement) && !/\b\d+(?:\.\d+)?\s*(?:ms|s|sec|seconds|minutes|%|tps|rps|users|hours|days)\b/i.test(statement)) flags.push('Unmeasured qualitative target');
  if (/\b(and|or)\b/i.test(statement) && statement.length > 150) flags.push('Potential compound requirement');
  if (!/\b(customer|user|agent|operator|system|service|team|administrator|auditor|regulator|platform|application)\b/i.test(statement) && type === 'functional') flags.push('Actor or responsible artifact is unclear');
  if (/\b(etc\.|and so on|as needed|where appropriate|if possible)\b/i.test(statement)) flags.push('Open-ended wording');
  return flags;
}

function acceptanceCriteria(statement: string, type: RequirementRecordType, flags: string[]): string[] {
  if (type === 'constraint') return [`The architecture review demonstrates that the constraint is satisfied or records an approved exception.`];
  if (type === 'quality') return flags.includes('Unmeasured qualitative target')
    ? ['A measurable response target and operating environment must be confirmed before approval.']
    : [`A repeatable test or evidence item verifies: ${statement}`];
  if (type === 'security') return ['The protected action is denied by default for an unauthorised actor and produces auditable evidence.', 'A security test demonstrates the control under the stated operating conditions.'];
  if (type === 'data') return ['Data ownership, classification, retention and permitted use are explicit and verifiable.'];
  if (type === 'integration') return ['The interaction has a named owner, contract, failure behaviour and compatibility policy.'];
  return [`Given an authorised actor and valid preconditions, when the requested capability is invoked, then the stated outcome is completed or a clearly classified failure is returned.`];
}

const stakeholderPatterns: Array<{ name: string; role: string; pattern: RegExp; concerns: string[] }> = [
  { name: 'Customer', role: 'End user', pattern: /\bcustomer|consumer|client\b/i, concerns: ['Successful and understandable service outcome','Privacy','Availability'] },
  { name: 'Agent', role: 'Service operator', pattern: /\bagent|field officer|merchant\b/i, concerns: ['Fast transaction completion','Liquidity or operational status','Clear exception handling'] },
  { name: 'Operations', role: 'Service operations', pattern: /\boperations|support|service desk|back office\b/i, concerns: ['Observability','Recoverability','Support procedures'] },
  { name: 'Compliance', role: 'Risk and compliance', pattern: /\bcompliance|regulator|regulatory|risk officer\b/i, concerns: ['Regulatory evidence','Auditability','Policy enforcement'] },
  { name: 'Security', role: 'Security authority', pattern: /\bsecurity|fraud|cyber|soc\b/i, concerns: ['Threat controls','Identity','Incident response'] },
  { name: 'Business Owner', role: 'Business sponsor', pattern: /\bbusiness owner|product owner|sponsor|executive\b/i, concerns: ['Business outcomes','Time to value','Cost and risk'] },
  { name: 'Administrator', role: 'Platform administrator', pattern: /\badministrator|admin user\b/i, concerns: ['Controlled configuration','Audit trail','Operational safety'] },
  { name: 'Auditor', role: 'Independent assurance', pattern: /\bauditor|audit team\b/i, concerns: ['Evidence lineage','Control effectiveness','Decision records'] },
];

function buildSources(inputs: RequirementsSourceInput[]): { sources: RequirementSourceRecord[]; evidence: RequirementEvidenceReference[] } {
  const now = new Date().toISOString();
  const sources: RequirementSourceRecord[] = [];
  const evidence: RequirementEvidenceReference[] = [];
  inputs.forEach((input, sourceIndex) => {
    const clean = input.text.replace(/\u0000/g, '').trim().slice(0, 400000);
    const id = input.id || `source-${sourceIndex + 1}-${slug(input.name)}`;
    const sections = splitSections(clean).map((section, index) => ({ id: `${id}-section-${index + 1}`, heading: section.heading, order: index + 1, text: section.text, excerpt: section.text.slice(0, 320) }));
    const warnings: string[] = [];
    if (clean.length < 80) warnings.push('Source is very short; Sol will need clarification to produce a complete specification.');
    if (!sections.length) warnings.push('No extractable content was found.');
    sources.push({ id, name: input.name, mediaType: input.mediaType ?? 'text/plain', kind: input.kind ?? 'paste', classification: input.classification ?? 'internal', version: 1, status: sections.length ? 'extracted' : 'needs-attention', contentHash: hashText(clean), characterCount: clean.length, excerpt: clean.slice(0, 420), sections, warnings, addedAt: now });
    for (const section of sections) evidence.push({ id: `evidence-${section.id}`, sourceId: id, sectionId: section.id, excerpt: section.excerpt, locator: `${input.name} · ${section.heading}` });
  });
  return { sources, evidence };
}

function buildRequirements(project: ArchitectureProject, sources: RequirementSourceRecord[], evidence: RequirementEvidenceReference[]): CanonicalRequirementRecord[] {
  const now = new Date().toISOString();
  const candidates: Array<{ statement: string; origin: RequirementOrigin; evidenceRefs: string[]; forcedType?: RequirementRecordType }> = [];
  for (const source of sources) for (const section of source.sections) {
    const ref = evidence.find((item) => item.sectionId === section.id)?.id;
    for (const sentence of sentences(section.text)) {
      if (/\b(must|shall|should|need(?:s)? to|require(?:s|d)?|allow(?:s)?|enable(?:s)?|support(?:s)?|provide(?:s)?|process(?:es)?|prevent(?:s)?|ensure(?:s)?|integrat(?:e|es)|monitor(?:s)?|retain(?:s)?|recover(?:s)?)\b/i.test(sentence)) {
        candidates.push({ statement: sentence.slice(0, 1200), origin: 'source-derived', evidenceRefs: ref ? [ref] : [] });
      }
    }
  }
  project.objectives.forEach((statement, index) => candidates.push({ statement, origin: 'user-entered', evidenceRefs: [`project:objective:${index}`], forcedType: 'business' }));
  project.constraints.forEach((statement, index) => candidates.push({ statement, origin: 'user-entered', evidenceRefs: [`project:constraint:${index}`], forcedType: 'constraint' }));
  project.assumptions.forEach((statement, index) => candidates.push({ statement, origin: 'user-entered', evidenceRefs: [`project:assumption:${index}`], forcedType: 'assumption' }));
  if (project.description.trim()) candidates.unshift({ statement: project.description.trim(), origin: 'user-entered', evidenceRefs: ['project:description'], forcedType: 'business' });
  const deduped = candidates.filter((item, index, all) => all.findIndex((candidate) => candidate.statement.toLowerCase().replace(/[^a-z0-9]/g, '') === item.statement.toLowerCase().replace(/[^a-z0-9]/g, '')) === index).slice(0, 160);
  return deduped.map((candidate, index) => {
    const type = candidate.forcedType ?? classifyRequirement(candidate.statement);
    const flags = ambiguityFlags(candidate.statement, type);
    return {
      id: `REQ-${String(index + 1).padStart(3, '0')}`,
      title: titleFor(candidate.statement), statement: candidate.statement, type, priority: priorityFor(candidate.statement), origin: candidate.origin,
      status: flags.length ? 'needs-clarification' : 'candidate', confidence: candidate.origin === 'source-derived' ? 0.86 : 0.98,
      evidenceRefs: candidate.evidenceRefs, stakeholderRefs: [], journeyRefs: [], acceptanceCriteria: acceptanceCriteria(candidate.statement, type, flags),
      qualityAttributeHints: qualityHints(candidate.statement), tags: [], ambiguityFlags: flags,
      rationale: candidate.origin === 'source-derived' ? 'Distilled from supplied project evidence.' : 'Captured directly in the existing project brief.',
      createdAt: now, updatedAt: now,
    };
  });
}

function buildStakeholders(project: ArchitectureProject, sources: RequirementSourceRecord[], evidence: RequirementEvidenceReference[]): RequirementStakeholder[] {
  const allText = [project.description, ...(project.context.stakeholders ?? []), ...sources.flatMap((source) => source.sections.map((section) => section.text))].join('\n');
  const records: RequirementStakeholder[] = [];
  for (const candidate of stakeholderPatterns) if (candidate.pattern.test(allText)) {
    const evidenceRefs = evidence.filter((item) => candidate.pattern.test(item.excerpt)).slice(0, 4).map((item) => item.id);
    records.push({ id: `STK-${String(records.length + 1).padStart(3, '0')}`, name: candidate.name, role: candidate.role, concerns: candidate.concerns, decisionRights: [], origin: evidenceRefs.length ? 'source-derived' : 'knowledge-suggested', evidenceRefs, status: 'candidate' });
  }
  for (const raw of project.context.stakeholders ?? []) if (!records.some((item) => raw.toLowerCase().includes(item.name.toLowerCase()))) {
    records.push({ id: `STK-${String(records.length + 1).padStart(3, '0')}`, name: raw.slice(0, 120), role: 'Project stakeholder', concerns: [], decisionRights: [], origin: 'user-entered', evidenceRefs: [], status: 'candidate' });
  }
  if (!records.length) records.push({ id: 'STK-001', name: 'Business Owner', role: 'Accountable sponsor', concerns: ['Business outcome','Scope','Risk'], decisionRights: ['Approve solution intent and priority'], origin: 'knowledge-suggested', evidenceRefs: [], status: 'needs-clarification' });
  return records.slice(0, 24);
}

const journeyTemplates: Array<{ name: string; pattern: RegExp; goal: string; obligations: string[] }> = [
  { name: 'Assisted service request', pattern: /customer request|service request|case handling|agent approval|human approval/i, goal: 'Resolve a customer request through a governed human-assisted journey', obligations: ['Bounded recommendation authority','Human approval or escalation','Audit and deterministic fallback'] },
  { name: 'Customer onboarding', pattern: /onboard|registration|register customer|open account|kyc/i, goal: 'Create and validate a customer relationship', obligations: ['Identity verification','Consent and data classification','Duplicate and exception handling'] },
  { name: 'Agent onboarding and approval', pattern: /agent onboarding|register agent|approve agent|agent management/i, goal: 'Approve an authorised service agent', obligations: ['Maker-checker approval','Identity and credential lifecycle','Audit evidence'] },
  { name: 'Cash deposit', pattern: /cash.?in|cash deposit|deposit transaction/i, goal: 'Accept cash and credit the intended account', obligations: ['Transaction idempotency','Ledger consistency','Receipt and audit evidence'] },
  { name: 'Cash withdrawal', pattern: /cash.?out|withdrawal|withdraw cash/i, goal: 'Authorise and complete a cash withdrawal', obligations: ['Balance and limit checks','Fraud controls','Reversal and dispute handling'] },
  { name: 'Funds transfer', pattern: /funds? transfer|transfer transaction|send money/i, goal: 'Move value between accounts with a definitive outcome', obligations: ['Idempotency','Timeout and status enquiry','Reconciliation and reversal'] },
  { name: 'Transaction reversal', pattern: /reversal|reverse transaction|compensat/i, goal: 'Restore a consistent financial position after failure', obligations: ['Original-transaction correlation','Compensation rules','Audit and customer notification'] },
  { name: 'Settlement and reconciliation', pattern: /settlement|reconcil/i, goal: 'Prove transaction and financial consistency across parties', obligations: ['Immutable evidence','Exception workflow','Cut-off and retry policy'] },
  { name: 'Dispute resolution', pattern: /dispute|complaint|chargeback/i, goal: 'Investigate and resolve a disputed outcome', obligations: ['Case ownership','Evidence preservation','SLA and escalation'] },
  { name: 'Service outage and recovery', pattern: /outage|recovery|failover|degraded operation/i, goal: 'Maintain or restore critical service safely', obligations: ['Failure detection','Degraded-mode policy','Recovery verification'] },
];

function genericJourneyName(requirement: CanonicalRequirementRecord): string {
  const title = requirement.title.replace(/^(The system|System|Users?|Customers?)\s+/i, '');
  return title.length > 70 ? `${title.slice(0, 67)}…` : title;
}

function makeJourney(template: { name: string; goal: string; obligations: string[] }, index: number, matchingRequirements: CanonicalRequirementRecord[], stakeholders: RequirementStakeholder[], existingSystems: string[]): SolutionJourney {
  const now = new Date().toISOString();
  const actor = stakeholders.find((item) => /customer|agent|user|operator/i.test(`${item.name} ${item.role}`)) ?? stakeholders[0]!;
  const participants: JourneyParticipant[] = [
    { id: `J${index + 1}-P1`, name: actor.name, kind: 'human', description: actor.role, stakeholderRef: actor.id },
    { id: `J${index + 1}-P2`, name: 'System of Interest', kind: 'system-of-interest', description: 'The solution boundary being designed.' },
  ];
  if (existingSystems.length) participants.push({ id: `J${index + 1}-P3`, name: existingSystems[0]!.slice(0, 100), kind: 'external-system', description: 'Existing or external dependency identified in the requirements.' });
  const refs = matchingRequirements.map((item) => item.id);
  const interactions: JourneyInteraction[] = [
    { id: `J${index + 1}-I1`, sequence: 1, fromParticipantId: participants[0]!.id, toParticipantId: participants[1]!.id, label: `Initiate ${template.name.toLowerCase()}`, interactionKind: 'command', requirementRefs: refs, qualityRefs: matchingRequirements.flatMap((item) => item.qualityAttributeHints), dataObjects: [], trustBoundaryCrossing: true, status: 'candidate' },
    { id: `J${index + 1}-I2`, sequence: 2, fromParticipantId: participants[1]!.id, toParticipantId: participants[1]!.id, label: 'Validate identity, rules, limits and request integrity', interactionKind: 'command', requirementRefs: refs, qualityRefs: ['security','auditability'], dataObjects: [], trustBoundaryCrossing: false, failureBehaviour: 'Return a classified rejection without partial completion.', status: 'candidate' },
  ];
  if (participants[2]) interactions.push({ id: `J${index + 1}-I3`, sequence: 3, fromParticipantId: participants[1]!.id, toParticipantId: participants[2].id, label: 'Request external decision or record update', interactionKind: 'command', requirementRefs: refs, qualityRefs: ['availability','interoperability'], dataObjects: [], trustBoundaryCrossing: true, failureBehaviour: 'Preserve a recoverable state and expose definitive status.', status: 'candidate' });
  interactions.push({ id: `J${index + 1}-I4`, sequence: 4, fromParticipantId: participants[1]!.id, toParticipantId: participants[0]!.id, label: 'Return outcome, reference and next action', interactionKind: 'notification', requirementRefs: refs, qualityRefs: ['usability','auditability'], dataObjects: [], trustBoundaryCrossing: true, status: 'candidate' });
  const failure = interactions.map((item) => ({ ...item, id: `${item.id}-F`, label: item.sequence === 3 ? 'Dependency fails or returns an indeterminate outcome' : item.label, status: 'candidate' as const })).concat({ id: `J${index + 1}-IF`, sequence: 5, fromParticipantId: participants[1]!.id, toParticipantId: participants[0]!.id, label: 'Communicate recoverable failure and preserve correlation reference', interactionKind: 'notification', requirementRefs: refs, qualityRefs: ['availability','recoverability'], dataObjects: [], trustBoundaryCrossing: true, failureBehaviour: 'No silent success and no duplicate completion.', status: 'candidate' });
  return {
    id: `JNY-${String(index + 1).padStart(3, '0')}`, name: template.name, goal: template.goal, description: `End-to-end interaction model for ${template.name.toLowerCase()}.`, priority: matchingRequirements.some((item) => item.priority === 'critical') ? 'critical' : 'high', origin: 'deterministically-derived', status: 'candidate', actorRefs: [actor.id], requirementRefs: refs, participants,
    paths: [
      { id: `JNY-${index + 1}-HAPPY`, kind: 'happy', name: 'Happy path', description: 'Expected successful outcome.', interactions },
      { id: `JNY-${index + 1}-FAIL`, kind: 'failure', name: 'Failure and recoverability path', description: 'Dependency failure or indeterminate outcome.', interactions: failure },
    ], qualityHotspots: unique(matchingRequirements.flatMap((item) => item.qualityAttributeHints), 8), architectureObligations: template.obligations, createdAt: now, updatedAt: now,
  };
}

function buildJourneys(project: ArchitectureProject, requirements: CanonicalRequirementRecord[], stakeholders: RequirementStakeholder[], sources: RequirementSourceRecord[]): SolutionJourney[] {
  const text = [project.description, ...requirements.map((item) => item.statement), ...sources.map((item) => item.excerpt)].join('\n');
  const journeys: SolutionJourney[] = [];
  for (const template of journeyTemplates) if (template.pattern.test(text)) {
    const matching = requirements.filter((item) => template.pattern.test(item.statement));
    journeys.push(makeJourney(template, journeys.length, matching.length ? matching : requirements.slice(0, 3), stakeholders, project.context.existingSystems ?? []));
  }
  const functional = requirements.filter((item) => item.type === 'functional' && !journeys.some((journey) => journey.requirementRefs.includes(item.id))).slice(0, Math.max(0, 8 - journeys.length));
  for (const requirement of functional) journeys.push(makeJourney({ name: genericJourneyName(requirement), goal: requirement.statement, obligations: ['Explicit responsibility ownership','Defined failure behaviour','Traceable interface contract'] }, journeys.length, [requirement], stakeholders, project.context.existingSystems ?? []));
  return journeys.slice(0, 12);
}


function normalizedTokens(value: string): string[] {
  return unique(value.toLowerCase().replace(/[^a-z0-9.%/: _-]+/g, ' ').split(/\s+/).filter((item) => item.length > 2), 160);
}

function similarity(left: string, right: string): number {
  const a = new Set(normalizedTokens(left));
  const b = new Set(normalizedTokens(right));
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const token of a) if (b.has(token)) common += 1;
  return common / Math.max(a.size, b.size);
}

function modality(value: string): 'must'|'must-not'|'should'|'may'|'unknown' {
  if (/\b(?:must not|shall not|may not|prohibited|forbidden|cannot|never)\b/i.test(value)) return 'must-not';
  if (/\b(?:must|shall|required|is required to)\b/i.test(value)) return 'must';
  if (/\b(?:should|expected to)\b/i.test(value)) return 'should';
  if (/\b(?:may|can|optional|permitted)\b/i.test(value)) return 'may';
  return 'unknown';
}

interface NormalizedMeasurement { raw: string; value: number; unit: string; dimension: string; canonical: number; }
function measurements(value: string): NormalizedMeasurement[] {
  const result: NormalizedMeasurement[] = [];
  const expression = /\b(\d+(?:\.\d+)?)\s*(%|milliseconds?|ms|seconds?|s|minutes?|min|hours?|h|days?|tps|rps|requests?\/s|transactions?\/s|users?|transactions?)(?=$|\s|[.,;:)])/gi;
  for (const match of value.matchAll(expression)) {
    const amount = Number(match[1]);
    const unit = String(match[2]).toLowerCase();
    let dimension = unit;
    let canonical = amount;
    if (['millisecond','milliseconds','ms'].includes(unit)) { dimension = 'duration-ms'; canonical = amount; }
    else if (['second','seconds','s'].includes(unit)) { dimension = 'duration-ms'; canonical = amount * 1000; }
    else if (['minute','minutes','min'].includes(unit)) { dimension = 'duration-ms'; canonical = amount * 60000; }
    else if (['hour','hours','h'].includes(unit)) { dimension = 'duration-ms'; canonical = amount * 3600000; }
    else if (['day','days'].includes(unit)) { dimension = 'duration-ms'; canonical = amount * 86400000; }
    else if (unit === '%') dimension = 'percentage';
    else if (['tps','rps','request/s','requests/s','transaction/s','transactions/s'].includes(unit)) dimension = 'throughput-per-second';
    else if (unit.startsWith('user')) dimension = 'users';
    else if (unit.startsWith('transaction')) dimension = 'transactions';
    result.push({ raw: match[0], value: amount, unit, dimension, canonical });
  }
  return result;
}

function tagValues(record: CanonicalRequirementRecord, prefix: string): string[] {
  return record.tags.filter((item) => item.toLowerCase().startsWith(`${prefix.toLowerCase()}:`)).map((item) => item.slice(prefix.length + 1).trim()).filter(Boolean);
}

const authorityRank: Record<string, number> = { law: 100, regulation: 90, 'regulatory-guidance': 80, policy: 70, standard: 60, contract: 55, architecture: 40, requirement: 30, note: 10 };
function authority(record: CanonicalRequirementRecord): string {
  const tagged = tagValues(record, 'authority')[0]?.toLowerCase();
  return tagged ?? (record.type === 'security' ? 'regulation' : 'requirement');
}

function normalizedSubject(record: CanonicalRequirementRecord): string {
  const explicit = tagValues(record,'subject')[0];
  if (explicit) return explicit.toLowerCase();
  return normalizedTokens(`${record.title} ${record.statement}`).slice(0, 12).join(' ');
}

function conflictSeverity(left: CanonicalRequirementRecord, right: CanonicalRequirementRecord): RequirementConflict['severity'] {
  return left.priority === 'critical' || right.priority === 'critical' ? 'critical' : left.priority === 'high' || right.priority === 'high' ? 'high' : 'medium';
}

function dates(record: CanonicalRequirementRecord): string[] { return [...tagValues(record,'effective'), ...tagValues(record,'expires')]; }
function jurisdictions(record: CanonicalRequirementRecord): string[] { return tagValues(record,'jurisdiction'); }

export function analyseRequirementContradictionsAdvanced(requirements: CanonicalRequirementRecord[]): RequirementConflict[] {
  const conflicts: RequirementConflict[] = [];
  const add = (conflict: RequirementConflict) => {
    if (!conflicts.some((item) => item.kind === conflict.kind && item.leftRef === conflict.leftRef && item.rightRef === conflict.rightRef)) conflicts.push(conflict);
  };
  for (let leftIndex = 0; leftIndex < requirements.length; leftIndex += 1) {
    const left = requirements[leftIndex];
    if (!left || left.status === 'rejected') continue;
    for (let rightIndex = leftIndex + 1; rightIndex < requirements.length; rightIndex += 1) {
      const right = requirements[rightIndex];
      if (!right || right.status === 'rejected') continue;
      const leftText = `${left.title} ${left.statement}`;
      const rightText = `${right.title} ${right.statement}`;
      const score = similarity(leftText, rightText);
      const leftModality = modality(left.statement);
      const rightModality = modality(right.statement);
      const leftMeasures = measurements(left.statement);
      const rightMeasures = measurements(right.statement);
      const leftJurisdictions = jurisdictions(left);
      const rightJurisdictions = jurisdictions(right);
      const sharedJurisdiction = !leftJurisdictions.length || !rightJurisdictions.length || leftJurisdictions.some((item) => rightJurisdictions.includes(item));
      const analysisBase = { normalizedSubject: normalizedSubject(left), leftModality, rightModality, leftMeasurements: leftMeasures.map((item) => item.raw), rightMeasurements: rightMeasures.map((item) => item.raw), jurisdictions: unique([...leftJurisdictions, ...rightJurisdictions]), effectiveDates: unique([...dates(left), ...dates(right)]), sourceAuthorities: [authority(left), authority(right)], autoResolutionAllowed: false };
      if (score >= 0.88) add({ id: `CONFLICT-DUP-${hashText(`${left.id}|${right.id}`)}`, kind: 'duplicate', leftRef: left.id, rightRef: right.id, severity: 'medium', summary: `Potential duplicate requirements: ${left.title} / ${right.title}`, rationale: `The statements share ${Math.round(score * 100)}% of their significant vocabulary. Consolidation requires preserving both provenance chains.`, status: 'open', analysis: analysisBase });
      if (score >= 0.40 && sharedJurisdiction && ((leftModality === 'must' && rightModality === 'must-not') || (leftModality === 'must-not' && rightModality === 'must'))) add({ id: `CONFLICT-DEONTIC-${hashText(`${left.id}|${right.id}`)}`, kind: 'contradiction', leftRef: left.id, rightRef: right.id, severity: conflictSeverity(left,right), summary: `Normative contradiction: ${left.title} / ${right.title}`, rationale: 'The requirements address overlapping behaviour but impose opposing mandatory modalities. The engine will not choose between them.', status: 'open', analysis: analysisBase });
      const comparable = leftMeasures.flatMap((a) => rightMeasures.filter((b) => a.dimension === b.dimension).map((b) => ({a,b})));
      const unequal = comparable.filter(({ a, b }) => {
        const difference = Math.abs(a.canonical - b.canonical);
        if (a.dimension === 'percentage') return difference > 0.0001;
        return difference > Math.max(0.0001, Math.min(Math.abs(a.canonical), Math.abs(b.canonical)) * 0.01);
      });
      if (score >= 0.30 && unequal.length) add({ id: `CONFLICT-NUM-${hashText(`${left.id}|${right.id}`)}`, kind: 'numeric-target', leftRef: left.id, rightRef: right.id, severity: conflictSeverity(left,right), summary: `Conflicting measurable targets may exist: ${left.title} / ${right.title}`, rationale: `Comparable measurements differ after unit normalization (${unequal.map(({a,b}) => `${a.raw} vs ${b.raw}`).join('; ')}). Environment, percentile, load and period must be reconciled before disposition.`, status: 'open', analysis: analysisBase });
      const leftScope = tagValues(left,'scope'); const rightScope = tagValues(right,'scope');
      if (score >= 0.38 && leftScope.length && rightScope.length && !leftScope.some((item) => rightScope.includes(item))) add({ id: `CONFLICT-SCOPE-${hashText(`${left.id}|${right.id}`)}`, kind: 'scope', leftRef: left.id, rightRef: right.id, severity: 'medium', summary: `Apparent conflict may be scope-specific: ${left.title} / ${right.title}`, rationale: `The requirements apply to different declared scopes (${leftScope.join(', ')} versus ${rightScope.join(', ')}). They must be qualified rather than silently merged.`, status: 'open', analysis: analysisBase });
      const leftAuthority = authority(left); const rightAuthority = authority(right);
      if (score >= 0.35 && leftModality !== rightModality && authorityRank[leftAuthority] !== authorityRank[rightAuthority]) add({ id: `CONFLICT-POLICY-${hashText(`${left.id}|${right.id}`)}`, kind: 'policy-hierarchy', leftRef: left.id, rightRef: right.id, severity: conflictSeverity(left,right), summary: `Policy hierarchy conflict: ${left.title} / ${right.title}`, rationale: `${leftAuthority} and ${rightAuthority} carry different authority levels. Higher authority is not automatically applied until applicability, jurisdiction and effective dates are confirmed.`, status: 'open', analysis: { ...analysisBase, policyPrecedence: [leftAuthority,rightAuthority].sort((a,b) => (authorityRank[b]??0)-(authorityRank[a]??0)), legalReviewRequired: ['law','regulation','regulatory-guidance','contract'].includes(leftAuthority) || ['law','regulation','regulatory-guidance','contract'].includes(rightAuthority) } });
      if (score >= 0.30 && (leftJurisdictions.length || rightJurisdictions.length) && !sharedJurisdiction) add({ id: `CONFLICT-LEGAL-${hashText(`${left.id}|${right.id}`)}`, kind: 'legal-review', leftRef: left.id, rightRef: right.id, severity: 'high', summary: `Cross-jurisdiction legal interpretation required: ${left.title} / ${right.title}`, rationale: `The records reference different jurisdictions (${leftJurisdictions.join(', ') || 'unspecified'} versus ${rightJurisdictions.join(', ') || 'unspecified'}). AIW may surface the issue but cannot make the legal determination.`, status: 'open', analysis: { ...analysisBase, legalReviewRequired: true, autoResolutionAllowed: false } });
      if (score >= 0.36 && dates(left).length && dates(right).length && dates(left).join('|') !== dates(right).join('|')) add({ id: `CONFLICT-TEMPORAL-${hashText(`${left.id}|${right.id}`)}`, kind: 'temporal', leftRef: left.id, rightRef: right.id, severity: 'medium', summary: `Temporal or supersession conflict: ${left.title} / ${right.title}`, rationale: `The requirements have different effective or expiry metadata (${dates(left).join(', ')} versus ${dates(right).join(', ')}). The active version must be established explicitly.`, status: 'open', analysis: analysisBase });
    }
  }
  return conflicts.sort((a,b) => ({critical:4,high:3,medium:2,low:1}[b.severity]-({critical:4,high:3,medium:2,low:1}[a.severity]))).slice(0, 200);
}

export function detectRequirementConflicts(requirements: CanonicalRequirementRecord[]): RequirementConflict[] {
  return analyseRequirementContradictionsAdvanced(requirements);
}

function buildOpenQuestions(project: ArchitectureProject, requirements: CanonicalRequirementRecord[], stakeholders: RequirementStakeholder[], journeys: SolutionJourney[]): RequirementOpenQuestion[] {
  const questions: RequirementOpenQuestion[] = [];
  const add = (question: string, whyItMatters: string, impact: RequirementOpenQuestion['impact'], refs: string[] = [], journeyRefs: string[] = []) => questions.push({ id: `Q-${String(questions.length + 1).padStart(3, '0')}`, question, whyItMatters, impact, relatedRequirementRefs: refs, relatedJourneyRefs: journeyRefs, status: 'open' });
  if (!stakeholders.some((item) => /business owner|sponsor/i.test(`${item.name} ${item.role}`))) add('Who is accountable for approving the solution intent, priorities and scope?', 'Architecture trade-offs require an accountable decision owner.', 'critical');
  const unmeasured = requirements.filter((item) => item.ambiguityFlags.includes('Unmeasured qualitative target'));
  if (unmeasured.length) add('What measurable latency, throughput, availability and recovery targets apply to the critical journeys?', 'Unmeasured quality language cannot drive tactics or be validated.', 'critical', unmeasured.map((item) => item.id), journeys.filter((item) => item.priority === 'critical').map((item) => item.id));
  if (!(project.context.regulatoryJurisdictions?.length)) add('Which jurisdictions, regulatory obligations and data-residency rules apply?', 'Regulatory scope changes data, security, deployment and evidence obligations.', 'high');
  if (!(project.context.existingSystems?.length)) add('Which existing and external systems participate in the solution journeys?', 'System Context and interface completeness depend on the external estate.', 'high');
  if (!project.context.workloadProfile) add('What are the current, peak and forecast volumes for each critical journey?', 'Capacity, performance and scaling decisions require a workload envelope.', 'high');
  if (!project.context.recoveryObjectives) add('What RTO, RPO and permitted degraded-mode behaviour apply?', 'Recovery topology and data-durability choices cannot be justified without these values.', 'critical');
  return questions.slice(0, 20);
}

function assessHealth(requirements: CanonicalRequirementRecord[], stakeholders: RequirementStakeholder[], journeys: SolutionJourney[], questions: RequirementOpenQuestion[], conflicts: RequirementConflict[] = []): RequirementsHealthAssessment {
  const gaps: RequirementsHealthGap[] = [];
  const add = (dimension: RequirementsHealthGap['dimension'], severity: RequirementsHealthGap['severity'], title: string, detail: string, relatedRefs: string[], recommendedAction: string) => gaps.push({ id: `GAP-${String(gaps.length + 1).padStart(3, '0')}`, dimension, severity, title, detail, relatedRefs, recommendedAction });
  const acceptedOrCandidate = requirements.filter((item) => item.status !== 'rejected');
  const evidenceCount = acceptedOrCandidate.filter((item) => item.evidenceRefs.length).length;
  const clearCount = acceptedOrCandidate.filter((item) => item.ambiguityFlags.length === 0).length;
  const testableCount = acceptedOrCandidate.filter((item) => item.acceptanceCriteria.length && !item.acceptanceCriteria.some((criterion) => /must be confirmed/i.test(criterion))).length;
  const journeyLinked = new Set(journeys.flatMap((item) => item.requirementRefs));
  const journeyEligible = acceptedOrCandidate.filter((item) => ['functional','business-rule','integration','operational','security'].includes(item.type));
  const criticalQuestions = questions.filter((item) => item.status === 'open' && item.impact === 'critical');
  if (acceptedOrCandidate.length < 8) add('completeness','high','Requirements coverage is sparse',`${acceptedOrCandidate.length} requirement records were distilled; architecture-significant concerns may be missing.`,acceptedOrCandidate.map((item) => item.id),'Add source material or complete a guided Sol elicitation.');
  const ambiguous = acceptedOrCandidate.filter((item) => item.ambiguityFlags.length);
  if (ambiguous.length) add('clarity','high','Ambiguous or compound requirements remain',`${ambiguous.length} requirement(s) need measurable wording, actor clarity or decomposition.`,ambiguous.map((item) => item.id),'Use Sol Improve to rewrite and confirm the affected requirements.');
  if (testableCount < acceptedOrCandidate.length) add('testability','high','Acceptance evidence is incomplete','Some requirements cannot yet be verified through a measurable test or evidence item.',acceptedOrCandidate.filter((item) => !item.acceptanceCriteria.length || item.acceptanceCriteria.some((criterion) => /must be confirmed/i.test(criterion))).map((item) => item.id),'Confirm missing measures and acceptance criteria.');
  if (journeyEligible.some((item) => !journeyLinked.has(item.id))) add('journey-coverage','medium','Some behavioural requirements are not represented in a journey','The logical design may omit responsibilities or interactions that only exist in prose.',journeyEligible.filter((item) => !journeyLinked.has(item.id)).map((item) => item.id),'Create or extend journeys before System Context handoff.');
  if (criticalQuestions.length) add('architecture-significance','critical','Critical architecture questions are unresolved',`${criticalQuestions.length} critical question(s) affect quality tactics, topology or assurance.`,criticalQuestions.map((item) => item.id),'Resolve or explicitly defer each critical question before approval.');
  const openConflicts = conflicts.filter((item) => item.status === 'open');
  if (openConflicts.length) add('contradiction', openConflicts.some((item) => item.severity === 'critical') ? 'critical' : 'high', 'Conflicting or duplicate requirements need adjudication', `${openConflicts.length} conflict candidate(s) must be resolved before the affected records become authoritative.`, openConflicts.flatMap((item) => [item.leftRef, item.rightRef]), 'Open the reconciliation queue, compare the cited evidence and record an explicit disposition.');
  return {
    completeness: clampScore(Math.min(100, acceptedOrCandidate.length * 7 + Math.min(stakeholders.length, 5) * 4 + Math.min(journeys.length, 6) * 5)),
    clarity: clampScore(acceptedOrCandidate.length ? (clearCount / acceptedOrCandidate.length) * 100 : 0),
    testability: clampScore(acceptedOrCandidate.length ? (testableCount / acceptedOrCandidate.length) * 100 : 0),
    traceability: clampScore(acceptedOrCandidate.length ? (evidenceCount / acceptedOrCandidate.length) * 100 : 0),
    journeyCoverage: clampScore(journeyEligible.length ? (journeyEligible.filter((item) => journeyLinked.has(item.id)).length / journeyEligible.length) * 100 : journeys.length ? 100 : 0),
    stakeholderCoverage: clampScore(Math.min(100, stakeholders.length * 18)), contradictionCount: conflicts.filter((item) => item.status === 'open').length, openCriticalQuestions: criticalQuestions.length, assessedAt: new Date().toISOString(), gaps,
  };
}

function buildContextPackages(project: ArchitectureProject, requirements: CanonicalRequirementRecord[], stakeholders: RequirementStakeholder[], journeys: SolutionJourney[], questions: RequirementOpenQuestion[], sources: RequirementSourceRecord[]): ArchitectureContextPackage[] {
  const targets: ArchitectureContextTarget[] = ['qualityDrivers','systemContext','logicalApplication','applicationRealization','logicalTechnology','physicalTechnology','reviewAssurance','sddPack'];
  const active = requirements.filter((item) => item.status !== 'rejected');
  const critical = active.filter((item) => item.priority === 'critical' || item.priority === 'high');
  const sourceRefs = sources.map((item) => item.id);
  return targets.map((target, index) => {
    const requirementRefs = target === 'qualityDrivers' ? active.filter((item) => item.qualityAttributeHints.length || ['quality','security','operational'].includes(item.type)).map((item) => item.id) : target === 'systemContext' ? active.filter((item) => ['business','functional','integration','security','data'].includes(item.type)).map((item) => item.id) : critical.map((item) => item.id);
    const obligations = unique([
      ...journeys.flatMap((item) => item.architectureObligations),
      ...(target === 'qualityDrivers' ? ['Convert qualitative concerns into measurable six-part quality scenarios.'] : []),
      ...(target === 'systemContext' ? ['Represent every actor, external dependency and critical journey interaction inside or across the system boundary.'] : []),
      ...(target === 'logicalApplication' ? ['Derive explicit responsibilities, business rules, data ownership and interaction boundaries from approved journey steps.'] : []),
      ...(target === 'applicationRealization' ? ['Realise responsibilities as deployable units and named API/event contracts while preserving journey lineage.'] : []),
      ...(target === 'logicalTechnology' ? ['Select provider-neutral capabilities only where an application or quality obligation requires them.'] : []),
      ...(target === 'physicalTechnology' ? ['Bind capabilities to approved products and failure domains without inventing recovery or capacity targets.'] : []),
    ], 20);
    const summary = `${target} context compiled from ${requirementRefs.length} relevant requirement(s), ${journeys.length} journey(s), ${stakeholders.length} stakeholder(s) and ${sources.length} source(s).`;
    return { id: `CTX-${target}`, target, version: 1, projectRevision: project.revision, compiledAt: new Date().toISOString(), contextFingerprint: hashText(JSON.stringify({ target, requirementRefs, journeys: journeys.map((item) => item.id), projectRevision: project.revision })), summary, requirementRefs, stakeholderRefs: stakeholders.map((item) => item.id), journeyRefs: journeys.map((item) => item.id), qualityDriverHints: unique(active.flatMap((item) => item.qualityAttributeHints), 16), architectureObligations: obligations, unresolvedQuestionRefs: questions.filter((item) => item.status === 'open').map((item) => item.id), sourceRefs };
  });
}

export function distillRequirementsDeterministically(input: { project: ArchitectureProject; sources: RequirementsSourceInput[]; knowledgeReleaseId?: string }): RequirementsDistillationProposal {
  const prepared = buildSources(input.sources);
  const requirements = buildRequirements(input.project, prepared.sources, prepared.evidence);
  const stakeholders = buildStakeholders(input.project, prepared.sources, prepared.evidence);
  const journeys = buildJourneys(input.project, requirements, stakeholders, prepared.sources);
  const journeyMap = new Map<string,string[]>();
  for (const journey of journeys) for (const ref of journey.requirementRefs) journeyMap.set(ref, [...(journeyMap.get(ref) ?? []), journey.id]);
  const stakeholderRefs = stakeholders.map((item) => item.id);
  for (const requirement of requirements) {
    requirement.journeyRefs = journeyMap.get(requirement.id) ?? [];
    const relevant = stakeholders.filter((item) => new RegExp(item.name.split(/\s+/)[0]!, 'i').test(requirement.statement)).map((item) => item.id);
    requirement.stakeholderRefs = relevant.length ? relevant : stakeholderRefs.slice(0, 2);
  }
  const conflicts = detectRequirementConflicts(requirements);
  const conflictQuestions: RequirementOpenQuestion[] = conflicts.filter((item) => item.status === 'open' && (item.severity === 'critical' || item.severity === 'high')).map((item) => ({ id: `QUESTION-${item.id}`, question: `How should the conflict between ${item.leftRef} and ${item.rightRef} be dispositioned?`, whyItMatters: item.rationale, impact: item.severity === 'critical' ? 'critical' : 'high', relatedRequirementRefs: [item.leftRef, item.rightRef], relatedJourneyRefs: [], status: 'open' }));
  const openQuestions = [...buildOpenQuestions(input.project, requirements, stakeholders, journeys), ...conflictQuestions];
  const health = assessHealth(requirements, stakeholders, journeys, openQuestions, conflicts);
  const contextPackages = buildContextPackages(input.project, requirements, stakeholders, journeys, openQuestions, prepared.sources);
  const contextGraph = buildArchitectureContextGraph({ project: input.project, sources: prepared.sources, evidence: prepared.evidence, requirements, stakeholders, journeys, openQuestions, contextPackages });
  return {
    schemaVersion: '1.0', mode: 'deterministic', generatedAt: new Date().toISOString(), projectRevision: input.project.revision,
    sourceRecords: prepared.sources, evidence: prepared.evidence, requirements, stakeholders, journeys, openQuestions, health, contextPackages, contextGraph, conflicts,
    summary: `Sol distilled ${requirements.length} requirement(s), ${stakeholders.length} stakeholder(s), ${journeys.length} major journey(s) and ${openQuestions.length} clarification question(s) from ${prepared.sources.length} governed source(s).`,
    notice: `All distilled records remain proposals until reviewed. Unsupported metrics and approvals were not invented. Knowledge release ${input.knowledgeReleaseId ?? 'CAMBRIDGE-SA-1.0'} supplied the quality and journey grammar.`,
  };
}

export function mergeRequirementsProposal(project: ArchitectureProject, proposal: RequirementsDistillationProposal, knowledgeReleaseId = 'CAMBRIDGE-SA-1.0'): ArchitectureProject {
  if (proposal.projectRevision !== project.revision) throw new Error('STALE_REQUIREMENTS_PROPOSAL');
  if ((proposal.conflicts ?? []).some((item) => item.status === 'open')) throw new Error('UNRESOLVED_REQUIREMENTS_CONFLICTS');
  if ((proposal.conflicts ?? []).some((item) => item.status !== 'open' && (item.resolution?.trim().length ?? 0) < 8)) throw new Error('INVALID_REQUIREMENTS_CONFLICT_RESOLUTION');
  const now = new Date().toISOString();
  const nextRevision = project.revision + 1;
  const acceptedRequirements = proposal.requirements.map((item) => ({ ...item, status: item.status === 'candidate' ? 'accepted' as const : item.status, origin: item.origin === 'source-derived' ? 'architect-confirmed' as const : item.origin, updatedAt: now }));
  const acceptedStakeholders = proposal.stakeholders.map((item) => ({ ...item, status: item.status === 'candidate' ? 'accepted' as const : item.status }));
  const acceptedJourneys = proposal.journeys.map((item) => ({ ...item, status: item.status === 'candidate' ? 'accepted' as const : item.status, updatedAt: now }));
  const businessStatements = acceptedRequirements.filter((item) => item.type === 'business').map((item) => item.statement);
  const functionalTitles = acceptedRequirements.filter((item) => item.type === 'functional').map((item) => item.title);
  const constraintStatements = acceptedRequirements.filter((item) => item.type === 'constraint').map((item) => item.statement);
  const assumptionStatements = acceptedRequirements.filter((item) => item.type === 'assumption').map((item) => item.statement);
  const stakeholderNames = acceptedStakeholders.map((item) => item.name);
  const mergedUnique = (current: string[], additions: string[], limit = 30) => [...new Set([...current, ...additions].map((item) => item.trim()).filter(Boolean))].slice(0, limit);
  const nextContextPackages = proposal.contextPackages.map((item) => ({ ...item, version: Math.max(item.version, (project.requirementsIntelligence?.contextPackages.find((prior) => prior.target === item.target)?.version ?? 0) + 1), projectRevision: nextRevision, compiledAt: now, contextFingerprint: hashText(JSON.stringify({ target: item.target, requirementRefs: item.requirementRefs, journeyRefs: item.journeyRefs, projectRevision: nextRevision })) }));
  const projectedProject: ArchitectureProject = {
    ...project,
    description: project.description.trim().length >= 40 ? project.description : businessStatements[0] ?? acceptedRequirements.find((item) => item.type === 'functional')?.statement ?? project.description,
    objectives: mergedUnique(project.objectives, businessStatements, 15),
    constraints: mergedUnique(project.constraints, constraintStatements, 30),
    assumptions: mergedUnique(project.assumptions, assumptionStatements, 30),
    context: { ...project.context, stakeholders: mergedUnique(project.context.stakeholders ?? [], stakeholderNames, 30), inScopeCapabilities: mergedUnique(project.context.inScopeCapabilities ?? [], functionalTitles, 30) },
    revision: nextRevision,
    updatedAt: now,
  };
  const compiledContextGraph = buildArchitectureContextGraph({ project: projectedProject, sources: proposal.sourceRecords, evidence: proposal.evidence, requirements: acceptedRequirements, stakeholders: acceptedStakeholders, journeys: acceptedJourneys, openQuestions: proposal.openQuestions, contextPackages: nextContextPackages });
  const semanticChanges = detectArchitectureSemanticChanges({ previousRequirements: project.requirementsIntelligence?.requirements ?? [], nextRequirements: acceptedRequirements, nextGraph: compiledContextGraph, ...(project.requirementsIntelligence?.contextGraph ? { previousGraph: project.requirementsIntelligence.contextGraph } : {}) });
  const contextGraph = applyArchitectureSemanticStaleness(compiledContextGraph, semanticChanges);
  return {
    ...projectedProject,
    requirementsIntelligence: {
      schemaVersion: '1.0', knowledgeReleaseId,
      sources: proposal.sourceRecords, evidence: proposal.evidence, requirements: acceptedRequirements, stakeholders: acceptedStakeholders, journeys: acceptedJourneys,
      openQuestions: proposal.openQuestions, health: assessHealth(acceptedRequirements, acceptedStakeholders, acceptedJourneys, proposal.openQuestions, proposal.conflicts ?? []), contextPackages: nextContextPackages,
      contextGraph, conflicts: proposal.conflicts ?? [], semanticChanges,
      migrationReceipt: project.requirementsIntelligence?.migrationReceipt ?? { migratedAt: now, fromProjectRevision: project.revision, sourceId: proposal.sourceRecords[0]?.id ?? 'requirements-intelligence', projectedObjectiveCount: project.objectives.length, projectedConstraintCount: project.constraints.length, projectedAssumptionCount: project.assumptions.length, projectedStakeholderCount: project.context.stakeholders?.length ?? 0, projectedCapabilityCount: project.context.inScopeCapabilities?.length ?? 0, canonicalAuthority: 'requirements-intelligence', legacyFieldsRetainedAsProjection: true },
      lastDistilledAt: now, lastCompiledAt: now,
    },
  };
}


export function resolveRequirementConflict(project: ArchitectureProject, input: {
  conflictId: string;
  status: Exclude<RequirementConflict['status'], 'open'>;
  resolution: string;
}): ArchitectureProject {
  const state = project.requirementsIntelligence;
  if (!state) throw new Error('REQUIREMENTS_INTELLIGENCE_NOT_INITIALIZED');
  const conflict = (state.conflicts ?? []).find((item) => item.id === input.conflictId);
  if (!conflict) throw new Error('REQUIREMENTS_CONFLICT_NOT_FOUND');
  const resolution = input.resolution.trim();
  if (resolution.length < 8) throw new Error('REQUIREMENTS_CONFLICT_RESOLUTION_REQUIRED');
  const now = new Date().toISOString();
  const nextRevision = project.revision + 1;
  const conflicts = (state.conflicts ?? []).map((item) => item.id === input.conflictId
    ? { ...item, status: input.status, resolution }
    : item);
  const contextPackages = state.contextPackages.map((item) => ({ ...item, projectRevision: nextRevision, compiledAt: now }));
  const projectedProject: ArchitectureProject = { ...project, revision: nextRevision, updatedAt: now };
  const contextGraph = buildArchitectureContextGraph({
    project: projectedProject,
    sources: state.sources,
    evidence: state.evidence,
    requirements: state.requirements,
    stakeholders: state.stakeholders,
    journeys: state.journeys,
    openQuestions: state.openQuestions,
    contextPackages,
  });
  return {
    ...projectedProject,
    requirementsIntelligence: {
      ...state,
      conflicts,
      health: assessHealth(state.requirements, state.stakeholders, state.journeys, state.openQuestions, conflicts),
      contextPackages,
      contextGraph,
      lastCompiledAt: now,
    },
  };
}

export function migrateLegacyRequirementsProject(project: ArchitectureProject, knowledgeReleaseId = 'CAMBRIDGE-SA-1.0'): ArchitectureProject {
  if (project.requirementsIntelligence?.migrationReceipt) return project;
  const now = new Date().toISOString();
  const sourceId = `REQ-SOURCE-LEGACY-${slug(project.id)}`;
  const entries: Array<{ group: string; statement: string; type: RequirementRecordType }> = [
    ...project.objectives.map((statement) => ({ group: 'Objectives', statement, type: 'business' as const })),
    ...(project.context.inScopeCapabilities ?? []).map((statement) => ({ group: 'In-scope capabilities', statement, type: 'functional' as const })),
    ...project.constraints.map((statement) => ({ group: 'Constraints', statement, type: 'constraint' as const })),
    ...project.assumptions.map((statement) => ({ group: 'Assumptions', statement, type: 'assumption' as const })),
  ];
  const source: RequirementSourceRecord = { id: sourceId, name: 'Legacy project fields', mediaType: 'application/vnd.aiw.legacy-project', kind: 'existing-sdd', classification: 'internal', version: 1, status: 'extracted', contentHash: hashText(JSON.stringify(entries)), characterCount: entries.reduce((sum, item) => sum + item.statement.length, 0), excerpt: entries.slice(0, 4).map((item) => item.statement).join(' '), sections: entries.map((item, index) => ({ id: `${sourceId}-section-${index + 1}`, heading: item.group, order: index + 1, text: item.statement, excerpt: item.statement.slice(0, 320) })), warnings: [], addedAt: now };
  const evidence: RequirementEvidenceReference[] = entries.map((item, index) => ({ id: `EVID-LEGACY-${index + 1}`, sourceId, ...(source.sections[index]?.id ? { sectionId: source.sections[index].id } : {}), excerpt: item.statement, locator: `Legacy project field · ${item.group} ${index + 1}` }));
  const requirements: CanonicalRequirementRecord[] = entries.map((item, index) => ({ id: `REQ-LEGACY-${index + 1}`, title: titleFor(item.statement), statement: item.statement, type: item.type, priority: 'unprioritized', origin: 'architect-confirmed', status: 'accepted', confidence: 1, evidenceRefs: [evidence[index]?.id ?? ''], stakeholderRefs: [], journeyRefs: [], acceptanceCriteria: item.type === 'functional' ? ['The capability is demonstrably supported by the approved solution journey and architecture model.'] : [], qualityAttributeHints: qualityHints(item.statement), tags: ['legacy-migration'], ambiguityFlags: ambiguityFlags(item.statement, item.type), rationale: 'Migrated from an existing AIW project field into the canonical requirements model.', createdAt: now, updatedAt: now }));
  const stakeholders: RequirementStakeholder[] = (project.context.stakeholders ?? []).map((name, index) => ({ id: `STAKEHOLDER-LEGACY-${index + 1}`, name, role: 'Stakeholder', concerns: [], decisionRights: [], origin: 'architect-confirmed', evidenceRefs: [], status: 'accepted' }));
  const openQuestions = buildOpenQuestions(project, requirements, stakeholders, []);
  const conflicts = detectRequirementConflicts(requirements);
  const health = assessHealth(requirements, stakeholders, [], openQuestions, conflicts);
  const nextRevision = project.revision + 1;
  const contextPackages = buildContextPackages({ ...project, revision: nextRevision }, requirements, stakeholders, [], openQuestions, [source]);
  const projectedProject = { ...project, revision: nextRevision, updatedAt: now };
  const contextGraph = buildArchitectureContextGraph({ project: projectedProject, sources: [source], evidence, requirements, stakeholders, journeys: [], openQuestions, contextPackages });
  return { ...projectedProject, requirementsIntelligence: { schemaVersion: '1.0', knowledgeReleaseId, sources: [source], evidence, requirements, stakeholders, journeys: [], openQuestions, health, contextPackages, contextGraph, conflicts, semanticChanges: [], migrationReceipt: { migratedAt: now, fromProjectRevision: project.revision, sourceId, projectedObjectiveCount: project.objectives.length, projectedConstraintCount: project.constraints.length, projectedAssumptionCount: project.assumptions.length, projectedStakeholderCount: stakeholders.length, projectedCapabilityCount: project.context.inScopeCapabilities?.length ?? 0, canonicalAuthority: 'requirements-intelligence', legacyFieldsRetainedAsProjection: true }, lastDistilledAt: now, lastCompiledAt: now } };
}
