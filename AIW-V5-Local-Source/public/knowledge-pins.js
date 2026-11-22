// The concept pins as the browser reads them too (rc44, wp1 slice S3; audit/rc44/design/wp1-knowledge.md, b.1 and f.1):
// pure readers of the document, no clock, nothing written. A project relies on a released concept through a concept pin
// (knowledge.conceptPins, KU: the release, the version, the concept's hash) and links a record to it through the pin
// (knowledge.conceptLinks, KB). The pin's currency is derived on the server, which alone reads the organisation's signed
// notices, and stored beside the pins by one writer (knowledge-concepts.js refreshConceptPins): knowledge.pinCurrency,
// {pinId: {state, title, detail, successor?}}. What is read here, by the record graph and the review's own list (11):
//   pinRecords           each pin a record relies on, or that is active, as an object of type `concept`, and each active
//                        link as a relation `informs` from the pin to the record (no layer, no trail: S0's emitter)
//   conceptLinkFindings  one finding for each active link whose pin is not current: a newer version, a withdrawal, a
//                        change, a due review, a retirement, a pin a second person moved, a pin a person retired
//   pinsDesign, linksDesign  what the pins and links say to the design fingerprint: all of them but the steps they keep
// The design package p10-knowledge registers these (knowledge-package.js). Nothing here is read by a check of a
// chapter, a gate, a score or a conformance reading: a pin is taken only on released knowledge, and its finding says
// that the support changed, never what the knowledge says.
import {list} from './util.js';

const S = p => p?.knowledge || {};
export const conceptPin = (p, id) => list(S(p).conceptPins).find(x => x?.id === id) || null;
// The steps a pin or a link keeps (who took them, and how) are no part of what it says (ruling J3).
const STEPS = ['history', 'review', 'confirmed', 'provenance'];
const said = rows => Array.isArray(rows) ? rows.map(r => r && typeof r === 'object' ? Object.fromEntries(Object.entries(r).filter(([k]) => !STEPS.includes(k))) : r) : undefined;
export const pinsDesign = p => said(S(p).conceptPins);
export const linksDesign = p => said(S(p).conceptLinks);
// A migration is a proposal: it says nothing to the design (ruling L6). A second person's repin writes the pins.
export const migrationsDesign = () => undefined;
const active = p => list(S(p).conceptLinks).filter(l => l?.status === 'active');
export function pinRecords(p, add, rel, has) {
  const pins = list(S(p).conceptPins); if (!pins.length) return;
  const links = active(p);
  for (const pin of pins) if (pin?.id && (pin.status === 'active' || links.some(l => l.pinId === pin.id))) add({id: pin.id, title: pin.title || pin.conceptId, ref: pin.conceptId}, 'concept', 'knowledge.conceptPins.' + pin.id);
  for (const l of links) if (has(l.pinId) && has(l.objectId)) rel('informs', l.pinId, l.objectId, {id: l.id, source: 'knowledge.conceptLinks', attributes: {conceptId: l.conceptId, version: l.version, form: l.form}});
}
const KEPT = ' The record keeps its link; nothing in it changed.';
export function conceptLinkFindings(p) {
  const links = active(p); if (!links.length) return [];
  const pins = list(S(p).conceptPins), currency = S(p).pinCurrency || {}, out = [];
  for (const l of links) {
    const pin = pins.find(x => x?.id === l.pinId), at = (title, detail) => out.push({id: 'knowledge:' + l.id, chapter: 11, chapterTitle: 'Knowledge support', objectId: l.objectId, level: 'warning', title, detail});
    const name = (pin?.conceptId || l.conceptId) + ' v' + (pin?.version ?? l.version);
    if (!pin || pin.status === 'retired') { at('Review changed architectural support', name + ': its pin ' + l.pinId + (pin ? ' was retired' + (pin.retired?.reason ? ' (' + pin.retired.reason + ')' : '') : ' is not in this project') + '.' + KEPT); continue; }
    if (pin.status === 'moved') {
      const now = pins.find(x => x?.status === 'active' && x.conceptId === pin.conceptId) || pins.find(x => x?.id === pin.movedTo);
      // Linked again through the pin the project now holds, the record no longer rests on the older version.
      if (now && links.some(x => x.objectId === l.objectId && x.pinId === now.id)) continue;
      at('Review ' + pin.conceptId + ': this record rests on version ' + pin.version + '; the project now pins version ' + (now?.version ?? '?'), l.id + ' links ' + l.objectId + ' through ' + pin.id + ' (version ' + pin.version + '); the project now pins ' + (now ? now.id + ' (version ' + now.version + ')' : 'another version') + '. A person reads the changes and links the record again.' + KEPT);
      continue;
    }
    const c = currency[pin.id];
    if (c && c.state !== 'current') at(c.title, c.detail + KEPT);
  }
  return out;
}
