import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outDir = path.join(root, 'release-evidence/rc10.72.0');
fs.mkdirSync(outDir, { recursive: true });

const domains = [
  ['BR','Business and Product',12,8,4,0],['IAM','Identity, Tenancy and Access',14,9,4,1],['NAV','Information Architecture and Navigation',12,7,5,0],
  ['PRJ','Project, Cockpit, Branch and Portfolio',16,8,8,0],['LFC','Guided Lifecycle and Handoff',12,8,4,0],['BRF','Requirements and Architecture Brief',12,8,4,0],
  ['QDR','Quality Drivers and Scenarios',14,8,6,0],['SYN','Architecture Synthesis and Decisions',14,9,5,0],['CAN','Canonical Model and Canvas',22,13,8,1],
  ['LIB','Architecture Library and Pattern DNA',19,12,7,0],['INT','Intelligence, Brain Signals and LLM',25,21,4,0],['REV','Review, Governance and Fitness',18,14,4,0],
  ['SDD','Solution Delivery Documents',14,10,4,0],['COL','Collaboration and Stakeholders',10,0,8,2],['CON','Conformance, Drift and Runtime',18,11,6,1],
  ['KNW','Mind Factory and Knowledge Governance',23,14,9,0],['ADM','Administration and Control Plane',16,10,5,1],['DAT','Data, Persistence and Versioning',14,12,2,0],
  ['API','APIs and External Integration',14,8,5,1],['SEC','Security, Privacy and Sovereign',18,13,5,0],['NFR','Non-Functional and Quality',29,18,10,1],
  ['UXR','User Experience and Accessibility',18,13,5,0],['OPS','Deployment, Operations and Cost',16,12,4,0],['TST','Verification and Release Acceptance',16,15,1,0],
];
const sourceRoots = ['backend/apps','backend/packages','frontend/apps','frontend/packages','backend/config','frontend/config','deploy'];
const testRoots = ['backend/apps','backend/packages','frontend/tests','frontend/apps/web/tests','scripts/gates','backend/scripts/gates','frontend/scripts/gates'];
const allowed = new Set(['.ts','.tsx','.js','.mjs','.json','.yml','.yaml','.sql','.md']);
const excluded = new Set(['dist','node_modules','release-history','.git']);
function filesUnder(relRoots) {
  const result=[];
  for (const rel of relRoots) {
    const start=path.join(root,rel); if(!fs.existsSync(start)) continue;
    const walk=(dir)=>{ for(const entry of fs.readdirSync(dir,{withFileTypes:true})){ if(excluded.has(entry.name)) continue; const full=path.join(dir,entry.name); if(entry.isDirectory()) walk(full); else if(allowed.has(path.extname(entry.name).toLowerCase())) result.push(full); } };
    walk(start);
  }
  return [...new Set(result)];
}
const sourceFiles=filesUnder(sourceRoots); const testFiles=filesUnder(testRoots);
const cache=new Map();
function text(file){ if(!cache.has(file)){ try{cache.set(file,fs.readFileSync(file,'utf8'));}catch{cache.set(file,'');} } return cache.get(file); }
function refsFor(id, files){ return files.filter((file)=>text(file).includes(id)).map((file)=>path.relative(root,file).replaceAll('\\','/')).slice(0,12); }
const liveCredentialNames = Object.keys(process.env).filter((name)=>/AWS|AZURE|GCP|GOOGLE|VAULT|GITHUB|GH_|OPENAI|DATABASE_URL|POSTGRES|OIDC|OTEL|MINIO|S3|KMS/.test(name));
const externalPrefixes = new Set(['IAM','CON','KNW','ADM','DAT','API','SEC','OPS']);
const externalKeywords = /OIDC|SAML|tenant|KMS|sign|GitHub|repository|CI|telemetry|PostgreSQL|object storage|queue|backup|restore|provider|production|runtime|sovereign/i;

