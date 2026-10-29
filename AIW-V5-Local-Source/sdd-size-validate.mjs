// The SDD at the size of the owner's core-banking workbook (round 12, workstream F; GR-SDD-03, GR-SDD-05, GR-SDD-06,
// GR-SDD-08; decision D-11). A synthetic project of 1,400 requirements in 60 groups and the grouped design such a
// project holds, about 5,500 records in all, generic names only (sdd-fixtures.mjs largeProject), restored on a private
// local store through /api/recovery and exported through the worker's route, as the workbench exports it:
//   1. the architecture edition is under 2 MB of Markdown without figures and its export takes under 10 s; Word, PDF
//      and HTML too; the PDF is under 150 pages;
//   2. no inline list prints more than 12 items; requirements print only through their groups (12 statements at most
//      per group, then a count), and every requirement is accounted for through its group in Appendix A;
//   3. the full register (by group, a page at a time) and the traceability matrix are annexes with every requirement;
//   4. each record prints in one place: a component, a driver, a decision, a group once; the component specifications
//      and the ARS are annexes linked from Appendix D, never printed in the body;
//   5. the chapter registers print a record's own links, then its derived trail as "N requirements via <component>"
//      with ranges compacted;
//   6. the figures keep to the node budget, each on one page with no label under 7 pt; the body keeps an overview and three
//      details a level and six containers' component diagrams, the figures annex every one; with them drawn the PDF is
//      under 150 pages;
//   7. the executive edition builds from the readers, never the architecture edition, in under 2 s (GR-SDD-27); a freeze
//      keeps the architecture edition with its figures drawn from the frozen source in one pass, in under 30 s, the same
//      bytes each time (GR-PERF-11);
//   8. the drafted synthetic design: the synthetic workbook of 1,400 rows imported through the intake with its groups and
//      drafted by Sol as the drafting job applies a draft (architecture-drafter.js); its architecture edition builds cold,
//      with its figures, in under 10 s, and says that Sol drafted its records and nobody has reviewed them (GR-PERF-14).
// The measured numbers are printed, with the retired register edition's size on the same project beside them.
// Run: npm run test:sdd-size
import assert from 'node:assert/strict';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {largeProject, pdfRead, docxRead} from './sdd-fixtures.mjs';
import {LIST_MAX} from './public/sdd-architecture.js';
import {exportSDD} from './public/review-domain.js';
import {groupIndex} from './public/requirement-groups.js';
import {FIGURE_BUDGET, PAGES} from './public/sdd-figures.js';
import {sddDocument, figuresAnnex, BODY_DETAILS, editionBuilds, figureMemo, isArchitectureEdition} from './public/sdd-document.js';
import {applyFinalReviewCommand, reviewDesignStamp} from './public/review-domain.js';
import {figureBlocks} from './public/review-documents.js';
import {BODY_CONTAINERS} from './public/sdd-c4.js';
import {makeReviewPDF} from './public/review-pdf.js';
import {withFinalReview} from './public/review-domain.js';
import {draftArchitecture, applyDraftBundle} from './public/architecture-drafter.js';
import {syntheticWorkbook} from './scripts/synthetic-workbook.mjs';

