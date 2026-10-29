import {assuranceCurrent} from './assurance-domain.js';
import {verificationResult} from './architecture-verification.js';

// Delivery observations remain separate from design authority. This projection shows only
// explicit object links; a requirement link alone is not evidence that every component
// implementing that requirement was observed. The recorded result/status is the source's
// wording, not a pass/fail decision inferred by the canvas.
const OBSERVED = new Set(['test-result', 'observation', 'defect', 'value-outcome']);
const value = x => String(x ?? '').trim();
const same = (a, b) => value(a).toLocaleLowerCase() === value(b).toLocaleLowerCase();
const recordsOf = p => (p?.assurance?.records || []).filter(r => OBSERVED.has(r.kind));
const basisOf = (p, r) => r.reviewed && r.sourceEvidence
  ? (assuranceCurrent(p, r) ? 'reviewed-current' : 'reviewed-stale')
  : 'unreviewed';

export function observedEvidenceForObject(p, id, {release = '', environment = ''} = {}) {
  const all = recordsOf(p), scoped = all.filter(r => (!release || same(r.release, release)) && (!environment || same(r.environment, environment)));
  const linked = scoped.filter(r => (r.objectIds || []).includes(id));
  const records = linked.map(r => ({
    id: r.id, kind: r.kind, title: r.title, status: r.status,
    release: r.release || '', environment: r.environment || '', observedAt: r.observedAt || '',
    cycle: r.cycle || '', statement: r.statement || '', reviewer: r.reviewer || '',
    sourceLocation: r.sourceEvidence?.location || '', basis: basisOf(p, r),
    ...(r.verificationObservation?{comparison:verificationResult(p,r)}:{})
  })).sort((a, b) => value(b.observedAt).localeCompare(value(a.observedAt)) || a.id.localeCompare(b.id));
  const counts = {
    total: records.length,
    reviewedCurrent: records.filter(r => r.basis === 'reviewed-current').length,
    stale: records.filter(r => r.basis === 'reviewed-stale').length,
    unreviewed: records.filter(r => r.basis === 'unreviewed').length,
    // Observations linked to a requirement but not an object need an explicit
    // mapping before they can be presented as evidence about that object.
    requirementOnly: scoped.filter(r => !(r.objectIds || []).length && (r.requirementIds || []).includes(id)).length
  };
  const scopes = {
    releases: [...new Set(all.map(r => value(r.release)).filter(Boolean))].sort(),
    environments: [...new Set(all.map(r => value(r.environment)).filter(Boolean))].sort()
  };
  return {records, counts, scopes};
}

export function observedMappingSummary(p, {release = '', environment = ''} = {}) {
  const records = recordsOf(p).filter(r => (!release || same(r.release, release)) && (!environment || same(r.environment, environment)));
  const mapped = records.filter(r => (r.objectIds || []).length);
  return {
    total: records.length,
    objectMapped: mapped.length,
    requirementOnly: records.length - mapped.length,
    reviewedCurrent: records.filter(r => basisOf(p, r) === 'reviewed-current').length,
    sourceChanged: records.filter(r => basisOf(p, r) === 'reviewed-stale').length,
    unreviewed: records.filter(r => basisOf(p, r) === 'unreviewed').length
  };
}
