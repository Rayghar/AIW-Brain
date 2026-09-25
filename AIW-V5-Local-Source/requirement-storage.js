import {digest} from './public/brain-integrity.js';
const prefix=(owner,id)=>'requirements/'+encodeURIComponent(owner)+'/'+encodeURIComponent(id)+'/';
export async function readRequirements(env,owner,document,keys){
 const meta=document.requirementsStorage;
 if(meta){
  if(!env.FILES)throw Error('Private requirement storage is unavailable.');
  const read=async parts=>(await Promise.all(parts.map(async part=>{if(!part.key.startsWith(prefix(owner,document.id)))throw Error('Requirement storage does not belong to this project.');const file=await env.FILES.get(part.key);if(!file)throw Error('A saved requirement segment could not be loaded.');const data=JSON.parse(await file.text());if(data.length!==part.count||digest(data)!==part.hash)throw Error('A requirement segment failed its integrity check.');return data;}))).flat();
  document.artefacts=await read(meta.artefacts);document.relationships=await read(meta.relationships);keys.set('__requirement_parts',meta);delete document.requirementsStorage;
 }
 keys.set('__requirement_index',new Map((document.artefacts||[]).filter(a=>a.type==='requirement').map(a=>[a.id,projection(a)])));
}
export async function writeRequirements(env,owner,id,document,stored,keys,created){
 // Small legacy projects retain their original compact representation.
 if(document.artefacts.length<=250&&!keys.has('__requirement_parts'))return;
 if(!env.FILES)throw Error('Private requirement storage is unavailable.');
 const prior=keys.get('__requirement_parts')||{},meta={count:document.artefacts.length,requirementCount:document.artefacts.filter(a=>a.type==='requirement').length,confirmedRequirements:document.artefacts.filter(a=>a.type==='requirement'&&a.confirmed).length};
 for(const kind of ['artefacts','relationships']){
  meta[kind]=[];const old=new Map((prior[kind]||[]).map(part=>[part.hash,part]));
  for(let i=0;i<document[kind].length;i+=250){const records=document[kind].slice(i,i+250),hash=digest(records);let part=old.get(hash);if(!part){const key=prefix(owner,id)+crypto.randomUUID()+'.json';await env.FILES.put(key,JSON.stringify(records),{httpMetadata:{contentType:'application/json'}});created.push(key);part={key,hash,count:records.length};}meta[kind].push(part);}
  stored[kind]=[];
 }
 stored.requirementsStorage=meta;
}
function projection(a){return [a.externalId||'',a.domain||'',a.capability||'',a.title,a.assessment?.delivery||'',a.confirmed?1:0,[a.id,a.externalId,a.title,a.description,a.owner,a.domain,a.capability].filter(Boolean).join(' ').toLowerCase()];}
export function requirementIndexStatements(env,owner,id,document,keys,stamp,initialized){
 const before=initialized?keys.get('__requirement_index')||new Map():new Map(),after=new Map(document.artefacts.filter(a=>a.type==='requirement').map(a=>[a.id,projection(a)])),statements=[];
 const removed=[...before.keys()].filter(key=>!after.has(key));
 for(let i=0;i<removed.length;i+=80){const ids=removed.slice(i,i+80);statements.push(env.DB.prepare(`DELETE FROM requirement_index WHERE owner_id=? AND project_id=? AND id IN (${ids.map(()=>'?').join(',')}) AND EXISTS(SELECT 1 FROM projects WHERE owner_id=? AND id=? AND index_stamp=?)`).bind(owner,id,...ids,owner,id,stamp));}
 const changed=[...after].filter(([key,values])=>JSON.stringify(before.get(key))!==JSON.stringify(values));
 for(let i=0;i<changed.length;i+=8){const rows=changed.slice(i,i+8),values=rows.flatMap(([key,v])=>[owner,id,key,...v]);
  statements.push(env.DB.prepare(`INSERT OR REPLACE INTO requirement_index (owner_id,project_id,id,external_id,domain,capability,title,delivery,confirmed,search) SELECT * FROM (${rows.map(()=> 'SELECT ?,?,?,?,?,?,?,?,?,?').join(' UNION ALL ')}) WHERE EXISTS(SELECT 1 FROM projects WHERE owner_id=? AND id=? AND index_stamp=?)`).bind(...values,owner,id,stamp));
 }
 return statements;
}
export async function queryRequirements(env,owner,id,params,legacyDocument=null){
 const domain=params.get('domain')||'',query=(params.get('q')||'').trim().toLowerCase().slice(0,240),page=Math.min(100000,Math.max(1,Math.floor(Number(params.get('page'))||1))),size=50;
 // Unsaved legacy projects have no index yet. Read their compact register without a GET mutation.
 if(legacyDocument){const all=legacyDocument.artefacts.filter(a=>a.type==='requirement').map(a=>({id:a.id,externalId:a.externalId||'',domain:a.domain||'',capability:a.capability||'',title:a.title,delivery:a.assessment?.delivery||'',confirmed:a.confirmed?1:0,search:projection(a).at(-1)})).filter(a=>(!domain||a.domain===domain)&&(!query||a.search.includes(query))&&(params.get('gaps')!=='1'||a.delivery&&a.delivery.toLowerCase()!=='delivered')).sort((a,b)=>a.id.localeCompare(b.id));return {rows:all.slice((page-1)*size,page*size).map(({search,...a})=>a),total:all.length,page,pageSize:size};}
 const where=['owner_id=?','project_id=?'],values=[owner,id];
 if(domain){where.push('domain=?');values.push(domain);}
 if(query){where.push("search LIKE ? ESCAPE '\\'");values.push('%'+query.replace(/[\\%_]/g,c=>'\\'+c)+'%');}
 if(params.get('gaps')==='1')where.push("delivery<>'' AND lower(delivery)<>'delivered'");
 const clause=where.join(' AND '),count=await env.DB.prepare('SELECT COUNT(*) AS count FROM requirement_index WHERE '+clause).bind(...values).first();
 const rows=await env.DB.prepare('SELECT id,external_id AS externalId,domain,capability,title,delivery,confirmed FROM requirement_index WHERE '+clause+' ORDER BY id LIMIT ? OFFSET ?').bind(...values,size,(page-1)*size).all();
 return {rows:rows.results,total:count.count,page,pageSize:size};
}
