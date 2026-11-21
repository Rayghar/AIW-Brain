// The surfaces of the adoption package (rc44, wp2; audit/rc44/design/wp2-adoption.md §d.3), held in the lazy entry of
// the comparison tools (architecture-task-ui.js imports this module; ruling D7.6). Slice S3 adds the adoption
// workspace; this file holds, for now, only the selection's part (slice S5), its own exported functions.
//
// ---------------------------------------------------------------- component selection (slice S5)
// Starts from the responsibility, shows the hard constraints that reach it, the candidates in the order they were added
// with each row against each constraint (pass, fail, unknown; a person's judgement marked as theirs), the released
// component profiles that can be added, and the project's profiles that cannot (a candidate nobody reviewed is shown,
// labelled, with its Add disabled and the reason). Choosing asks for a reason for each other candidate and names the
// rows that read unknown as unproven; the chosen profile, library entry or archetype is then saved through the
// reviewed component form. Every step is a command of the selection (adoption-selection.js); nothing here writes,
// weighs or orders a candidate, and it works with no provider configured. The library chooser
// (component-library-ui.js) loads the comparison tools' entry by a dynamic import and opens it through the hook below
// (window.aiwSelection), with its own dialog helper, so no second lazy entry holds it and no workbench module imports a
// module of the package (rc44-s0-extensions-validate.mjs tells a package's modules by who imports them).
import {esc} from './html-escape.js';
import {selectionReading,selectableProfiles} from './adoption-selection.js';
const list=v=>Array.isArray(v)?v:[];
const STATE={pass:'pass',fail:'fail',unknown:'unknown'},KIND={profile:'Profile',library:'Library entry',archetype:'Catalogue archetype',existing:'Existing component',build:'Build',buy:'Buy',option:'Released option'};
const btn=(action,label,attrs='',cls='btn')=>`<button type="button" class="${cls}" data-sel-action="${action}" ${attrs}>${esc(label)}</button>`;
const decisionOf=(p,id)=>list(p?.decisions?.records).find(d=>d.id===id)||null;
// The selection view of one decision, or the start of one for a responsibility.
export function selectionView(p,{decisionId='',responsibilityId=''}={}){
 const d=decisionOf(p,decisionId),r=selectionReading(p,d);
 if(!r){const rs=list(p?.logical?.responsibilities);return `<section class="arc-verdict" data-selection><h3>Select a component for a responsibility</h3><p>A selection is a Chapter 3 decision: each candidate is read against the hard constraints that reach the responsibility. Unknown is never neutral.</p><label class="brain-field"><span>Responsibility</span><select data-sel-responsibility>${rs.map(x=>`<option value="${esc(x.id)}" ${x.id===responsibilityId?'selected':''}>${esc((x.ref||x.id)+' · '+x.title)}</option>`).join('')}</select></label><label class="brain-field"><span>Accountable architect</span><input data-sel-owner></label>${btn('start','Start the selection','','btn primary')}</section>`;}
 const label=id=>r.constraints.find(k=>k.id===id)?.label||id,chosen=!!r.choice;
 const rows=c=>c.eligibility.rows.map(x=>`<li data-selection-row="${esc(x.constraintId)}" data-state="${STATE[x.state]||'unknown'}">${esc(label(x.constraintId))}: <b>${esc(x.state)}</b>${x.basis==='person'?esc(' · judged by '+x.by+': '+x.reason):''}${x.state==='unknown'&&!chosen?' '+btn('judge','Judge','data-alternative="'+esc(c.alternativeId)+'" data-constraint="'+esc(x.constraintId)+'"'):''}</li>`).join('');
 const candidates=r.candidates.map(c=>`<article data-selection-candidate="${esc(c.alternativeId)}"><h4>${esc(c.title)}</h4><p class="brain-note">${esc((KIND[c.kind]||c.kind)+(c.by==='sol'?' · proposed by Sol':'')+' · '+(c.outcome==='open'?'not decided':c.outcome)+(c.rejection?' · '+c.rejection:''))}</p>${c.eligibility.reasons.map(x=>`<p class="brain-note">${esc(x)}</p>`).join('')}<ul>${rows(c)||'<li>No hard constraint reaches it.</li>'}</ul>${chosen?'':`<label class="brain-field"><span>Why not, if another is chosen</span><textarea data-sel-reject="${esc(c.alternativeId)}" rows="2"></textarea></label>`}</article>`).join('');
 const known=new Set(r.candidates.filter(c=>c.kind==='profile').map(c=>c.ref?.claimId)),profiles=r.kind==='component'?selectableProfiles(p).filter(x=>!known.has(x.claimId)):[];
 const offer=x=>`<article data-selection-profile="${esc(x.claimId)}"><h4>${esc(x.title)}</h4><p class="brain-note">${esc(x.label)} · ${esc((x.source.file||'source unavailable')+' L'+x.source.lineStart+'–L'+x.source.lineEnd)}</p>${x.selectable&&!chosen?btn('add-profile','Add as candidate','data-claim="'+esc(x.claimId)+'" data-release="'+esc(x.releaseId)+'"'):`<button type="button" class="btn" disabled title="${esc(x.selectable?'A candidate is chosen.':'Candidate knowledge can be read, not selected.')}">Add as candidate</button>`}</article>`;
 const choose=chosen?`<p data-selection-choice>Chosen: ${esc(r.candidates.find(c=>c.alternativeId===r.choice.alternativeId)?.title||r.choice.alternativeId)} by ${esc(r.choice.by||'')}${r.choice.unproven.length?esc(' · unproven: '+r.choice.unproven.map(label).join('; ')):''}.</p>${r.instantiated?'':`<fieldset data-sel-component><legend>The reviewed component</legend>${['title','kind','purpose','boundary','owner'].map(k=>`<label class="brain-field"><span>${esc(k[0].toUpperCase()+k.slice(1))}</span><input data-sel-field="${k}"></label>`).join('')}<label><input type="checkbox" data-sel-reviewed> I reviewed the proposed component</label>${btn('instantiate','Save the chosen candidate')}</fieldset>`}`
  :`<label class="brain-field"><span>Why this candidate is chosen</span><textarea data-sel-reason rows="2"></textarea></label>${r.candidates.map(c=>{const u=c.eligibility.rows.filter(x=>x.state==='unknown').map(x=>label(x.constraintId));return btn('choose','Choose '+c.title+(u.length?' (unproven: '+u.join('; ')+')':''),'data-alternative="'+esc(c.alternativeId)+'"'+(c.eligibility.state==='ineligible'?' disabled':''));}).join(' ')}`;
 return `<section class="arc-verdict" data-selection="${esc(r.id)}"><h3>${esc(d.question)}</h3><p>${esc(r.kind==='option'?'The released options of '+(r.concern?.title||''):'A component selection')}${r.prepared==='sol-draft'?' · prepared as a draft by Sol':''}. Candidates are read against each hard constraint, in the order they were added.</p><h4>Hard constraints</h4><ul>${r.constraints.map(k=>`<li>${esc(k.label)}${k.predicate?esc(' · '+k.predicate.fact+' '+k.predicate.op+' '+[].concat(k.predicate.value??'').join(', ')):' · no typed reading: a person judges each row'}</li>`).join('')||'<li>No hard constraint reaches it.</li>'}</ul><h4>Candidates</h4>${candidates||'<p>No candidate yet.</p>'}${profiles.length?`<h4>Component profiles</h4>${profiles.map(offer).join('')}`:''}${choose}</section>`;
}
// Opens the selection in a dialog, from the library chooser or the comparison tools. The store sends each step as a
// command; the view is drawn again from the document the server answers.
export function openSelection({store,modal,decisionId='',responsibilityId=''}={}){
 const doc=()=>store?.value?.document||{};let id=decisionId;
 const d=modal('Select a component',selectionView(doc(),{decisionId:id,responsibilityId})),redraw=()=>{const body=d.querySelector('.intake-body');if(body)body.innerHTML=selectionView(doc(),{decisionId:id,responsibilityId});};
 const send=async(type,payload)=>{const result=await store.command({type,payload});if(type==='selection.start')id=result?.selected||id;redraw();};
 const val=sel=>d.querySelector(sel)?.value||'';
 d.addEventListener('click',async e=>{const b=e.target.closest('[data-sel-action]');if(!b||b.disabled)return;b.disabled=true;
  try{const a=b.dataset.selAction;
   if(a==='start')await send('selection.start',{kind:'component',responsibilityIds:[val('[data-sel-responsibility]')],owner:val('[data-sel-owner]')});
   else if(a==='add-profile')await send('selection.candidate',{id,candidate:{kind:'profile',ref:{scope:'knowledge',claimId:b.dataset.claim,releaseId:b.dataset.release}}});
   else if(a==='judge'){const evidence=prompt('Evidence for the judgement'),reason=evidence&&prompt('Reason'),state=reason&&prompt('pass or fail','pass');if(state)await send('selection.judge',{id,alternativeId:b.dataset.alternative,constraintId:b.dataset.constraint,state,evidence,reason});}
   else if(a==='choose'){const r=selectionReading(doc(),decisionOf(doc(),id)),c=r.candidates.find(x=>x.alternativeId===b.dataset.alternative);await send('selection.choose',{id,alternativeId:c.alternativeId,reason:val('[data-sel-reason]'),unproven:c.eligibility.rows.filter(x=>x.state==='unknown').map(x=>x.constraintId),rejections:Object.fromEntries(r.candidates.filter(x=>x!==c).map(x=>[x.alternativeId,val('[data-sel-reject="'+x.alternativeId+'"]')]))});}
   else if(a==='instantiate')await send('selection.instantiate',{id,reviewed:!!d.querySelector('[data-sel-reviewed]')?.checked,component:Object.fromEntries([...d.querySelectorAll('[data-sel-field]')].map(x=>[x.dataset.selField,x.value]))});
  }catch(err){d.error?.(err);}finally{b.disabled=false;}});
 return d;
}
if(typeof window!=='undefined')window.aiwSelection=openSelection;
