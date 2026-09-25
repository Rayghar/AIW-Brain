// What a decision reaches, both ways. Upstream: the Chapter 1 requirements it answers and the limits
// they rest on, and the Chapter 2 drivers it weighs — each asked whether it still says what the
// choice delivers. Downstream: the responsibilities the choice shapes and the components, platform,
// contracts and runtime plans that carry them.
//
// trackDecisionChange records a change to a decision's working choice or state as an architecture
// change event (changes-domain.js), so every record it reaches — earlier chapters as well as later
// ones — is asked to review, and each review is a recorded human judgement. Pure apart from the
// event it appends to the document it is given.
import {changeTargetStamp, withChanges} from './changes-domain.js';

const list = v => Array.isArray(v) ? v : [];
const str = v => typeof v === 'string' ? v.trim() : v == null ? '' : String(v);
const uniq = xs => [...new Set(xs)];
export const CHAPTER_TITLES = {1: 'Requirements', 2: 'Quality drivers', 3: 'Decisions', 4: 'Logical application', 5: 'Application realisation', 6: 'Logical technology', 7: 'Technology realisation', 8: 'Interfaces & data', 9: 'Security', 10: 'Deployment & runtime'};

export function decisionImplications(p, decisionId, {alternativeId = null} = {}) {
  const d = list(p?.decisions?.records).find(x => x.id === decisionId);
  if (!d) return null;
  const alt = list(d.alternatives).find(a => a.id === (alternativeId || d.selectedAlternativeId)) || null;
  const lean = alt ? `"${alt.title}"` : `${d.id}'s working choice`;
  const up = [], down = [], add = (arr, direction, chapter, o, why) => { if (o && !arr.some(x => x.chapter === chapter && x.id === o.id)) arr.push({direction, chapter, id: o.id, ref: o.ref || o.id, title: o.title || o.question || o.id, why}); };
  // Upstream: drivers weighed, requirements answered, limits they rest on.
  const drivers = list(p?.quality?.drivers).filter(x => list(d.driverIds).includes(x.id));
  const reqIds = uniq([...list(d.requirementIds), ...drivers.flatMap(x => list(x.requirementIds))]);
  for (const r of list(p?.artefacts).filter(a => reqIds.includes(a.id) && a.type === 'requirement')) {
    const direct = list(d.requirementIds).includes(r.id);
    add(up, 'upstream', 1, r, alt ? `${d.id} answers it with ${lean}. Review whether its acceptance still says what that choice delivers${direct ? '' : ' (through ' + drivers.filter(x => list(x.requirementIds).includes(r.id)).map(x => x.id).join(', ') + ')'}.` : `${d.id} answers it, and its working choice has changed. Review whether its acceptance still holds.`);
  }
  const limits = list(p?.artefacts).filter(a => ['assumption', 'constraint', 'scope'].includes(a.type) && list(p?.relationships).some(l => (l.from === a.id && reqIds.includes(l.to)) || (l.to === a.id && reqIds.includes(l.from))));
  for (const a of limits) add(up, 'upstream', 1, a, `It limits a requirement ${d.id} answers. Review whether ${lean} still respects it${a.type === 'assumption' && !a.confirmed ? ', and confirm it: the choice now rests on it' : ''}.`);
  for (const x of drivers) {
    const as = alt?.assessments?.[x.id], eff = as?.effect || 'unknown', reason = str(as?.reason);
    add(up, 'upstream', 2, {id: x.id, ref: x.id, title: x.title}, eff === 'tension' ? `${lean} creates tension with it${reason ? ': ' + reason : ''}. Review whether its target and priority still hold, or record the trade-off.` : eff === 'supports' ? `${lean} relies on it${reason ? ': ' + reason : ''}. Review that its target still states what the choice must deliver.` : `${d.id} weighs it, but the effect of ${lean} on it is not recorded. Record the effect, or review the target.`);
  }
  // Downstream: what the choice shapes, and what carries that.
  const respIds = uniq([...list(alt?.responsibilityIds), ...list(p?.logical?.responsibilities).filter(r => list(r.decisionIds).includes(d.id)).map(r => r.id)]);
  const resps = list(p?.logical?.responsibilities).filter(r => respIds.includes(r.id));
  for (const r of resps) add(down, 'downstream', 4, r, `${lean} shapes it. Review its owned behaviour and boundary.`);
  const compIds = uniq([...list(p?.logical?.mappings).filter(m => respIds.includes(m.logicalId)).map(m => m.physicalId), ...list(p?.realisation?.components).filter(c => list(c.decisionIds).includes(d.id)).map(c => c.id)]);
  const comps = list(p?.realisation?.components).filter(c => compIds.includes(c.id));
  for (const c of comps) add(down, 'downstream', 5, c, `It realises ${resps.filter(r => list(p.logical.mappings).some(m => m.logicalId === r.id && m.physicalId === c.id)).map(r => r.ref).join(', ') || 'what the choice shapes'}. Review its interactions and allocation.`);
  for (const c of list(p?.technology?.capabilities).filter(c => list(c.decisionIds).includes(d.id))) add(down, 'downstream', 6, c, `It cites ${d.id}. Review the support it gives.`);
  for (const k of list(p?.interfaces?.contracts).filter(k => compIds.includes(k.from) && compIds.includes(k.to))) add(down, 'downstream', 8, k, `It carries work between parts ${lean} shapes. Review whether it stays ${k.kind === 'event' ? 'an event' : 'a synchronous request'}, and its timeout and idempotency.`);
  for (const r of list(p?.runtime?.plans).filter(r => compIds.includes(r.assetId))) add(down, 'downstream', 10, r, `It runs ${comps.find(c => c.id === r.assetId)?.ref || 'a part'} the choice shapes. Review its replicas, recovery and monitoring.`);
  return {decision: d, alternative: alt, upstream: up, downstream: down};
}

