// A discovery projection over Chapter 6 capabilities and Chapter 7 option/selection records.
// A catalogue entry is descriptive: documentation explains a mechanism, while only an architect's
// recorded comparison says how it applies to this design. The authoritative choice, rationale,
// specification and approval stay in technologyRealisation, never in this projection.
import {TRAITS} from './product-knowledge.js';
import {PRODUCT_PACK,productsAvailable,traitReceipt} from './model-knowledge.js';
import {selectionState,selectionLabel} from './technology-realisation-domain.js';
import {libraryCurrent} from './guidance-record.js';

const DEFINITIONS = [
  {id:'postgresql',name:'PostgreSQL',category:'transactional',summary:'Relational transactional data store.',documentation:'https://www.postgresql.org/docs/current/',aliases:['postgresql','postgres']},
  {id:'mysql',name:'MySQL',category:'transactional',summary:'Relational transactional data store; assess the storage engine and operating topology.',documentation:'https://dev.mysql.com/doc/refman/8.4/en/',aliases:['mysql']},
  {id:'mongodb',name:'MongoDB',category:'transactional',summary:'Document data store; assess indexes, transactions and sharding for the workload.',documentation:'https://www.mongodb.com/docs/manual/',aliases:['mongodb','mongo']},
  {id:'kafka',name:'Apache Kafka',category:'messaging',summary:'Partitioned event log with retained records and consumer replay.',documentation:'https://kafka.apache.org/43/',aliases:['apache kafka','kafka']},
  {id:'rabbitmq',name:'RabbitMQ',category:'messaging',summary:'Message broker with queues and stream options; choose the queue type explicitly.',documentation:'https://www.rabbitmq.com/docs',aliases:['rabbitmq','rabbit mq']},
  {id:'redis',name:'Redis',category:'caching',summary:'In-memory data store commonly considered for cache and fast state access.',documentation:'https://redis.io/docs/latest/',aliases:['redis']},
  {id:'memcached',name:'Memcached',category:'caching',summary:'Distributed in-memory key-value cache with disposable entries.',documentation:'https://docs.memcached.org/',aliases:['memcached']},
  {id:'kubernetes',name:'Kubernetes',category:'compute',summary:'Container orchestration platform; operating responsibilities vary by service.',documentation:'https://kubernetes.io/docs/concepts/overview/',aliases:['kubernetes']},
  {id:'kong',name:'Kong Gateway',category:'connectivity',summary:'API gateway; assess configured plugins and the service boundary.',documentation:'https://docs.konghq.com/gateway/',aliases:['kong gateway','kong']},
  {id:'nginx',name:'NGINX',category:'connectivity',summary:'Reverse proxy and web server with configurable request controls.',documentation:'https://nginx.org/en/docs/',aliases:['nginx']},
  {id:'keycloak',name:'Keycloak',category:'identity',summary:'Identity and access management service.',documentation:'https://www.keycloak.org/documentation',aliases:['keycloak']},
  {id:'opentelemetry',name:'OpenTelemetry',category:'observability',summary:'Telemetry instrumentation and collection framework.',documentation:'https://opentelemetry.io/docs/',aliases:['opentelemetry']},
  {id:'pgbackrest',name:'pgBackRest',category:'backup',summary:'Backup and restore tooling for PostgreSQL.',documentation:'https://pgbackrest.org/',aliases:['pgbackrest']},
  {id:'patroni',name:'Patroni',category:'recovery',summary:'PostgreSQL high availability orchestration; verify its supporting consensus store.',documentation:'https://patroni.readthedocs.io/',aliases:['patroni']}
];

