// The SDD in Word and PDF, built on the server (round 12, workstream F; GR-SDD-07, GR-SDD-08, GR-SDD-10; SDD-SPEC
// formats). The synthetic project of sdd-fixtures.mjs is restored on a private local store through /api/recovery and
// exported through the worker's route, as the workbench exports it; the files are read back independently of their
// writers (sdd-fixtures.mjs docxRead and pdfRead: the zip and word/document.xml; the PDF's objects, its ToUnicode map,
// pages and outline). Checked:
//   1. Word: a contents field with each section's page, real heading styles at the Markdown's levels (to Heading 6),
//      a bookmark per heading, a footer with the page number field, a landscape section holding the component table,
//      the figures embedded as vector images on the server (figures=none embeds none);
//   2. PDF: a contents page with page numbers and links, an outline (bookmarks) nested by heading level, "Page n of N"
//      in every footer but the cover's, the component table on landscape pages, the figures named where they stand;
//      a figure that fits only a landscape page (the lead's decision on figure heights) on a landscape page of its own,
//      in PDF and in Word, and one that fits a portrait page at 7 pt or more on a portrait page (measured from its SVG);
//   3. every edition and audience, in Word and in PDF, carries the provenance statement whole;
//   4. the route: Markdown, HTML, JSON (structure and figures; the project only when asked), Word and PDF for every
//      edition and audience, figures=none, the annexes (requirement register by page, matrix, specifications,
//      registers; the figures annex in Markdown, HTML, PDF and as SVG files with their manifest in a zip), a frozen
//      baseline only as frozen, files named after the project.
// Run: npm run test:sdd-formats
import assert from 'node:assert/strict';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {createHash} from 'node:crypto';
import {richProject, docxRead, pdfRead, unzip} from './sdd-fixtures.mjs';
import {provenanceReading, unescapeMd} from './public/sdd-architecture.js';
import {makeReviewDOCX, vectorFigures} from './public/review-documents.js';
import {makeReviewPDF} from './public/review-pdf.js';
import {figureLabels, PAGES, PRINT} from './public/sdd-figures.js';
import {reviewDesignStamp} from './public/review-domain.js';
import {freezeBaseline} from './scripts/freeze-baseline.mjs';

