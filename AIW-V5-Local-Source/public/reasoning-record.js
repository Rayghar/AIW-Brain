// The Brain's record in the SDD: what the review desk read, where the product choices stand, what Sol
// advised and what the architect did with it, and what the project learned from its disagreements.
// Readings are design arithmetic, not measurement; advice is advice; every decision and its reason is
// the architect's. Built from modules that do not import review-domain.js (no import cycle).
import {deskSource,VITALS,VSTATE} from './desk-vitals.js';
import {choiceForDesign,describeChoice} from './product-choice.js';
import {knowledgeState,STEWARD_DECISIONS} from './knowledge-governance.js';

const list=v=>Array.isArray(v)?v:[];
const cell=v=>String(v??'').replace(/\|/g,'\\|').replace(/\s+/g,' ').trim();
const date=v=>String(v||'').slice(0,10);
const vitalLabel=id=>VITALS.find(v=>v.id===id)?.label||id;
const VERDICT={apply:'apply',refine:'refine',reconsider:'reconsider',judge:'your call',insufficient:'insufficient'};
const OUTCOME={used:'taken',applied:'applied through the chapter’s change review',dismissed:'the architect disagreed'};

function vitalsSection(p){
 let D;try{D=deskSource(p);}catch{return '### Vitals at review\n\nThe review desk could not read this design.\n\n';}
 if(!D.rows.length)return '### Vitals at review\n\nNo running part is placed yet (Chapter 10), so the desk has nothing to read.\n\n';
 const table=D.system.map(s=>`| ${vitalLabel(s.vital)} | ${VSTATE[s.state]?.label||s.state} | ${cell(s.head)} | ${cell(s.text)} |`).join('\n');
 const attention=D.rows.filter(r=>r.vitals.some(v=>v.state==='bad'||v.state==='none')).slice(0,15).map(r=>'- '+cell(r.ref)+' '+cell(r.title)+(r.product?' ('+cell(r.product)+')':'')+': '+[
  ...r.vitals.filter(v=>v.state==='bad').map(v=>vitalLabel(v.vital).toLowerCase()+' critical'+(v.why?' — '+cell(v.why).replace(/[.\s]+$/,''):'')),
  ...r.vitals.filter(v=>v.state==='none').map(v=>vitalLabel(v.vital).toLowerCase()+' no signal')].join('; ')+'.');
 return '### Vitals at review\n\n'+D.rows.length+' running part'+(D.rows.length===1?'':'s')+' read against the drivers they carry'+(D.cap?.objText?', for '+cell(D.cap.objText):'')+'.\n\n| Vital | State | Reading | Parts |\n|---|---|---|---|\n'+table+'\n\n'+(attention.length?'Parts that read critical or without signal:\n\n'+attention.join('\n')+'\n\n':'No part reads critical or without signal.\n\n');
}

function choicesSection(p){
 const lines=list(p?.technologyRealisation?.records).filter(r=>list(r.options).length>1).map(r=>{
  const C=choiceForDesign(p,r.id);if(!C)return null;
  const framing=list(p?.decisions?.records).find(d=>String(d.source||'').startsWith('Review desk switch point · '+(r.ref||r.id)));
  return `| ${cell((r.ref||r.id)+' '+(r.title||''))} | ${C.options.map(o=>cell(o.option.product||o.option.title)+(o.reading?' (in the design)':'')).join('; ')} | ${cell(describeChoice(C))} | ${C.revisit?'Switch point'+(framing?', framed as '+cell(framing.id):', not yet framed'):'—'} |`;
 }).filter(Boolean);
 if(!lines.length)return '';
 return '### Product choices\n\nOptions are weighed against the drivers they carry: recorded judgements first, then suggestions that fill the gaps. A lean is not a decision; the choice is recorded in Chapter 7.\n\n| Realisation | Options | Reading | Switch point |\n|---|---|---|---|\n'+lines.join('\n')+'\n\n';
}

