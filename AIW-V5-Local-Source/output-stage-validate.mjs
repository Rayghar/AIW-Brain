// The Output tab's stage (round 11): from one declarative list of documents, what each chapter can produce now and
// what still needs later chapters, with what each needs in one line, on the reference project and on a blank one.
// Pure readers: nothing changes the project. Run: npm run test:output-stage
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {createProject} from './shared/projects-domain.js';
import {OUTPUT_DOCUMENTS, outputStage, documentListHTML, MADR_DOWNLOAD_TEXT, registerOutputAppendix, outputAppendix} from './public/output-documents.js';

const checks = [], pass = n => checks.push(n);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const blank = withFinalReview(createProject({name: 'Blank', template: 'blank'}, 'blank-stage')), blankBefore = JSON.stringify(blank);

// 1. One list: every chapter offers at least one document; ids are unique; every document says what it needs and reads.
assert.equal(new Set(OUTPUT_DOCUMENTS.map(d => d.id)).size, OUTPUT_DOCUMENTS.length, 'unique ids');
for (let ch = 1; ch <= 11; ch++) assert.ok(OUTPUT_DOCUMENTS.some(d => d.chapter === ch), 'Chapter ' + ch + ' offers a document');
for (const d of OUTPUT_DOCUMENTS) { assert.ok(d.title && d.formats.length && d.reads.length && d.needs.length && d.needs.every(n => n.chapter >= 1 && n.chapter <= 11 && typeof n.test === 'function' && n.text), d.id); assert.ok(d.fuller.every(n => n.chapter >= 1 && n.chapter <= 11 && n.text), d.id + ' says which chapter makes it fuller'); }
assert.ok(OUTPUT_DOCUMENTS.find(d => d.id === 'ars').chapter === 2 && OUTPUT_DOCUMENTS.find(d => d.id === 'spec').chapter === 5 && OUTPUT_DOCUMENTS.find(d => d.id === 'sdd').chapter === 11, 'the specifications and the SDD sit in their chapters');
// Round 26 (D-26-13): a register's JSON was the whole project, so a register comes as Markdown (the project data is offered
// once per page); JSON stays only where a document has its own data; `preview` is set only where the route serves view=1;
// the MADR zip is a registry document (a pack), no longer a card the frame builds for Chapter 3 alone.
for (const d of OUTPUT_DOCUMENTS.filter(d => d.kind === 'register')) assert.deepEqual(d.formats.filter(f => f === 'json'), [], d.id + ': a register has no JSON of its own');
assert.deepEqual(OUTPUT_DOCUMENTS.filter(d => d.formats.includes('json')).map(d => d.id), ['ars', 'spec', 'sdd'], 'JSON only where the document has its own data');
assert.deepEqual(OUTPUT_DOCUMENTS.filter(d => d.preview).map(d => d.id), ['requirements', 'quality', 'ars', 'decisions', 'logical', 'realisation', 'spec', 'technology', 'technology-realisation', 'interfaces', 'security', 'runtime', 'sdd'], 'preview where the route serves view=1: every register, the ARS, the specifications and the SDD; not the packs');
for (const d of OUTPUT_DOCUMENTS.filter(d => d.kind === 'register')) assert.deepEqual(d.formats, ['md', 'html'], d.id + ': Markdown and HTML');
assert.deepEqual([OUTPUT_DOCUMENTS.find(d => d.id === 'madr').pack, OUTPUT_DOCUMENTS.find(d => d.id === 'madr').formats], ['madr', ['zip']], 'the MADR zip is a registry document');
pass('one declarative list names every document with its chapter, the chapters it reads, its formats, what it needs and what later chapters add; every chapter offers at least one; a register comes as Markdown, JSON only where a document has its own data, preview where the route serves it, the MADR zip as a pack');

