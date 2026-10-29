// The change summary the SDD prints (round 12, D-05): the change-summary reader (changeDigest) and its Markdown. The SDD
// builder (sdd-document.js) loads this module and it registers its section with review-domain.js, which assembles the
// SDD: the Projects page carries review-domain.js (through the workbench) and must not carry the SDD's sections, as
// with the builder itself (registerSDDBuilder). The full journal is a paged annex (change-journal.js, server only).
import {changeEvents,changeSource,changeCauses,currentChanges} from './changes-domain.js';
import {CHAPTER_TITLES} from './chapter-names.js';
import {registerChangeSection} from './review-domain.js';
import {remember} from './document-memo.js';
// The change-summary reader (round 12, D-05): the latest change of each record — who, when, what changed — and the
// reviews still open, by cause and by chapter. The SDD prints it; the full journal is a paged annex (changeJournalPage).
// chapters: the affected records by the chapter they are in (what is open where); sources: the changed records by their
// own chapter (how many have a latest change, how many of those removed the record or asked for a review).
export function changeDigest(p){return remember(p,'changes:digest','',()=>{
  const events=changeEvents(p),latest=currentChanges(p),causes=changeCauses(p),sum=k=>latest.reduce((n,c)=>n+c[k],0),chapters=new Map(),sources=new Map();
  for(const c of latest)for(const [chapter,x] of c.byChapter){const t=chapters.get(chapter)||{chapter,title:CHAPTER_TITLES[chapter]||'Chapter '+chapter,causes:0,affected:0,open:0};t.affected+=x.affected;t.open+=x.open;if(x.open)t.causes++;chapters.set(chapter,t);}
  for(const c of latest){const chapter=changeSource(c.event).chapter,t=sources.get(chapter)||{chapter,title:CHAPTER_TITLES[chapter]||'Chapter '+chapter,records:0,removed:0,requested:0,causes:0};t.records++;if(!c.event.after)t.removed++;if(c.event.request)t.requested++;if(c.open)t.causes++;sources.set(chapter,t);}
  const reviewers=e=>[...new Set(e.items.flatMap(i=>(i.reviews||[]).map(r=>r.reviewer)).filter(Boolean))];
  // A read's journal leaves its archived changes out and counts them (round 12, GR-PERF-13: changes-domain.js journalView).
  return {events:events.length+(p.changes?.archivedCount||0),records:latest.length,causes:causes.length,affected:sum('total'),open:sum('open'),reviewed:sum('reviewed'),followUp:sum('followUp'),stale:sum('stale'),
    chapters:[...chapters.values()].sort((a,b)=>a.chapter-b.chapter),sources:[...sources.values()].sort((a,b)=>a.chapter-b.chapter),
    latest:latest.map(c=>({id:c.event.id,source:changeSource(c.event),title:c.event.title,at:c.event.at,actor:c.event.actor||null,authorKind:c.event.authorKind||null,reason:c.event.reason||'',quiet:c.event.quiet?.reason||'',fields:c.event.request?['Review requested']:c.event.legacy?['Earlier notice']:(c.event.fields||[]).map(f=>f.label),removed:!c.event.after,affected:c.total,open:c.open,reviewed:c.reviewed,followUp:c.followUp,stale:c.stale,reviewers:reviewers(c.event)}))};
});}
const plural=(n,one,many=one+'s')=>n.toLocaleString('en-GB')+' '+(n===1?one:many);
const day=at=>String(at||'').slice(0,10)||'—';
// Who made a change and of what kind (round 12, GR-GOV-08): the account, and what it was when it was not a person's own
// change: a draft by Sol nobody had reviewed, or an import.
export const KIND_NOTE={'sol-draft':'drafted by Sol, not reviewed',import:'import'};
export const changeAuthor=c=>(c.actor||'—')+(KIND_NOTE[c.authorKind]?' ('+KIND_NOTE[c.authorKind]+')':'');
const cell=v=>String(v??'').replace(/\|/g,'/').replace(/\s+/g,' ').trim();
const clip=(v,max)=>{const t=cell(v);return t.length>max?t.slice(0,max-1).trimEnd()+'…':t;};
export const JOURNAL_ANNEX='the Changes review → Change journal, or /api/export?chapter=11&document=changes&format=md&page=1, also as CSV and JSON';
// The latest change of each record and the reviews still open, by cause and by chapter. Superseded changes and the
// per-record wording of each review are not printed: the journal annex keeps them. Like every list of the SDD
// (audit/round12/SDD-SPEC.md, principle 4), the changes to review name the CAUSE_ROWS largest and count the rest with a
// pointer to the annex, so the section stays a page or two whatever the size of the project.
export const CAUSE_ROWS=12;
export function changeSummaryMarkdown(p) {
  const d=changeDigest(p);
  if(!d.events)return '## Architecture change review\n\nNo definition edits have been recorded in the change history yet.\n\n';
  const count=n=>n.toLocaleString('en-GB');
  let out='## Architecture change review\n\n'+(d.events===1?'1 change is':count(d.events)+' changes are')+' recorded for '+plural(d.records,'record')+'. This section gives the latest change of each record and what it leaves to review; every change, with its fields before and after and each affected record, is in the change journal, a separate annex ('+JOURNAL_ANNEX+').\n\n';
  out+=count(d.reviewed)+' of '+count(d.affected)+' affected reviews resolved for the latest changes'+(d.open?'; '+count(d.open)+' remain open across '+plural(d.causes,'change')+(d.followUp?', including '+plural(d.followUp,'owned follow-up')+(d.stale?' and '+count(d.stale)+' changed since their review':''):d.stale?', including '+count(d.stale)+' changed since their review':''):'')+'. One change to a shared record is one review with its affected count. Outcomes are recorded human judgements; chapter validation and governance remain separate.\n\n';
  if(d.causes){
    const rows=d.latest.filter(c=>c.open).sort((a,b)=>b.open-a.open||String(b.at).localeCompare(String(a.at))||b.id.localeCompare(a.id)),shown=rows.slice(0,CAUSE_ROWS),rest=rows.slice(CAUSE_ROWS);
    out+='### Open reviews by chapter\n\n| Chapter | Changes with open reviews | Affected records open |\n| --- | --- | --- |\n'+d.chapters.filter(c=>c.open).map(c=>'| '+c.chapter+' · '+c.title+' | '+count(c.causes)+' | '+count(c.open)+' |').join('\n')+'\n\n';
    out+='### Changes to review\n\n'+(rest.length?'The '+count(shown.length)+' changes that leave the most records to review, largest first':'Largest first')+'. Each row is one change, reviewed once for all the records it reaches.\n\n| Change | Record | When | By | Why | What changed | Affected | Open | Reviewed by |\n| --- | --- | --- | --- | --- | --- | --- | --- | --- |\n'+shown.map(c=>'| '+c.id+' | '+cell(c.source.ref)+' · '+clip(c.title,80)+(c.removed?' (removed)':'')+' | '+day(c.at)+' | '+cell(changeAuthor(c))+' | '+(clip(c.reason,120)||'—')+' | '+clip(c.fields.join(', ')||'—',120)+' | '+count(c.affected)+' | '+count(c.open)+(c.stale?' ('+count(c.stale)+' changed since review)':'')+' | '+(cell(c.reviewers.join(', '))||'—')+' |').join('\n')+'\n\n'
      +(rest.length?'And '+plural(rest.length,'more change')+' to review, with '+plural(rest.reduce((n,c)=>n+c.open,0),'affected record')+' open, '+(rest.length===1?'is':'are')+' listed in the change journal annex.\n\n':'');
  }
  const settled=d.latest.filter(c=>!c.open);
  if(settled.length){
    const groups=new Map();for(const c of settled){const k=c.source.chapter;const g=groups.get(k)||{chapter:k,count:0,first:c.at,last:c.at,actors:new Set(),reasons:new Set(),reviewed:0,reviewers:new Set()};g.count++;if(String(c.at)<String(g.first))g.first=c.at;if(String(c.at)>String(g.last))g.last=c.at;if(c.actor)g.actors.add(changeAuthor(c));if(c.reason)g.reasons.add(clip(c.reason,120));g.reviewed+=c.reviewed;for(const r of c.reviewers)g.reviewers.add(r);groups.set(k,g);}
    out+='### Latest changes with nothing left to review\n\n'+[...groups.values()].sort((a,b)=>a.chapter-b.chapter).map(g=>'- Chapter '+g.chapter+' · '+(CHAPTER_TITLES[g.chapter]||'')+': '+plural(g.count,'record')+', last changed '+(day(g.first)===day(g.last)?'on '+day(g.last):'from '+day(g.first)+' to '+day(g.last))+(g.actors.size?' by '+clip([...g.actors].join(', '),240):'')+(g.reasons.size?' (why: '+[...g.reasons].slice(0,3).join('; ')+(g.reasons.size>3?'; and '+(g.reasons.size-3)+' more':'')+')':'')+(g.reviewed?'; '+plural(g.reviewed,'affected review')+' recorded'+(g.reviewers.size?' by '+clip([...g.reviewers].join(', '),240):''):'')+'.').join('\n')+'\n\n';
  }
  return out;
}
registerChangeSection(changeSummaryMarkdown);
