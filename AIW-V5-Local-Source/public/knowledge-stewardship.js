// The AIW Brain learns: the knowledge stewards' queue.
//
// Every piece of Sol's advice is recorded with what it rested on. Two kinds of record come to the
// stewards:
//   - a disagreement: the architect dismissed the advice and said why;
//   - advice acted on (used or applied) whose knowledge has since been withdrawn.
// For each, the stewards decide what the project learns. A disagreement can be captured as project
// knowledge: it becomes an original source (the project's own record of the disagreement) and a
// candidate claim, and then takes the ordinary governed path — review, release, activation, and a
// link to the record it concerns. Once linked, Sol reads it whenever it reasons about that record.
// Or the stewards record that the knowledge and design stand, send the record back for a revisit, or
// withdraw what the advice rested on. Sol advises the stewards on each item too, through the same
// reasoning task ('K:<assessment>' in brain-reasoning.js).
//
// Pure: nothing here changes the project; the commands are in knowledge-governance.js.
import {knowledgeState, withdrawn, releasedClaims, claimReceipt, knowledgeEligibility, STEWARD_DECISIONS} from './knowledge-governance.js';
import {TACTICS} from './playbook-knowledge.js';
import {TRAITS} from './product-knowledge.js';
import {tacticReceipt, traitReceipt, PLAYBOOK_IDS} from './model-knowledge.js';
import {RECORD_TYPES, findRecord, refOf, chapterReading, fitReading} from './chapter-reasoning.js';
import {digest} from './brain-integrity.js';