export const TECHNOLOGY_PRODUCTS=Object.freeze(DEFINITIONS.map(({aliases,...d})=>Object.freeze({...d})));
const normalize=v=>String(v||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,' ');
// Knowledge scoped to a named product must match an exact catalogue alias.
// A description containing the word Kafka is not necessarily Apache Kafka.
export const technologyProductIdentity=value=>{
 const name=normalize(value);if(!name)return '';
 return DEFINITIONS.find(d=>d.aliases.some(a=>normalize(a)===name))?.id||'custom:'+name.replace(/ /g,'-');
};
export const technologyProductsMentioned=text=>{
 const words=' '+normalize(text)+' ';
 const mentioned=new Set();let qualified=false;
 for(const d of DEFINITIONS)for(const alias of d.aliases){
  const token=' '+normalize(alias)+' ';let offset=0,index;
  while((index=words.indexOf(token,offset))!==-1){
   const before=words.slice(Math.max(0,index-18),index),after=words.slice(index+token.length);
   if(/compatible with $/.test(before)||/^(compatible|like|style|equivalent|protocol)\b/.test(after))qualified=true;
   else mentioned.add(d.id);
   offset=index+token.length-1;
  }
 }
 // "Kafka-compatible service" is a distinct product, even though it names
 // Kafka. Keep scoped product claims out until the architect asks for Kafka
 // itself or gives the compatible service its own reviewed claim.
 if(qualified&&!mentioned.size)mentioned.add('custom:qualified-product');
 return mentioned;
};
const byName=(v)=>{const name=' '+normalize(v)+' ';return DEFINITIONS.find(d=>d.aliases.some(a=>name.includes(' '+normalize(a)+' ')))||null;};
const assumptions=o=>({version:o.version||'',tier:o.serviceTier||'',operatingModel:o.operatingModel||'',topology:o.topology||'',instances:o.replicaCount??'',failureDomains:o.failureDomains||'',workload:o.workloadProfile||'',configurationBasis:o.specEvidence||''});
const provenance=available=>({kind:'bundled-reference',status:available?'Descriptive suggestion':'Source pack withdrawn',packId:PRODUCT_PACK.id,note:available?'Official product documentation is linked for discovery. No product is approved, suitable, deployed, or measured by appearing in this catalogue.':'The product mechanism pack was withdrawn from this project. Documentation remains a locator; its mechanisms are not used as suggestions.'});
const sourceVersion=src=>/^https:\/\/kafka\.apache\.org\/43\//.test(src)?'4.3':/^https:\/\/dev\.mysql\.com\/doc\/refman\/8\.4\//.test(src)?'8.4':'';
const mechanisms=(d,available)=>available?TRAITS.filter(t=>t.product.test(d.name)).map(t=>({id:t.id,attributes:[...t.attrs],effect:t.effect,text:t.text,source:t.src,sourceVersion:sourceVersion(t.src),receipt:traitReceipt(t),condition:t.effect==='ceiling'?'The stated topology and an architect-owned capacity assumption must apply.':'Check the stated configuration and source version in this project.'})):[];
function versionMismatch(entry,option){
 const recorded=String(option.version||'').trim();if(!recorded)return '';
 const documented=[...new Set(entry.mechanisms.map(m=>m.sourceVersion).filter(Boolean))];
 const differs=documented.filter(v=>recorded!==v&&!recorded.startsWith(v+'.'));
 return differs.length?`Option specifies ${entry.name} version ${recorded}; bundled mechanism documentation cites version ${differs.join(', ')}. Verify applicability for this option version before relying on these mechanisms.`:'';
}
const guidance=p=>(p.workbench?.catalogue||[]).filter(e=>e.kind==='technology').map(e=>({id:e.id,title:e.title,owner:e.owner||'',status:e.status||'draft',revision:e.revision,sourceId:e.sourceId||'',current:libraryCurrent(p,e),organization:e.organization?.id||'',note:'Reusable guidance requires an explicit Chapter 7 adaptation and comparison before selection.'}));
const driverImpacts=(p,o)=>{const drivers=new Map((p.quality?.drivers||[]).map(d=>[d.id,d]));return Object.entries(o.assessments||{}).flatMap(([id,a])=>{const d=drivers.get(id);return d?[{driverId:id,driver:d.title||id,attribute:d.category||'',effect:a.effect||'unknown',reason:a.reason||'',evidence:a.evidence||'',status:'Architect judgement recorded in this option; verify its applicability and source.'}]:[];});};

