// The Markdown edition with Mermaid figures (round 6, Contract F): for the bank and the clinic references, the
// architecture edition (round 12, F: the full edition retired; a link asking for it opens the architecture edition) with
// figures:'mermaid' carries its section 5 figures, the C4 levels, as one fenced ```mermaid block per figure, and the
// executive edition, which draws no figure, carries none; each block (GitHub style: the fence on
// its own line, closed on its own line), a bold "Figure N · title" line before it and a caption paragraph after it, and
// no <figure> block; every block passes a structural check (a known diagram type, balanced quotes, every node declared
// before an edge or a class names it, no raw newline in a label, no tag but <br/> and no raw quote in a label; the data
// scene as an erDiagram with its entities, attributes and crow's-foot relationships); the manifest carries the Mermaid
// files; the HTML renderer refuses the variant, the Word and PDF builders never fetch it. Measures the Mermaid Markdown
// against the SVG Markdown. The sample Markdown is saved as evidence. No network, no model key.
// Run: npm run test:sdd-mermaid [--save-to <folder>]
import assert from 'node:assert/strict';
import {readFileSync, mkdirSync, writeFileSync} from 'node:fs';
import {referenceProject} from './notation-fixtures.mjs';
import {createProject} from './shared/projects-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {sddDocument, sddPackage, architectureFigureSet, mermaidBlock, isMermaidEdition, SDD_FIGURES} from './public/sdd-document.js';
import {sddFigures, FIGURE_CODES} from './public/sdd-figures.js';
import {mermaidFigure, mermaidFenced} from './public/mermaid-figures.js';
import {renderSDD} from './public/sdd-renderer.js';
import {figureBlocks} from './public/review-documents.js';
import {notationDiagram} from './public/notation-model.js';
import {notationLayout} from './public/notation-layout.js';

const checks = [], pass = n => checks.push(n), measures = {};
const saveFlag = process.argv.indexOf('--save-to'), saveTo = saveFlag > 0 && process.argv[saveFlag + 1] ? process.argv[saveFlag + 1] : '.aiw-local/sdd-mermaid';
mkdirSync(saveTo, {recursive: true});

