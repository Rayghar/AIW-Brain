// The SDD's Word and PDF files, built in the browser (round 5, Contract E; public/review-documents.js, public/review-pdf.js,
// public/review-ui.js export form). On a reference journey drafted by the pipeline, the Output tab's form is set to the
// executive and then the architecture edition (round 12, F: the full edition is retired; a link asking for it opens the
// architecture edition); for each, the Word and the PDF files are downloaded through the page itself and checked: the
// Word file unzips, holds one PNG per figure the edition's Markdown carries (drawn by the browser on a canvas from the
// inline SVG; the executive edition draws none) and the statement of who wrote the content; the PDF embeds one JPEG image
// per figure; both have a size. The preview
// and a Markdown download carry the same edition and audience. No page error, no failed API call.
// Needs Playwright and Chromium: AIW_PLAYWRIGHT_MODULE (defaults to 'playwright') and optionally AIW_BROWSER_EXECUTABLE.
// Starts an isolated local server on a free port with no model key. Prints a JSON summary with the sizes; the downloaded
// files are also saved as evidence, in the folder --save-to names (default .aiw-local/sdd-documents/, a scratch folder
// git ignores).
// Run: node sdd-documents-browser-validate.mjs [--save-to <folder>]
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
import {readFileSync, rmSync, mkdirSync} from 'node:fs';
import {inflateRawSync} from 'node:zlib';
import net from 'node:net';

const require = createRequire(import.meta.url);
const saveFlag = process.argv.indexOf('--save-to'), saveTo = saveFlag > 0 && process.argv[saveFlag + 1] ? process.argv[saveFlag + 1] : '.aiw-local/sdd-documents';
mkdirSync(saveTo, {recursive: true});
const {chromium} = require(process.env.AIW_PLAYWRIGHT_MODULE || 'playwright');
const port = await new Promise(r => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const db = '.aiw-local/sdd-documents-' + port + '.sqlite';
const server = spawn(process.execPath, ['server.js', '--port', String(port)], {env: {...process.env, AIW_LOCAL_DB: db, OPENAI_API_KEY: '', ANTHROPIC_API_KEY: ''}, stdio: ['ignore', 'pipe', 'inherit']});
process.on('exit', () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } });
await new Promise((resolve, reject) => { server.stdout.on('data', d => { if (String(d).includes('ready')) resolve(); }); server.on('exit', c => reject(Error('server exited ' + c))); });
const base = 'http://127.0.0.1:' + port;
const browser = await chromium.launch({executablePath: process.env.AIW_BROWSER_EXECUTABLE, headless: true});
const checks = [], errors = [], failed = [], measures = {}, pass = n => { checks.push(n); process.stderr.write('passed: ' + n.slice(0, 90) + '\n'); };
// The entries of a zip file (stored or deflated), read from its central directory.
function unzip(buf) {
  let e = buf.length - 22; while (e > 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  assert.ok(e > 0, 'the file is a zip archive');
  const entries = new Map(); let o = buf.readUInt32LE(e + 16);
  for (let i = 0, n = buf.readUInt16LE(e + 10); i < n; i++) {
    const method = buf.readUInt16LE(o + 10), size = buf.readUInt32LE(o + 20), nameLength = buf.readUInt16LE(o + 28), extra = buf.readUInt16LE(o + 30), comment = buf.readUInt16LE(o + 32), local = buf.readUInt32LE(o + 42), name = buf.toString('utf8', o + 46, o + 46 + nameLength);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28), data = buf.subarray(start, start + size);
    entries.set(name, method === 8 ? inflateRawSync(data) : data); o += 46 + nameLength + extra + comment;
  }
  return entries;
}

