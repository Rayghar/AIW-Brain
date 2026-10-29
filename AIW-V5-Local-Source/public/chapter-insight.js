// Read-only header insight from the saved model's own rules. No provider, storage or approval.
import {chapterChecks, scopedChecks, projectHasRecords} from './readiness-model.js';
import {CHAPTERS, finalMilestones, reviewSourceUrl} from './review-domain.js';
import {currentChanges, changeItemState, changeSource} from './changes-domain.js';
import {chosen, decisionSourceChanged, decisionFindings, decisionCurrent, governanceCurrent} from './decisions-domain.js';
import {driverPriority} from './quality-domain.js';
import {journeyIndex, journeyTargets} from './journey-context.js';
import {scopeLens} from './module-lens.js';
import {CHAPTER_TITLES} from './chapter-names.js';
import {memoPass, remember} from './document-memo.js';
import {architectureIntelligence} from './architecture-intelligence.js';
import {catalogue,catalogueLoaded} from './catalogue-store.js';
import {esc,safeUrl} from './html-escape.js';

const list = v => Array.isArray(v) ? v : [];
const text = (s, n = 260) => String(s ?? '').trim().slice(0, n);
const tabs = new Set(['work', 'model', 'validate', 'output']);
const meaning = 'Recorded milestones met; not design completion, measured quality or approval.';
const label = (done, total) => `${done} of ${total} milestones met`;
const illustrative = p => !!(p.workspace?.template && p.workspace.template !== 'blank') || [p.artefacts,p.quality?.drivers,p.decisions?.records,p.logical?.responsibilities,p.realisation?.components,p.technology?.capabilities,p.interfaces?.contracts,p.security?.controls,p.runtime?.placements].some(xs => list(xs).some(r => r?.origin === 'reference'));