const list = v => Array.isArray(v) ? v : [];
const one = v => String(v ?? '').replace(/\s+/g, ' ').trim();
const clip = (s, n = 200) => { const t = one(s); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const uniq = xs => [...new Set(xs)];
export {STEWARD_DECISIONS};
export const TRAIL = [['captured', 'Captured'], ['verified', 'Reviewed'], ['released', 'Released'], ['active', 'Active'], ['linked', 'Linked']];
export const assessmentsOf = p => list(p?.coauthoring?.assessments);

// The record a piece of advice concerned.
export function assessmentObject(p, itemId) {
  const id = String(itemId || '');
  if (id.startsWith('M:')) return /^M:\d{1,2}:([^|]+)/.exec(id)?.[1] || null;
  if (id.startsWith('D:')) return id.slice(2);
  if (/^[FJ]:/.test(id)) { const parts = id.slice(2).split(':'); for (let i = 1; i < parts.length; i++) { const cand = parts.slice(i).join(':'); if (findRecord(p, cand)) return cand; } return null; }
  return null;
}
const chapterIdOf = t => t && RECORD_TYPES[t.type] ? `M:${RECORD_TYPES[t.type].chapter}:${t.record.id}` : null;

// The knowledge an assessment rested on, as the stewards can act on it: what can be withdrawn,
// whether it has been, and — while it has not — its current text for Sol to read again.
export function knowledgeRestedOn(p, sa) {
  const out = [];
  for (const s of list(sa?.sources)) {
    const r = s.receipt || {};
    let target = null, gone = false, source = null;
    if (s.kind === 'product-mechanism') {
      target = r.packId; gone = withdrawn(p, [r.packId]).length > 0;
      const t = TRAITS.find(x => x.id === r.entryId);
      if (t && !gone) source = {id: 'mechanism:' + t.id, kind: 'product-mechanism', objectId: t.id, title: s.title, posture: 'A paraphrase of the vendor’s documentation with its page; not a benchmark and not project evidence.', receipt: traitReceipt(t), excerpt: JSON.stringify({effect: t.effect, bearsOn: t.attrs, mechanism: t.text, documented: t.src}), truncated: false};
    } else if (s.kind === 'playbook-entry' || s.kind === 'brain-method') {
      target = 'SA-PLAYBOOK'; gone = withdrawn(p, PLAYBOOK_IDS).length > 0;
      const t = s.kind === 'playbook-entry' ? TACTICS.find(x => x.id === r.entryId) : null;
      if (t && !gone) source = {id: 'tactic:' + t.id, kind: 'playbook-entry', objectId: t.id, title: s.title, posture: 'The SA Playbook’s own text: a method, not proof that it applies here.', receipt: tacticReceipt(t), excerpt: JSON.stringify({name: t.name, group: t.group, attribute: t.attribute, concept: t.concept, example: t.example}).slice(0, 1400), truncated: false};
    } else if (s.kind === 'governed-claim') {
      target = r.claimId; gone = withdrawn(p, [r.claimId, r.sourceId, r.releaseId]).length > 0;
      const h = releasedClaims(p).find(x => x.claim.id === r.claimId && x.release.id === r.releaseId && x.eligible);
      if (h && !gone) source = {id: 'claim:' + h.release.id + ':' + h.claim.id, kind: 'governed-claim', objectId: h.claim.id, title: s.title, posture: 'Project-reviewed conditional claim; applicability still requires judgement', receipt: claimReceipt(p, h.claim, h.release), excerpt: JSON.stringify({statement: h.claim.statement, conditions: h.claim.conditions, limitations: h.claim.limitations}), truncated: false};
      else if (!h) gone = true;
    } else continue;
    out.push({ref: s.ref, kind: s.kind, title: s.title, target, withdrawn: gone, source});
  }
  return out;
}

// Where a captured disagreement stands on the governed path.
export function captureTrail(p, d, objectId = null) {
  const s = knowledgeState(p), claim = s.claims.find(c => c.id === d?.claimId);
  if (!claim) return {stage: 'missing', claim: null, release: null, link: null, objectId};
  const release = [...s.releases].reverse().find(r => r.claims.some(c => c.id === claim.id)) || null;
  const released = release ? release.claims.find(c => c.id === claim.id) : null;
  const active = !!release && s.pins.includes(release.id) && knowledgeEligibility(p, released, release).eligible;
  const target = d.objectId || objectId;
  const link = s.links.find(l => l.status !== 'retired' && l.objectId === target && l.receipt?.claimId === claim.id) || null;
  const decision = claim.review?.decision;
  const stage = link && active ? 'linked' : active ? 'active' : release ? 'released' : decision === 'verified' ? 'verified' : decision === 'rejected' ? 'rejected' : decision === 'disputed' ? 'disputed' : 'captured';
  return {stage, claim, release, link, objectId: target};
}

function queueItem(p, kind, sa, dispositions) {
  const key = kind + ':' + sa.id, disposition = dispositions.find(d => d.key === key) || null;
  const objectId = assessmentObject(p, sa.itemId), t = objectId ? findRecord(p, objectId) : null;
  const trail = disposition?.decision === 'captured' ? captureTrail(p, disposition, objectId) : null;
  const state = !disposition ? 'open' : trail && !['linked', 'rejected', 'missing'].includes(trail.stage) ? 'in-progress' : 'handled';
  return {key, kind, sa, objectId, record: t?.record || null, ref: t ? String(t.record.ref || t.record.id) : '', subject: t ? refOf(t.record) : sa.title, chapter: sa.chapter,
    knowledge: knowledgeRestedOn(p, sa), disposition, trail, state, solId: kind === 'dismissal' ? 'K:' + sa.id : `K:${sa.id}|withdrawn`};
}
// The queue: disagreements, then advice acted on whose knowledge was withdrawn; open first.
export function stewardQueue(p) {
  // Sol's advice to the stewards themselves is not queued again: the stewards' own decision is the record.
  const A = assessmentsOf(p).filter(a => !String(a.itemId).startsWith('K:')), D = list(knowledgeState(p).stewardship), items = [];
  for (const sa of A.filter(a => a.outcome === 'dismissed')) items.push(queueItem(p, 'dismissal', sa, D));
  const acted = new Map();
  for (const sa of A.filter(a => a.outcome === 'used' || a.outcome === 'applied')) acted.set(sa.runId + '|' + sa.itemId, sa);
  for (const sa of acted.values()) if (knowledgeRestedOn(p, sa).some(k => k.withdrawn)) items.push(queueItem(p, 'withdrawn', sa, D));
  const by = st => items.filter(i => i.state === st);
  return {items, open: by('open'), inProgress: by('in-progress'), handled: by('handled'), count: by('open').length + by('in-progress').length};
}

// What a captured disagreement would say, before the steward (or Sol) words it better.
export function captureDraft(p, sa) {
  const objectId = assessmentObject(p, sa.itemId), rec = objectId ? findRecord(p, objectId)?.record : null;
  const ref = rec ? String(rec.ref || rec.id) : '', name = rec ? one(rec.title || rec.question || '') : one(sa.title);
  const where = rec ? `${ref} ${name}` : name;
  return {assessmentId: sa.id, subject: where, subjectId: ref || 'PROJECT-' + sa.id, objectId: objectId || '', predicate: 'limits-advice', claimType: 'applicability', polarity: 'limits',
    statement: clip(`${where}: ${one(sa.reason)}`, 1200),
    conditions: `Applies to ${where} as recorded in Chapter ${sa.chapter} of this project.`,
    limitations: `Captured from one architect's disagreement with Sol (${sa.id}, ${one(sa.at).slice(0, 10)}); confirm with the owning team before relying on it elsewhere.`};
}

// ---------------------------------------------------------------- Sol advises the stewards

// 'K:SA-004' asks what a disagreement should teach; 'K:SA-002|withdrawn' asks whether a change made
// on advice still holds now that the knowledge behind it is withdrawn.
export function stewardshipReading(p, id) {
  const m = /^K:(SA-\d{3,5})(\|withdrawn)?$/.exec(String(id || ''));
  if (!m) return null;
  const A = assessmentsOf(p), sa = A.find(x => x.id === m[1]);
  if (!sa) return null;
  const kind = m[2] ? 'stewardship-impact' : 'stewardship', knowledge = knowledgeRestedOn(p, sa);
  if (kind === 'stewardship' && sa.outcome !== 'dismissed') return null;
  if (kind === 'stewardship-impact' && (!['used', 'applied'].includes(sa.outcome) || !knowledge.some(k => k.withdrawn))) return null;
  const s = knowledgeState(p), objectId = assessmentObject(p, sa.itemId), t = objectId ? findRecord(p, objectId) : null;
  let now = null;
  try { const x = chapterIdOf(t) ? chapterReading(p, chapterIdOf(t)) : null; now = x ? fitReading(x.reading, 1400) : null; } catch { now = null; }
  const onRecord = s.claims.filter(c => (t && c.subjectId === String(t.record.ref || t.record.id)) || s.links.some(l => l.status !== 'retired' && l.objectId === objectId && l.receipt?.claimId === c.id))
    .map(c => { const d = list(s.stewardship).find(x => x.claimId === c.id); return `${c.id} (${d ? captureTrail(p, d, objectId).stage : c.review?.decision || 'candidate'}): ${clip(c.statement, 220)}`; });
  const earlier = A.filter(x => x.id !== sa.id && x.outcome === 'dismissed' && assessmentObject(p, x.itemId) === objectId).map(x => `${x.id}: ${clip(x.reason, 200)}`).slice(0, 4);
  const reading = {
    advice: {assessment: sa.id, concerned: sa.title, chapter: sa.chapter, verdict: sa.verdict, headline: sa.headline, refinements: list(sa.refinements).map(r => `${r.label}: ${clip(r.value, 160)}`), model: sa.model, recorded: one(sa.at).slice(0, 10)},
    ...(kind === 'stewardship' ? {architectDisagreed: one(sa.reason)} : {architectDid: sa.outcome, withdrawnSince: knowledge.filter(k => k.withdrawn).map(k => { const w = s.withdrawals.find(x => x.targetId === k.target); return `${k.title} — withdrawn${w ? ': ' + clip(w.reason, 200) : ''}`; })}),
    restedOn: list(sa.sources).map(x => `${x.ref} ${x.kind}: ${clip(x.title, 100)}${knowledge.some(k => k.ref === x.ref && k.withdrawn) ? ' (withdrawn since)' : ''}`),
    recordNow: now || (t ? refOf(t.record) : 'The record is no longer in the design.'),
    projectKnowledge: onRecord, earlierDisagreements: earlier};
  const draft = captureDraft(p, sa);
  const knobs = kind === 'stewardship' ? [{key: 'statement', label: 'Project knowledge', type: 'textarea', maxLength: 1200, value: draft.statement}, {key: 'conditions', label: 'Where it applies', type: 'textarea', maxLength: 1200, value: draft.conditions}, {key: 'limitations', label: 'Its limits', type: 'textarea', maxLength: 1200, value: draft.limitations}] : [];
  const key = {sa, kind, dispositions: list(s.stewardship).filter(d => d.assessmentId === sa.id), withdrawn: knowledge.map(k => [k.ref, k.withdrawn]), onRecord};
  return {kind, sa, objectId, record: t?.record || null, chapter: sa.chapter, title: `${sa.id} · ${kind === 'stewardship' ? 'what the disagreement should teach' : 'a change made on withdrawn knowledge'} · ${clip(sa.title, 90)}`,
    reading, knobs, sources: knowledge.map(k => k.source).filter(Boolean), key};
}
export const stewardshipStamp = (p, id) => { try { const x = stewardshipReading(p, id); return x ? digest(x.key) : null; } catch { return null; } };

// Claims the stewards linked to records, active and eligible: what Sol reads about those records.
export function learnedFor(p, objectIds) {
  const ids = new Set(uniq(objectIds).filter(Boolean)), s = knowledgeState(p);
  if (!ids.size || !s.links.length) return [];
  const released = releasedClaims(p).filter(h => h.eligible);
  return s.links.filter(l => l.status !== 'retired' && ids.has(l.objectId)).map(l => ({link: l, hit: released.find(h => h.claim.id === l.receipt?.claimId && h.release.id === l.receipt?.releaseId)})).filter(x => x.hit);
}
