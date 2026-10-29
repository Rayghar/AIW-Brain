// Search exact originals already held by this project. This is a read projection of the
// existing knowledge store, not a second corpus or a promotion into governed knowledge.
import {sha256} from './public/brain-integrity.js';
import {knowledgeState} from './public/knowledge-governance.js';

const list=x=>Array.isArray(x)?x:[];
const words=x=>[...new Set(String(x||'').normalize('NFKC').toLocaleLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}_-]{1,39}/gu)||[])].slice(0,16);
const key=x=>sha256(JSON.stringify(x)).slice(0,32);

export function hostedKnowledgeCorpus(p){
 const s=knowledgeState(p),withdrawn=new Set(list(s.withdrawals).map(w=>w.targetId)),superseded=new Set(list(s.sources).map(x=>x.supersedes).filter(Boolean));
 const files=[],passages=[];let omitted=0;
 for(const source of list(s.sources)){
  if(withdrawn.has(source.id)||superseded.has(source.id))continue;
  if(typeof source.body!=='string'||!source.body||sha256(source.body)!==source.hash){omitted++;continue;}
  const revisionId='revision-'+key(['project-original',p.id,source.id,source.revision,source.hash]);
  const revision={revisionId,connectorId:source.connectorId||'PROJECT-SOURCES',repository:source.repository||'Project sources',commit:source.revision||'Saved original',path:source.path||source.title||source.id,fileSha256:source.hash,bytes:new TextEncoder().encode(source.body).length,title:source.title||source.id,findings:[],sourceId:source.id,transport:'project',connector:{name:source.repository||'Project sources',lifecycle:'saved original'},licence:{usePolicy:source.license||'Review permitted use',reviewStatus:'not-inferred',finalDisposition:'not-inferred',spdx:'',clearance:'not-reviewed'},retrieval:{retrievable:false,reason:'already-saved',explanation:'The exact original is already saved in this project.'},savedSourceId:source.id,command:null};
  files.push(revision);
  const lines=source.body.split('\n'),own=[];let heading=source.title||source.id;
  for(let start=0;start<lines.length;){
   if(lines[start].length>12000){omitted++;start++;continue;}
   let end=start,chars=0;
   while(end<lines.length&&end-start<36&&chars+lines[end].length+1<=12000){chars+=lines[end].length+1;end++;if(chars>=2400)break;}
   if(end===start){start++;continue;}
   for(let i=start;i<end;i++)if(/^#{1,6}\s+/.test(lines[i]))heading=lines[i].replace(/^#{1,6}\s+/,'').slice(0,240);
   const excerpt=lines.slice(start,end).join('\n');
   if(excerpt.trim())own.push({passageId:'passage-'+key([revisionId,start+1,end]),lineStart:start+1,lineEnd:end,heading,excerptSha256:sha256(excerpt),verified:true,status:'verified-original',snippet:excerpt.slice(0,500),excerpt,concepts:[],previous:null,next:null,revision});
   start=end;
  }
  own.forEach((x,i)=>{x.previous=own[i-1]?.passageId||null;x.next=own[i+1]?.passageId||null;});passages.push(...own);
 }
 const connectors=[...new Map(files.map(f=>[f.connectorId,{connectorId:f.connectorId,repository:f.repository,name:f.connector.name,lifecycle:'saved original',documents:files.filter(x=>x.connectorId===f.connectorId).length}])).values()];
 return {files,passages,status:{connected:files.length>0,configured:false,transport:'project',scope:'Current originals saved in this project',storeId:'project:'+p.id,cursor:null,builtAt:null,counts:{connectors:connectors.length,documents:files.length,passages:passages.length,retrievable:0,omitted},connectors,authority:'discovery-only',productionAccepted:false}};
}

export function searchHostedKnowledge(corpus,{q='',connector='',page=1,mode='all'}={}){
 const terms=words(q),normal=x=>String(x).normalize('NFKC').toLocaleLowerCase(),matches=x=>!terms.length||(mode==='any'?terms.some(t=>normal(x).includes(t)):terms.every(t=>normal(x).includes(t)));
 const selected=corpus.passages.filter(x=>(!connector||x.revision.connectorId===connector)&&matches(x.heading+'\n'+x.excerpt+'\n'+x.revision.path));
 const counts=new Map(),ranked=selected.map(x=>({x,rank:terms.reduce((n,t)=>n+(normal(x.heading).includes(t)?4:0)+(normal(x.excerpt).includes(t)?1:0),0)})).sort((a,b)=>b.rank-a.rank||a.x.revision.sourceId.localeCompare(b.x.revision.sourceId)||a.x.lineStart-b.x.lineStart).map(y=>y.x).filter(x=>{const n=counts.get(x.revision.revisionId)||0;counts.set(x.revision.revisionId,n+1);return n<2;});
 const pageSize=20,total=ranked.length,current=Math.max(1,Math.min(Math.max(1,Math.ceil(total/pageSize)),Math.floor(Number(page)||1)));
 return {authority:'discovery-only',transport:'project',scope:corpus.status.scope,query:String(q).slice(0,300),total,page:current,pageSize,results:ranked.slice((current-1)*pageSize,current*pageSize),files:corpus.files.filter(x=>(!connector||x.connectorId===connector)&&matches(x.title+' '+x.path)).slice(0,20)};
}