const checks = [], pass = n => { checks.push(n); console.log('PASS ' + n); };
const files = new Map(), env = {DB: localDatabase(':memory:'), FILES: {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k), arrayBuffer: async () => new TextEncoder().encode(files.get(k)).buffer} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
const call = (path, body = null) => worker.fetch(new Request('https://aiw.test' + path, {method: body ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': 'architect-a', Origin: 'https://aiw.test', ...(body ? {'Content-Type': 'application/json'} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env);
const flat = s => String(s).replace(/\s+/g, '');
// Round 25 (D-25-07): the decision reading as the Markdown prints it, which Word and PDF carry: the drivers' lean of an open
// decision (the rich project's ADR-003), the trade-off analysis's standing of a dominated alternative, the executive
// edition's lean beside the choice.
const LEAN = 'The drivers lean to ALT-005 · Enquire and reconcile before replay (AIW’s reading of the recorded effects at the default weights; not a choice).', DOMINATED = '| −8 | QD1 −, QD4 −, QD6 − | 2 of 2; dominated by ALT-005 |', EXECUTIVE_LEAN = 'open; the drivers lean to ALT-005';
const cellText = row => row.replace(/^\| /, '').replace(/ \|$/, '').split(' | ').join(' ');
try {
  const {document: rich} = await richProject();
  const preview = await call('/api/recovery?action=preview', {package: rich}), pv = await preview.json();
  assert.equal(preview.status, 200, JSON.stringify(pv).slice(0, 300));
  const restored = await call('/api/recovery?action=restore', {package: rich, hash: pv.hash, name: 'Synthetic core platform', reviewed: true}), rv = await restored.json();
  assert.equal(restored.status, 201, JSON.stringify(rv).slice(0, 300));
  const id = rv.id, project = (await (await call('/api/project?project=' + id)).json()).document;
  const get = q => call('/api/export?project=' + id + '&chapter=11&' + q);
  const bytes = async res => Buffer.from(await res.arrayBuffer());
  const md = await (await get('format=md')).text(), P = provenanceReading(project), statement = 'Provenance: ' + P.line + ' ' + P.detail;
  const mdHeads = md.split('\n').map(l => /^(#{1,6}) (.+)$/.exec(l)).filter(Boolean).slice(1).map(m => ({level: m[1].length, text: unescapeMd(m[2]).replace(/\*\*/g, '')}));

  // 1. Word, as the server builds it.
  {
    const res = await get('format=docx');
    assert.equal(res.status, 200); assert.match(res.headers.get('Content-Type'), /wordprocessingml/); assert.match(res.headers.get('Content-Disposition'), /^attachment; filename="AIW_Synthetic_core_platform_Working_SDD\.docx"$/);
    const W = docxRead(await bytes(res));
    assert.match(W.xml, /<w:instrText[^>]*>\s*TOC \\h \\o &quot;1-2&quot;<\/w:instrText>/, 'a real contents field (TOC, levels 1 and 2, linked)');
    const toc = W.paragraphs.filter(x => /^TOC\d$/.test(x.style));
    assert.ok(toc.length >= 40 && toc.every(x => /\d+$/.test(x.text)), 'each contents entry with its page number, until Word refreshes the field');
    assert.match(W.settings, /<w:updateFields(?: w:val="(?:true|1|on)")?\/>/, 'Word refreshes the fields on opening');
    const styled = W.paragraphs.filter(x => /^Heading\d$/.test(x.style)).map(x => ({level: Number(x.style.slice(7)), text: x.text}));
    assert.deepEqual(styled.map(x => x.level + ' ' + x.text), mdHeads.map(x => x.level + ' ' + x.text), 'every heading in Word at its Markdown level, in order');
    assert.ok(new Set(styled.map(x => x.level)).size >= 3, 'three heading levels at least');
    const marks = [...W.xml.matchAll(/<w:bookmarkStart w:name="([^"]+)" w:id="(\d+)"\/>/g)];
    assert.ok(marks.length >= styled.length && new Set(marks.map(m => m[2])).size === marks.length && new Set(marks.map(m => m[1])).size === marks.length, 'a bookmark per heading, each with its own name and id');
    assert.ok(W.footers.length && W.footers.some(f => /<w:instrText[^>]*>\s*PAGE\s*</.test(f) && /NUMPAGES/.test(f)), 'a footer with the page and the number of pages');
    const table = W.xml.indexOf('Architectural solution'), before = W.xml.lastIndexOf('<w:sectPr', table), after = W.xml.indexOf('<w:sectPr', table);
    assert.ok(table > 0 && after > table && /w:orient="landscape"/.test(W.xml.slice(after, W.xml.indexOf('</w:sectPr>', after))) && !/w:orient="landscape"/.test(W.xml.slice(before, W.xml.indexOf('</w:sectPr>', before))), 'the component table in a landscape section of its own');
    // rc39: the decisions figure prints landscape too (sdd-document.js, print.orientation), in a section of its own. rc39 pinned
    // the drivers figure there as well (drawn as a tree, it fitted only a landscape page); rc41 (W1 step 4, sdd-figures.js
    // printStage) shapes it as on the screen at the portrait page's width, its own layered rows cut to the page, and it stands on
    // one portrait page, so it prints portrait (a figure goes to a landscape page only when it fits no portrait one).
    assert.equal(count(W.xml, /w:orient="landscape"/g), 2, 'two landscape sections: the component table and the decisions figure');
    assert.deepEqual(md.split('<!-- aiw:landscape -->').slice(1).map(x => /^\n\| Component \|/.test(x) ? 'component table' : /^\n<figure id="figure-\d+" data-scene="([a-z]+)"/.exec(x)?.[1]), ['component table', 'decisions'], 'and the Markdown marks the same two');
    // The drivers figure printed portrait fits the portrait page, measured from its SVG as the export carries it (figureIn):
    // outside every landscape block, within the portrait page's width (680 px: every word at 7 pt or more at the 160 mm text
    // width) and at most 247 mm high there; in Word, in a portrait section, drawn at least 160 mm wide and within the
    // section's text height.
    const drivers = figureIn(md, 'drivers'), decisions = figureIn(md, 'decisions'), upTo = md.slice(0, drivers?.at);
    assert.ok(drivers && decisions && count(upTo, /<!-- aiw:landscape -->/g) === count(upTo, /<!-- aiw:\/landscape -->/g) && drivers.widthPx <= PAGES.portrait.width && drivers.minPt >= PRINT.minPt && drivers.heightMm <= PAGES.portrait.heightMm, 'the drivers figure fits the portrait page: ' + JSON.stringify(drivers));
    const sectionOf = n => { const pic = [...W.xml.matchAll(/<w:drawing>[\s\S]*?<\/w:drawing>/g)].find(m => m[0].includes('name="Figure ' + n + '"')); return pic && {pic: pic[0], sect: [...W.xml.matchAll(/<w:sectPr[\s\S]*?<\/w:sectPr>/g)].find(s => s.index > pic.index)?.[0] || ''}; };
    const dw = sectionOf(drivers.n), ext = /<wp:extent cx="(\d+)" cy="(\d+)"/.exec(dw?.pic || ''), pg = /<w:pgSz w:w="(\d+)" w:h="(\d+)"/.exec(dw?.sect || ''), mar = /<w:pgMar w:top="(\d+)" w:right="\d+" w:bottom="(\d+)"/.exec(dw?.sect || '');
    assert.ok(ext && pg && mar && !/w:orient="landscape"/.test(dw.sect) && Number(ext[1]) >= 160 * 36000 && Number(ext[2]) <= (Number(pg[2]) - Number(mar[1]) - Number(mar[2])) * 635, 'Word: the drivers figure in a portrait section, at least 160 mm wide and within the text height');
    assert.ok(/w:orient="landscape"/.test(sectionOf(decisions.n)?.sect || ''), 'Word: the decisions figure in a landscape section');
    assert.ok(flat(W.text).includes(flat(statement)), 'the provenance statement whole');
    assert.ok(md.includes(LEAN) && md.includes(DOMINATED) && flat(W.text).includes(flat(LEAN)) && flat(W.text).includes(flat(cellText(DOMINATED))), 'the drivers’ lean and the trade-off standings, as the Markdown prints them');
    const svgs = W.names.filter(n => /^word\/media\/.+\.svg$/.test(n));
    assert.equal(svgs.length, (md.match(/<figure id="figure-\d+"/g) || []).length, 'the server embeds each figure as a vector image');
    const none = docxRead(await bytes(await get('format=docx&figures=none')));
    assert.equal(none.names.filter(n => /^word\/media\/.+\.(svg|png)$/.test(n)).length, 0, 'figures=none embeds none');
    // Word keeps every heading level to 6, from any Markdown.
    const deep = docxRead(await makeReviewDOCX('<!-- aiw:cover -->\n# T\n<!-- aiw:/cover -->\n\n# A\n\n## B\n\n### C\n\n#### D\n\n##### E\n\n###### F\n\nText.\n', 'Levels'));
    assert.deepEqual(deep.paragraphs.filter(x => /^Heading\d$/.test(x.style)).map(x => x.style), ['Heading1', 'Heading2', 'Heading3', 'Heading4', 'Heading5', 'Heading6'], 'Word uses heading levels 1 to 6');
    pass('Word, built on the server: a contents field with ' + toc.length + ' entries and their pages, ' + styled.length + ' headings in Heading styles at their Markdown levels (to Heading 6) with bookmarks, a footer with PAGE and NUMPAGES, the component table and the decisions figure each in its own landscape section, the drivers figure on a portrait page (' + drivers.minPt + ' pt at least, ' + drivers.heightMm + ' mm high at 160 mm), the provenance statement whole, ' + svgs.length + ' figures as vector images (none with figures=none)');
  }

  // 2. PDF, as the server builds it.
  {
    const res = await get('format=pdf');
    assert.equal(res.status, 200); assert.equal(res.headers.get('Content-Type'), 'application/pdf'); assert.match(res.headers.get('Content-Disposition'), /filename="AIW_Synthetic_core_platform_Working_SDD\.pdf"$/);
    const D = pdfRead(await bytes(res)), N = D.pages.length;
    assert.match(D.catalog, /\/PageMode \/UseOutlines/, 'opens with its bookmarks');
    // The contents over its pages (format 2, round 24: sections 1 to 4 each end with their open questions, a subsection
    // the contents lists, so the rich project's contents takes two pages): each section with its page.
    const first = D.pages.findIndex(x => /^Contents /.test(x.text)); let last = first + 1;
    while (first >= 0 && last < D.pages.length && /^\S.*? \.{5,} \d+ /.test(D.pages[last].text)) last++;
    const contents = first < 0 ? null : {text: D.pages.slice(first, last).map(x => x.text).join(' ')};
    assert.ok(contents && /1\. Introduction: Synthetic core platform \.+ \d+/.test(contents.text) && /7\. Appendix \.+ \d+/.test(contents.text), 'a contents page: each section with its page');
    const pageOf = t => { const m = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\.+ (\\d+)').exec(contents.text); return m ? Number(m[1]) : null; };
    const intro = pageOf('1. Introduction: Synthetic core platform');
    assert.ok(intro && D.pages[intro - 1].text.startsWith('1. Introduction: Synthetic core platform'), 'the page the contents gives is where the section starts');
    assert.ok(D.links >= 40, 'the contents entries link to their sections');
    const tops = D.outline.filter(o => o.level === 1).map(o => o.title);
    for (const t of ['1. Introduction: Synthetic core platform', '2. Architectural drivers', '3. Architecture decisions', '5. Architecture models', '7. Appendix']) assert.ok(tops.includes(t), 'outline: ' + t);
    assert.ok(D.outline.some(o => o.level === 2 && o.title === 'Decision log') && D.outline.some(o => o.level === 3 && /^ADR-001 · /.test(o.title)), 'the outline nests subsections and their records (levels 2 and 3)');
    D.pages.forEach((x, i) => { if (i) assert.ok(x.text.endsWith('Page ' + (i + 1) + ' of ' + N), 'page ' + (i + 1) + ' numbered in its footer'); });
    assert.ok(!/Page 1 of/.test(D.pages[0].text), 'the cover is not numbered');
    const land = D.pages.filter(x => x.w > x.h);
    assert.ok(land.length >= 1 && land[0].text.startsWith('Component Responsibilities Properties Technologies Interfaces Dependencies Architectural solution Architectural drivers'), 'the component table on landscape pages');
    assert.ok(flat(D.text).includes(flat(statement)), 'the provenance statement whole');
    assert.ok(flat(D.text).includes(flat(LEAN)) && flat(D.text).includes(flat(cellText(DOMINATED))), 'the drivers’ lean and the trade-off standings, as the Markdown prints them');
    assert.match(D.text, /Figure 1 · Chapter 1 · Context/, 'a figure the server does not draw is named where it stands');
    // (rc41, as in Word: the drivers figure on a portrait page, the decisions figure on a landscape one)
    const namedOn = n => D.pages.filter(x => x.text.includes('Figure ' + n + ' · Chapter ')), dp = namedOn(figureIn(md, 'drivers')?.n), cp = namedOn(figureIn(md, 'decisions')?.n);
    assert.ok(dp.length && dp.every(x => x.w < x.h) && cp.length && cp.every(x => x.w > x.h), 'PDF: the drivers figure named on a portrait page, the decisions figure on a landscape page');
    // A figure set for a landscape page (sdd-figures.js diagramFigures with fit; sdd-architecture.js models): on a landscape
    // page of its own in PDF, at the landscape text width, and in a landscape section of its own in Word, the text after
    // it back on portrait pages.
    const wide = '<!-- aiw:cover -->\n# Wide\n<!-- aiw:/cover -->\n\n# A\n\nBefore the figure.\n\n<!-- aiw:landscape -->\n<figure id="figure-1" data-scene="x" data-sha256="0000000000000000000000000000000000000000000000000000000000000000">\n<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="600" viewBox="0 0 1040 600"><rect width="1040" height="600" fill="#fff"/></svg>\n<figcaption>Figure 1 · Chapter 5 · A wide figure · figures/wide.svg</figcaption>\n</figure>\n<!-- aiw:/landscape -->\n\n# B\n\nAfter the figure.\n';
    const jpeg = Uint8Array.from(Buffer.from('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=', 'base64'));
    const widePdf = makeReviewPDF(wide, 'Wide', {figures: new Map([[1, {type: 'image/jpeg', width: 1040, height: 600, pixelWidth: 1040, pixelHeight: 600, data: jpeg}]])}), WP = pdfRead(widePdf), raw = Buffer.from(widePdf).toString('latin1');
    const at = WP.pages.findIndex(x => x.text.includes('Figure 1 · Chapter 5 · A wide figure'));
    const drawnAt = /q ([\d.]+) 0 0 ([\d.]+) [\d.]+ [\d.]+ cm \/Im1 Do Q/.exec(raw);
    assert.ok(at > 0 && WP.pages[at].w > WP.pages[at].h && WP.pages[at - 1].w < WP.pages[at - 1].h && WP.pages[at + 1]?.w < WP.pages[at + 1]?.h && WP.pages[at + 1].text.startsWith('B'), 'PDF: the figure on a landscape page of its own, the text after it on a portrait page');
    assert.ok(drawnAt && Number(drawnAt[1]) > 595 - 2 * 56, 'PDF: drawn wider than the portrait text width (' + (drawnAt && drawnAt[1]) + ' pt)');
    const WW = docxRead(await makeReviewDOCX(wide, 'Wide', {figures: vectorFigures(wide)})), sects = [...WW.xml.matchAll(/<w:sectPr[\s\S]*?<\/w:sectPr>/g)];
    const pic = WW.xml.indexOf('<w:drawing>'), own = sects.find(m => m.index > pic);
    assert.ok(pic > 0 && own && /w:orient="landscape"/.test(own[0]) && !/w:orient="landscape"/.test(sects.at(-1)[0]), 'Word: the figure in a landscape section of its own, the document ending on portrait pages');
    pass('PDF, built on the server: ' + N + ' A4 pages, a contents page with each section’s page (the page it gives is where the section starts) and ' + D.links + ' links, an outline of ' + D.outline.length + ' bookmarks nested to level 3, "Page n of N" in every footer but the cover’s, the component table on ' + land.length + ' landscape page(s), the provenance statement whole and the figures named where they stand; a figure set for a landscape page on one of its own (PDF) and in a landscape section of its own (Word)');
  }

  // 3. Every edition and audience, in Word and in PDF, says who wrote its content, whole.
  {
    for (const edition of ['architecture', 'executive']) for (const audience of ['all', 'delivery', 'review']) {
      const q = 'edition=' + edition + '&audience=' + audience;
      const W = docxRead(await bytes(await get('format=docx&' + q))), D = pdfRead(await bytes(await get('format=pdf&' + q)));
      assert.ok(flat(W.text).includes(flat(statement)), edition + '/' + audience + ': Word carries the provenance statement whole');
      assert.ok(flat(D.text).includes(flat(statement)), edition + '/' + audience + ': PDF carries the provenance statement whole');
      assert.ok(D.outline.length > 3 && W.paragraphs.some(x => /^Heading[12]$/.test(x.style)), edition + '/' + audience + ': with its headings');
      if (edition === 'executive') assert.ok(D.pages.length <= 4, 'the executive edition is short: ' + D.pages.length + ' pages');
      if (audience !== 'delivery') assert.ok(flat(W.text).includes(flat(edition === 'executive' ? EXECUTIVE_LEAN : LEAN)) && flat(D.text).includes(flat(edition === 'executive' ? EXECUTIVE_LEAN : LEAN)), edition + '/' + audience + ': Word and PDF carry the drivers’ lean as the edition prints it');
    }
    pass('every edition (architecture, executive) and audience (all, delivery, review) in Word and in PDF carries the provenance statement whole: “' + P.line + '”');
  }

  // 4. The route: every edition and audience in every format, figures=none, the annexes, a frozen baseline.
  {
    for (const edition of ['architecture', 'executive']) for (const audience of ['all', 'delivery', 'review']) for (const format of ['md', 'html', 'json']) {
      const res = await get('format=' + format + '&edition=' + edition + '&audience=' + audience), suffix = (edition === 'executive' ? '_Executive' : '') + (audience === 'delivery' ? '_Delivery' : audience === 'review' ? '_Review' : '');
      assert.equal(res.status, 200, edition + '/' + audience + '/' + format); assert.match(res.headers.get('Content-Disposition'), new RegExp('filename="AIW_Synthetic_core_platform_Working_SDD' + suffix + '\\.' + format + '"$'));
      if (format === 'json') { const j = await res.json(); assert.deepEqual([j.edition, j.audience], [edition, audience]); assert.ok(Array.isArray(j.structure) && j.structure.length > 3 && j.provenance?.line === P.line, 'JSON: the structure and the provenance'); assert.equal(j.project, undefined, 'the project travels only when asked'); }
      if (format === 'html') { const h = await res.text(); assert.ok(/<nav class="contents"/.test(h) && !/<script/i.test(h), 'HTML with its contents sidebar'); }
    }
    const asked = await (await get('format=json&embed=project')).json();
    assert.ok(asked.project?.id === id && asked.connectedModel?.nodes?.length > 0 && asked.figures?.manifest?.length === (md.match(/<figure id="figure-\d+"/g)||[]).length, 'embed=project: the project and its connected model, with the complete figure manifest');
    const noFig = await (await get('format=md&figures=none')).text();
    assert.ok(!noFig.includes('<figure') && noFig.includes('Not drawn in this export (figures=none)'), 'figures=none is accepted');
    assert.equal((await get('format=md&figures=png')).status, 400); assert.equal((await get('format=exe')).status, 400); assert.equal((await get('format=md&edition=full')).status, 200, 'a link to the retired full edition opens the architecture edition');
    // The annexes (Appendix D).
    const reqs = project.artefacts.filter(a => a.type === 'requirement').length;
    const page1 = await (await get('annex=requirements&format=md&page=1')).text(), page2 = await (await get('annex=requirements&format=md&page=2')).text();
    assert.ok(page1.includes('Page 1 of 2') && page2.includes('Page 2 of 2') && (page1.match(/^### REQ-/gm) || []).length === 100 && (page2.match(/^### REQ-/gm) || []).length === reqs - 100, 'the requirement register, a hundred to a page');
    const csv = await (await get('annex=requirements&format=csv')).text(), matrix = await get('annex=matrix&format=csv'), mtext = await matrix.text();
    assert.equal(csv.trim().split('\n').length, reqs + 1, 'the register as CSV: every requirement'); assert.equal(mtext.trim().split('\n').length, reqs + 1, 'the traceability matrix: every requirement');
    assert.match(matrix.headers.get('Content-Disposition'), /filename="AIW_Synthetic_core_platform_[A-Za-z_]+\.csv"$/);
    const specs = await (await get('annex=specifications&format=md')).text(), registers = await (await get('annex=registers&format=md')).text();
    assert.ok((specs.match(/^## APP-\d{3}/gm) || []).length === project.realisation.components.length || (specs.match(/^# APP-\d{3}/gm) || []).length === project.realisation.components.length, 'one specification per component');
    assert.ok(registers.includes('## Detailed chapter registers'), 'the review registers, whole');
    assert.equal((await get('annex=nothing&format=md')).status, 400); assert.equal((await get('annex=matrix&format=md')).status, 400);
    // The figures annex (Appendix D; the lead's decision on figure heights): every figure of section 5 under its level, in
    // Markdown and HTML, in PDF, and as SVG files with their manifest in a zip, each file as its manifest names it.
    const drawnIn = s => (s.match(/<figure [^>]*\bid="figure-\d+"/g) || []).length, fmd = await (await get('annex=figures&format=md')).text(), nf = drawnIn(fmd);
    assert.ok(nf >= drawnIn(md) && /^# Context diagram \(Level 1\)$/m.test(fmd) && /^# Deployment diagram$/m.test(fmd) && fmd.includes('<!-- aiw:figure-manifest -->'), 'the figures annex in Markdown: every figure of section 5 under its level');
    assert.match(md, /\| Figures \| [^|]+ \| \/api\/export\?chapter=11&annex=figures&format=html \(also pdf, and zip [^|]+\) \|/, 'Appendix D lists the figures annex with how to export it');
    const fhtml = await get('annex=figures&format=html'), fh = await fhtml.text();
    assert.ok(fhtml.status === 200 && /^text\/html/.test(fhtml.headers.get('Content-Type')) && drawnIn(fh) === nf && (fh.match(/<svg xmlns=/g) || []).length >= nf && !/<script/i.test(fh), 'the figures annex in HTML, each figure drawn');
    const fzip = await get('annex=figures&format=zip');
    assert.equal(fzip.headers.get('Content-Type'), 'application/zip'); assert.match(fzip.headers.get('Content-Disposition'), /filename="AIW_Synthetic_core_platform_Figures_Annex\.zip"$/);
    const Z = unzip(await bytes(fzip)), manifest = JSON.parse(Z.get('manifest.json').toString('utf8')), svgFiles = [...Z.keys()].filter(n => n.endsWith('.svg'));
    assert.equal(svgFiles.length, nf, 'the zip: an SVG file per figure');
    assert.deepEqual(manifest.figures.map(m => m.path).sort(), svgFiles.slice().sort(), 'its manifest names each file as the zip stores it');
    for (const m of manifest.figures) assert.equal(createHash('sha256').update(Z.get(m.path)).digest('hex'), m.sha256, m.path + ': the SHA-256 its manifest gives');
    const fpdf = await get('annex=figures&format=pdf'), FP = pdfRead(await bytes(fpdf));
    assert.ok(fpdf.headers.get('Content-Type') === 'application/pdf' && /Figure 1 · Chapter 1 · Context/.test(FP.text) && FP.outline.some(o => o.title === 'Deployment diagram'), 'the figures annex in PDF: each figure named where it stands, with its outline');
    assert.equal((await get('annex=figures&format=docx')).status, 400, 'the figures annex is served as md, html, zip and pdf');
    // A frozen baseline: as it was frozen, for everyone, in every format.
    let st = await (await call('/api/project?project=' + id)).json();
    const post = async (type, payload = {}) => { const r = await call('/api/commands?project=' + id, {revision: st.revision, command: {type: 'review.' + type, payload}}); assert.equal(r.status, 200, await r.clone().text()); st = await r.json(); };
    // A baseline is frozen as a job and read back whole (round 12, A3: GR-STO-02, scripts/freeze-baseline.mjs).
    await post('checks'); const frozenNow = await freezeBaseline(call, {stamp: reviewDesignStamp(st.document), title: 'Frozen for the formats suite', reviewed: true, project: id});
    assert(!frozenNow.error, frozenNow.error); st = frozenNow.state;
    const b = frozenNow.baseline; assert.equal(b.id, st.document.finalReview.baselines.at(-1).id);
    assert.equal(await (await get('format=md&baseline=' + b.id)).text(), b.markdown, 'the baseline as frozen');
    assert.equal((await get('format=md&baseline=' + b.id + '&edition=executive')).status, 400, 'a baseline is kept for everyone, as frozen');
    const bp = pdfRead(await bytes(await get('format=pdf&baseline=' + b.id)));
    assert.ok(bp.pages.length > 10 && /Frozen baseline BL-001/.test(bp.text), 'the frozen baseline in PDF');
    assert.ok(docxRead(await bytes(await get('format=docx&baseline=' + b.id))).paragraphs.some(x => x.style === 'Heading1'), 'and in Word');
    pass('the route serves both editions for the three audiences as Markdown, HTML (with its contents sidebar) and JSON (structure, figures and provenance; the project and its connected model only with embed=project), Word and PDF, figures=none, the annexes (the requirement register a hundred to a page, the register and matrix as CSV with every requirement, one specification per component, the review registers whole, the figures annex (' + nf + ' figures) in Markdown, HTML and PDF and as SVG files with a manifest of their SHA-256 in a zip), a frozen baseline only as frozen, every file named after the project');
  }
} finally { env.DB.close(); }

function count(s, re) { return (String(s).match(re) || []).length; }
// A figure of the exported Markdown by its scene, measured from its SVG as the Markdown carries it at the A4 portrait text
// width (SDD-SPEC §5: 160 mm, no word under 7 pt; figureLabels, as figures-at-size measures every figure): its number, where
// it stands, its width in px, its smallest word there in pt and its height there in mm.
function figureIn(md, scene) {
  const m = new RegExp('<figure id="figure-(\\d+)" data-scene="' + scene + '"[^>]*>\\n(<svg[\\s\\S]*?</svg>)').exec(md);
  if (!m) return null;
  const L = figureLabels(m[2], {widthMm: PAGES.portrait.widthMm});
  return {n: Number(m[1]), at: m.index, widthPx: L.widthPx, minPt: L.minPt, heightMm: L.heightMm};
}
console.log(JSON.stringify({passed: checks.length}));