// ---------------------------------------------------------------- the structural check
const quoted = line => [...line.matchAll(/"([^"]*)"/g)].map(m => m[1]);
function checkLabels(line, problems) {
  if ((line.match(/"/g) || []).length % 2) problems.push('unbalanced quotes: ' + line);
  for (const q of quoted(line)) { if (/[<>]/.test(q.replace(/<br\/>/g, ''))) problems.push('a tag in a label: ' + q); if (/\n|\r/.test(q)) problems.push('a raw newline in a label: ' + q); if (/"/.test(q)) problems.push('a raw quote in a label: ' + q); }
}
const FLOW_NODE = /^\s*(aiw_[0-9a-f]+)(?:\["[^"]*"\]|\(\("[^"]*"\)\)|\{"[^"]*"\}|\[\("[^"]*"\)\]|\(\["[^"]*"\]\)|>"[^"]*"\])$/;
const FLOW_EDGE = /^\s*(aiw_[0-9a-f]+) (?:-->|-\.->|---|-\.-|==>)(?:\|"[^"]*"\|)? (aiw_[0-9a-f]+)$/;
function checkMermaid(code) {
  const problems = [], lines = code.split('\n'), head = (lines[0] || '').trim().split(/\s+/)[0];
  if (!['flowchart', 'C4Context', 'erDiagram', 'sequenceDiagram', 'stateDiagram-v2'].includes(head)) problems.push('unknown diagram type: ' + lines[0]);
  if (/\n\s*\n/.test(code.trim())) problems.push('a blank line inside the diagram');
  if (/^```/m.test(code)) problems.push('a fence inside the diagram');
  const declared = new Set();
  for (const raw of lines.slice(1)) {
    const line = raw.replace(/\s+$/, ''); if (!line.trim() || /^\s*%%/.test(line)) continue;
    checkLabels(line, problems);
    if (head === 'flowchart') {
      let m;
      if ((m = /^\s*subgraph (\S+) \["[^"]*"\]$/.exec(line))) { declared.add(m[1]); continue; }
      if (/^\s*end$/.test(line) || /^\s*classDef \w+ fill:#[0-9a-f]{6},stroke:#[0-9a-f]{6},color:#[0-9a-f]{6}$/.test(line)) continue;
      if ((m = FLOW_NODE.exec(line))) { declared.add(m[1]); continue; }
      if ((m = FLOW_EDGE.exec(line))) { for (const id of [m[1], m[2]]) if (!declared.has(id)) problems.push('an edge names an undeclared node: ' + id); continue; }
      if ((m = /^\s*class (aiw_[0-9a-f]+) (\w+)$/.exec(line))) { if (!declared.has(m[1])) problems.push('a class names an undeclared node: ' + m[1]); continue; }
      problems.push('a line the flowchart grammar does not know: ' + line);
    } else if (head === 'C4Context') {
      let m;
      if (/^\s*title .+$/.test(line)) continue;
      if ((m = /^\s*(?:Person|System_Ext|System)\((aiw_[0-9a-f]+), "[^"]*", "[^"]*"\)$/.exec(line))) { declared.add(m[1]); continue; }
      if ((m = /^\s*Rel\((aiw_[0-9a-f]+), (aiw_[0-9a-f]+), "[^"]*"\)$/.exec(line))) { for (const id of [m[1], m[2]]) if (!declared.has(id)) problems.push('a Rel names an undeclared element: ' + id); continue; }
      problems.push('a line the C4Context grammar does not know: ' + line);
    } else if (head === 'sequenceDiagram') {
      let m;
      if (/^\s*(?:title .+|autonumber)$/.test(line)) continue;
      if ((m = /^\s*participant (aiw_[0-9a-f]+) as .+$/.exec(line))) { declared.add(m[1]); continue; }
      if ((m = /^\s*(aiw_[0-9a-f]+)(?:->>|-->>|-\)|--\))(aiw_[0-9a-f]+): .+$/.exec(line))) { for (const id of [m[1], m[2]]) if (!declared.has(id)) problems.push('a message names an undeclared participant: ' + id); continue; }
      if (/^\s*(?:Note (?:over|left of|right of) aiw_[0-9a-f]+(?:,aiw_[0-9a-f]+)?: .+|(?:loop|alt|opt|par|else)(?: .+)?|end)$/.test(line)) continue;
      problems.push('a line the sequenceDiagram grammar does not know: ' + line);
    } else if (head === 'stateDiagram-v2') {
      let m;
      if (/^\s*(?:title .+|direction (?:LR|TB|RL|BT))$/.test(line)) continue;
      if ((m = /^\s*state "[^"]*" as ([A-Za-z_][A-Za-z0-9_]*)(?: \{)?$/.exec(line))) { declared.add(m[1]); continue; }
      if (/^\s*\}$/.test(line)) continue;
      if ((m = /^\s*(\[\*\]|[A-Za-z_][A-Za-z0-9_]*) --> (\[\*\]|[A-Za-z_][A-Za-z0-9_]*)(?: ?: .+)?$/.exec(line))) { for (const id of [m[1], m[2]]) if (id !== '[*]' && !declared.has(id)) problems.push('a transition names an undeclared state: ' + id); continue; }
      if (/^\s*[A-Za-z_][A-Za-z0-9_]* : .+$/.test(line)) continue;
      problems.push('a line the stateDiagram-v2 grammar does not know: ' + line);
    } else {
      let m;
      if ((m = /^\s{2}([A-Za-z_][A-Za-z0-9_]*)(?: \{)?$/.exec(line))) { declared.add(m[1]); continue; }
      if (/^\s{4}[A-Za-z][A-Za-z0-9_]* [A-Za-z_][A-Za-z0-9_]*(?: PK)?(?: "[^"]*")?$/.test(line) || /^\s{2}\}$/.test(line)) continue;
      if ((m = /^\s{2}([A-Za-z_][A-Za-z0-9_]*) [|}o][|o]--[|o][|{] ([A-Za-z_][A-Za-z0-9_]*) : "[^"]*"$/.exec(line))) { for (const id of [m[1], m[2]]) if (!declared.has(id)) problems.push('a relationship names an undeclared entity: ' + id); continue; }
      problems.push('a line the erDiagram grammar does not know: ' + line);
    }
  }
  return {kind: head, problems, declared: declared.size};
}
// The fenced blocks of a Markdown text, GitHub style: a line that is exactly ```mermaid, the code, a line that is exactly ```.
function fences(md) {
  const out = [], lines = md.split('\n');
  for (let i = 0; i < lines.length; i++) { if (lines[i] !== '```mermaid') continue; let j = i + 1; while (j < lines.length && lines[j] !== '```') j++; assert.ok(j < lines.length, 'every fence is closed'); out.push({at: i, code: lines.slice(i + 1, j).join('\n'), before: lines[i - 2] || '', after: lines[j + 2] || ''}); i = j; }
  return out;
}

const projects = [['bank', referenceProject()], ['clinic', withFinalReview(createProject({name: 'Clinic appointments', template: 'clinic-appointments'}, 'clinic-mermaid', '2026-10-01T09:00:00Z'))]];
for (const [name, p] of projects) {
  const before = JSON.stringify(p);
  // The executive edition (round 12, F) is two pages of text with one figure, the context (sdd-document.js): as Mermaid
  // it is one fence titled Figure 1 · Context and no SVG; nothing else is drawn.
  {
    const ex = sddDocument(p, {edition: 'executive', figures: 'mermaid'});
    assert.deepEqual(ex.figures.figures.map(f => [f.n, f.scene]), [[1, 'context']], name + ' executive: the context figure and no other');
    assert.equal(fences(ex.markdown).length, 1, name + ' executive: one Mermaid fence'); assert.deepEqual(ex.markdown.match(/^\*\*Figure \d[^*]*\*\*/gm), ['**Figure 1 · Context**']); assert.ok(!/<figure|<svg/.test(ex.markdown), name + ' executive: no SVG');
  }
  for (const edition of ['architecture']) {
    const svg = sddDocument(p, {edition, figures: true}), doc = sddDocument(p, {edition, figures: 'mermaid'}), md = doc.markdown;
    const F = fences(md), n = doc.figures.figures.length;
    assert.equal(sddDocument(p, {edition: 'full', figures: 'mermaid'}).markdown, md, 'a link asking for the retired full edition opens the architecture edition');
    assert.ok(n > 0, name + ' ' + edition + ': figures are drawn'); assert.equal(F.length, n, name + ' ' + edition + ': the fence count equals the figure count');
    assert.equal((md.match(/^<figure/mg) || []).length, 0, 'no <figure> line'); assert.ok(!/<svg/.test(md), 'no inline SVG'); assert.ok(!/<figcaption>/.test(md));
    assert.equal(doc.figures.code, 'mermaid'); assert.ok(doc.figures.figures.every(f => f.mermaid && f.mermaidKind && f.mermaidPath.endsWith('.mmd') && /^[0-9a-f]{64}$/.test(f.mermaidSha256) && f.scene !== 'traceability'), 'each figure carries its Mermaid text, kind, file and SHA-256; the traceability matrix is not among them');
    assert.ok(isMermaidEdition(md) && !isMermaidEdition(svg.markdown), 'the edition is recognisable');
    const kinds = {};
    for (const [i, f] of doc.figures.figures.entries()) {
      const fence = F[i];
      assert.equal(fence.before, '**Figure ' + f.n + ' · ' + f.title + '**', 'a bold figure line two lines before the fence');
      assert.ok(fence.after.startsWith('Figure ' + f.n + ' · Chapter ' + f.chapter + ' · ' + f.title + ' (' + f.standard + ')') && fence.after.includes(f.mermaidPath) && fence.after.endsWith('SHA-256 ' + f.mermaidSha256), 'a caption paragraph two lines after the fence: ' + fence.after.slice(0, 80));
      assert.equal(fence.code, mermaidFenced(f.mermaid), 'the fenced text is the figure\'s Mermaid');
      const r = checkMermaid(fence.code); assert.deepEqual(r.problems, [], name + ' ' + edition + ' figure ' + f.n + ' (' + f.scene + ') is structurally sound'); assert.equal(r.kind, f.mermaidKind); assert.ok(r.declared >= Math.min(f.elements, 1), 'its elements are declared');
      kinds[r.kind] = (kinds[r.kind] || 0) + 1;
    }
    // rc39: the architecture edition also draws the journey as one sequence diagram.
    assert.ok(kinds.C4Context === 1 && kinds.flowchart >= 2 && kinds.sequenceDiagram === 1 && Object.keys(kinds).every(k => ['C4Context', 'flowchart', 'sequenceDiagram'].includes(k)), name + ': the context view is C4Context, the containers, components and deployment flowcharts, the journey one sequence diagram: ' + JSON.stringify(kinds));
    // The order and the placing: the figures stand where the SVG edition stands them (under their chapters), numbered the same.
    const svgFigures = svg.figures.figures.filter(f => f.scene !== 'traceability');
    assert.deepEqual(doc.figures.figures.map(f => f.scene), svgFigures.map(f => f.scene), 'the same scenes in the same order');
    for (const f of doc.figures.figures) { const at = md.indexOf('**Figure ' + f.n + ' · '); assert.ok(at > md.indexOf('\n# 5. Architecture models') && at < md.indexOf('\n# 6. '), 'figure ' + f.n + ' under section 5, at its level'); }
    assert.ok(md.includes(' · Mermaid figures. '), 'the edition line says Mermaid figures'); assert.ok(md.includes('Figures are Mermaid code blocks'), 'and what that means');
    const pack = sddPackage(p, doc);
    assert.equal(pack.figures.code, 'mermaid'); assert.ok(pack.figures.manifest.every(m => m.mermaid?.path.endsWith('.mmd') && /^[0-9a-f]{64}$/.test(m.mermaid.sha256) && m.mermaid.bytes > 0), 'the manifest carries the Mermaid files');
    measures[name + ':' + edition] = {figures: n, mermaidBytes: Buffer.byteLength(md), svgBytes: Buffer.byteLength(svg.markdown), ratio: Math.round(100 * Buffer.byteLength(md) / Buffer.byteLength(svg.markdown)) / 100, kinds};
    writeFileSync(saveTo + '/' + name + '-' + edition + '.md', md);
    pass(name + ' ' + edition + ': ' + n + ' Mermaid figures, one GitHub-style fence each with its bold figure line and caption, no <figure>; every block structurally sound (' + Object.entries(kinds).map(([k, v]) => k + ' ' + v).join(', ') + '); ' + Buffer.byteLength(md) + ' bytes against ' + Buffer.byteLength(svg.markdown) + ' as SVG');
  }
  assert.equal(JSON.stringify(p), before, name + ': nothing in the project changed');
}

// The data scene as an erDiagram: entities for every node, attributes for the fields, crow's foot for the relationships.
{
  const p = projects[0][1], D = notationDiagram(p, 'data'), L = notationLayout(D, {arrangement: 'radial'}), m = mermaidFigure(D, L, {project: p, chapter: 8});
  assert.equal(m.kind, 'erDiagram'); assert.ok(m.code.startsWith('erDiagram\n'));
  const r = checkMermaid(m.code); assert.deepEqual(r.problems, []); assert.equal(r.declared, D.nodes.length, 'one entity per node');
  assert.ok(m.code.includes('  Payment_instruction {\n    string paymentReference PK "') && m.code.includes('    number amount "'), 'the fields as attributes with the key');
  assert.ok(/  Payment_service \|\|--o\{ Payment_instruction : "owns"/.test(m.code), 'an owner has many records'); assert.ok(/\}o--o\{ [A-Za-z_]+ : "exchanges \(request\)"/.test(m.code), 'a contract carries records');
  assert.ok(m.code.includes('%% Payment_instruction = Payment instruction (Logical data component, DAT-001; AIW id instruction)'), 'the AIW identifier stands in a comment');
  assert.equal(m.report.omitted.length, 0); assert.ok(m.report.limits.length >= 3);
  // Nothing of the title reaches the text unescaped: a hostile title.
  const hostile = structuredClone(D); hostile.nodes[3] = {...hostile.nodes[3], title: 'Pay "it" <b>now</b>\nplease', record: {...hostile.nodes[3].record, fields: [{name: 'bad name', type: 'string'}, {name: 'ok_name', type: 'weird type', key: true, description: 'say "hi" <i>'}]}};
  const h = mermaidFigure(hostile, L, {project: p, chapter: 8});
  assert.deepEqual(checkMermaid(h.code).problems, []); assert.ok(h.code.includes('= Pay #quot;it#quot; #lt;b#gt;now#lt;/b#gt; please ('), 'a hostile title is escaped in its comment');
  assert.ok(h.code.includes('    string ok_name PK "say hi i"'), 'a field with a type Mermaid cannot carry becomes a string, and its comment keeps no quote or tag');
  assert.ok(h.report.omitted.some(o => /bad name/.test(o.reason)), 'a field name Mermaid cannot carry is omitted and listed');
  // Other scenes take the notation-code emitter; the process scene is a flowchart with lanes as subgraphs.
  const P = notationDiagram(p, 'process'), pm = mermaidFigure(P, notationLayout(P, {arrangement: 'lanes'}), {project: p, chapter: 1});
  assert.equal(pm.kind, 'flowchart'); assert.deepEqual(checkMermaid(pm.code).problems, []); assert.ok(pm.code.includes('subgraph '));
  assert.equal(mermaidFigure({scene: {id: 'data'}, nodes: [], edges: [], groups: []}, null, {}), null, 'nothing drawn: no Mermaid');
  assert.equal(mermaidFenced('a\n```\nb\n\n'), "a\n'''\nb", 'a fence inside the text is softened and the end is tidy');
  pass('the data scene is an erDiagram: one entity per node, the fields as attributes with their key, crow\'s foot by relationship kind, the AIW identifier in a comment; hostile titles and fields are escaped or omitted and listed');
}

// The variant is refused where it does not belong: the HTML renderer, the figure set with another code, the document with another value.
{
  const p = projects[0][1], doc = sddDocument(p, {figures: 'mermaid'});
  assert.throws(() => renderSDD(doc.markdown, null, {figures: doc.figures}), /Mermaid figures are for the Markdown edition/, 'the HTML renderer refuses the figure set');
  assert.throws(() => renderSDD(doc.markdown, null, {}), /Mermaid figures are for the Markdown edition/, 'and the Markdown text alone');
  assert.doesNotThrow(() => renderSDD(sddDocument(p, {figures: false}).markdown, null, {}), 'the SVG editions render');
  assert.throws(() => sddDocument(p, {figures: 'svg'}), /drawn as SVG, left out, or written as Mermaid/); assert.throws(() => sddFigures(p, {code: 'plantuml'}), /written as Mermaid/);
  assert.deepEqual(SDD_FIGURES, [true, false, 'mermaid']); assert.deepEqual(FIGURE_CODES, ['mermaid']);
  // The Word and PDF builders read figures by their <figure> line, find none here, and fetch the Markdown without the parameter.
  assert.equal(figureBlocks(doc.markdown).length, 0, 'the Word and PDF builders find no figure block to draw');
  const source = readFileSync('public/review-documents.js', 'utf8');
  assert.ok(source.includes("'/api/export?chapter=11&format=md&edition='") && !/[?&]figures=/.test(source), 'the Word and PDF builders fetch the SVG Markdown only');
  assert.throws(() => mermaidBlock({n: 1, title: 'x', caption: 'y'}), /carries no Mermaid text/);
  // The same set twice is one drawing (the memo keeps it), and the SVG set is a different set.
  const a = architectureFigureSet(p, {code: 'mermaid'}), b = architectureFigureSet(p, {code: 'mermaid'}), c = architectureFigureSet(p, {});
  assert.equal(a, b); assert.notEqual(a, c); assert.equal(c.code, null); assert.ok(Object.isFrozen(a) && Object.isFrozen(a.figures[0]));
  pass('the HTML renderer refuses the Mermaid variant (the set and the text alike); a figure code other than Mermaid, and a figures value other than true, false or Mermaid, are refused; the Word and PDF builders never see it; the set is kept once');
}

console.log(JSON.stringify({suite: 'SDD Markdown with Mermaid figures', passed: checks.length, checks, measures, savedTo: saveTo}, null, 1));
