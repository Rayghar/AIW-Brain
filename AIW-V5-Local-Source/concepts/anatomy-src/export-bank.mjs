// Regenerate bank.json from the AIW reference project: node concepts/anatomy-src/export-bank.mjs (run from the repo root)
// Export the real AIW reference project into the concept prototype's normalized shape.
import {writeFileSync} from 'node:fs';
import {seedProject} from '../../public/requirements-domain.js';
import {withFinalReview} from '../../public/review-domain.js';
import {architectureModel} from '../../public/architecture-model.js';
const p=withFinalReview(seedProject()),m=architectureModel(p);
const keep=new Set(['module','responsibility','component','capability','technology','runtime','instance','zone','environment','party','contract','data','control','threat','boundary','requirement','quality','decision','option','actor','journey']);
const trim=(s,n=220)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,n);
const objects=[...m.objects.values()].filter(o=>keep.has(o.type)).map(o=>{const a=o.attributes||{};const x={id:o.id,ref:o.ref||o.id,type:o.type,title:trim(o.title,90),description:trim(o.description,240),owner:o.owner||'',modules:o.moduleIds||[],shared:!!o.shared,status:o.status};
 if(o.type==='technology'){x.product=a.selectedProduct||'';x.selectedOptionId=a.selectedOptionId||a.preferredOptionId||'';}
 if(o.type==='option'){x.product=trim(a.title||o.title,60);}
 if(o.type==='runtime'){x.minReady=a.minReady;x.maxReplicas=a.maxReplicas;x.asset=a.assetId;}
 if(o.type==='instance'){x.replicas=a.replicas||1;x.role=a.role;x.zone=a.zoneId;}
 if(o.type==='contract'){x.style=a.style||a.kind||a.interactionType||'';x.timeout=a.timeoutPolicy||'';x.retry=a.retryPolicy||'';x.failure=a.failurePolicy||'';x.idempotency=a.idempotency||a.duplicatePolicy||a.duplicateHandling||'';}
 if(o.type==='data'){x.authority=a.authorityId||'';x.classification=a.classification||'';}
 if(o.type==='quality'){x.target=trim(a.target||a.measure||a.response||'',120);}
 if(o.type==='decision'){x.question=trim(a.question||o.title,140);x.state=a.status||a.state||'';}
 return x;});
const ids=new Set(objects.map(o=>o.id));
const types=new Set(['memberOf','realizedBy','requires','implementedBy','operatedAs','placedAs','locatedIn','interaction','owns','provides','uses','exchanges','protects','mitigates','threatens','withinBoundary','fulfils','constrains','justifies','considers','dependency','participates in','precedes']);
const rels=m.relationships.filter(r=>types.has(r.type)&&ids.has(r.from)&&ids.has(r.to)).map(r=>({type:r.type==='participates in'?'participates':r.type,from:r.from,to:r.to,label:trim(r.label,40),condition:trim(r.attributes?.condition||'',160)}));
const out={id:'bank-payment',title:'Bank Payment Journey',kind:'AIW reference project',note:'Exported from the AIW V5 reference project (illustrative content, not production architecture).',objects,rels};
writeFileSync(new URL('./bank.json',import.meta.url),JSON.stringify(out));
console.log(objects.length,'objects',rels.length,'rels');
const T=id=>objects.find(o=>o.id===id)?.type;
console.log(objects.filter(o=>o.type==='contract').map(o=>o.ref+' '+o.title+' ['+[o.style,o.timeout,o.retry,o.failure,o.idempotency].join(' | ').slice(0,120)+']').join('\n'));
console.log(objects.filter(o=>o.type==='technology').map(o=>o.ref+' '+o.title+' → '+(o.product||'-')+' '+o.selectedOptionId).join('\n'));
console.log(rels.filter(r=>r.type==='interaction').map(r=>r.from+'('+T(r.from)+')->'+r.to+'('+T(r.to)+') '+r.label).join('\n'));
console.log(objects.filter(o=>o.type==='runtime').map(o=>o.ref+' '+o.title+' asset='+o.asset+' '+o.minReady+'/'+o.maxReplicas).join('\n'));
console.log(objects.filter(o=>o.type==='data').map(o=>o.ref+' '+o.title+' auth='+o.authority).join('\n'));
