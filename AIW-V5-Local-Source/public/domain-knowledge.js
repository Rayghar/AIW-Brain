// Released domain knowledge (round 12, workstream K; GR-DOM-03, GR-DOM-04, GR-DOM-05, GR-DOM-08).
//
// Domain knowledge is governed knowledge, not code. A decision topic for a domain, a tactic for a quality category, a
// fact about a product of a technology category, a regulation record or a method is offered to a chapter only by a
// released claim: one a second person verified against its exact source passage, released and pinned for the project,
// or pinned from an organisation release, and eligible on every read (knowledge-governance.js knowledgeEligibility).
// Candidate knowledge (candidate-sets/) is never read here: until a person releases it, nothing is offered, and the
// chapters read exactly as before.
//
// A claim offers by its shape: its subject names what it offers, its predicate says so, and its tags carry the fields
// ("key:value"). Round 12's candidate pack writes each record's claim in these shapes (scripts/build-domain-candidates.mjs),
// so that the approver's claim, once released, is read here without further work; no runtime module reads the pack.
//   topic       decision-topic:<id>  "offers a decision topic"   tags title, question, concern
//   tactic      tactic:<id>          "offers a tactic for"       tags quality (a Chapter 2 category), name, concern
//   product     product:<name>       "states a product fact"     tags technology (a Chapter 6 category), version
//   regulation  regulation:<id>      "records a regulation"      tags regulator, instrument, section, effective, jurisdiction
//   method      method:<id>          "describes a method"        tags title, concern
//   concern     design-concern:<id>  "offers a design concern" tags title, question,
//               criterion:<id>|<label>|<question> and option:<id>|<title>|<trade-off>; round 25 (D-25-10, K2), each
//               optionally: criterion:<id>|<label>|<question>|<category>|<kind> (the quality category and the driver
//               kind it is tied to, either one empty, not both), option:<id>|<title>|<trade-off>|<evidence it needs>,
//               and consequence:<option id>|<criterion id>|<the option's consequence on the criterion>
// What is offered informs: a person chooses a topic, a tactic or a product. Nothing here moves a score, a hard
// constraint, a conformance result or a drafted value.
import {releasedClaims, claimReceipt} from './knowledge-governance.js';
import {remember} from './document-memo.js';
import {QUALITY_TYPES, DRIVER_KINDS} from './quality-domain.js';

