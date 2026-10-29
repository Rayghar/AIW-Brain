import {knowledgeRecord,KNOWLEDGE_PACK} from './aiw-brain.js';
import {hoverTipHTML} from './cursor-tip.js';
import {homeChapter,solTarget,chapterReading} from './chapter-reasoning.js';
import {reasoningSource} from './design-reasoning.js';
import {detectAntiPatterns,antiPatternsFor} from './design-spec.js';
import {adoptionStatistics} from './brain-reasoning.js';
import {journeyObjectURL} from './journey-context.js';
import {projectURL} from './project-context.js';
import {esc} from './html-escape.js';
import {RECORD_COLLECTIONS,recordNoun} from './field-suggestions.js';
import {curatedName,notForFinancialUse,curationNote,NOT_FOR_FINANCIAL_USE} from './catalogue-curation.js';
import {domainKnowledge,domainTopic} from './domain-knowledge.js';
import {designTasksForRecord} from './design-task-state.js';
export function contextSketch(c){
 if(c.selected.id==='project')return '';
 const neighbours=c.neighbours.slice(0,3),height=Math.max(106,neighbours.length*68+20),middle=height/2;
 const lines=text=>{const words=String(text).split(/\s+/),out=[''];for(const word of words){if(out.at(-1).length+word.length>18&&out.at(-1))out.push('');out[out.length-1]+=(out.at(-1)?' ':'')+word;}return out.slice(0,2).map((line,i)=>line.length>20?line.slice(0,18)+'…':i===1&&out.length>2?line.slice(0,17)+'…':line);};
 const node=(n,x,y,w,selected=false)=>`<a href="${projectURL(journeyObjectURL(n))}" aria-label="Open ${esc(n.ref||n.id)}: ${esc(n.title)}"><title>${esc(n.title)}</title><rect x="${x}" y="${y}" width="${w}" height="58" rx="7" class="${selected?'brain-map-selected':'brain-map-object'}"/><text x="${x+10}" y="${y+17}" class="brain-map-ref">${esc(n.ref||n.id)}</text>${lines(n.title).map((line,i)=>`<text x="${x+10}" y="${y+34+i*15}">${esc(line)}</text>`).join('')}</a>`;
 return `<figure class="brain-context-map"><svg viewBox="0 0 360 ${height}" role="group" aria-label="Recorded connections for ${esc(c.selected.title)}">${neighbours.map((n,i)=>{const edge=c.links.find(e=>e.from===n.id||e.to===n.id),y=20+i*68+29,right=edge?.from===c.selected.id;return `<path d="M150 ${middle} C181 ${middle} 181 ${y} 212 ${y}" class="brain-map-line"/><path d="${right?'M206 '+(y-4)+'l6 4-6 4':'M156 '+(middle-4)+'l-6 4 6 4'}" class="brain-map-line"/><title>${esc(edge?.from+' · '+edge?.label+' · '+edge?.to)}</title>`;}).join('')}${node(c.selected,8,middle-29,142,true)}${neighbours.map((n,i)=>node(n,212,20+i*68,140)).join('')}</svg><figcaption>${c.links.length?'Recorded connections'+(c.neighbours.length>3?' · '+(c.neighbours.length-3)+' more in the model':''):'No connections recorded yet'}</figcaption></figure>`;
}
export function knowledgeHTML(receipt){
 const r=receipt.content||knowledgeRecord(receipt.patternId);if(!r)return '';
 const items=(title,values)=>values?.length?`<h4>${title}</h4><ul>${values.map(x=>`<li>${esc(typeof x==='string'?x:x.description||x.action||x.text||'')}</li>`).join('')}</ul>`:'';
 const reviewed=receipt.kind==='governed-claim',legacySeeds=receipt.claims||[],where=[receipt.repository,receipt.sourceFile,receipt.path,receipt.sourcePointer,receipt.revision,receipt.lineStart?'lines '+receipt.lineStart+'–'+receipt.lineEnd:''].filter(Boolean).join(' · ');
 const posture=reviewed?'Independently reviewed interpretation. Check its conditions and limits against this project; implementation evidence remains separate.':legacySeeds.length?'Archived pilot references. Their current upstream revisions require verification.':'Editorial repository synthesis for questions and comparison. Project suitability remains unassessed.';
 const hashes=[['Source',receipt.sourceHash||receipt.sourceSha256],['Record',receipt.recordHash||receipt.recordSha256],['Manifest',receipt.manifestHash||receipt.manifestSha256],['Claim',receipt.claimHash],['Release',receipt.releaseHash]].filter(([,v])=>v);
 return `<details class="brain-knowledge"><summary><span>Knowledge basis</span><b>${esc(receipt.title)}</b></summary><p class="brain-note">${esc(receipt.posture||posture)} · ${esc(receipt.releaseId)}</p><p>${esc(r.problem)}</p>${items('Prerequisites to examine',r.prerequisites)}${items('Conditions of use',r.applicabilityRules)}${items('Limits',receipt.limitations)}${items('Risks and trade-offs',r.risks)}${r.counterfactualExplanation?`<p class="brain-note">${esc(r.counterfactualExplanation)}</p>`:''}${items('Obligations to carry forward',r.obligations)}<p class="brain-note">${esc(posture)}</p>${legacySeeds.map(c=>`<blockquote>${esc(c.statement)}</blockquote><p class="brain-note">${esc([c.provenance?.repository,c.provenance?.path,c.provenance?.revision].filter(Boolean).join(' · '))}</p>`).join('')}<details><summary>Exact source reference</summary><p class="brain-hash">${esc(where)}</p>${hashes.map(([label,value])=>`<p class="brain-hash">${esc(label)} SHA-256: ${esc(value)}</p>`).join('')}${reviewed?`<p>${esc(receipt.claimId)} · ${esc(receipt.releaseId)} · reviewer ${esc(receipt.review?.actor||receipt.review?.reviewer||'recorded in release')}</p>`:''}</details></details>`;
}
// These small diagrams explain a pattern, not a generated or accepted project topology.
export function patternSketch(k,title){
 if(k.approach)return boundarySketch(k.approach,title);
 const box=(x,y,w,label,detail='',primary=false)=>`<rect x="${x}" y="${y}" width="${w}" height="48" rx="7" class="${primary?'pattern-node-primary':'pattern-node'}"/><text x="${x+w/2}" y="${y+21}" text-anchor="middle" class="${primary?'pattern-light':''}">${esc(label)}</text>${detail?`<text x="${x+w/2}" y="${y+37}" text-anchor="middle" class="pattern-detail ${primary?'pattern-light':''}">${esc(detail)}</text>`:''}`;
 const arrow=(x,y,w)=>`<path d="M${x} ${y}h${w}m-5-4 5 4-5 4" class="pattern-line"/>`;
 const caption=(y,text)=>`<text x="170" y="${y}" text-anchor="middle" class="pattern-caption">${esc(text)}</text>`;
 const drawings={
  'PAT-TRANSACTIONAL-OUTBOX':`<rect x="8" y="8" width="324" height="82" rx="9" class="pattern-zone"/>${caption(26,'ONE LOCAL TRANSACTION')}${box(20,34,140,'Business change','database',true)}${box(180,34,140,'Outbox entry','pending event')}${arrow(160,58,19)}<path d="M250 90v6H89v6m-4-5 4 5 4-5" class="pattern-line"/>${box(20,102,138,'Relay','retry & monitor')}${box(204,102,116,'Consumer','deduplicate')}${arrow(158,127,45)}`,
  'PAT-CIRCUIT-BREAKER':`${box(8,26,98,'Caller','bounded wait',true)}${box(121,26,98,'Circuit','stop / probe')}${box(234,26,98,'Dependency','remote')}${arrow(106,50,14)}${arrow(219,50,14)}<path d="M170 74v33" class="pattern-line"/>${box(83,108,174,'Safe fallback','visible degraded response')}`,
  'PAT-RETRY-WITH-BACKOFF':`${box(8,24,98,'Attempt 1','transient failure',true)}${box(122,24,98,'Wait + jitter','bounded delay')}${box(234,24,98,'Attempt 2','same intent')}${arrow(106,48,15)}${arrow(220,48,13)}<path d="M22 90v12h296V90" class="pattern-line"/>${caption(127,'ONE TOTAL TIME BUDGET')}${caption(147,'Idempotency protects repeated work')}`,
  'PAT-BULKHEAD':`<rect x="8" y="8" width="324" height="68" rx="8" class="pattern-zone"/><rect x="8" y="90" width="324" height="68" rx="8" class="pattern-zone"/>${box(20,18,138,'Critical workload','reserved capacity',true)}${box(201,18,119,'Pool A','bounded queue')}${arrow(158,42,42)}${box(20,100,138,'Other workload','separate limit')}${box(201,100,119,'Pool B','bounded queue')}${arrow(158,124,42)}`,
  'PAT-ZERO-TRUST':`${box(8,23,98,'Identity','user / workload',true)}${box(121,23,98,'Policy','access decision')}${box(234,23,98,'Resource','enforcement')}${arrow(106,47,14)}${arrow(219,47,14)}<path d="M170 71v23h113V71" class="pattern-line"/>${box(97,111,194,'Decision record','auditable; no secrets')}`,
  'PAT-EVENT-SOURCING':`${box(8,25,98,'Event','business fact',true)}${box(121,25,98,'Event store','authoritative')}${box(234,25,98,'Projection','derived view')}${arrow(106,49,14)}${arrow(219,49,14)}<path d="M170 73v27h113V73" class="pattern-line"/>${caption(126,'REBUILD FROM RECORDED EVENTS')}${caption(147,'Schema, retention and erasure need design')}`
 };
 return `<figure class="brain-pattern-figure"><svg viewBox="0 0 340 168" role="img" aria-label="${esc(k.record.name)}: illustrative pattern structure, not your model">${drawings[k.id]||''}</svg><figcaption>Pattern sketch · not applied to your model</figcaption></figure>`;
}
export function boundarySketch(approach,title='Primary responsibility'){
 const separate=approach==='separate',short=title.length>32?title.slice(0,29)+'…':title;
 return `<svg class="brain-boundary-sketch" viewBox="0 0 360 150" role="img" aria-label="${separate?'Separate coordination boundary sketch':'Cohesive boundary sketch'} for ${esc(title)}. Illustrative; model proposal follows your answers."><rect x="12" y="14" width="${separate?184:336}" height="122" rx="10" class="sketch-boundary"/><text x="28" y="36" class="sketch-label">APPLICATION BOUNDARY</text><rect x="28" y="49" width="${separate?152:304}" height="35" rx="6" class="sketch-object"/><text x="${separate?104:180}" y="71" text-anchor="middle">${esc(separate?(short.length>20?short.slice(0,17)+'…':short):short)}</text>${separate?'<rect x="220" y="49" width="128" height="65" rx="8" class="sketch-proposed"/><text x="284" y="72" text-anchor="middle">Proposed</text><text x="284" y="91" text-anchor="middle">coordinator</text><path d="M180 67h34m-5-4 5 4-5 4" class="sketch-link"/><text x="104" y="113" text-anchor="middle" class="sketch-label">EXPLICIT CONTRACT</text>':'<rect x="28" y="92" width="304" height="28" rx="6" class="sketch-proposed"/><text x="180" y="111" text-anchor="middle">Coordination within this boundary</text>'}</svg>`;
}

