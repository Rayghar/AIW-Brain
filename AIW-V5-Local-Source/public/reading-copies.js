// The conversion of the readings a document wrote as copies before round 12 (D-04): each copy becomes the fingerprint
// the same reading has now, by its shape (source-fingerprint.js says what a fingerprint is). Server only: the server
// reads every document and upgrades it (readings-upgrade.js), and judges a document's copies through these while it
// does; registered with source-fingerprint.js when loaded. The browser's bundles carry none of it.
import {FINGERPRINT,isFingerprint,textFingerprint,valueFingerprint,recordFingerprint,driverRecord,qualityReading,conflictReading,decisionReading,logicalReading,componentReading,registerReadingCopies} from './source-fingerprint.js';
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
// A kept reading that no reading taken now can equal (its length field is not a number): what an unreadable copy
// becomes, because no source matched it before either.
const never=v=>FINGERPRINT+'kept:'+textFingerprint(String(JSON.stringify(v)??'undefined')).slice(FINGERPRINT.length);
const keysAre=(o,keys)=>{const k=Object.keys(o);return k.length===keys.length&&k.every((x,i)=>x===keys[i]);};
// A map of texts as a map of fingerprints, in the same key order; the map itself when nothing changes.
function mapEntries(s,entry){let changed=false;const out=Object.entries(s).map(([k,v])=>{const f=entry(v);if(f!==v)changed=true;return [k,f];});return changed?Object.fromEntries(out):s;}
const textEntry=v=>typeof v==='string'?(isFingerprint(v)?v:textFingerprint(v)):never(v);
// A quality scenario's reading: {requirementId: fingerprint of the requirement}. A copy holds the requirement's JSON text.
const qualityConversion=s=>plain(s)?mapEntries(s,textEntry):s;
// A driver's JSON text, as a decision's or a conflict's copy holds it, as the fingerprint of that driver now.
function driverText(t){let d;try{d=JSON.parse(t);}catch{return never(t);}return plain(d)?valueFingerprint(driverRecord(d)):textFingerprint(t);}
const driverEntry=v=>typeof v==='string'?(isFingerprint(v)?v:driverText(v)):never(v);
// A conflict's reading of its drivers: {driverId: fingerprint of the driver}.
const conflictConversion=s=>plain(s)?mapEntries(s,driverEntry):s;
// A decision's reading: {requirements:{id: fingerprint}, drivers:{id: fingerprint}}.
function decisionConversion(s){
 if(!plain(s))return s;
 if(!keysAre(s,['requirements','drivers'])||!plain(s.requirements)||!plain(s.drivers))return never(s);
 const requirements=mapEntries(s.requirements,textEntry),drivers=mapEntries(s.drivers,driverEntry);
 return requirements===s.requirements&&drivers===s.drivers?s:{requirements,drivers};
}
// A responsibility's reading, one fingerprint over the fingerprints of the requirements and drivers it reads and the
// state of its decisions; a component's likewise over its responsibilities, allocations, requirements, drivers and
// decisions. A copy is that object's JSON text with the records whole.
const logicalFingerprint=(requirements,drivers,decisions)=>valueFingerprint({requirements:requirements.map(valueFingerprint),drivers:drivers.map(recordFingerprint),decisions});
const componentFingerprint=(logical,mappings,requirements,drivers,decisions)=>valueFingerprint({logical,mappings,requirements:requirements.map(valueFingerprint),drivers:drivers.map(recordFingerprint),decisions});
function textReading(s,keys,fingerprint){
 if(typeof s!=='string'||isFingerprint(s))return s;
 let o;try{o=JSON.parse(s);}catch{return never(s);}
 return plain(o)&&keysAre(o,keys)&&keys.every(k=>Array.isArray(o[k]))?fingerprint(...keys.map(k=>o[k])):never(s);
}
const logicalConversion=s=>textReading(s,['requirements','drivers','decisions'],logicalFingerprint);
const componentConversion=s=>textReading(s,['logical','mappings','requirements','drivers','decisions'],componentFingerprint);
// Which reading a kept value is, by its field and shape: the record kinds above never share one (Chapter 6's readings
// were fingerprints already; Chapter 7 keeps version stamps, and Chapters 8–10 fingerprints (source-fingerprint.js
// contentStamp) or, kept before round 12, version stamps: none is a copy). Used by the upgrade to convert the readings
// records keep and those in the copies of records other records keep (a design task's basis, a staged change).
export function readingOf(value,field='sourceSnapshot'){
 if(field==='driverSnapshot')return conflictReading(value);
 if(isFingerprint(value))return value;
 if(typeof value==='string'){if(value.startsWith('{"requirements":['))return logicalReading(value);if(value.startsWith('{"logical":['))return componentReading(value);return value;}
 if(!plain(value))return value;
 if(keysAre(value,['requirements','drivers'])&&plain(value.requirements)&&plain(value.drivers))return decisionReading(value);
 return qualityReading(value);
}
// Whether a kept value is a copy the upgrade converts (a fingerprint and anything else are left alone).
export function isCopy(value,field='sourceSnapshot'){
 if(typeof value==='string')return !isFingerprint(value)&&(value.startsWith('{"requirements":[')||value.startsWith('{"logical":['));
 if(!plain(value))return false;
 if(field==='driverSnapshot'||!keysAre(value,['requirements','drivers']))return Object.values(value).some(v=>!isFingerprint(v));
 return [value.requirements,value.drivers].some(m=>plain(m)&&Object.values(m).some(v=>!isFingerprint(v)));
}
registerReadingCopies({quality:qualityConversion,conflict:conflictConversion,decision:decisionConversion,logical:logicalConversion,component:componentConversion});
