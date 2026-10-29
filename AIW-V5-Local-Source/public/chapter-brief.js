// The proactive brief (round 2, I2-03): what the workbench already knows about this tab, volunteered
// before anyone asks, built only from rule outputs that exist — the chapter guide's next step, the
// chapter's records with the most open checks and their first check, the journey's findings ranked
// by impact, the SDD readiness row, the narrative's missing fields and the passages not yet in the SDD.
// Every item names the rule it came from. Nothing here consults a model; the brief only prepares
// what Sol could be asked, and asking stays an explicit act. Pure: nothing here changes the project.
import {chapterGuide} from './chapter-guide.js';
import {chapterRound, chapterReading, chapterVitals, solTarget, findRecord, refOf, CHAPTER_NAMES} from './chapter-reasoning.js';
import {inheritedFindings} from './review-domain.js';
import {chapterChecks, counted, checkUnits} from './readiness-model.js';
import {journeyIndex} from './journey-context.js';
import {brainNotes} from './aiw-brain.js';
import {SOL, solChapterEntry, solBadge, askHTML, pendingHTML, solConnected} from './brain-reasoning-ui.js';
import {esc} from './html-escape.js';
import {list} from './util.js';
import {memoOff} from './document-memo.js';
import {architectureIntelligence} from './architecture-intelligence.js';
import {intelligenceActionHTML,intelligenceSourcesHTML,intelligenceAuthority} from './chapter-insight.js';

