// Modules and sub-modules (round 24, audit/round24/PLAN.md D-24-01 to D-24-03). A synthetic register of the shape of a
// real one (scripts/synthetic-workbook.mjs: 1,400 requirements in 18 domains and 19 capability themes, generated text) is
// imported through the intake, and the suite asserts:
//   1. the proposal (module-model.js): modules from the domain column, sub-modules from the capability theme within each
//      module of 40 requirements or more, platform modules for the cross-cutting themes (an area that names a concern is
//      that platform module; a concern no area names gets a new one that serves its themes), a catch-all theme never a
//      sub-module of its own, the near-unique module column named and not used, the same proposal twice;
//   2. the structure saved (requirements.modules-propose): every requirement in exactly one leaf, the domain groups
//      converted in place (ids and links kept), the theme groups untouched, every group proposed with its basis, a second
//      proposal refused;
//   3. the roll-up: a module holds its sub-modules' requirements, so a link to the module reaches all of them;
//   4. acceptance is a person's: an agent account and a draft by Sol are refused, a structure that leaves a requirement in
//      no module or in two is refused (and Chapter 1 raises the finding), a person's reviewed acceptance is recorded;
//   5. the groups' rules: a sub-module names a module, its title is its own among its module's (the same title may stand
//      under another module), a module with sub-modules is neither removed nor turned into another kind;
//   6. Chapter 4 (logical.group): a responsibility group links the module it realises and only a module or sub-module;
//      every record that reaches it through the architecture model is in that module (module-scope.js), and a record
//      whose requirements sit in two modules is in both;
//   7. the import that asks for modules proposes the structure with the import and shows it in the review step;
//   8. discarding: refused while a record links a created module; otherwise created groups go and converted ones return.
// Run: npm run test:module-model
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from './worker.js';
import {localDatabase} from './local-db.js';
import {localFiles} from './local-files.js';
import {syntheticWorkbook} from './scripts/synthetic-workbook.mjs';
import {requirementGroups, groupMembers} from './public/requirement-groups.js';
import {proposeModules, applyModuleProposal, moduleTree, moduleLabel, CATCH_ALL, concernOf} from './public/module-model.js';
import {recordModules, recordAttachments, moduleScope} from './public/module-scope.js';
import {draftArchitecture, applySteps} from './public/architecture-drafter.js';
import {applyCanonical} from './public/canonical-command.js';
import {findings as chapterOneFindings} from './public/requirements-domain.js';
import {isReviewCommand, refuseUnreviewable} from './authorship.js';

const checks = [], pass = name => checks.push(name);
const root = await mkdtemp(path.join(tmpdir(), 'aiw-module-model-')), db = localDatabase(path.join(root, 'd.sqlite'));
const env = {DB: db, FILES: localFiles(path.join(root, 'files')), ASSETS: {fetch: () => new Response('asset')}}, origin = 'https://aiw.test', OWNER = 'architect-modules';
const call = async (route, {body, bytes, project, owner = OWNER, headers = {}} = {}) => {
  const r = await worker.fetch(new Request(origin + route + (project ? (route.includes('?') ? '&' : '?') + 'project=' + project : ''), {method: body || bytes ? 'POST' : 'GET', headers: {'oai-authenticated-user-id': owner, Origin: origin, ...(body ? {'Content-Type': 'application/json'} : {}), ...headers}, body: bytes || (body ? JSON.stringify(body) : undefined)}), env);
  return {status: r.status, body: await r.json()};
};
async function imported(name, groups) {
  const id = (await call('/api/projects', {body: {name, template: 'blank'}})).body.document.id, {bytes, manifest} = syntheticWorkbook({rows: 1400});
  const up = (await call('/api/intake?action=upload&filename=Synthetic.xlsx', {bytes, project: id})).body, ins = (await call('/api/intake?action=inspect', {body: {uploadId: up.id, sheet: manifest.sheet}, project: id})).body;
  const input = {uploadId: up.id, sheet: ins.sheet, headerRow: ins.headerRow, mapping: ins.mapping, priorityMap: ins.bands.map, groups};
  const pre = (await call('/api/intake?action=preview', {body: input, project: id})).body;
  const applied = await call('/api/intake?action=apply', {body: {...input, revision: pre.projectRevision, previewStamp: pre.stamp, reviewed: true}, project: id});
  assert.equal(applied.status, 200, JSON.stringify(applied.body).slice(0, 300));
  return {id, preview: pre, document: applied.body.document, revision: applied.body.revision, receipt: applied.body};
}
let pid = '', revision = 0, doc = null;
const command = async (type, payload, {owner, extra = {}} = {}) => { const r = await call('/api/commands', {project: pid, owner, body: {revision, command: {type, payload}, ...extra}}); if (r.status === 200) { revision = r.body.revision; doc = r.body.document; } return r; };
const reqIds = d => d.artefacts.filter(a => a.type === 'requirement').map(a => a.id);

