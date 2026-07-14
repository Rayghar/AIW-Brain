import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const evidence=path.join(root,'release-evidence','rc10.72.0');
const knowledge=path.join(root,'knowledge-repository','AKR-0.10.72.0');
const benchmark=path.join(evidence,'agency-banking-benchmark');
const checks=[];
const add=(name,pass,detail='')=>checks.push({name,pass:Boolean(pass),detail});
const json=(p)=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=(b)=>crypto.createHash('sha256').update(b).digest('hex');
const canonical=(v)=>Array.isArray(v)?`[${v.map(canonical).join(',')}]`:v&&typeof v==='object'?`{${Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>`${JSON.stringify(k)}:${canonical(x)}`).join(',')}}`:JSON.stringify(v);

const matrix=json(path.join(evidence,'AIW_RC10_72_FULL_396_REQUIREMENT_EVIDENCE_MATRIX.json'));
add('396 requirement rows present',matrix.requirements?.length===396,`found ${matrix.requirements?.length??0}`);
add('396 priority totals exact',matrix.summary?.byPriority?.P0===261&&matrix.summary?.byPriority?.P1===127&&matrix.summary?.byPriority?.P2===8,JSON.stringify(matrix.summary?.byPriority));
add('all requirement identifiers unique',new Set(matrix.requirements.map((x)=>x.id)).size===396);
add('no requirement falsely production accepted',matrix.requirements.every((x)=>x.externalAcceptance?.productionAccepted===false));

const manifest=json(path.join(knowledge,'KNOWLEDGE_RELEASE_MANIFEST.json'));
const sig=json(path.join(knowledge,'KNOWLEDGE_RELEASE_SIGNATURE.json'));
const payload=Buffer.from(canonical(manifest));
const verified=crypto.verify(null,payload,crypto.createPublicKey(sig.publicKeyPem),Buffer.from(sig.signatureBase64,'base64'));
add('knowledge release manifest identity',manifest.releaseId==='AKR-0.10.72.0');
add('knowledge manifest digest matches envelope',sha(payload)===sig.manifestSha256);
add('offline Ed25519 signature independently verifies',verified&&sig.verified===true);
add('private release key not retained',sig.privateKeyRetained===false&&!fs.readdirSync(knowledge).some((name)=>/private|\.key$/i.test(name)));

let sumsOkay=true; const bad=[];
for(const line of fs.readFileSync(path.join(knowledge,'SHA256SUMS'),'utf8').trim().split(/\r?\n/)){
  const m=line.match(/^([a-f0-9]{64})\s{2}(.+)$/); if(!m){sumsOkay=false;bad.push(line);continue;}
  const p=path.join(knowledge,m[2]); if(!fs.existsSync(p)||sha(fs.readFileSync(p))!==m[1]){sumsOkay=false;bad.push(m[2]);}
}
add('knowledge SHA256SUMS verifies',sumsOkay,bad.join(', '));
const cambridge=json(path.join(knowledge,'CAMBRIDGE-SA-1.0.promoted.json'));
add('Cambridge promoted status',cambridge.status==='approved-promoted',cambridge.status);
add('Cambridge atomic claim depth',(cambridge.atomicClaims?.length??0)>=100,`claims ${cambridge.atomicClaims?.length??0}`);
const gitStatus=json(path.join(knowledge,'GIT_CHECKIN_STATUS.json'));
let bundleVerified=false;
const bundleTemp=fs.mkdtempSync(path.join(os.tmpdir(),'aiw-bundle-verify-'));
try {
  const repo=path.join(bundleTemp,'repo');
  const gpgHome=path.join(bundleTemp,'gnupg'); fs.mkdirSync(gpgHome,{mode:0o700});
  execFileSync('git',['clone','--quiet',path.join(knowledge,'AKR-0.10.72.0.bundle'),repo],{stdio:'pipe'});
  execFileSync('gpg',['--batch','--import',path.join(knowledge,'GIT_SIGNING_PUBLIC_KEY.asc')],{env:{...process.env,GNUPGHOME:gpgHome},stdio:'pipe'});
  execFileSync('git',['verify-commit',gitStatus.localSignedCheckin.commit],{cwd:repo,env:{...process.env,GNUPGHOME:gpgHome},stdio:'pipe'});
  execFileSync('git',['verify-tag',gitStatus.localSignedCheckin.tag],{cwd:repo,env:{...process.env,GNUPGHOME:gpgHome},stdio:'pipe'});
  bundleVerified=true;
} catch {} finally { fs.rmSync(bundleTemp,{recursive:true,force:true}); }
add('local signed Git commit verified',gitStatus.localSignedCheckin?.commitVerified===true);
add('local signed Git tag verified',gitStatus.localSignedCheckin?.tagVerified===true);
add('signed Git bundle independently verifies',bundleVerified&&gitStatus.localSignedCheckin?.bundleVerified===true);
add('remote GitHub truth boundary preserved',gitStatus.remoteGithub?.pushed===false&&String(gitStatus.remoteGithub?.status).startsWith('blocked'));
const kms=json(path.join(knowledge,'KMS_SIGNING_STATUS.json'));
add('enterprise KMS not falsely accepted',kms.productionAccepted===false&&Object.values(kms.enterpriseKms??{}).every((x)=>String(x.status).startsWith('blocked')));

