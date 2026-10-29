// Values derived from a project document, computed once per revision (audit F2-03, F2-04). The project store
// marks each document it receives from the server as settled: the next save replaces that object and nothing
// mutates it, so a value derived from it stays true for as long as the object lives. Every other document —
// the copies that command appliers, review previews and proposals build and then change, and everything on
// the server — is never settled, so its values are always computed afresh and behave exactly as before.
// No DOM, no window: domain modules may use it.
const settled=new WeakSet(),caches=new WeakMap(),passing=new Map();
export function settleDocument(doc){if(doc&&typeof doc==='object')settled.add(doc);return doc;}
export const isSettled=doc=>!!doc&&typeof doc==='object'&&settled.has(doc);
// A pass over a document (round 5, R5-G): while fn runs, the document's values are remembered as a settled document's
// are, and when it returns those of a document that is not settled are dropped, with every value passValue kept. The
// checks, the readiness board and the connected model read a document without changing it, and look the same records
// up once per record of another chapter; a pass lets those lookups share one index (documentIndex) and one result
// (passValue) on the server and on a command's copy too. Nothing that changes the document may run inside a pass: the
// appliers run their checks in a pass of their own and change the document after it has ended. isSettled stays false
// inside a pass, so a finding's stamp is still computed at once there, exactly as before.
// unmemoised(fn): fn with every cache here switched off, so each lookup searches its list as the code did before the
// indexes existed: what scale-validate.mjs compares the memoised results with.
let off=0;
export function unmemoised(fn){off++;try{return fn();}finally{off--;}}
// memoOff(): whether unmemoised is running, for an index kept outside this module (per reasoning source, per journey
// index, per product name) to search its list as the code did before it, so the comparison covers it too.
export const memoOff=()=>off>0;
export function memoPass(doc,fn){
  if(off||!doc||typeof doc!=='object'||passing.has(doc))return fn();
  passing.set(doc,new Map());
  try{return fn();}finally{passing.delete(doc);if(!settled.has(doc))caches.delete(doc);}
}
export const inPass=doc=>!!doc&&typeof doc==='object'&&passing.has(doc);
// passValue(doc, name, compute): compute() once for the length of a pass, and afresh outside one. For values that are
// handed to callers as they are (a graph, a record's sources): callers inside a pass only read them, and a settled
// document's readers outside a pass still get their own, as before.
export function passValue(doc,name,compute){
  const cache=!off&&doc&&typeof doc==='object'?passing.get(doc):null;if(!cache)return compute();
  if(cache.has(name))return cache.get(name);
  const value=compute();cache.set(name,value);return value;
}
// passRemember(doc, name, key, compute): passValue for one key (an id or a record object) of a named family.
export function passRemember(doc,name,key,compute){
  const cache=!off&&doc&&typeof doc==='object'?passing.get(doc):null;if(!cache)return compute();
  let family=cache.get(name);if(!(family instanceof Map)){family=new Map();cache.set(name,family);}
  if(family.has(key))return family.get(key);
  const value=compute();family.set(key,value);return value;
}
// The named cache of a settled document, or of one inside a pass (a Map the caller keys by id or by record object), or null.
export function documentCache(doc,name){
  if(off||!isSettled(doc)&&!inPass(doc))return null;
  let byName=caches.get(doc);if(!byName){byName=new Map();caches.set(doc,byName);}
  let cache=byName.get(name);if(!cache){cache=new Map();byName.set(name,cache);}
  return cache;
}
// pinValue(doc, name, key, value) / unpinValues(doc): a value its caller holds true for a document it alone owns, for as
// long as it applies commands that cannot change what the value reads (round 12, architecture-drafter.js: the
// requirement-group index while a draft that adds no requirement and no group is applied to its working copy, which
// the commands change in place). remember() reads a pinned value first; unmemoised() reads none.
const pins=new WeakMap();
export function pinValue(doc,name,key,value){if(!doc||typeof doc!=='object')return value;let byName=pins.get(doc);if(!byName){byName=new Map();pins.set(doc,byName);}let m=byName.get(name);if(!m){m=new Map();byName.set(name,m);}m.set(key,value);return value;}
export function unpinValues(doc){if(doc&&typeof doc==='object')pins.delete(doc);}
// remember(doc, name, key, compute): the cached value for a settled document or one inside a pass, else compute().
export function remember(doc,name,key,compute){
  if(!off&&doc&&typeof doc==='object'){const pinned=pins.get(doc)?.get(name);if(pinned&&pinned.has(key))return pinned.get(key);}
  const cache=documentCache(doc,name);if(!cache)return compute();
  if(cache.has(key))return cache.get(key);
  const value=compute();cache.set(key,value);return value;
}
// documentIndex(doc, name, build): build()'s value (an index of the document's records, usually a Map by id) for a
// settled document or one inside a pass, built once; null otherwise, and the caller searches the list as before.
export function documentIndex(doc,name,build){
  const cache=documentCache(doc,'index');if(!cache)return null;
  let value=cache.get(name);if(value===undefined){value=build();cache.set(name,value);}return value;
}
// findIn(doc, name, list, id): list().find(r=>r.id===id), read from an index on a settled document or in a pass.
export function findIn(doc,name,list,id){const m=documentIndex(doc,name,()=>firstById(list()));return m?m.get(id):list().find(r=>r.id===id);}
// filterIn(doc, name, list, key, value): list().filter(r=>key(r)===value), from an index likewise; a fresh array either way.
export function filterIn(doc,name,list,key,value){const m=documentIndex(doc,name,()=>groupBy(list(),key));return m?(m.get(value)||[]).slice():list().filter(r=>key(r)===value);}
// carrying(doc, name, list, keys, value): list().filter(r=>keys(r).includes(value)), from an index of the keys each carries.
export function carrying(doc,name,list,keys,value){const m=documentIndex(doc,name,()=>{const m=new Map();for(const r of list())for(const k of new Set(keys(r))){let xs=m.get(k);if(!xs)m.set(k,xs=[]);xs.push(r);}return m;});return m?(m.get(value)||[]).slice():list().filter(r=>keys(r).includes(value));}
// withIds(doc, name, list, ids): list().filter(r=>ids.includes(r.id)), none without ids, in list order, from an index.
export function withIds(doc,name,list,ids){if(!ids)return [];const m=documentIndex(doc,name,()=>({at:new Map(list().map((r,i)=>[r,i])),by:groupBy(list(),r=>r.id)}));if(!m)return list().filter(r=>ids.includes(r.id));const found=new Set();for(const id of ids)for(const r of m.by.get(id)||[])found.add(r);return [...found].sort((a,b)=>m.at.get(a)-m.at.get(b));}
// latestIn(doc, name, list, key, value): the records newest first, as [...list()].reverse(), keeping only key(r)===value
// when an index is at hand; the caller's find tests the key either way.
export function latestIn(doc,name,list,key,value){const m=documentIndex(doc,name,()=>groupBy([...list()].reverse(),key));return m?m.get(value)||[]:[...list()].reverse();}
// firstById(list): a Map from id to the first record with that id, which is what list.find(r=>r.id===id) returns.
export function firstById(list){const m=new Map();for(const r of list||[])if(!m.has(r.id))m.set(r.id,r);return m;}
// groupBy(list, key): a Map from key to the records with that key, in list order (what list.filter finds).
export function groupBy(list,key){const m=new Map();for(const r of list||[]){const k=key(r);let xs=m.get(k);if(!xs)m.set(k,xs=[]);xs.push(r);}return m;}
// perDocument(fn): fn(doc, ...args) memoised per settled document; extra arguments form the key.
let anonymous=0;
export function perDocument(fn,keyOf=(...args)=>args.join('\u0000')){
  const name='fn:'+(++anonymous);
  return (doc,...args)=>remember(doc,name,keyOf(...args),()=>fn(doc,...args));
}
// handOver(doc): the caller gives the document up, so the next command applied to it changes it in place instead of
// copying it first (documentCopy below). For a caller that applies many commands in a row and keeps only the last
// result (scripts/build-scale-fixture.mjs); a document nobody handed over is copied exactly as before.
const handedOver=new WeakSet();
export function handOver(doc){if(doc&&typeof doc==='object')handedOver.add(doc);return doc;}
// documentCopy(doc): the copy a command works on (documentClone below), or the document itself when its caller handed it
// over. The server copies a project without its change journal's recorded events, which the copy shares (round 12:
// server-runtime.js registers that copy when worker.js loads it); the browser, which holds the newest changes only,
// copies them as before.
let journalSharing=null;
export function registerJournalSharing(copy){journalSharing=typeof copy==='function'?copy:null;}
export function documentCopy(doc){
 if(doc&&typeof doc==='object'&&handedOver.has(doc)){handedOver.delete(doc);return doc;}
 return journalSharing?journalSharing(doc):documentClone(doc);
}
// documentClone(value): the copy a command works on, identical to JSON.parse(JSON.stringify(value)) (round 5, R5-G).
// Same keys in the same order, undefined, functions and symbols dropped from objects and null in arrays, non-finite
// numbers null, -0 as 0, toJSON honoured (a Date becomes its string), boxed primitives unboxed, a Map or Set an empty
// object, a "__proto__" key an own property, and the same TypeError on a cycle or a BigInt. It differs only in cost:
// strings are immutable, so they are shared rather than escaped and parsed again, which makes a 12 MB project about
// seven times cheaper to copy (scale-validate.mjs asserts the equality on the 500-per-chapter project).
export function documentClone(value){return copyValue(value,'',[]);}
export function copyValue(v,key,stack){
  if(v!==null&&typeof v==='object'&&typeof v.toJSON==='function')v=v.toJSON(key);
  switch(typeof v){
    case 'string':case 'boolean':return v;
    case 'number':return Number.isFinite(v)?(v===0?0:v):null;
    case 'bigint':throw new TypeError('Do not know how to serialize a BigInt');
    case 'object':break;
    default:return undefined;
  }
  if(v===null)return null;
  if(v instanceof Number||v instanceof String||v instanceof Boolean){const x=v.valueOf();return typeof x==='number'?(Number.isFinite(x)?(x===0?0:x):null):x;}
  if(stack.includes(v))throw new TypeError('Converting circular structure to JSON');
  stack.push(v);
  let out;
  if(Array.isArray(v)){const n=v.length;out=new Array(n);for(let i=0;i<n;i++){const x=copyValue(v[i],String(i),stack);out[i]=x===undefined?null:x;}}
  else{out={};for(const k of Object.keys(v)){const x=copyValue(v[k],k,stack);if(x===undefined)continue;if(k==='__proto__')Object.defineProperty(out,k,{value:x,enumerable:true,writable:true,configurable:true});else out[k]=x;}}
  stack.pop();
  return out;
}
// sharedList(doc, name, compute): a list of plain records (a chapter's findings) worked out once per settled document
// or pass; every caller gets a fresh array of fresh copies, so no caller can change what another reads.
export function sharedList(doc,name,compute){
  const cache=documentCache(doc,'list');if(!cache)return compute();
  let list=cache.get(name);if(!list){list=compute();cache.set(name,list);}
  return list.map(x=>x&&typeof x==='object'&&!Array.isArray(x)?{...x}:x);
}
// tupleSet(): a set of key tuples compared with ===, as list.some(x=>x.a===a&&x.b===b) compares them.
export function tupleSet(){
  const root=new Map(),walk=(keys,make)=>{let m=root;for(let i=0;i<keys.length-1;i++){let next=m.get(keys[i]);if(!next){if(!make)return null;m.set(keys[i],next=new Map());}m=next;}return m;};
  return {has(...keys){const m=walk(keys,false);return !!m&&m.has(keys[keys.length-1]);},add(...keys){walk(keys,true).set(keys[keys.length-1],true);}};
}