function target(p, base, chapter, tab = 'work', objectId = null, lens = null, extra = null) {
  const node = objectId && objectId !== 'project' ? base.index.nodes.get(objectId) : null;
  const ch = node?.chapter >= 1 && node.chapter <= 11 ? node.chapter : chapter;
  const surface = tabs.has(tab) ? tab : 'work';
  const url = new URL(reviewSourceUrl(ch, node?.id || null, surface), 'https://aiw.local');
  if (p.id) url.searchParams.set('project', p.id);
  // An explicit empty scope clears the shell's held scope for whole-project destinations.
  url.searchParams.set('scope', lens && (!node || lens.shows.has(node.id)) ? lens.id : '');
  if (extra) for (const k of ['journey', 'draft', 'section']) if (extra.get(k)) url.searchParams.set(k, extra.get(k));
  return {chapter: ch, tab: surface, objectId: node?.id || null, url: url.pathname + url.search};
}
function passageTarget(p, base, chapter, passage, lens) {
  if (base.index.nodes.has(passage.id)) return target(p, base, passage.from || chapter, 'work', passage.id, lens);
  const url = new URL(passage.url || reviewSourceUrl(chapter, null, 'validate'), 'https://aiw.local');
  return target(p, base, Number(url.searchParams.get('chapter')) || chapter, url.searchParams.get('tab') || 'validate', null, lens, url.searchParams);
}
function readBase(p) {
  const base = {index: journeyIndex(p), chapters: [], decisions: [], changes: [], results: new Map(), scoped: new Map(), started: projectHasRecords(p), hasRequirements: list(p.artefacts).some(a => a.type === 'requirement'), illustrative: illustrative(p)};
  for (let chapter = 1; chapter <= 11; chapter++) {
    let checks = null, milestones = [], unreadable = false;
    try { checks = chapterChecks(p, chapter); milestones = chapter === 11 ? finalMilestones(p) : CHAPTERS.find(c => c.id === chapter).milestones(p); } catch { unreadable = true; }
    const done = checks?.milestones.done ?? 0, total = checks?.milestones.total ?? 0;
    base.chapters.push({chapter, title: CHAPTER_TITLES[chapter], done, total, label: label(done, total), checks, unreadable,
      state: unreadable ? 'unavailable' : checks?.toFix ? 'fix' : checks?.toConfirm ? 'confirm' : total && done === total ? 'met' : 'open',
      stages: milestones.map(m => ({id: String(m.id), name: text(m.name), done: !!m.done, target: target(p, base, chapter, m.tab || (chapter===11&&['baseline','governance','handoff'].includes(m.id)?'output':'work'))}))});
  }
  let fs = [];
  try { fs = decisionFindings(p); } catch { /* unreadable chapter checks remain visible */ }
  const checksById = new Map(), drivers = new Map(list(p.quality?.drivers).map(d => [d.id, d]));
  const openDecisionChecks = new Set(list(base.chapters[2].checks?.passages).flatMap(x => [...x.fix,...x.confirm].map(f => f.id)));
  for (const f of fs) if (openDecisionChecks.has('C3:' + f.id)) { const xs = checksById.get(f.decisionId) || []; xs.push(f); checksById.set(f.decisionId, xs); }
  for (const d of list(p.decisions?.records)) {
    if (d.status === 'superseded') continue;
    let stale = false, accepted = false, approved = false;
    try { stale = decisionSourceChanged(p,d); accepted = decisionCurrent(p,d); approved = governanceCurrent(d,p) && d.governance?.status === 'approved'; } catch { stale = true; }
    const option = chosen(d), findings = checksById.get(d.id) || [], errors = findings.filter(f => f.level === 'error');
    const material = errors.find(f => /^(source-change|conflict|contradiction|anti-pattern|broken-links|breaks)$/.test(f.code)) || findings.find(f => f.code === 'dominated');
    const state = stale || material || accepted && errors.length ? 'needs-review' : !option ? 'unresolved' : !accepted ? 'selected-not-accepted' : null;
    if (!state) continue;
    const highPriorityDriver = list(d.driverIds).some(id => driverPriority(drivers.get(id)) === 'High');
    base.decisions.push({id:d.id,title:text(d.question || d.id),state,stateLabel:{'needs-review':'Needs review',unresolved:'No working choice','selected-not-accepted':'Selected, not architect accepted'}[state],
      reason:text(stale ? 'The decision rests on changed inputs; its earlier choice or acceptance needs review.' : material?.detail || (state === 'unresolved' ? 'Compare viable alternatives and record the architect’s rationale.' : errors[0]?.detail || 'A working choice is recorded; architect acceptance is a separate action.')),
      highPriorityDriver, selectedAlternativeId:option?.id || null, architectAccepted:accepted, externalApproval:approved,
      priority:stale ? 2 : material ? 5 : highPriorityDriver ? 10 : 30, target:target(p,base,3,'work',d.id)});
  }
  base.decisions.sort((a,b) => a.priority-b.priority || a.id.localeCompare(b.id));
  try {
    for (const entry of currentChanges(p)) for (const item of list(entry.event.items)) {
      const state = changeItemState(p,entry.event,item,true); if (state.complete) continue;
      const source = changeSource(entry.event), exists = base.index.nodes.has(item.id);
      base.changes.push({id:`change:${entry.event.id}:${item.key || item.id}`,chapter:Number(item.chapter),objectId:exists?item.id:null,kind:'changed',attention:true,priority:0,
        title:`${state.label}: ${text(item.ref || item.id,90)}`,why:text(`${source.ref || source.id || 'A source'} changed. ${typeof item.why === 'string' ? item.why : 'Review the affected reasoning against the current source before relying on it.'}`),rule:`Change journal · ${entry.event.id} · ${state.status}`});
    }
  } catch { /* A malformed journal cannot become an invented completed review. */ }
  const chapters = base.chapters.map(({checks,unreadable,...row}) => ({...row,target:target(p,base,row.chapter,'validate')}));
  const done = chapters.reduce((n,c)=>n+c.done,0), total = chapters.reduce((n,c)=>n+c.total,0);
  base.projectProgress = {done,total,label:label(done,total),meaning,scope:'project',chapters};
  return base;
}
function chapterCandidates(p, base, chapter, lens) {
  const key = `${chapter}|${lens?.id || ''}`;
  if (base.scoped.has(key)) return base.scoped.get(key);
  const row = base.chapters[chapter-1], checks = lens ? scopedChecks(p,chapter,lens) : row.checks, out = [];
  for (const passage of checks?.passages || []) for (const [level,items] of [['fix',passage.fix],['confirm',passage.confirm]]) for (const f of items) {
    out.push({id:String(f.id),chapter,objectId:base.index.nodes.has(passage.id)?passage.id:null,kind:level==='fix'?'finding':'review',attention:base.started,priority:level==='fix'?20:40,
      title:text(f.title),why:text(f.detail || (level==='fix'?'The current rule identifies missing design content.':'This recorded item still needs confirmation.')),rule:`Chapter ${chapter} ${level==='fix'?'finding to fix':'item to confirm'} · ${f.id}`,target:passageTarget(p,base,chapter,passage,lens),level});
  }
  for (const change of base.changes) if (change.chapter===chapter && (!lens || change.objectId && lens.shows.has(change.objectId))) out.push({...change,target:target(p,base,chapter,change.objectId?'work':'validate',change.objectId,lens)});
  // A module structure proposed by AIW waits for genuine acceptance; preserve its canonical next step.
  if (checks?.next?.kind === 'confirm' && /module structure/.test(checks.next.text)) {
    const url = new URL(checks.next.url,'https://aiw.local'), to = target(p,base,1,'work',null,null); to.url += url.hash;
    out.push({id:'module-structure',chapter:1,objectId:null,kind:'review',attention:base.started,priority:35,title:checks.next.text,why:'The proposed grouping has not been accepted by an architect.',rule:'Module structure lifecycle',target:to});
  }
  const result = {checks,actions:out}; base.scoped.set(key,result); return result;
}
function linkedDecisions(p, base, chapter, selectedId, lens) {
  if (selectedId) return new Set(journeyTargets(base.index,selectedId,3).filter(x=>!lens||lens.shows.has(x.node.id)).map(x=>x.node.id));
  if (chapter===3) return new Set(base.decisions.filter(d=>!lens||lens.shows.has(d.id)).map(d=>d.id));
  const records = [...base.index.nodes.values()].filter(n=>n.chapter===chapter&&(!lens||lens.shows.has(n.id))), own = new Set(records.map(n=>n.id)), ids = new Set(records.flatMap(n=>list(n.record?.decisionIds)));
  if (chapter<=2) for (const d of list(p.decisions?.records)) if (list(chapter===1?d.requirementIds:d.driverIds).some(id=>own.has(id))) ids.add(d.id);
  return ids;
}
/** The app supplies a saved document, not mutable editor drafts. Returned projections cannot mutate its cache. */
export function chapterInsight(p, chapter, {tab='work',selectedId=null,scopeId=null}={}) {
  chapter=Number(chapter); if (!p || typeof p!=='object' || !Number.isInteger(chapter) || chapter<1 || chapter>11) return null;
  const base=memoPass(p,()=>remember(p,'chapter-insight','base',()=>readBase(p)));
  const lens=scopeId?scopeLens(p,scopeId):null;
  selectedId=typeof selectedId==='string'&&base.index.nodes.has(selectedId)&&(!lens||lens.shows.has(selectedId))?selectedId:null;
  const key=`${chapter}|${tabs.has(tab)?tab:'work'}|${selectedId||''}|${lens?.id||''}|${catalogueLoaded()?catalogue().releaseId:'pending'}`;
  if (base.results.has(key)) return structuredClone(base.results.get(key));
  const row=base.chapters[chapter-1], scoped=chapterCandidates(p,base,chapter,lens), linked=linkedDecisions(p,base,chapter,selectedId,lens);
  const actions=scoped.actions.map(a=>({...a,scope:selectedId&&a.objectId===selectedId?'selected':'chapter'}));
  const intelligence=selectedId?architectureIntelligence(p,{chapter,id:selectedId,tab,scopeId:lens?.id||''}):null;
  for(const [intelligenceRank,insight] of (intelligence?.insights||[]).entries()){
    const action=insight.actions?.[0],to=intelligenceActionTarget(action,{projectId:p.id,scopeId:lens&&(!action?.objectId||lens.shows.has(action.objectId))?lens.id:''});
    if(!to)continue;
    actions.push({id:insight.id,objectId:insight.subjectId||selectedId,chapter,kind:'intelligence',attention:insight.severity==='blocking'||insight.severity==='attention',priority:insight.priority,intelligenceRank,title:insight.question||insight.title,why:insight.detail,rule:'Architecture knowledge · '+insight.state,scope:'selected',target:to,intelligence:{reading:intelligence,insight,action,projectId:p.id}});
  }
  for (const d of base.decisions) if (linked.has(d.id)) actions.push({id:`decision:${d.id}`,objectId:d.id,chapter:3,kind:'decision',attention:true,priority:d.priority,title:`${d.stateLabel}: ${d.title}`,
    why:d.reason+(d.highPriorityDriver?' A linked driver has a recorded High priority.':''),rule:`Decision lifecycle · ${d.id}`,scope:chapter===3?selectedId===d.id?'selected':'chapter':'project',target:target(p,base,3,'work',d.id,lens)});
  actions.sort((a,b)=>a.priority-b.priority || Number(b.scope==='selected')-Number(a.scope==='selected') || (a.kind==='intelligence'&&b.kind==='intelligence'?a.intelligenceRank-b.intelligenceRank:a.id.localeCompare(b.id)));
  if (!base.hasRequirements) actions.unshift({id:'start:requirements',kind:'start',attention:false,priority:-1,title:'Capture the first requirement',why:'A saved requirement gives architecture choices a project-specific purpose. No requirement is recorded yet.',rule:'Requirements register · no saved requirement',scope:chapter===1?'chapter':'project',target:target(p,base,1,'work',null,lens)});
  if (row.unreadable) actions.unshift({id:`unavailable:${chapter}`,kind:'unavailable',attention:true,priority:-2,title:'Chapter readiness could not be read',why:'Open Validate to inspect the current project. Unavailable checks are not counted as passing.',rule:'Readiness unavailable',scope:'chapter',target:target(p,base,chapter,'validate',null,lens)});
  // A completed milestone set can still have explicit confirmation items; celebrate the recorded
  // progress without claiming approval or hiding those remaining actions.
  if (row.total>0 && row.done===row.total && actions.length && !actions.some(a=>a.kind==='changed'||a.kind==='decision'||a.kind==='unavailable'||a.kind==='intelligence'||a.level==='fix')) {
    actions.unshift({id:`met:${chapter}`,kind:'positive',attention:actions.some(a=>a.attention),priority:15,title:`Chapter milestones met · ${scoped.checks?.toConfirm||0} items to confirm`,
      why:'The chapter’s recorded milestones are met. The listed review items remain open; milestone progress is not external approval or measured quality.',rule:'Chapter milestones and remaining confirmation checks',scope:'chapter',target:target(p,base,chapter,'validate',null,lens)});
  }
  if (!actions.length) {
    const next=row.stages.find(s=>!s.done);
    if (next) actions.push({id:`milestone:${chapter}:${next.id}`,kind:'milestone',attention:false,priority:50,title:next.name,why:`This is the next unmet chapter-wide milestone${lens?'; no open record finding is in the selected module scope':''}.`,rule:`Chapter ${chapter} milestone · ${next.id}`,scope:'chapter',target:next.target});
    else {
      const remaining=[...base.chapters.slice(chapter),...base.chapters.slice(0,chapter-1)].find(c=>c.unreadable||c.done<c.total||c.checks?.toFix||c.checks?.toConfirm), stage=remaining?.stages.find(s=>!s.done);
      actions.push({id:`ready:${chapter}`,kind:'positive',attention:false,priority:60,title:remaining?`Chapter milestones met · continue with Chapter ${remaining.chapter}`:'All recorded milestones are met',
        why:remaining?`${lens?'No open record finding is in this module scope.':'This chapter has no open rule findings.'} ${stage?.name||'Review the open checks'} in ${remaining.title} is a useful next step. Milestones do not establish approval.`:'The recorded rules have no further milestone to suggest. Architect acceptance, external approval and observations remain distinct.',rule:'Chapter milestones and recorded checks',scope:remaining?'project':'chapter',target:stage?.target||target(p,base,remaining?.chapter||11,remaining?'validate':'output')});
    }
  }
  const seen=new Set(), nextActions=actions.filter(a=>{const k=a.target.url+'|'+a.title;if(seen.has(k))return false;seen.add(k);return true;}).slice(0,3);
  const C=scoped.checks, result={authority:'rule-based',knowledgeLoaded:catalogueLoaded(),chapter,scope:lens?{id:lens.id,title:lens.title}:null,attention:nextActions[0].attention,summary:nextActions[0].title,
    progress:{done:row.done,total:row.total,label:row.label,scope:'chapter',findingsScope:lens&&chapter!==11?'module':'chapter',toFix:C?.toFix||0,toConfirm:C?.toConfirm||0,treated:C?.treated||0,checksAt:row.checks?.run.at||null,checksCurrent:!!row.checks?.run.current,meaning,illustrative:base.illustrative,unavailable:row.unreadable,milestones:row.stages.map(({id,name,done})=>({id,name,done}))},
    projectProgress:base.projectProgress,lead:nextActions[0],nextActions,openDecisions:{count:base.decisions.length,scope:'project',items:base.decisions.slice(0,3).map(d=>({...d,scope:'project'}))},more:{validateURL:target(p,base,chapter,'validate',null,lens).url}};
  if(base.results.size>=64)base.results.clear();base.results.set(key,result);return structuredClone(result);
}

