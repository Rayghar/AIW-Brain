// The knowledge the chapter models reason with, governed like the Architecture Brain's own.
//
// Two packs feed the models: the SA Playbook, structured (AIW-PLAYBOOK-3: attributes, tactics,
// styles, patterns), and the product mechanisms (AIW-PRODUCT-MECHANISMS-1: what each product is
// documented to do, with the page that says so). Each entry the models or Sol use carries a receipt
// — pack, entry, locator and a hash of the exact text — so a reading, a drafted fix or an assessment
// can say what it rested on. A pack withdrawn in Mind Factory's knowledge workspace stops being
// used: product suggestions stop, the desk stops offering its tactics, and Sol no longer receives
// it. History keeps what was used before. Withdrawing the SA Playbook's source withdraws every
// projection of it. Pure.
import {PLAYBOOK} from './playbook-knowledge.js';
import {TRAITS} from './product-knowledge.js';
import {sha256} from './brain-integrity.js';
import {withdrawn} from './knowledge-governance.js';

const list = v => Array.isArray(v) ? v : [];
export const PRODUCT_PACK = {id: 'AIW-PRODUCT-MECHANISMS-1', title: 'Product mechanisms', version: 1,
  posture: 'Curated paraphrases of vendor documentation, each citing its page. Descriptive knowledge: not project evidence, not a benchmark, and not a recommendation.'};
export const PLAYBOOK_IDS = ['SA-PLAYBOOK', 'AIW-PLAYBOOK-2', PLAYBOOK.id];
export const MODEL_PACKS = [{id: PLAYBOOK.id, title: 'SA Playbook, structured', posture: PLAYBOOK.posture}, PRODUCT_PACK];

export function packWithdrawn(p, id) {
  if (!p) return false;
  try { return withdrawn(p, id === PLAYBOOK.id ? PLAYBOOK_IDS : [id]).length > 0; } catch { return false; }
}
export const playbookAvailable = p => !packWithdrawn(p, PLAYBOOK.id);
export const productsAvailable = p => !packWithdrawn(p, PRODUCT_PACK.id);

const hashes = new Map();
const hashOf = text => { if (!hashes.has(text)) hashes.set(text, sha256(text)); return hashes.get(text); };
export const tacticReceipt = t => ({kind: 'playbook-entry', packId: PLAYBOOK.id, entryId: t.id, locator: t.src || '', fileSha256: PLAYBOOK.files?.[0]?.sha256 || '', excerptHash: hashOf(t.concept || t.name)});
export const traitReceipt = t => ({kind: 'product-mechanism', packId: PRODUCT_PACK.id, entryId: t.id, locator: t.src, excerptHash: hashOf(t.text)});

// A receipt is current while its pack is not withdrawn and its entry's text is unchanged.
export function modelReceiptCurrent(p, r) {
  if (!r || !r.packId) return true;
  if (packWithdrawn(p, r.packId)) return false;
  if (r.kind === 'product-mechanism') { const t = TRAITS.find(x => x.id === r.entryId); return !!t && hashOf(t.text) === r.excerptHash; }
  return true;
}
export const modelKnowledgeState = p => MODEL_PACKS.map(k => ({...k, withdrawn: packWithdrawn(p, k.id), entries: k.id === PRODUCT_PACK.id ? TRAITS.length : null}));
