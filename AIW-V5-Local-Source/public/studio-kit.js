// Small render helpers the chapter studios share (audit F2-03): lists above a page size show their first
// rows with "Show all" (findings: "Show more"), and values derived from the store's (settled) document are computed once per
// revision (document-memo.js). The fields themselves are drawn by the field kit (record-fields.js recordField), from
// the descriptors of each record type; this module keeps the chip and the architecture design-task helpers.
import {esc} from './html-escape.js';
import {checkCode} from './util.js';
import {retirable,retiredRecords} from './record-lifecycle.js';
import {findRecord,recordProvenance} from './provenance.js';
export const PAGE_SIZE=50;
const expanded=new Set(),pages=new Map();
// A chapter's findings ('…:findings:…') page a page at a time with "Show more" (round 5, R5-G): at 500 records a
// chapter raises thousands of them (9,215 in Chapter 10), which "Show all" drew at once. So do the proposals a chapter
// lists for the person to keep or dismiss ('…:proposals', round 12, G, GR-UX-05: 416 runtime plans and paths in one list at
// size), and Chapter 11's final checks ('review:checks', 1,406 at size). Other lists keep "Show all".
const stepped=key=>/:(findings|proposals|checks)(:|$)/.test(String(key));
// The Validate tab's cause (round 12, G, GR-UX-03): a chapter's findings read by cause across the whole chapter
// (validate-view.js); a cause chosen there narrows the chapter's findings list to the findings its check raised (`code`,
// and its level), which the list still pages as before. Validate sets it and clears it when the chapter or the tab changes.
let findingCause=null;
// It belongs to the chapter it was chosen in: another chapter's findings are never narrowed by it.
const chapterNow=()=>typeof location==='undefined'?0:Number(new URLSearchParams(location.search).get('chapter')||1);
export function setFindingCause(cause){findingCause=cause&&cause.code?{code:String(cause.code),level:cause.level==='error'||cause.level==='warning'?cause.level:null,chapter:chapterNow()}:null;}
export const findingCauseOf=()=>findingCause;
// The Details column is a column of its own only from 1180 px: below that, studio-system.css lays it over the task as a
// sheet. The one rule for when it opens by itself (rc41 close) — the default on arrival on every tab and a selection on
// a Model picture alike (workspace-ux.js) — is that the viewport gives it that column and it holds something to read:
// the design at a glance or a held record. Where it would be a sheet it opens only when the person asks for it.
export const DETAILS_COLUMN_QUERY='(min-width:1180px)';
export const detailsColumnFits=()=>typeof matchMedia!=='function'||matchMedia(DETAILS_COLUMN_QUERY).matches;
export const detailsOpensByItself=({held=false,glance=false}={})=>detailsColumnFits()&&(!!held||!!glance);
// The Details toggles name what they would do. While the focused case holds the full width (validate.css hides the
// column) the bar's toggle is unavailable and says why, rather than offering to hide a column that is not shown (rc41).
// It stays focusable (aria-disabled, not disabled) so a keyboard or touch user reaches it and its reason: the reason is
// text beside it (its aria-describedby), shown while the toggle has focus or the pointer (rc41 close); workspace-ux.js
// ignores its click.
export const DETAILS_HELD_REASON='Details stay closed while the focused case is open';
let reasons=0;
export function syncDetailsToggle(){
  if(typeof document==='undefined')return;
  const collapsed=document.body.dataset.panel==='collapsed',caseReading=!!document.querySelector('.studio.vx-case-reading');
  document.querySelectorAll('[data-panel-toggle]').forEach(b=>{
    const held=caseReading&&!b.closest('#inspector');
    b.disabled=false;b.setAttribute('aria-expanded',String(!held&&!collapsed));
    if(held)b.setAttribute('aria-disabled','true');else b.removeAttribute('aria-disabled');
    b.title=held?DETAILS_HELD_REASON:collapsed?'Show details':'Hide details';
    let reason=b.nextElementSibling?.matches?.('.details-toggle-reason')?b.nextElementSibling:null;
    if(held){
      if(!reason){reason=document.createElement('span');reason.className='details-toggle-reason';reason.id='details-toggle-reason-'+(++reasons);b.after(reason);}
      reason.textContent=DETAILS_HELD_REASON;b.setAttribute('aria-describedby',reason.id);
    }else if(reason){reason.remove();b.removeAttribute('aria-describedby');}
  });
}
const ofCause=f=>checkCode(f?.code)===findingCause.code&&(!findingCause.level||(findingCause.level==='error')===(f.level==='error'));
// The rows to draw for a list: all of them when the list is short or the person asked for all, else the
// first page (for findings and proposals, as many pages as the person asked for). `key` names the list (e.g.
// 'logical:responsibilities') and must be stable across renders.
export function pageOf(items,key,size=PAGE_SIZE){
  const given=Array.isArray(items)?items:[],list=findingCause&&findingCause.chapter===chapterNow()&&/:findings(:|$)/.test(String(key))?given.filter(ofCause):given;
  if(stepped(key)){const upto=Math.max(size,pages.get(key)||size);return {rows:list.slice(0,upto),hidden:Math.max(0,list.length-upto),total:list.length,key,more:true};}
  const all=list.length<=size||expanded.has(key);
  return {rows:all?list:list.slice(0,size),hidden:all?0:list.length-size,total:list.length,key};
}
// The pager's action: the next page of findings, or the rest of any other list.
export function showAllOf(key){if(stepped(key))pages.set(key,(pages.get(key)||PAGE_SIZE)+PAGE_SIZE);else expanded.add(key);}
export function pagedAll(key){return expanded.has(key);}
// The pager line under a paged list: how many are shown and a control that reveals the rest. The control
// carries the studio's own action attribute (e.g. 'data-l-action') with the action 'show-all' and the list key
// in data-list, so the studio's click handler calls showAllOf(button.dataset.list) and renders again.
export function pagerHTML(page,actionAttribute='data-l-action',action='show-all'){
  if(!page.hidden)return '';
  if(page.more)return `<p class="l-pager"><button type="button" class="btn" ${actionAttribute}="${esc(action)}" data-list="${esc(page.key)}">Show more</button><small>${page.rows.length} of ${page.total} shown · ${Math.min(PAGE_SIZE,page.hidden)} more.</small></p>`;
  return `<p class="l-pager"><button type="button" class="btn" ${actionAttribute}="${esc(action)}" data-list="${esc(page.key)}">Show all ${page.total}</button><small>Showing the first ${page.rows.length} of ${page.total}.</small></p>`;
}
// perDocument(fn) memoises fn(document, ...args) for a settled (store) document, one entry per revision; any
// other document is computed every time (document-memo.js).
export {perDocument} from './document-memo.js';