// 2. On the reference, every chapter can produce its documents now; later chapters' documents that read it are named.
for (let ch = 1; ch <= 11; ch++) {
  const S = outputStage(project, ch);
  assert.equal(S.chapter, ch);
  assert.deepEqual(S.now.map(d => d.id), OUTPUT_DOCUMENTS.filter(d => d.chapter === ch).map(d => d.id), 'Chapter ' + ch + ' produces every document of its own now');
  for (const d of S.now) assert.ok(d.links.every(l => /^\/api\/export\?chapter=\d+/.test(l.path)) && (d.links.length || d.perRecord || d.pack === 'madr'), d.id + ' links each format to the export route');
  assert.ok(S.later.every(x => !x.here && x.chapter > ch && /Offered in Chapter \d+; it reads this chapter\.$/.test(x.needs)), 'Chapter ' + ch + ': what is listed as later is offered by a later chapter that reads this one');
  assert.equal(S.project.path, '/api/export?format=json', 'Chapter ' + ch + ': the whole project once, from the route without a chapter (Chapter 11\'s JSON is the SDD package)');
  assert.ok(S.now.every(d => !d.preview || /&view=1$/.test(d.preview)) && S.now.every(d => d.links.every(l => !/view=1/.test(l.path))), 'Chapter ' + ch + ': a preview is the HTML view; a download never is');
}
const S2 = outputStage(project, 2), S5 = outputStage(project, 5), S11 = outputStage(project, 11);
assert.deepEqual(S2.now.map(d => d.id), ['quality', 'ars']); assert.deepEqual(S2.now[1].links.map(l => l.format), ['md', 'html', 'json']); assert.match(S2.now[1].links[1].path, /document=ars&format=html$/); assert.match(S2.now[1].preview, /document=ars&format=html&view=1$/);
assert.deepEqual([S2.now[0].links.map(l => l.path), S2.now[0].preview], [['/api/export?chapter=2&format=md', '/api/export?chapter=2&format=html'], '/api/export?chapter=2&format=html&view=1'], 'the quality register comes as Markdown and HTML, with the HTML view as its preview');
assert.deepEqual(S2.later.map(x => x.id), ['spec', 'sdd'], 'the component specification and the SDD read the drivers');
assert.deepEqual(S5.now.map(d => d.id), ['realisation', 'spec']); assert.ok(S5.now[1].perRecord && !S5.now[1].links.length, 'one per component, offered with each record');
assert.deepEqual(S11.now.map(d => d.id), ['sdd', 'delivery']); assert.match(S11.now[0].fuller, /^Fuller with the SDD framed in Chapter 11 \(owner, audience, summary, scope, approach\) \(Chapter 11\)\.$/, 'the reference has every record but no framing yet');
assert.equal(S2.now[1].fuller, '', 'the requirements specification reads every chapter it needs on the reference');
pass('on the reference every chapter can produce its own documents now, each format linked to the export route; the component specification and the SDD are named at Chapter 2 as later documents that read it; the SDD says the framing would make it fuller');

// 3. On a blank project, nothing can be produced until the chapter records something, and the stage says what, in one line.
const B1 = outputStage(blank, 1), B2 = outputStage(blank, 2), B5 = outputStage(blank, 5), B11 = outputStage(blank, 11);
assert.deepEqual(B1.now, []); assert.deepEqual(B1.later.filter(x => x.here).map(x => [x.id, x.needs]), [['requirements', 'Needs a requirement (Chapter 1).']]);
assert.deepEqual(B2.later.filter(x => x.here).map(x => x.needs), ['Needs a quality driver (Chapter 2).', 'Needs a quality driver (Chapter 2).']);
assert.ok(B5.later.some(x => x.id === 'spec' && x.needs === 'Needs a component (Chapter 5).'));
assert.ok(B11.later.some(x => x.id === 'sdd' && x.needs === 'Needs a saved design record in any chapter.') && B11.later.some(x => x.id === 'delivery' && /Needs a component \(Chapter 5\), an interface contract \(Chapter 8\), a runtime plan \(Chapter 10\)\./.test(x.needs)));
const withDriver = structuredClone(blank); withDriver.quality.drivers.push({...project.quality.drivers[0]});
const W2 = outputStage(withDriver, 2);
assert.deepEqual(W2.now.map(d => d.id), ['quality', 'ars']); assert.equal(W2.now[1].fuller, 'Fuller with the responsibilities each driver reaches (Chapter 4), the components that carry it (Chapter 5), the runtime plans that run it (Chapter 10).');
pass('on a blank project the stage lists nothing to produce and says in one line what each document needs; with one driver the requirements specification can be produced and says which later chapters make it fuller');

