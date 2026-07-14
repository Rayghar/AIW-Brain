#!/usr/bin/env node
// Evaluation gate (C1 seed) — zero-dep. Mirrors PRODUCTION scoring semantics:
// only attributes with calibrationStatus 'production' influence ranking.
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(process.argv[2] ?? '.');
const kb = JSON.parse(fs.readFileSync(path.join(root,'data/knowledge-library.json'),'utf8'));
const suite = JSON.parse(fs.readFileSync(path.join(root,'data/evaluation-scenarios.json'),'utf8'));
const production = new Set(kb.qualityAttributes.filter(q=>q.calibrationStatus==='production').map(q=>q.id));
const SPECIAL = { 'STYLE-PIPELINE':'dataPipeline','STYLE-MICROKERNEL':'pluginPlatform' };
function rank(drivers, shapes){
  const prio = Object.entries(drivers).filter(([a,w])=>w>0 && production.has(a));
  const tw = prio.reduce((s,[,w])=>s+w,0)||1;
  return kb.architectureStyles.map(s=>({id:s.id,
      app: !SPECIAL[s.id] || (shapes??[]).includes(SPECIAL[s.id]),
      // engine-mirror: declared problem-shape affinity boosts the special-purpose style
      sc: prio.reduce((sum,[a,w])=>sum+(s.qualityAttributeRatings[a]??3)*w,0)/(tw*5)
          + (SPECIAL[s.id] && (shapes??[]).includes(SPECIAL[s.id]) ? 0.15 : 0)}))
    .sort((a,b)=>(b.app-a.app)||(b.sc-a.sc));
}
let pass=0; const failures=[];
for(const sc of suite.scenarios){
  const leader = rank(sc.drivers, sc.context?.problemShapes).filter(r=>r.app)[0]?.id;
  if(sc.expectedLeaders.includes(leader)) pass++;
  else failures.push(`${sc.id} ${sc.name}: leader=${leader} expected one of [${sc.expectedLeaders.join(', ')}]`);
}
for(const f of failures) console.log('FAIL  '+f);
console.log(`\nevaluation scenarios: ${pass}/${suite.scenarios.length} pass (production-calibrated attributes: ${production.size}/20)`);
console.log(`expert-acceptance target: top-3 >= ${suite.expertAcceptance.targetTop3AcceptanceRate*100}% — records to be appended per release by the review panel`);
process.exit(failures.length?1:0);
