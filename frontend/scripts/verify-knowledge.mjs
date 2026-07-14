#!/usr/bin/env node
// Knowledge constitution gate v2 — zero dependencies. Exit 1 on any blocker.
import fs from 'node:fs'; import path from 'node:path'; import crypto from 'node:crypto';
const rootArg = process.argv.slice(2).find((arg) => !arg.startsWith('--'));
const root = path.resolve(rootArg ?? '.');
const mode = process.argv.find((arg) => arg.startsWith('--mode='))?.split('=')[1] ?? 'production';
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');
const kb = JSON.parse(read('data/knowledge-library.json'));
const policy = JSON.parse(read('data/knowledge-governance.json'));
const violations = []; const add=(s,r,rule,m)=>violations.push({s,r,rule,m});
const filled=(rec,f)=>{const v=rec[f]; if(v==null)return false; if(typeof v==='string')return v.trim().length>0; if(Array.isArray(v))return v.length>0; if(typeof v==='object')return Object.keys(v).length>0; return true;};
const missing=(rec)=> (policy.requiredFieldsByType[rec.recordType]??policy.requiredFieldsByType.default).filter(f=>!filled(rec,f));
const evidenceIds=(rec)=>Array.isArray(rec.evidence)?rec.evidence.map(e=>typeof e==='string'?e:String(e.sourceId??e.source??'')).filter(Boolean):[];
const posture=(id)=>policy.approvedEvidencePrefixes.some(p=>id.startsWith(p))?'approved':policy.discoveryEvidencePrefixes.some(p=>id.startsWith(p))?'discovery':'unknown';
const records=[...kb.architectureStyles,...kb.patterns];
let reviewedComplete=0, approved=0;
for (const rec of records){
  if(!policy.lifecycle.includes(String(rec.status))) add('blocker',rec.id,'LIFECYCLE_STATUS',`status '${rec.status}'`);
  const miss=missing(rec); const ids=evidenceIds(rec);
  const hasApprovedEv=ids.map(posture).includes('approved');
  const predicate = policy.reviewedStatuses.includes(rec.status) && !miss.length && hasApprovedEv && filled(rec,'owner') && !!(rec.reviewedAt||rec.reviewDate);
  if(predicate) reviewedComplete++;
  if(policy.reviewedStatuses.includes(rec.status) && !predicate) add('blocker',rec.id,'COUNTING_PREDICATE',`status '${rec.status}' without substance: ${[...miss, ...(!hasApprovedEv?['approved evidence']:[]), ...(!filled(rec,'owner')?['owner']:[]), ...(!(rec.reviewedAt||rec.reviewDate)?['reviewedAt']:[])].join(', ')}`);
  if(policy.approvedStatuses.includes(rec.status)){ approved++;
    if(!ids.map(posture).includes('approved')) add('blocker',rec.id,'DISCOVERY_ONLY_EVIDENCE','no approved-posture evidence');
  }
}
// calibration truthfulness: draft matrices may exist for expert review, but only approved calibrations may score.
const rated=new Set(); kb.architectureStyles.forEach(s=>Object.keys(s.qualityAttributeRatings).forEach(k=>rated.add(k)));
let productionCalibrationCount=0, draftCalibrationCount=0;
for(const q of kb.qualityAttributes){
  if(typeof q.calibrated!=='boolean') add('blocker',q.id,'CALIBRATED_FLAG_MISSING','');
  if(/^QA-\d+$/.test(q.id)) add('blocker',q.id,'LEGACY_ATTRIBUTE_ID','');
  if(q.calibrated===true){
    productionCalibrationCount++;
    if(!rated.has(q.id)) add('blocker',q.id,'PRODUCTION_CALIBRATION_RATING_MISSING','');
    if(q.calibrationStatus!=='production') add('blocker',q.id,'PRODUCTION_CALIBRATION_STATUS_INVALID',String(q.calibrationStatus));
  } else {
    draftCalibrationCount++;
    if(q.calibrationStatus!=='draft-ai') add('blocker',q.id,'DRAFT_CALIBRATION_STATUS_INVALID',String(q.calibrationStatus));
    if(!/independent expert review/i.test(String(q.calibrationOwner??''))) add('blocker',q.id,'DRAFT_CALIBRATION_AUTHORITY_INVALID',String(q.calibrationOwner??''));
  }
}
if(mode==='production' && (productionCalibrationCount!==8 || draftCalibrationCount!==12)) add('blocker','quality-calibration','CALIBRATION_PORTFOLIO_INVALID',`production=${productionCalibrationCount}, draft=${draftCalibrationCount}`);