const requirements=[];
let globalIndex=0;
for(const [prefix,domain,total,p0,p1,p2] of domains){
  for(let i=1;i<=total;i++){
    const id=`${prefix}-${String(i).padStart(3,'0')}`; const priority=i<=p0?'P0':i<=p0+p1?'P1':'P2';
    const implementationRefs=refsFor(id,sourceFiles); const testEvidenceRefs=refsFor(id,testFiles).filter((item)=>/test|spec|gate|verify|acceptance/i.test(item));
    const evidenceText=[...implementationRefs,...testEvidenceRefs].join(' ');
    const likelyExternal=externalPrefixes.has(prefix)&&externalKeywords.test(evidenceText||domain);
    let status='evidence-review-required'; let rationale='No exact requirement-ID reference was found in the active source scan. This does not mean the capability is absent; it means row-level evidence from the historical 396 matrix must be reconciled against the current release.';
    if(implementationRefs.length&&testEvidenceRefs.length){ status='verified-current'; rationale='Requirement identifier is referenced by implementation and automated verification evidence in the current package.'; }
    else if(implementationRefs.length){ status='implemented-current'; rationale='Current implementation or configuration reference exists, but no requirement-specific executed verification reference was found.'; }
    else if(likelyExternal){ status='external-acceptance-blocked'; rationale='The requirement depends on a live enterprise/provider environment and no matching managed target and credential were available during this audit.'; }
    const productionAccepted=false;
    requirements.push({
      index:globalIndex++, id, domainPrefix:prefix, domain, priority,
      normativeSource:{document:'AIW Product Requirements & System Requirements Specification',version:'1.0',preparedDate:'2026-07-10',locator:id,textEmbedded:false,note:'The source baseline is referenced by stable requirement identifier; its full normative text remains in the controlled source document.'},
      status, implementationRefs, testEvidenceRefs, browserEvidenceRefs:[], configurationEvidenceRefs:implementationRefs.filter((item)=>/config|deploy|yml|yaml|sql|env/i.test(item)),
      externalAcceptance:{required:likelyExternal, executed:false, productionAccepted, missingCredentials:likelyExternal?liveCredentialNames.length===0:false},
      reviewerConclusion:rationale,
    });
  }
}
if(requirements.length!==396) throw new Error(`Expected 396 requirements, found ${requirements.length}`);
const byStatus=Object.fromEntries([...new Set(requirements.map((item)=>item.status))].map((status)=>[status,requirements.filter((item)=>item.status===status).length]));
const byPriority=Object.fromEntries(['P0','P1','P2'].map((priority)=>[priority,requirements.filter((item)=>item.priority===priority).length]));
const historicalByDomain={
  ADM:{verified:0,implemented:11,partial:0,external:5,deferred:0},API:{verified:6,implemented:5,partial:0,external:3,deferred:0},BR:{verified:7,implemented:5,partial:0,external:0,deferred:0},BRF:{verified:6,implemented:6,partial:0,external:0,deferred:0},CAN:{verified:2,implemented:20,partial:0,external:0,deferred:0},COL:{verified:0,implemented:10,partial:0,external:0,deferred:0},CON:{verified:0,implemented:12,partial:0,external:6,deferred:0},DAT:{verified:0,implemented:11,partial:0,external:3,deferred:0},IAM:{verified:1,implemented:11,partial:0,external:2,deferred:0},INT:{verified:15,implemented:0,partial:8,external:2,deferred:0},KNW:{verified:0,implemented:21,partial:0,external:2,deferred:0},LFC:{verified:5,implemented:0,partial:7,external:0,deferred:0},LIB:{verified:0,implemented:17,partial:0,external:2,deferred:0},NAV:{verified:11,implemented:0,partial:1,external:0,deferred:0},NFR:{verified:3,implemented:1,partial:16,external:8,deferred:1},OPS:{verified:2,implemented:4,partial:6,external:4,deferred:0},PRJ:{verified:8,implemented:8,partial:0,external:0,deferred:0},QDR:{verified:3,implemented:10,partial:0,external:1,deferred:0},REV:{verified:7,implemented:11,partial:0,external:0,deferred:0},SDD:{verified:5,implemented:8,partial:0,external:1,deferred:0},SEC:{verified:0,implemented:14,partial:0,external:4,deferred:0},SYN:{verified:0,implemented:14,partial:0,external:0,deferred:0},TST:{verified:6,implemented:0,partial:8,external:2,deferred:0},UXR:{verified:9,implemented:0,partial:9,external:0,deferred:0}
};
const byDomain=Object.fromEntries(domains.map(([prefix,domain])=>[prefix,{domain,total:requirements.filter((item)=>item.domainPrefix===prefix).length,currentExactVerified:requirements.filter((item)=>item.domainPrefix===prefix&&item.status==='verified-current').length,currentExactImplemented:requirements.filter((item)=>item.domainPrefix===prefix&&item.status==='implemented-current').length,currentExternalBlocked:requirements.filter((item)=>item.domainPrefix===prefix&&item.status==='external-acceptance-blocked').length,currentEvidenceReviewRequired:requirements.filter((item)=>item.domainPrefix===prefix&&item.status==='evidence-review-required').length,historicalRc10_50:historicalByDomain[prefix]}]));
const matrix={schemaVersion:'2.1',release:'0.10.0-rc.10.72.0',generatedAt:new Date().toISOString(),baseline:{normativeRequirementCount:396,p0:261,p1:127,p2:8,sourceDocument:'AIW Product Requirements & System Requirements Specification v1.0',sourceStatus:'controlled target-state baseline',historicalRc10_50:{verified:96,implementedNotFullyRuntimeVerified:199,partial:55,externalAcceptanceRequired:45,deferred:1,note:'Historical counts are retained as aggregate evidence only. Row-level statuses are not guessed where the historical CSV is not physically present in this worktree.'}},auditRule:'Current Verified requires requirement-specific implementation plus automated verification evidence. Historical evidence remains visible as a separate baseline. Production Accepted requires a successful live managed-environment acceptance record; none is inferred from source presence.',environment:{liveCredentialNames,managedEnvironmentAvailable:false},summary:{total:396,byStatus,byPriority,byDomain,historicalRc10_50:{verified:96,implementedNotFullyRuntimeVerified:199,partial:55,externalAcceptanceRequired:45,deferred:1}},requirements};
const stable=JSON.stringify(matrix,null,2)+'\n'; fs.writeFileSync(path.join(outDir,'AIW_RC10_72_FULL_396_REQUIREMENT_EVIDENCE_MATRIX.json'),stable);
const esc=(v)=>`"${String(v??'').replaceAll('"','""')}"`;
const headers=['Index','Requirement ID','Domain','Priority','Normative source locator','Audit status','Implementation evidence','Test evidence','Configuration evidence','External acceptance required','Executed','Production accepted','Reviewer conclusion'];
const csv=[headers.map(esc).join(',')];
for(const r of requirements) csv.push([r.index,r.id,r.domain,r.priority,r.normativeSource.locator,r.status,r.implementationRefs.join('; '),r.testEvidenceRefs.join('; '),r.configurationEvidenceRefs.join('; '),r.externalAcceptance.required,r.externalAcceptance.executed,r.externalAcceptance.productionAccepted,r.reviewerConclusion].map(esc).join(','));
fs.writeFileSync(path.join(outDir,'AIW_RC10_72_FULL_396_REQUIREMENT_EVIDENCE_MATRIX.csv'),csv.join('\n')+'\n');
let md=`# AIW rc.10.72 Full 396-Requirement Evidence Audit\n\nGenerated: ${matrix.generatedAt}\n\nThis matrix covers all 396 stable normative identifiers. It deliberately separates current exact-ID evidence, historical aggregate evidence and production acceptance.\n\n## Current exact-evidence summary\n\n| Measure | Count |\n|---|---:|\n| Total | 396 |\n| P0 | ${byPriority.P0} |\n| P1 | ${byPriority.P1} |\n| P2 | ${byPriority.P2} |\n| Verified by current requirement-specific implementation and test references | ${byStatus['verified-current']??0} |\n| Implemented with current exact-ID reference, pending exact verification | ${byStatus['implemented-current']??0} |\n| External acceptance blocked | ${byStatus['external-acceptance-blocked']??0} |\n| Evidence reconciliation required | ${byStatus['evidence-review-required']??0} |\n| Production accepted | 0 |\n\n## Historical rc.10.50 aggregate\n\n| Status | Count |\n|---|---:|\n| Verified | 96 |\n| Implemented, not fully runtime verified | 199 |\n| Partial | 55 |\n| External acceptance required | 45 |\n| Deferred | 1 |\n\n## Domain summary\n\n| Domain | Total | Current exact verified | Current exact implemented | External blocked | Evidence reconciliation | Historical V/I/P/E/D |\n|---|---:|---:|---:|---:|---:|---|\n`;
for(const [prefix,v] of Object.entries(byDomain)){ const h=v.historicalRc10_50; md+=`| ${prefix} — ${v.domain} | ${v.total} | ${v.currentExactVerified} | ${v.currentExactImplemented} | ${v.currentExternalBlocked} | ${v.currentEvidenceReviewRequired} | ${h.verified}/${h.implemented}/${h.partial}/${h.external}/${h.deferred} |\n`; }
md+=`\n## Critical boundary\n\nThe normative source document defines the target baseline; it is not implementation evidence. Historical rc.10.50 status counts are retained separately from the current exact-ID scan. Missing exact-ID references are classified as evidence-reconciliation work, not as proof that a capability is absent. This audit promotes no requirement to Production Accepted without a live target-environment result.\n`;
fs.writeFileSync(path.join(outDir,'AIW_RC10_72_FULL_396_REQUIREMENT_EVIDENCE_MATRIX.md'),md);
fs.writeFileSync(path.join(outDir,'requirements-audit-summary.json'),JSON.stringify(matrix.summary,null,2)+'\n');
const checksum=crypto.createHash('sha256').update(stable).digest('hex'); fs.writeFileSync(path.join(outDir,'AIW_RC10_72_FULL_396_REQUIREMENT_EVIDENCE_MATRIX.sha256'),`${checksum}  AIW_RC10_72_FULL_396_REQUIREMENT_EVIDENCE_MATRIX.json\n`);
console.log(JSON.stringify(matrix.summary,null,2));
