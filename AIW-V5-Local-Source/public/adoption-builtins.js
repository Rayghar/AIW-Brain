// The built-in definitions an adoption can pin (rc44, wp2 slice S1; audit/rc44/design/wp2-adoption.md §b.3 source 1):
// the guided design methods this code authors itself, by the identity their method receipts carry
// (architecture-knowledge.js methodReceipt; composition-manifest.js COMPOSITION_METHOD_IDENTITIES). Slice S1 states
// the skeletons — identity, kind, title, the group of options compared together — and reads one from a receipt; the
// roles and obligations an upgraded adoption pins are those its applied design recorded (adoption-upgrade.js), since
// history is never rewritten. The options, steps and materialisers of each method are slices S2 and S3's.
// Authority 'built-in': code-authored knowledge that gates today and gains nothing here. A released design concern has
// a skeleton of its own, read from the receipt its applied task pins (receiptDefinition: authority 'released'; whether
// that knowledge is still current is read where the adoption is read, adoption-domain.js). No candidate or discovery
// knowledge is read. A server module with the upgrade that reads it (adoption-upgrade.js).
import {architectureMethodReceiptStatus} from './composition-manifest.js';
const skeleton=(definitionId,kind,title,groupId,authority='built-in')=>Object.freeze({definitionId,version:1,kind,title,groupId,authority,roles:Object.freeze([]),obligations:Object.freeze([])});
export const BUILTIN_DEFINITIONS=Object.freeze(Object.fromEntries([
 ['interaction-design-1','pattern','Interaction','interaction'],
 ['read-design-1','pattern','Reads','reads'],
 ['persistence-design-1','pattern','Persistence','persistence'],
 ['composition-delivery-1','pattern','Publication','delivery'],
 ['composition-resilience-1','pattern','Resilience','resilience'],
 ['composition-distribution-1','pattern','Traffic and edge','distribution'],
 ['composition-partitioning-1','pattern','Data partitioning','partitioning'],
 ['composition-structure-1','style','Structure','structure'],
 // the guided flows that are not role bindings yet (design §e.2): an applied task of theirs is upgraded under these
 ['guided-boundary-1','method','Boundary','boundary'],
 ['exchange-contract-1','method','Exchange','exchange'],
 ['protection-control-1','method','Security','security'],
 ['operation-continuation-1','method','Operation continuation','operation']
].map(x=>[x[0],skeleton(...x)])));
export const builtinDefinition=id=>(Object.hasOwn(BUILTIN_DEFINITIONS,id)?BUILTIN_DEFINITIONS[id]:null);
// The built-in a method receipt identifies, with whether the receipt's interpretation is the current one (the reason
// architecture-obligation-basis.js gives when it is not: "The architecture method interpretation needs review.");
// null for a receipt that names no built-in.
export function builtinFromReceipt(receipt){
 const d=builtinDefinition(receipt?.methodId);
 return d?{...d,interpretationCurrent:architectureMethodReceiptStatus(receipt).interpretationCurrent}:null;
}
// The definition a method receipt names when it identifies no built-in (the lead's ruling J4 of 2026-11-19): a released
// design concern, compared and applied before selections were records, under its own id, kind and title (slice S5 moves
// such a comparison to selection.*); or a method this build does not author, under the id its receipt carries and with
// the authority 'unrecognised': this build cannot say whose knowledge it was, and does not call it a built-in (its
// reading is never 'current': adoption-domain.js definitionOf). Null for no receipt: the task's kind then says which
// guided flow it was (builtinOfKind).
export function receiptDefinition(receipt){
 const c=receipt?.governedConcern;
 if(c&&typeof c==='object')return skeleton(String(receipt.methodId||'knowledge-concern:'+c.id),'concern',String(c.title||c.question||'Released design concern'),'knowledge:'+c.id,'released');
 return typeof receipt?.methodId==='string'&&receipt.methodId?skeleton(receipt.methodId,'method',String(receipt.sources?.method?.title||'Guided design'),'guided','unrecognised'):null;
}
// The built-in an applied task of another kind is upgraded under (the boundary task's kind is 'design').
export const builtinOfKind=kind=>builtinDefinition({exchange:'exchange-contract-1',security:'protection-control-1',operation:'operation-continuation-1'}[kind]||'guided-boundary-1');
