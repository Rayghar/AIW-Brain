// Suggested effects (round 25, D-25-08): where an alternative records no effect on a driver, what the project's
// released knowledge or the owner's SA Playbook would suggest, with its source. A suggestion is never counted: the
// reading (decision-reading.js) weighs recorded effects only, and a suggestion becomes one only when a person records
// it with the ordinary command (decision.alternative), reason and evidence filled from its source.
//
// The sources, and only these:
// - a released claim the alternative links (its knowledge link), still eligible (claimReceiptCurrent), whose
//   architecture unit states an effect on the driver's quality: "supports" suggests supports, "tradeoff" suggests
//   tension, "unknown" nothing;
// - the SA Playbook's mark for the alternative's style or pattern on the driver's quality: "x", strong support,
//   suggests supports; "(x)", potential or conditional support, suggests nothing and asks whether the condition holds.
// Candidate, withdrawn and superseded knowledge, the trade-off pack and the catalogue suggest nothing.
import {STYLES, PATTERNS, STYLE_KEY, PATTERN_KEY, attribute} from './playbook-knowledge.js';
import {linkedKnowledge, claimReceiptCurrent, releasedClaims} from './knowledge-governance.js';
import {readDecision} from './decision-reading.js';
import {list, str, joinAnd} from './util.js';

const low = s => str(s).toLowerCase();
// The alternative's playbook style (its strategy or its pattern names it) and the playbook patterns its pattern names.
// A pattern is named as a whole word (or words, a plural too) of the alternative's pattern, never inside another word;
// an alternative a released design concern offers names its concern there, not a pattern it follows, and follows none of
// the Playbook's.
const CONCERN_PATTERN = /^released design concern · /;
const named = (text, name) => new RegExp('(^|[^a-z0-9])' + low(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + 's?($|[^a-z0-9])').test(text);
export function playbookOf(a) {
  const text = low(a?.pattern);
  if (CONCERN_PATTERN.test(text)) return {style: null, patterns: []};
  const style = STYLES.find(s => a?.strategy === 'style:' + s.id || text === low(s.name)) || null;
  return {style, patterns: PATTERNS.filter(pt => named(text, pt.name))};
}
// The SA Playbook's marks for the alternative's style or pattern on a driver's quality (driver: the driver record; its
// category is the quality read), in the one wording a suggestion and the rules drafter's drafted assessment share
// (round 25, D-25-09; architecture-drafter.js): "x" reads as supports, "(x)" as no effect and the question whether the
// condition holds; no mark, or a driver of no playbook quality, reads nothing.
export function playbookAssessments(a, driver) {
  const attr = attribute(driver?.category) ? driver.category : null;
  if (!attr) return [];
  const {style, patterns} = playbookOf(a), name = attribute(attr).name;
  const of = (rec, kind) => { const mark = rec.effects?.[attr]; if (!mark) return null;
    const src = (kind === 'style' ? rec.rows?.[name] : null) || rec.src || (kind === 'style' ? STYLE_KEY.src : PATTERN_KEY.src);
    return mark === 'x'
      ? {effect: 'supports', from: 'playbook', name: rec.name, mark, src, reason: `The SA Playbook marks the ${rec.name} ${kind} as strong support for ${name.toLowerCase()}.`, evidence: `SA Playbook, ${src}`}
      : {effect: null, ask: true, from: 'playbook', name: rec.name, mark, src, reason: `The SA Playbook marks the ${rec.name} ${kind} as potential or conditional support for ${name.toLowerCase()}: say whether the condition holds here.`, evidence: `SA Playbook, ${src}`}; };
  return [style && of(style, 'style'), ...patterns.map(pt => of(pt, 'pattern'))].filter(Boolean);
}
const playbookSuggestions = (a, x) => playbookAssessments(a, x.record);
function claimSuggestions(p, a, x, claims) {
  const cat = low(x.record?.category), name = low(attribute(x.record?.category)?.name);
  if (!cat) return [];
  const out = [];
  for (const receipt of linkedKnowledge(p, [a.id])) {
    if (!claimReceiptCurrent(p, receipt)) continue;
    const hit = claims.find(h => h.eligible && h.claim.id === receipt.claimId && h.release.id === receipt.releaseId);
    for (const e of list(hit?.claim?.architectureUnit?.effects)) {
      const q = low(e.quality);
      if (!(q.includes(cat) || (name && q.includes(name)))) continue;
      const effect = e.direction === 'supports' ? 'supports' : e.direction === 'tradeoff' ? 'tension' : null;
      if (effect) out.push({effect, from: 'claim', claimId: receipt.claimId, releaseId: receipt.releaseId, reason: `${receipt.claimId} (${receipt.releaseId}): ${str(e.rationale) || str(hit.claim.statement)}`.slice(0, 600), evidence: `Released claim ${receipt.claimId} in ${receipt.releaseId}`});
    }
  }
  return out;
}

// For each alternative and driver of the decision with no recorded effect: the suggestions, and whether they agree.
export function suggestEffects(p, d) {
  const r = readDecision(p, d);
  if (!r) return null;
  const claims = releasedClaims(p), cells = [];
  for (const row of r.rows) for (const x of r.drivers) {
    if (row.parts.find(q => q.driverId === x.id)?.effect !== 'unknown') continue;
    const xs = [...claimSuggestions(p, row.alt, x, claims), ...playbookSuggestions(row.alt, x)];
    if (!xs.length) continue;
    const effects = [...new Set(xs.map(s => s.effect).filter(Boolean))];
    cells.push({alternativeId: row.id, driverId: x.id, suggestions: xs, effect: effects.length === 1 ? effects[0] : null, agree: effects.length <= 1});
  }
  // What recording the suggestions would change (a labelled hypothesis): each cell whose suggestions agree, recorded.
  let hypothesis = null;
  const fill = cells.filter(c => c.effect);
  if (fill.length) {
    const copy = {...d, alternatives: list(d.alternatives).map(a => ({...a, assessments: {...a.assessments, ...Object.fromEntries(fill.filter(c => c.alternativeId === a.id).map(c => [c.driverId, {effect: c.effect, reason: '', evidence: ''}]))}}))};
    const h = readDecision(p, copy, {priorities: {}});
    hypothesis = {lead: h.lead, tied: h.tied, changes: h.lead !== r.lead || String(h.tied) !== String(r.tied), cells: fill.length};
  }
  return {cells, hypothesis};
}

// What recording the suggestions would change, as a labelled hypothesis (D-25-08), never as a result; '' when nothing
// is suggested. S: suggestEffects' result; r: the decision's reading; alt names an alternative.
export function suggestionHypothesis(S, r, alt = x => x) {
  const h = S?.hypothesis;
  if (!h) return '';
  if (!h.changes) return 'Hypothesis, not a result: recording the suggested effects would not change the lead.';
  const now = r.lead ? alt(r.lead) : r.tied.length ? 'a tie' : 'no single alternative';
  return `Hypothesis, not a result: if the suggested effects were recorded, ${h.lead ? alt(h.lead) + ' would lead' : h.tied.length ? joinAnd(h.tied.map(alt)) + ' would tie' : 'no alternative would lead'} instead of ${now}.`;
}
