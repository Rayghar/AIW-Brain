// AIW's curation beside the descriptive pattern catalogue (round 12, workstream K; GR-DOM-02, GR-DOM-06).
//
// The catalogue (brain-catalogue.js) is a hashed projection of an archive release (AKR-0.10.73.5): AIW never edits
// it, so every catalogue receipt stays checkable against the archive. This file stands beside it with two things, both
// in AIW's own words and marked as AIW's:
//   - Marks. Records whose archive content is the catalogue's template and whose name or kit misleads in a financial
//     design: a "Disaster Recovery" with no recovery point, recovery time or restore path, a "Reconciliation Loop"
//     that is a platform control loop. Each is marked not for financial use, with why, and with a clearer name where
//     the name itself misleads. A marked record is shown with its mark and is never cited as grounding
//     (architecture-brain.js brainSources).
//   - Stubs. The records the archive's relations name but does not hold (15 at AKR-0.10.73.5: two-phase commit,
//     workflow orchestration, dual write, temporal table, snapshot and others). A stub keeps the id, a name read from
//     the id, its kind and which records name it and how. It holds no content, because the archive holds none, so
//     every relation resolves (catalogueRelation) and none is invented.
// Nothing here is knowledge: it informs no score, hard constraint, conformance result or drafted value, and no person
// has reviewed it (audit/round12/DOMAIN-KNOWLEDGE-REVIEW-PACK.md lists it for review).
import {catalogue} from './catalogue-store.js';

export const CATALOGUE_CURATION = Object.freeze({id: 'AIW-CATALOGUE-CURATION-1', catalogueRelease: 'AKR-0.10.73.5', authority: 'AIW curation beside the descriptive catalogue: marks and stubs in AIW\'s own words, not reviewed by a person, never a source of grounding.'});
export const NOT_FOR_FINANCIAL_USE = 'Not for financial use';
const KIT = {
  resilience: 'its kit is the catalogue\'s generic resilience kit (Protected Client, Resilience Policy, Reliability Telemetry)',
  security: 'its kit is the generic security kit (Protected Workload, Policy Enforcement Point, Trust Service)',
  telemetry: 'its kit is the generic telemetry kit (Instrumented Workload, Telemetry Pipeline, Operational View)'
};
const TEMPLATE = 'Its archive content is the catalogue\'s template, and ';
const MARKS = {
  'PAT-DISASTER-RECOVERY': {why: TEMPLATE + KIT.resilience + ': it names no recovery point, recovery time, standby site or restore path.'},
  'PAT-BACKUP-AND-RESTORE': {why: TEMPLATE + KIT.resilience + ': it names no backup scope, retention, restore test or restore time.'},
  'PAT-FAILOVER': {why: TEMPLATE + KIT.resilience + ': it names no standby, no promotion rule and no data loss accepted on failover.'},
  'PAT-GEO-REDUNDANCY': {why: TEMPLATE + KIT.resilience + ': it names no second site, replication or failover between sites.'},
  'PAT-ACTIVE-PASSIVE': {why: TEMPLATE + KIT.resilience + ': it names no passive copy, replication or promotion.'},
  'PAT-AUDIT-TRAIL': {why: TEMPLATE + KIT.security + ': it names no audit record, before and after values, retention or protection from change.'},
  'PAT-TAMPER-EVIDENT-LOG': {why: TEMPLATE + KIT.security + ': it names no chained or signed log entries and no verification.'},
  'PAT-AUDIT-OBSERVABILITY': {why: TEMPLATE + KIT.telemetry + ': operational telemetry, not an audit history of financial or master-data changes.'},
  'PAT-RECONCILIATION-LOOP': {name: 'Reconciliation Loop (platform control loop)', why: 'A platform control loop that keeps running infrastructure at its declared state; it is not the reconciliation of ledgers, settlements or statements. Its kit is the platform kit (Platform Control Plane, Platform Capability, Developer Contract).'},
  'TPL-PAYMENT-PROCESSING-CELL': {name: 'Payment Processing Cell (no payment content)', why: 'The archive record holds no payment content: its summary is the catalogue\'s template, and ' + KIT.resilience + ', with no posting, settlement or reconciliation part.'},
  'TPL-SECURE-DATA-EXCHANGE': {name: 'Secure Data Exchange (filed with an AI model kit)', why: 'The archive files it under AI with a model kit (Model Client, Model Gateway, Evaluation Loop); it holds no exchange of data between institutions, no message standard and no non-repudiation.'}
};
// The mark of a record (or of its id): {mark, name, why}, or null when it carries none.
export function catalogueMark(recordOrId) {
  const id = typeof recordOrId === 'string' ? recordOrId : recordOrId?.id;
  if (!id || !Object.hasOwn(MARKS, id)) return null;
  const m = MARKS[id];
  return {mark: NOT_FOR_FINANCIAL_USE, name: m.name || null, why: m.why};
}
export const notForFinancialUse = recordOrId => !!catalogueMark(recordOrId);
export const MARKED_RECORDS = Object.freeze(Object.keys(MARKS));
// The name to show: the clearer name where the archive's misleads, the archive's otherwise.
export const curatedName = record => (record && Object.hasOwn(MARKS, record.id) && MARKS[record.id].name) || record?.name || '';