// 4. The HTML the Output tab draws (D-26-13): the documents with Preview, a link per format and their packs, each file
// once; the project data once; then what needs later chapters. A blank chapter lists its own documents disabled with the
// reason, once each, above no live export.
const html = documentListHTML(project, 2), blankHTML = documentListHTML(blank, 1), html3 = documentListHTML(project, 3), blank5 = documentListHTML(blank, 5);
assert.ok(/<section class="out-stage" data-chapter="2"/.test(html) && /2 documents this chapter can produce now/.test(html) && /Architecture requirements specification/.test(html) && (html.match(/class="btn"/g) || []).length === 8, 'the Chapter 2 stage offers eight controls: the register\'s Preview, Markdown and HTML, the specification\'s Preview, Markdown, HTML and JSON, and the project data');
assert.ok(/<li class="out-doc" data-document="quality"><b>Quality driver register<\/b><small class="out-working">Working snapshot<\/small><span class="out-links"><button type="button" class="btn" data-out-preview="\/api\/export\?chapter=2&amp;format=html&amp;view=1" data-out-title="Quality driver register">Preview<\/button><a class="btn" href="\/api\/export\?chapter=2&amp;format=md" download data-out-download="Quality driver register \(Markdown\)">Markdown<\/a><a class="btn" href="\/api\/export\?chapter=2&amp;format=html" download data-out-download="Quality driver register \(HTML\)">HTML<\/a><\/span><\/li>/.test(html), 'a register row: Preview, Markdown, HTML, nothing else');
assert.ok(/<a class="btn" href="[^"]*chapter=2&amp;document=ars&amp;format=md" download data-out-download="Architecture requirements specification \(Markdown\)">Markdown<\/a>/.test(html) && /href="[^"]*document=ars&amp;format=html" download/.test(html) && /<button type="button" class="btn" data-out-preview="[^"]*document=ars&amp;format=html&amp;view=1" data-out-title="Architecture requirements specification">Preview<\/button>/.test(html), 'Markdown and HTML download through the one mechanic; Preview opens the HTML view');
const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]).filter(h => h.includes('/api/export'));
assert.equal(new Set(hrefs).size, hrefs.length, 'each file is offered once: ' + hrefs.join(' '));
assert.equal((html.match(/<b>Project data \(JSON\)<\/b>/g) || []).length, 1, 'the whole project is named once'); assert.ok(/<p class="out-project"><b>Project data \(JSON\)<\/b><small>the whole saved project[^<]*<\/small><a class="btn" href="\/api\/export\?format=json" download data-out-download="Project data \(JSON\)">JSON<\/a><\/p>/.test(html), 'the whole project once, named for what it is, from the route without a chapter');
assert.ok(!/chapter=2&amp;format=json/.test(html), 'the register row carries no JSON of its own');
assert.ok(/Contributes to 2 documents in later chapters/.test(html) && /Component specification, one per component/.test(html) && /Offered in Chapter 5; it reads this chapter\./.test(html) && /Available now/.test(html) && /Open Chapter 5 Output/.test(html));
assert.ok(/<li class="out-doc" data-document="madr"><b>Decision records \(MADR\)<\/b>[\s\S]*<button type="button" class="btn" data-vx-madr="zip">Download decision records \(MADR\)<\/button>[\s\S]*3 files in a zip[\s\S]*the record stays the authority/.test(html3) && html3.includes(MADR_DOWNLOAD_TEXT), 'the MADR zip is a row of Chapter 3\'s list, with its words');
assert.ok(/What this chapter will produce/.test(blankHTML) && /<li class="out-doc out-waiting" data-document="requirements"><b>Requirements register<\/b><span class="out-links"><button type="button" class="btn" disabled title="Needs a requirement \(Chapter 1\)\.">Markdown<\/button><button type="button" class="btn" disabled title="Needs a requirement \(Chapter 1\)\.">HTML<\/button><\/span><small class="out-reason">Needs a requirement \(Chapter 1\)\. <a href="[^"]*chapter=1&amp;tab=work">Add or review records in Work →<\/a><\/small><\/li>/.test(blankHTML), 'a blank chapter lists its document disabled with the reason and the way to Work');
assert.ok(!/<a class="btn" href="[^"]*format=md"/.test(blankHTML) && !/Nothing can be produced yet/.test(blankHTML), 'no live register export above the reason');
assert.equal((blank5.match(/<small class="out-reason">Needs a component \(Chapter 5\)\. /g) || []).length, 2, 'Chapter 5 blank: each of its two documents says what it needs once, as its own reason (R26-O-08)'); assert.ok(!/needs a component \(Chapter 5\); Needs a component/.test(blank5), 'and never the same clause twice in one line');
assert.ok(!/<script/.test(html) && /none approves anything/.test(html) && /none approves anything/.test(blankHTML));
pass('the Output tab draws the list: Preview and a link per format for each document, each file once, the project data once, what would make each fuller, what needs later chapters; a blank chapter lists its documents disabled with the reason, once each, and no live export');