// The hover explanation is the one rule-based micro-reading of cursor-tip.js (round 2, I2-11).
export function brainCursorText(p,id){return hoverTipHTML(p,id);}
// Saved provenance is a synchronous reading of the project. Opening its native
// task is the only operation that needs the full design-task workspace.
export function designRecordContext(p,id){
 const task=designTasksForRecord(p,id).at(-1);return task?`<details class="dc-provenance"><summary>Design reasoning · ${esc(task.id)}</summary><p>${esc(task.applied.reason)}</p><p>Requirement ${esc(task.requirementId)} · architect name entered: ${esc(task.applied.reviewer)}</p><small>Free-text attestation; identity, independence and governance approval remain unverified.</small><button type="button" class="btn" data-dc-action="open-task" data-task="${esc(task.id)}">Open source & reasoning</button></details>`:'';
}
export function designRecordExplanation(p,id){
 const task=designTasksForRecord(p,id).at(-1);return task?'<small>Design source · '+esc(task.requirementId)+' / '+esc(task.id)+'</small><small>'+esc(task.applied.reason)+'</small>':'';
}

// Relevant knowledge for the selected record (round 2, I2-06): the catalogue concepts the Brain retrieved for it with
// the terms that matched, the knowledge rules that fired, the record's own tactics and trade-offs (Chapter 2) or
// the anti-patterns it is part of (Chapters 4 to 10), and the top concept's pattern DNA — the roles its component
// and interface kits name — read descriptively. Retrieval rank is word overlap, never a score, and candidate or
// discovery knowledge has no part in it.
// Round 12 (GR-DOM-03, GR-DOM-04, GR-DOM-05): what released domain knowledge offers for the selected record: the method
// of its decision topic (or the topics released, for a decision on another topic), the tactics for its quality
// category, the product facts for its technology categories, the regulation records for a constraint or a compliance
// driver. Released claims only (domain-knowledge.js), each with its release and reviewer; nothing while none is released.
function releasedOffersHTML(p,c){
 const K=domainKnowledge(p);if(!K.topics.length&&!K.tactics.length&&!K.products.length&&!K.regulations.length)return '';
 const r=c.selected.record||{},ch=c.selected.chapter,rows=[],cite=x=>` <small>${esc(x.receipt.releaseId)} · verified by ${esc(x.receipt.review?.reviewer||'a second person')}</small>`,li=(t,body,x)=>rows.push(`<li><b>${esc(t)}</b> ${esc(body)}${cite(x)}</li>`);
 if(ch===3){const t=domainTopic(p,r.topic);if(t)li(t.title,t.method,t);else for(const x of K.topics.slice(0,4))li(x.title,x.question||x.method,x);}
 if(ch===2)for(const x of K.tactics.filter(x=>x.quality===r.category).slice(0,4))li(x.name,x.statement,x);
 if(ch===6||ch===7){const caps=ch===6?[r]:(p.technologyRealisation?.mappings||[]).filter(m=>m.realizationId===r.id).map(m=>(p.technology?.capabilities||[]).find(x=>x.id===m.capabilityId)).filter(Boolean),cats=caps.map(x=>x.category);for(const x of K.products.filter(x=>cats.includes(x.category)).slice(0,4))li(x.product+(x.version?' '+x.version:''),x.statement,x);}
 if((ch===1&&r.type==='constraint')||(ch===2&&r.category==='compliance'))for(const x of K.regulations.slice(0,4))li([x.instrument,x.section].filter(Boolean).join(' · '),[x.regulator,x.effective?'effective '+x.effective:'',x.statement].filter(Boolean).join(' · '),x);
 return rows.length?`<h4>Released domain knowledge · ${rows.length}</h4><ul class="brain-relevance-list">${rows.join('')}</ul>`:'';
}
export function mindRelevanceHTML(p,c){
 if(!c||c.selected.id==='project')return '';
 const g=c.governed||{},trace=g.trace||{},concepts=(g.concepts||[]).slice(0,3),rules=c.knowledge||[];
 const matched=id=>(trace.matched||[]).find(m=>m.id===id)?.terms||[];
 let own='';
 try{
  const home=homeChapter(p,c.selected.id),target=home?solTarget(p,home,c.selected.id):null,x=target?chapterReading(p,target):null;
  if(x?.type==='driver'){const t=x.reading.tactics||{};own=`<h4>This driver’s own tactics</h4><p>${t.named?.length?'Named: '+esc(t.named.join(', '))+'. ':''}${t.considered?.length?'Considered: '+esc(t.considered.join(', '))+'. ':''}${t.open?.length?'Open: '+esc(t.open.slice(0,5).join(', '))+'.':''}</p>${x.reading.pullsAgainst?.length?`<h4>It pulls against</h4><ul>${x.reading.pullsAgainst.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>`:''}`;}
  else if(x&&home>=4&&home<=10){const found=antiPatternsFor(detectAntiPatterns(reasoningSource(p)),x.record.id);if(found.length)own=`<h4>Anti-patterns it is part of · ${found.length}</h4><ul>${found.slice(0,4).map(a=>`<li><b>${esc(a.name)}</b> ${esc(String(a.text||'').slice(0,160))}</li>`).join('')}</ul>`;}
 }catch{own='';}
 const dna=concepts[0]?.record,kit=dna?[...(dna.componentKit||[]).slice(0,4).map(k=>`${k.name||k.archetype}${k.required?'':' (optional)'}: ${k.responsibility||''}`),...(dna.interfaceKit||[]).slice(0,2).map(k=>`${k.interaction||'interface'} · ${k.contractType||''}`)].filter(Boolean):[];
 const obligations=dna?(dna.obligations||[]).slice(0,2).map(o=>typeof o==='string'?o:o.description||''):[];
 return `<section class="brain-relevance" data-brain-relevance><h3>Relevant knowledge for ${esc(c.selected.ref||c.selected.id)}</h3><p class="brain-band-label"><small>Repository context · relevance and conditional checks carry separate authority · candidate and discovery knowledge is excluded</small></p>${concepts.length?`<h4>Concepts retrieved · ${concepts.length} of ${trace.considered||'the catalogue'}</h4><ul class="brain-relevance-list">${concepts.map(h=>`<li><b>${esc(curatedName(h.record))}</b>${notForFinancialUse(h.record)?` <small class="kw-overlap" title="${esc(curationNote(h.record))}">${esc(NOT_FOR_FINANCIAL_USE)}</small>`:''} <small>${esc(h.record.recordType)}${matched(h.record.id).length?' · matched: '+esc(matched(h.record.id).join(', ')):''}</small><span>${esc(String(h.record.summary||'').slice(0,160))}</span></li>`).join('')}</ul>`:'<p class="brain-note">No catalogue concept shares enough words with this record to retrieve.</p>'}${rules.length?`<h4>Retrieved considerations · ${rules.length}</h4><ul>${rules.map(k=>`<li><b>${esc(k.id)}</b> ${esc(k.why)}</li>`).join('')}</ul>`:'<p class="brain-note">No repository consideration met the current retrieval conditions.</p>'}${own}${releasedOffersHTML(p,c)}${kit.length?`<details class="brain-basis"><summary>Pattern DNA · ${esc(curatedName(dna))} · what the pattern names, not what you have</summary>${notForFinancialUse(dna)?`<p class="kw-overlap">${esc(curationNote(dna))}</p>`:''}<ul>${kit.map(s=>`<li>${esc(s)}</li>`).join('')}</ul>${obligations.length?`<p class="brain-note">Obligations it carries: ${esc(obligations.join(' · '))}</p>`:''}<p class="brain-note">A kit describes the pattern’s roles; whether this design plays them is for you to judge. Nothing here scores the pattern or asserts conformance.</p></details>`:''}<details class="brain-basis"><summary>Retrieval trace</summary><p class="brain-note">Terms: ${esc((trace.terms||[]).slice(0,16).join(', ')||'none')}. ${esc(String(trace.kept??concepts.length))} of ${esc(String(trace.considered??'?'))} catalogue records kept; ${esc(String(trace.claimsKept??0))} of ${esc(String(trace.claimsConsidered??0))} released claims eligible and relevant. Candidate and discovery knowledge is excluded from retrieval.</p></details></section>`;
}

// What architects did with Sol's advice, from the records the project keeps (round 2, I2-17): acceptance per
// chapter, verdict, refined field and kind of source. Counts, not a learning signal: nothing here changes how
// Sol reads or what knowledge is eligible. Compact in Sol's panel; the full table is for the stewards' view.
export function adoptionStatisticsHTML(p,{compact=false}={}){
 let fields='';try{fields=suggestionStatisticsHTML(p,{compact});}catch{fields='';}
 return assessmentStatisticsHTML(p,{compact})+fields;
}
function assessmentStatisticsHTML(p,{compact=false}={}){
 let a=null;try{a=adoptionStatistics(p);}catch{return '';}
 if(!a||!a.items)return compact?'':'<section class="brain-adoption" data-brain-adoption><h4>What architects did with Sol’s advice</h4><p class="brain-note">No advice has been taken or declined yet. Each outcome is recorded with the sources the advice rested on.</p></section>';
 const pct=x=>x==null?'—':Math.round(x*100)+'%';
 const rows=(title,xs,name=k=>k)=>xs.length?`<details class="brain-basis"><summary>${title} · ${xs.length}</summary><table class="brain-adoption-table"><thead><tr><th>${title}</th><th>Advised</th><th>Taken</th><th>Applied</th><th>Declined</th><th>Acceptance</th></tr></thead><tbody>${xs.slice(0,24).map(r=>`<tr><td>${esc(name(r.key))}</td><td>${r.advised}</td><td>${r.taken}</td><td>${r.applied}</td><td>${r.dismissed}</td><td>${pct(r.acceptance)}</td></tr>`).join('')}</tbody></table></details>`:'';
 const head=`<p class="brain-note" data-brain-adoption-summary>${a.items} item${a.items===1?'':'s'} advised · ${a.taken} taken (${a.applied} applied through a change review) · ${a.dismissed} declined with a reason · acceptance ${pct(a.acceptance)}${a.passages.drafted?` · ${a.passages.accepted} of ${a.passages.drafted} drafted passages in the SDD`:''}${a.designs.opened?` · ${a.designs.applied} of ${a.designs.opened} design options applied`:''}${a.learned?` · ${a.learned} captured as project knowledge`:''}${a.withdrawnBasis?` · ${a.withdrawnBasis} taken on knowledge since withdrawn, in the stewards’ queue`:''}.</p>`;
 if(compact)return `<div class="brain-adoption compact" data-brain-adoption><b>What architects did with Sol’s advice</b>${head}</div>`;
 return `<section class="brain-adoption" data-brain-adoption><h4>What architects did with Sol’s advice</h4>${head}${rows('By chapter',a.byChapter,k=>'Chapter '+k)}${rows('By verdict',a.byVerdict)}${rows('By refined field',a.byField)}${rows('By kind of source the advice rested on',a.bySource)}${rows('By kind of decision',a.byKind)}<p class="brain-note">Counted from the project’s own records of each outcome (SA-nnn); nothing here scores knowledge or changes what Sol reads.</p></section>`;
}

// What architects did with field suggestions (round 2, I2-12): the spark's and the Co-author panel's offers they
// accepted (from each record's provenance.suggestions, written by the server when the record was saved), how many they
// edited before saving and how many have since been changed by hand, and the ones they dismissed with a reason in the
// Co-author panel — per field and per source (from your project, confirm, Sol draft). Counts only: an offer that was
// shown and ignored leaves no record, nothing here scores knowledge, and nothing changes what Sol reads or offers.
const SUGGESTION_SOURCE_LABELS={project:'From your project',confirm:'Confirm',sol:'Sol draft'};
const listOf=v=>Array.isArray(v)?v:[];
export function suggestionStatistics(p){
 const byField=new Map(),bySource=new Map(),total={accepted:0,edited:0,superseded:0,dismissed:0};
 const row=(m,key,label)=>{if(!m.has(key))m.set(key,{key,label,accepted:0,edited:0,superseded:0,dismissed:0});return m.get(key);};
 // A field's name as a person reads it (failurePolicy → Failure policy), without loading the studios' field descriptors.
 const words=f=>String(f).replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/^./,c=>c.toUpperCase());
 const fieldRow=(command,field)=>row(byField,command+':'+field,`${words(field)} · ${recordNoun(command)}`);
 const count=(rows,k)=>{for(const r of rows)r[k]++;total[k]++;};
 const seen=new Set();
 const visit=record=>{if(!record||typeof record!=='object'||seen.has(record))return;seen.add(record);for(const s of listOf(record?.provenance?.suggestions)){if(!s||typeof s.field!=='string')continue;const rows=[fieldRow(s.command,s.field),row(bySource,s.source,SUGGESTION_SOURCE_LABELS[s.source]||s.source)];count(rows,'accepted');if(s.edited)count(rows,'edited');if(s.superseded)count(rows,'superseded');}};
 // Every record type that carries suggestions (the brief, Chapter 1 artefacts and the alternatives nested in decisions
 // included), then any other record with provenance one level inside a section; each record is counted once.
 for(const get of Object.values(RECORD_COLLECTIONS))for(const x of listOf(get(p)))visit(x);
 for(const section of Object.values(p||{})){if(!section||typeof section!=='object'||Array.isArray(section))continue;for(const v of Object.values(section)){if(Array.isArray(v)){for(const x of v)if(x&&typeof x==='object'&&x.provenance)visit(x);}else if(v&&typeof v==='object'&&v.provenance)visit(v);}}
 for(const d of listOf(p?.workspace?.coauthor?.dispositions))if(d?.outcome==='dismissed')count([fieldRow(d.command,d.field),row(bySource,d.source,SUGGESTION_SOURCE_LABELS[d.source]||d.source)],'dismissed');
 const sorted=m=>[...m.values()].sort((a,b)=>(b.accepted+b.dismissed)-(a.accepted+a.dismissed)||a.label.localeCompare(b.label));
 return {...total,decided:total.accepted+total.dismissed,byField:sorted(byField),bySource:['project','confirm','sol'].map(k=>bySource.get(k)).filter(Boolean).concat([...bySource.values()].filter(r=>!SUGGESTION_SOURCE_LABELS[r.key]))};
}
function suggestionStatisticsHTML(p,{compact=false}={}){
 const s=suggestionStatistics(p);
 if(!s.decided)return compact?'':'<section class="brain-adoption" data-brain-suggestions><h4>What architects did with field suggestions</h4><p class="brain-note">No field suggestion has been accepted or dismissed yet. Each one accepted is kept with the record it filled, and each dismissal with its reason.</p></section>';
 const head=`<p class="brain-note" data-brain-suggestions-summary>${s.accepted} accepted (${s.edited} edited before saving${s.superseded?`, ${s.superseded} since changed by hand`:''}) · ${s.dismissed} dismissed with a reason.</p>`;
 if(compact)return `<div class="brain-adoption compact" data-brain-suggestions><b>What architects did with field suggestions</b>${head}</div>`;
 const table=(title,rows)=>rows.length?`<details class="brain-basis"><summary>${title} · ${rows.length}</summary><table class="brain-adoption-table"><thead><tr><th>${title}</th><th>Accepted</th><th>Edited</th><th>Since changed</th><th>Dismissed</th></tr></thead><tbody>${rows.slice(0,40).map(r=>`<tr><td>${esc(r.label)}</td><td>${r.accepted}</td><td>${r.edited}</td><td>${r.superseded}</td><td>${r.dismissed}</td></tr>`).join('')}</tbody></table></details>`:'';
 return `<section class="brain-adoption" data-brain-suggestions><h4>What architects did with field suggestions</h4>${head}${table('By source',s.bySource)}${table('By field',s.byField)}<p class="brain-note">Counted from each record’s provenance and the Co-author panel’s dismissals; an offer shown and ignored leaves no record. Nothing here scores knowledge or changes what Sol reads or offers.</p></section>`;
}