// Shared native action and source-disclosure presentation for the same reading.
export function refreshIntelligenceSlot(slot,html){
 if(!slot?.isConnected||slot.innerHTML===html)return;
 const open=[...slot.querySelectorAll('details[open]')].map(d=>d.querySelector('summary')?.textContent),active=slot.contains(document.activeElement)?document.activeElement:null,action=active?.dataset.intelligenceAction;
 slot.innerHTML=html;
 for(const d of slot.querySelectorAll('details'))if(open.includes(d.querySelector('summary')?.textContent))d.open=true;
 if(action)[...slot.querySelectorAll('[data-intelligence-action]')].find(b=>b.dataset.intelligenceAction===action)?.focus({preventScroll:true});
}
export function intelligenceActionTarget(action,{projectId,scopeId=''}={}){
 const chapter=Number(action?.target?.chapter||action?.chapter),tab=action?.target?.tab||action?.tab||'work',objectId=action?.target?.objectId||action?.objectId||null;
 if(!projectId||!Number.isInteger(chapter)||chapter<1||chapter>11||!['work','model','validate','output'].includes(tab))return null;
 const url=new URL(reviewSourceUrl(chapter,objectId,tab),'https://aiw.local');url.searchParams.set('project',projectId);url.searchParams.set('scope',scopeId);
 return {chapter,tab,objectId,url:url.pathname+url.search};
}
export function intelligenceFieldTarget(action,options={}){
 const target=intelligenceActionTarget(action,options),field=String(action?.fieldKey||'');
 if(action?.kind!=='open-record'||target?.chapter!==8)return null;
 if(action.editor==='data')return field==='authorityId'?{...target,editor:'data',field}:null;
 return /^(?:execution\.[A-Za-z]+|kind|from|to|requestData|responseData|correlationKey|idempotencyKey|contractVersion)$/.test(field)?{...target,editor:'contract',field}:null;
}
export function intelligenceActionHTML(reading,insight,action,{projectId,scopeId='',className='text-button',attributes='',labelHTML=''}={}){
 if(!reading||!insight||!action)return '';
 const target=intelligenceActionTarget(action,{projectId,scopeId});if(!target)return '';
 const label=labelHTML||esc(action.label||action.title||'Review this step');
 if(action.kind==='open-record'&&!intelligenceFieldTarget(action,{projectId,scopeId}))return `<a class="${esc(className)}" data-scope-link href="${esc(safeUrl(target.url))}" ${attributes}>${label}</a>`;
 if(!['open-record','open-knowledge','resume-task','compare'].includes(action.kind))return '';
 return `<button type="button" class="${esc(className)}" data-intelligence-action="${esc(action.id)}" data-intelligence-insight="${esc(insight.id)}" data-intelligence-subject="${esc(reading.subject.id)}" data-intelligence-chapter="${esc(reading.subject.chapter)}" data-intelligence-project="${esc(projectId)}" data-intelligence-basis="${esc(reading.receipt?.basisStamp)}" data-intelligence-knowledge="${esc(reading.receipt?.knowledgeStamp)}" ${attributes}>${label}</button>`;
}
export const intelligenceAuthority=authority=>authority?.kind==='project-reviewed'?'Project-reviewed conditional guidance':authority?.kind==='controlled-pilot-seed'?'Controlled pilot guidance':authority?.kind==='editorial'?'Editorial repository guidance':authority?.kind==='reviewed-project-proposal'?'Reviewed project proposal':authority?.kind==='inspected-method-interpretation'?'Inspected source interpretation':'Saved model reading';
export function intelligenceSourcesHTML(reading,insight,{projectId}={}){
 const ids=new Set(list(insight?.sourceRefs||reading?.receipt?.sourceRefs)),sources=list(reading?.sources).filter(s=>ids.has(s.id));
 if(!sources.length)return '';
 return `<ul class="brain-record-links" data-intelligence-sources>${sources.map(s=>{
  const r=s.receipt||{},location=[r.sourceFile,r.sourcePointer,r.path,r.locator].filter(Boolean),lines=r.lineStart?`Lines ${r.lineStart}${r.lineEnd?'–'+r.lineEnd:''}`:'',identity=[r.releaseId,r.claimId,r.sourceId,r.revision].filter(Boolean);
  const owner=[insight,...list(reading.insights)].find(i=>i?.actions?.some(a=>a.kind==='open-knowledge'&&a.sourceId===s.id)),action=owner?.actions.find(a=>a.kind==='open-knowledge'&&a.sourceId===s.id);
  const hashes=[['Source SHA-256',r.sourceHash||r.sourceSha256||r.fileSha256],['Record SHA-256',r.recordHash||r.recordSha256],['Manifest SHA-256',r.manifestHash||r.manifestSha256],['Claim SHA-256',r.claimHash]].filter(([,v])=>v);
  return `<li data-intelligence-source="${esc(s.id)}"><details><summary><b>${esc(s.title||s.objectId||s.id)}</b> · ${esc(intelligenceAuthority(s.authority||insight?.authority))}</summary>${s.posture?`<p>${esc(s.posture)}</p>`:''}${s.excerpt?`<blockquote class="brain-prose">${esc(s.excerpt)}</blockquote>`:''}${s.truncated?'<p class="brain-note">Bounded source excerpt; open the source to inspect its full context.</p>':''}<p class="brain-hash">${esc([...new Set(location),lines,...identity].filter(Boolean).join(' · '))}</p>${hashes.map(([label,value])=>`<p class="brain-hash">${esc(label)}: ${esc(value)}</p>`).join('')}${action?intelligenceActionHTML(reading,owner,action,{projectId}):''}</details></li>`;
 }).join('')}</ul>`;
}
export function intelligenceWhyHTML(reading,insight,{sources=true,projectId}={}){
 if(!insight)return '';
 const describe=x=>typeof x==='string'?x:[x.title||x.name||x.action||x.text||x.id,x.detail||x.reason||x.rationale||x.evidence].filter(Boolean).join(' · ');
 const items=(title,rows)=>list(rows).length?`<p><b>${title}</b></p><ul>${rows.map(x=>`<li>${esc(describe(x))}${x.state?` <small>(${esc(x.state)})</small>`:''}</li>`).join('')}</ul>`:'';
 return `${insight.detail?`<p>${esc(insight.detail)}</p>`:''}<p class="brain-note">${esc(intelligenceAuthority(insight.authority))}${insight.state==='context-match'?' · recorded conditions match; verification remains open':insight.state==='excluded'?' · current conditions exclude this use':insight.state==='stale'?' · source basis changed; review required':''}.</p>${items('Conditions to examine',insight.conditions)}${items('Current checks',insight.checks)}${items('Alternatives to compare',insight.alternatives)}${items('Obligations to carry forward',insight.obligations)}${items('Declared relationships',insight.interactions)}${sources?intelligenceSourcesHTML(reading,insight,{projectId}):''}`;
}
