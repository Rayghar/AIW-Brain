import assert from 'node:assert/strict';
import {createProjectStore} from './public/project-store.js';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {previewWorkingChange} from './public/workbench-domain.js';
import {STAGED_COMMANDS} from './public/canonical-command.js';
import {realizationCriteria} from './public/technology-realisation-domain.js';
import {LOGICAL_LIMITS} from './public/logical-domain.js';

// Exercise the client boundary: a failed or conflicting save must retain the last
// saved model, show failure, and use the refreshed revision for a deliberate retry.
const originalFetch=globalThis.fetch;
try{
  const store=createProjectStore();
  globalThis.fetch=async()=>Response.json({revision:3,document:{name:'Saved project'}});
  await store.load();
  let finish;
  globalThis.fetch=()=>new Promise(resolve=>{finish=resolve});
  const pending=store.command({type:'example',payload:{name:'New draft'}});
  assert.equal(store.status,'saving');
  assert.equal(store.value.document.name,'Saved project');
  finish(Response.json({error:'Another tab saved first.'},{status:409}));
  await assert.rejects(pending,e=>e.conflict===true);
  assert.equal(store.status,'error');
  assert.equal(store.value.revision,3);
  assert.equal(store.value.document.name,'Saved project');
  globalThis.fetch=async()=>Response.json({revision:4,document:{name:'Other saved revision'}});
  await store.load();
  globalThis.fetch=async(path,options)=>{
    assert.equal(JSON.parse(options.body).revision,4);
    return Response.json({revision:5,document:{name:'Reviewed retry'}});
  };
  await store.command({type:'example',payload:{name:'Reviewed retry'}});
  assert.equal(store.status,'saved');
  assert.equal(store.value.document.name,'Reviewed retry');
  globalThis.fetch=async()=>new Response('Temporary outage',{status:503});
  await assert.rejects(store.command({type:'example'}),/input is still here/);
  assert.equal(store.status,'error');
  assert.equal(store.value.revision,5);
  // A response lost on the way back is retried once with the same request key, so the server can answer it
  // from its receipt instead of applying the change twice (audit C-27).
  const keys=[];let calls=0;
  globalThis.fetch=async(path,options)=>{keys.push(options.headers['Idempotency-Key']);if(++calls===1)throw TypeError('Failed to fetch');return Response.json({revision:6,document:{name:'Saved once'},replayed:true});};
  await store.command({type:'example',payload:{name:'Saved once'}});
  assert.equal(calls,2);assert.equal(keys[0],keys[1]);assert.match(keys[0],/^[a-f0-9]{32}$/);assert.equal(store.value.revision,6);assert.equal(store.status,'saved');
  globalThis.fetch=async(path,options)=>{keys.push(options.headers['Idempotency-Key']);return Response.json({revision:7,document:{name:'Next'}});};
  await store.command({type:'example'});assert.notEqual(keys.at(-1),keys[0],'each new change has its own key');
  console.log('PASS Workspace client: visible pending/saved/error states, last-good project preservation, conflict recovery, current-revision retry, invalid-response handling, and a lost response retried once under the same request key.');
}finally{globalThis.fetch=originalFetch;}

