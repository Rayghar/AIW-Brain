// The same reviewed, project-scoped knowledge reading is used beside a Chapter 7
// option and beside that option's projection in Design Resources. It never
// changes the selection or turns a source statement into an achieved target.
import {architectureKnowledgeForChoice} from './architecture-knowledge.js';
import {esc} from './html-escape.js';
import {currentProject,projectURL} from './project-context.js';
import {knowledgeState,knowledgeEligibility} from './knowledge-governance.js';
import {sha256} from './brain-integrity.js';
import {openDialog} from './dialog.js';

const rows=value=>Array.isArray(value)?value.filter(Boolean):[];
const label=value=>String(value||'').replace(/-/g,' ').replace(/^./,c=>c.toUpperCase());
const list=(title,values)=>values.length?`<div class="ak-choice-list"><h5>${esc(title)}</h5><ul>${values.map(value=>`<li>${esc(value)}</li>`).join('')}</ul></div>`:'';
const scopeText=scope=>Object.entries(scope||{}).filter(([,value])=>value!==''&&value!=null).map(([key,value])=>`${label(key)}: ${value}`);
const effectText=effect=>`${label(effect.direction||'unknown')} · ${effect.quality||'Quality unspecified'}${effect.rationale?' — '+effect.rationale:''}`;
const obligationText=obligation=>`${obligation.action||'Action to define'}${obligation.evidence?' · Evidence to seek: '+obligation.evidence:''}`;
function receiptHTML(receipt){
 if(!receipt)return '<p class="ak-choice-source">Source receipt unavailable. Do not rely on this claim until its exact source can be inspected.</p>';
 const locator=[receipt.repository,receipt.path,receipt.revision,receipt.lineStart&&receipt.lineEnd?`lines ${receipt.lineStart}–${receipt.lineEnd}`:''].filter(Boolean).join(' · ');
 const reviewer=receipt.review?.actor||'not shown';
 return `<p class="ak-choice-source"><b>Reviewed source</b> ${esc(locator||receipt.sourceId||'Locator not supplied')}<br><span>Claim ${esc(receipt.claimId||'')} · release ${esc(receipt.releaseId||'')} · authenticated reviewer ${esc(reviewer)} · ${esc(receipt.organizationId?'organisation release':'project release')}</span><br><span>SHA-256 ${esc(receipt.sourceHash||'Unavailable')}</span><br><button type="button" class="ak-source-open" data-ak-source="${esc(receipt.claimId)}" data-ak-release="${esc(receipt.releaseId)}">Inspect exact source passage</button></p>`;
}
function knowledgeRow(hit){
 const unit=hit.unit||{},scope=scopeText(unit.scope),effects=rows(unit.effects).map(effectText),obligations=rows(unit.obligations).map(obligationText);
 const matched=hit.applicability?.state==='context-match';
 return `<article class="ak-choice-row"><header><div><span class="ak-choice-kind">${esc(label(unit.kind||hit.claimType||'Reviewed claim'))}</span><h4>${esc(unit.mechanism||hit.statement||'Reviewed architecture knowledge')}</h4></div><span class="ak-choice-status ${matched?'matched':'needs-context'}">${matched?'Structured scope matches':'Context to confirm'}</span></header>
 <p class="ak-choice-statement">${esc(hit.statement||'')}</p>
 ${scope.length?`<p class="ak-choice-scope"><b>Source scope</b> ${esc(scope.join(' · '))}</p>`:''}
 ${list('Conditions to check',rows(hit.conditions))}${list('Exclusions to check',rows(unit.exclusions))}${list('Limits',rows(hit.limitations))}
 ${list('Declared applicability',rows(hit.applicability?.checks).filter(c=>!String(c.fact||'').startsWith('scope.')).map(c=>c.title+' · '+(c.state==='known'?'consistent with declared facts':c.state==='blocked'?'conflicts with this configuration':'needs context')+': '+c.detail))}
 ${list('Logical placement',rows(unit.placement).map(p=>label(p.target)+(p.role?' · '+p.role:'')+': '+p.reason+(p.capability?' Requires '+p.capability+'.':'')))}
 ${list('Possible quality effects',effects)}${list('Implementation and evidence obligations',obligations)}
 ${list('Open context',rows(hit.applicability?.reasons))}
 ${receiptHTML(hit.receipt)}</article>`;
}

