#!/usr/bin/env node
// Corpus attestation tool (A2): evaluates records against the strict counting
// predicate, per record, so board attestation is evidence-based not vibes.
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(process.argv[2] ?? '.');
const gov = JSON.parse(fs.readFileSync(path.join(root,'data/knowledge-governance.json'),'utf8'));
const kb = JSON.parse(fs.readFileSync(path.join(root,'data/knowledge-library.json'),'utf8'));
const filled=(r,f)=>{const v=r[f]; if(v==null)return false; if(typeof v==='string')return v.trim().length>0; if(Array.isArray(v))return v.length>0; if(typeof v==='object')return Object.keys(v).length>0; return true;};
const req=(r)=> (gov.requiredFieldsByType[r.recordType]??gov.requiredFieldsByType.default??[]);
const evOk=(r)=> (Array.isArray(r.evidence)?r.evidence:[]).some(id=>(gov.approvedEvidencePrefixes??['EVID-','SRC-']).some(p=>String(id).startsWith(p)));
const assess=(r)=>{const miss=req(r).filter(f=>!filled(r,f)); const gaps=[...miss, ...(!evOk(r)?['approved-posture evidence']:[]), ...(!filled(r,'owner')?['owner']:[]), ...(!(r.reviewedAt||r.reviewDate)?['reviewedAt']:[])]; return gaps;};
const pools=[['library.styles',kb.architectureStyles],['library.patterns',kb.patterns]];
for(const extra of ['data/pattern-corpus.governed.json']){const p=path.join(root,extra); if(fs.existsSync(p)){const d=JSON.parse(fs.readFileSync(p,'utf8')); pools.push([extra,d.records??[]]);}}
let ready=0, total=0;
for(const [name,recs] of pools){
  let poolReady=0;
  for(const r of recs){ total++; const gaps=assess(r); if(!gaps.length){ready++;poolReady++;} else if(process.argv.includes('--detail')) console.log(`GAP   ${r.id}: ${gaps.join(', ')}`); }
  console.log(`${name}: ${poolReady}/${recs.length} satisfy the strict predicate`);
}
console.log(`\nTOTAL predicate-ready: ${ready}/${total} (production gate target ${gov.productionGate?.target??200}).`);
console.log('Attestation rule: a record counts toward the gate ONLY if listed predicate-ready here, or after gaps are closed and re-run.');
