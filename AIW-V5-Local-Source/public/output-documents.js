// The documents the workbench produces, in one declarative list (round 11, DESIGN §2.3: the Output tab as a stage;
// round 26, D-26-13: the one Output kit). Each document names the chapter whose Output tab offers it, the chapters it
// reads, the formats it comes in and the route that serves them, whether the route serves a preview (`preview`: the
// HTML with view=1, opened in a dialog), the pack it comes as where it is not one file (the MADR zip, built in the
// browser), what it needs before it can be produced now, and what later chapters add to it. outputStage reads that list
// against a project: for one chapter, the documents it can produce now (with what would make each fuller), the chapter's
// own documents that still need a record, and the documents of later chapters that read it, each with what it needs in
// one line. documentListHTML draws the list for every chapter's Output tab: document · Preview · Markdown · HTML · JSON
// (only where the document has its own data JSON) · packs, each file offered once; "Project data (JSON)", the whole saved
// project, once per page; the chapter's documents it cannot produce yet disabled with the reason. Pure and rule-based;
// the suite reads it without a browser. The downloads go through one mechanic (project-context.js downloadExport), which
// appends a chapter's browser-only appendix (registerOutputAppendix) as data.
import {projectURL, downloadExport} from './project-context.js';
import {chapterChecks, counted, checkUnits, projectHasRecords} from './readiness-model.js';
import {chapterRecordSet, typeLabel} from './chapter-records.js';
import {architectureModel} from './architecture-model.js';
import {reviewSourceUrl} from './review-domain.js';
import {esc} from './html-escape.js';
import {list, plural} from './util.js';
import {httpOperation} from './contract-operation.js';

const has = {
  requirement: p => list(p?.artefacts).some(a => a.type === 'requirement'),
  driver: p => list(p?.quality?.drivers).length > 0,
  decision: p => list(p?.decisions?.records).length > 0,
  responsibility: p => list(p?.logical?.responsibilities).length > 0,
  component: p => list(p?.realisation?.components).length > 0,
  capability: p => list(p?.technology?.capabilities).length > 0,
  realisation: p => list(p?.technologyRealisation?.records).length > 0,
  contract: p => list(p?.interfaces?.contracts).length > 0,
  data: p => list(p?.interfaces?.data).length > 0,
  interfaceContent: p => has.contract(p) || has.data(p),
  openapi: p => list(p?.interfaces?.contracts).some(c => c.kind === 'request' && httpOperation(c.operation)),
  asyncapi: p => list(p?.interfaces?.contracts).some(c => c.kind === 'event'),
  control: p => list(p?.security?.controls).length > 0 || list(p?.security?.threats).length > 0,
  plan: p => list(p?.runtime?.plans).length > 0,
  framing: p => ['owner', 'audience', 'summary', 'scope', 'approach'].every(k => String(p?.finalReview?.narrative?.[k] || '').trim()),
  record: p => projectHasRecords(p) || Array.from({length: 11}, (_, i) => chapterRecordSet(p, i + 1).total).some(n => n > 0) || ['summary', 'scope', 'approach'].some(k => String(p?.finalReview?.narrative?.[k] || '').trim())
};
// What a document needs, as a rule and the words for it: {chapter, test, text}.
const need = (chapter, key, text) => ({chapter, test: has[key], text});
// A chapter register: the export route serves it as Markdown (format=md) and HTML (format=html; view=1 is the preview);
// its JSON is not its own (the route's JSON is the whole project, offered once per page as "Project data").
// A register holds every record type owned by its chapter, not only its primary type.
// For example a runtime environment, security boundary or external participant is already useful output.
const register = (chapter, id, title, key, text, reads = [chapter]) => ({id, chapter, title, kind: 'register', reads, formats: ['md', 'html'], preview: true, path: f => `/api/export?chapter=${chapter}&format=${f}`, needs: [{chapter, test: p => chapterRecordSet(p, chapter).total > 0, text}], fuller: []});
// The MADR zip's words, on the page and under the row (round 6, Contract F): one file per decision, derived and saying so.
export const MADR_DOWNLOAD_TEXT = 'Download decision records (MADR)';
const madrNote = p => { const n = list(p?.decisions?.records).length; return `One Markdown Any Decision Record per decision, ${n === 1 ? 'one file' : n + ' files'} in a zip: the question as the title, the status as recorded, the context, the quality drivers as decision drivers, the alternatives with their benefits and costs as good and bad lines, the chosen alternative with its rationale, the consequences, and the evidence and assumptions as confirmation. Each file is derived from the saved record and says so: the record stays the authority.`; };