// Round 12 (GR-GOV-16, GR-GOV-17): the reviewed workspace change at the Worker. Seven authoring commands a drafted design
// needs stage under a reviewed preview like every other design edit, and the batch answers the record each staged command
// made or selected, in order. A record that links requirements is bounded by how many it links, never by the characters
// of their ids.
{
  const DB = localDatabase(':memory:'), files = new Map(), owner = 'workspace-architect', origin = 'https://aiw.test';
  const env = {DB, FILES: {async put(k, v) { files.set(k, v); }, async get(k) { return files.has(k) ? {text: async () => files.get(k)} : null; }, async delete(k) { files.delete(k); }}, ASSETS: {fetch: () => new Response('asset')}};
  const api = async (path, method = 'GET', body = null) => { const r = await worker.fetch(new Request(origin + path, {method, headers: {'oai-authenticated-user-id': owner, ...(body ? {'Content-Type': 'application/json', Origin: origin} : {})}, ...(body ? {body: JSON.stringify(body)} : {})}), env); return {status: r.status, body: await r.json()}; };
  try {
    const made = await api('/api/projects', 'POST', {name: 'Workspace batches', template: 'bank-payment'});
    assert.equal(made.status, 201); const id = made.body.document.id;
    let state = (await api('/api/project?project=' + id)).body;
    const send = async command => { const r = await api('/api/commands?project=' + id, 'POST', {revision: state.revision, command}); if (r.status === 200) state = r.body; return r; };
    // GR-GOV-16: the seven, each staged.
    const seven = ['quality.conflict', 'review.narrative', 'decision.choose', 'decision.conflict', 'techrealisation.preference', 'techrealisation.assessment', 'review.action'];
    for (const type of seven) assert.ok(STAGED_COMMANDS.has(type), type + ' is staged');
    const p = state.document, drivers = p.quality.drivers, pair = (() => { for (const a of drivers) for (const b of drivers) if (a.id < b.id && !p.quality.conflicts.some(c => c.driverIds.includes(a.id) && c.driverIds.includes(b.id))) return [a.id, b.id]; })();
    const decisions = p.decisions.records, dpair = (() => { for (const a of decisions) for (const b of decisions) if (a.id < b.id && !p.decisions.conflicts.some(c => c.decisionIds.includes(a.id) && c.decisionIds.includes(b.id))) return [a.id, b.id]; })();
    const choice = decisions.find(d => d.alternatives.length >= 2 && d.status !== 'accepted' && d.status !== 'superseded');
    const tr = p.technologyRealisation.records.find(r => r.options.length >= 2), criterion = realizationCriteria(p, tr.id).find(c => c.id && !c.id.startsWith('RG-')) || realizationCriteria(p, tr.id)[0];
    assert.ok(pair && dpair && choice && tr && criterion, 'the reference project holds what the seven need');
    const commands = [
      {type: 'quality.conflict', payload: {driverIds: pair, title: 'Throughput against screening depth', effect: 'Deeper screening slows the instruction.', owner: 'Payments architect', resolution: '', status: 'open'}},
      {type: 'review.narrative', payload: {title: 'Payments design', owner: 'Payments architect', audience: 'Delivery and review', summary: 'How an instruction is taken, screened and settled.', scope: 'Chapters 1 to 10.', approach: 'Reviewed chapter by chapter.'}},
      {type: 'decision.choose', payload: {id: choice.id, alternativeId: choice.alternatives.find(a => a.id !== choice.selectedAlternativeId).id}},
      {type: 'decision.conflict', payload: {decisionIds: dpair, title: 'Two decisions pull apart', resolution: '', owner: 'Payments architect'}},
      {type: 'techrealisation.preference', payload: {id: tr.id, optionId: tr.options.find(o => o.id !== tr.selectedOptionId).id}},
      {type: 'techrealisation.assessment', payload: {id: tr.id, optionId: tr.options[0].id, criterionId: criterion.id, effect: 'supports', coverage: 'meets', reason: 'Measured against the criterion.', evidence: 'Vendor documentation, section 2.'}},
      {type: 'review.action', payload: {title: 'Rehearse the cut-over', owner: 'Delivery lead', due: '2026-12-01', acceptance: 'A rehearsal record signed by the delivery lead.', objectIds: ['REQ-001'], status: 'Planned'}}
    ];
    const preview = previewWorkingChange(p, commands);
    assert.equal(preview.selectedIds.length, 7, 'the preview answers each staged command');
    const refused = await send({type: 'workspace.apply', payload: {commands, stamp: preview.stamp, reviewed: false}});
    assert.equal(refused.status, 400, 'a person\'s batch still needs its review');
    const applied = await send({type: 'workspace.apply', payload: {commands, stamp: preview.stamp, reviewed: true, reason: 'The seven reviewed together.'}});
    assert.equal(applied.status, 200, JSON.stringify(applied.body).slice(0, 300));
    const doc = state.document, ids = applied.body.selectedIds;
    assert.equal(ids.length, 7, 'the batch answers the record of every staged command, in order');
    const conflict = doc.quality.conflicts.find(c => c.title === 'Throughput against screening depth'), dconflict = doc.decisions.conflicts.find(c => c.title === 'Two decisions pull apart'), action = doc.finalReview.actions.find(a => a.title === 'Rehearse the cut-over');
    assert.ok(conflict && dconflict && action);
    assert.deepEqual([ids[0], ids[2], ids[3], ids[4], ids[5], ids[6]], [conflict.id, choice.id, dconflict.id, tr.id, tr.id, action.id]);
    assert.equal(doc.finalReview.narrative.title, 'Payments design');
    assert.equal(doc.decisions.records.find(d => d.id === choice.id).selectedAlternativeId, commands[2].payload.alternativeId);
    assert.equal(doc.technologyRealisation.records.find(r => r.id === tr.id).selectedOptionId, commands[4].payload.optionId);
    // Nothing in the batch approved or accepted anything.
    assert.notEqual(doc.decisions.records.find(d => d.id === choice.id).status, 'accepted');
    console.log('PASS the seven authoring commands (quality.conflict, review.narrative, decision.choose, decision.conflict, techrealisation.preference, techrealisation.assessment, review.action) stage under a reviewed preview, refused without the review, and the batch answers the record of every staged command in order');

    // GR-GOV-17: a responsibility that links 5,000 requirements, in a project that holds 5,000 (a stored project, as an
    // import leaves it), is accepted; 5,001 ids are refused by count with the limit named; never by characters.
    const big = structuredClone(state.document), have = big.artefacts.filter(a => a.type === 'requirement').length;
    for (let i = have; i < LOGICAL_LIMITS.requirements; i++) big.artefacts.push({id: 'REQ-' + String(10000 + i), type: 'requirement', title: 'Requirement ' + (i + 1), description: '', acceptance: '', owner: '', source: 'Synthetic', priority: 'Should', confirmed: false});
    await DB.prepare('UPDATE projects SET document=? WHERE owner_id=? AND id=?').bind(JSON.stringify(big), owner, id).run();
    state = (await api('/api/project?project=' + id)).body;
    const all = state.document.artefacts.filter(a => a.type === 'requirement').map(a => a.id);
    assert.equal(all.length, LOGICAL_LIMITS.requirements);
    const responsibility = {title: 'Hold every requirement', purpose: 'Answers for the whole service.', boundary: 'The whole service.', owner: 'Payments architect', requirementIds: all};
    const body = JSON.stringify({revision: state.revision, command: {type: 'logical.responsibility', payload: responsibility}});
    assert.ok(body.length > 40000, 'past the 40,000 characters of an ordinary command: ' + body.length);
    const accepted = await send({type: 'logical.responsibility', payload: responsibility});
    assert.equal(accepted.status, 200, JSON.stringify(accepted.body).slice(0, 300));
    const saved = state.document.logical.responsibilities.find(r => r.title === 'Hold every requirement');
    assert.equal(saved.requirementIds.length, LOGICAL_LIMITS.requirements);
    const over = await send({type: 'logical.responsibility', payload: {...responsibility, title: 'One too many', requirementIds: [...all, 'REQ-99999']}});
    assert.equal(over.status, 400); assert.match(over.body.error, /5,000/); assert.doesNotMatch(over.body.error, /too large|Shorten the fields/);
    console.log('PASS a responsibility linking 5,000 requirements (a ' + body.length + '-character command) is accepted, and 5,001 are refused by count with the limit named, never by characters');
  } finally { DB.close(); }
}
