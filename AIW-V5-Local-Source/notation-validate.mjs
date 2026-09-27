// The standard diagrams' projection: every scene of the reference project, its kickers, its edge
// words, its groups, and that nothing is drawn the project does not record.
// Run: npm run test:notation
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {createProject} from './public/projects-domain.js';
import {notationDiagram, notationScenes, stripToLayers, describeNode, SCENES, KINDS, LAYERS, ARRANGEMENTS} from './public/notation-model.js';

const checks = [], pass = name => checks.push(name);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);
const kinds = D => [...new Set(D.nodes.map(n => n.kind))].sort();
const words = D => [...new Set(D.edges.map(e => e.label))].sort();

// 1. Every chapter has a scene; every scene of the reference project draws, and only from records.
for (let ch = 1; ch <= 11; ch++) assert.ok(notationScenes(ch).length >= 1, 'chapter ' + ch + ' has a scene');
for (const s of SCENES) {
  const D = notationDiagram(project, s.id);
  assert.ok(D && D.scene.id === s.id, s.id);
  for (const n of D.nodes) { assert.ok(KINDS[n.kind], s.id + ': kind ' + n.kind); assert.ok(LAYERS.includes(n.layer)); assert.ok(n.title); if (n.group) assert.ok(D.groups.some(g => g.id === n.group), s.id + ': group of ' + n.id); }
  for (const e of D.edges) { assert.ok(D.nodes.some(n => n.id === e.from) && D.nodes.some(n => n.id === e.to), s.id + ': edge ends ' + e.id); assert.ok(e.label || e.kind === 'sequence', s.id + ': every edge carries its word (a sequence flow may be unlabelled)'); }
  for (const g of D.groups) if (g.parent) assert.ok(D.groups.some(x => x.id === g.parent), s.id + ': parent group');
  assert.ok(ARRANGEMENTS.some(a => a.id === s.arrangement), s.id + ': opens on a known arrangement');
  assert.equal(D.header.model, 'Bank Payment Journey'); assert.equal(D.header.author, '', 'no author is invented');
}
pass('all 12 scenes of Chapters 1 to 11 draw from the reference project: every element has a standard kind and a layer, every edge joins two drawn elements and carries its word, every group exists, and the header says only what the project records');

// 2. The application architecture, as the standard draws it.
{
  const D = notationDiagram(project, 'application');
  assert.deepEqual(kinds(D), ['appService', 'logicalApp', 'physicalApp']);
  assert.equal(D.nodes.filter(n => n.kind === 'physicalApp' && !n.id.startsWith('party:')).length, 6, 'the application and its five components');
  assert.equal(D.nodes.filter(n => n.id.startsWith('party:')).length, 1, 'the one external caller is an application outside ours');
  assert.equal(D.nodes.filter(n => n.kind === 'logicalApp').length, 5, 'the five responsibilities');
  assert.equal(D.nodes.filter(n => n.kind === 'appService').length, 7, 'the seven contracts as application services');
  assert.ok(D.edges.filter(e => e.label === 'realizes').length >= 10, 'the application realizes its components; each component realizes its responsibility');
  assert.ok(D.edges.some(e => e.label === 'implements') && D.edges.some(e => e.label === 'uses'), 'services are implemented and used');
  assert.equal(D.groups.filter(g => g.kind === 'external').length, 3, 'the three external participants are external systems');
  assert.ok(D.groups.filter(g => g.kind === 'module').length === 3, 'the three modules are groups');
  const api = D.nodes.find(n => n.id === 'api-pod'); assert.equal(api.kicker, 'Physical application component'); assert.equal(api.ref, 'APP-001'); assert.equal(api.group, 'GRP-001');
  assert.match(describeNode(D, 'api-pod'), /Physical application component APP-001: Payment service[\s\S]*realizes Payment API/);
  pass('Chapter 5’s Application architecture: the application, five physical components realizing five logical components, seven application services implemented and used, three external systems, three modules');
}

// 3. Solution architecture and technology realization.
{
  const S = notationDiagram(project, 'solution'), T = notationDiagram(project, 'stack');
  assert.deepEqual(kinds(S), ['logicalTech', 'physicalApp', 'techService']);
  assert.equal(S.nodes.filter(n => n.layer === 'technology').length, 9, 'nine capabilities');
  assert.ok(S.nodes.some(n => n.kind === 'techService' && /connectivity|identity/i.test(n.title)), 'connectivity and identity are technology services');
  assert.ok(S.edges.filter(e => e.label === 'is served by').length >= 20, 'components are served by the capabilities they need');
  assert.equal(S.edges.filter(e => e.label === 'depends on').length, 4, 'the four recorded dependencies');
  assert.equal(S.groups.filter(g => g.kind === 'family').length, 5, 'the five families group the capabilities');
  assert.equal(T.nodes.filter(n => n.kind === 'physicalTech').length, 9, 'nine realisations as physical technology components');
  assert.ok(T.nodes.filter(n => n.kind === 'physicalTech').every(n => n.hatched && /No choice yet · 2 options/.test(n.sub)), 'none chosen: hatched, with the count of options');
  assert.equal(T.edges.filter(e => e.label === 'implemented by').length, 9);
  pass('Chapter 6’s Solution architecture serves five components from nine capabilities in five families with four dependencies; Chapter 7’s realization draws nine physical technology components, hatched while no choice is made');
}

