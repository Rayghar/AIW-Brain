// Change review records design reasoning separately from approval and verification.
export const CHANGE_OUTCOMES = [
  ['unchanged', 'Still meets the linked obligation'],
  ['updated', 'Design revised and reviewed'],
  ['follow-up', 'Follow-up required'],
  ['unlinked', 'Not applicable to this change']
];
const fields = {title:'Title',description:'Required behaviour',acceptance:'Acceptance criteria',owner:'Owner',source:'Source',priority:'Priority',confirmed:'Confirmation',scopeMode:'Scope'};
const text = (v, max=4000) => typeof v === 'string' ? v.trim().slice(0,max) : '';
export function changeFingerprint(value) {
  let a=2166136261,b=5381;
  for(const c of JSON.stringify(value ?? null)) {a=Math.imul(a^c.charCodeAt(0),16777619);b=Math.imul(b,33)^c.charCodeAt(0);}
  return (a>>>0).toString(16)+':'+(b>>>0).toString(16);
}
const requirements = p => p.artefacts.filter(a=>a.type==='requirement');
function requirementSnapshot(p,id) {
  const r=requirements(p).find(r=>r.id===id);
  if(!r)return null;
  return {...Object.fromEntries(Object.keys(fields).map(k=>[k,r[k]??''])),relationships:p.relationships.filter(e=>e.from===id||e.to===id).map(e=>({from:e.from,kind:e.kind,to:e.to})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))};
}
export function changedRequirementIds(before,after) {
  return requirements(before).filter(r=>JSON.stringify(requirementSnapshot(before,r.id))!==JSON.stringify(requirementSnapshot(after,r.id))).map(r=>r.id);
}
export function changeTarget(p,item) {
  const lists={1:p.artefacts,2:p.quality?.drivers,3:p.decisions?.records,4:p.logical?.responsibilities,5:p.realisation?.components,6:[...(p.technology?.capabilities||[]),...(p.technology?.boundaries||[])],7:p.technologyRealisation?.records,8:[...(p.interfaces?.contracts||[]),...(p.interfaces?.data||[]),...(p.interfaces?.parties||[])],9:[...(p.security?.controls||[]),...(p.security?.threats||[])],10:p.runtime?.plans};
  return lists[item.chapter]?.find(r=>r.id===item.id)||null;
}
function targetContext(p,item) {
  const r=changeTarget(p,item);if(!r)return null;
  const related=(xs=[],keys=['from','to'])=>xs.filter(x=>keys.some(k=>x[k]===item.id));
  const records=[...(p.logical?.responsibilities||[]),...(p.realisation?.components||[]),...(p.technology?.capabilities||[]),...(p.technologyRealisation?.records||[]),...(p.interfaces?.contracts||[]),...(p.interfaces?.data||[])];
  const get=id=>records.find(o=>o.id===id)||null;
  const extras={
    4:[related(p.logical?.mappings,['logicalId']),related(p.logical?.connections)],
    5:[related(p.logical?.mappings,['physicalId']),related(p.logical?.mappings,['physicalId']).map(m=>get(m.logicalId)),related(p.realisation?.connections)],
    6:[related(p.technology?.mappings,['capabilityId']),related(p.technology?.mappings,['capabilityId']).map(m=>p.technology.needs.find(n=>n.id===m.needId)),related(p.technology?.dependencies)],
    7:[related(p.technologyRealisation?.mappings,['realizationId']),related(p.technologyRealisation?.mappings,['realizationId']).map(m=>get(m.capabilityId)),related(p.technologyRealisation?.connections)],
    8:[related(p.interfaces?.lineage,['from','to','dataId','contractId']),r.exchanges?[get(r.from),get(r.to),r.exchanges.map(e=>get(e.dataId))]:[get(r.authorityId)]],
    9:[p.security?.threats?.filter(t=>r.threatIds?.includes(t.id)),r.targetIds?.map(get)],
    10:[get(r.assetId),related(p.runtime?.placements,['planId']),p.runtime?.environments?.find(e=>e.id===r.environmentId),p.runtime?.zones?.filter(z=>z.environmentId===r.environmentId),p.runtime?.paths?.filter(l=>l.environmentId===r.environmentId&&[get(l.contractId)?.from,get(l.contractId)?.to].includes(r.assetId)).map(l=>[l,get(l.contractId)])]
  };
  return [r,extras[item.chapter]||[]];
}
export const changeTargetStamp=(p,item)=>changeFingerprint(targetContext(p,item));
const reasons={2:'This quality scenario names the requirement as a source. Review whether its stimulus, response, and target still test the changed behaviour.',3:'This decision cites the requirement or a quality driver that depends on it. Review the alternatives, recorded choice, and rationale.',4:'This responsibility claims to deliver the requirement. Check its owned behaviour and implementation scope.',5:'This component realizes a responsibility linked to the requirement. Review its boundary, interactions, and allocations.',6:'This capability supports an application need in the requirement trail. Check the support mapping and quality obligations.',7:'This implementation realizes a capability in the requirement trail. Review the chosen option and operating obligations.',8:'This contract or data definition carries information used in the requirement trail. Check meaning, ownership, and exchange behaviour.',9:'This control protects an object in the requirement trail. Review the threat, enforcement point, and intended response.',10:'This operating plan supports an asset in the requirement trail. Check placement, recovery, and operational evidence.'};
function impactItems(p,impact) {
  return (impact?.groups||[]).flatMap(g=>g.objects.map(o=>{
    const item={...o,chapter:g.chapter,chapterTitle:g.title,key:g.chapter+':'+o.id,why:o.why||reasons[g.chapter],via:o.via||[]};
    return {...item,capturedStamp:changeTargetStamp(p,item),reviews:[]};
  }));
}
export function withChanges(p) {
  if(p.changes)return p;
  p.changes={schemaVersion:1,counter:0,events:[]};
  const previous=p.workspace?.lastImpact;
  if(previous)for(const r of previous.requirements||[]) {
    const id='CHG-'+String(++p.changes.counter).padStart(3,'0');
    p.changes.events.push({id,requirementId:r.id,title:r.title,at:previous.at,legacy:true,before:null,after:requirementSnapshot(p,r.id),fields:[],items:impactItems(p,previous)});
  }
  return p;
}
export function trackRequirementChanges(before,after,at,impactFor) {
  withChanges(after);
  for(const id of changedRequirementIds(before,after)) {
    const old=requirementSnapshot(before,id),current=requirementSnapshot(after,id);
    const impact=impactFor(before,after,at,id);
    const fieldChanges=[...Object.keys(fields),'relationships'].filter(k=>JSON.stringify(old?.[k])!==JSON.stringify(current?.[k])).map(k=>({key:k,label:k==='relationships'?'Requirement relationships':fields[k],before:old?.[k]??null,after:current?.[k]??null}));
    after.changes.events.push({id:'CHG-'+String(++after.changes.counter).padStart(3,'0'),requirementId:id,title:current?.title||old.title,at,before:old,after:current,fields:fieldChanges,items:impactItems(after,impact)});
  }
  return after;
}
export function changeEvents(p) {return p.changes?.events||[];}
export const changeSource=e=>e.source||{chapter:1,id:e.requirementId,ref:e.requirementId,kind:'requirement',title:e.title};
export function latestChange(p,source) {const key=typeof source==='string'?{chapter:1,id:source}:source;return [...changeEvents(p)].reverse().find(e=>changeSource(e).chapter===key.chapter&&changeSource(e).id===key.id);}
export function isCurrentChange(p,event) {return latestChange(p,changeSource(event))?.id===event.id;}
export function changeItemState(p,event,item) {
  const review=item.reviews?.at(-1)||null,stamp=changeTargetStamp(p,item);
  if(!isCurrentChange(p,event))return {label:'Earlier change',status:'superseded',complete:false,review,stamp};
  if(!review)return {label:'Needs review',status:'open',complete:false,review,stamp};
  if(review.targetStamp!==stamp)return {label:'Changed since review',status:'stale',complete:false,review,stamp};
  if(review.outcome==='follow-up')return {label:'Follow-up required',status:'follow-up',complete:false,review,stamp};
  return {label:CHANGE_OUTCOMES.find(([v])=>v===review.outcome)?.[1]||'Needs review',status:'reviewed',complete:true,review,stamp};
}
export function changeSummary(p,event) {
  const events=event?[event]:changeEvents(p).filter(e=>isCurrentChange(p,e));
  const items=events.flatMap(e=>e.items.map(item=>({event:e,item,state:changeItemState(p,e,item)})));
  return {events:events.length,total:items.length,reviewed:items.filter(r=>r.state.complete).length,open:items.filter(r=>!r.state.complete).length,followUp:items.filter(r=>r.state.status==='follow-up').length,stale:items.filter(r=>r.state.status==='stale').length};
}
export function applyChangeCommand(input,command,at=new Date().toISOString()) {
  const p=withChanges(structuredClone(input)),raw=command.payload||{};
  if(command.type==='change.request')return requestReview(p,raw,at);
  if(command.type!=='change.review')throw Error('Choose a supported change-review action.');
  const event=changeEvents(p).find(e=>e.id===raw.changeId),item=event?.items.find(i=>i.key===raw.itemKey);
  if(!event||!item)throw Error('Choose an affected record from the change history.');
  if(!isCurrentChange(p,event))throw Error('A newer change to this definition needs review. Open the latest change.');
  const stamp=changeTargetStamp(p,item),exists=!!changeTarget(p,item);
  if(stamp!==raw.targetStamp)throw Error('This record changed. Reload the project and review the current design.');
  if(!CHANGE_OUTCOMES.some(([v])=>v===raw.outcome))throw Error('Choose a review outcome.');
  if(raw.reviewed!==true||!text(raw.reviewer)||!text(raw.rationale)||!text(raw.evidence))throw Error('Record the reviewer, rationale, evidence or analysis reference, and explicit confirmation.');
  if(['unchanged','updated'].includes(raw.outcome)&&!event.after)throw Error('The source definition was removed. Explain why the assessment is not applicable, or record a follow-up.');
  if(['unchanged','updated'].includes(raw.outcome)&&!exists)throw Error('This record was removed. Explain why the link no longer applies, or record a follow-up.');
  if(raw.outcome==='updated'&&stamp===item.capturedStamp)throw Error('The linked design has not changed since this source edit. Revise it first, or choose another outcome.');
  if(raw.outcome==='follow-up'&&(!text(raw.owner)||!text(raw.action)))throw Error('Give the follow-up an accountable owner and a clear next action.');
  item.reviews.push({at,outcome:raw.outcome,reviewer:text(raw.reviewer,180),rationale:text(raw.rationale),evidence:text(raw.evidence),owner:raw.outcome==='follow-up'?text(raw.owner,180):'',action:raw.outcome==='follow-up'?text(raw.action):'',targetStamp:stamp});
  if(p.finalReview){p.finalReview.version++;p.finalReview.checks=null;p.finalReview.handoff=null;}
  return {document:p,selected:null};
}
// A review asked for by hand — from the review desk, a probe or a decision's implications — rather
// than by an edit. It is recorded like any change event, so each affected record is reviewed and
// its outcome kept with the reviewer, rationale and evidence.
const TITLES={1:'Requirements',2:'Quality drivers',3:'Decisions',4:'Logical application',5:'Application realisation',6:'Logical technology',7:'Technology realisation',8:'Interfaces & data',9:'Security',10:'Deployment & runtime'};
const refOf=t=>t.ref||t.externalId||t.id,titleOf=t=>t.title||t.question||t.name||t.id;
function requestReview(p,raw,at){
  const src=raw.source||{},target=changeTarget(p,{chapter:Number(src.chapter),id:src.id});
  if(!target)throw Error('Choose the record the review is about.');
  if(raw.reviewed!==true||!text(raw.reason)||!text(raw.requestedBy))throw Error('Say why the review is needed and who asks for it, and confirm the request.');
  const seen=new Set(),items=[];
  for(const i of Array.isArray(raw.items)?raw.items:[]){const chapter=Number(i?.chapter),t=changeTarget(p,{chapter,id:i?.id}),key=chapter+':'+i?.id;if(!t||seen.has(key)||items.length>=60)continue;seen.add(key);const item={id:i.id,ref:refOf(t),title:titleOf(t),chapter,chapterTitle:TITLES[chapter]||'',key,why:text(i.why,600)||'Asked to review from the review desk.',via:[refOf(target)]};items.push({...item,capturedStamp:changeTargetStamp(p,item),reviews:[]});}
  if(!items.length)throw Error('Choose at least one record to review.');
  const source={chapter:Number(src.chapter),id:src.id,ref:refOf(target),kind:text(src.kind,40)||'record',title:titleOf(target)};
  p.changes.events.push({id:'CHG-'+String(++p.changes.counter).padStart(3,'0'),source,title:'Review requested · '+text(raw.reason,160),at,before:null,after:{requested:true},fields:[],request:{reason:text(raw.reason,2000),by:text(raw.requestedBy,180),at},items});
  if(p.finalReview){p.finalReview.version++;p.finalReview.checks=null;p.finalReview.handoff=null;}
  return {document:p,selected:null};
}
function show(value) {
  if(value===null||value===''||value===undefined)return 'Not recorded';
  if(typeof value==='boolean')return value?'Yes':'No';
  if(Array.isArray(value))return value.every(e=>e&&typeof e==='object'&&'from' in e&&'to' in e)?value.map(e=>e.from+' — '+(e.label||e.kind||'linked')+' → '+e.to).join('; ')||'No links':JSON.stringify(value,null,2);
  return String(value);
}
export const changeValue=show;
function previewMarkdown(e) {
  if(!e.preview)return '';
  const findings=e.preview.findings?.introduced||[],signals=e.preview.signals||[];
  return 'Impact preview: '+(e.preview.reviewed?'proposed values and linked impact explicitly reviewed before applying.':'definition saved without the interactive impact preview.')+'\n\n'
    +(e.proposal?.recordCount>1?'Across the coordinated proposal at acceptance: ':'At acceptance: ')+findings.length+' new definition findings. Compatibility prompts require provider and consumer evidence.\n\n'
    +findings.map(f=>'- Definition finding: '+f.title+' — '+f.detail+'\n').join('')
    +signals.map(s=>'- Review prompt: '+s.title+' — '+s.detail+'\n').join('')+'\n';
}
export function changeReviewMarkdown(p) {
  const events=changeEvents(p),s=changeSummary(p);
  if(!events.length)return '## Architecture change review\n\nNo definition edits have been recorded in the change history yet.\n\n';
  return '## Architecture change review\n\n'+s.reviewed+' of '+s.total+' affected reviews resolved for the latest changes; '+s.open+' remain open, including '+s.followUp+' owned follow-ups. Outcomes are recorded human judgements; chapter validation and governance remain separate.\n\n'+events.map(e=>{
    const current=isCurrentChange(p,e);
    return '### '+e.id+' · '+changeSource(e).ref+' · '+e.title+'\n\n'+e.at+' · '+(current?'Latest recorded change':'Earlier change — superseded by '+latestChange(p,changeSource(e)).id)+'\n\n'+(e.request?'Review requested by '+e.request.by+': '+e.request.reason+'\n\n':e.legacy?'Earlier notice: previous wording was not retained.\n\n':e.fields.map(f=>f.label+'\n\nBefore: '+show(f.before)+'\n\nAfter: '+show(f.after)+'\n\n').join(''))+(e.proposal?'Proposal: '+(e.proposal.alternativeId||'Coordinated change')+' · '+e.proposal.name+' · '+e.proposal.recordCount+' records\n\nAccepted by: '+e.proposal.reviewer+'\n\nAcceptance rationale: '+e.proposal.reason+'\n\n':'')+previewMarkdown(e)+(e.items.length?e.items.map(i=>{
      const state=changeItemState(p,e,i);return '- Chapter '+i.chapter+' · '+i.ref+' · '+i.title+' — '+state.label+'\n  '+i.why+'\n'+(i.reviews.length?i.reviews.map(r=>'  Review '+r.at+' · '+r.reviewer+' · '+(CHANGE_OUTCOMES.find(([v])=>v===r.outcome)?.[1]||r.outcome)+'\n  Rationale: '+r.rationale+'\n  Evidence / analysis: '+r.evidence+(r.action?'\n  Follow-up: '+r.owner+' — '+r.action:'')+'\n').join(''):'  No review outcome recorded.\n');
    }).join(''):'No downstream records were linked when this change was recorded.\n')+'\n';
  }).join('');
}