function catalogueProjection(p,only=null){
  const available=productsAvailable(p),records=new Map(DEFINITIONS.filter(d=>!only||d.id===only).map(d=>[d.id,{id:d.id,name:d.name,category:d.category,summary:d.summary,documentation:d.documentation,mechanisms:mechanisms(d,available),provenance:provenance(available),assumptions:assumptions({}),uses:[]}]));
  const mappings=new Map();for(const m of p.technologyRealisation?.mappings||[]){if(!mappings.has(m.realizationId))mappings.set(m.realizationId,[]);mappings.get(m.realizationId).push(m.capabilityId);}
  const caps=new Map((p.technology?.capabilities||[]).map(c=>[c.id,c]));
  for(const r of p.technologyRealisation?.records||[]){
    const capabilityIds=mappings.get(r.id)||[];
    for(const o of r.options||[]){
      if(!o.product?.trim())continue;
      const def=byName(o.product),id=def?.id||'custom:'+normalize(o.product).replace(/ /g,'-');
      if(only&&id!==only)continue;
      if(!records.has(id))records.set(id,{id,name:o.product,category:caps.get(capabilityIds[0])?.category||'other',summary:'Project option; review its Chapter 7 comparison and source.',documentation:/^https:\/\//i.test(o.sourceUrl||'')?o.sourceUrl:'',mechanisms:[],provenance:{kind:'project-option',status:'Project-specific option',note:'Its name and product fields come from this project; there is no bundled mechanism or approval.'},assumptions:assumptions({}),uses:[]});
      const entry=records.get(id),selected=r.selectedOptionId===o.id,state=selected?selectionState(p,r):'candidate',recorded=state==='recorded'||state==='approved',approved=state==='approved';
      entry.uses.push({realizationId:r.id,realizationRef:r.ref||r.id,realizationTitle:r.title||'',optionId:o.id,optionTitle:o.title||'',product:o.product,capabilityIds:[...capabilityIds],capabilities:capabilityIds.map(x=>caps.get(x)?.title||x),selected,recorded,approved,needsReview:state==='stale',status:selected?selectionLabel(p,r):'Candidate option',rationale:selected?r.rationale||'':'',drawbacks:o.drawbacks||'',benefits:o.benefits||'',evidence:o.evidence||'',sourceUrl:o.sourceUrl||'',assumptions:assumptions(o),driverImpacts:driverImpacts(p,o),sourceVersionMismatch:versionMismatch(entry,o),sourceStatus:o.origin==='reference'?'Illustrative reference option':'Project option; evaluate source and applicability'});
    }
  }
  const entries=[...records.values()],capabilities=[...new Set([...DEFINITIONS.map(d=>d.category),...entries.map(e=>e.category)])].map(id=>({id,name:id.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()),products:entries.filter(e=>e.category===id).length,used:entries.filter(e=>e.category===id&&e.uses.length).length}));
  return {entries,capabilities,guidance:guidance(p),counts:{products:entries.length,candidates:entries.reduce((n,e)=>n+e.uses.length,0),selections:entries.reduce((n,e)=>n+e.uses.filter(u=>u.recorded).length,0),approvals:entries.reduce((n,e)=>n+e.uses.filter(u=>u.approved).length,0)},posture:'Browse products and documented mechanisms here. Record suitability, rationale, specification, and approval in Chapter 7; verify quality targets through observations.'};
}

export const technologyCatalogue=p=>catalogueProjection(p);
export function findTechnologyProduct(p,idOrName){const name=String(idOrName||''),known=DEFINITIONS.find(d=>d.id===name)||byName(name),id=known?.id||(name.startsWith('custom:')?name:'custom:'+normalize(name).replace(/ /g,'-'));return catalogueProjection(p,id).entries[0]||null;}
export function technologyProductUsage(p,idOrName){return findTechnologyProduct(p,idOrName)?.uses||[];}