// Production Pattern DNA release gate: count only approved, evidence-bearing, release-bound records.
let productionCorpusCount=0, productionCorpusRelease='UNPUBLISHED';
const corpusPath='data/sprint7_8-pattern-intelligence.json';
if(mode==='production'){
  if(!fs.existsSync(path.join(root,corpusPath))) add('blocker','pattern-corpus','PRODUCTION_CORPUS_MISSING',corpusPath);
  else {
    const corpusDoc=JSON.parse(read(corpusPath)); const corpus=Array.isArray(corpusDoc)?corpusDoc:(corpusDoc.records??[]);
    const eligible=corpus.filter(rec=>rec.lifecycle==='approved' && rec.review?.releaseId && Array.isArray(rec.evidence) && rec.evidence.length>0);
    productionCorpusCount=eligible.length;
    const releases=[...new Set(eligible.map(rec=>rec.review.releaseId))];
    productionCorpusRelease=releases.length===1?releases[0]:'INCONSISTENT';
    if(productionCorpusCount < Number(policy.productionGate.target??200)) add('blocker','pattern-corpus','PRODUCTION_TARGET_NOT_MET',`${productionCorpusCount}/${policy.productionGate.target}`);
    if(releases.length!==1) add('blocker','pattern-corpus','PRODUCTION_RELEASE_INCONSISTENT',releases.join(','));
    if(corpusDoc.releaseId && releases.length===1 && corpusDoc.releaseId!==releases[0]) add('blocker','pattern-corpus','CORPUS_MANIFEST_RELEASE_MISMATCH',`${corpusDoc.releaseId} != ${releases[0]}`);
  }
}

// contradictions in approved claims (context-split doctrine)
const claimsPath='data/sprint7_7-approved-claims.json';
if(fs.existsSync(path.join(root,claimsPath))){
  try{ const doc=JSON.parse(read(claimsPath)); const claims=doc.claims??doc??[];
    const groups=new Map();
    for(const c of claims){ const key=`${c.subject??c.subjectId}::${c.predicate}`; (groups.get(key)??groups.set(key,[]).get(key)).push(c); }
    for(const [key,g] of groups){ const sup=g.filter(c=>(c.polarity??'supports')==='supports'&&!(c.conditions?.length)); const opp=g.filter(c=>c.polarity==='opposes'&&!(c.conditions?.length));
      if(sup.length&&opp.length) add('blocker',key,'UNRESOLVED_CONTRADICTION','context split required; no silent winner'); }
    console.log(`claims scanned: ${claims.length}`);
  }catch{ add('warning',claimsPath,'CLAIMS_UNPARSEABLE','skipped'); }
}
// three-pin release manifest
const manPath='data/knowledge-release-manifest.json';
if(!fs.existsSync(path.join(root,manPath))) add('blocker','release','RELEASE_MANIFEST_MISSING','run scripts/build-release-manifest.mjs');
else { const man=JSON.parse(read(manPath)); const sha=(p)=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,p))).digest('hex');
  if(man.pins.knowledgeLibrarySha256!==sha('data/knowledge-library.json')) add('blocker','release','RELEASE_PIN_MISMATCH','library changed after pinning — rebuild manifest');
  if(!man.embeddingModel) add('blocker','release','EMBEDDING_MODEL_UNPINNED','');
}
const blockers=violations.filter(v=>v.s==='blocker');
for(const v of violations) console.log(`${v.s.toUpperCase().padEnd(7)} ${v.rule.padEnd(26)} ${v.r} ${v.m}`);
console.log(`\nmode=${mode} records=${records.length} approved=${approved} reviewedComplete(strict)=${reviewedComplete} / productionGate target=${policy.productionGate.target}`);
console.log(`calibration production=${productionCalibrationCount} draft=${draftCalibrationCount}`);
if(mode==='production') console.log(`patternCorpus approved=${productionCorpusCount}/${policy.productionGate.target} release=${productionCorpusRelease}`);
console.log(`blockers=${blockers.length} warnings=${violations.length-blockers.length}`);
console.log(blockers.length?'RELEASE BLOCKED':'RELEASE ALLOWED');
process.exit(blockers.length?1:0);
