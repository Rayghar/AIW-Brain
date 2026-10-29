// The change journal, an annex to the SDD (round 12, D-05): every change in the order it was recorded, a page at a time,
// as Markdown, CSV or JSON (worker.js /api/export?chapter=11&document=changes&page=). The SDD prints the summary
// (change-summary.js changeSummaryMarkdown); this server module keeps the annex off the browser's routes.
import {CHANGE_OUTCOMES,CHANGE_REASONS,JOURNAL_PAGE,changeEvents,changeSource,changeItemState,isCurrentChange,latestChange,changeValue as show} from './public/changes-domain.js';
const plural=(n,one,many=one+'s')=>n.toLocaleString('en-GB')+' '+(n===1?one:many);
const cell=v=>String(v??'').replace(/\|/g,'/').replace(/\s+/g,' ').trim();
const clip=(v,max)=>{const t=cell(v);return t.length>max?t.slice(0,max-1).trimEnd()+'…':t;};
// Every change in the order it was recorded, a page at a time, as an annex to the SDD (Markdown, CSV or JSON). A page
// keeps its changes as the journal grows, since changes are only added. Each change says who made it, what changed
// (before and after), whether it is still the latest of its record, and its affected records: a latest change lists
// each with its state and reviews; an earlier change gives its counts by chapter and the records reviewed on it, with
// their reviews (every recorded judgement stays on the record). The wording each affected record was given at the time
// is not repeated (the reason a chapter's record is affected is the same for every record of it).
const reviewOf=r=>({at:r.at,outcome:r.outcome,reviewer:r.reviewer,...(r.actor?{actor:r.actor}:{}),rationale:r.rationale,evidence:r.evidence,...(r.owner?{owner:r.owner,action:r.action}:{}),...(r.scope?{scope:r.scope}:{})});
// An affected record as the journal keeps it; its reason only when it says more than its chapter's (CHANGE_REASONS).
const itemOf=(i,state)=>({key:i.key,chapter:i.chapter,id:i.id,ref:i.ref,title:i.title,...(i.why&&i.why!==CHANGE_REASONS[i.chapter]?{why:i.why}:{}),via:i.via||[],state,reviews:(i.reviews||[]).map(reviewOf)});
// What the impact preview showed when the change was accepted: whether it was reviewed, the definition findings it
// introduced and the review prompts it raised.
const previewOf=v=>({reviewed:!!v.reviewed,findings:(v.findings?.introduced||[]).map(f=>({title:f.title,detail:f.detail})),prompts:(v.signals||[]).map(x=>({title:x.title,detail:x.detail}))});
export function changeJournalPage(p,{page=1,size=JOURNAL_PAGE}={}){
  const events=changeEvents(p),pages=Math.max(1,Math.ceil(events.length/size)),n=Math.min(Math.max(1,Math.floor(Number(page))||1),pages),slice=events.slice((n-1)*size,n*size);
  return {schema:'aiw.change-journal-page.v1',project:{id:p.id,name:p.name},page:n,pages,pageSize:size,eventCount:events.length,events:slice.map(e=>{
    const current=isCurrentChange(p,e),source=changeSource(e),byChapter={},states=current?e.items.map(i=>changeItemState(p,e,i,true).status):null;
    e.items.forEach((i,k)=>{const x=byChapter[i.chapter]||(byChapter[i.chapter]={affected:0,open:0});x.affected++;if(current&&states[k]!=='reviewed')x.open++;});
    return {id:e.id,at:e.at,actor:e.actor||null,...(e.authorKind?{authorKind:e.authorKind}:{}),...(e.reason?{reason:e.reason}:{}),...(typeof e.reviewed==='boolean'?{reviewed:e.reviewed}:{}),...(e.quiet?{quiet:e.quiet}:{}),source:{chapter:source.chapter,id:source.id,ref:source.ref,kind:source.kind||'requirement',title:source.title},title:e.title,status:current?'latest':'superseded',supersededBy:current?null:latestChange(p,source)?.id||null,removed:!e.after,
      ...(e.request?{request:e.request}:{}),...(e.legacy?{legacy:true}:{}),fields:(e.fields||[]).map(f=>({key:f.key,label:f.label,before:f.before??null,after:f.after??null})),
      ...(e.proposal?{proposal:{alternativeId:e.proposal.alternativeId||null,name:e.proposal.name,recordCount:e.proposal.recordCount,reviewer:e.proposal.reviewer,reason:e.proposal.reason}}:{}),
      ...(e.preview?{preview:previewOf(e.preview)}:{}),...(e.quiet?{quiet:{reason:e.quiet.reason}}:{}),
      affected:e.items.length,byChapter,
      // A latest change lists every affected record; an earlier one the records reviewed on it, with their reviews.
      items:current?e.items.map((i,k)=>itemOf(i,states[k])):e.items.filter(i=>i.reviews?.length).map(i=>itemOf(i,'superseded'))};
  })};
}
const STATE_LABEL={open:'Needs review',stale:'Changed since review','follow-up':'Follow-up required',reviewed:'Reviewed',superseded:'Earlier change'};
const outcomeLabel=v=>CHANGE_OUTCOMES.find(([x])=>x===v)?.[1]||v;
function journalEntry(e){
  const latest=e.status==='latest';
  let out='## '+e.id+' · '+cell(e.source.ref)+' · '+cell(e.title)+'\n\n'+e.at+' · '+(e.actor?'by '+e.actor:'author not recorded')+(e.authorKind==='sol-draft'?' · drafted by Sol, not reviewed by a person':e.authorKind==='import'?' · an import':'')+' · Chapter '+e.source.chapter+' '+e.source.kind+' · '+(latest?'latest change of this record':'superseded by '+(e.supersededBy||'a later change'))+(e.removed?' · the record was removed':'')+'\n\n';
  if(e.reason)out+='Why: '+clip(e.reason,600)+'\n\n';
  if(e.quiet)out+='No affected review was opened: '+clip(e.quiet.reason,300)+'\n\n';
  out+=e.request?'Review requested by '+e.request.by+': '+e.request.reason+'\n\n':e.legacy?'Earlier notice: previous wording was not retained.\n\n':e.fields.length?e.fields.map(f=>'- '+f.label+': '+clip(show(f.before),600)+' → '+clip(show(f.after),600)).join('\n')+'\n\n':'';
  if(e.proposal)out+='Proposal '+(e.proposal.alternativeId||'(coordinated change)')+' · '+e.proposal.name+' · '+e.proposal.recordCount+' records, accepted by '+e.proposal.reviewer+': '+e.proposal.reason+'\n\n';
  if(e.preview)out+='Impact preview: '+(e.preview.reviewed?'proposed values and linked impact explicitly reviewed before applying':'saved without the interactive impact preview')+'; '+plural(e.preview.findings.length,'new definition finding')+' at acceptance.\n\n'+[...e.preview.findings.map(f=>'- Definition finding: '+f.title+' — '+f.detail),...e.preview.prompts.map(x=>'- Review prompt: '+x.title+' — '+x.detail)].map(l=>l+'\n').join('')+(e.preview.findings.length||e.preview.prompts.length?'\n':'');
  // A change journalled with no review opened says why (round 12: a change to what only describes the source).
  if(!e.affected)return out+(e.quiet?'No review opened: '+e.quiet.reason+'\n\n':'No downstream records were linked when this change was recorded.\n\n');
  out+='Affected: '+plural(e.affected,'record')+' ('+Object.entries(e.byChapter).map(([c,x])=>'Chapter '+c+' '+x.affected+(latest?', '+x.open+' open':'')).join('; ')+').\n\n';
  if(!e.items.length)return out;
  return out+(latest?'':'Reviews recorded on this change before it was superseded:\n\n')+e.items.map(i=>'- Chapter '+i.chapter+' · '+cell(i.ref)+' · '+clip(i.title,120)+' — '+STATE_LABEL[i.state]+(i.via.length?' · via '+clip(i.via.join(', '),160):'')+(i.why?'\n  '+clip(i.why,600):'')
    +i.reviews.map(r=>'\n  Review '+r.at+' · '+r.reviewer+' · '+outcomeLabel(r.outcome)+(r.scope==='cause'?' (one review for the change)':'')+' · '+clip(r.rationale,400)+' · Evidence: '+clip(r.evidence,300)+(r.action?' · Follow-up: '+r.owner+' — '+clip(r.action,300):'')).join('')).join('\n')+'\n\n';
}
export function changeJournalMarkdown(page){
  return '# Change journal · '+page.project.name+'\n\nPage '+page.page+' of '+page.pages+' · changes '+(page.events.length?page.events[0].id+' to '+page.events.at(-1).id:'none')+' of '+page.eventCount+', in the order they were recorded. An annex to the SDD, which prints the latest change of each record. Outcomes are recorded human judgements; nothing here approves a design.\n\n'
    +page.events.map(journalEntry).join('')+(page.page<page.pages?'Next page: '+(page.page+1)+' of '+page.pages+'.\n':'Last page.\n');
}
// A cell as model-exchange.js csvCell writes one: quoted, and a value a spreadsheet would read as a formula kept as text.
const csv=v=>{let s=String(v??'');if(/^[\s]*[=+@-]/.test(s)||/^[\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
export function changeJournalCSV(page){
  const rows=[['change','recorded','by','chapter','record','kind','title','status','superseded by','removed','fields changed','affected','open','reviewed','follow-ups','reviewed by','author kind','why']];
  for(const e of page.events){const items=e.items||[],latest=e.status==='latest';rows.push([e.id,e.at,e.actor||'',e.source.chapter,e.source.ref,e.source.kind,e.title,e.status,e.supersededBy||'',e.removed?'yes':'',e.request?'Review requested':e.fields.map(f=>f.label).join('; '),e.affected,latest?items.filter(i=>i.state!=='reviewed').length:'',latest?items.filter(i=>i.state==='reviewed').length:'',latest?items.filter(i=>i.state==='follow-up').length:'',[...new Set(items.flatMap(i=>i.reviews.map(r=>r.reviewer)))].join('; '),e.authorKind||'',e.reason||'']);}
  return rows.map(r=>r.map(csv).join(',')).join('\r\n')+'\r\n';
}