const clip = (s, n = 160) => { const t = String(s ?? '').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
const objectOf = id => String(id).startsWith('D:') ? id.slice(2) : /^M:\d{1,2}:([^|]+)/.exec(id)?.[1] || null;
const RANK = {bad: 0, warn: 1, none: 2, ok: 3, na: 4};
const VITAL_RANK = {Critical: 0, Watch: 1, 'Not recorded': 2, Meets: 3};

// The chapter's records with the most open checks, each with its first check (errors first).
function openRecords(p, chapter, n) {
  return chapterRound(p, chapter, n).map(id => {
    let x = null; try { x = chapterReading(p, id); } catch { x = null; }
    const r = findRecord(p, objectOf(id))?.record;
    return {kind: 'record', id, objectId: objectOf(id), ref: r ? String(r.ref || r.id) : id, title: r ? String(r.title || r.question || '') : '', check: x?.reading.checks?.[0] || null, notRecorded: list(x?.reading.notRecorded).slice(0, 3)};
  });
}
// The chapter's findings ranked by impact: errors first, then how many recorded objects the finding's object
// reaches in the journey, then the worst desk vital of the parts it touches.
export function rankedFindings(p, chapter, n) {
  // How many of the journey's edges meet each object, counted once over the edges (round 5, R5-G: counting them again
  // for every finding was quadratic; 6,500 findings meet 2,000 edges in a 500-record Chapter 4). An edge from an object
  // to itself counts once, as the filter counted it.
  const index = journeyIndex(p), degrees = new Map(), meet = id => degrees.set(id, (degrees.get(id) || 0) + 1);
  for (const e of index.edges) { meet(e.from); if (e.to !== e.from) meet(e.to); }
  const degree = id => (memoOff() ? index.edges.filter(e => e.from === id || e.to === id).length : degrees.get(id) || 0);
  const own = inheritedFindings(p).filter(f => f.chapter === chapter && ['error', 'warning'].includes(f.level));
  const seen = new Set(), unique = own.filter(f => { const k = f.title + '|' + f.objectId; if (seen.has(k)) return false; seen.add(k); return true; });
  const first = unique.map(f => ({f, level: f.level === 'error' ? 0 : 1, reach: degree(f.objectId) + list(f.objectIds).reduce((k, id) => k + degree(id), 0)})).sort((a, b) => a.level - b.level || b.reach - a.reach).slice(0, Math.max(n * 2, 8));
  // The worst vital of the parts each finding's record touches (chapter-reasoning.js chapterVitals: a reading's vitals
  // without the rest of it), once per record.
  const vitals = new Map(), worst = id => { if (!vitals.has(id)) { let v = 4; try { v = Math.min(4, ...list(chapterVitals(p, id)).map(c => VITAL_RANK[c.state] ?? 4)); } catch { v = 4; } vitals.set(id, v); } return vitals.get(id); };
  const scored = first.map(x => { const id = x.f.objectId && x.f.objectId !== 'project' ? solTarget(p, chapter, x.f.objectId) : null, vital = id ? worst(id) : 4; return {...x, id, vital: Number.isFinite(vital) ? vital : 4}; });
  // At most two findings per object, so five findings name more than one record.
  const perObject = new Map(), picked = [];
  for (const x of scored.sort((a, b) => a.level - b.level || a.vital - b.vital || b.reach - a.reach)) { const k = x.f.objectId || 'project', seen = perObject.get(k) || 0; if (seen >= 2) continue; perObject.set(k, seen + 1); picked.push(x); if (picked.length >= n) break; }
  const refFor = id => { const r = id && id !== 'project' ? findRecord(p, id)?.record : null; return r ? String(r.ref || r.id) : id || null; };
  return picked.map(x => ({kind: 'finding', id: x.id, objectId: x.f.objectId, ref: refFor(x.f.objectId), level: x.f.level, title: x.f.title, detail: clip(x.f.detail, 180), reach: x.reach}));
}
export function chapterBrief(p, chapter, tab, selectedId = null) {
  chapter = Number(chapter);
  if (!p || !chapter) return null;
  const items = [], ask = {ids: [], title: '', label: ''};
  const intelligence=selectedId&&selectedId!=='project'?architectureIntelligence(p,{chapter,id:selectedId,tab}):null,primary=intelligence?.primary;
  if(primary)items.push({kind:'intelligence',id:primary.id,objectId:selectedId,rule:'architecture knowledge · '+primary.state,title:primary.question||primary.title,detail:primary.detail,reading:intelligence,insight:primary});
  if (tab === 'work' || tab === 'model') {
    let g = null; try { g = chapterGuide(p, chapter, selectedId && selectedId !== 'project' ? selectedId : null); } catch { g = null; }
    if (g&&!primary) items.push({kind: 'next', rule: g.question ? 'chapter guide · an unanswered field' : 'chapter method · the next step', title: g.next, detail: g.question ? `${g.question.record?.id || ''} · ${g.question.field}`.trim() : g.aim});
    const records = openRecords(p, chapter, 3);
    for (const r of records) items.push({...r, rule: 'journey checks · open checks, errors first'});
    // Beside an open chapter model the companion carries the one way to ask (chapter-sol.js); the brief only lists.
    if (tab === 'work') { ask.ids = records.map(r => r.id); ask.title = `The ${records.length} Chapter ${chapter} records with the most open checks`; ask.label = `Ask Sol about these ${records.length}`; }
    if (tab === 'work' && chapter === 11 && !records.length) { ask.ids = ['M:11:SDD']; ask.title = 'The SDD narrative as Chapter 11 reads it'; ask.label = 'Ask Sol about the SDD narrative'; }
  } else if (tab === 'validate') {
    const fs = rankedFindings(p, chapter, 5);
    for (const f of fs) items.push({...f, rule: 'findings ranked · level, objects reached, desk vitals'});
    // The review desk's verdict on the parts this chapter's records touch, worst first (round 2, I2-24).
    const cells = [], seenCell = new Set();
    for (const id of chapterRound(p, chapter, 6)) { let x = null; try { x = chapterVitals(p, id); } catch { x = null; } for (const v of list(x)) { const k = v.part + '|' + v.vital; if (seenCell.has(k) || v.state === 'Meets') continue; seenCell.add(k); cells.push({...v, id}); } }
    cells.sort((a, b) => (VITAL_RANK[a.state] ?? 4) - (VITAL_RANK[b.state] ?? 4));
    for (const v of cells.slice(0, 3)) items.push({kind: 'vital', id: v.id, rule: 'review desk · the vitals of the running parts this chapter’s records touch', title: `${v.part} · ${v.vital}: ${v.state}`, detail: `${v.recorded || 'nothing recorded'} against ${v.against || 'no target'}${v.why ? ' · ' + v.why : ''}`});
    ask.ids = [...new Set(fs.map(f => f.id).filter(Boolean))].slice(0, 5); ask.title = `The findings that matter most in Chapter ${chapter}`; ask.label = `Ask Sol about the top ${ask.ids.length}`;
  } else if (tab === 'output') {
    // The chapter's part of the SDD, counted as Validate and the readiness board count it (round 12, G, GR-UX-02: one
    // reader, chapterChecks, every count with its unit).
    let C = null; try { C = chapterChecks(p, chapter); } catch { C = null; }
    if (C) { const U = checkUnits(chapter); items.push({kind: 'readiness', rule: 'SDD readiness · the chapter’s checks read across the journey', title: `${C.short}: ${C.toFix ? counted(C.toFix, U.fix) : C.toConfirm ? counted(C.toConfirm, U.confirm) : 'nothing open for the SDD'} · ${C.milestones.done} of ${C.milestones.total} milestones met`, detail: `${counted(C.toFix, U.fix)} and ${counted(C.toConfirm, U.confirm)}; ${C.passing.toLocaleString('en-GB')} of ${counted(C.total, 'passage')} passing.`}); }
    const n = p.finalReview?.narrative, missing = n ? ['owner', 'audience', 'summary', 'scope', 'approach'].filter(k => !String(n[k] || '').trim()) : [];
    if (missing.length) items.push({kind: 'narrative', rule: 'SDD narrative · fields not yet written', title: `The SDD narrative still lacks ${missing.join(', ')}`, detail: 'Chapter 11 → Work · Frame the SDD', id: 'M:11:SDD'});
    const drafts = brainNotes(p).filter(x => !x.accepted && Number(x.context?.chapter) === chapter);
    if (drafts.length) items.push({kind: 'passage', rule: 'passages · drafted, not in the working SDD', title: `${drafts.length} drafted passage${drafts.length === 1 ? '' : 's'} for this chapter ${drafts.length === 1 ? 'is' : 'are'} not in the SDD`, detail: drafts.slice(0, 3).map(x => `${x.id} ${clip(x.title, 50)}`).join(' · ')});
    if (chapter === 11) { ask.ids = ['M:11:SDD']; ask.title = 'The SDD narrative as Chapter 11 reads it'; ask.label = 'Ask Sol about the SDD narrative'; }
  }
  if(primary&&tab==='work'){const id=solTarget(p,chapter,selectedId);if(id){ask.ids=[id];ask.title=primary.question||primary.title;ask.label='Ask Sol about this question';}}
  return {chapter, tab, name: CHAPTER_NAMES[chapter] || '', items, ask: ask.ids.length ? ask : null};
}

// The brief, rendered: a labelled "From your project" band with one line per item and, when Sol is connected,
// one way to ask about what it lists — prepared and shown, never sent on its own.
export function briefHTML(p, brief) {
  if (!brief || !brief.items.length) return '';
  const line = it => {
    if(it.kind==='intelligence')return `<li data-intelligence-id="${esc(it.id)}"><b>${esc(it.title)}</b><small>${esc(it.detail)}</small>${intelligenceActionHTML(it.reading,it.insight,it.insight.actions?.[0],{projectId:p.id,className:'cm-link'})}<details><summary>Why this matters</summary><p>${esc(intelligenceAuthority(it.insight.authority))}. The recorded conditions and verification obligations determine its use.</p>${intelligenceSourcesHTML(it.reading,it.insight,{projectId:p.id})}</details></li>`;
    if (it.kind === 'record') { const e = it.id ? solChapterEntry(p, it.id) : null; return `<li data-brief-record="${esc(it.objectId || '')}"><button type="button" class="cm-link" data-brain-action="subject" data-id="${esc(it.objectId || '')}" title="${esc(it.ref + ' ' + it.title)}"><b>${esc(it.ref)}</b> ${esc(clip(it.title, 60))}</button>${e ? ' ' + solBadge(e, 'inline') : ''}<small>${it.check ? `${esc(it.check.level)}: ${esc(it.check.title)}` : it.notRecorded.length ? `not recorded: ${esc(it.notRecorded.join(', '))}` : 'no open check'}</small></li>`; }
    if (it.kind === 'finding') return `<li data-brief-finding="${esc(it.level)}">${it.objectId && it.objectId !== 'project' ? `<button type="button" class="cm-link" data-brain-action="subject" data-id="${esc(it.objectId)}"><b>${esc(it.ref || it.objectId)}</b></button> ` : ''}${esc(it.title)}<small>${esc(it.level)} · reaches ${esc(it.reach)} recorded object${it.reach === 1 ? '' : 's'}${it.detail ? ' · ' + esc(it.detail) : ''}</small></li>`;
    return `<li data-brief-${esc(it.kind)}><b>${esc(it.title)}</b>${it.detail ? `<small>${esc(it.detail)}</small>` : ''}</li>`;
  };
  const rules = [...new Set(brief.items.map(it => it.rule))];
  const prepared = brief.ask && SOL.pending && SOL.pending.request.ids.join('|') === brief.ask.ids.join('|');
  return `<section class="brain-brief" data-sol-scope data-brain-brief="${esc(brief.tab)}" aria-label="What the workbench already knows"><h3>${esc({work: 'Where to look first', model: 'Where to look first', validate: 'The findings that matter most', output: 'What the SDD still lacks'}[brief.tab] || 'From your project')}</h3><ul>${brief.items.map(line).join('')}</ul><p class="brain-brief-rules">Rules: ${esc(rules.join('; '))}. No model was consulted.</p>${prepared ? pendingHTML() : brief.ask && solConnected() ? askHTML(brief.ask.ids, {title: brief.ask.title, label: brief.ask.label, reads: `Chapter ${brief.chapter}’s recorded facts, open checks, connected model and relevant knowledge`}) : ''}</section>`;
}