const checks = [], pass = n => { checks.push(n); console.log('PASS ' + n); }, measured = {};
const BOUNDS = {markdownBytes: 2 * 1024 * 1024, pdfPages: 150, exportMs: 10000};
const files = new Map(), env = {DB: localDatabase(':memory:'), FILES: {async put(k, v) { files.set(k, v); }, async get(k) { const v = files.get(k); return files.has(k) ? {text: async () => (typeof v === 'string' ? v : new TextDecoder().decode(v)), arrayBuffer: async () => (typeof v === 'string' ? new TextEncoder().encode(v) : new Uint8Array(v)).slice().buffer} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
const call = (path, body = null) => worker.fetch(new Request('https://aiw.test' + path, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': 'architect-a', Origin: 'https://aiw.test', ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env);
const longestList = md => md.split('\n').reduce((a, l) => { if (/^(?:- |\d+\. )/.test(l)) a.run++; else if (l.trim()) a.run = 0; a.max = Math.max(a.max, a.run); return a; }, {run: 0, max: 0}).max;
try {
  const built = await largeProject(), doc = built.document;
  measured.records = built.counts.records; measured.groups = built.counts.groups; measured.buildMs = built.ms; measured.documentBytes = JSON.stringify(doc).length;
  assert.equal(built.counts.requirements, 1400); assert.ok(built.counts.groups >= 55 && built.counts.groups <= 65, 'about 60 groups'); assert.ok(built.counts.records >= 5000, 'about 5,000 records or more: ' + built.counts.records);
  const preview = await call('/api/recovery?action=preview', {package: doc}), pv = await preview.json();
  assert.equal(preview.status, 200, JSON.stringify(pv).slice(0, 300));
  const restored = await call('/api/recovery?action=restore', {package: doc, hash: pv.hash, name: 'Synthetic large platform', reviewed: true}), rv = await restored.json();
  assert.equal(restored.status, 201, JSON.stringify(rv).slice(0, 300));
  const id = rv.id, project = (await (await call('/api/project?project=' + id)).json()).document;
  const timed = async (name, q) => { const t = performance.now(), res = await call('/api/export?project=' + id + '&chapter=11&' + q), body = Buffer.from(await res.arrayBuffer()), ms = Math.round(performance.now() - t); assert.equal(res.status, 200, name + ' ' + res.status); measured[name + 'Ms'] = ms; measured[name + 'Bytes'] = body.length; return {body, ms}; };

  // 1. Size and time, on the server path.
  const md = await timed('markdown', 'format=md&figures=none'), text = md.body.toString('utf8');
  assert.ok(md.body.length < BOUNDS.markdownBytes, 'the architecture edition without figures: ' + md.body.length + ' bytes, under 2 MB');
  for (const [name, q] of [['markdownFigures', 'format=md'], ['html', 'format=html&figures=none'], ['docx', 'format=docx&figures=none'], ['pdf', 'format=pdf&figures=none'], ['executive', 'format=md&edition=executive'], ['delivery', 'format=md&audience=delivery&figures=none'], ['review', 'format=md&audience=review']]) {
    const r = await timed(name, q); assert.ok(r.ms < BOUNDS.exportMs, name + ' export in ' + r.ms + ' ms, under 10 s');
    if (name === 'pdf') { const D = pdfRead(r.body); measured.pdfPages = D.pages.length; assert.ok(D.pages.length < BOUNDS.pdfPages, 'the PDF: ' + D.pages.length + ' pages, under 150'); assert.ok(D.outline.length > 40, 'with its outline'); }
    if (name === 'docx') { const W = docxRead(r.body); assert.ok(W.paragraphs.some(x => x.style === 'Heading1') && W.footers.length, 'Word with its headings and footers'); }
  }
  assert.ok(md.ms < BOUNDS.exportMs, 'the Markdown export in ' + md.ms + ' ms, under 10 s');
  measured.registersBytes = Buffer.byteLength(exportSDD(project));
  pass('on ' + measured.records + ' records (1,400 requirements in ' + measured.groups + ' groups) the architecture edition is ' + (md.body.length / 1024).toFixed(0) + ' KB of Markdown without figures (the retired register edition: ' + (measured.registersBytes / 1024 / 1024).toFixed(1) + ' MB), the PDF ' + measured.pdfPages + ' pages; every export within 10 s on the server path (Markdown ' + md.ms + ' ms, with figures ' + measured.markdownFiguresMs + ' ms, HTML ' + measured.htmlMs + ' ms, Word ' + measured.docxMs + ' ms, PDF ' + measured.pdfMs + ' ms)');

  // 2. Lists, and requirements through their groups.
  {
    for (const [name, m] of [['architecture', text], ['delivery', (await (await call('/api/export?project=' + id + '&chapter=11&format=md&audience=delivery&figures=none')).text())], ['review', (await (await call('/api/export?project=' + id + '&chapter=11&format=md&audience=review')).text())], ['executive', (await (await call('/api/export?project=' + id + '&chapter=11&format=md&edition=executive')).text())]])
      assert.ok(longestList(m) <= LIST_MAX, name + ': no inline list longer than ' + LIST_MAX + ' (' + longestList(m) + ')');
    const A = text.slice(text.indexOf('\n## A. Requirements analysis and component mapping\n'), text.indexOf('\n## B. Open items\n')), G = groupIndex(project);
    const printed = [...A.matchAll(/^### (RG-\d{3}) · .+ \((\d[\d,]*) requirements?/gm)];
    assert.equal(printed.length, project.requirementGroups.records.length, 'every group in Appendix A');
    for (const [, gid, n] of printed) assert.equal(Number(n.replace(/,/g, '')), (G.members.get(gid) || []).length, gid + ': its count');
    const inGroups = new Set(printed.flatMap(([, gid]) => G.members.get(gid) || [])), loose = project.artefacts.filter(a => a.type === 'requirement' && !inGroups.has(a.id));
    assert.match(A, new RegExp('^1,400 requirements in scope: ' + (1400 - loose.length).toLocaleString('en-GB') + ' in at least one of the ' + printed.length + ' requirement groups below and ' + loose.length + ' in none\\.', 'm'), 'every requirement accounted for through its group');
    const statements = [...A.matchAll(/^- (REQ-\d+) /gm)].map(m => m[1]), perGroup = A.split(/^### /m).slice(1).map(s => (s.match(/^- REQ-/gm) || []).length);
    assert.ok(Math.max(...perGroup) <= LIST_MAX && /And [\d,]+ more, in the requirement register by group \(Appendix D\)\./.test(A), 'twelve statements at most per group, then a count with the annex');
    const body = text.slice(0, text.indexOf('\n# 7. Appendix')), named = new Set([...body.matchAll(/\bREQ-\d{3,4}\b/g)].map(m => m[0]));
    assert.ok(named.size < 400, 'the body names ' + named.size + ' requirements of 1,400, through their groups and gaps, never the register');
    measured.longestList = longestList(text); measured.statementsInAppendixA = statements.length; measured.requirementsNamedInBody = named.size;
    pass('no inline list in any edition prints more than ' + LIST_MAX + ' items (longest ' + measured.longestList + '); Appendix A prints each of the ' + printed.length + ' groups with its count and twelve statements at most, then a count with the register; every requirement is accounted for through its group; the body names ' + named.size + ' requirements, never the whole register');
  }

  // 3. The register and the matrix are annexes with every requirement.
  {
    const get = q => call('/api/export?project=' + id + '&chapter=11&' + q);
    let total = 0, pages = 0;
    for (let page = 1; ; page++) { const m = await (await get('annex=requirements&format=md&page=' + page)).text(); pages = Number(/Page \d+ of (\d+)/.exec(m)[1]); total += (m.match(/^### REQ-/gm) || []).length; if (page >= pages) break; }
    assert.equal(total, 1400, 'the register by group, page by page, holds every requirement once'); assert.equal(pages, 14);
    const matrix = (await (await get('annex=matrix&format=csv')).text()).trim().split('\n');
    assert.equal(matrix.length, 1401, 'the traceability matrix: a row per requirement'); assert.match(matrix[0], /requirement/i);
    assert.ok(!/^REQ-\d+ · /m.test(text.slice(text.indexOf('\n# 1.'), text.indexOf('\n# 7. Appendix'))), 'no requirement register in the body');
    measured.registerPages = pages;
    pass('the requirement register is an annex of ' + pages + ' pages holding all 1,400 requirements once, by group; the traceability matrix is an annex with a row per requirement');
  }

  // 4. Each record in one place; the specifications and the ARS as annexes.
  {
    for (const c of project.realisation.components) assert.equal((text.match(new RegExp('^### ' + c.ref + ' · ', 'gm')) || []).length, 1, c.ref + ' described once');
    for (const d of project.decisions.records) assert.equal((text.match(new RegExp('^### ' + d.id + ' · ', 'gm')) || []).length, 1, d.id + ' once');
    // A driver is described once, in section 2 (section 4's quality-driver interactions name it by its code and title).
    // Format 2 (round 24, D-24-06): its description is its line, or (not stated) named on its record's marker.
    const codes = [...text.matchAll(/^\*\*([A-Z]{1,2}\d+): .*\*\*\n\n(?:<!-- aiw:open [^>]*\bdescription\b|(?:<!-- aiw:open [^>]*-->\n\n)?Description: )/gm)].map(m => m[1]);
    assert.equal(codes.length, project.quality.drivers.length, 'each driver described once'); assert.equal(new Set(codes).size, codes.length);
    for (const g of project.requirementGroups.records) assert.equal((text.match(new RegExp('^### ' + g.id + ' · ', 'gm')) || []).length, 1, g.id + ' once');
    assert.ok(!/^#+ (?:Architecture requirements specification|Component specifications?)$/m.test(text), 'the ARS and the component specifications are not printed in the body');
    assert.ok(/\| Architecture requirements specification \|/.test(text) && /\| Component specifications \|/.test(text), 'they are annexes listed in Appendix D');
    // Round 25 (D-25-07): at size too, section 3 weighs and leans; it never scores, favours or recommends.
    const s3 = text.slice(text.indexOf('\n# 3. Architecture decisions\n'), text.indexOf('\n# 4. ')), WORDS = /\bscor(?:e|ed|es|ing)\b|favou?r|\bwinner|recommend/i;
    assert.ok(s3.length > 1000 && !WORDS.test(s3), 'section 3 never scores, favours or recommends: ' + (WORDS.exec(s3) || [''])[0]);
    pass('each component, decision, driver and group prints in one place; the ARS and the component specifications are annexes listed in Appendix D, not printed in the body; section 3 never scores, favours or recommends');
  }

  // 5. The chapter registers: a record's own links, then its trail as "N requirements via <component>", ranges compacted.
  {
    for (const [chapter, label] of [[8, 'Requirements through its ends: '], [9, 'Requirements through its targets: '], [10, 'Requirements through its components: '], [7, 'Requirements through its applications: ']]) {
      const m = await (await call('/api/export?project=' + id + '&chapter=' + chapter + '&format=md')).text(), lines = m.split('\n').filter(l => l.startsWith(label));
      assert.ok(lines.length > 0, 'Chapter ' + chapter + ' prints the trail');
      for (const l of lines) {
        const ids = l.match(/\bREQ-\d+\b/g) || [];
        assert.ok(ids.length <= 72, 'Chapter ' + chapter + ': a trail line names a bounded number of ids (' + ids.length + ')');
        assert.ok(l === label + 'none' || /\d+ requirements? via [A-Z]+-\d+ \(/.test(l) || /^\S.* \d+ requirements? \(/.test(l), 'Chapter ' + chapter + ': "N requirements via <component>": ' + l.slice(0, 160));
      }
      assert.ok(lines.some(l => /REQ-\d+–REQ-\d+/.test(l)), 'Chapter ' + chapter + ': ranges compacted');
      measured['chapter' + chapter + 'Bytes'] = Buffer.byteLength(m);
    }
    pass('the chapter registers of Chapters 7 to 10 print each record’s derived trail as "N requirements via <component>" with ranges compacted, never every id');
  }

  // 6. The figures (GR-FIG-08; the lead's decision on figure heights): the C4 levels within the node budget, the body
  // keeping an overview and at most three details a level and the component diagrams of the six containers that hold the
  // most components, every figure on one page (portrait at 160 mm, else landscape at 247 mm) with no label under 7 pt;
  // the figures annex drawing every detail and every container; the PDF with every body figure drawn under 150 pages.
  {
    const doc = sddDocument(project, {figures: true}), set = doc.figures, annex = figuresAnnex(project).figures, budget = FIGURE_BUDGET;
    measured.figures = set.figures.map(f => ({key: f.key, role: f.role, elements: f.elements, mm: f.print.widthMm + 'x' + f.print.heightMm, orientation: f.print.orientation, minLabelPt: f.print.minLabelPt, budget: f.print.budget}));
    assert.deepEqual([...new Set(set.figures.filter(f => !f.key.startsWith('chapter:')).map(f => f.key.split(':')[0]))], ['context', 'container', 'component', 'deployment'], 'the four C4 levels remain intact at size');
    assert.ok(set.figures.some(f => f.key.startsWith('chapter:')), 'the saved complementary chapter models also appear at size');
    const bodyContainers = new Set(set.figures.filter(f => f.key.startsWith('component:')).map(f => f.key)), annexContainers = new Set(annex.figures.filter(f => f.key.startsWith('component:')).map(f => f.key));
    assert.equal(bodyContainers.size, BODY_CONTAINERS, 'the body draws the component diagrams of ' + BODY_CONTAINERS + ' containers'); assert.equal(annexContainers.size, 8, 'the annex draws all eight');
    assert.match(doc.markdown, /the component diagrams of the other 2 containers \(TR-\d{3}, 3 components; TR-\d{3}, 3 components\) are in the figures annex \(Appendix D\)/, 'the body names the containers the annex draws');
    for (const key of new Set(set.figures.map(f => f.key))) assert.ok(set.figures.filter(f => f.key === key && f.role === 'detail').length <= BODY_DETAILS, key + ': at most ' + BODY_DETAILS + ' details in the body');
    for (const f of [...set.figures, ...annex.figures]) {
      assert.ok(f.elements <= budget, f.key + ' (' + f.role + '): within the node budget of ' + budget + ' (' + f.elements + ')');
      assert.ok(f.print.fits && f.print.heightMm <= PAGES[f.print.orientation].heightMm && f.print.widthMm === PAGES[f.print.orientation].widthMm, f.key + ': fits one ' + f.print.orientation + ' page (' + f.print.widthMm + ' × ' + f.print.heightMm + ' mm)');
      assert.ok(f.print.minLabelPt >= 7, f.key + ': no label under 7 pt (' + f.print.minLabelPt + ')');
      // The footer's lines, joined: a footer wraps at the figure's width.
      const footer = [...f.svg.matchAll(/class="nt-foot">([^<]*)</g)].map(m => m[1]).join(' ').replace(/\s+/g, ' ');
      if (f.print.budget < budget) assert.ok(footer.includes('drawn within a budget of ' + f.print.budget + ' elements'), f.key + ': the footer records the budget it was drawn within: ' + footer.slice(-160));
    }
    assert.ok(annex.figures.length >= set.figures.length, 'the annex holds every figure of the body and the rest');
    // The PDF with every body figure drawn at its print size (a stand-in image of each figure's proportions).
    const jpeg = Uint8Array.from(Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64'));
    const drawn = new Map(set.figures.map(f => [f.n, {type: 'image/jpeg', width: f.print.widthPx, height: f.print.heightPx, pixelWidth: f.print.widthPx, pixelHeight: f.print.heightPx, data: jpeg}]));
    const P = pdfRead(makeReviewPDF(doc.markdown, 'Synthetic large platform Solution Design', {figures: drawn}));
    measured.pdfPagesWithFigures = P.pages.length; measured.bodyDetails = doc.details;
    assert.ok(P.pages.length < BOUNDS.pdfPages, 'the PDF with its figures drawn: ' + P.pages.length + ' pages, under 150');
    assert.equal(doc.pages, P.pages.length, 'the edition counts the pages its PDF takes');
    pass('section 5 at size: the context, the container view (folded within ' + set.levels.find(l => l.key === 'container').budget + ' elements to fit a page), the component diagrams of ' + BODY_CONTAINERS + ' containers (the annex draws all 8) and the deployment; every figure within the budget of ' + budget + ', on one page, no label under 7 pt (smallest ' + Math.min(...set.figures.map(f => f.print.minLabelPt)) + ' pt); at most ' + BODY_DETAILS + ' details a level in the body; the PDF with its ' + set.figures.length + ' figures drawn is ' + P.pages.length + ' pages');
  }
  // 7. The executive edition from the readers (GR-SDD-27), and the freeze in one pass (GR-PERF-11).
  {
    // A clone alone still has the content-addressed figure key drawn by the
    // executive server export above. Give this synthetic probe a unique identity
    // so the cold budget includes constructing its context figure.
    const cold = {...structuredClone(project), id: project.id + '-cold-executive'}, builds = {...editionBuilds}, figs = {...figureMemo}, t0 = performance.now(), ex = sddDocument(cold, {edition: 'executive'}), exMs = Math.round(performance.now() - t0);
    measured.executiveColdMs = exMs;
    assert.ok(ex.markdown.includes('## Risks and open items') && exMs < 2000, 'the executive edition, built cold, in ' + exMs + ' ms, under 2 s');
    assert.deepEqual([editionBuilds.architecture, editionBuilds.executive, figureMemo.drawn, figureMemo.reused], [builds.architecture, builds.executive + 1, figs.drawn + 1, figs.reused], 'it builds no architecture edition and draws only the bounded executive context set');
    // The fixture was restored above: its source review is historical. Record this synthetic check on the restored
    // workbench with a signed-in actor and a time after the restore before testing the freeze's figure budget.
    const at = new Date(Math.max(Date.now(), Date.parse(project.workspace.restoredAt) + 1)).toISOString(), actor = 'architect-a', freeze = () => { const q = applyFinalReviewCommand(structuredClone(project), {type: 'review.checks', payload: {}}, at, actor).document, t = performance.now(), r = applyFinalReviewCommand(q, {type: 'review.baseline', payload: {stamp: reviewDesignStamp(q), title: 'Frozen at size', reviewed: true}}, at, actor); return {b: r.document.finalReview.baselines.at(-1), ms: Math.round(performance.now() - t)}; };
    const one = freeze(), two = freeze();
    measured.freezeMs = [one.ms, two.ms]; measured.frozenBytes = Buffer.byteLength(one.b.markdown);
    assert.ok(isArchitectureEdition(one.b.markdown) && figureBlocks(one.b.markdown).length > 0, 'a freeze keeps the architecture edition with its figures');
    assert.ok(one.ms < 30000 && two.ms < 30000, 'the freeze at size in ' + one.ms + ' and ' + two.ms + ' ms, under 30 s');
    assert.equal(two.b.markdown, one.b.markdown, 'the same bytes each time');
    pass('the executive edition builds from the readers in ' + exMs + ' ms cold (no architecture edition built, only the context figure set drawn); a freeze of the large project keeps the architecture edition with its ' + figureBlocks(one.b.markdown).length + ' figures (' + (measured.frozenBytes / 1024).toFixed(0) + ' KB) in ' + one.ms + ' ms, the same bytes the second time (' + two.ms + ' ms)');
  }
  // 8. The drafted synthetic design (GR-PERF-14): imported through the intake with its domain and capability-theme groups,
  // drafted and applied as the drafting job applies a draft, its architecture edition built cold with its figures.
  {
    const made = await call('/api/projects', {name: 'Synthetic drafted platform', template: 'blank'}), pid = (await made.json()).document.id, {bytes, manifest} = syntheticWorkbook({rows: 1400});
    const intake = async (action, body, raw = null) => { const res = await worker.fetch(new Request('https://aiw.test/api/intake?action=' + action + '&project=' + pid + (raw ? '&filename=Synthetic.xlsx' : ''), {method: 'POST', headers: {'oai-authenticated-user-id': 'architect-a', Origin: 'https://aiw.test', ...(raw ? {} : {'Content-Type': 'application/json'})}, body: raw || JSON.stringify(body)}), env); return {status: res.status, body: await res.json()}; };
    const up = (await intake('upload', null, bytes)).body, ins = (await intake('inspect', {uploadId: up.id, sheet: manifest.sheet})).body;
    const input = {uploadId: up.id, sheet: ins.sheet, headerRow: ins.headerRow, mapping: ins.mapping, priorityMap: ins.bands.map, groups: {domain: true, capabilityTheme: true}};
    const pre = (await intake('preview', input)).body, applied = await intake('apply', {...input, revision: pre.projectRevision, previewStamp: pre.stamp, reviewed: true});
    assert.equal(applied.status, 200, JSON.stringify(applied.body).slice(0, 300));
    const imported = withFinalReview(applied.body.document), draft = draftArchitecture(imported), drafted = applyDraftBundle(imported, draft, {at: '2026-10-08T10:00:00.000Z', actor: 'architect-a', jobId: 'sdd-size'}).document;
    assert.equal(drafted.artefacts.filter(a => a.type === 'requirement').length, 1400);
    const t0 = performance.now(), dd = sddDocument(drafted), ms = Math.round(performance.now() - t0);
    Object.assign(measured, {draftedRecords: dd.provenance.total, draftedSol: dd.provenance.by.sol, draftedArchitectureColdMs: ms, draftedArchitectureBytes: Buffer.byteLength(dd.markdown), draftedPdfPages: dd.pages});
    assert.ok(ms < BOUNDS.exportMs, 'the architecture edition of the drafted design, with its figures, built cold in ' + ms + ' ms, under 10 s');
    assert.ok(figureBlocks(dd.markdown).length > 0 && dd.pages < BOUNDS.pdfPages, 'with its figures, in ' + dd.pages + ' PDF pages, under 150');
    assert.ok(dd.provenance.by.sol >= draft.counts.records && dd.provenance.by.proposal === 0, 'every record the draft made reads as drafted by Sol (' + dd.provenance.by.sol + '), none as AIW’s seeded proposals');
    assert.match(dd.markdown, /^Provenance: [^\n]*; [\d,]+ records drafted by Sol, not reviewed by a person; none confirmed by a person\./m, 'and the document says that nobody has reviewed them');
    assert.ok(dd.markdown.includes('\n- Chapter 11 · Review & realize: '), 'the change summary names the delivery plan’s chapter by its title');
    // One label per open field (round 24, D-24-06): each record field Appendix B lists stands under one cause, and a
    // field of one kind under one label, the batch contracts past the chain table's twelve among them.
    const fieldOf = new Map(), labelOf = new Map();
    for (const c of dd.openItems.causes) for (const f of c.fields) {
      const kf = c.chapter + '|' + c.kind + '|' + f + '|' + c.state;
      if (c.fields.length === 1) { assert.ok(!labelOf.has(kf) || labelOf.get(kf) === c.cause, c.kind + ' ' + f + ' under two labels: ' + labelOf.get(kf) + ' and ' + c.cause); labelOf.set(kf, c.cause); }
      for (const r of c.records) { const k = c.chapter + '|' + r + '|' + f; assert.ok(!fieldOf.has(k), r + ' ' + f + ' under two causes: ' + fieldOf.get(k) + ' and ' + c.cause); fieldOf.set(k, c.cause); }
    }
    assert.equal(dd.openItems.total, dd.openItems.causes.reduce((n, c) => n + c.count, 0));
    measured.draftedOpenItems = dd.openItems.total; measured.draftedOpenFields = fieldOf.size;
    pass('the drafted synthetic design (' + dd.provenance.total + ' records, ' + dd.provenance.by.sol + ' of them drafted by Sol and not reviewed) builds its architecture edition cold, with its figures, in ' + ms + ' ms (' + (measured.draftedArchitectureBytes / 1024).toFixed(0) + ' KB, ' + dd.pages + ' PDF pages), and says who drafted it');
  }
} finally { env.DB.close(); }
console.log(JSON.stringify({passed: checks.length, bounds: BOUNDS, measured}));