// The one chip (round 11): a status word in one shape across the chapters. The words stay what each chapter's
// domain means; the tone says how to read them: '' (neutral), 'warn' (needs attention), 'pass' (confirmed,
// accepted, reviewed), 'draft', 'reference' (illustrative) or 'info' (recorded, in progress). A boolean tone is the
// studios' old `warn` flag.
export const CHIP_TONES=['warn','pass','draft','reference','info'];
export const studioBadge=(label,tone='')=>'<span class="chip'+(tone===true?' warn':typeof tone==='string'&&CHIP_TONES.includes(tone)?' '+tone:'')+'">'+esc(label)+'</span>';
export const chip=studioBadge;
// The architecture design-task editors (.arc-field): a short input or a textarea, a select, and record options.
export const arcField=(label,key,value,short=false)=>`<label class="arc-field"><span>${esc(label)}</span>${short?`<input data-arc-field="${key}" value="${esc(value)}" maxlength="160">`:`<textarea data-arc-field="${key}" rows="3" maxlength="2400">${esc(value)}</textarea>`}</label>`;
export const arcSelect=(label,key,value,options)=>`<label class="arc-field"><span>${esc(label)}</span><select data-arc-field="${key}">${options.map(([id,name])=>`<option value="${esc(id)}" ${id===value?'selected':''}>${esc(name)}</option>`).join('')}</select></label>`;
export const recordOptions=records=>records.map(r=>[r.id,(r.ref||r.id)+' · '+r.title]);
// The knowledge workspace's action buttons (data-k-action); `label` is markup the caller has escaped.
export const knowledgeButton=(action,label,attrs='')=>`<button type="button" class="btn" data-k-action="${action}" ${attrs}>${label}</button>`;

