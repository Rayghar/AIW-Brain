import {digest} from './public/brain-integrity.js';
import {readRequirements,writeRequirements,requirementIndexStatements} from './requirement-storage.js';
// Baselines are immutable documents. Keep their bytes in private object storage
// and only their references in the revision-controlled working project row.
import {changeSummary} from './public/changes-domain.js';
const prefix=(owner,projectId)=>'baselines/'+encodeURIComponent(owner)+'/'+encodeURIComponent(projectId)+'/';
const journalPrefix=(owner,projectId)=>'changes/'+encodeURIComponent(owner)+'/'+encodeURIComponent(projectId)+'/';
const evidencePrefix=(owner,projectId)=>'evidence/'+encodeURIComponent(owner)+'/'+encodeURIComponent(projectId)+'/';
const alternativesPrefix=(owner,projectId)=>'alternatives/'+encodeURIComponent(owner)+'/'+encodeURIComponent(projectId)+'/';
const knowledgePrefix=(owner,projectId)=>'knowledge/'+encodeURIComponent(owner)+'/'+encodeURIComponent(projectId)+'/';
export async function readStoredProject(env,owner,serialized){
  const document=JSON.parse(serialized),keys=new Map();
  await readRequirements(env,owner,document,keys);
  for(const field of ['workbench','assurance','guidance','intake','interfaceExtensions','caseExtensions']){
    const meta=document[field];if(!meta?.storageKey)continue;
    if(!env.FILES||!meta.storageKey.startsWith('extensions/'+encodeURIComponent(owner)+'/'+encodeURIComponent(document.id)+'/'+field+'/'))throw Error('Private extension storage is unavailable.');
    const file=await env.FILES.get(meta.storageKey);if(!file)throw Error('Saved '+field+' could not be loaded.');
    const bytes=await file.text(),value=JSON.parse(bytes);if(digest(value)!==meta.checksum)throw Error('The '+field+' integrity check failed.');
    keys.set('__'+field,{key:meta.storageKey,bytes});document[field]=value;
  }
  if(document.caseExtensions){Object.assign(document.finalReview,document.caseExtensions);delete document.caseExtensions;}
  if(document.interfaceExtensions){Object.assign(document.interfaces,document.interfaceExtensions);delete document.interfaceExtensions;}
  if(document.knowledge?.storageKey){
    const meta=document.knowledge;if(!env.FILES||!meta.storageKey.startsWith(knowledgePrefix(owner,document.id)))throw Error('Private architecture knowledge storage is unavailable.');
    const file=await env.FILES.get(meta.storageKey);if(!file)throw Error('The saved architecture knowledge could not be loaded.');
    const bytes=await file.text(),knowledge=JSON.parse(bytes);if(knowledge.version!==meta.version||digest(knowledge)!==meta.checksum)throw Error('The knowledge does not match its exact saved reference.');
    keys.set('__knowledge',{key:meta.storageKey,bytes});document.knowledge=knowledge;
  }
  if(document.modelAlternatives?.storageKey){
    const meta=document.modelAlternatives;
    if(!env.FILES||!meta.storageKey.startsWith(alternativesPrefix(owner,document.id)))throw Error('Private alternative storage is unavailable.');
    const file=await env.FILES.get(meta.storageKey);if(!file)throw Error('Saved model alternatives could not be loaded.');
    const bytes=await file.text(),alternatives=JSON.parse(bytes);
    if(alternatives.counter!==meta.counter||alternatives.records?.length!==meta.recordCount)throw Error('The alternatives do not match their saved reference.');
    keys.set('__alternatives',{key:meta.storageKey,bytes});document.modelAlternatives=alternatives;
  }
  if(document.coauthoring?.storageKey){
    const meta=document.coauthoring;
    if(!env.FILES||!meta.storageKey.startsWith(evidencePrefix(owner,document.id)))throw Error('Private evidence storage is unavailable.');
    const file=await env.FILES.get(meta.storageKey);if(!file)throw Error('The saved project evidence could not be loaded.');
    const bytes=await file.text(),evidence=JSON.parse(bytes);
    if((meta.narrativeCount!==undefined&&(evidence.narratives?.length||0)!==meta.narrativeCount)||evidence.sources?.length!==meta.sourceCount||evidence.tasks?.length!==meta.taskCount||(meta.designTaskCount!==undefined&&(evidence.designTasks?.length||0)!==meta.designTaskCount))throw Error('The evidence does not match its saved reference.');
    keys.set('__evidence',{key:meta.storageKey,bytes});document.coauthoring=evidence;
  }
  if(document.changes?.storageKey){
    const meta=document.changes;
    if(!env.FILES||!meta.storageKey.startsWith(journalPrefix(owner,document.id)))throw Error('Private change history is unavailable.');
    const file=await env.FILES.get(meta.storageKey);
    if(!file)throw Error('The saved change history could not be loaded.');
    const bytes=await file.text(),journal=JSON.parse(bytes);
    if(journal.counter!==meta.counter||journal.events?.length!==meta.eventCount)throw Error('The change history does not match its saved reference.');
    keys.set('__change_journal',{key:meta.storageKey,bytes});document.changes=journal;
  }
  if(document.finalReview)document.finalReview.baselines=await Promise.all(document.finalReview.baselines.map(async b=>{
    if(!b.storageKey)return b; // Earlier local drafts remain readable.
    if(!env.FILES||!b.storageKey.startsWith(prefix(owner,document.id)))throw Error('Private baseline storage is unavailable.');
    const file=await env.FILES.get(b.storageKey);
    if(!file)throw Error('A captured baseline could not be loaded.');
    const snapshot=JSON.parse(await file.text());
    if(snapshot.id!==b.id||snapshot.stamp!==b.stamp)throw Error('The baseline reference does not match its snapshot.');
    keys.set(b.id,b.storageKey);return snapshot;
  }));
  return {document,keys};
}
export async function saveStoredProject(env,owner,projectId,document,revision,at,keys,extraStatements=()=>[]){
  const stored={...document,finalReview:{...document.finalReview}},created=[];
  await writeRequirements(env,owner,projectId,document,stored,keys,created);
  const extensions={...Object.fromEntries(['workbench','assurance','guidance','intake'].filter(k=>document[k]).map(k=>[k,document[k]]))};
  if(document.finalReview.architectureCases?.length){extensions.caseExtensions={architectureCases:document.finalReview.architectureCases};delete stored.finalReview.architectureCases;}
  if(document.interfaces?.specifications?.length||document.interfaces?.schemaChecks?.length||document.interfaces?.fieldLineage?.length){extensions.interfaceExtensions=Object.fromEntries(['specifications','schemaChecks','fieldLineage'].map(k=>[k,document.interfaces[k]||[]]));stored.interfaces={...document.interfaces};for(const k of Object.keys(extensions.interfaceExtensions))delete stored.interfaces[k];}
  for(const [field,value]of Object.entries(extensions)){
    const bytes=JSON.stringify(value),prior=keys.get('__'+field);if(bytes.length<64000&&!prior&&!['interfaceExtensions','caseExtensions'].includes(field))continue;
    if(!env.FILES)throw Error('Private extension storage is unavailable.');let storageKey=prior?.key;
    if(!storageKey||prior.bytes!==bytes){storageKey='extensions/'+encodeURIComponent(owner)+'/'+encodeURIComponent(projectId)+'/'+field+'/'+crypto.randomUUID()+'.json';await env.FILES.put(storageKey,bytes);created.push(storageKey);}
    stored[field]={storageKey,checksum:digest(value)};
  }
  if(document.knowledge){
    const bytes=JSON.stringify(document.knowledge),prior=keys.get('__knowledge');let storageKey=prior?.key;
    if(!storageKey||prior.bytes!==bytes){if(!env.FILES)throw Error('Private architecture knowledge storage is unavailable.');storageKey=knowledgePrefix(owner,projectId)+crypto.randomUUID()+'.json';await env.FILES.put(storageKey,bytes,{httpMetadata:{contentType:'application/json'}});created.push(storageKey);}
    stored.knowledge={version:document.knowledge.version,checksum:digest(document.knowledge),storageKey};
  }
  if(document.modelAlternatives?.records?.length){
    const bytes=JSON.stringify(document.modelAlternatives),prior=keys.get('__alternatives');let storageKey=prior?.key;
    if(!storageKey||prior.bytes!==bytes){
      if(!env.FILES)throw Error('Private alternative storage is unavailable.');
      storageKey=alternativesPrefix(owner,projectId)+crypto.randomUUID()+'.json';
      await env.FILES.put(storageKey,bytes,{httpMetadata:{contentType:'application/json'}});created.push(storageKey);
    }
    stored.modelAlternatives={schemaVersion:1,counter:document.modelAlternatives.counter,recordCount:document.modelAlternatives.records.length,storageKey};
  }
  if(document.coauthoring?.sources?.length||document.coauthoring?.designTasks?.length||document.coauthoring?.narratives?.length){
    const bytes=JSON.stringify(document.coauthoring),prior=keys.get('__evidence');let storageKey=prior?.key;
    if(!storageKey||prior.bytes!==bytes){
      if(!env.FILES)throw Error('Private evidence storage is unavailable.');
      storageKey=evidencePrefix(owner,projectId)+crypto.randomUUID()+'.json';
      await env.FILES.put(storageKey,bytes,{httpMetadata:{contentType:'application/json'}});created.push(storageKey);
    }
    stored.coauthoring={schemaVersion:1,sourceCount:document.coauthoring.sources.length,taskCount:document.coauthoring.tasks.length,designTaskCount:document.coauthoring.designTasks?.length||0,narrativeCount:document.coauthoring.narratives?.length||0,storageKey};
  }
  stored.finalReview.baselines=[];
  for(const b of document.finalReview.baselines){
    let storageKey=keys.get(b.id);
    if(!storageKey){
      if(!env.FILES)throw Error('Private baseline storage is unavailable.');
      storageKey=prefix(owner,projectId)+b.id+'/'+crypto.randomUUID()+'.json';
      await env.FILES.put(storageKey,JSON.stringify(b),{httpMetadata:{contentType:'application/json'}});
      created.push(storageKey);
    }
    const {source,review,findings,markdown,model,...metadata}=b;
    stored.finalReview.baselines.push({...metadata,storageKey});
  }
  if(document.changes?.events?.length){
    const bytes=JSON.stringify(document.changes),prior=keys.get('__change_journal');let storageKey=prior?.key;
    if(!storageKey||prior.bytes!==bytes){
      if(!env.FILES)throw Error('Private change history is unavailable.');
      storageKey=journalPrefix(owner,projectId)+crypto.randomUUID()+'.json';
      await env.FILES.put(storageKey,bytes,{httpMetadata:{contentType:'application/json'}});created.push(storageKey);
    }
    stored.changes={schemaVersion:1,counter:document.changes.counter,eventCount:document.changes.events.length,summary:changeSummary(document),storageKey};
  }
  // Every capture gets a unique object key. A concurrent losing save cannot
  // replace the winning snapshot, even when both allocated the same BL ID.
  const indexed=await env.DB.prepare('SELECT index_stamp FROM projects WHERE owner_id=? AND id=?').bind(owner,projectId).first(),stamp=crypto.randomUUID();
  const update=env.DB.prepare('UPDATE projects SET document=?,revision=revision+1,updated_at=?,index_stamp=? WHERE owner_id=? AND id=? AND revision=?').bind(JSON.stringify(stored),at,stamp,owner,projectId,revision);
  const indexStatements=requirementIndexStatements(env,owner,projectId,document,keys,stamp,!!indexed?.index_stamp);
  let change;try{if(!env.DB.batch)throw Error('Atomic project indexing is unavailable.');[change]=await env.DB.batch([update,...indexStatements,...extraStatements(stamp)]);}catch(e){await Promise.allSettled(created.map(key=>env.FILES.delete(key)));throw e;}
  if(!change.meta?.changes)await Promise.allSettled(created.map(key=>env.FILES.delete(key)));
  return change;
}
