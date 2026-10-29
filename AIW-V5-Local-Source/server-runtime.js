// The server's side of the shared primitives (round 12, workstream A): what the server does faster than the browser can,
// registered with the shared modules when worker.js loads this module, and sameJSON, which only the server's command
// route reads. The browser's bundles carry none of it; every result is the same as the shared modules' own.
import {documentClone,copyValue,registerJournalSharing} from './public/document-memo.js';
import {registerSha256} from './public/brain-integrity.js';

// documentCopy on the server: the change journal's events are shared with the document copied, not copied (at 4,000
// changes the journal is most of a document, and every command copied it whole, often several times). An event is
// never changed once recorded: a review is recorded on a copy of its event (changes-domain.js), and a command adds its
// events to the copy's own array. Everything else is copied exactly as documentClone copies it, in the same key order.
export function journalSharingCopy(doc){
 if(!doc||typeof doc!=='object'||Array.isArray(doc)||typeof doc.toJSON==='function'||!Array.isArray(doc.changes?.events)||typeof doc.changes.toJSON==='function')return documentClone(doc);
 const out={},stack=[doc];
 for(const k of Object.keys(doc)){const x=k==='changes'?sharedJournal(doc.changes,stack):copyValue(doc[k],k,stack);if(x===undefined)continue;if(k==='__proto__')Object.defineProperty(out,k,{value:x,enumerable:true,writable:true,configurable:true});else out[k]=x;}
 return out;
}
function sharedJournal(c,stack){
 const out={};stack.push(c);
 for(const k of Object.keys(c)){const x=k==='events'?c.events.map(e=>e===undefined||typeof e==='function'?null:e):copyValue(c[k],k,stack);if(x===undefined)continue;if(k==='__proto__')Object.defineProperty(out,k,{value:x,enumerable:true,writable:true,configurable:true});else out[k]=x;}
 stack.pop();return out;
}
registerJournalSharing(journalSharingCopy);

// The runtime's own SHA-256 (Node: the server, the local server and the suites): the same digest of the same UTF-8 bytes
// (a lone surrogate is U+FFFD in both), about ten times faster on the texts a design digest reads
// (command-equivalence-validate.mjs holds the two to each other). A runtime without it keeps the portable one.
const nodeCrypto=(()=>{try{return globalThis.process?.getBuiltinModule?.('node:crypto')||null;}catch{return null;}})();
if(typeof nodeCrypto?.createHash==='function')registerSha256(text=>nodeCrypto.createHash('sha256').update(text,'utf8').digest('hex'));

// sameJSON(a, b): whether JSON.stringify(a)===JSON.stringify(b), without writing either (round 12). A value both sides
// share is equal at once (the journal's events, which every copy of a document shares), and the comparison stops at the
// first difference. JSON's own rules decide the rest: toJSON honoured with its key, boxed primitives unboxed, non-finite
// numbers null and -0 as 0, undefined, functions and symbols left out of objects and null in arrays, keys in their order.
export function sameJSON(a,b,key=''){return a===b||sameWritten(jsonOf(a,key),jsonOf(b,key));}
// Two values as JSON.stringify sees them (after jsonOf): the same text or not.
function sameWritten(a,b){
  if(a===b)return true;
  if(a===null||b===null||typeof a!=='object'||typeof b!=='object')return false;
  const list=Array.isArray(a);if(list!==Array.isArray(b))return false;
  if(list){
    if(a.length!==b.length)return false;
    for(let i=0;i<a.length;i++){const x=a[i],y=b[i];if(x===y)continue;const k=String(i),u=jsonOf(x,k),v=jsonOf(y,k);if(!sameWritten(u===undefined?null:u,v===undefined?null:v))return false;}
    return true;
  }
  const ea=written(a),eb=written(b);
  if(ea.length!==eb.length)return false;
  for(let i=0;i<ea.length;i++)if(ea[i][0]!==eb[i][0]||ea[i][2]!==eb[i][2]&&!sameWritten(ea[i][1],eb[i][1]))return false;
  return true;
}
// An object's entries as JSON.stringify writes them: [key, value as written, value as held], in key order.
function written(o){const out=[];for(const k of Object.keys(o)){const v=o[k],x=jsonOf(v,k);if(x!==undefined)out.push([k,x,v]);}return out;}
// The value JSON.stringify writes for v under key: a primitive, an object (written by its keys) or undefined (nothing).
function jsonOf(v,key){
  if(v!==null&&typeof v==='object'&&typeof v.toJSON==='function')v=v.toJSON(key);
  if(v instanceof Number||v instanceof String||v instanceof Boolean)v=v.valueOf();
  switch(typeof v){
    case 'number':return Number.isFinite(v)?(v===0?0:v):null;
    case 'string':case 'boolean':case 'object':return v;
    case 'bigint':throw new TypeError('Do not know how to serialize a BigInt');
    default:return undefined;
  }
}