export const DOMAIN_SHAPES = Object.freeze({
  topic: Object.freeze({subject: 'decision-topic:', predicate: 'offers a decision topic', tags: ['title', 'question', 'concern']}),
  tactic: Object.freeze({subject: 'tactic:', predicate: 'offers a tactic for', tags: ['quality', 'name', 'concern']}),
  product: Object.freeze({subject: 'product:', predicate: 'states a product fact', tags: ['technology', 'version']}),
  regulation: Object.freeze({subject: 'regulation:', predicate: 'records a regulation', tags: ['regulator', 'instrument', 'section', 'effective', 'jurisdiction']}),
  method: Object.freeze({subject: 'method:', predicate: 'describes a method', tags: ['title', 'concern']}),
  concern: Object.freeze({subject: 'design-concern:', predicate: 'offers a design concern', tags: ['title', 'question', 'criterion', 'option', 'consequence']})
});
const str = v => typeof v === 'string' ? v.trim() : '';
// The value of a "key:value" tag, or ''.
export function tagValue(claim, key) {
  const hit = (Array.isArray(claim?.tags) ? claim.tags : []).find(t => typeof t === 'string' && t.toLowerCase().startsWith(key + ':'));
  return hit ? hit.slice(key.length + 1).trim() : '';
}
// The shape a claim has, or null: its subject's prefix and its predicate, both exactly.
export function domainShape(claim) {
  const subject = str(claim?.subjectId), predicate = str(claim?.predicate).toLowerCase();
  for (const [kind, s] of Object.entries(DOMAIN_SHAPES)) if (subject.startsWith(s.subject) && subject.length > s.subject.length && predicate === s.predicate) return kind;
  return null;
}
const EMPTY = Object.freeze({topics: [], tactics: [], products: [], regulations: [], methods: [], concerns: []});
const parts = (claim, key) => (Array.isArray(claim.tags) ? claim.tags : []).filter(t => typeof t === 'string' && t.toLowerCase().startsWith(key + ':')).map(t => t.slice(key.length + 1).split('|').map(s => s.trim()));
const validId = id => /^[a-z][a-z0-9-]{0,39}$/.test(id) && !['constructor','prototype'].includes(id);
// Round 25 (D-25-10, K2): what a criterion is tied to, an option's consequence on a criterion and the evidence an option
// needs are read strictly. A category or a driver kind AIW does not know, a category with a kind other than quality (only
// a quality driver has a category), an id that names no criterion or option, an empty text or one over NOTE_LIMIT, a
// second consequence for one criterion of one option, or a tag of these shapes at the length a claim keeps of a tag
// (knowledge-governance.js keeps 1,200 characters: it may have been cut) makes the concern malformed, so it is not
// offered, as no malformed concern is. A concern without them reads exactly as before.
const NOTE_LIMIT = 600, TAG_KEPT = 1200;
const CATEGORIES = new Set(QUALITY_TYPES.map(t => t.id)), KINDS = new Set(DRIVER_KINDS.map(k => k.id));
const scoped = (category, kind) => !!(category || kind) && (!category || CATEGORIES.has(category)) && (!kind || KINDS.has(kind)) && (!category || !kind || kind === 'quality');
function concernFields(claim) {
  const criteria = parts(claim, 'criterion'), options = parts(claim, 'option'), consequences = parts(claim, 'consequence');
  if (!tagValue(claim, 'title') || !tagValue(claim, 'question') || !criteria.length || options.length < 2 || options.length > 6 || criteria.length > 6) return null;
  if (criteria.some(row => row.length !== 3 && row.length !== 5) || options.some(row => row.length !== 3 && row.length !== 4)) return null;
  if ([...criteria, ...options].some(row => !validId(row[0]) || !row[1] || !row[2])) return null;
  if (new Set(criteria.map(r => r[0])).size !== criteria.length || new Set(options.map(r => r[0])).size !== options.length) return null;
  const fits = s => !!s && s.length <= NOTE_LIMIT, C = new Set(criteria.map(r => r[0])), O = new Set(options.map(r => r[0]));
  if (criteria.some(row => row.length === 5 && !scoped(row[3], row[4]))) return null;
  if (options.some(row => row.length === 4 && !fits(row[3]))) return null;
  if (consequences.some(row => row.length !== 3 || !O.has(row[0]) || !C.has(row[1]) || !fits(row[2])) || new Set(consequences.map(r => r[0] + '|' + r[1])).size !== consequences.length) return null;
  const raw = key => (Array.isArray(claim.tags) ? claim.tags : []).filter(t => typeof t === 'string' && t.toLowerCase().startsWith(key + ':'));
  if ([...raw('criterion').filter(t => t.split('|').length === 5), ...raw('option').filter(t => t.split('|').length === 4), ...raw('consequence')].some(t => t.length >= TAG_KEPT)) return null;
  const said = new Map(consequences.map(([o, c, text]) => [o + '|' + c, text]));
  return {criteria: criteria.map(([id, label, question, category, kind]) => ({id, label, question, ...(category === undefined ? {} : {category, kind})})),
    options: options.map(([id, title, tradeoff, evidence]) => { const own = criteria.filter(([c]) => said.has(id + '|' + c)).map(([c]) => [c, said.get(id + '|' + c)]); return {id, title, tradeoff, ...(evidence === undefined ? {} : {evidence}), ...(own.length ? {consequences: Object.fromEntries(own)} : {})}; })};
}
// Everything the project's eligible released claims offer, by kind, each with the claim's receipt; worked out once per
// settled document. The first release that offers an id wins; each list is in id order.
export function domainKnowledge(p) {
  if (!p?.knowledge) return EMPTY;
  return remember(p, 'domain-knowledge', '', () => {
    const out = {topics: new Map(), tactics: new Map(), products: new Map(), regulations: new Map(), methods: new Map(), concerns: new Map()};
    for (const h of releasedClaims(p)) {
      if (!h.eligible) continue;
      const c = h.claim, kind = domainShape(c);
      if (!kind) continue;
      const fields = kind === 'concern' ? concernFields(c) : null;
      if (kind === 'concern' && !fields) continue;
      const id = c.subjectId.slice(DOMAIN_SHAPES[kind].subject.length).trim(), base = {id, statement: c.statement, conditions: [...c.conditions], limitations: [...c.limitations], receipt: claimReceipt(p, c, h.release)};
      const t = k => tagValue(c, k);
      const row = kind === 'topic' ? {...base, title: t('title') || id, question: t('question'), concern: t('concern'), method: c.statement}
        : kind === 'tactic' ? {...base, name: t('name') || id, quality: t('quality'), concern: t('concern')}
          : kind === 'product' ? {...base, product: id, category: t('technology'), version: t('version')}
            : kind === 'regulation' ? {...base, regulator: t('regulator'), instrument: t('instrument'), section: t('section'), effective: t('effective'), jurisdiction: t('jurisdiction')}
              : kind === 'concern' ? {...base, ...fields, title: t('title'), question: t('question')}
                : {...base, title: t('title') || id, concern: t('concern')};
      // A product holds many facts, one per claim; every other kind is one row per id.
      const key = kind === 'product' ? id + '|' + c.id : id, list = out[kind + 's'];
      if (!list.has(key)) list.set(key, row);
    }
    const sorted = m => [...m.values()].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    return {topics: sorted(out.topics), tactics: sorted(out.tactics), products: sorted(out.products), regulations: sorted(out.regulations), methods: sorted(out.methods), concerns: sorted(out.concerns)};
  });
}
// The decision topics released for the project: [{id, title, question, method, concern, receipt}].
export const domainTopics = p => domainKnowledge(p).topics;
export const domainTopic = (p, id) => (id ? domainTopics(p).find(t => t.id === id) : null) || null;
// The tactics released for a Chapter 2 quality category: [{id, name, quality, statement, receipt}].
export const releasedTactics = (p, category) => domainKnowledge(p).tactics.filter(t => t.quality === category);
// The product facts released for a Chapter 6 technology category: [{product, category, version, statement, receipt}].
export const productFacts = (p, category) => domainKnowledge(p).products.filter(f => !category || f.category === category);
// The regulation records released for the project: [{id, regulator, instrument, section, effective, jurisdiction, ...}].
export const regulationRecords = p => domainKnowledge(p).regulations;
// A concern is usable only while its exact source-pinned release is eligible.
export const releasedDesignConcerns = p => domainKnowledge(p).concerns;
export const releasedDesignConcern = (p, id) => releasedDesignConcerns(p).find(c => c.id === id) || null;
