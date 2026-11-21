// The design package of the typed deployment topology (rc44, wp9a; audit/rc44/design/wp9a-deployment.md): typed
// failure domains and deployment nodes, and in later slices declared failures, location gates and data copies,
// blueprint adoption and qualified fallbacks. Its id is the lead's (ruling D8 of 2026-11-18: it sorts before the
// adoption and workload packages, which bind and read its records). This module assembles the parts of the package
// into the one registration the shared machinery reads (design-extensions.js; the contract is in
// audit/rc44/build-notes/s0-extensions.md), and nothing else registers them. The server imports it from
// design-packages.js; the browser from the lazy entry of the Chapter 10 Model view (deploy-view.js), which the
// package's route stub loads before a document that holds the marker runtime.topology is first drawn
// (design-package-routes.js).
// A part is a module of its own that states what it adds, in the shape of a registration without an id: a slice fills
// its own part and edits no other. Two parts never state the same row: the assembly refuses that when the package loads.
import {registerExtension} from './design-extensions.js';
import {TOPOLOGY_PART} from './topology-domain.js';
import {FAILURES_PART} from './topology-failures.js';
import {GATES_PART} from './topology-gates.js';
import {BLUEPRINTS_PART} from './topology-blueprints.js';
import {FALLBACK_PART} from './topology-fallback.js';
export * from './topology-domain.js';

const TABLES=['objectTypes','prefixes','layers','commands','lifecycle','canRestore','design'],LISTS=['hops','designKeys','evidenceKeys','sections'],CALLED=['records','track'],STATED=new Set([...TABLES,...LISTS,...CALLED,'checks','provenance','upgrade','upgradeNote']);
// One registration from the parts, in their order: the tables and the provenance rows joined (a row two parts state is
// refused, but for the collections of a command, which are joined), the lists one after another, the emitters and the
// trackers each called in turn (the records the trackers answer they changed elsewhere joined, for the boundary to
// stamp: ruling M1), a chapter's findings those of every part that states them, and the upgrade steps
// chained in the parts' order (the document itself when no step changes it; its note is one part's).
export function assembleParts(id,parts){
 const e={id},row=(table,name,key,value)=>{if(Object.hasOwn(table,key))throw Error(id+': two parts state '+name+' “'+key+'”.');table[key]=value;};
 for(const part of parts){
  for(const k of Object.keys(part))if(!STATED.has(k))throw Error(id+': a part states “'+k+'”, which the assembly does not carry.');
  for(const k of TABLES)for(const [key,v] of Object.entries(part[k]||{}))row(e[k]??={},k,key,v);
  for(const k of LISTS)if(part[k]?.length)e[k]=[...e[k]||[],...part[k]];
  if(part.upgradeNote!==undefined){if('upgradeNote' in e)throw Error(id+': two parts state upgradeNote.');e.upgradeNote=part.upgradeNote;}
  for(const [k,rows] of Object.entries(part.provenance||{}))for(const [key,v] of Object.entries(rows)){const t=(e.provenance??={})[k]??={};if(k==='paths')t[key]=[...new Set([...t[key]||[],...v])];else row(t,'provenance.'+k,key,v);}
 }
 {const steps=parts.map(part=>part.upgrade).filter(Boolean);if(steps.length)e.upgrade=p=>steps.reduce((q,f)=>f(q)||q,p);}
 for(const k of CALLED){const fs=parts.map(part=>part[k]).filter(Boolean);if(fs.length)e[k]=(...args)=>fs.flatMap(f=>{const a=f(...args);return k==='track'&&Array.isArray(a)?a:[];});}
 const chapters=[...new Set(parts.flatMap(part=>Object.keys(part.checks||{})))];
 if(chapters.length)e.checks=Object.fromEntries(chapters.map(c=>[c,p=>parts.flatMap(part=>part.checks?.[c]?.(p)||[])]));
 return e;
}
export const DEPLOYMENT_PACKAGE=assembleParts('p30-deployment',[TOPOLOGY_PART,FAILURES_PART,GATES_PART,BLUEPRINTS_PART,FALLBACK_PART]);
registerExtension(DEPLOYMENT_PACKAGE);