// ---------------------------------------------------------------- stubs for the relations the archive does not hold
const KINDS = {PAT: 'pattern', ANTI: 'anti-pattern', TPL: 'topology-template', ARCH: 'component-archetype', STYLE: 'style'};
const SMALL = new Set(['and', 'as', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with']), UPPER = new Set(['API', 'CRUD']);
export function stubName(id) {
  const words = String(id).split('-'), rest = Object.hasOwn(KINDS, words[0]) ? words.slice(1) : words;
  return rest.map((w, i) => UPPER.has(w) ? w : i > 0 && SMALL.has(w.toLowerCase()) ? w.toLowerCase() : w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
}
const RELATIONS = [['alternatives', 'alternative'], ['complements', 'complement'], ['conflicts', 'conflict']];
const stubCache = new WeakMap();
// The stubs of a catalogue: one per relation id it names and does not hold, in the order the records name them.
export function catalogueStubs(C = catalogue()) {
  if (stubCache.has(C)) return stubCache.get(C);
  const held = new Set(C.records.map(r => r.id)), stubs = new Map();
  for (const r of C.records) for (const [field, relation] of RELATIONS) for (const id of r[field] || []) {
    if (held.has(id)) continue;
    if (!stubs.has(id)) {
      const prefix = String(id).split('-')[0];
      stubs.set(id, {id, name: stubName(id), recordType: KINDS[prefix] || 'concept', stub: true, namedBy: [], summary: '',
        authority: 'AIW stub: the archive names this record in a relation but holds no record for it, so it has no content. Descriptive only; never a source of grounding.'});
    }
    stubs.get(id).namedBy.push({id: r.id, name: r.name, relation});
  }
  const out = Object.freeze([...stubs.values()].map(s => Object.freeze({...s, namedBy: Object.freeze(s.namedBy)})));
  stubCache.set(C, out);
  return out;
}
// A relation's target: the catalogue's record, or the stub that stands for a record the archive does not hold.
export function catalogueRelation(id, C = catalogue()) {
  return C.records.find(r => r.id === id) || catalogueStubs(C).find(s => s.id === id) || null;
}
// What a person reads beside a record or a stub: the mark and why, or the stub's note, or nothing.
export function curationNote(record) {
  if (record?.stub) return 'AIW stub: named by ' + record.namedBy.map(n => n.name + ' (' + n.relation + ')').join(', ') + '. The archive holds no record for it.';
  const m = catalogueMark(record);
  return m ? m.mark + '. ' + m.why : '';
}