// 4b. A chapter's browser-only appendix is data the one mechanic appends (D-26-13): registered by the studio, read on demand.
registerOutputAppendix(4, () => ({markdown: '\n## Architect’s note (this browser)\n\nA note\n', json: {architectNote: 'A note', chapter: 4}}));
assert.deepEqual(outputAppendix(4).json, {architectNote: 'A note', chapter: 4}); assert.equal(outputAppendix(7), null, 'a chapter without an appendix appends nothing');
registerOutputAppendix(4, () => { throw Error('broken'); }); assert.equal(outputAppendix(4), null, 'a failing provider appends nothing and breaks no download');
pass('a chapter registers its browser-only appendix as data; a chapter without one, or a failing one, appends nothing');

assert.equal(JSON.stringify(project), before); assert.equal(JSON.stringify(blank), blankBefore);
pass('reading the stage changes nothing in the project');

// 5b. The chapter's own records on its Output (D-26-13, R26-O-03, R26-O-11): chapterRecordSet's records, one read-only row
// each with one action, "Open in Work"; the per-record formats where a record has a document of its own (Chapter 5);
// Chapter 4's implementation links as a second section the studio registers; a page of 50 and the next page on request.
{
  const {chapterRecordSet} = await import('./public/chapter-records.js');
  const {reviewSourceUrl} = await import('./public/review-domain.js');
  const {recordListHTML, recordRowsHTML, outputRecords, registerOutputRecords, RECORD_PAGE} = await import('./public/output-documents.js');
  const rowsOf = html => [...html.matchAll(/<li class="out-record" data-record="([^"]+)" data-type="([^"]+)">([\s\S]*?)<\/li>/g)].map(m => ({id: m[1], type: m[2], html: m[3]}));
  for (let ch = 1; ch <= 10; ch++) {
    const set = chapterRecordSet(project, ch), html = recordListHTML(project, ch), rows = rowsOf(html);
    assert.equal(rows.length, Math.min(set.total, RECORD_PAGE), 'Chapter ' + ch + ': one row per record of the chapter\'s own set (' + set.total + ')');
    assert.deepEqual(rows.map(r => r.id), outputRecords(project, ch).slice(0, RECORD_PAGE).map(r => r.id), 'Chapter ' + ch + ': the rows in the list\'s order');
    for (const r of rows) {
      const opens = [...r.html.matchAll(/<a class="btn out-record-open" data-out-work="([^"]+)" href="([^"]+)">Open in Work<\/a>/g)];
      assert.ok(opens.length === 1 && opens[0][1] === r.id && opens[0][2] === reviewSourceUrl(ch, r.id, 'work').replace(/&/g, '&amp;'), 'Chapter ' + ch + ' ' + r.id + ': one Open in Work link to the source record');
      assert.ok(!/data-select=|data-[a-z]+-select=|data-[a-z]+-action=|data-[a-z]+-edit=|<button(?![^>]*data-out-(?:preview|inspect))/.test(r.html), 'Chapter ' + ch + ' ' + r.id + ': no native editing or unintended navigation control on the row');
      assert.equal((r.html.match(/data-out-inspect=/g)||[]).length,1,'One local Inspect action per source record');
      assert.ok(r.html.includes('data-out-inspect="'+r.id+'" data-out-chapter="'+ch+'"'),'Inspect names the canonical source owner');
      assert.ok(/<span class="out-record-ref">[^<]+<\/span><b class="out-record-title">/.test(r.html), 'Chapter ' + ch + ' ' + r.id + ': reference and title');
    }
    assert.ok(html.includes('<p class="out-records-count">' + set.label({detail: true})) && !/Show \d+ more/.test(html), 'Chapter ' + ch + ': the one count (D-26-09), no pager under a page');
    assert.ok(/Inspect reads the saved record here\. Open in Work takes you to its editing chapter\./.test(html));
  }
  const five = rowsOf(recordListHTML(project, 5));
  assert.ok(five.length === 5 && five.every(r => new RegExp('data-out-preview="/api/export\\?chapter=5&amp;document=spec&amp;id=' + r.id + '&amp;format=html&amp;view=1" data-out-title="Component specification [A-Z]+-\\d+">Preview</button>').test(r.html) && ['md', 'html', 'json'].every(f => r.html.includes('href="/api/export?chapter=5&amp;document=spec&amp;id=' + r.id + '&amp;format=' + f + '" download'))), 'Chapter 5: a component row offers its own specification as Preview, Markdown, HTML and JSON');
  assert.ok(five.every(r => (r.html.match(/ download data-out-download="Component specification [A-Z]+-\d+ \((Markdown|HTML|JSON)\)"/g) || []).length === 3), 'Chapter 5: three downloads per component, each named');
  assert.ok(rowsOf(recordListHTML(project, 3)).every(r => !/data-out-preview|data-out-download/.test(r.html)), 'Chapter 3: a decision has no document of its own on its row (the MADR zip is the chapter\'s pack)');
  registerOutputRecords(4, {detail: r => r.type === 'responsibility' ? r.object?.record?.rationale || '' : undefined, sections: () => [{title: 'Implementation links', html: '<p class="out-links-row">LR-001 → APP-001</p>'}]});
  const four = recordListHTML(project, 4);
  assert.ok(/<section class="out-records-section"><h4>Implementation links<\/h4><p class="out-links-row">LR-001 → APP-001<\/p><\/section>/.test(four) && four.indexOf('out-records-section') > four.lastIndexOf('<li class="out-record"'), 'Chapter 4: the responsibilities, then their links as a second section');
  registerOutputRecords(4, null);
  const blankList = recordListHTML(blank, 4);
  assert.ok(/<p class="out-records-none">No records yet\. <a href="\/\?chapter=4&amp;tab=work">Add the first in Work →<\/a><\/p>/.test(blankList) && !rowsOf(blankList).length, 'a blank chapter says so and offers the way to Work');
  // Paging: the next page follows the first without overlap; a filter narrows the page and the head says so.
  const big = structuredClone(project); for (let i = 0; i < 60; i++) big.artefacts.push({...project.artefacts.find(a => a.type === 'requirement'), id: 'REQ-9' + String(i).padStart(2, '0'), title: 'Requirement ' + i});
  const first = rowsOf(recordListHTML(big, 1)), next = rowsOf('<ul>' + recordRowsHTML(big, 1, RECORD_PAGE) + '</ul>'), all = outputRecords(big, 1);
  assert.ok(first.length === RECORD_PAGE && next.length === Math.min(RECORD_PAGE, all.length - RECORD_PAGE) && !first.some(r => next.some(n => n.id === r.id)) && next[0].id === all[RECORD_PAGE].id, 'a page of 50, then the next page without overlap');
  assert.ok(new RegExp('<button type="button" class="btn" data-out-more="' + RECORD_PAGE + '">Show ' + Math.min(RECORD_PAGE, all.length - RECORD_PAGE) + ' more</button><small>50 of ' + all.length + ' records shown</small>').test(recordListHTML(big, 1)), 'the pager says how many follow');
  registerOutputRecords(1, {filter: r => r.type === 'requirement'});
  const filtered = recordListHTML(big, 1);
  assert.ok(rowsOf(filtered).every(r => r.type === 'requirement') && / · \d+ records shown here<\/p>/.test(filtered), 'a registered filter narrows the rows and the head says how many are shown here');
  registerOutputRecords(1, null);
  pass('every register page lists the chapter\'s own records, one read-only row each with Inspect and a separate "Open in Work" link; Chapter 5\'s rows carry the specification\'s Preview and three downloads; Chapter 4 adds its links as a second section; a blank chapter offers the way to Work; 50 rows a page, the next page without overlap; a filter narrows the page and says so');
}

