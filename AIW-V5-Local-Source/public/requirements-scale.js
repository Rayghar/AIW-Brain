// Chapter 1 at the size of a real project (round 12, D-03, D-09, D-15): what the Requirements studio (requirements.js)
// draws once a workbook brings hundreds or thousands of requirements. The import summary and the groups lead the
// register; a requirement's details show every imported field; the checks read per cause; and the dialogs for a group,
// a reviewed bulk confirmation, a reason for missing evidence and an import's proposals are drawn from their
// descriptors (record-fields.js). Pure HTML builders over the saved project; the studio wires the events and sends the
// commands (requirement-commands.js).
import {esc} from './html-escape.js';
import {formatNumber,formatDate} from './format.js';
import {sourceAssurance,evidenceTreated} from './assurance-domain.js';
import {GROUP_KINDS,GROUP_RULE_FIELDS,GROUP_LIMITS,RULE_OPS,groupSummary,groupsOf,groupById,kindName} from './requirement-groups.js';
import {recordField,kitFor} from './record-fields.js';
import {MODULE_ROLES} from './module-model.js';
const fGroup=kitFor('requirements.group'),fBrief=kitFor('requirements.brief'),fStake=kitFor('requirements.stakeholders');
const n=v=>formatNumber(v||0);
const plural=(v,one,many)=>n(v)+' '+(v===1?one:many);
const btn=(action,label,style='',attrs='')=>`<button class="r-btn ${style}" data-r-action="${action}" ${attrs}>${label}</button>`;
const dbtn=(action,label,style='',attrs='')=>`<button type="button" class="btn ${style}" data-r-action="${action}" ${attrs}>${label}</button>`;
export const datasetsOf=p=>p?.intake?.datasets||[];
// The proposals of the latest import still waiting for the person: stakeholders and a brief.
// Round 12 (B2, GR-INT-04, GR-INT-10): and the outcomes and constraints the rows proposed (`records`: the latest dataset
// with any still waiting).
export function pendingProposals(p){
 const out={stakeholders:[],brief:null,datasetId:null,records:null};
 for(const d of datasetsOf(p)){const st=(d.proposals?.stakeholders||[]).filter(s=>s.status==='proposed');if(st.length){out.stakeholders=st;out.datasetId=d.id;out.dataset=d;}if(d.proposals?.brief?.status==='proposed'){out.brief=d.proposals.brief;out.briefDataset=d;}
  const [outcomes,constraints]=['outcomes','constraints'].map(k=>(d.proposals?.[k]||[]).filter(x=>x.status==='proposed'));if(outcomes.length||constraints.length)out.records={dataset:d,outcomes,constraints};}
 return out;
}
// ---------------------------------------------------------------- the register's lead: the import and its groups
export function importSummaryHTML(p){
 const ds=datasetsOf(p);if(!ds.length)return '';
 const a=sourceAssurance(p.artefacts,p),reqs=p.artefacts.filter(x=>x.type==='requirement'),d=ds.at(-1),pri={Must:0,Should:0,Could:0,'':0};for(const r of reqs)pri[r.priority||'']=(pri[r.priority||'']||0)+1;
 // Round 12 (GR-INT-19): a row with no band, or a band the mapping leaves unset, is not stated.
 const band=d.mapping?.priorityBand?(Object.keys(d.priorityMap||{}).length?'Set from the source priority band.':'No band mapping was chosen; the priority of each imported requirement is not stated.'):'';
 const pending=pendingProposals(p),r=pending.records,offers=[pending.stakeholders.length?btn('review-stakeholders',plural(pending.stakeholders.length,'stakeholder','stakeholders')+' proposed'):'',pending.brief?btn('review-brief','A brief proposed'):'',r?btn('review-import-records',[r.outcomes.length&&plural(r.outcomes.length,'outcome','outcomes'),r.constraints.length&&plural(r.constraints.length,'constraint','constraints')].filter(Boolean).join(' and ')+' proposed'):''].filter(Boolean).join('');
 return `<section class="r-import" aria-labelledby="r-import-title"><p class="r-kicker" id="r-import-title">${ds.length===1?'Imported from':'Latest import'} ${esc(d.filename)} · ${esc(d.sheet)} · revision ${d.revision} · ${esc(formatDate(d.at))}</p><div class="intake-assurance-summary"><span><strong>${n(a.counts.assessed)}</strong>source requirements</span><span><strong>${n(reqs.filter(x=>x.confirmed).length)}</strong>confirmed by you</span><span><strong>${n(a.counts.deliveryGaps)}</strong>delivery gaps</span><span><strong>${n(a.counts.additionalAssurance)}</strong>additional assurance cases</span><span><strong>${n(a.counts.repeatedGroups)}</strong>statement groups to review</span><span><strong>${n(a.counts.missingEvidence-a.counts.evidenceTreated)}</strong>without evidence or a reason</span></div><p class="r-import-priorities">Priorities: Must ${n(pri.Must)} · Should ${n(pri.Should)} · Could ${n(pri.Could)}${pri['']?' · Not stated '+n(pri['']):''}. ${band}</p>${offers?`<div class="r-actions r-import-offers"><span>From this workbook, waiting for you:</span>${offers}</div>`:''}<div class="r-actions">${btn('assurance','Review delivery evidence')}</div></section>`;
}
// Round 24 (D-24-08): once the requirements have a module structure, its modules and sub-modules lead the register in
// their own section (module-ui.js structureHTML, in the slot requirements.js draws before this table) and this table keeps
// the facets: the themes, the user groups and every other group.
export const isFacet=g=>g.kind!=='module'&&g.kind!=='sub-module';
export function groupsHTML(p,{group='',open=true}={}){
 const all=groupSummary(p),rows=all.filter(r=>isFacet(r.group)),modular=rows.length<all.length;if(!rows.length)return modular?`<div class="r-actions">${btn('new-group','New group')}</div>`:'';
 const kinds=GROUP_KINDS.filter(([k])=>rows.some(r=>r.group.kind===k)).map(([k,l])=>l.toLowerCase()+'s: '+rows.filter(r=>r.group.kind===k).length).join(' · ');
 return `<details class="r-groups" ${open||group?'open':''}><summary><b>${modular?'Other groups':'Groups'} · ${rows.length}</b><span>${esc(kinds)}</span></summary><div class="r-groups-wrap"><table class="r-groups-table"><thead><tr><th scope="col">Group</th><th scope="col">Kind</th><th scope="col">Requirements</th><th scope="col">Delivery gaps</th><th scope="col">Confirmed</th></tr></thead><tbody>${rows.map(r=>`<tr class="${r.group.id===group?'selected':''}"><th scope="row"><button type="button" data-r-group="${esc(r.group.id)}" aria-pressed="${r.group.id===group}"><small>${esc(r.group.id)}</small> ${esc(r.group.title)}</button></th><td>${esc(kindName(r.group.kind))}</td><td>${n(r.members)}</td><td><span class="r-gap-bar" aria-hidden="true"><b style="width:${r.members?Math.round(100*r.gaps/r.members):0}%"></b></span>${n(r.gaps)}</td><td>${n(r.confirmed)}</td></tr>`).join('')}</tbody></table></div><div class="r-actions">${btn('new-group','New group')}${group?btn('edit-group','Edit this group'):''}</div></details>`;
}
// The register's filters at size: a group, delivery gaps, the cause of a finding, the search; and what is selected.
// Round 24: the group filter names a module or a sub-module as it names any group (a module holds its sub-modules'
// requirements), the modules first in their tree; the count says which scope the register is held to.
export function filterBarHTML(p,ui,{total,shown}){
 const groups=groupSummary(p).map(r=>r.group),mods=groups.filter(g=>!isFacet(g)),title=g=>g.kind==='sub-module'?(groups.find(x=>x.id===g.parentId)?.title||'')+' › '+g.title:g.title,ordered=mods.filter(g=>g.kind==='module').flatMap(m=>[m,...mods.filter(g=>g.parentId===m.id)]);
 const option=g=>`<option value="${esc(g.id)}" ${ui.group===g.id?'selected':''}>${esc(g.id+' · '+title(g))}</option>`,facets=groups.filter(isFacet);
 return `<div class="r-filter-bar">${groups.length?`<label><span>Group</span><select id="r-group-filter"><option value="">All groups</option>${mods.length?`<optgroup label="Modules and sub-modules">${ordered.map(option).join('')}</optgroup>${facets.length?`<optgroup label="Other groups">${facets.map(option).join('')}</optgroup>`:''}`:groups.map(option).join('')}</select></label>`:''}${p.artefacts.some(a=>a.type==='requirement'&&a.assessment?.delivery)?`<label class="r-checkbox"><input type="checkbox" id="r-gaps-filter" ${ui.onlyGaps?'checked':''}>Delivery gaps only</label>`:''}${ui.cause?`<span class="chip r-cause-chip">${esc(ui.causeLabel||ui.cause)} · ${n(shown)}<button type="button" data-r-action="clear-cause" aria-label="Show every requirement again">×</button></span>`:''}${ui.domain?`<span class="chip">${esc(ui.domain)}<button type="button" data-r-action="clear-domain" aria-label="Show every domain">×</button></span>`:''}<span class="r-filter-count">${n(shown)} of ${n(total)} requirements${ui.scopeTitle?' in '+esc(ui.scopeTitle):''}</span></div>`;
}
export function selectionBarHTML(ui,{unconfirmed,lacking}){
 const picked=ui.picked.size;
 return `<div class="r-selection-bar" role="group" aria-label="Work on many requirements"><span>${picked?plural(picked,'requirement','requirements')+' selected':'Select requirements on this page, or work on everything shown.'}</span>${btn('pick-page','Select this page')}${picked?btn('clear-picks','Clear selection'):''}${picked?btn('confirm-picked','Confirm selected','primary'):''}${!picked&&unconfirmed?btn('confirm-shown',`Confirm all ${n(unconfirmed)} shown`,'primary'):''}${(picked||lacking)?btn('evidence-reason',picked?'Record why no evidence':`Record why no evidence (${n(lacking)})`):''}${picked?btn('group-picked','Group the selection'):''}</div>`;
}
// ---------------------------------------------------------------- a requirement's details
const FACTS=[['domain','Domain'],['capability','Capability theme'],['module','Module'],['userGroup','User group']];
const ASSERTIONS=[['delivery','Delivery'],['validation','Validation'],['reliability','Reliability'],['manual','Manual intervention'],['priorityBand','Source priority band'],['priorityScore','Source priority score'],['category','Category'],['pglLinked','Post-go-live link'],['date','Assessment date'],['sourceBasis','Source basis'],['mappingMethod','Mapping method'],['sourceReference','Source reference'],['sourceAuthority','Source authority'],['evidence','Evidence reference'],['comments','Source comments'],['userNeed','User need']];
export function sourceFactsHTML(p,a){
 if(!a?.provenance&&!a?.assessment)return '';
 const s=a.assessment||{},rows=[...FACTS.map(([k,l])=>a[k]?[l,a[k]]:null),...ASSERTIONS.map(([k,l])=>s[k]?[l,s[k]]:null),s.uatCount||s.uatPass||s.uatFail||s.uatBlocked?['Historical tests',`${n(Number(s.uatCount)||0)} run · ${n(Number(s.uatPass)||0)} passed · ${n(Number(s.uatFail)||0)} failed · ${n(Number(s.uatBlocked)||0)} blocked`]:null,s.outcome&&s.outcome!==a.description?['Intended outcome',s.outcome]:null].filter(Boolean);
 const groups=groupsOf(p,a.id).map(id=>groupById(p,id)).filter(Boolean);
 const t=a.evidenceTreatment,evidence=s.evidence?`Evidence reference: ${esc(s.evidence)}.`:t?`${evidenceTreated(a)?'No evidence in the source. Reason recorded':'The reason recorded'} on ${esc(formatDate(t.at))} by ${esc(t.actor)}: “${esc(t.reason)}”${evidenceTreated(a)?'':' The source row has changed since; review the reason again.'}`:'No evidence reference in the source, and no reason recorded.';
 return `<section class="intake-source-assertions"><p class="r-kicker">${esc(a.externalId||a.id)} / Source assertion</p><dl class="r-source-facts">${rows.map(([l,v])=>`<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>${groups.length?`<p class="r-group-chips">${groups.map(g=>`<button type="button" class="chip" data-r-group="${esc(g.id)}" title="Show the requirements of ${esc(g.title)}">${esc(g.title)}</button>`).join('')}</p>`:''}<p>${evidence}</p><small>These are source assertions, separate from requirement confirmation and verified delivery.</small><div class="r-actions">${btn('source-row','View original cells')}${s.evidence?'':btn('evidence-one',t?'Change the reason':'Record why no evidence')}${btn('assurance','Review evidence')}</div></section>`;
}
// ---------------------------------------------------------------- the checks, per cause
export function causesHTML(causes){
 return causes.map(c=>`<template data-cause-actions="${esc(c.code)}">${c.ids.some(id=>/^REQ-/.test(id))&&c.count>1?`<button type="button" class="r-btn" data-r-cause="${esc(c.code)}">Filter the register</button>`:''}${c.code==='confirmation'&&c.ids.some(id=>/^REQ-/.test(id))?btn('confirm-cause','Confirm after review'):''}${c.code==='source-evidence'?btn('evidence-cause','Record why no evidence'):''}</template>`).join('');
}
// ---------------------------------------------------------------- dialogs
// Round 24 (D-24-08): a module carries its role, a sub-module the module it belongs to; each choice is shown with the
// kind it belongs to and sent only for it (requirements.js), so a person renames a module, moves a sub-module to another
// module or changes a rule here.
export function groupFormHTML(p,g,{picked=[],kind=''}={}){
 const rule=[...(g?.rule||[]),{},{},{},{}].slice(0,GROUP_LIMITS.conditions),fieldOptions=[['','No condition'],...GROUP_RULE_FIELDS],k=g?.kind||kind||'functional-area';
 const modules=groupSummary(p).map(r=>r.group).filter(x=>x.kind==='module'&&x.id!==g?.id),parent=g?.parentId||modules[0]?.id||'';
 return `<form id="r-group-form"><div class="l-form-grid">${fGroup('title',g?.title||'')}${fGroup('kind',k,{options:GROUP_KINDS})}</div><div class="l-form-grid"><div data-r-kinds="sub-module" ${k==='sub-module'?'':'hidden'}>${fGroup('parentId',parent,{options:modules.length?modules.map(x=>[x.id,x.id+' · '+x.title]):[['','No module yet']]})}</div><div data-r-kinds="module" ${k==='module'?'':'hidden'}>${fGroup('role',g?.role||'business',{options:MODULE_ROLES})}</div></div>${fGroup('description',g?.description||'')}${fGroup('owner',g?.owner||'',{project:p})}${fGroup('memberIds',(g?.memberIds||picked).join(', '))}<fieldset class="l-checks r-rule"><legend>Rule on imported attributes</legend><p class="l-note">A requirement belongs when every condition holds, for example Domain is Lending and Delivery is one of Not delivered; Partly delivered. Separate the values of “is one of” with a semicolon. Leave the rule empty to name members only.</p>${rule.map((c,i)=>`<div class="l-form-grid">${recordField('requirements.group','rule-field',c.field||'',{item:i,label:'Attribute '+(i+1),options:fieldOptions})}${recordField('requirements.group','rule-op',c.op||'is',{item:i,label:'Condition '+(i+1),options:RULE_OPS.map(o=>[o,o])})}${recordField('requirements.group','rule-value',c.op==='is one of'?(c.values||[]).join('; '):c.value||'',{item:i,label:'Value '+(i+1)})}</div>`).join('')}</fieldset><p class="r-note">${g?'The ID '+esc(g.id)+' stays. Records that link this group keep the link.':'A stable ID is assigned when you save.'}${g?.origin==='import'?' This group came from an import; your changes make it yours.':''}</p><div class="l-dialog-actions">${g?dbtn('delete-group','Remove group','danger',`data-group-id="${esc(g.id)}"`):''}${dbtn('close-dialog','Cancel')}<button class="btn primary" type="submit">Save group</button></div></form>`;
}
export function confirmFormHTML({label,count,total}){
 return `<form id="r-confirm-form"><p>${esc(label)}: ${plural(total,'requirement','requirements')}, ${count===total?'none of them':n(total-count)} confirmed already.</p><div class="r-reference-note">Confirming ${plural(count,'requirement','requirements')} records that you reviewed ${count===1?'it':'them'}. It is not approval, and it does not verify delivery. The change journal records this step once, with every requirement it confirms.</div>${recordField('requirements.confirm','reviewed',false)}<div class="l-dialog-actions">${dbtn('close-dialog','Cancel')}<button class="btn primary" type="submit">Confirm ${n(count)}</button></div></form>`;
}
export function evidenceFormHTML({label,count,reason=''}){
 return `<form id="r-evidence-form"><p>${esc(label)}: ${plural(count,'requirement has','requirements have')} no evidence reference in the source.</p>${recordField('requirements.evidence','reason',reason)}<div class="r-reference-note">The reason is recorded with your name and the date. The missing-evidence finding clears for these requirements while their source rows stay as they are. Nothing is approved.</div>${recordField('requirements.evidence','reviewed',false)}<div class="l-dialog-actions">${dbtn('close-dialog','Cancel')}<button class="btn primary" type="submit">Record the reason for ${n(count)}</button></div></form>`;
}
export function stakeholdersFormHTML(pending){
 const options=pending.stakeholders.map(s=>({id:s.name,title:s.name,note:`${plural(s.count,'requirement','requirements')} · ${plural(s.gaps,'delivery gap','delivery gaps')}`}));
 return `<form id="r-stakeholders-form"><p>${plural(options.length,'user group','user groups')} from the ${esc(pending.dataset?.proposals?.stakeholderLabel||'user group')} column of ${esc(pending.dataset?.filename||'the workbook')}. Each one you tick becomes a stakeholder you can then describe and confirm.</p>${fStake('accept',options.map(o=>o.id),{options})}${fStake('dismissRest',false)}${fStake('reviewed',false)}<div class="l-dialog-actions">${dbtn('close-dialog','Cancel')}<button class="btn primary" type="submit">Add the ticked stakeholders</button></div></form>`;
}
export function briefFormHTML(p,brief,dataset,composed){
 const options=brief.sentences.map((x,i)=>({id:String(i),title:x.text,note:x.sheet+'!'+x.cell}));
 return `<form id="r-brief-proposal-form"><p>${plural(brief.sentences.length,'sentence','sentences')} from ${esc(brief.sheets.join(', '))}. Tick the ones that describe the project and choose where each belongs. Then edit the text below.</p>${fBrief('sentences',options.map(o=>o.id),{options})}<div class="r-brief-parts">${brief.sentences.map((x,i)=>recordField('requirements.brief','part',x.part,{item:String(i),label:'Sentence '+(i+1)+' is about',options:[['problem','The problem'],['goal','The outcome']]})).join('')}</div>${fBrief('problem',composed.problem)}${fBrief('goal',composed.goal)}${fBrief('source',composed.source)}${p.brief?.problem?`<p class="r-reference-note">This replaces the brief you have. It stays unconfirmed until you confirm it.</p>`:''}${fBrief('reviewed',false)}<div class="l-dialog-actions">${dbtn('dismiss-brief','Dismiss the proposal')}${dbtn('close-dialog','Cancel')}<button class="btn primary" type="submit">Use as the brief</button></div></form>`;
}