const snapshot = d => d ? {selectedAlternativeId: d.selectedAlternativeId || null, status: d.status || null, question: d.question} : null;
const altTitle = (d, id) => list(d?.alternatives).find(a => a.id === id)?.title || null;
export function implicationItems(p, source, rows) {
  return rows.map(o => { const item = {id: o.id, ref: o.ref, title: o.title, chapter: o.chapter, chapterTitle: CHAPTER_TITLES[o.chapter], key: o.chapter + ':' + o.id, why: o.why, via: [source.ref || source.id], direction: o.direction || null}; return {...item, capturedStamp: changeTargetStamp(p, item), reviews: []}; });
}

// A decision's working choice or state changed: ask everything it reaches to review.
export function trackDecisionChange(before, after, command, at) {
  if (!/^(decision\.|alternative\.|workspace\.apply)/.test(command?.type || '')) return;
  const olds = new Map(list(before?.decisions?.records).map(d => [d.id, d]));
  for (const d of list(after?.decisions?.records)) {
    const old = olds.get(d.id);
    if (!old) continue;
    const choice = (old.selectedAlternativeId || null) !== (d.selectedAlternativeId || null);
    const state = (old.status || null) !== (d.status || null) && ['recorded', 'accepted', 'superseded'].includes(d.status);
    if (!choice && !state) continue;
    const imp = decisionImplications(after, d.id);
    const fields = [];
    if (choice) fields.push({key: 'selectedAlternativeId', label: 'Working choice', before: altTitle(old, old.selectedAlternativeId), after: altTitle(d, d.selectedAlternativeId)});
    if (state) fields.push({key: 'status', label: 'Decision state', before: old.status || null, after: d.status});
    const source = {chapter: 3, id: d.id, ref: d.id, kind: 'decision', title: d.question};
    withChanges(after);
    after.changes.events.push({id: 'CHG-' + String(++after.changes.counter).padStart(3, '0'), source, title: d.question, at, before: snapshot(old), after: snapshot(d), fields, items: implicationItems(after, source, [...imp.upstream, ...imp.downstream])});
  }
}
