// The diagram leaves the tool: diagram-as-code (Structurizr DSL, C4-PlantUML, Mermaid, draw.io, a
// scene's ArchiMate view, BPMN 2.0), the whole model as typed ArchiMate with the chapter views, the
// SDD figures with their SHA-256 manifest, and the reading packet an assistant may explain. Every
// identifier traces back to an AIW record, every reference resolves, every ArchiMate type and
// relationship is one the specification allows, and nothing changes the project.
// Run: npm run test:notation-code
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {referenceProject} from './notation-fixtures.mjs';
import {notationDiagram, SCENES, CONNECTED} from './public/notation-model.js';
import {notationLayout} from './public/notation-layout.js';
import {diagramCode, codeFile, CODE_FORMATS} from './public/notation-code.js';
import {explainDiagram, notationSVG, figureManifest} from './public/notation-svg.js';
import {archimateRelationship} from './public/notation-palette.js';
import {archimateExchange, exchangeFiles} from './public/model-exchange.js';
import {archimateViews} from './public/archimate-views.js';
import {sddFigures, printNotes, printPage, PRINT} from './public/sdd-figures.js';
import {renderSDD} from './public/sdd-renderer.js';
import {exportSDD} from './public/review-domain.js';
import {logicalGraph} from './public/logical-domain.js';
import {applyProcessCommand} from './public/process-model.js';