// 4. Integration, data & authority, security, deployment, process, rationale.
{
  const I = notationDiagram(project, 'integration');
  assert.equal(I.nodes.filter(n => n.kind === 'appService').length, 7 + 0, 'seven services'); assert.ok(I.groups.some(g => g.kind === 'external'));
  assert.ok(I.edges.some(e => e.label === 'uses' && e.from.startsWith('party:')), 'an external caller uses a service');
  const Dd = notationDiagram(project, 'data');
  assert.equal(Dd.nodes.filter(n => n.kind === 'logicalData').length, 4, 'four data definitions');
  assert.ok(Dd.nodes.some(n => n.kind === 'physicalData'), 'the state realisations are physical data components');
  assert.ok(Dd.edges.filter(e => e.label === 'owns').length >= 4 && Dd.edges.some(e => e.label === 'exchanges'), 'authorities own; services exchange');
  const Sx = notationDiagram(project, 'security');
  assert.equal(Sx.groups.filter(g => g.kind === 'boundary').length, 3); assert.equal(Sx.nodes.filter(n => n.kind === 'control').length, 3); assert.equal(Sx.nodes.filter(n => n.kind === 'threat').length, 4);
  assert.ok(Sx.edges.some(e => e.label === 'protects') && Sx.edges.some(e => e.label === 'mitigates') && Sx.edges.some(e => e.label === 'threatens'));
  const Dp = notationDiagram(project, 'deployment');
  assert.equal(Dp.environmentId, 'env-001'); assert.equal(Dp.groups.filter(g => g.kind === 'zone').length, 2, 'two zones');
  assert.equal(Dp.nodes.filter(n => n.kind === 'physicalApp' && !n.hatched).length, 3, 'three placed components');
  assert.ok(Dp.groups.some(g => g.kind === 'unplaced') && Dp.nodes.filter(n => n.group?.startsWith('unplaced:')).length === 11, 'two components and nine platform services wait in Not placed');
  assert.ok(Dp.edges.filter(e => e.kind === 'path').every(e => Number.isInteger(e.step)), 'runtime paths are numbered');
  assert.ok(Dp.notes.length >= 1, 'a path whose end has no placement is said, not drawn');
  const Pr = notationDiagram(project, 'process');
  assert.equal(Pr.groups.filter(g => g.kind === 'lane').length >= 2, true); assert.ok(Pr.nodes.some(n => n.kind === 'gateway') && Pr.nodes.some(n => n.kind === 'event') && Pr.nodes.filter(n => n.kind === 'task').length === 5);
  assert.ok(Pr.edges.length >= 10 && Pr.edges.every(e => e.kind === 'sequence'));
  const R = notationDiagram(project, 'rationale');
  assert.ok(R.nodes.some(n => n.kind === 'requirement') && R.nodes.some(n => n.kind === 'decision') && R.edges.some(e => e.label === 'fulfilled by'));
  pass('Integration, Data & authority, Security & trust, Deployment (with numbered paths and an honest Not placed), Process swimlanes and Design rationale each draw their standard elements from the records');
}

// 5. Layers strip a diagram; a blank project draws nothing and says so.
{
  const D = notationDiagram(project, 'application'), S = stripToLayers(D, ['physical']);
  assert.ok(S.nodes.every(n => n.layer === 'physical') && S.edges.every(e => e.label === 'realizes' || e.kind === 'flow'), 'only the physical components and what joins them');
  assert.equal(S.counts.hidden, D.nodes.length - S.nodes.length);
  const S2 = stripToLayers(D, ['physical', 'interface']);
  assert.ok(S2.nodes.some(n => n.kind === 'appService') && S2.groups.some(g => g.kind === 'external') && !S2.groups.some(g => g.kind === 'module'), 'the modules open up; the external systems stay');
  const blank = createProject({name: 'Blank', template: 'blank'}, 'blank-notation');
  for (const s of SCENES) { const B = notationDiagram(blank, s.id); assert.equal(B.nodes.length, 0, s.id + ' draws nothing for a blank project'); assert.ok(B.notes.length >= 1 || ['drivers', 'decisions', 'rationale', 'integration', 'data', 'security'].includes(s.id), s.id + ' says why'); }
  pass('the model layers strip a diagram to what is wanted, groups of a stripped layer open up, and a blank project draws nothing');
}

assert.equal(JSON.stringify(project), before, 'the project is not changed');
console.log(JSON.stringify({suite: 'standard diagrams (projection)', passed: checks.length, checks}, null, 2));