export const OUTPUT_DOCUMENTS = [
  register(1, 'requirements', 'Requirements register', 'requirement', 'a requirement'),
  register(2, 'quality', 'Quality driver register', 'driver', 'a quality driver'),
  {id: 'ars', chapter: 2, title: 'Architecture requirements specification', kind: 'document', reads: [2, 3, 4, 5, 6, 7, 9, 10], formats: ['md', 'html', 'json'], preview: true, path: f => `/api/export?chapter=2&document=ars&format=${f}`,
    needs: [need(2, 'driver', 'a quality driver')], fuller: [need(4, 'responsibility', 'the responsibilities each driver reaches'), need(5, 'component', 'the components that carry it'), need(10, 'plan', 'the runtime plans that run it')]},
  register(3, 'decisions', 'Decision register', 'decision', 'a decision'),
  {id: 'madr', chapter: 3, title: 'Decision records (MADR)', kind: 'document', reads: [3], formats: ['zip'], pack: 'madr', path: () => null, needs: [need(3, 'decision', 'a decision')], fuller: [], note: madrNote},
  register(4, 'logical', 'Logical model register', 'responsibility', 'a responsibility'),
  register(5, 'realisation', 'Application realisation register', 'component', 'a component'),
  {id: 'spec', chapter: 5, title: 'Component specification, one per component', kind: 'document', reads: [2, 3, 4, 5, 6, 7, 8, 9, 10], formats: ['md', 'html', 'json'], preview: true, path: () => null, perRecord: true, recordType: 'component', recordPath: (f, id) => `/api/export?chapter=5&document=spec&id=${encodeURIComponent(id)}&format=${f}`,
    needs: [need(5, 'component', 'a component')], fuller: [need(6, 'capability', 'the capabilities it stands on'), need(7, 'realisation', 'the products chosen for them'), need(8, 'contract', 'its interface contracts'), need(9, 'control', 'the controls that protect it'), need(10, 'plan', 'where and how it runs')]},
  register(6, 'technology', 'Logical technology register', 'capability', 'a technology capability'),
  register(7, 'technology-realisation', 'Technology realization register', 'realisation', 'a technology realization'),
  register(8, 'interfaces', 'Interfaces and data register', 'interfaceContent', 'an interface contract or a data definition'),
  {id: 'contracts', chapter: 8, title: 'Contract specifications (OpenAPI, AsyncAPI)', kind: 'document', reads: [8], formats: ['openapi', 'asyncapi'], path: f => `/api/export?chapter=8&format=${f}`, needs: [need(8, 'contract', 'an interface contract')],
    availability: {openapi: {test: has.openapi, text: 'a request contract with METHOD /path in Chapter 8 Work; qualifiers remain in the export receipt'}, asyncapi: {test: has.asyncapi, text: 'an event contract in Chapter 8 Work; record its channel address before implementation'}}, fuller: []},
  {id: 'schemas', chapter: 8, title: 'Data schemas (no paths or channels)', kind: 'document', reads: [8], formats: ['schemas'], path: () => '/api/export?chapter=8&format=schemas', needs: [need(8, 'data', 'a data definition')], fuller: []},
  register(9, 'security', 'Security register', 'control', 'a threat or a control'),
  register(10, 'runtime', 'Deployment and runtime register', 'plan', 'a runtime plan'),
  {id: 'sdd', chapter: 11, title: 'Solution design document (full and executive editions)', kind: 'document', reads: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], formats: ['md', 'html', 'json'], preview: true, path: f => `/api/export?chapter=11&format=${f}`,
    needs: [{...need(1, 'record', 'a saved design record in any chapter'), anyChapter: true}], fuller: [need(11, 'framing', 'the SDD framed in Chapter 11 (owner, audience, summary, scope, approach)'), need(2, 'driver', 'the requirements specification'), need(5, 'component', 'the component specifications')]},
  {id: 'delivery', chapter: 11, title: 'Delivery exchange (JSON)', kind: 'document', reads: [5, 8, 10], formats: ['delivery'], path: f => `/api/export?chapter=11&format=${f}`, needs: [need(5, 'component', 'a component'), need(8, 'contract', 'an interface contract'), need(10, 'plan', 'a runtime plan')], fuller: []}
];

