// Chapter 4–8 model views (v20.5): the model-level fixes behind the rendered views.
// - a "propose a realisation" for one open capability targets that capability, not the first open one;
// - a component's strip names only the product Chapter 7 has chosen, and says when candidates are open;
// - the options matrix shares the stage's width without exceeding a readable column;
// - the stack has no column for what the rail already says.
// Run: npm run test:model-views
import assert from 'node:assert/strict';
import {seedProject} from './public/requirements-domain.js';
import {withFinalReview} from './public/review-domain.js';
import {technologyRealisationProposal, applyTechnologyRealisationCommand, realization} from './public/technology-realisation-domain.js';
import {capabilities} from './public/technology-domain.js';
import {productLabels, productCandidates} from './public/spec-panel.js';
import {stackSource, optionsFor} from './public/stack-model.js';
import {optionsLayout, STACK_COLS, OX} from './public/stack-layout.js';

const checks = [], pass = name => checks.push(name);
const project = withFinalReview(seedProject()), before = JSON.stringify(project);

// 1. A proposal for a missing realisation targets the capability it was asked for.
{
  const p = JSON.parse(before), caps = capabilities(p);
  assert.ok(caps.length >= 3, 'the reference project records capabilities');
  // Open two capabilities: remove their mappings, so both wait for a realisation.
  const [a, b] = [caps[1].id, caps[2].id];
  p.technologyRealisation.mappings = p.technologyRealisation.mappings.filter(m => m.capabilityId !== a && m.capabilityId !== b);
  const first = technologyRealisationProposal(p, 'missing'), forB = technologyRealisationProposal(p, 'missing', b), forA = technologyRealisationProposal(p, 'missing', a);
  assert.equal(first.objectId, a, 'without a target, the first open capability');
  assert.equal(forB.objectId, b, 'with a target, that capability'); assert.equal(forB.mappings[0].capabilityId, b);
  assert.equal(forA.objectId, a);
  const mapped = caps[0].id;
  assert.equal(technologyRealisationProposal(p, 'missing', mapped).objectId, a, 'a capability that is already realised falls back to the first open one');
  const q = applyTechnologyRealisationCommand(p, {type: 'techrealisation.proposal', payload: {key: 'missing', objectId: b, reviewed: true, record: forB.record, mappings: forB.mappings}}).document;
  assert.ok(q.technologyRealisation.mappings.some(m => m.capabilityId === b), 'accepting it maps the capability it was asked for');
  assert.ok(!q.technologyRealisation.mappings.some(m => m.capabilityId === a), 'and not the other');
  pass('a proposal for a missing realisation targets the capability it was asked for, falls back to the first open one only when that capability is already realised, and accepting it maps that capability');
}

// 2. The strip names a product only where Chapter 7 has chosen it.
{
  const p = JSON.parse(before), S = stackSource(p), rs = [...S.R.values()];
  assert.ok(rs.every(r => !realization(p, r.id).selectedOptionId), 'nothing is chosen in the reference project');
  const withNeeds = [...new Set((p.technology?.needs || []).map(n => n.applicationId))];
  const any = withNeeds.find(id => productCandidates(p, id).size);
  assert.ok(any, 'a component has candidates');
  assert.equal(productLabels(p, any).size, 0, 'no product is named while none is chosen');
  const cands = productCandidates(p, any);
  assert.ok([...cands.values()].every(n => n >= 1), 'each open capability counts its candidate products');
  const cap = [...cands.keys()][0], rid = p.technologyRealisation.mappings.find(m => m.capabilityId === cap).realizationId, rec = realization(p, rid);
  const q = applyTechnologyRealisationCommand(p, {type: 'techrealisation.preference', payload: {id: rid, optionId: rec.options[0].id}}).document;
  const labels = productLabels(q, any);
  assert.equal(labels.get(cap), rec.options[0].product, 'once an option is preferred, its product is named');
  assert.ok(!productCandidates(q, any).has(cap), 'and the capability no longer counts as open');
  pass('a component strip names no product until Chapter 7 chooses one; until then each capability says how many candidates are open; a preferred option names its product');
}

// 3. The options matrix shares the width it is given, within readable bounds.
{
  const S = stackSource(project), id = [...S.R.keys()][0], G = optionsFor(S, id);
  const narrow = optionsLayout(G, {viewW: 600}), wide = optionsLayout(G, {viewW: 1600}), none = optionsLayout(G);
  assert.equal(none.cols[0].w, OX.COL_W, 'without a width, the default column');
  assert.equal(narrow.cols[0].w, OX.COL_W, 'a narrow stage never squeezes a column below the default');
  assert.ok(wide.cols[0].w > OX.COL_W && wide.cols[0].w <= OX.COL_MAX, 'a wide stage widens the columns, to a readable maximum');
  assert.equal(wide.cols[0].w, Math.min(OX.COL_MAX, Math.floor((1600 - OX.RAIL - 34) / G.cols.length)));
  assert.ok(!STACK_COLS.some(c => c.id === 'realises'), 'the stack has no column for what the rail says');
  pass('the options matrix widens its columns to the stage it has, never below the default nor above a readable maximum, and the stack has no duplicate "realises" column');
}

assert.equal(JSON.stringify(project), before, 'the reference project is not changed');
console.log(JSON.stringify({suite: 'chapter 4–8 model views', passed: checks.length, checks}, null, 2));