try {
  // 1. The proposal, read before anything is saved.
  const base = await imported('Modules · synthetic register', {domain: true, capabilityTheme: true});
  pid = base.id; revision = base.revision; doc = base.document;
  const before = requirementGroups(doc), domains = before.filter(g => g.kind === 'domain'), themes = before.filter(g => g.kind === 'theme');
  assert.equal(domains.length, 18); assert.equal(themes.length, 19);
  const P = proposeModules(doc), P2 = proposeModules(doc);
  assert.deepEqual(P2, P, 'the same proposal twice');
  assert.equal(P.basis.first, 'domain'); assert.equal(P.basis.second, 'capabilityTheme');
  const business = P.modules.filter(m => m.role === 'business'), platform = P.modules.filter(m => m.role === 'platform');
  assert.ok(business.length >= 8 && platform.length >= 4, `business ${business.length}, platform ${platform.length}`);
  assert.equal(P.modules.filter(m => !m.created).length, 18, 'one module per domain value');
  assert.ok(P.notes.some(n => /module column holds 1,400 distinct values/.test(n)), 'the near-unique column is named and not used');
  for (const m of P.modules) {
    assert.ok(m.members >= 40 || !m.children.length, `${m.title}: a small module is read whole`);
    for (const c of m.children) assert.ok(c.other || !CATCH_ALL.test(c.title), `${c.title}: a catch-all value is no sub-module of its own`);
    if (m.role === 'platform') assert.ok(m.concern, `${m.title} names the concern it serves`);
  }
  const created = platform.filter(m => m.created);
  assert.ok(created.length >= 1 && created.every(m => m.serves?.[0]?.values?.length && !m.rule.length), 'a concern no area names gets a new platform module that serves its themes and owns nothing');
  assert.ok(platform.filter(m => !m.created).some(m => m.serves), 'an area that names a concern serves the themes of that concern');
  assert.equal(concernOf('Approval workflow and dual control'), 'workflow'); assert.equal(concernOf('Loan servicing'), '');
  // A remainder that the second column does not divide, a third of its module or more, is named for a person to split.
  for (const m of P.modules) for (const c of m.children.filter(x => x.other)) assert.equal(P.notes.some(n => n.startsWith(`${c.title} holds `)), c.members >= Math.max(40, Math.ceil(m.members / 3)), `${c.title}: ${c.members} of ${m.members}`);
  const lumpy = {artefacts: Array.from({length: 90}, (_, i) => ({id: 'R' + i, type: 'requirement', domain: i < 60 ? 'Customer' : 'Payments', capability: i < 10 ? 'Customer onboarding' : i < 20 ? 'Customer profile' : i < 60 ? 'Other functional gap' : 'Payment orders'}))};
  const L = proposeModules(lumpy), customer = L.modules.find(m => m.value === 'Customer'), rest = customer.children.find(c => c.other);
  assert.deepEqual(customer.children.map(c => c.members), [10, 10, 40]); assert.equal(rest.title, 'Other Customer requirements');
  assert.ok(L.notes.includes("Other Customer requirements holds 40 of the module's 60 requirements: the capability theme column does not divide them. Split them into sub-modules of your own before accepting the structure."), L.notes.join(' | '));
  // A new platform module whose theme and concern titles a group already holds is named for its concern as a platform,
  // not numbered.
  const named = {artefacts: Array.from({length: 60}, (_, i) => ({id: 'N' + i, type: 'requirement', domain: ['Accounts', 'Lending', 'Payments'][i % 3], capability: i % 4 ? 'Account servicing' : 'Notifications and alerts'})),
    requirementGroups: {records: [{id: 'RG-001', title: 'Notifications and alerts', kind: 'theme', rule: [{field: 'capabilityTheme', value: 'Notifications and alerts'}], memberIds: []}], counter: 1, version: 1}};
  const N = proposeModules(named), made = applyModuleProposal(named, N, null, '2026-10-14T00:00:00.000Z', OWNER);
  const notify = named.requirementGroups.records.find(g => g.kind === 'module' && g.concern === 'notification');
  assert.ok(made.created.includes(notify?.id), 'a concern no area names gets a new platform module');
  assert.equal(notify.title, 'Notifications and alerts platform', 'named for its concern as a platform, not numbered');
  assert.ok(named.requirementGroups.records.every(g => !/ \(\d+\)$/.test(g.title)), 'no group title is numbered');
  pass('the proposal: modules by domain, sub-modules by theme within large modules, platform modules for the cross-cutting concerns, a large remainder named, a new platform module named for its concern, deterministic');

  // 2. Saved as proposed.
  assert.equal((await command('requirements.modules-propose', {first: 'notAColumn'})).status, 400, 'an unknown column is refused');
  const proposed = await command('requirements.modules-propose', {});
  assert.equal(proposed.status, 200, JSON.stringify(proposed.body).slice(0, 300));
  const tree = moduleTree(doc), all = reqIds(doc);
  assert.equal(tree.modules.length, P.modules.length);
  assert.equal(tree.doubled.length, 0, 'no requirement in two leaves'); assert.equal(tree.unassigned.length, 0, 'every requirement in a leaf');
  assert.equal(tree.home.size, all.length, 'every requirement has its home');
  const groups = requirementGroups(doc), modules = groups.filter(g => g.kind === 'module'), subs = groups.filter(g => g.kind === 'sub-module');
  for (const d of domains) { const now = groups.find(g => g.id === d.id); assert.equal(now.kind, 'module', `${d.id} became the module`); assert.equal(now.title, d.title); assert.deepEqual(now.rule, d.rule); assert.equal(now.proposal.from, 'domain'); }
  for (const t of themes) assert.equal(groups.find(g => g.id === t.id).kind, 'theme', 'the theme groups stay facets');
  assert.ok([...modules, ...subs].every(g => g.state === 'proposed' && g.proposal?.method === 'columns'), 'every group proposed, with its basis');
  assert.ok(subs.every(s => modules.some(m => m.id === s.parentId)), 'every sub-module names its module');
  assert.equal(tree.state, 'proposed');
  assert.equal((await command('requirements.modules-propose', {})).status, 400, 'a second proposal is refused while a structure exists');
  pass('the structure saved as proposed: a partition, domain groups converted in place, themes untouched, one proposal');

  // 3. Roll-up: a module holds its sub-modules' requirements.
  const big = modules.find(m => subs.some(s => s.parentId === m.id)), kids = subs.filter(s => s.parentId === big.id);
  const rolled = new Set(groupMembers(doc, big.id));
  for (const s of kids) for (const id of groupMembers(doc, s.id)) assert.ok(rolled.has(id), `${big.id} holds ${s.id}'s ${id}`);
  assert.equal(moduleLabel(doc, kids[0]), big.title + ' › ' + kids[0].title);
  pass('a module holds its sub-modules\' requirements; a sub-module reads as module › sub-module');

  // 4. Acceptance is a person's, of a whole partition.
  assert.ok(isReviewCommand('requirements.modules-accept'), 'accepting the structure is a person\'s review');
  assert.throws(() => refuseUnreviewable({type: 'requirements.modules-accept', payload: {reviewed: true}}, {kind: 'sol-draft', account: 'agent'}), /An agent or service account does not review, confirm, accept or approve/);
  const sol = await call('/api/commands', {project: pid, body: {revision, authorKind: 'sol-draft', command: {type: 'requirements.modules-accept', payload: {reviewed: true}}}});
  assert.notEqual(sol.status, 200, 'a draft by Sol cannot accept the structure'); assert.match(sol.body.error || '', /does not review, confirm, accept or approve|cannot claim a review/);
  assert.equal((await command('requirements.modules-accept', {})).status, 400, 'an unreviewed acceptance is refused');
  // A person widens a sub-module's rule into its sibling's: the overlap is a finding and blocks acceptance.
  const [a1, a2] = kids, widened = {...a2, rule: a1.rule};
  assert.equal((await command('requirements.group', {id: a2.id, title: a2.title, kind: 'sub-module', parentId: a2.parentId, rule: widened.rule, memberIds: a2.memberIds})).status, 200);
  assert.ok(moduleTree(doc).doubled.length > 0, 'the overlap is seen');
  assert.ok(chapterOneFindings(doc).some(f => f.code === 'module-two'), 'Chapter 1 raises a requirement in two modules');
  const overlapping = await command('requirements.modules-accept', {reviewed: true});
  assert.equal(overlapping.status, 400); assert.match(overlapping.body.error, /in two modules or sub-modules/);
  assert.equal((await command('requirements.group', {id: a2.id, title: a2.title, kind: 'sub-module', parentId: a2.parentId, rule: a2.rule, memberIds: a2.memberIds})).status, 200, 'the rule restored');
  assert.equal(moduleTree(doc).doubled.length, 0);
  assert.ok(!chapterOneFindings(doc).some(f => f.code === 'module-two' || f.code === 'module-none'), 'no module finding on a partition');
  const accepted = await command('requirements.modules-accept', {reviewed: true});
  assert.equal(accepted.status, 200, JSON.stringify(accepted.body).slice(0, 300));
  const after = requirementGroups(doc).filter(g => g.kind === 'module' || g.kind === 'sub-module');
  assert.ok(after.every(g => g.state === 'accepted' && g.acceptedBy === OWNER && g.acceptedAt), 'every module and sub-module accepted by the person, with when');
  assert.equal(moduleTree(doc).state, 'accepted');
  pass('acceptance: refused to an agent account and a draft by Sol, unreviewed or over an overlap (with its Chapter 1 finding); a person\'s acceptance recorded');

  // 5. The groups' rules.
  assert.equal((await command('requirements.group', {title: 'Orphan', kind: 'sub-module', rule: a1.rule})).status, 400, 'a sub-module names its module');
  assert.equal((await command('requirements.group', {title: 'Orphan', kind: 'sub-module', parentId: themes[0].id, rule: a1.rule})).status, 400, 'a sub-module\'s parent is a module');
  const other = modules.find(m => m.id !== big.id && subs.some(s => s.parentId === m.id));
  const sameTitle = await command('requirements.group', {title: a1.title, kind: 'sub-module', parentId: other.id, memberIds: [groupMembers(doc, other.id)[0]]});
  assert.ok(sameTitle.status === 200 || /exists in this module/.test(sameTitle.body.error), 'the same title may stand under another module');
  assert.equal((await command('requirements.group', {title: a1.title, kind: 'sub-module', parentId: big.id, memberIds: [groupMembers(doc, big.id)[0]]})).status, 400, 'but not twice in one module');
  if (sameTitle.status === 200) assert.equal((await command('requirements.group-delete', {id: sameTitle.body.selected})).status, 200);
  const removeParent = await command('requirements.group-delete', {id: big.id});
  assert.equal(removeParent.status, 400); assert.match(removeParent.body.error, /has sub-modules/);
  assert.equal((await command('requirements.group', {id: big.id, title: big.title, kind: 'domain', rule: big.rule})).status, 400, 'a module with sub-modules stays a module');
  pass('sub-modules name a module; titles are their own within a module; a module with sub-modules is kept');

  // 6. Chapter 4 realises a module; records reach it through the architecture model.
  assert.equal((await command('logical.group', {title: 'Not a module', purpose: 'Links a theme.', requirementGroupIds: [themes[0].id]})).status, 400, 'only a module or sub-module is realised');
  const grp = await command('logical.group', {title: 'Deposits realisation', purpose: 'Realises the module.', requirementGroupIds: [big.id]});
  assert.equal(grp.status, 200, JSON.stringify(grp.body).slice(0, 300));
  const grpId = doc.logical.groups.find(g => g.title === 'Deposits realisation').id;
  assert.deepEqual(doc.logical.groups.find(g => g.id === grpId).requirementGroupIds, [big.id]);
  const req1 = groupMembers(doc, kids[0].id)[0], otherReq = groupMembers(doc, other.id)[0];
  assert.equal((await command('logical.responsibility', {title: 'Hold deposit balances', purpose: 'Keeps the balance of every deposit account.', groupId: grpId, requirementIds: [req1]})).status, 200);
  const resp = doc.logical.responsibilities.find(r => r.title === 'Hold deposit balances');
  const RM = recordModules(doc);
  assert.ok(RM.get(resp.id)?.modules.includes(big.id), 'a responsibility in the group is in the module');
  assert.ok(RM.get(resp.id)?.subs.includes(kids[0].id), 'and in the sub-module of the requirement it links');
  assert.ok(RM.get(req1).modules.includes(big.id), 'a requirement is in its module');
  assert.equal((await command('quality.driver', {kind: 'functional', title: 'Shared posting rules', description: 'Postings follow one set of rules.', impact: 'One posting service.', requirementIds: [req1, otherReq]})).status, 200);
  const shared = doc.quality.drivers.find(d => d.title === 'Shared posting rules');
  assert.deepEqual([...recordModules(doc).get(shared.id).modules].sort(), [big.id, other.id].sort(), 'a record whose requirements sit in two modules is in both');
  const scope = moduleScope(doc, big.id);
  assert.ok(scope.records.has(resp.id) && scope.records.has(shared.id) && scope.requirements.has(req1));
  assert.ok(!moduleScope(doc, other.id).records.has(resp.id), 'and not in a module it does not reach');
  assert.equal(moduleScope(doc, kids[0].id).crumbs.length, 2);
  // The records the chain does not reach (a data entity, a contract, a control, a threat, a party) are in a module only
  // by their own requirement links, which every record the drafter makes carries. One a person adds without them is
  // placed by what it touches (recordAttachments), never by recordModules: each data entity by the components that own
  // it, each contract by the components at its ends, each control and threat by what it protects or threatens, each
  // party by the components its contracts join. Here the rules drafter's design of this register (it drafts by module)
  // has those links taken away, and a party and its contract added without any.
  const drafted = (() => { const steps = applySteps(structuredClone(doc), draftArchitecture(doc), {at: '2026-10-14T00:00:00.000Z', actor: OWNER, jobId: 'module-attachments'}); let x; while (!(x = steps.next()).done); return x.value.document; })();
  assert.ok(['data', 'contracts'].every(k => drafted.interfaces[k].every(r => recordModules(drafted).has(r.id))) && drafted.security.controls.every(r => recordModules(drafted).has(r.id)), 'the drafted records are in their modules by their own links');
  let bare = structuredClone(drafted);
  for (const r of [...bare.interfaces.data, ...bare.interfaces.contracts, ...bare.security.controls, ...bare.security.threats]) { delete r.requirementIds; delete r.requirementGroupIds; }
  const run = (type, payload) => { const r = applyCanonical(bare, {type, payload}, '2026-10-14T00:00:00.000Z', OWNER); bare = r.document; return r.selected; };
  const partyId = run('interfaces.party', {title: 'Credit reference agency', kind: 'verification service', purpose: 'Answers credit checks for loan applications.'});
  const caller = bare.realisation.components.find(c => recordModules(bare).get(c.id)?.modules.length);
  run('interfaces.contract', {title: 'Credit check', from: caller.id, to: partyId});
  const DR = recordModules(bare), TA = recordAttachments(bare), placedIn = id => DR.get(id)?.modules || TA.get(id)?.modules || [];
  const union = ids => [...new Set(ids.filter(Boolean).flatMap(placedIn))].sort(), got = id => [...(TA.get(id)?.modules || [])].sort();
  const comps = bare.realisation.components, kinds = {data: 0, contracts: 0, controls: 0, threats: 0, parties: 0};
  for (const d of bare.interfaces.data) { const owners = [d.authorityId, ...comps.filter(c => (c.dataIds || []).includes(d.id)).map(c => c.id)]; if (!DR.has(d.id) && union(owners).length) { kinds.data++; assert.deepEqual([got(d.id), TA.get(d.id).by], [union(owners), 'owner'], d.id + ': by its owners'); } }
  for (const c of bare.interfaces.contracts) if (!DR.has(c.id) && union([c.from, c.to]).length) { kinds.contracts++; assert.deepEqual([got(c.id), TA.get(c.id).by], [union([c.from, c.to]), 'ends'], c.id + ': by its ends'); }
  for (const c of bare.security.controls) if (!DR.has(c.id) && union(c.targetIds || []).length) { kinds.controls++; assert.deepEqual(got(c.id), union(c.targetIds), c.id + ': by what it protects'); }
  for (const t of bare.security.threats) { const by = [...(t.targetIds || []), ...bare.security.controls.filter(c => (c.threatIds || []).includes(t.id)).map(c => c.id)]; if (!DR.has(t.id) && union(by).length) { kinds.threats++; assert.deepEqual(got(t.id), union(by), t.id + ': by what it threatens and the controls that mitigate it'); } }
  for (const x of bare.interfaces.parties) { const joined = bare.interfaces.contracts.flatMap(c => c.from === x.id ? [c.to] : c.to === x.id ? [c.from] : []); if (!DR.has(x.id) && union(joined).length) { kinds.parties++; assert.deepEqual([got(x.id), TA.get(x.id).by], [union(joined), 'contracts'], x.id + ': by the components its contracts join'); } }
  assert.ok(Object.values(kinds).every(n => n > 0), 'each kind has records placed by what they touch: ' + JSON.stringify(kinds));
  assert.deepEqual(got(partyId), [...placedIn(caller.id)].sort(), 'the added party is in the module of the component that calls it');
  assert.ok([...TA.keys()].every(id => !DR.has(id)), 'nothing recordModules places is attached again: the lens keeps the attached records as shared context');
  pass('Chapter 4 realises a module; responsibilities, requirements and drivers read their modules; a shared record is in both; a record without its own links is placed by what it touches');

  // 8. Discarding: refused while a record links a created module.
  const createdModule = requirementGroups(doc).find(g => g.kind === 'module' && !g.proposal?.from);
  if (createdModule) {
    assert.equal((await command('logical.group', {title: 'Platform realisation', purpose: 'Realises a platform module.', requirementGroupIds: [createdModule.id]})).status, 200);
    const refused = await command('requirements.modules-discard', {});
    assert.equal(refused.status, 400); assert.match(refused.body.error, /linked by other records/);
  }
  // A fresh project: proposed, then discarded whole.
  const fresh = await imported('Modules · discard', {domain: true, capabilityTheme: true});
  pid = fresh.id; revision = fresh.revision; doc = fresh.document;
  assert.equal((await command('requirements.modules-propose', {})).status, 200);
  assert.equal((await command('requirements.modules-discard', {})).status, 200);
  const back = requirementGroups(doc);
  assert.equal(back.filter(g => g.kind === 'module' || g.kind === 'sub-module').length, 0, 'no module group left');
  assert.equal(back.filter(g => g.kind === 'domain').length, 18, 'the converted groups are domain groups again');
  assert.ok(back.every(g => !('state' in g) && !('role' in g) && !('proposal' in g)), 'with nothing of the structure left on them');
  pass('discard: refused while a created module is linked; otherwise the structure goes and the domain groups return');

  // 7. The import that asks for modules.
  const withModules = await imported('Modules · at import', {domain: true, capabilityTheme: true, modules: true});
  assert.ok(withModules.preview.proposals?.modules?.modules?.length >= 18, 'the review step shows the proposed modules');
  const t7 = moduleTree(withModules.document);
  assert.equal(t7.modules.length, P.modules.length, 'the structure is proposed with the import');
  assert.equal(t7.unassigned.length + t7.doubled.length, 0);
  assert.ok(withModules.receipt.modules?.converted?.length === 18, 'the receipt names the groups made modules');
  pass('an import that asks for modules proposes the structure and shows it before it is applied');

  console.log(JSON.stringify({checks: checks.length, passed: checks}, null, 1));
} finally {
  await rm(root, {recursive: true, force: true});
}