// One chapter's stage: what it can produce now, what still needs a record (its own documents, `here`) and what still
// needs later chapters, and the one link to the whole project.
export function outputStage(p, chapter) {
  chapter = Number(chapter);
  const own = OUTPUT_DOCUMENTS.filter(d => d.chapter === chapter), elsewhere = OUTPUT_DOCUMENTS.filter(d => d.chapter > chapter && d.reads.includes(chapter));
  const missing = d => d.needs.filter(n => !n.test(p));
  const words = ns => ns.map(n => n.anyChapter ? n.text : `${n.text} (Chapter ${n.chapter})`).join(', ');
  const available = d => d.formats.filter(f => !d.availability?.[f] || d.availability[f].test(p));
  const formatGaps = d => d.formats.filter(f => d.availability?.[f] && !d.availability[f].test(p)).map(f => `${FORMAT[f]} requires ${d.availability[f].text}`);
  const now = own.filter(d => !missing(d).length && available(d).length).map(d => ({id: d.id, title: d.title, kind: d.kind, formats: available(d), perRecord: !!d.perRecord, pack: d.pack || null,
    links: available(d).map(f => ({format: f, path: d.path(f)})).filter(l => l.path), preview: d.preview && d.path('html') ? d.path('html') + '&view=1' : null, note: d.note ? d.note(p) : '', formatGap: formatGaps(d).join('; '),
    fuller: d.fuller.filter(n => !n.test(p)).length ? 'Fuller with ' + words(d.fuller.filter(n => !n.test(p))) + '.' : ''}));
  // Its own documents that cannot be produced yet, with what each needs (once: two documents that need the same record
  // say it once each, never twice in one clause), then the later chapters' documents that read this one.
  const later = [...own.filter(d => missing(d).length || !available(d).length).map(d => ({id: d.id, title: d.title, chapter: d.chapter, here: true, formats: d.formats, pack: d.pack || null, needs: missing(d).length ? 'Needs ' + words(missing(d)) + '.' : formatGaps(d).join('; ') + '.'})),
    ...elsewhere.map(d => ({id: d.id, title: d.title, chapter: d.chapter, here: false, available: !missing(d).length && available(d).length > 0, url: '/?chapter=' + d.chapter + '&tab=output', needs: (missing(d).length ? 'Needs ' + words(missing(d)) + '. ' : '') + `Offered in Chapter ${d.chapter}; it reads this chapter.`}))];
  // Availability means the file can be generated from saved records. It says nothing about
  // whether those records passed the chapter's checks or the final SDD review.
  const checks = chapterChecks(p, chapter);
  const review = checks ? {toFix: checks.toFix, toConfirm: checks.toConfirm, passing: checks.passing, total: checks.total, at: checks.run?.at || null, current: !!checks.run?.current, next: checks.next} : null;
  // The whole saved project is the route's JSON without a chapter (a chapter's JSON would be the same file; Chapter 11's
  // is the SDD package), so the one link reads the same on every page.
  const domain = [null,null,'quality','decisions','logical','realisation','technology','technologyRealisation','interfaces','security','runtime','finalReview'][chapter];
  const handoff = chapter === 1 ? p.handoff : p[domain]?.handoff;
  return {chapter, now, later, project: {path: '/api/export?format=json'}, review, handoffAt: handoff?.at || null};
}