function adviceSection(p){
 const records=list(p?.coauthoring?.assessments);
 if(!records.length)return '### Sol’s advice and what was done with it\n\nNo advice from Sol has been taken, applied or disagreed with in this project.\n\n';
 const withdrawn=new Set(knowledgeState(p).withdrawals.map(w=>w.targetId));
 const restedOnWithdrawn=a=>list(a.sources).filter(x=>[x.receipt?.packId,x.receipt?.sourceId,x.receipt?.claimId,x.receipt?.releaseId,x.objectId].some(id=>id&&withdrawn.has(id))).map(x=>cell(x.title||x.objectId));
 const count=k=>records.filter(a=>a.outcome===k).length;
 const lines=records.map(a=>{const gone=restedOnWithdrawn(a),rested=list(a.sources).map(x=>cell(x.title||x.kind)).slice(0,6);
  return `- **${cell(a.id)}** · ${cell(a.title)}${a.chapter?' (Chapter '+cell(a.chapter)+')':''}: Sol advised *${VERDICT[a.verdict]||cell(a.verdict)}*${a.headline?' — “'+cell(a.headline)+'”':''}; ${OUTCOME[a.outcome]||cell(a.outcome)}${a.reason?': '+cell(a.reason):''}. ${date(a.at)} · ${cell(a.provider)} ${cell(a.model)} · packet ${cell(String(a.packetStamp||'').slice(0,12))}${rested.length?' · rested on '+rested.join('; '):''}${gone.length?' · **since withdrawn:** '+gone.join('; '):''}`;});
 return '### Sol’s advice and what was done with it\n\n'+records.length+' record'+(records.length===1?'':'s')+': '+count('used')+' taken, '+count('applied')+' applied, '+count('dismissed')+' disagreed with. Each keeps the packet it was reasoned from and the sources it cited; advice resting on knowledge that was later withdrawn is marked.\n\n'+lines.join('\n')+'\n\n';
}

function learnedSection(p){
 const s=knowledgeState(p),items=list(s.stewardship);if(!items.length)return '';
 const stage=d=>{
  if(d.decision!=='captured')return STEWARD_DECISIONS[d.decision]||d.decision;
  const c=s.claims.find(x=>x.id===d.claimId),release=s.releases.find(r=>r.claims.some(x=>x.id===d.claimId));
  if(!c)return 'Captured';if(c.review?.decision&&c.review.decision!=='verified')return 'Captured · review: '+c.review.decision;if(!c.review)return 'Captured · awaiting review';
  const linked=s.links.some(l=>l.status!=='retired'&&l.receipt?.claimId===d.claimId);
  return 'Captured · reviewed'+(release?' · released'+(s.pins.includes(release.id)?' · active':''):'')+(linked?' · linked':'');
 };
 return '### What the project learned from its disagreements\n\n'+items.map(d=>`- ${cell(d.id)} · from ${cell(d.assessmentId)}${d.objectId?' on '+cell(d.objectId):''}${d.claimId?' → '+cell(d.claimId):''}: ${stage(d)}${d.reason?' — '+cell(d.reason):''} (${cell(d.reviewer||d.actor)}, ${date(d.at)})`).join('\n')+'\n\n';
}

function withdrawalsSection(p){
 const w=knowledgeState(p).withdrawals;if(!w.length)return '';
 return '### Knowledge withdrawn and what it reached\n\n'+w.map(x=>`- ${cell(x.targetId)} · ${date(x.at)} · ${cell(x.reason)}${list(x.impact).length?' — reached '+x.impact.map(i=>cell(i.kind)+' '+cell(i.id)).join(', '):''}`).join('\n')+'\n\n';
}

export function reasoningRecordMarkdown(p){
 return '## Architecture reasoning record\n\nWhat the review desk read, where the product choices stand, what Sol advised and what the architect did with it, and what the project learned. The desk’s readings are design arithmetic, not measurement; Sol’s advice is advice, checked against the sources it was given; every decision and its reason is the architect’s.\n\n'
  +vitalsSection(p)+choicesSection(p)+adviceSection(p)+learnedSection(p)+withdrawalsSection(p);
}