// The one lifecycle path on every chapter page (round 12, GR-GOV-23): retire the record in view, with a reason, and
// restore what this chapter retired, both through the one family (record.retire, record.restore). The controls carry the
// page's own action attribute (`attr`, e.g. 'data-l-action') with the action 'lifecycle-retire' or 'lifecycle-restore'
// and the record in data-lifecycle-id, so each page's click handler opens its retire dialog (the form
// 'record-retire-form') or sends the restore. Nothing is drawn when there is nothing to retire or restore.
export const RETIRE_TEXT='The record leaves the design and is kept with your reason, who and when; nothing reads it until it is restored. A record that another record still names stays until they let go of it.';
// Above it, where the record in view came from (round 12, GR-GOV-25): the one provenance reader's line, so every chapter
// page says who or what wrote it and whether a person reviewed it ("Drafted by Sol, not reviewed; applied by … on …").
export function provenanceHTML(p,chapter,id){
  const found=id?findRecord(p,chapter,id):null;if(!found)return '';
  const rp=recordProvenance(p,found.record,found.chapter);
  return `<p class="record-provenance" data-provenance-kind="${esc(rp.kind)}"><small>${esc(rp.line)}</small></p>`;
}
export function lifecycleHTML(p,chapter,id,attr){
  const own=!!id&&retirable(p,id,chapter),rs=retiredRecords(p,chapter),origin=provenanceHTML(p,chapter,id);
  if(!own&&!rs.length)return origin;
  const act=(a,x)=>`${attr}="lifecycle-${a}" data-lifecycle-id="${esc(x)}"`;
  return origin+`<section class="lifecycle" data-lifecycle-chapter="${esc(chapter)}" aria-label="Retire and restore">${own?`<button type="button" class="btn text-button lifecycle-retire" ${act('retire',id)}>Retire this record</button>`:''}${rs.length?`<details class="lifecycle-retired"><summary>${rs.length} retired in this chapter</summary><ul>${rs.map(x=>`<li><b>${esc(x.ref)}</b> ${esc(x.title)}<small> · ${esc(x.reason)}${x.actor?' · '+esc(x.actor):''}${x.with.length?' · with '+esc(x.with.join(', ')):''}</small> <button type="button" class="btn" ${act('restore',x.id)} aria-label="Restore ${esc(x.ref)}">Restore</button></li>`).join('')}</ul></details>`:''}</section>`;
}

// ---------------------------------------------------------------- the canvas drafts' editor registry (rc41 close, lead)
// Each chapter adapter registers its element and relationship editors in bind(): {element(spec), relationship(spec)};
// the handle it gets back releases it. canvas-draft.js hands a draft to the registered editor. It lives here, beside the
// studios' shared helpers, so the Work route carries the registry and not the canvas, which the Model views load with
// the picture (client-bundle.mjs, the chapters route budget). Nothing here draws or writes the document.
const draftEditors = new Map();
export function registerDraftEditor(chapter, handlers) {
  const key = Number(chapter); draftEditors.set(key, handlers || {});
  return () => { if (draftEditors.get(key) === handlers) draftEditors.delete(key); };
}
export const hasDraftEditor = (chapter, kind) => typeof draftEditors.get(Number(chapter))?.[kind] === 'function';
// Sets the fields of the editor's form the draft prefills (a select, an input, a textarea, or one of a group of
// checkboxes). A select or a text is set quietly (a prefilled form is not an edited one, so the editor's cancel asks
// nothing until the person types); a ticked checkbox tells the form, since fields depend on it (a realized capability's
// scope). Returns the names it could not set (a value the form does not offer is left for the person to choose).
export function prefillForm(selector, values) {
  const form = typeof selector === 'string' ? document.querySelector(selector) : selector; if (!form) return Object.keys(values || {});
  const missed = [];
  for (const [name, value] of Object.entries(values || {})) {
    if (value == null || value === '') continue;
    const controls = [...form.querySelectorAll(`[name="${CSS.escape(name)}"]`)]; if (!controls.length) { missed.push(name); continue; }
    const boxes = controls.filter(c => c.type === 'checkbox' || c.type === 'radio');
    if (boxes.length) { const wanted = Array.isArray(value) ? value.map(String) : [String(value)]; let hit = false; for (const c of boxes) if (wanted.includes(c.value)) { if (!c.checked) { c.checked = true; c.dispatchEvent(new Event('change', {bubbles: true})); } hit = true; } if (!hit) missed.push(name); continue; }
    const c = controls[0];
    if (c.tagName === 'SELECT' && ![...c.options].some(o => o.value === String(value))) { missed.push(name); continue; }
    c.value = String(value);
  }
  return missed;
}
// The editor a chapter registered for a draft of this kind, if any.
export const draftEditor = (chapter, kind) => draftEditors.get(Number(chapter))?.[kind];