// The list as the Output tab draws it (D-26-13): the documents it can produce now, each with Preview, its downloads and
// its packs; the project data once; what still needs work (its own documents, disabled with the reason) and what needs
// later chapters; the one doctrine line. `offeredAbove` names a document the page offers above the list (Chapter 11's
// export form carries the SDD with its edition and audience), so its files are not offered twice.
const FORMAT = {md: 'Markdown', html: 'HTML', json: 'JSON', zip: 'Zip', openapi: 'OpenAPI', asyncapi: 'AsyncAPI', schemas: 'JSON Schema', delivery: 'JSON'};
const num = n => Number(n).toLocaleString('en-GB');
export function documentListHTML(p, chapter, {offeredAbove = {}} = {}) {
  chapter = Number(chapter);
  const S = outputStage(p, chapter), work = esc(projectURL('/?chapter=' + chapter + '&tab=work'));
  const download = (d, l) => `<a class="btn" href="${esc(projectURL(l.path))}" download data-out-download="${esc(d.title)} (${esc(FORMAT[l.format] || l.format)})">${FORMAT[l.format] || l.format}</a>`;
  const preview = d => d.preview ? `<button type="button" class="btn" data-out-preview="${esc(projectURL(d.preview))}" data-out-title="${esc(d.title)}">Preview</button>` : '';
  const pack = (d, disabled = false) => d.pack === 'madr' ? `<button type="button" class="btn" data-vx-madr="zip"${disabled ? ' disabled' : ''}>${MADR_DOWNLOAD_TEXT}</button>` : '';
  const links = d => offeredAbove[d.id] ? `<span class="out-links"><small>${esc(offeredAbove[d.id])}</small></span>`
    : d.links.length || d.preview || d.pack ? `<span class="out-links">${preview(d)}${d.links.map(l => download(d, l)).join('')}${pack(d)}</span>`
    : `<span class="out-links"><small>${d.perRecord ? 'Below, with each record' : 'Below'}</small></span>`;
  const row = d => `<li class="out-doc" data-document="${esc(d.id)}"><b>${esc(d.title)}</b><small class="out-working">Working snapshot</small>${links(d)}${d.note ? `<details class="out-format-note"><summary>What the pack includes</summary><p>${esc(d.note)}</p></details>` : ''}${d.formatGap ? `<small class="out-fuller">${esc(d.formatGap)}.</small>` : ''}${d.fuller ? `<small class="out-fuller">${esc(d.fuller)}</small>` : ''}</li>`;
  // A document of this chapter that needs a record first: its controls disabled, the reason beside them, the way to Work.
  const waiting = x => `<li class="out-doc out-waiting" data-document="${esc(x.id)}"><b>${esc(x.title)}</b><span class="out-links">${x.pack ? pack(x, true) : x.formats.map(f => `<button type="button" class="btn" disabled title="${esc(x.needs)}">${FORMAT[f] || f}</button>`).join('')}</span><small class="out-reason">${esc(x.needs)} <a href="${work}">Add or review records in Work →</a></small></li>`;
  const own = S.later.filter(x => x.here), elsewhere = S.later.filter(x => !x.here);
  const head = S.now.length ? plural(S.now.length, 'document') + ' this chapter can produce now' : 'What this chapter will produce';
  const now = S.now.length ? `<ul class="out-now">${S.now.map(row).join('')}</ul>` : '';
  const still = own.length ? `${S.now.length ? '<h4>What still needs work</h4>' : ''}<ul class="out-now out-waiting">${own.map(waiting).join('')}</ul>` : '';
  const project = `<p class="out-project"><b>Project data (JSON)</b><small>the whole saved project: every chapter's records, the connected model and the findings, in one file</small><a class="btn" href="${esc(projectURL(S.project.path))}" download data-out-download="Project data (JSON)">JSON</a></p>`;
  const later = elsewhere.length ? `<details class="out-related"><summary>Contributes to ${plural(elsewhere.length, 'document')} in later chapters</summary><ul class="out-later">${elsewhere.map(d => `<li><b>${esc(d.title)}</b><span class="out-availability">${d.available ? 'Available now' : 'Records needed'}</span><small>${esc(d.needs)}</small><a href="${esc(projectURL(d.url))}">Open Chapter ${d.chapter} Output →</a></li>`).join('')}</ul></details>` : '';
  const U = checkUnits(chapter);
  const review = S.review ? `<p class="out-review"><b>Chapter ${chapter} checks:</b> ${counted(S.review.toFix, U.fix)} · ${counted(S.review.toConfirm, U.confirm)} · ${num(S.review.passing)} of ${plural(S.review.total, 'SDD passage')} passing. <span class="out-freshness ${S.review.current ? 'current' : 'stale'}">${S.review.current ? 'Recorded checks are current.' : 'A fresh check is needed.'}</span> <a href="${esc(projectURL('/?chapter=' + chapter + '&tab=validate'))}">Open Validate →</a></p>` : '';
  const recorded = S.review?.at || S.handoffAt ? `<p class="out-recorded">${S.review?.at ? 'Last recorded check: '+esc(S.review.at)+'. ' : ''}${S.handoffAt ? 'Last recorded handoff: '+esc(S.handoffAt)+'. A historical receipt does not establish current readiness.' : ''}</p>` : '';
  return `<section class="out-stage" data-chapter="${chapter}" aria-labelledby="out-stage-${chapter}"><header><small>Documents · Chapter ${chapter}</small><h3 id="out-stage-${chapter}">${head}</h3></header>${review}${recorded}${now}${still}${later}<details class="out-backup"><summary>Project backup and exchange data</summary>${project}</details><p class="out-status" role="status" aria-live="polite" hidden></p><p class="out-note">Downloads are working snapshots of saved records. Chapter checks and the final SDD review remain separate; none approves anything.</p></section>`;
}