// 6. The export route serves every register as the ARS and the specifications are served (D-26-13, R26-O-02, R26-O-07):
// format=html&view=1 opens the HTML view inline with the chapter's records; format=html downloads it; the first line
// after the title of every register, the ARS and a specification carries the project revision and the date; the JSON
// without a chapter is the whole saved project, named for its revision. An isolated in-memory database, one signed-in user.
{
  const [{default: worker}, {localDatabase}, {appDate}] = await Promise.all([import('./worker.js'), import('./local-db.js'), import('./public/util.js')]);
  const env = {DB: localDatabase(':memory:'), ASSETS: {fetch: () => new Response('asset')}};
  const api = path => { const headers = new Headers(); headers.set('oai-authenticated-user-id', 'architect-a'); return worker.fetch(new Request('https://aiw.test' + path, {method: 'GET', headers}), env); };
  const state = await (await api('/api/project')).json(), stamp = 'Project revision ' + state.revision + ' · ' + appDate(new Date()) + ' · a working snapshot of the saved records; nothing here is approved by being written down.';
  const seen = [];
  for (const [ch, ref, file] of [[1, 'REQ-001', 'Requirements'], [2, 'QD-001', 'Quality_Drivers'], [3, 'ADR-001', 'Decisions'], [4, 'LR-001', 'Logical_Model'], [5, 'APP-001', 'Application_Realisation'], [6, 'TC-001', 'Logical_Technology'], [7, 'TR-001', 'Technology_Realization'], [8, 'IF-001', 'Interfaces_Data'], [9, 'SEC-001', 'Security'], [10, 'RUN-001', 'Deployment_Runtime']]) {
    const view = await api('/api/export?chapter=' + ch + '&format=html&view=1'), html = await view.text();
    assert.equal(view.status, 200, 'Chapter ' + ch + ' HTML view'); assert.match(view.headers.get('Content-Type'), /text\/html/); assert.equal(view.headers.get('Content-Disposition'), 'inline; filename="AIW_Bank_Payment_Journey_' + file + '.html"');
    assert.ok(html.includes(ref) && html.includes('<p>' + stamp + '</p>') && /frame-ancestors 'self'/.test(view.headers.get('Content-Security-Policy')), 'Chapter ' + ch + ': the view holds the chapter\'s records and the stamp as its first line, and may be framed by the workbench');
    const dl = await api('/api/export?chapter=' + ch + '&format=html'); assert.equal(dl.headers.get('Content-Disposition'), 'attachment; filename="AIW_Bank_Payment_Journey_' + file + '.html"', 'Chapter ' + ch + ': HTML downloads without view=1');
    const md = await (await api('/api/export?chapter=' + ch + '&format=md')).text(), lines = md.split('\n');
    assert.ok(/^# /.test(lines[0]) && lines[1] === '' && lines[2] === stamp && md.includes(ref), 'Chapter ' + ch + ': the Markdown\'s first line after its title is the stamp');
    seen.push((html.match(/<figure class="model-figure notation-figure" id="figure-1"/g) || []).length);
  }
  assert.deepEqual(seen, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 'the HTML view draws the chapter\'s own first picture, once, in every chapter of the reference: ' + seen.join(','));
  const ars = await (await api('/api/export?chapter=2&document=ars&format=md')).text(); assert.ok(ars.startsWith('# Architecture requirements specification\n\n' + stamp + '\n'), 'the ARS carries the stamp after its title');
  const arsJSON = await (await api('/api/export?chapter=2&document=ars&format=json')).json(); assert.equal(arsJSON.projectRevision, state.revision);
  const whole = await api('/api/export?format=json'), wholeJSON = await whole.json();
  assert.equal(whole.headers.get('Content-Disposition'), 'attachment; filename="AIW_Bank_Payment_Journey_Project.json"'); assert.ok(wholeJSON.projectRevision === state.revision && wholeJSON.project?.id && wholeJSON.connectedModel?.nodes?.length > 0, 'the JSON without a chapter is the whole project with its revision and its connected model');
  const sdd = await api('/api/export?chapter=11&format=json'); assert.equal((await sdd.json()).edition, 'architecture', 'Chapter 11\'s JSON stays the SDD package');
  pass('the export route serves the ten registers as HTML views (inline, framed by the workbench, with the chapter\'s picture) and downloads, each with the project revision and the date as the first line after the title, as the ARS and the specifications are; the whole project is the JSON without a chapter');
}

console.log(JSON.stringify({passed: checks.length, checks}, null, 2));