export function knowledgeChoiceHTML(project,choice,{sourceAction='link',knowledgeSnapshot}={}){
 const result=architectureKnowledgeForChoice(project,choice,knowledgeSnapshot),matches=rows(result.matches),contextNeeded=matches.filter(x=>x.applicability?.state!=='context-match').length;
 const action=sourceAction==='resources'?'<button type="button" class="dr-link" data-dr-action="open-releases">Inspect source releases</button>':`<a href="${esc(projectURL('/?chapter=7&tab=work&resources=knowledge'))}">Open knowledge repository</a>`;
 return `<details class="ak-choice"><summary><span class="ak-choice-summary"><b>Why this choice?</b><small>${matches.length?`${matches.length} eligible reviewed knowledge ${matches.length===1?'record':'records'}${contextNeeded?' · '+contextNeeded+' need context':''}`:'No eligible reviewed knowledge for this context'}</small></span><span aria-hidden="true">⌄</span></summary>
 <div class="ak-choice-body"><p class="ak-choice-intro">These source interpretations can inform the comparison. Check every condition and exclusion against this option's version, topology and workload. The architect's recorded assessments and tests determine the design finding.</p>
 ${matches.length?`<div class="ak-choice-rows">${matches.map(knowledgeRow).join('')}</div>`:'<p class="ak-choice-empty">No released knowledge is scoped to this option. Continue with its documented mechanisms and record the project-specific reasoning and evidence in Chapter 7.</p>'}
 ${result.excludedCount?`<p class="ak-choice-excluded">${esc(result.excludedCount)} other reviewed ${result.excludedCount===1?'claim was':'claims were'} outside the stated product or configuration scope and are omitted.</p>`:''}
 <div class="ak-choice-footer">${action}<span>Reviewed source ≠ product approval or measured quality target.</span></div></div></details>`;
}

// Resolve the frozen release and original in the existing knowledge lifecycle.
// This reader neither copies originals into another store nor changes a model object.
export function knowledgeSourceReading(project,releaseId,claimId){
 const state=knowledgeState(project),release=[...state.releases,...(state.organizationReleases||[])].find(r=>r.id===releaseId),claim=release?.claims.find(c=>c.id===claimId);
 const source=(release?.organizationId?release.sources:state.sources)?.find(s=>s.id===claim?.sourceId);
 if(!source||!claim)return {available:false,reasons:['The exact released claim or original is unavailable.']};
 const exact=source.hash===claim.sourceHash&&sha256(source.body)===source.hash&&source.body.split('\n').slice(claim.lineStart-1,claim.lineEnd).join('\n')===claim.excerpt;
 const eligibility=knowledgeEligibility(project,claim,release);
 return {available:exact,source,claim,release,...eligibility,reasons:exact?eligibility.reasons:['The original or passage hash changed. Reacquire and review the exact revision.']};
}
export function openKnowledgeSource(p,releaseId,claimId){
 if(!p)return;
 const reading=knowledgeSourceReading(p,releaseId,claimId),{source,claim,release}=reading;
 const numbered=reading.available?source.body.split('\n').map((line,i)=>(i+1)+'  '+line).join('\n'):'';
 openDialog({className:'ak-source-dialog',labelledBy:'ak-source-title',initialFocus:'#ak-source-title',html:
 '<header><h2 id="ak-source-title" tabindex="-1">Exact source and conditions</h2><button type="button" data-dialog-close aria-label="Return to the same option">×</button></header>'+
 '<p role="status">'+(reading.eligible?'Active released interpretation · independent review recorded':'Support needs review')+'</p>'+
 (reading.reasons.length?'<ul>'+reading.reasons.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+
 (reading.available?'<p><b>'+esc(source.title||source.path)+'</b><br>'+esc([source.repository,source.path,source.revision].filter(Boolean).join(' · '))+'<br>Claim '+esc(claim.id)+' · release '+esc(release.id)+' · lines '+claim.lineStart+'–'+claim.lineEnd+'</p><p class="ak-source-hash">SHA-256 '+esc(source.hash)+'</p><p><b>Saved permission / use note</b><br>'+esc(source.license||'No permission note recorded. Human review is required.')+'</p><h3>Exact passage</h3><pre>'+esc(claim.excerpt.split('\n').map((line,i)=>(claim.lineStart+i)+'  '+line).join('\n'))+'</pre><h3>Interpretation</h3><p>'+esc(claim.statement)+'</p>'+list('Applies when',rows(claim.conditions))+list('Limits',rows(claim.limitations))+'<p>Independent reviewer: '+esc(claim.review?.actor||'Not recorded')+'</p><details><summary>Inspect complete versioned original</summary><pre>'+esc(numbered)+'</pre></details>':'<p>The source cannot be verified. This reading confers no design authority.</p>')+
 '<footer><button type="button" data-dialog-close>Return to the same option</button></footer>'});
}
if(typeof document!=='undefined')document.addEventListener('click',event=>{
 const button=event.target.closest?.('[data-ak-source]');if(button)openKnowledgeSource(currentProject(),button.dataset.akRelease,button.dataset.akSource);
});
