// The built-in definitions an adoption can pin (rc44, wp2 slice S1; audit/rc44/design/wp2-adoption.md §b.3 source 1):
// the guided design methods this code authors itself, by the identity their method receipts carry
// (architecture-knowledge.js methodReceipt; composition-manifest.js COMPOSITION_METHOD_IDENTITIES). Slice S1 states
// the skeletons — identity, kind, title, the group of options compared together — and reads one from a receipt; the
// roles and obligations an upgraded adoption pins are those its applied design recorded (adoption-upgrade.js), since
// history is never rewritten. The options, steps and materialisers of each method are slices S2 and S3's.
// Authority 'built-in': code-authored knowledge that gates today and gains nothing here. No released, candidate or
// discovery knowledge is read.
import {architectureMethodReceiptStatus} from './composition-manifest.js';
const skeleton=(definitionId,kind,title,groupId)=>Object.freeze({definitionId,version:1,kind,title,groupId,authority:'built-in',roles:Object.freeze([]),obligations:Object.freeze([])});
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
// The built-in an applied task of another kind is upgraded under (the boundary task's kind is 'design').
export const builtinOfKind=kind=>builtinDefinition({exchange:'exchange-contract-1',security:'protection-control-1',operation:'operation-continuation-1'}[kind]||'guided-boundary-1');
