// Source readings as fingerprints (round 12, D-04). A record that reads upstream records keeps their ids and a
// fingerprint of what it read, never a copy: a quality scenario its requirements, a decision its requirements and
// drivers, a responsibility its requirements, drivers and decisions, a component the responsibilities it realises with
// theirs, a conflict the drivers it weighs. Source-change detection compares the fingerprint kept with the fingerprint
// of what the record reads now. A fingerprint is a compact change detector (two 32-bit hashes and the length of the
// text), as Chapter 6's readings always were: two readings are the same exactly when the texts they were taken from are
// the same, short of a collision of both hashes at the same length. Access control and approval never depend on it.
//
// Before round 12 the readings were copies: a requirement's JSON text per id, a driver's JSON text per id (its own
// reading inside), a responsibility's or a component's whole reading as one JSON text. The *Reading functions below turn
// a copy into the fingerprint the same reading has now, by its shape (on the server, through reading-copies.js), and
// leave a fingerprint as it is: a copy and a fingerprint of the same reading are equal after it, and a copy that did not
// match its sources does not match after it either. The comparisons read through them, so the upgrade
// (readings-upgrade.js) judges a document's copies as they were judged. No DOM: every domain module may use it.
//
// What a reading reads of a record is its content (round 12, UX-02, readings definition 2). Review and confirmation state
// is not what a record says: whether a person confirmed it (confirmed, targetConfirmed), a reviewed treatment of its
// evidence (evidenceTreatment), the trail of who changed, accepted or confirmed what (history; a provenance's suggestions
// and history). A reading leaves them out, so confirming 1,400 requirements moves no fingerprint downstream (before, it
// left 414 records in Chapters 2–10 "changed"), while a change to what a record says moves it exactly as before. A
// document whose readings were taken of whole records (definition 1: D-04 as first written, and every copy before it) is
// upgraded on read (readings-upgrade.js), its judgements kept: a reading that was current becomes the current reading.
import {remember,isSettled,memoOff} from './document-memo.js';
export const FINGERPRINT='fp1:';
// The definition readings are taken under: 3 everywhere, an earlier one only while the upgrade takes a document's
// readings as they were written (withReadingsDefinition), to know which of the kept ones were current. The upgrade takes
// the two on different documents or in different passes, so the values remembered per document never mix. Definition 3
// (round 12, A3: GR-STO-08): a Chapter 7 realization and a design task's security basis read the records they read, one
// by one, where they read the versions of whole chapters (technology-realisation-domain.js inputSnapshot, design-basis.js),
// and a Chapter 8-10 record's reading kept as the versions of the chapters before it is converted on read
// (readings-upgrade.js). Readings of content (definition 2) are taken the same under it.
export const READINGS_DEFINITION=3;
let definition=READINGS_DEFINITION;
export const readingsDefinition=()=>definition;
export function withReadingsDefinition(value,fn){const was=definition;definition=value;try{return fn();}finally{definition=was;}}
// Round 12 (GR-INT-05): the evidence keys and assertions a further sheet adds to a requirement (`enrichment`) are
// evidence about it, like a reviewed treatment of its evidence, not what it says.
const REVIEW_STATE=new Set(['confirmed','targetConfirmed','evidenceTreatment','history','enrichment']);
// Who wrote a record and who reviewed it (round 12, D-06: provenance.author and provenance.reviewed, which the server
// alone writes; provenance.js reads them) are not what the record says either. A reading reads a record as if they were
// not there: a provenance that held nothing else is left out whole, so a record keeps the reading it had before it was
// stamped, and confirming or adopting a record moves no fingerprint downstream.
const AUTHORSHIP=new Set(['author','reviewed']);
const DROP=Symbol('drop');
// A record, or a structure of records (a change target's context), as a reading reads it: the same value when it holds
// no review state, else a copy without it at any depth (a provenance keeps its source, not its trail), keys in order.
// A copy is made from its kept entries at once (Object.fromEntries, never by deleting from a spread): it serialises as
// fast as the record (round 12, GR-TST-07: a copy built key by key serialised a third slower, and a reading serialises
// the records it reads many times over).
const kept=(v,keys,i)=>{const out=new Array(i);for(let j=0;j<i;j++)out[j]=[keys[j],v[keys[j]]];return out;};
const entry=(k,x)=>{
 if(!x||typeof x!=='object')return x;
 if(k!=='provenance'||Array.isArray(x))return readContent(x);
 if(Object.hasOwn(x,'author')||Object.hasOwn(x,'reviewed')){
  const y={};for(const key of Object.keys(x))if(!AUTHORSHIP.has(key))y[key]=x[key];
  if(!Object.keys(y).length)return DROP;
  x=y;
 }
 if(!Object.hasOwn(x,'suggestions')&&!Object.hasOwn(x,'history'))return x;
 return Object.fromEntries(Object.keys(x).filter(key=>key!=='suggestions'&&key!=='history').map(key=>[key,x[key]]));
};
// An object without its review state, each remaining value read by read(key, value): the object itself when nothing
// differs.
function without(v,read){
 const keys=Object.keys(v);let pairs=null;
 for(let i=0;i<keys.length;i++){
  const k=keys[i],x=v[k];
  if(REVIEW_STATE.has(k)){pairs??=kept(v,keys,i);continue;}
  const y=read(k,x);
  if(y===DROP){pairs??=kept(v,keys,i);continue;}
  if(y!==x)pairs??=kept(v,keys,i);
  if(pairs)pairs.push([k,y]);
 }
 return pairs?Object.fromEntries(pairs):v;
}
// A value without who wrote its records or who reviewed them (provenance.author and provenance.reviewed, at any depth), all
// else kept, review state included: for a reading that copies whole records (a design task's basis, design-basis.js), so
// that the server's stamps (round 12, D-06) never stale it. A value that holds none is answered as it is.
export function withoutAuthorship(v){
 if(!v||typeof v!=='object')return v;
 if(Array.isArray(v)){let out=null;for(let i=0;i<v.length;i++){const y=withoutAuthorship(v[i]);if(y!==v[i]){out??=v.slice();out[i]=y;}}return out||v;}
 let out=null;const keys=Object.keys(v);
 for(let i=0;i<keys.length;i++){const k=keys[i],x=v[k];let y=x;
  if(k==='provenance'&&x&&typeof x==='object'&&!Array.isArray(x)&&(Object.hasOwn(x,'author')||Object.hasOwn(x,'reviewed'))){const z={};for(const key of Object.keys(x))if(!AUTHORSHIP.has(key))z[key]=x[key];y=Object.keys(z).length?z:DROP;}
  else y=withoutAuthorship(x);
  if(y!==x)out??=Object.fromEntries(kept(v,keys,i));
  if(out&&y!==DROP)out[k]=y;
 }
 return out||v;
}
export function readContent(v){
 if(definition<2||!v||typeof v!=='object')return v;
 if(!Array.isArray(v))return without(v,entry);
 let out=null;for(let i=0;i<v.length;i++){const x=v[i],y=readContent(x);if(y!==x){out??=v.slice();out[i]=y;}}return out||v;
}
// The content of a record (or of a list of records, at any depth), as readContent gives it, each record's taken once per
// settled document or pass (document-memo.js): the same requirement is read by every record that names it. A record of
// a settled document is never changed, so its content is taken once per record revision (round 12, GR-TST-07): for as
// long as the record lives, whichever settled document holds it. A save's answer keeps the records it did not change
// (project-store.js), so the readings of the next revision strip only the records that changed.
const contentByRecord=new WeakMap();
export function contentOf(p,r){
 if(definition<2||!r||typeof r!=='object')return r;
 if(!Array.isArray(r)){
  if(!isSettled(p)||memoOff())return remember(p,'source:content',r,()=>readContent(r));
  let c=contentByRecord.get(r);if(c===undefined){c=readContent(r);contentByRecord.set(r,c);}return c;
 }
 let list=null;for(let i=0;i<r.length;i++){const x=r[i],y=contentOf(p,x);if(y!==x){list??=r.slice();list[i]=y;}}return list||r;
}
// A record's sources ({requirements:[…], drivers:[…], …}) as readContent reads them, each listed record through contentOf.
export function contentSources(p,s){
 if(definition<2||!s||typeof s!=='object'||Array.isArray(s))return contentOf(p,s);
 return without(s,(k,x)=>Array.isArray(x)?contentOf(p,x):entry(k,x));
}
export const isFingerprint=v=>typeof v==='string'&&v.startsWith(FINGERPRINT);
// The fingerprint of a text: its length, FNV-1a and a second multiplicative hash (technology-domain.js's fp1, unchanged).
export function textFingerprint(text){let a=2166136261,b=2246822507;for(let i=0;i<text.length;i++){const code=text.charCodeAt(i);a=Math.imul(a^code,16777619);b=Math.imul(b^code,3266489909);}return FINGERPRINT+text.length+':'+(a>>>0).toString(16)+':'+(b>>>0).toString(16);}
// The fingerprint of a value's JSON text (null for a missing record).
export const valueFingerprint=v=>textFingerprint(JSON.stringify(v??null));
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
// The readings a document wrote as copies, before round 12, are read through these: each the reading itself here, where
// every document has been read by the server, which upgrades it (readings-upgrade.js), and on the server the conversion
// reading-copies.js registers (registerReadingCopies). The browser's bundles carry no conversion.
let copies=null;
export function registerReadingCopies(conversions){copies=conversions&&typeof conversions==='object'?conversions:null;}
// A quality scenario's reading: {requirementId: fingerprint of the requirement}.
export const qualityReading=s=>copies?copies.quality(s):s;
// A conflict's reading of its drivers: {driverId: fingerprint of the driver}.
export const conflictReading=s=>copies?copies.conflict(s):s;
// A decision's reading: {requirements:{id: fingerprint}, drivers:{id: fingerprint}}.
export const decisionReading=s=>copies?copies.decision(s):s;
// A responsibility's reading and a component's: one fingerprint each.
export const logicalReading=s=>copies?copies.logical(s):s;
export const componentReading=s=>copies?copies.component(s):s;
// A driver as other records read it: with its own reading as fingerprints (a copy's reading converted first).
export function driverRecord(d){if(!plain(d)||!Object.hasOwn(d,'sourceSnapshot'))return d;const s=qualityReading(d.sourceSnapshot);return s===d.sourceSnapshot?d:{...d,sourceSnapshot:s};}
export const recordFingerprint=d=>plain(d)?valueFingerprint(driverRecord(d)):valueFingerprint(d);
// What a reading taken now holds for one record it names (null when the record is gone): its fingerprint, worked out
// once per record of a settled document or a pass (document-memo.js; nothing changes a document there).
export const recordStamp=(p,r)=>r?remember(p,'source:record',r,()=>valueFingerprint(readContent(r))):valueFingerprint(null);
export const driverStamp=(p,d)=>d?remember(p,'source:driver',d,()=>recordFingerprint(readContent(d))):valueFingerprint(null);
// Round 12 (GR-REQ-13): what a record of Chapters 8–10 reads of another record is that record's content (readContent:
// not its review state) without its bookkeeping — its revision, review and kept readings, its place on a board, its
// origin and proposal state, a recorded selection or approval — taken as one fingerprint. A record that reads it is
// changed exactly when what it says is, so a save that changes nothing, a confirmation or a review changes no reader.
// Always taken as readings are taken now (definition 2): Chapters 8–10 kept no reading of an earlier definition.
// Worked out once per record of a settled document or a pass.
const BOOKKEEPING=new Set(['revision','review','sourceSnapshot','driverSnapshot','sourceDriverIds','sourceDecisionIds','col','origin','state','recorded','approval']);
// The text is JSON.stringify's of the content without those fields, written key by key with no copy of the record.
function contentText(r){let s='{';for(const k in r){if(!Object.hasOwn(r,k)||BOOKKEEPING.has(k))continue;const v=JSON.stringify(r[k]);if(v===undefined)continue;s+=(s.length>1?',':'')+JSON.stringify(k)+':'+v;}return s+'}';}
export const contentStamp=(p,r)=>r&&typeof r==='object'?remember(p,'source:content-stamp',r,()=>{const c=withReadingsDefinition(READINGS_DEFINITION,()=>readContent(r));return textFingerprint(Array.isArray(c)?JSON.stringify(c):contentText(c));}):valueFingerprint(r??null);
