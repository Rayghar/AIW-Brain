// The change review's entry on the project rail and its notice (round 12, D-05), which every chapter shows: the open
// changes counted by cause, read from the change summary. The review itself (changes-ui.js) is loaded the first time it
// is opened, so a chapter's first picture does not wait for its code (round 12, UX-11).
import {changeSummary,changeEvents,changeCauses} from './changes-domain.js';
import {projectPreferenceKey,currentChapter as chapter,onProjectSwitch,currentProject} from './project-context.js';
import {esc} from './html-escape.js';
import {scopeChangeNotice} from './shell-ux.js';

const noticeKey=()=>projectPreferenceKey('aiw-change-notice-hidden');
const fmt=n=>Number(n||0).toLocaleString('en-GB'),plural=(n,w)=>fmt(n)+' '+w+(n===1?'':'s');
const button=(action,label,cls='',attrs='')=>`<button type="button" class="cr-button ${cls}" data-cr-action="${action}" ${attrs}>${label}</button>`;
// Another project opened in place: the notice was the last project's.
onProjectSwitch(()=>{document.querySelector('.cr-notice')?.remove();document.querySelector('.cr-chip')?.remove();});
// A save can open reviews or close them: the counter and the notice follow it at once (round 12, G, GR-UX-01), not at
// the next drawing of the page.
if(typeof document!=='undefined')document.addEventListener('aiw:save',e=>{if(e.detail?.status!=='saved')return;const p=currentProject();if(p)try{mountChangeReview(p);}catch(err){console.warn('The change notice could not be read.',err?.message);}});
export function openChangeReview(options={}){return import('./changes-ui.js').then(m=>m.openChangeReview(options),e=>console.error('The change review could not open. Check your connection and try again.',e));}
export function mountChangeReview(p){
  const card=document.querySelector('.project-card,.r-project');if(!card)return;
  // Round 12 (G, GR-UX-01): the counter counts reviews and says so ("Reviews"); the notice counts the open reviews across
  // their causes (one change to a shared record is one cause, however many records it reaches: D-05), names the largest
  // causes and opens the review plan, the change review grouped by cause. Dismissed, it stays a chip in the rail until a
  // new cause appears; a review that closes records never brings it back.
  const s=changeSummary(p),events=changeEvents(p),causes=changeCauses(p),n=causes.length,open=s.open;
  let entry=card.querySelector('.cr-entry');if(!entry){entry=document.createElement('button');entry.type='button';entry.className='cr-entry';(card.querySelector('.rail-project-tools')||card).append(entry);entry.onclick=()=>openChangeReview();}
  entry.innerHTML=`Reviews${open?` <span>${esc(fmt(open))}</span>`:''}`;
  entry.setAttribute('aria-label',open?`Reviews · ${plural(open,'review')} open across ${plural(n,'cause')}`:'Reviews · the change history');entry.title=open?`${plural(open,'review')} open across ${plural(n,'cause')}`:plural(events.length+(p.changes?.archivedCount||0),'recorded change');
  let notice=document.querySelector('.cr-notice'),chip=card.querySelector('.cr-chip');
  if(!n){notice?.remove();chip?.remove();return;}
  const largest=causes.slice().sort((a,b)=>b.open-a.open||String(b.at||'').localeCompare(String(a.at||''))),newest=causes.slice().sort((a,b)=>String(b.at||'').localeCompare(String(a.at||'')))[0];
  const signature='causes:'+n+':'+newest.id,head=`${plural(open,'review')} open across ${plural(n,'cause')}`;
  const plan=()=>openChangeReview({eventId:largest[0].id,chapter:largest[0].chapters.some(c=>c.chapter===chapter())?String(chapter()):'all'});
  let hidden=false;try{hidden=localStorage.getItem(noticeKey())===signature;}catch{/* storage unavailable: the notice shows */}
  if(hidden){
    notice?.remove();
    if(!chip){chip=document.createElement('button');chip.type='button';chip.className='cr-chip';(card.querySelector('.rail-project-tools')||card).after(chip);}
    chip.textContent=head;chip.title='Open the review plan: the changes to review, largest cause first';chip.onclick=plan;return;
  }
  chip?.remove();
  if(!notice){notice=document.createElement('section');notice.className='cr-notice';notice.setAttribute('aria-label','Architecture change review');document.querySelector('.r-assistant-bar,.l-assistance,.workspace-bar')?.before(notice);}
  // Shown only on the chapters its causes reach (shell-ux.js scopeChangeNotice), wherever it is mounted.
  scopeChangeNotice(p,chapter());
  const cause=c=>`${esc(c.source.ref||c.source.id)} ${c.request?'(review asked for)':'changed'} · ${esc(fmt(c.open))}`;
  notice.innerHTML=`<div><b>${esc(head)}</b><span>Largest: ${largest.slice(0,3).map(cause).join('; ')}${n>3?` · and ${esc(fmt(n-3))} more`:''}${s.stale?' · '+esc(fmt(s.stale))+' changed since review':''}</span></div><nav aria-label="Change notice actions">${button('open','Open the review plan →')}${button('hide','×','cr-hide','aria-label="Hide this notice" title="Hide the notice; it stays a chip in the project rail until a new cause appears."')}</nav>`;
  notice.querySelector('[data-cr-action="open"]').onclick=plan;
  notice.querySelector('[data-cr-action="hide"]').onclick=()=>{try{localStorage.setItem(noticeKey(),signature);}catch{/* storage unavailable: hidden for this page only */}mountChangeReview(p);card.querySelector('.cr-chip')?.focus();};
}