const checks = [], pass = name => checks.push(name);
const project = referenceProject(), before = JSON.stringify(project);
const KINDS_KICKER = {physicalApp: 'Physical application component', physicalTech: 'Physical technology component'};
const decode = id => Buffer.from(String(id).replace(/^aiw_/, ''), 'hex').toString('utf8');
const sha = t => createHash('sha256').update(t).digest('hex');
const ELEMENTS = new Set('BusinessActor BusinessRole BusinessCollaboration BusinessInterface BusinessProcess BusinessFunction BusinessInteraction BusinessEvent BusinessService BusinessObject Contract Representation Product ApplicationComponent ApplicationCollaboration ApplicationInterface ApplicationFunction ApplicationInteraction ApplicationProcess ApplicationEvent ApplicationService DataObject Node Device SystemSoftware TechnologyCollaboration TechnologyInterface Path CommunicationNetwork TechnologyFunction TechnologyProcess TechnologyInteraction TechnologyEvent TechnologyService Artifact Equipment Facility DistributionNetwork Material Stakeholder Driver Assessment Goal Outcome Principle Requirement Constraint Meaning Value Resource Capability ValueStream CourseOfAction WorkPackage Deliverable ImplementationEvent Plateau Gap Grouping Location AndJunction OrJunction'.split(' '));
const RELATIONSHIPS = new Set(['Composition', 'Aggregation', 'Assignment', 'Realization', 'Serving', 'Access', 'Influence', 'Triggering', 'Flow', 'Specialization', 'Association']);
// An ArchiMate document: unique identifiers, every reference resolves, every type is ArchiMate's and every relationship allowed.
function checkArchiMate(doc, tag) {
  const ids = [...doc.matchAll(/ identifier="([^"]+)"/g)].map(m => m[1]);
  assert.equal(ids.length, new Set(ids).size, tag + ': identifiers are unique');
  const known = new Set(ids);
  for (const m of doc.matchAll(/(?:source|target|elementRef|relationshipRef)="([^"]+)"/g)) assert.ok(known.has(m[1]), tag + ': ' + m[1] + ' resolves');
  const typeOf = new Map([...doc.matchAll(/<element identifier="([^"]+)" xsi:type="(\w+)"/g)].map(m => [m[1], m[2]]));
  for (const t of typeOf.values()) assert.ok(ELEMENTS.has(t), tag + ': element type ' + t);
  let n = 0;
  for (const m of doc.matchAll(/<relationship identifier="([^"]+)" xsi:type="(\w+)" source="([^"]+)" target="([^"]+)"/g)) { n++; assert.ok(RELATIONSHIPS.has(m[2]), tag + ': relationship type ' + m[2]); assert.ok(archimateRelationship(m[2], typeOf.get(m[3]), typeOf.get(m[4])).kept, `${tag}: ${m[2]} from ${typeOf.get(m[3])} to ${typeOf.get(m[4])} is allowed`); }
  return {elements: typeOf.size, relationships: n};
}

// 1. Every format for every scene: a document, a report, and identifiers that decode to the drawn records. Round 10:
// lines drawn together (L.bundles) are a reading of the picture, so no bundle id reaches any format, raw or encoded.
let files = 0, bundlesSeen = 0;
const hexId = id => 'aiw_' + Buffer.from(String(id), 'utf8').toString('hex');
const noBundleIds = (text, L, tag) => { assert.ok(!text.includes('line:'), tag + ': no bundle id (line:…) in the file'); for (const b of L.bundles) assert.ok(!text.includes(b.id) && !text.includes(hexId(b.id)) && !text.includes(hexId(b.id).slice(4)), tag + ': ' + b.id + ' is not in the file'); };
for (const s of SCENES) {
  const D = notationDiagram(project, s.id), L = notationLayout(D, {arrangement: s.arrangement}); bundlesSeen += L.bundles.length;
  const known = new Set([...D.nodes.map(n => n.id), ...D.edges.map(e => e.id), ...D.groups.map(g => g.id), ...D.groups.map(g => 'group:' + g.id), 'model:' + s.id, 'diagram:' + s.id, 'collab:' + s.id, 'definitions:' + s.id, 'plane:' + s.id]);
  for (const f of CODE_FORMATS) {
    if (f.scenes && !f.scenes.includes(s.id)) continue;
    const {document, report} = diagramCode(f.id, D, L, {project, chapter: 1}), tag = s.id + ':' + f.id;
    assert.ok(document.length > 50 && report.format === f.id && report.elements === D.nodes.length && Array.isArray(report.limits) && report.limits.length, tag + ': a document and its report');
    for (const m of document.matchAll(/\baiw_([0-9a-f]{2,})\b/g)) { const id = decode(m[0]); let base = id; while (/^(view|in|shape|edge|laneset|process|participant):/.test(base)) base = base.replace(/^(view|in|shape|edge|laneset|process|participant):/, ''); assert.ok(known.has(id) || known.has(base) || D.nodes.some(n => n.id === base) || D.groups.some(g => g.id === base || 'group:' + g.id === base) || D.edges.some(e => e.id === base), tag + ': ' + id + ' traces back to the picture'); }
    const file = codeFile(f.id, D, L, {project, chapter: 1}).text;
    assert.ok(file.includes(document.split('\n').slice(2).join('\n').slice(0, 200)) && /Limit:/.test(file), tag + ': one file carries the document and what it could not carry');
    noBundleIds(file, L, tag);
    files++;
  }
}
assert.ok(bundlesSeen > 20, 'the scenes draw bundles (' + bundlesSeen + '), so the check means something');
// The connected model by layer (the Layers view, whose code export writes D.edges): records of one fact drawn as one line
// and fans drawn together, yet every format carries exactly the identifiers it carries without them.
let layered = 0;
for (const ch of [4, 5, 6]) {
  const D = notationDiagram(project, CONNECTED.id, {chapter: ch}); if (!D?.edges.length) continue;
  const L = notationLayout(D, {arrangement: 'by-layer'}), L0 = notationLayout(D, {arrangement: 'by-layer', consolidate: false}); layered += L.bundles.length;
  for (const f of CODE_FORMATS) {
    if (f.scenes && !f.scenes.includes(CONNECTED.id)) continue;
    const t = codeFile(f.id, D, L, {project, chapter: ch}).text, t0 = codeFile(f.id, D, L0, {project, chapter: ch}).text, ids = x => [...x.matchAll(/\baiw_[0-9a-f]{2,}\b/g)].map(m => m[0]).sort();
    noBundleIds(t, L, 'connected ch' + ch + ':' + f.id);
    assert.deepEqual(ids(t), ids(t0), 'connected ch' + ch + ':' + f.id + ': the same records and relationships as drawn without bundles');
  }
}
assert.ok(layered > 0, 'the connected pictures draw bundles (' + layered + ')');
pass(`${files} diagram-code files (${CODE_FORMATS.length} formats × the scenes each carries): each has its report, and every aiw_ identifier decodes to an element, relationship or container of the picture; no bundle id (${bundlesSeen} bundles drawn) reaches any format, and the Layers pictures' code (${layered} bundles drawn) carries exactly the identifiers it carries without bundles`);

// 2. Each format's own structure.
{
  const D = notationDiagram(project, 'application'), L = notationLayout(D, {arrangement: 'tree'});
  const dsl = diagramCode('structurizr', D, L, {project}).document;
  assert.match(dsl, /^workspace "[^"]+" "[^"]*" \{\n {2}!identifiers hierarchical\n {2}model \{/); assert.match(dsl, /views \{[\s\S]*systemContext[\s\S]*container /);
  const declared = new Set([...dsl.matchAll(/(aiw_[0-9a-f]+) = (?:person|softwareSystem|container)/g)].map(m => m[1]));
  for (const m of dsl.matchAll(/^\s+([\w.]+) -> ([\w.]+) /gm)) for (const ref of [m[1], m[2]]) assert.ok(declared.has(ref.split('.').pop()), 'Structurizr: ' + ref + ' is declared');
  assert.equal((dsl.match(/\{/g) || []).length, (dsl.match(/\}/g) || []).length, 'Structurizr: braces balance');
  const puml = diagramCode('plantuml', D, L, {project}).document;
  assert.match(puml, /^@startuml\n!include https:\/\/raw\.githubusercontent\.com\/plantuml-stdlib\/C4-PlantUML\/master\/C4_Container\.puml/); assert.match(puml, /SHOW_LEGEND\(\)\n@enduml\n$/);
  const aliases = new Set([...puml.matchAll(/(?:Person|System(?:_Ext)?|Container(?:Db)?|Deployment_Node|System_Boundary|Boundary)\((aiw_[0-9a-f]+)/g)].map(m => m[1]));
  for (const m of puml.matchAll(/Rel(?:_D)?\((aiw_[0-9a-f]+), (aiw_[0-9a-f]+)/g)) assert.ok(aliases.has(m[1]) && aliases.has(m[2]), 'PlantUML: both ends declared');
  assert.equal((puml.match(/\{/g) || []).length, (puml.match(/\}/g) || []).length, 'PlantUML: boundaries close');
  const mmd = diagramCode('mermaid', D, L, {project}).document;
  assert.match(mmd, /^flowchart TB\n/); const nodesM = new Set([...mmd.matchAll(/^\s+(aiw_[0-9a-f]+)[[({>]/gm)].map(m => m[1]));
  for (const m of mmd.matchAll(/^\s+(aiw_[0-9a-f]+) (?:-->|-\.->|---|-\.-|==>)/gm)) assert.ok(nodesM.has(m[1]), 'Mermaid: edge source declared');
  assert.equal((mmd.match(/^\s*subgraph /gm) || []).length, (mmd.match(/^\s*end$/gm) || []).length, 'Mermaid: subgraphs close');
  const C = notationDiagram(project, 'context'), cm = diagramCode('mermaid', C, notationLayout(C, {}), {project}).document; assert.match(cm, /^C4Context\n/); assert.match(cm, /Person\(/);
  const dio = diagramCode('drawio', D, L, {project}).document, cells = new Map([...dio.matchAll(/<mxCell id="([^"]+)"[^>]*?(vertex="1"|edge="1")[^>]*?parent="([^"]+)"/g)].map(m => [m[1], {kind: m[2], parent: m[3]}]));
  for (const n of D.nodes) assert.ok(cells.has(n.id), 'draw.io: every element is a cell, keyed by its AIW id');
  for (const m of dio.matchAll(/source="([^"]+)" target="([^"]+)"/g)) assert.ok(cells.get(m[1])?.kind === 'vertex="1"' && cells.get(m[2])?.kind === 'vertex="1"', 'draw.io: edges join vertices');
  const b = L.nodes.find(n => n.id === 'api-pod'), g = L.groups.find(x => x.id === D.nodes.find(n => n.id === 'api-pod').group);
  const geo = new RegExp(`<mxCell id="api-pod"[^>]*><mxGeometry x="${Math.round(b.x - (g ? g.x : 0))}" y="${Math.round(b.y - (g ? g.y : 0))}" width="${b.w}" height="${b.h}"`);
  assert.match(dio, geo, 'draw.io: the arranged geometry is carried exactly');
  const P = notationDiagram(project, 'process'), PL = notationLayout(P, {arrangement: 'lanes'}), bp = diagramCode('bpmn', P, PL, {project}).document;
  assert.match(bp, /<definitions xmlns="http:\/\/www\.omg\.org\/spec\/BPMN\/20100524\/MODEL"/);
  assert.equal((bp.match(/<task /g) || []).length, P.nodes.filter(n => n.kind === 'task').length);
  assert.equal((bp.match(/<exclusiveGateway /g) || []).length, 2); assert.ok(/<startEvent /.test(bp) && /<endEvent /.test(bp), 'start and end events');
  const flowIds = new Set([...bp.matchAll(/<(?:task|exclusiveGateway|startEvent|endEvent|intermediateThrowEvent) id="([^"]+)"/g)].map(m => m[1]));
  for (const m of bp.matchAll(/<sequenceFlow id="[^"]+" sourceRef="([^"]+)" targetRef="([^"]+)"/g)) assert.ok(flowIds.has(m[1]) && flowIds.has(m[2]), 'BPMN: sequence flows join flow nodes of one process');
  assert.ok(/<messageFlow /.test(bp) && (bp.match(/<participant /g) || []).length === 2, 'BPMN: two pools and the message flow between them');
  assert.equal((bp.match(/<bpmndi:BPMNShape /g) || []).length, P.nodes.length + P.groups.length, 'BPMN: a shape for every flow node, lane and pool');
  pass('Structurizr DSL (balanced, every relationship end declared, context and container views), C4-PlantUML (C4 include, every Rel end declared, boundaries close), Mermaid (flowchart or C4Context, subgraphs close), draw.io (every element a cell keyed by its AIW id, exact geometry), BPMN 2.0 (tasks, gateways, start/end events, two pools, message flow, a DI shape for every node, lane and pool)');
}

// 3. ArchiMate: a scene's view and the whole model, typed by the rules, every reference resolving.
{
  const counts = [];
  for (const s of SCENES) { const D = notationDiagram(project, s.id), L = notationLayout(D, {}); const r = checkArchiMate(diagramCode('archimate', D, L, {project}).document, 'scene ' + s.id); counts.push(r.relationships); }
  const views = archimateViews(project), X = archimateExchange(project, {views}), r = checkArchiMate(X.document, 'model');
  assert.equal(r.elements, X.report.objects); assert.ok(X.report.elementTypes.length >= 15, 'the model is typed with ' + X.report.elementTypes.length + ' ArchiMate element types');
  assert.ok(X.report.typedRelationships > X.report.associations, 'most relationships keep their own ArchiMate type: ' + X.report.typedRelationships + ' typed, ' + X.report.associations + ' associations');
  assert.ok(X.report.downgradedRelationships.every(d => d.reason && d.wanted !== 'Association'), 'every downgraded relationship says why');
  assert.ok(X.report.omittedObjects.every(o => o.reason) && X.report.omittedObjects.some(o => o.type === 'option'), 'options considered stay native, with the reason');
  assert.equal(X.report.views, 11, 'the eleven chapter diagrams travel as views'); assert.ok((X.document.match(/<connection /g) || []).length >= 100, 'with their connections');
  assert.ok(!X.document.includes('line:'), 'no bundle id in the ArchiMate exchange (views and relationships)');
  const plain = exchangeFiles(project, 'archimate'); assert.ok(!/<views>/.test(plain.files[0].text) && JSON.parse(plain.files[1].text).typedRelationships > 0, 'without views the model is still typed');
  pass(`ArchiMate: every scene view and the whole model use ArchiMate element and relationship types only where ArchiMate 3.1 allows them (unique identifiers, every reference resolves); the model has ${X.report.objects} elements of ${X.report.elementTypes.length} types, ${X.report.typedRelationships} typed relationships and ${X.report.associations} associations (${X.report.downgradedRelationships.length} downgraded, each with its reason), and the ${X.report.views} chapter diagrams as views`);
}

// 3b. rc41 close (C15): the Implementation & Migration relationships Chapter 11 draws keep their own types in its
// ArchiMate exchange — a migration is a triggering from plateau to plateau, a delivery action (a work package) realizes
// its plateau and the records it delivers — and none is reported as a relationship the standard does not allow; the whole
// model's exchange keeps the roadmap's plateau-to-plateau and work-package-to-plateau triggerings, with no downgrade.
{
  const p2 = JSON.parse(before);
  const objIds = notationDiagram(p2, CONNECTED.id, {chapter: 11}).nodes.filter(n => ['component', 'runtime', 'responsibility', 'requirement'].includes(n.type)).slice(0, 4).map(n => n.id);
  p2.roadmap = {schemaVersion: 1, counters: {plateau: 2}, plateaus: [{id: 'PL-A', revision: 1, title: 'Current platform', kind: 'current', order: 1, purpose: 'Today'}, {id: 'PL-B', revision: 1, title: 'Target platform', kind: 'target', order: 2, purpose: 'The target'}], assignments: {}, history: [], migrations: [{id: 'MG-1', title: 'Move the ledger', plateauIds: ['PL-A', 'PL-B'], actionIds: ['ACT-1']}]};
  p2.finalReview = {...(p2.finalReview || {}), actions: [{id: 'ACT-1', revision: 1, title: 'Close the ledger gaps', owner: 'Lead', due: '', acceptance: 'Done', objectIds: objIds, findingId: '', plateauId: 'PL-B', status: 'Planned'}]};
  const D = notationDiagram(p2, CONNECTED.id, {chapter: 11}), L = notationLayout(D, {}), code = diagramCode('archimate', D, L, {project: p2});
  checkArchiMate(code.document, 'Chapter 11 with a roadmap');
  const typeOfEl = new Map([...code.document.matchAll(/<element identifier="([^"]+)" xsi:type="(\w+)"/g)].map(m => [decode(m[1]), m[2]]));
  const rel = rid => { const m = code.document.match(new RegExp(`<relationship identifier="aiw_${Buffer.from(rid).toString('hex')}" xsi:type="(\\w+)" source="([^"]+)" target="([^"]+)"`)); return m && [m[1], typeOfEl.get(decode(m[2])), typeOfEl.get(decode(m[3]))]; };
  assert.deepEqual(rel('c:MG-1'), ['Triggering', 'Plateau', 'Plateau'], 'a migration is the triggering from its first plateau to its last');
  assert.deepEqual(rel('c:ACT-1>PL-B'), ['Realization', 'WorkPackage', 'Plateau'], 'a delivery action realizes its plateau');
  const delivered = objIds.filter(oid => D.edges.some(e => e.id === 'c:ACT-1>' + oid));
  assert.ok(delivered.length >= 2, 'the action delivers records drawn on the picture: ' + delivered.join(', '));
  for (const oid of delivered) assert.equal(rel('c:ACT-1>' + oid)?.[0], 'Realization', `a delivery action realizes ${oid} (${typeOfEl.get(oid)}), derived through its deliverable`);
  assert.ok(Array.isArray(code.report.omitted) && !code.report.omitted.some(o => /^c:(MG-1|ACT-1)/.test(o.id)), 'none of them is reported as a relationship the standard does not allow: ' + JSON.stringify(code.report.omitted?.filter(o => /^c:(MG-1|ACT-1)/.test(o.id))));
  const X2 = archimateExchange(p2), road = [...X2.document.matchAll(/<relationship identifier="([^"]+)" xsi:type="(\w+)"/g)].map(m => [decode(m[1]), m[2]]).filter(([rid]) => rid.startsWith('roadmap:'));
  assert.deepEqual(road.filter(([rid]) => rid === 'roadmap:PL-A>PL-B' || rid.endsWith(':towards')).map(([rid, t]) => rid + ' ' + t), ['roadmap:PL-A>PL-B Triggering', 'roadmap:ACT-1:towards Triggering'], 'the roadmap keeps its triggerings');
  assert.equal(X2.report.roadmap.downgraded, 0, 'the roadmap reports no downgraded relationship');
  checkArchiMate(X2.document, 'the model with a roadmap');
  pass(`Implementation & Migration: Chapter 11's migration MG-1 (Plateau → Plateau Triggering), ACT-1 realizing its plateau and ${delivered.length} delivered records (Realization) keep their types in the picture's ArchiMate exchange; the model's roadmap keeps its Plateau → Plateau and WorkPackage → Plateau triggerings, nothing downgraded`);
}

// 4. The SDD figures: the reviewed pictures, deterministic, hashed, placed under their chapters.
{
  const F = sddFigures(project), G = sddFigures(project);
  assert.equal(F.figures.length, SCENES.filter(s => notationDiagram(project, s.id).nodes.length).length, 'every scene that draws is a figure');
  assert.ok(F.figures.some(f => f.scene === 'sequence' && f.chapter === 1) && F.figures.some(f => f.scene === 'lifecycle' && f.chapter === 8), 'the sequence (under Chapter 1, where it is first offered) and the lifecycle (Chapter 8) are figures'); assert.deepEqual(F.figures.map(f => f.sha256), G.figures.map(f => f.sha256), 'the same document gives the same figures');
  for (const f of F.figures) {
    assert.equal(f.sha256, sha(f.svg)); assert.equal(f.bytes, Buffer.byteLength(f.svg));
    assert.ok(f.svg.startsWith('<svg') && /role="img"/.test(f.svg) && /<title id="f\d+-title">Figure \d+ · Chapter \d+/.test(f.svg) && /<desc id="f\d+-desc">/.test(f.svg) && /class="nt-keygroup"/.test(f.svg), f.scene + ': titled, described, with its Key');
    // Round 12 (P): the figure is drawn for the printed page (its width, its rows and the print floor), so it is drawn the
    // same way here; its footer may wrap onto several lines.
    // rc41 (W1): and shaped for the page's stage where the shaping holds the page (sdd-figures.js shapedOrNot), which the
    // figure records (`print.stage`, null when it was laid out as before rc41), so it is laid out again with the same stage.
    const D = printNotes(notationDiagram(project, f.scene)), L = notationLayout(D, {arrangement: f.arrangement, page: printPage(f.print.page), ...(f.print.stage ? {stage: f.print.stage} : {})});
    const footer = [...f.svg.matchAll(/class="nt-foot">([^<]*)</g)].map(m => m[1]).join(' ').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    assert.equal(f.svg, notationSVG(D, L, {prefix: 'f' + f.n, title: f.caption, desc: f.text, footer, print: true}), f.scene + ': the figure is the screen renderer’s picture, drawn for the printed page');
    assert.ok(f.print.widthPx <= PRINT.width && f.print.minLabelPt >= PRINT.minPt, f.scene + `: ${f.print.widthPx} px wide, no word under ${PRINT.minPt} pt at A4 width (${f.print.minLabelPt} pt)`);
  }
  assert.deepEqual(F.manifest.map(m => m.sha256), F.figures.map(f => f.sha256)); assert.match(F.documentFingerprint, /^[0-9a-f]{64}$/);
  const md = exportSDD(project), html = renderSDD(md, logicalGraph(project), {figures: F});
  assert.equal((html.match(/<figure class="model-figure notation-figure"/g) || []).length, F.figures.length);
  for (const f of F.figures) assert.ok(html.includes(`data-sha256="${f.sha256}"`), f.scene + ' is in the document with its hash');
  const main = html.indexOf('<main>'), ch4 = html.indexOf('>Chapter 4 — ', main), ch5 = html.indexOf('>Chapter 5 — ', main), fig = html.indexOf('data-scene="logical"');
  assert.ok(ch4 > 0 && fig > ch4 && fig < ch5, 'the logical figure stands under the Chapter 4 register');
  assert.match(html, /Architecture figures<\/h2>[\s\S]*<table class="figure-manifest">/); assert.ok(!/<script/i.test(html), 'no script in the document');
  assert.ok(renderSDD(md, logicalGraph(project)).includes('Architecture atlas'), 'without figures the document keeps its atlas');
  const M = figureManifest([{path: 'a.svg', text: F.figures[0].svg}], F.documentFingerprint); assert.equal(M[0].sha256, F.figures[0].sha256);
  pass(`the SDD carries ${F.figures.length} figures drawn by the screen renderer at each scene's arrangement, the same bytes every time, each under its chapter register with its caption, text alternative and SHA-256, and the manifest with the source document's fingerprint`);
}

// 5. The reading an assistant may explain: complete, serialisable, and read-only.
{
  const D = notationDiagram(project, 'security'), L = notationLayout(D, {arrangement: 'grouped'});
  const R = explainDiagram(D, L, {chapter: 9, hiddenLayers: [], selection: 'api-pod'});
  assert.equal(R.schema, 'aiw.diagram-reading/1'); assert.equal(R.nodes.length, D.nodes.length); assert.equal(R.edges.length, D.edges.length);
  assert.ok(R.edges.every(e => e.archimate && e.reading) && R.nodes.every(n => n.reading && n.kicker), 'every element and relationship with its reading');
  assert.ok(R.key.elements.length && R.text.startsWith('Security & trust') && /never changes the picture or the model/.test(R.disclosure));
  assert.equal(JSON.stringify(JSON.parse(JSON.stringify(R))), JSON.stringify(R), 'serialisable');
  assert.ok(!('x' in R.nodes[0]) && !('pts' in R.edges[0]), 'positions are not offered as facts');
  // Round 10: a relationship drawn on one line with others says which line and which others; the measures say how many
  // lines were drawn together. One entry per relationship, and no route or position anywhere in the packet.
  let together = 0;
  for (const s of SCENES) {
    const Ds = notationDiagram(project, s.id), Ls = notationLayout(Ds, {arrangement: s.arrangement}), Rs = explainDiagram(Ds, Ls), json = JSON.stringify(Rs), lineOf = new Map(Ls.bundles.flatMap(b => b.members.map(id => [id, b])));
    assert.deepEqual(Rs.edges.map(e => e.id), Ds.edges.map(e => e.id), s.id + ': one entry per relationship');
    assert.ok(!/"(pts|branch|runs|x|y|lx|ly|qx|qy)":|"joins":\[/.test(json), s.id + ': no route or position in the packet (joins only as a count)');
    for (const e of Rs.edges) { const b = lineOf.get(e.id); assert.deepEqual(e.bundle, b ? {id: b.id, end: b.end, with: b.members.filter(m => m !== e.id)} : null, s.id + ': ' + e.id + ' names the line it is drawn on'); if (b) together++; }
    const C = Ls.consolidation; assert.deepEqual(Rs.measures.consolidation, {bundles: C.bundles, joins: C.joins, duplicates: C.duplicates, fallback: C.fallback}, s.id + ': the measures count what was drawn together');
    assert.equal(Rs.key.marks.includes(Rs.key.marks.find(m => /drawing join/.test(m))), Ls.bundles.some(b => b.end !== 'both' && b.dotted), s.id + ': the packet’s Key explains the join dot if and only if one is drawn');
  }
  assert.ok(together > 50, 'relationships drawn together name their line: ' + together);
  pass('the reading packet (explainDiagram) carries the viewpoint, every element and relationship with its ArchiMate type and plain reading, the Key, the notes, the selection and the text alternative, serialisable and without positions as facts; and (round 10) for ' + together + ' relationships drawn on one line with others, that line and the others, with what was drawn together in the measures, never a route');
}

// 6. Edge ends the reference project does not exercise (cardinality, both ends, a boundary crossing) and a blank project.
{
  const scene = {id: 'deployment', title: 'Synthetic', standard: 'test', arrangement: 'tree', purpose: 'p', audience: 'a'};
  const n = (id, kind, group = null) => ({id, kind, kicker: KINDS_KICKER[kind], family: 'application', layer: 'deployment', level: 2, title: id, fullTitle: id, sub: '', ref: '', group, hatched: false});
  const D = {scene, nodes: [n('a', 'physicalApp', 'b1'), n('b', 'physicalTech', 'b2')], groups: [{id: 'b1', kind: 'boundary', layer: 'security', title: 'Zone one', sub: '', parent: null}, {id: 'b2', kind: 'boundary', layer: 'security', title: 'Zone two', sub: '', parent: null}], edges: [{id: 'e1', from: 'a', to: 'b', label: 'stands on', kind: 'standsOn', family: 'assignment', ends: 'both', qualifier: 'compute', cardinality: {from: '3', to: '2'}, weak: false, up: false, crossing: true}], notes: [], header: {model: 'Synthetic'}, counts: {nodes: 2, edges: 1, groups: 2}};
  const L = notationLayout(D, {arrangement: 'grouped'}), svg = notationSVG(D, L), e = L.edges[0];
  assert.ok(Number.isFinite(e.cfx) && Number.isFinite(e.ctx) && Number.isFinite(e.mx) && Number.isFinite(e.qx), 'cardinality, crossing and qualifier have places');
  assert.ok(/class="nt-card">3</.test(svg) && /class="nt-card">2</.test(svg) && /class="nt-cross"/.test(svg) && /class="nt-qual"[^>]*>compute</.test(svg), 'the export draws the cardinality at each end, the crossing mark and the qualifier');
  assert.ok(/marker-start="url\(#nx-[a-z-]+-3c4a44\)"/.test(svg) && /marker-end="url\(#nx-filled-3c4a44\)"/.test(svg), 'and both ends');
  assert.match(explainDiagram(D, L).edges[0].reading, /3 : 2[\s\S]*Assignment relationship[\s\S]*crossing a trust boundary/);
  const blank = (await import('./shared/projects-domain.js')).createProject({name: 'Blank', template: 'blank'}, 'blank-code');
  const F = sddFigures(blank); assert.equal(F.figures.length, 0); assert.equal(F.omitted.length, SCENES.length, 'a blank project has no figures and says why for each');
  for (const s2 of SCENES) { const B = notationDiagram(blank, s2.id), BL = notationLayout(B, {}); for (const f of CODE_FORMATS) if (!f.scenes || f.scenes.includes(s2.id)) assert.ok(codeFile(f.id, B, BL, {project: blank}).text.length > 0); assert.ok(notationSVG(B, BL).startsWith('<svg')); }
  pass('an edge with a cardinality, both ends, a qualifier and a boundary crossing draws all four in the export and reads them aloud; a blank project yields no figures (each omission said) and every exporter still writes a file');
}

// 7. Round 6 (Contract T): the BPMN export carries the process semantics (participants, message flows, event definitions,
//    gateway types, sub-processes, data objects); Mermaid and PlantUML write the sequence picture as a sequenceDiagram and
//    the lifecycle as a stateDiagram-v2, structurally sound; the C4, draw.io and ArchiMate reports say what they carry.
{
  const at = '2026-10-02T12:00:00.000Z', party = project.interfaces.parties.find(x => x.id === 'ext-network'), contract = project.interfaces.contracts.find(c => c.id === 'network'), data = project.interfaces.data.find(d => d.id === 'settlement');
  // A process on the reference project, through the process commands (the exporters are under test here, not the review).
  let q = project;
  const add = (type, payload) => { q = applyProcessCommand(q, {type, payload}, at).document; return (type === 'process.element' ? q.processModel.elements : q.processModel.transitions).at(-1).id; };
  const start = add('process.element', {kind: 'event', title: 'Enquiry requested', eventType: 'message', position: 'start', lane: 'Payments'});
  const sub = add('process.element', {kind: 'subprocess', title: 'Reconcile the outcome', lane: 'Payments'});
  const ask = add('process.element', {kind: 'task', title: 'Ask the network', parentId: sub, lane: 'Payments'});
  const wait = add('process.element', {kind: 'task', title: 'Wait for the answer', parentId: sub, lane: 'Payments'});
  const timeout = add('process.element', {kind: 'event', title: 'No answer in time', eventType: 'timer', position: 'boundary', attachedTo: wait});
  const split = add('process.element', {kind: 'gateway', title: 'Post and tell', gatewayType: 'parallel', lane: 'Payments'});
  const post = add('process.element', {kind: 'task', title: 'Post the outcome', lane: 'Payments'});
  const tell = add('process.element', {kind: 'task', title: 'Tell the customer', lane: 'Channel'});
  const join = add('process.element', {kind: 'gateway', title: 'Both done', gatewayType: 'parallel', lane: 'Payments'});
  const done = add('process.element', {kind: 'event', title: 'Outcome known', position: 'end', lane: 'Payments'});
  const failed = add('process.element', {kind: 'event', title: 'Still unknown', position: 'end', eventType: 'error', lane: 'Payments'});
  const answer = add('process.element', {kind: 'task', title: 'Answer the enquiry', partyId: party.id});
  add('process.element', {kind: 'data', title: 'Settlement record', dataId: data.id});
  for (const [from, to, label, extra] of [[start, 'JRN-005', 'Enquire'], ['JRN-005', sub, 'Reconcile'], [ask, wait, 'Asked'], [sub, split, 'Reconciled'], [split, post, 'Post'], [split, tell, 'Tell'], [post, join, 'Posted'], [tell, join, 'Told'], [join, done, 'Done'], [timeout, failed, 'Timed out'], [ask, answer, 'Enquiry', {kind: 'message', contractId: contract.id}]]) add('process.transition', {from, to, label, ...(extra || {})});
  const D = notationDiagram(q, 'process'), L = notationLayout(D, {arrangement: 'lanes'}), bp = diagramCode('bpmn', D, L, {project: q}).document, n = t => (bp.match(new RegExp('<' + t + ' ', 'g')) || []).length;
  const B = Object.fromEntries(['participant', 'messageFlow', 'timerEventDefinition', 'messageEventDefinition', 'errorEventDefinition', 'parallelGateway', 'exclusiveGateway', 'subProcess', 'boundaryEvent', 'startEvent', 'endEvent', 'dataObject', 'dataObjectReference', 'dataOutputAssociation'].map(t => [t, n(t)]));
  assert.ok(B.participant >= 3 && bp.includes(`name="${party.title}"`), 'a participant per pool, the external party among them: ' + JSON.stringify(B));
  assert.ok(B.messageFlow >= 2 && B.timerEventDefinition === 1 && B.messageEventDefinition === 1 && B.errorEventDefinition === 1 && B.parallelGateway === 2 && B.exclusiveGateway === 2 && B.subProcess === 1 && B.boundaryEvent === 1 && B.startEvent === 2 && B.endEvent === 5 && B.dataObject === 1 && B.dataObjectReference === 1, 'message flows, event definitions, gateway types, the sub-process, the boundary event and the data object: ' + JSON.stringify(B));
  assert.match(bp, /<boundaryEvent id="[^"]+" name="No answer in time" attachedToRef="[^"]+" cancelActivity="true">(?:<outgoing>[^<]+<\/outgoing>)?<timerEventDefinition /, 'the boundary event is attached to its task and carries its timer');
  assert.match(bp, /<subProcess id="[^"]+" name="Reconcile the outcome">[\s\S]*?<task id="[^"]+" name="Ask the network">[\s\S]*?<task id="[^"]+" name="Wait for the answer">[\s\S]*?<\/subProcess>/, 'the sub-process holds its tasks');
  assert.match(bp, new RegExp(`<messageFlow id="[^"]+" sourceRef="[^"]+" targetRef="[^"]+" name="${contract.ref}"/>`), 'the message flow is named by its contract');
  const ids = new Set([...bp.matchAll(/ id="([^"]+)"/g)].map(m => m[1])); assert.equal(ids.size, (bp.match(/ id="/g) || []).length, 'BPMN identifiers are unique');
  for (const m of bp.matchAll(/(?:sourceRef|targetRef|attachedToRef|processRef|dataObjectRef)="([^"]+)"/g)) assert.ok(ids.has(m[1]), m[1] + ' resolves');
  assert.equal(n('bpmndi:BPMNShape'), D.nodes.length + D.groups.length, 'a DI shape for every node, lane, pool and sub-process');
  // Mermaid: the sequence of the settlement contract, every participant declared before use, every message numbered in order.
  const S = notationDiagram(project, 'sequence', {objectId: 'network'}), SL = notationLayout(S, {arrangement: 'sequence'}), ms = diagramCode('mermaid', S, SL, {project}).document;
  assert.ok(ms.startsWith('sequenceDiagram\n'), 'a sequenceDiagram');
  const parts = [...ms.matchAll(/^ {2}participant (aiw_[0-9a-f]+) as /gm)].map(m => m[1]); assert.equal(parts.length, S.nodes.length, 'a participant per lifeline');
  const msgs = [...ms.matchAll(/^ {2}(aiw_[0-9a-f]+)(->>|-->>)(aiw_[0-9a-f]+): (\d+)\. /gm)]; assert.equal(msgs.length, S.edges.length, 'a line per message');
  msgs.forEach((m, i) => { assert.ok(parts.includes(m[1]) && parts.includes(m[3]), 'both ends declared'); assert.equal(Number(m[4]), i + 1, 'numbered in order'); assert.equal(m[2], S.edges[i].reply ? '-->>' : '->>', 'a response is dashed'); });
  const SA = notationDiagram(project, 'sequence'), msA = diagramCode('mermaid', SA, notationLayout(SA, {arrangement: 'sequence'}), {project}).document;
  assert.equal((msA.match(/^ {2}aiw_[0-9a-f]+-?->>aiw_[0-9a-f]+: /gm) || []).length, SA.edges.length, 'the whole sequence writes every message');
  const C = notationDiagram(project, 'lifecycle'), CL = notationLayout(C, {arrangement: 'grouped'}), st = diagramCode('mermaid', C, CL, {project}).document;
  assert.ok(st.startsWith('stateDiagram-v2\n'), 'a stateDiagram-v2');
  const states = new Set([...st.matchAll(/state "[^"]*" as (aiw_[0-9a-f]+)/g)].map(m => m[1])); assert.equal(states.size, C.nodes.length + C.groups.length, 'every state and every data definition declared');
  assert.equal((st.match(/\[\*\] --> aiw_/g) || []).length, C.groups.length || 1, 'each data definition starts from [*]');
  const moves = [...st.matchAll(/^ {2}(aiw_[0-9a-f]+) --> (aiw_[0-9a-f]+): (.+)$/gm)]; assert.equal(moves.length, C.edges.length);
  for (const m of moves) { assert.ok(states.has(m[1]) && states.has(m[2]), 'a transition joins two declared states'); assert.match(m[3], /^IF-\d{3}$/, 'labelled by its contract'); }
  assert.equal((st.match(/\{/g) || []).length, (st.match(/\}/g) || []).length, 'composite states close');
  // PlantUML: the same two diagrams in its own syntax.
  const pu = diagramCode('plantuml', S, SL, {project}).document, ps = diagramCode('plantuml', C, CL, {project}).document;
  assert.ok(pu.startsWith('@startuml\n') && pu.endsWith('@enduml\n') && ps.startsWith('@startuml\n') && ps.endsWith('@enduml\n'));
  assert.equal((pu.match(/^(?:participant|database) "[^"]*" as aiw_/gm) || []).length, S.nodes.length); assert.equal((pu.match(/^aiw_[0-9a-f]+ -{1,2}> aiw_[0-9a-f]+ : \d+\. /gm) || []).length, S.edges.length);
  assert.equal((ps.match(/^\s*state "[^"]*" as aiw_/gm) || []).length, C.nodes.length + C.groups.length); assert.equal((ps.match(/^\s*aiw_[0-9a-f]+ --> aiw_[0-9a-f]+ : /gm) || []).length, C.edges.length);
  // The other formats say what the new pictures carry; the process picture's report keeps its own lines.
  for (const f of ['structurizr', 'drawio', 'archimate']) assert.ok(diagramCode(f, S, SL, {project}).report.limits.some(l => /sequence/i.test(l)) && diagramCode(f, C, CL, {project}).report.limits.some(l => /lifecycle/i.test(l)), f + ': the report says what a sequence or lifecycle picture carries');
  assert.ok(!diagramCode('mermaid', D, L, {project: q}).report.limits.some(l => /sequenceDiagram/.test(l)));
  pass(`round 6: BPMN carries ${B.participant} participants, ${B.messageFlow} message flows, timer, message and error event definitions, ${B.parallelGateway} parallel and ${B.exclusiveGateway} exclusive gateways, a subProcess with its tasks, a boundaryEvent on its task and a dataObjectReference, every reference resolving; Mermaid writes the sequence as a sequenceDiagram (${parts.length} participants, ${msgs.length} messages numbered 1..n, responses dashed) and the lifecycle as a stateDiagram-v2 (${states.size} states and composites, ${moves.length} transitions by contract); PlantUML the same; the C4, draw.io and ArchiMate reports say what they carry`);
}

assert.equal(JSON.stringify(project), before, 'the project is not changed');
console.log(JSON.stringify({suite: 'standard diagrams (code, exchange, SDD figures)', passed: checks.length, checks}, null, 2));
