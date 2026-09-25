import {brainContext,brainNote,brainNotes,noteCurrent,draftNarrative,knowledgeReceipt,receiptCurrent,reviewGeneration,generationMarkdown} from './aiw-brain.js';

const text=(v,n=16000)=>typeof v==='string'?v.trim().slice(0,n):'';
export function applyBrainCommand(input,command,at=new Date().toISOString()){
 const p=structuredClone(input),raw=command.payload||{};
 p.coauthoring||={schemaVersion:1,counters:{source:0,task:0},sources:[],tasks:[]};
 p.coauthoring.narratives||=[];p.coauthoring.counters.narrative||=0;
 let n;
 if(command.type==='brain.draft'){
  const chapter=Number(raw.chapter);if(!Number.isInteger(chapter)||chapter<1||chapter>11)throw Error('Choose a chapter for this passage.');
  const c=brainContext(p,{chapter,id:raw.objectId,tab:'output'});if(c.selected.id==='project')throw Error('Select a saved object before drafting its explanation.');
  if(raw.basisStamp!==c.stamp)throw Error('The object context changed. Review the current context before drafting.');
  if(brainNotes(p).length>=80)throw Error('This project has reached its saved-passage limit. Continue an existing draft.');
  n={id:'TXT-'+String(++p.coauthoring.counters.narrative).padStart(3,'0'),revision:1,status:'draft',context:{chapter:c.selected.chapter,id:c.selected.id},writingChapter:chapter,title:c.selected.title,body:draftNarrative(c),basis:structuredClone(c.basis),basisStamp:c.stamp,knowledge:c.knowledge.map(x=>knowledgeReceipt(x.id)),createdAt:at,updatedAt:at,history:[{at,event:'Drafted from saved model'}]};
  p.coauthoring.narratives.push(n);return {document:p,selected:n.id};
 }
 n=brainNote(p,raw.id);if(!n)throw Error('Choose a saved co-author passage.');
 if(n.revision!==raw.revision)throw Error('This passage changed elsewhere. Reopen its saved revision; your input is retained.');
 if(command.type==='brain.update'){
  if(!text(raw.title,180)||!text(raw.body))throw Error('Give the passage a title and text.');
  n.title=text(raw.title,180);n.body=text(raw.body);n.history.push({at,event:'Edited draft'});
 }else if(command.type==='brain.refresh'){
  const c=brainContext(p,n.context);if(c.selected.id==='project')throw Error('The source object was removed. This passage is retained for reference.');
  if(raw.basisStamp!==c.stamp)throw Error('The source changed again. Review the current context.');
  if(raw.reviewed!==true||!text(raw.reason,2000))throw Error('Confirm the source review and record your conclusion.');
  n.history.push({at,event:'Reviewed changed sources',reason:text(raw.reason,2000),before:n.basis,...(n.generation?{generation:structuredClone(n.generation)}:{})});n.basis=structuredClone(c.basis);n.basisStamp=c.stamp;n.knowledge=c.knowledge.map(x=>knowledgeReceipt(x.id));reviewGeneration(p,n.generation);
 }else if(command.type==='brain.accept'){
  if(!noteCurrent(p,n))throw Error('Review the changed object or knowledge sources before using this passage.');
  if(raw.reviewed!==true||!text(raw.reviewer,180)||!text(raw.reason,2000))throw Error('Review the passage and record the author and acceptance rationale.');
  n.accepted={title:n.title,body:n.body,at,revision:n.revision,reviewer:text(raw.reviewer,180),reason:text(raw.reason,2000),basis:structuredClone(n.basis),basisStamp:n.basisStamp,knowledge:structuredClone(n.knowledge),...(n.generation?{generation:structuredClone(n.generation)}:{})};
  n.status='accepted';n.history.push({at,event:'Included in working SDD',accepted:structuredClone(n.accepted)});
 }else if(command.type==='brain.withdraw'){
  if(!n.accepted||raw.reviewed!==true||!text(raw.reason,2000))throw Error('Confirm removal from the working SDD and record the reason.');
  n.history.push({at,event:'Removed from working SDD',reason:text(raw.reason,2000),accepted:n.accepted});delete n.accepted;n.status='draft';
 }else throw Error('Choose a supported co-author action.');
 n.revision++;n.updatedAt=at;return {document:p,selected:n.id};
}
export const acceptedNarratives=p=>brainNotes(p).filter(n=>n.accepted).map(n=>({id:n.id,context:n.context,...n.accepted}));
export function narrativeFindings(p){return acceptedNarratives(p).filter(n=>!noteCurrent(p,n)).map(n=>({id:'narrative-source:'+n.id,chapter:n.context.chapter,chapterTitle:'Co-authored design',objectId:n.context.id,level:'warning',title:'Review a co-authored passage',detail:n.id+' describes an earlier object or knowledge revision. Review its text with Sol before accepting an updated passage.'}));}
export function narrativeMarkdown(p){const notes=acceptedNarratives(p);if(!notes.length)return '';return '## Co-authored design explanations\n\n'+notes.map(n=>'### '+n.id+' · '+n.title+'\n\n'+n.body+generationMarkdown(n.generation)+'\n\nSource object: '+n.context.id+' · Chapter '+n.context.chapter+'\n\nSource review: '+(noteCurrent(p,n)?'Current':'Changed; review required')+'\n\nAccepted by '+n.reviewer+' · '+n.at+'\n\nRationale: '+n.reason+'\n\n'+(n.knowledge.length?'Knowledge consulted: '+n.knowledge.map(r=>r.patternId+' · '+r.releaseId+' · '+r.posture+' · '+r.sourcePointer).join('; ')+'\n\nKnowledge informs exploration; no pattern adoption or compliance approval is implied.\n\n':'')).join('');}