// "Preview this chapter's part of the SDD" beside the passages table (D-26-13, R26-O-14): for Chapters 1–10 the SDD's
// review registers annex (Appendix D) opened in the preview dialog at this chapter's register (`data-out-find` names the
// heading the dialog scrolls to); for Chapter 11 the working SDD itself, whose passages the review writes.
export function passagesPreviewHTML(chapter) {
  const own = Number(chapter) === 11;
  const url = own ? '/api/export?chapter=11&format=html&view=1' : '/api/export?chapter=11&annex=registers&format=html&view=1';
  return `<p class="out-passages-preview"><button type="button" class="btn" data-out-preview="${esc(projectURL(url))}" data-out-title="${own ? 'Solution design document · working draft' : `Solution design document · review registers (Appendix D) · Chapter ${esc(chapter)}`}"${own ? '' : ` data-out-find="Chapter ${esc(chapter)} —"`}>Preview this chapter's part of the SDD</button><small>${own ? 'The working SDD as the review assembles it now.' : 'The SDD\'s review registers annex (Appendix D), opened at this chapter\'s register.'}</small></p>`;
}

// ---------------------------------------------------------------- the chapter's own records (D-26-13, R26-O-03, R26-O-11)
// Every register page lists the chapter's record set (chapter-records.js chapterRecordSet, D-26-09): one read-only row
// per record with its reference, title, status, one line of detail and an Inspect action and the separate "Open in Work" link (the chapter's Work
// with the record selected); the per-record formats where a record has a document of its own (the registry's `recordType`
// and `recordPath`: Chapter 5's specification as Preview · Markdown · HTML · JSON). Inspect opens the saved record in the current surface; only Open in Work navigates. Rows never edit
// on Output. Grouped by type where the chapter holds several, a page of 50 rows and "Show 50 more" (the frame appends the
// next page). A studio registers what only it knows (registerOutputRecords): `detail(row)` for the row's line, `filter(row)`
// for what the page shows (Chapter 10's environment), `sections` of HTML after the rows (Chapter 4's implementation links).
export const RECORD_PAGE = 50;
const recordOptions = new Map();
export function registerOutputRecords(chapter, options) { recordOptions.set(Number(chapter), options && typeof options === 'object' ? options : null); }
const clip = (s, n = 160) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s; };
// The rows the page lists, in type order (the types as the record set meets them), each with its model object.
export function outputRecords(p, chapter) {
  chapter = Number(chapter);
  const o = recordOptions.get(chapter) || {}, M = architectureModel(p);
  const rows = chapterRecordSet(p, chapter).records.map(r => ({...r, object: M.objects.get(r.id) || null}));
  const kept = typeof o.filter === 'function' ? rows.filter(r => { try { return !!o.filter(r); } catch { return true; } }) : rows;
  const order = [...new Set(kept.map(r => r.type))];
  return kept.map((r, i) => [r, i]).sort((a, b) => order.indexOf(a[0].type) - order.indexOf(b[0].type) || a[1] - b[1]).map(x => x[0]);
}
const recordDetail = (o, r) => { if (typeof o.detail === 'function') { try { const d = o.detail(r); if (d != null) return String(d); } catch { /* the row reads without its detail */ } } return [r.object?.description, r.object?.owner].filter(Boolean).join(' · '); };
// A record's own document, as controls: the registry's per-record document for its type.
function recordFormatsHTML(r) {
  const d = OUTPUT_DOCUMENTS.find(x => x.perRecord && x.recordType === r.type && x.recordPath); if (!d) return '';
  const name = d.title.replace(/,.*$/, '') + ' ' + r.ref;
  return (d.preview ? `<button type="button" class="btn" data-out-preview="${esc(projectURL(d.recordPath('html', r.id) + '&view=1'))}" data-out-title="${esc(name)}">Preview</button>` : '')
    + d.formats.map(f => `<a class="btn" href="${esc(projectURL(d.recordPath(f, r.id)))}" download data-out-download="${esc(name)} (${esc(FORMAT[f] || f)})">${FORMAT[f] || f}</a>`).join('');
}
function recordRowHTML(chapter, r, prev, several, o) {
  const detail = recordDetail(o, r);
  return ((several && (!prev || prev.type !== r.type)) ? `<li class="out-record-type" aria-hidden="true"><h4>${esc(typeLabel(r.type))}</h4></li>` : '')
    + `<li class="out-record" data-record="${esc(r.id)}" data-type="${esc(r.type)}"><span class="out-record-ref">${esc(r.ref)}</span><b class="out-record-title">${esc(r.title)}${r.status ? ` <span class="chip out-record-status">${esc(r.status)}</span>` : ''}</b>${detail ? `<small class="out-record-detail">${esc(clip(detail))}</small>` : ''}<span class="out-record-acts">${o.documents===false?'':recordFormatsHTML(r)}<button type="button" class="btn out-record-inspect" data-out-inspect="${esc(r.id)}" data-out-chapter="${esc(r.chapter)}" aria-label="Inspect ${esc(r.ref+' · '+r.title)}">Inspect</button><a class="btn out-record-open" data-out-work="${esc(r.id)}" href="${esc(projectURL(reviewSourceUrl(chapter, r.id, 'work')))}">Open in Work</a></span></li>`;
}
// A page of rows, from `from`: what the list draws first and what "Show 50 more" appends.
export function recordRowsHTML(p, chapter, from = 0, to = from + RECORD_PAGE, {documents = true} = {}) {
  chapter = Number(chapter);
  const rows = outputRecords(p, chapter), o = {...(recordOptions.get(chapter) || {}), documents}, several = new Set(rows.map(r => r.type)).size > 1;
  return rows.slice(from, to).map((r, i) => recordRowHTML(chapter, r, rows[from + i - 1] || null, several, o)).join('');
}
export const recordPagerHTML = (chapter, shown, total) => shown < total ? `<p class="out-more"><button type="button" class="btn" data-out-more="${shown}">Show ${Math.min(RECORD_PAGE, total - shown)} more</button><small>${shown.toLocaleString('en-GB')} of ${plural(total, 'record')} shown</small></p>` : '';
export function recordListHTML(p, chapter, {title = 'This chapter\'s records', documents = true} = {}) {
  chapter = Number(chapter);
  const rows = outputRecords(p, chapter), set = chapterRecordSet(p, chapter), o = recordOptions.get(chapter) || {}, shown = Math.min(rows.length, RECORD_PAGE), work = esc(projectURL('/?chapter=' + chapter + '&tab=work'));
  const head = `<header><h3 id="out-records-${chapter}">${esc(title)}</h3><p class="out-records-count">${esc(set.label({detail: true}))}${rows.length !== set.total ? ' · ' + plural(rows.length, 'record') + ' shown here' : ''}</p></header>`;
  let secs = []; try { secs = list(typeof o.sections === 'function' ? o.sections() : o.sections); } catch (e) { console.warn('A section of the records could not be drawn.', e?.message); }
  const sections = secs.map(s => `<section class="out-records-section"><h4>${esc(s.title)}</h4>${s.html || ''}</section>`).join('');
  if (!rows.length) return `<section class="out-records" data-chapter="${chapter}" data-out-documents="${documents}" aria-labelledby="out-records-${chapter}">${head}<p class="out-records-none">${set.total ? 'No record is shown here.' : 'No records yet.'} <a href="${work}">${set.total ? 'Open Work →' : 'Add the first in Work →'}</a></p>${sections}</section>`;
  return `<section class="out-records" data-chapter="${chapter}" data-out-documents="${documents}" aria-labelledby="out-records-${chapter}">${head}<ul class="out-record-list">${recordRowsHTML(p, chapter, 0, shown, {documents})}</ul>${recordPagerHTML(chapter, shown, rows.length)}${sections}<p class="out-note">Inspect reads the saved record here. Open in Work takes you to its editing chapter.</p></section>`;
}

// A chapter's browser-only appendix (D-26-13: the appendices are data the one mechanic appends): the studio registers a
// provider, and every download of its documents carries what it returns, {markdown, json}, as a Markdown section at the
// end of a Markdown file or as the `browserExploration` member of the project JSON. Nothing of it is a saved record.
const appendices = new Map();
export function registerOutputAppendix(chapter, provide) { appendices.set(Number(chapter), typeof provide === 'function' ? provide : null); }
export function outputAppendix(chapter) { try { return appendices.get(Number(chapter))?.() || null; } catch (e) { console.warn('The chapter\'s export appendix could not be read.', e?.message); return null; } }
// One download, through the one mechanic, with the chapter's appendix.
export function downloadOutput(path, {chapter = null, fallback = 'AIW_Project'} = {}) { return downloadExport(path, fallback, {appendix: chapter == null ? null : outputAppendix(chapter)}); }