try {
  const ctx = await browser.newContext({viewport: {width: 1440, height: 900}, acceptDownloads: true});
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400 && r.url().includes('/api/')) failed.push(r.status() + ' ' + r.url().replace(base, '')); });
  await page.goto(base + '/?view=projects'); await page.waitForLoadState('networkidle');
  const id = await page.evaluate(async () => (await (await fetch('/api/projects', {method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name: 'Clinic appointments', template: 'clinic-appointments'})})).json()).document.id);
  assert.ok(id, 'a reference journey, drafted by the pipeline');
  const figuresOf = (edition, audience = 'all') => page.evaluate(async q => { const md = await (await fetch('/api/export?' + q, {credentials: 'same-origin'})).text(); return (md.match(/<figure id="figure-\d+"/g) || []).length; }, 'project=' + id + '&chapter=11&format=md&edition=' + edition + '&audience=' + audience);
  await page.goto(base + '/?chapter=11&tab=output&project=' + id); await page.waitForSelector('form.rv-export-form');
  // rc38+ (rc41 W4): the form sits in the output workspace's SDD document; its Preview is the document's own "Open preview
  // in new tab" link beside the form (and the inline preview below it), both following the form's edition and audience.
  const form = await page.$eval('form.rv-export-form', f => ({edition: f.elements.edition.value, audience: f.elements.audience.value, project: f.elements.project?.value, formats: [...f.querySelectorAll('button[name="format"]')].map(b => b.value), files: [...f.querySelectorAll('[data-wb-action]')].map(b => b.dataset.wbAction)}));
  const previewLinks = () => page.$$eval('[data-output-workspace] [data-output-document-view] a[data-output-open]', as => as.map(a => ({name: a.textContent.trim(), target: a.getAttribute('target'), q: Object.fromEntries(new URL(a.href).searchParams)})));
  const inlinePreview = () => page.$$eval('[data-output-workspace] [data-output-document-view] iframe.output-inline-preview', fs => fs.map(f => Object.fromEntries(new URL(f.src).searchParams)));
  assert.deepEqual({...form, preview: await previewLinks(), inline: await inlinePreview()}, {edition: 'architecture', audience: 'all', project: id, formats: ['md', 'html', 'json'], files: ['docx', 'pdf'],
    preview: [{name: 'Open preview in new tab', target: '_blank', q: {chapter: '11', format: 'html', view: '1', edition: 'architecture', audience: 'all', project: id}}], inline: [{chapter: '11', format: 'html', view: '1', edition: 'architecture', audience: 'all', project: id}]});
  pass('the Output tab offers one form: the edition (the architecture edition by default), the audience (everyone), Preview, Markdown, HTML, JSON, Word and PDF');

  for (const edition of ['executive', 'architecture']) {
    await page.selectOption('form.rv-export-form select[name="edition"]', edition);
    const expected = await figuresOf(edition);
    // The executive edition carries its context figure; the architecture edition draws the C4 levels (context, containers,
    // a container's components, deployment).
    assert.ok(edition === 'executive' ? expected === 1 : expected >= 3, edition + ': the Markdown carries its figures (' + expected + ')');
    // Word: one PNG per figure, drawn by the browser; the provenance notes as footnotes.
    if (!await page.$eval('form.rv-export-form .rv-export-menu', d => d.open)) await page.click('form.rv-export-form .rv-export-menu > summary');
    let started = Date.now();
    const [docx] = await Promise.all([page.waitForEvent('download', {timeout: 180000}), page.click('form.rv-export-form [data-wb-action="docx"]')]);
    await docx.saveAs(saveTo + '/' + docx.suggestedFilename());
    const docxFile = await docx.path(), docxBytes = readFileSync(docxFile), zip = unzip(docxBytes), media = [...zip.keys()].filter(n => /^word\/media\/.+\.png$/.test(n)), xml = zip.get('word/document.xml').toString('utf8');
    assert.match(docx.suggestedFilename(), new RegExp('^AIW_Clinic_appointments_Working_SDD' + (edition === 'executive' ? '_Executive' : '') + '\\.docx$'));
    assert.equal(media.length, expected, edition + ': the Word file holds one image per figure');
    assert.equal((xml.match(/<w:drawing>/g) || []).length, expected, edition + ': each image placed in the text');
    assert.ok(media.every(n => zip.get(n).subarray(1, 4).toString('latin1') === 'PNG' && zip.get(n).length > 2000), 'each image is a PNG with a picture in it');
    assert.ok(/Provenance: [^<]*(?:drafted|written|imported)/.test(xml.replace(/<[^>]+>/g, '')), edition + ': the Word file says who wrote the content');
    // Round 25 (D-25-07): the decision reading reaches the Word file as the Markdown prints it: the trade-off analysis's
    // first paragraph (on this journey, whose drivers state no priority, the decisions that weigh nothing yet).
    if (edition === 'architecture') {
      const weighing = await page.evaluate(async q => { const md = await (await fetch('/api/export?' + q, {credentials: 'same-origin'})).text(), head = '\n## Trade-off analysis\n\n', at = md.indexOf(head); return at < 0 ? '' : md.slice(at + head.length).split('\n\n')[0]; }, 'project=' + id + '&chapter=11&format=md&edition=architecture&audience=all');
      const flat = s => s.replace(/\s+/g, '');
      assert.ok(weighing && flat(xml.replace(/<[^>]+>/g, '')).includes(flat(weighing)), edition + ': the Word file carries the trade-off analysis as the Markdown prints it: ' + weighing);
      measures.weighing = weighing.slice(0, 160);
    }
    const docxMs = Date.now() - started;
    // PDF: one JPEG image per figure.
    started = Date.now();
    const [pdf] = await Promise.all([page.waitForEvent('download', {timeout: 180000}), page.click('form.rv-export-form [data-wb-action="pdf"]')]);
    await pdf.saveAs(saveTo + '/' + pdf.suggestedFilename());
    const pdfBytes = readFileSync(await pdf.path()), pdfText = pdfBytes.toString('latin1');
    assert.ok(pdfText.startsWith('%PDF-1.7') && pdfText.trimEnd().endsWith('%%EOF'), edition + ': a PDF');
    assert.equal((pdfText.match(/\/Subtype \/Image/g) || []).length, expected, edition + ': the PDF embeds one image per figure');
    assert.equal((pdfText.match(/\/Filter \/DCTDecode/g) || []).length, expected);
    measures[edition] = {figures: expected, docx: {bytes: docxBytes.length, images: media.length, footnotes: (xml.match(/w:footnoteReference/g) || []).length, ms: docxMs}, pdf: {bytes: pdfBytes.length, images: expected, ms: Date.now() - started}};
    // Both editions retain their text and the exact figures read from the shared document.
    assert.ok(docxBytes.length > (edition === 'executive' ? 8000 : 20000) && pdfBytes.length > 300000, edition + ': both files have their content (' + docxBytes.length + ' / ' + pdfBytes.length + ' bytes)');
    pass(`${edition} edition: Word ${docxBytes.length} bytes with ${media.length} PNG figures drawn in the browser and the statement of who wrote it; PDF ${pdfBytes.length} bytes with ${expected} JPEG figures`);
  }

  // The preview and a Markdown download carry the edition and the audience the form names.
  await page.selectOption('form.rv-export-form select[name="edition"]', 'executive');
  await page.selectOption('form.rv-export-form select[name="audience"]', 'review');
  const reviewFigures = await figuresOf('executive', 'review');
  const expectedPreview = {chapter: '11', format: 'html', view: '1', edition: 'executive', audience: 'review', project: id};
  assert.deepEqual((await previewLinks()).map(l => l.q), [expectedPreview], 'the preview link follows the form');
  assert.deepEqual(await inlinePreview(), [expectedPreview], 'and so does the inline preview');
  const [preview] = await Promise.all([ctx.waitForEvent('page'), page.click('[data-output-workspace] [data-output-document-view] a[data-output-open]')]);
  await preview.waitForLoadState();
  const shown = await preview.evaluate(() => ({title: document.querySelector('h1')?.textContent || '', figures: document.querySelectorAll('figure.notation-figure').length, svg: document.querySelectorAll('figure.notation-figure > svg').length, url: location.search}));
  assert.match(shown.url, /edition=executive/); assert.match(shown.url, /audience=review/);
  assert.match(shown.title, /Executive edition/); assert.equal(shown.figures, reviewFigures, JSON.stringify(shown)); assert.equal(shown.svg, reviewFigures);
  await preview.close();
  if (!await page.$eval('form.rv-export-form .rv-export-menu', d => d.open)) await page.click('form.rv-export-form .rv-export-menu > summary');
  const [mdDownload] = await Promise.all([page.waitForEvent('download'), page.click('form.rv-export-form button[name="format"][value="md"]')]);
  assert.equal(mdDownload.suggestedFilename(), 'AIW_Clinic_appointments_Working_SDD_Executive_Review.md');
  const mdText = readFileSync(await mdDownload.path(), 'utf8');
  assert.ok(/^# [^\n]* · Executive edition\n/m.test(mdText) && /^Solution Design Document · [^\n]* · For reviewers$/m.test(mdText) && (mdText.match(/<figure id="figure-\d+"/g) || []).length === reviewFigures, 'the Markdown carries the same edition and audience, with its figures');
  assert.equal(await page.evaluate(() => location.pathname + location.search).then(u => u.includes('chapter=11')), true, 'downloading leaves the workspace where it was');
  pass(`the preview opens the executive edition for reviewers with its ${reviewFigures} figures drawn, and the Markdown download carries the same choice`);

  // Round 6 (Contract F): "Markdown with Mermaid figures" beside the editions. The option is a submit button named
  // `figures` with the value `mermaid` (review-ui.js, wired by the lead); the route answers the Markdown edition with one
  // fenced ```mermaid block per figure and no <figure>. The assertion runs once the option is on the form and says so
  // until then, so this suite tells the truth about the page as it stands.
  const mermaidOption = await page.$('form.rv-export-form button[type="submit"][name="figures"][value="mermaid"]');
  if (mermaidOption) {
    await page.selectOption('form.rv-export-form select[name="edition"]', 'architecture'); await page.selectOption('form.rv-export-form select[name="audience"]', 'all');
    const drawn = await figuresOf('architecture');
    if (!await page.$eval('form.rv-export-form .rv-export-menu', d => d.open)) await page.click('form.rv-export-form .rv-export-menu > summary');
    const [mm] = await Promise.all([page.waitForEvent('download'), page.click('form.rv-export-form button[name="figures"][value="mermaid"]')]);
    assert.match(mm.suggestedFilename(), /^AIW_Clinic_appointments_Working_SDD(?:_Mermaid)?\.md$/, 'a Markdown file: ' + mm.suggestedFilename());
    const mmText = readFileSync(await mm.path(), 'utf8'), fencesN = (mmText.match(/^```mermaid$/mg) || []).length;
    assert.ok(fencesN === drawn && fencesN >= 3 && (mmText.match(/^```$/mg) || []).length === fencesN && !/^<figure/m.test(mmText) && !/<svg/.test(mmText), 'one fenced Mermaid block per figure, closed, and no <figure>: ' + fencesN);
    assert.equal((mmText.match(/^\*\*Figure \d+ · /mg) || []).length, fencesN, 'a bold figure line per block');
    assert.ok(mmText.includes('· Mermaid figures.'), 'the edition line says Mermaid figures');
    measures.mermaid = {figures: fencesN, bytes: mmText.length};
    pass(`the Output block offers Markdown with Mermaid figures: ${fencesN} fenced blocks, no <figure>, ${mmText.length} characters`);
  } else {
    assert.deepEqual(await page.$$eval('form.rv-export-form button[name="format"]', bs => bs.map(b => b.value)), ['md', 'html', 'json'], 'the three editions stay');
    pass('the Mermaid option is not on the Output block yet (review-ui.js: a submit button named figures, value mermaid, beside Markdown); its download is checked here once it is');
  }

  assert.deepEqual(errors, [], 'no page error');
  assert.deepEqual(failed, [], 'no failed API call');
  console.log(JSON.stringify({suite: 'SDD documents (browser)', passed: checks.length, checks, measures, savedTo: saveTo}, null, 1));
} catch (e) {
  console.error('FAIL', e.message); if (errors.length) console.error('page errors:', errors); if (failed.length) console.error('failed calls:', failed); process.exitCode = 1;
} finally {
  await browser.close();
  server.kill();
  for (const f of [db, db + '-shm', db + '-wal']) try { rmSync(f, {force: true}); } catch { /* temporary */ }
}