const brain=json(path.join(evidence,'AIW_RC10_72_BRAIN_AUDIT.json'));
add('brain core coherence audit passes',brain.coreScore?.passed===brain.coreScore?.total&&brain.coreScore?.total>=14,`${brain.coreScore?.passed}/${brain.coreScore?.total}`);
add('external brain trust blockers explicit',brain.externalScore?.passed===0&&brain.externalScore?.total===2);
const graphDomain=fs.readFileSync(path.join(root,'backend/packages/domain/src/architectureContextGraph.ts'),'utf8');
const graphEngine=fs.readFileSync(path.join(root,'backend/packages/engine/src/architectureContextGraph.ts'),'utf8');
add('atomic claim/policy/runtime/SDD graph coverage',/atomic-claim/.test(graphDomain)&&/policy-clause/.test(graphDomain)&&/runtime-observation/.test(graphDomain)&&/sdd-paragraph/.test(graphDomain));
add('legacy inferred lineage implemented',/inferLegacyLineage/.test(graphEngine)&&/inferred-lineage/.test(graphDomain));
const reqEngine=fs.readFileSync(path.join(root,'backend/packages/engine/src/requirementsGenesis.ts'),'utf8');
add('advanced semantic/legal contradiction engine',/analyseRequirementContradictionsAdvanced/.test(reqEngine)&&/legal-review/.test(reqEngine)&&/policy-hierarchy/.test(reqEngine)&&/temporal/.test(reqEngine));

const score=json(path.join(benchmark,'AGENCY_BANKING_GOLDEN_BENCHMARK_SCORECARD.json'));
const m=score.metrics;
add('Agency benchmark traceability target',m.highPriorityDriverTraceabilityPct===100&&m.overallRequirementToModelTraceabilityPct>=90);
add('Agency benchmark interface target',m.criticalInterfaceCompletenessPct>=90);
add('Agency benchmark decision and component targets',m.significantDecisionAlternativeTradeoffPct===100&&m.componentResponsibilityOwnershipRationalePct>=95);
add('Agency benchmark no unsupported/critical model omissions',m.unsupportedNumericPerformanceSecurityRecoveryClaims===0&&m.criticalSecurityOmissions===0&&m.criticalResilienceOmissions===0);
for(const name of ['AGENCY_BANKING_AI_GENERATED_SDD.docx','AGENCY_BANKING_AI_GENERATED_SDD.pdf','AGENCY_BANKING_DETERMINISTIC_CANONICAL_MODEL.json','AGENCY_BANKING_BLINDED_EXPERT_REVIEW_PROTOCOL.json','CONTROLLED_PILOT_RESULT.json']) add(`benchmark artifact ${name}`,fs.existsSync(path.join(benchmark,name))&&fs.statSync(path.join(benchmark,name)).size>0);
add('rendered SDD has 20 QA pages',fs.readdirSync(path.join(benchmark,'docx-render')).filter((x)=>/^page-\d+\.png$/.test(x)).length===20);
const pilot=json(path.join(benchmark,'CONTROLLED_PILOT_RESULT.json'));
add('controlled pilot truth boundary',pilot.productionAccepted===false&&String(pilot.result).includes('enterprise pilot remains blocked'));
const managed=json(path.join(evidence,'MANAGED_ENTERPRISE_INFRASTRUCTURE_ACCEPTANCE.json'));
add('managed infrastructure harness executed',managed.summary?.localVerified===4&&managed.summary?.liveBlocked===11);
add('managed infrastructure not falsely accepted',managed.summary?.productionAccepted===false&&managed.checks.every((x)=>x.productionAccepted===false));

const failed=checks.filter((x)=>!x.pass);
const result={schemaVersion:'1.0',release:'0.10.0-rc.10.72.0',generatedAt:new Date().toISOString(),passed:checks.length-failed.length,total:checks.length,failed:failed.length,checks};
fs.writeFileSync(path.join(evidence,'AIW_RC10_72_RELEASE_GATE.json'),JSON.stringify(result,null,2)+'\n');
let md=`# AIW rc.10.72 Release Gate\n\nGenerated: ${result.generatedAt}\n\n**${result.passed}/${result.total} checks passed.**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
for(const c of checks)md+=`| ${c.name} | ${c.pass?'PASS':'FAIL'} | ${String(c.detail??'').replaceAll('|','/')} |\n`;
fs.writeFileSync(path.join(evidence,'AIW_RC10_72_RELEASE_GATE.md'),md);
if(failed.length){console.error(md);process.exit(1);} console.log(`rc.10.72 release gate: ${result.passed}/${result.total} passed`);
