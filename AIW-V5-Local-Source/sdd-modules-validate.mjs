// The SDD by module (round 24, audit/round24/PLAN.md D-24-03, D-24-05, D-24-06, D-24-07; workstream W3 parts 2 and 3).
// On the synthetic register (scripts/synthetic-workbook.mjs: 1,400 requirements in 18 domains and 19 capability themes,
// generated text) imported with its module structure proposed, as an import that asks for modules proposes it, drafted
// by the rules drafter (which drafts by module) and applied as the drafting job applies a draft, with the records a
// drafted design lacks added by hand (sdd-fixtures.mjs modularProject: an external party, a data definition and an
// invariant of one module, a party two modules share, a component no module holds, a component that names no driver it
// serves):
//   1. key functionalities by module: one line per business module with its requirements, the functional drivers that
//      cover it and its sub-modules with their counts; the platform modules apart, each with its concern, its own
//      requirements and what it serves (its serves rule); the structure's standing as recorded; without modules, the
//      lines of before;
//   2. section 4 by module: the module overview (one row per module, business then platform), the specification table,
//      each business and platform module with its purpose (its Chapter 4 group's), sub-modules, the modules it uses and is
//      used by, its components in full and the components it shares named by reference, the interfaces and data that
//      touch them, its own integrations and invariant, and its own open questions (each record and field asked once in
//      the section, the overview counting them); a component several modules hold printed in full once (a platform
//      component under its platform module, else under its first module), named in the others; the records in no module
//      after the modules; membership as module-scope.js reads it (recordModules, then recordAttachments for a record the
//      module chain does not reach, a party placed by the component its contract joins);
//   3. the drivers a component serves, each with its reason; a component that names none, how many drivers reach it;
//   4. the content reader reads the same records from format 1, format 2 and format 2 by module: the same records field
//      by field, the same score and counts per section, the same findings;
//   5. no "open: …" marker in any edition of format 2: sections 5 and 6 and the delivery obligations name what is open
//      once, in their open questions; and the round's fillers are gone: no "(no product yet)", no "no product named
//      yet" (the products not named are asked once, in section 4's own list), and no "No requirement is in this group
//      yet." for a platform module that serves (Appendix A says what it serves);
//   6. the module parts render at their heading levels in HTML;
//   7. section 5 by module (part 3; the figure set of sdd-document.js and its `section5` list, W4's): the module map
//      first with its purpose, then the context, the containers by module with their purpose and why the modules stand
//      for them, the components by module as the set lists them (one table row per module in Chapter 1's order: a
//      module the body draws, its figures below under its own heading; any other module of two components or more,
//      named with its figure in the figures annex, which draws it; a module of one component or none, why it has no
//      figure), then the deployment and the canonical chapter models; the figures numbered from 1 in reading order, each placed once and drawn once in
//      HTML; the content reading the same with the figures drawn; without modules, the levels of before.
// Nothing here is client text; no model is called. Run: npm run test:sdd-modules
import assert from 'node:assert/strict';
import {modularProject, richProject} from './sdd-fixtures.mjs';
import {sddDocument, architectureFigureSet} from './public/sdd-document.js';
import {c4Diagrams, C4_SCENES, BODY_MODULES} from './public/sdd-c4.js';
import {architectureMarkdown, LIST_MAX, unescapeMd} from './public/sdd-architecture.js';
import {contentReading, parseArchitectureEdition} from './public/sdd-content.js';
import {renderSDD} from './public/sdd-renderer.js';
import {moduleTree, concernTitle} from './public/module-model.js';
import {recordModules, recordAttachments} from './public/module-scope.js';
import {groupIndex} from './public/requirement-groups.js';
import {applyRequirementsCommand} from './public/requirement-commands.js';
import {driverCodes, driverKind} from './public/quality-domain.js';
import {linkedRequirementIds} from './public/requirement-links.js';
import {mappingRole, logicalGraph} from './public/logical-domain.js';

const checks = [], pass = n => { checks.push(n); console.log('PASS ' + n); };
const t0 = performance.now();
const {document: p, ids} = await modularProject();
const fixtureMs = Math.round(performance.now() - t0), t1 = performance.now();
const doc = sddDocument(p, {figures: false}), md = doc.markdown, exportMs = Math.round(performance.now() - t1);
const lines = m => m.split('\n');
const heading = (m, title, level) => lines(m).some(l => l === '#'.repeat(level) + ' ' + title || unescapeMd(l) === '#'.repeat(level) + ' ' + title);
const section = (m, title, level = 1) => { const ls = lines(m), i = ls.findIndex(l => l === '#'.repeat(level) + ' ' + title || unescapeMd(l) === '#'.repeat(level) + ' ' + title); assert.ok(i >= 0, 'section ' + title); let j = i + 1; while (j < ls.length && !(new RegExp('^#{1,' + level + '} ').test(ls[j]))) j++; return ls.slice(i, j).join('\n'); };
const maybe = (m, title, level) => (heading(m, title, level) ? section(m, title, level) : '');
const kids = (m, level) => lines(m).filter(l => l.startsWith('#'.repeat(level) + ' ')).map(l => unescapeMd(l.slice(level + 1)));
const plural = (n, one, many = one + 's') => n.toLocaleString('en-GB') + ' ' + (n === 1 ? one : many);
const orList = xs => (xs.length > 1 ? xs.slice(0, -1).join(', ') + ' or ' + xs.at(-1) : xs.join(''));
const members = refs => refs.split(/, | and /).flatMap(x => { const r = /^(.*?)(\d+)–(.*?)(\d+)$/.exec(x.trim()); if (!r || r[1] !== r[3]) return [x.trim()]; const out = []; for (let n = Number(r[2]); n <= Number(r[4]); n++) out.push(r[1] + String(n).padStart(r[2].length, '0')); return out; });
// An "Open questions" list: the lines of fields not stated, each with its fields and its records (a range read as its
// members; "all N …" and "both …" read as N records the line does not name), and the questions, each with its records
// and their fields.
const notStated = block => lines(block).filter(l => l.startsWith('- Not stated: ')).map(l => { const i = l.lastIndexOf(' ('), tail = l.slice(i + 2, -1), all = /^(?:all ([\d,]+)|both) (.*)$/.exec(tail); return {line: l, fields: l.slice(14, i).split(/, | and /), all: all ? Number((all[1] || '2').replace(/,/g, '')) : 0, noun: all ? all[2] : '', refs: all ? [] : members(tail.includes(': ') ? tail.slice(tail.indexOf(': ') + 2) : tail)}; });
const questions = block => lines(block).filter(l => /^- (?!Not stated: )/.test(l)).map(l => { const i = l.lastIndexOf(' ('); return l.slice(i + 2, -1).split('; ').map(x => { const j = x.indexOf(': '); return {refs: members(x.slice(0, j)), fields: x.slice(j + 2).split(/, | and /)}; }); });
const S4 = '4. Architectural components, interfaces, properties and composition', S6 = '6. Architecture model refinements';
const tree = moduleTree(p), RM = recordModules(p), RA = recordAttachments(p), G = groupIndex(p), codes = driverCodes(p);
const rank = new Map(tree.modules.map((m, i) => [m.group.id, i])), isPlatform = id => tree.byId.get(id)?.role === 'platform';
const business = tree.modules.filter(m => !isPlatform(m.group.id)), platforms = tree.modules.filter(m => isPlatform(m.group.id));
const size = g => (G.members.get(g.id) || []).length;
// A record's modules: recordModules first, recordAttachments second (module-scope.js), as every reader by module reads them.
const modulesOf = id => { const e = RM.get(id), ms = e?.modules?.length ? e.modules : RA.get(id)?.modules || []; return ms.filter(m => rank.has(m)).sort((a, b) => rank.get(a) - rank.get(b)); };
// A record's home: its platform module (in several, the one that owns or serves the most of the requirements it realises
// through the responsibilities it realises and its own links), else its first module in the tree's order.
const realisedBy = id => { const out = new Set(), c = p.realisation.components.find(x => x.id === id); for (const m of p.logical.mappings.filter(x => x.physicalId === id && (mappingRole(x) || 'realises') !== 'supports')) { const r = p.logical.responsibilities.find(x => x.id === m.logicalId); if (r) for (const q of linkedRequirementIds(p, r)) out.add(q); } if (c) for (const q of linkedRequirementIds(p, c)) out.add(q); return [...out]; };
const reach = (id, m) => realisedBy(id).filter(r => tree.home.get(r)?.moduleId === m || (tree.served.get(r) || []).includes(m)).length;
const homeOf = id => { const ms = modulesOf(id), ps = ms.filter(isPlatform); return ps.length > 1 ? ps.map(m => [m, reach(id, m)]).sort((a, b) => b[1] - a[1] || rank.get(a[0]) - rank.get(b[0]))[0][0] : ps[0] || ms[0] || ''; };
const servedBy = id => [...tree.served].filter(([r, ms]) => ms.includes(id) && tree.home.get(r)?.moduleId !== id).map(([r]) => r);
const label = g => g.id + ' · ' + g.title;
assert.ok(business.length >= 10 && platforms.length >= 6 && platforms.some(m => !size(m.group) && servedBy(m.group.id).length), 'the structure has business modules, platform modules and a platform module that only serves');

// 1. Key functionalities by module.
{
  const kf = section(md, 'Key functionalities', 2), [biz, plat] = kf.split('\nPlatform modules:\n');
  assert.ok(plat, 'the platform modules apart, after the business modules');
  assert.match(kf, /^The functionalities by module, as Chapter 1’s requirement groups structure them \(proposed by AIW from the requirements’ columns, not accepted by a person\): /m, 'by module, with the structure’s standing');
  const bizLines = lines(biz).filter(l => /^- \*\*RG-\d+ · /.test(l)), platLines = lines(plat).filter(l => /^- \*\*RG-\d+ · /.test(l));
  assert.deepEqual(bizLines.map(l => /^- \*\*(RG-\d+) · /.exec(l)?.[1]), business.slice(0, LIST_MAX).map(m => m.group.id), 'one line per business module, in the order of the structure');
  assert.deepEqual(platLines.map(l => /^- \*\*(RG-\d+) · /.exec(l)?.[1]), platforms.slice(0, LIST_MAX).map(m => m.group.id), 'then one line per platform module');
  const fds = p.quality.drivers.filter(d => driverKind(d) === 'functional'), coveredBy = m => fds.filter(d => (d.requirementGroupIds || []).some(g => g === m.group.id || m.children.some(s => s.id === g))).map(d => codes.get(d.id)).sort();
  const coverOf = l => { const x = /, covered by ([^;]+?)(?:;|$)/.exec(l); return x ? members(x[1]).sort() : []; };
  for (const [m, l] of business.slice(0, LIST_MAX).map((m, i) => [m, bizLines[i]])) {
    assert.ok(l.startsWith('- **' + label(m.group) + '**: ' + plural(size(m.group), 'requirement')), m.group.title + ': its requirements: ' + l);
    assert.deepEqual(coverOf(l), coveredBy(m), m.group.title + ': the functional drivers that cover it');
    if (m.children.length) { assert.ok(l.includes('; ' + plural(m.children.length, 'sub-module') + ': '), m.group.title + ': its sub-modules'); for (const s of m.children.slice(0, 6)) assert.ok(l.includes(s.title + ' (' + size(s) + ')'), m.group.title + ': ' + s.title + ' with its count'); }
  }
  for (const [m, l] of platforms.slice(0, LIST_MAX).map((m, i) => [m, platLines[i]])) {
    const own = size(m.group), served = servedBy(m.group.id), across = new Set(served.map(r => tree.home.get(r).moduleId)), c = concernTitle(m.group.concern);
    assert.ok(l.startsWith('- **' + label(m.group) + '**' + (c && c.toLowerCase() !== m.group.title.toLowerCase() ? ' (' + c.toLowerCase() + ')' : '') + ': ' + (own ? plural(own, 'requirement') + ' of its own' : 'no requirement of its own')), m.group.title + ': its concern and its own requirements: ' + l);
    assert.deepEqual(coverOf(l), coveredBy(m), m.group.title + ': the functional drivers that cover it');
    if (served.length) assert.ok(l.includes('serves ' + plural(served.length, 'requirement') + ' in ' + plural(across.size, 'other module') + ', those whose capability theme is ' + orList(m.group.serves[0].values.map(v => '“' + v + '”'))), m.group.title + ': what it serves, by its rule: ' + l);
    else assert.ok(!l.includes('serves '), m.group.title + ': serves nothing');
  }
  assert.ok(!/^- \*\*FD\d+ · /m.test(kf), 'the modules, not the functional drivers, carry the key functionalities');
  // The structure's standing is read from it: once a person accepts it, the edition says so, in section 1 and 4 alike.
  const accepted = applyRequirementsCommand(structuredClone(p), {type: 'requirements.modules-accept', payload: {reviewed: true}}, '2026-10-09T09:00:00.000Z', 'architect-a').document, am = architectureMarkdown(accepted).markdown;
  assert.ok(section(am, 'Key functionalities', 2).includes('structure them (accepted by a person): ') && section(am, 'Module overview', 2).includes('structure it (accepted by a person): ') && !/proposed by AIW from the requirements’ columns/.test(am), 'an accepted structure reads as accepted by a person');
  // Without modules, the key functionalities of before (part 1): this design read flat prints its functional drivers, and
  // a design without modules prints the same edition whatever the option.
  assert.match(section(architectureMarkdown(p, {modules: false}).markdown, 'Key functionalities', 2), /^One line per functional driver, with the requirement groups it covers; drivers that cover the same groups share their line\.$/m, 'read flat, the functional drivers');
  const {document: rich} = await richProject();
  assert.equal(architectureMarkdown(rich).markdown, architectureMarkdown(rich, {modules: false}).markdown, 'a design without modules prints the same edition, whatever the option');
  pass('key functionalities by module: one line per business module (' + business.length + ') with its requirements, covering drivers and sub-modules with their counts, then the platform modules (' + platforms.length + ') apart with their concern, own requirements and what their serves rule serves; the structure’s standing as recorded (proposed by AIW, or accepted by a person); without modules, the lines of before');
}

// 2. Section 4 by module.
const s4 = section(md, S4), parts = kids(s4, 2);
const blockOf = id => section(s4, label(tree.byId.get(id)), 3);
{
  assert.deepEqual(parts, ['Module overview', 'Component specification table', 'Business modules', 'Platform modules', 'Records in no module', 'Quality-driver-focused interactions', 'External integrations', 'Batch chain', 'Open questions'], 'section 4’s parts by module');
  assert.deepEqual(kids(section(s4, 'Business modules', 2), 3), business.map(m => label(m.group)), 'the business modules, each a part of its own');
  assert.deepEqual(kids(section(s4, 'Platform modules', 2), 3), platforms.map(m => label(m.group)), 'then the platform modules');
  // The overview: one row per module, with its role, sub-modules, requirements and the components it holds.
  const rows = lines(section(s4, 'Module overview', 2)).filter(l => /^\| RG-\d+ · /.test(l)).map(l => l.slice(2, -2).split(' | '));
  assert.deepEqual(rows.map(r => r[0]), [...business, ...platforms].map(m => label(m.group)), 'the overview: one row per module, business first');
  for (const r of rows) {
    const id = r[0].split(' · ')[0], m = tree.modules.find(x => x.group.id === id), held = p.realisation.components.filter(c => modulesOf(c.id).includes(id));
    assert.equal(r[1], isPlatform(id) ? 'Platform' + (m.group.concern ? ': ' + concernTitle(m.group.concern).toLowerCase() : '') : 'Business', r[0] + ': its role');
    assert.equal(r[2], m.children.length ? String(m.children.length) : '—', r[0] + ': its sub-modules');
    assert.ok(r[3].startsWith(isPlatform(id) ? (size(m.group) ? size(m.group) + ' of its own' : 'none of its own') : String(size(m.group))) && (!servedBy(id).length || r[3].endsWith('serves ' + servedBy(id).length.toLocaleString('en-GB'))), r[0] + ': its requirements, and what it serves');
    assert.ok(held.length ? r[4].startsWith(held.length + ' (') && members(r[4].slice(r[4].indexOf('(') + 1, -1)).sort().join() === held.map(c => c.ref).sort().join() : r[4] === '—', r[0] + ': the components it holds, by recordModules: ' + r[4]);
  }
  // Each component in full once, under its home: a platform module it is in, else its first module; the one in no
  // module last; named by reference in the other modules that hold it, and its detail names them.
  for (const c of p.realisation.components) {
    const line = '#### ' + c.ref + ' · ' + c.title, home = homeOf(c.id), shared = modulesOf(c.id).filter(x => x !== home);
    assert.equal(lines(s4).filter(l => l === line).length, 1, c.ref + ' described in full once');
    if (home) assert.ok(lines(blockOf(home)).includes(line), c.ref + ' in full under ' + home);
    else assert.ok(lines(section(s4, 'Records in no module', 2)).includes(line), c.ref + ' under the records in no module');
    for (const other of shared) assert.ok(blockOf(other).includes(c.ref + ' · ' + c.title + ' (in full under ' + label(tree.byId.get(home)) + ')'), c.ref + ': also part of ' + other + ', named by reference');
    if (shared.length) assert.ok(shared.every(x => lines(section(s4, c.ref + ' · ' + c.title, 4)).find(l => l.startsWith('Shared with ')).includes(label(tree.byId.get(x)))), c.ref + ': its detail names the modules it is shared with');
  }
  const viewer = p.realisation.components.find(c => c.id === ids.viewer);
  assert.ok(homeOf(ids.depositComp) === ids.deposit && !homeOf(ids.viewer) && section(s4, 'Records in no module', 2).includes('**' + p.realisation.components.length + '. ' + viewer.ref + ' · Archive viewer** (service): Shows archived statements to an auditor.'), 'the component no module holds, last, numbered last');
  assert.ok(p.realisation.components.some(c => modulesOf(c.id).length > 1 && isPlatform(homeOf(c.id)) && modulesOf(c.id).some(x => !isPlatform(x))), 'a platform component several business modules hold is described under its platform module');
  // In several platform modules, under the one of its concern: the reporting service under the reporting module, not
  // under a platform module whose reporting sub-module it also serves.
  for (const [title, concern] of [['Reporting service', 'reporting'], ['Approval workflow service', 'workflow'], ['Identity and access service', 'access']]) {
    const c = p.realisation.components.find(x => x.title === title), home = tree.byId.get(homeOf(c.id));
    assert.equal(home?.concern, concern, title + ' is described under the ' + concern + ' platform module, not ' + home?.title);
    assert.ok(lines(blockOf(home.id)).includes('#### ' + c.ref + ' · ' + title), title + ': in full there');
  }
  // A module's role, purpose (its Chapter 4 group's) and sub-modules.
  for (const m of tree.modules) {
    const b = blockOf(m.group.id), groups = p.logical.groups.filter(g => homeOf(g.id) === m.group.id);
    assert.ok(groups.length, m.group.title + ': a Chapter 4 group realises it');
    for (const g of groups) assert.ok(b.includes('\nPurpose: ' + g.purpose.replace(/[.]$/, '')) && b.includes('\nRealised in Chapter 4 by ' + (g.ref || g.id) + ' · ' + g.title), m.group.title + ': the purpose of the group that realises it');
    if (m.children.length) assert.ok(lines(b).some(l => l.startsWith('Sub-modules: ' + m.children[0].id + ' · ' + m.children[0].title + ' (' + plural(size(m.children[0]), 'requirement'))), m.group.title + ': its sub-modules with their counts');
    assert.match(b, isPlatform(m.group.id) ? /^A platform module/m : /^A business module: /m, m.group.title + ': its role first');
  }
  // A platform module names the modules that use it, by the contracts its components provide to theirs, and what it
  // serves.
  const reporting = p.realisation.components.find(c => c.title === 'Reporting service'), rmod = homeOf(reporting.id), comps = new Set(p.realisation.components.map(c => c.id)), users = new Map();
  for (const k of p.interfaces.contracts) { const provider = k.kind === 'event' ? k.from : k.to, consumer = k.kind === 'event' ? k.to : k.from; if (provider !== reporting.id || !comps.has(consumer)) continue; const h = homeOf(consumer); if (h && h !== rmod) users.set(h, [...(users.get(h) || []), k.ref].sort()); }
  const usedBy = lines(blockOf(rmod)).find(l => l.startsWith('Used by: ')).slice(9, -1).split('; '), more = /^and (\d+) more$/.exec(usedBy.at(-1)), listed = more ? usedBy.slice(0, -1) : usedBy;
  assert.ok(users.size >= 3 && listed.length + (more ? Number(more[1]) : 0) === users.size, 'a platform module names every module that uses it: ' + usedBy.join('; '));
  for (const x of listed) { const id = x.split(' · ')[0], refs = members(x.slice(x.lastIndexOf(' (') + 2, -1)).sort(); assert.deepEqual(refs, users.get(id), x + ': the contracts by which it uses the platform module'); }
  assert.match(blockOf(rmod), /^A platform module for reporting and analytics: [^\n]*; it serves [\d,]+ requirements in [\d,]+ other modules, those whose capability theme is “[^”]+”\.$/m, 'and what it serves');
  // Its own integration and invariant under it; the party two modules share in the shared part.
  const dep = blockOf(ids.deposit), scheme = p.interfaces.parties.find(r => r.id === ids.scheme), authority = p.interfaces.parties.find(r => r.id === ids.authority), inv = p.interfaces.invariants.find(r => r.id === ids.invariant);
  assert.ok(lines(dep).includes('#### 1. ' + scheme.ref + ' · Card scheme') && lines(dep).includes('#### Data invariants') && dep.includes('**' + inv.ref + ' · One answer per authorisation** (uniqueness): '), 'the module’s own integration and invariant under it');
  assert.ok(lines(section(s4, 'External integrations', 2)).includes('### 1. ' + authority.ref + ' · Tax authority') && !s4.includes('#### 1. ' + authority.ref), 'the party two modules share in the shared part');
  assert.ok(!parts.includes('Data invariants'), 'no shared invariant part when every invariant belongs to one module');
  // A party a person added without links is placed by what it touches (recordAttachments: the components its contracts
  // join); one that touches nothing is in no module and prints with the records in no module.
  const printer = p.interfaces.parties.find(r => r.id === ids.printer), registry = p.interfaces.parties.find(r => r.id === ids.registry);
  assert.ok(!RM.get(ids.printer)?.modules?.length && RA.get(ids.printer)?.by === 'contracts' && RA.get(ids.printer).modules.join() === ids.deposit, 'the print house: in no module by its own links, attached to the deposit accounts by its contract');
  assert.ok(lines(dep).includes('#### 2. ' + printer.ref + ' · Statement print house'), 'and printed under them, after the card scheme');
  assert.ok(!RM.get(ids.registry)?.modules?.length && !RA.has(ids.registry) && lines(section(s4, 'Records in no module', 2)).includes('#### 1. ' + registry.ref + ' · Industry registry') && !lines(section(s4, 'External integrations', 2)).some(l => l.includes(registry.ref)), 'a party that touches nothing: with the records in no module, not among the shared integrations');
  pass('section 4 by module: the overview (' + rows.length + ' rows), the specification table, ' + business.length + ' business then ' + platforms.length + ' platform modules, each with its role, purpose, sub-modules, the modules it uses and is used by, its components in full once (a platform component under its platform module) and those it shares by reference; its own integrations and invariant; the records in no module after the modules; membership by recordModules, then recordAttachments (a party a person added without links placed by the component its contract joins, one that touches nothing with the records in no module)');
}

// 2 (open questions). Each module's own list, each record and field asked once across the section, the overview
// counting them; what no module holds asked of the section.
{
  const lists = [...tree.modules.map(m => [m.group.id, maybe(blockOf(m.group.id), 'Open questions', 4)]).filter(([, b]) => b), ['', section(s4, 'Open questions', 2)]];
  const seen = new Map(), note = (where, r, f) => { const k = r + '|' + f; assert.ok(!seen.has(k), k + ' asked twice: in ' + seen.get(k) + ' and ' + (where || 'the section')); seen.set(k, where || 'the section'); };
  // A line of a module's list that names all its records of a kind ("both external integrations", "all 3 components")
  // stands for the records the module prints of that kind: its component details, its integrations, its Chapter 4 groups.
  const allOf = (where, x) => { const b = blockOf(where), heads4 = lines(b).filter(l => l.startsWith('#### ')).map(l => l.slice(5)); const refs = /^component/.test(x.noun) ? heads4.filter(h => /^[A-Z]+-\d+ · /.test(h)).map(h => h.split(' · ')[0]) : /^external integration/.test(x.noun) ? heads4.filter(h => /^\d+\. [A-Z]+-\d+ · /.test(h)).map(h => h.split(' ')[1]) : /^responsibility group/.test(x.noun) ? [...(lines(b).find(l => l.startsWith('Realised in Chapter 4 by ')) || '').matchAll(/\b(GRP-\d+) · /g)].map(m => m[1]) : []; assert.equal(refs.length, x.all, where + ': "' + x.line + '" names all ' + x.all + ' of its records'); return refs; };
  for (const [where, b] of lists) { for (const x of notStated(b)) for (const f of x.fields) for (const r of x.all && where ? allOf(where, x) : x.refs) note(where, r, f); for (const q of questions(b)) for (const x of q) for (const f of x.fields) for (const r of x.refs) note(where, r, f); }
  const rows = lines(section(s4, 'Module overview', 2)).filter(l => /^\| RG-\d+ · /.test(l)).map(l => l.slice(2, -2).split(' | '));
  for (const [id, b] of lists.filter(([id]) => id)) { const n = notStated(b).reduce((k, x) => k + x.fields.length * (x.all || x.refs.length), 0) + questions(b).flat().reduce((k, x) => k + x.fields.length * x.refs.length, 0); assert.equal(rows.find(r => r[0].startsWith(id + ' · '))[5], String(n), id + ': the overview counts its open questions'); }
  for (const m of tree.modules.filter(x => !maybe(blockOf(x.group.id), 'Open questions', 4))) assert.equal(rows.find(r => r[0].startsWith(m.group.id + ' · '))[5], '—', m.group.title + ': no open question, a dash');
  const scheme = p.interfaces.parties.find(r => r.id === ids.scheme), inv = p.interfaces.invariants.find(r => r.id === ids.invariant), authority = p.interfaces.parties.find(r => r.id === ids.authority), viewer = p.realisation.components.find(c => c.id === ids.viewer);
  assert.equal(seen.get(scheme.ref + '|security considerations'), ids.deposit, 'the module’s integration asks its open field in the module’s list');
  assert.equal(seen.get(inv.ref + '|owner'), ids.deposit, 'and so does its invariant');
  assert.equal(seen.get(authority.ref + '|protocols'), 'the section', 'a shared party asks in the section’s list');
  assert.equal(seen.get(viewer.ref + '|architectural solution'), 'the section', 'and so does a component in no module');
  const printer = p.interfaces.parties.find(r => r.id === ids.printer), registry = p.interfaces.parties.find(r => r.id === ids.registry);
  assert.ok(seen.get(printer.ref + '|security considerations') === ids.deposit && seen.get(registry.ref + '|security considerations') === 'the section', 'a party placed by its contract asks in its module’s list; one in no module, in the section’s');
  assert.match(section(blockOf(ids.deposit), 'Open questions', 4), /^Each question this module leaves open, once, /m, 'a module’s list says it is the module’s');
  pass('each module lists its own open questions (' + (lists.length - 1) + ' lists), each record and field once across the section, and the overview counts them; what no module holds is asked of the section');
}

// 3. The drivers a component serves, each with why; without them, how many reach it.
{
  const one = architectureMarkdown(p, {format: 1}).markdown, lineOf = (m, c) => lines(m).find(l => new RegExp('^\\*\\*\\d+\\. ' + c.ref + ' · ').test(l));
  const byId = new Map(p.quality.drivers.map(d => [d.id, d])), low = t => t.replace(/^([A-Z])(?=[a-z])/, x => x.toLowerCase()).replace(/[.]$/, '');
  let served = 0, counted = 0;
  for (const c of p.realisation.components) {
    const l = lineOf(md, c), ss = (c.serves || []).filter(s => byId.has(s.driverId)), f1 = / Drivers: (.*)\.$/.exec(lineOf(one, c))[1];
    if (ss.length) {
      served++;
      assert.ok(l.endsWith(' Serves: ' + ss.map(s => codes.get(s.driverId) + ' ' + byId.get(s.driverId).title + ', because ' + low(s.reason)).join('; ') + '.'), c.ref + ': each driver it serves, with its reason: ' + l);
      assert.ok(ss.every(s => f1.split('; ').includes(codes.get(s.driverId) + ' (served)')), c.ref + ': format 1 lists the drivers it serves among its drivers');
      continue;
    }
    if (/^none reaches it/.test(f1)) { assert.ok(!/ (?:Drivers|Serves): /.test(l), c.ref + ': no driver reaches it, and none is printed'); continue; }
    counted++;
    assert.match(l, new RegExp(' Drivers: ' + f1.split('; ').length + ' reach(?:es)? it through (?:its responsibilities and the requirements it realises|its responsibilities|the requirements it realises)\\.$'), c.ref + ': how many drivers reach it, not the list');
  }
  assert.ok(served >= 15 && counted === 1 && !lineOf(md, p.realisation.components.find(c => c.id === ids.teller)).includes('Serves: '), 'the drafted components name what they serve; the one that no longer does is counted (' + served + ', ' + counted + ')');
  assert.ok(!/^\*\*\d+\. [^\n]* Drivers: [^\n]*\(through /m.test(md), 'no list of drivers on a component’s line');
  pass('the drivers a component serves, each with its code, title and reason (' + served + ' components); one that names none says how many drivers reach it (format 1 lists them; both read as its drivers stated)');
}

// 4. The reader reads the same design from format 1, format 2 and format 2 by module.
{
  const one = architectureMarkdown(p, {format: 1}), flat = architectureMarkdown(p, {format: 2, modules: false}), by = architectureMarkdown(p, {format: 2});
  assert.ok(by.markdown.includes('\n## Module overview\n') && !flat.markdown.includes('\n## Module overview\n') && !one.markdown.includes('\n## Module overview\n'), 'format 2 reads by module; format 1 and the flat layout do not');
  const plain = r => JSON.parse(JSON.stringify(r, (k, v) => (v instanceof Map ? [...v] : v))), byRef = xs => plain(xs).sort((a, b) => a.ref.localeCompare(b.ref));
  const A = parseArchitectureEdition(flat.markdown), Bm = parseArchitectureEdition(by.markdown);
  assert.ok(Bm.components.length === p.realisation.components.length && Bm.integrations.length === p.interfaces.parties.length, 'every component and integration read by module');
  assert.deepEqual(byRef(Bm.components), byRef(A.components), 'the same components, each read the same, field by field');
  assert.deepEqual(byRef(Bm.integrations), byRef(A.integrations), 'the same integrations');
  const key = f => [f.section, f.kind, f.ref, f.field, f.check, f.detail].join('|'), summary = r => ({score: r.score, met: r.met, records: r.records, pass: r.pass, sections: r.sections.map(s => [s.n, s.records, s.met, s.statements, s.open, s.faults, s.skeleton, s.reasons.join(';')])});
  const recordsOf = {2: p.quality.drivers, 3: p.decisions.records, 4: [...p.realisation.components, ...p.interfaces.parties]};
  for (const [how, read] of [['as built', d => d.content], ['reread', d => contentReading(d.markdown)], ['reread with its records', d => contentReading(d.markdown, {records: recordsOf})]]) {
    const r1 = read(one), r2 = read(flat), r3 = read(by);
    assert.deepEqual(plain(r2), plain(r1), how + ': format 1 and format 2 read the same');
    assert.deepEqual(summary(r3), summary(r2), how + ': by module, the same score and counts per section');
    assert.deepEqual(r3.findings.map(key).sort(), r2.findings.map(key).sort(), how + ': and the same findings');
  }
  assert.deepEqual(plain(doc.content), plain(by.content), 'the export reads as the edition by module');
  pass('the reader reads the same records from format 1, format 2 and format 2 by module: ' + by.content.line);
}

// 5. No "open: …" marker in format 2; what sections 5 and 6 and the obligations leave open is named once; no filler.
{
  const editions = Object.fromEntries(['all', 'delivery', 'review'].map(a => [a, a === 'all' ? md : sddDocument(p, {figures: false, audience: a}).markdown]));
  for (const [a, m] of Object.entries(editions)) {
    assert.ok(!/open: /.test(m) && !/\| open \|/.test(m), a + ': no "open: …" marker and no "open" cell');
    for (const phrase of ['(no product yet)', 'no product named yet', 'No requirement is in this group yet.']) assert.ok(!m.includes(phrase), a + ': no "' + phrase + '"');
  }
  // The products not named, once: in section 4's own list, every capability the components stand on; no module's list
  // repeats them.
  const specRows = lines(section(s4, 'Component specification table', 2)).filter(l => /^\| [A-Z]+-\d+ · /.test(l)).map(l => l.split(' | ')), caps = new Set(specRows.flatMap(r => r[3].split('; ')).filter(t => /^TC-\d+$/.test(t)));
  const products = notStated(section(s4, 'Open questions', 2)).filter(x => x.fields.includes('product'));
  assert.ok(caps.size >= 10 && products.length === 1 && products[0].all === caps.size, 'the products not named, one line for every capability the components stand on: ' + products[0]?.line);
  assert.ok(tree.modules.every(m => !notStated(maybe(blockOf(m.group.id), 'Open questions', 4)).some(x => x.fields.includes('product'))), 'and no module’s list names them again');
  assert.equal(lines(s4).filter(l => /^Technologies: TC-\d+ /.test(l)).length, specRows.filter(r => r[3] !== '—').length, 'each component that stands on a capability names it under Technologies');
  assert.deepEqual(doc.openItems.causes.filter(c => c.cause === 'Product not named for a capability').map(c => [c.chapter, c.count]), [[7, caps.size]], 'Appendix B lists them once, by cause');
  // Section 6: the migration's fields not stated and the gap plan's groups no component closes, named once.
  const s6 = section(md, S6), open6 = notStated(section(s6, 'Open questions', 2)), gapRows = lines(section(s6, 'Gap plan to the next version', 2)).filter(l => /^\| RG-\d+ · /.test(l)).map(l => l.split(' | '));
  const mig = p.roadmap.migrations[0], unstatedMig = [['scope', 'scope'], ['volumes', 'volumes'], ['reconciliation', 'reconciliation'], ['parallelRun', 'parallel run'], ['rollback', 'rollback'], ['rehearsal', 'rehearsal']].filter(([f]) => !String(mig[f] || '').trim());
  assert.ok(unstatedMig.length && open6.some(x => x.refs.includes(mig.ref || mig.id) &&unstatedMig.every(([, w]) => x.fields.includes(w))), 'the migration’s fields not stated, named in section 6’s open questions: ' + open6.map(x => x.line).join(' | '));
  assert.ok(!lines(section(s6, 'Migration', 2)).some(l => /^- (?:Scope|Volumes|Reconciliation|Parallel run|Rollback|Rehearsal): /.test(l)), 'and no line in the record for them');
  const dashed = gapRows.filter(r => r[2] === '—').map(r => r[0].slice(2).split(' · ')[0]), closes = open6.find(x => x.fields.includes('a component that closes its delivery gaps'));
  assert.ok(!dashed.length || (closes && dashed.every(g => closes.all || closes.refs.includes(g))), 'a group no component closes: a dash, named once');
  // The delivery obligations: each owner, due date or acceptance not stated, named once in the part's open questions.
  const ob = section(editions.delivery, 'Delivery obligations'), asked = notStated(maybe(ob, 'Open questions', 2));
  let named = 0;
  for (const a of p.finalReview.actions) for (const [f, w] of [['owner', 'owner'], ['due', 'due date'], ['acceptance', 'acceptance']]) if (!String(a[f] || '').trim()) { named++; assert.ok(asked.some(x => x.fields.includes(w) && (x.refs.includes(a.id) || x.all)), a.id + ': its ' + w + ' not stated, named once'); }
  assert.ok(named > 0 && /^Each question this part leaves open, once, with the records and fields it is asked of; then the fields not stated, with the records that leave them so\.$/m.test(ob), 'the obligations’ list, which no appendix of the delivery edition repeats');
  // Appendix A: a platform module that owns no requirement says what it serves.
  for (const m of platforms.filter(x => !size(x.group))) {
    const served = servedBy(m.group.id), across = new Set(served.map(r => tree.home.get(r).moduleId));
    assert.ok(section(md, label(m.group) + ' (0 requirements)', 3).includes('It owns no requirement of its own; it serves ' + plural(served.length, 'requirement') + ' in ' + plural(across.size, 'other module') + ', those whose capability theme is ' + orList(m.group.serves[0].values.map(v => '“' + v + '”')) + '.'), m.group.title + ': Appendix A says what it serves');
  }
  pass('format 2 prints no "open: …" marker in any edition: section 6 names the migration’s fields and the gaps no component closes once, the delivery obligations theirs (' + named + '); no "(no product yet)" or "no product named yet" (the ' + caps.size + ' capabilities without a product asked once), and no "No requirement is in this group yet." for a platform module that serves');
}

// 6. The headings render at their levels in HTML, the module parts among them.
{
  const html = renderSDD(md, logicalGraph(p), {figures: {figures: [], manifest: [], omitted: []}});
  assert.ok(html.includes('>Module overview</h2>') && /<h3 id="[^"]+">RG-001 · Deposit Accounts<\/h3>/.test(html) && /<h4 id="[^"]+">APP-001 · Deposit Accounts service<\/h4>/.test(html) && !/>#+ /.test(html), 'the module parts as h2, the modules as h3 and their components as h4, no literal "#"');
  pass('the module parts render as h2, the modules as h3 and their components as h4');
}

// 7. Section 5 by module: the module map first, the levels by module as the figure set lists them, the figures from 1.
let drawnMs = 0, drawnPages = 0, drawnFigures = 0;
{
  const t2 = performance.now(), drawn = sddDocument(p);
  drawnMs = Math.round(performance.now() - t2); drawnPages = drawn.pages;
  const set = drawn.figures, list5 = set.section5, C = c4Diagrams(p), m5 = section(drawn.markdown, '5. Architecture models'), comps = list5.filter(e => e.level === 'component');
  drawnFigures = set.figures.length;
  const LEVELS = ['Module map', 'Context diagram (Level 1)', 'Containers by module (Level 2)', 'Components by module (Level 3)', 'Deployment diagram'];
  const chapterModels = list5.filter(e => e.level === 'chapter-model'), chapterTitle = e => 'Chapter ' + e.chapter + ' · ' + e.title;
  assert.ok(C.byModule && C.modules.modules.length === tree.modules.length, 'the design reads its levels 2 and 3 by module');
  assert.deepEqual(chapterModels.map(e => e.chapter), [2, 3, 4, 6, 7, 8, 9, 11], 'the canonical chapter models follow the C4 levels in chapter order');
  assert.deepEqual(kids(m5, 2), [...LEVELS, ...chapterModels.map(chapterTitle)], 'section 5: the module map, the context, the containers and components by module, the deployment, then the canonical chapter models');
  assert.deepEqual(kids(section(md, '5. Architecture models'), 2), LEVELS, 'the same parts in an export without figures');
  // The figures: numbered from 1 in reading order, each placed once, every one in section 5; each level's under its part.
  const figs = m => [...m.matchAll(/^<figure id="figure-(\d+)"/gm)].map(x => Number(x[1]));
  const ids = figs(m5);
  assert.ok(ids.length === set.figures.length && ids.every((n, i) => n === i + 1) && figs(drawn.markdown).length === ids.length, 'the ' + set.figures.length + ' figures run from 1 in reading order, each placed once, all in section 5: ' + ids.join(','));
  assert.deepEqual(list5.flatMap(e => e.figures), ids, 'in the order the figure set lists its levels');
  for (const e of chapterModels) {
    const part = section(m5, chapterTitle(e), 2);
    assert.ok(part.includes('Purpose: ' + e.purpose), chapterTitle(e) + ': its own purpose');
    assert.deepEqual(figs(part), e.figures, chapterTitle(e) + ': only its own figures, in the figure set’s order');
    assert.ok(e.figures.length || (e.reason && part.includes(e.reason)), chapterTitle(e) + ': figures or an explicit omission reason');
  }
  const map = section(m5, 'Module map', 2);
  assert.ok(list5[0].level === 'module-map' && list5[0].figures.join() === '1' && /^<figure id="figure-1" data-scene="module-map"/m.test(map) && map.includes('Purpose: ' + C4_SCENES.moduleMap.purpose), 'the module map first, Figure 1, with its purpose');
  assert.ok(list5[0].modules === tree.modules.length && list5[0].drawn === list5[0].modules && !/^The map draws the /m.test(map), 'every module a box of its own (' + list5[0].modules + '), so no line says they stand together');
  for (const [level, title] of [['context', 'Context diagram (Level 1)'], ['container', 'Containers by module (Level 2)'], ['deployment', 'Deployment diagram']]) assert.deepEqual(figs(section(m5, title, 2)), list5.find(e => e.level === level).figures, title + ': its figures');
  // Level 2: its purpose and why the modules stand for the containers.
  const l2 = section(m5, 'Containers by module (Level 2)', 2), e2 = list5.find(e => e.level === 'container');
  assert.ok(e2.by === 'module' && C.containerWhy && e2.why === C.containerWhy && l2.includes('Purpose: ' + C4_SCENES.moduleContainer.purpose + '\n\n' + C.containerWhy + '\n\n'), 'the containers by module: their purpose, then why the modules stand for them: ' + C.containerWhy);
  // Level 3: the table, one row per module in the set's order; each module the body draws under its own heading with its
  // figures; any other module of two components or more named with its figure in the figures annex, which draws it; a
  // module of one component or none, why it has none, and no heading.
  const l3 = section(m5, 'Components by module (Level 3)', 2), annexSet = architectureFigureSet(p, {annex: true});
  const rows = lines(l3).filter(l => /^\| RG-\d+ · /.test(l)).map(l => /^\| (.+?) \| (.+?) \| (.+?) \|$/.exec(l)).map(x => ({module: unescapeMd(x[1]), components: x[2], figure: x[3]}));
  assert.ok(l3.includes('Purpose: ' + C4_SCENES.moduleComponent.purpose) && l3.includes('Each module, in Chapter 1’s order, with the components it is home to, the ones it shares, and what this level draws of it:'), 'the components by module: their purpose, then the table');
  assert.deepEqual(rows.map(r => r.module), comps.map(e => e.module.ref + ' · ' + e.module.title), 'one row per module, as the figure set lists them (' + comps.length + ')');
  const body = comps.filter(e => e.body), annex = comps.filter(e => e.annex), none = comps.filter(e => e.reason);
  assert.ok(body.length === BODY_MODULES && annex.length > 0 && none.length > 0 && body.length + annex.length + none.length === comps.length, 'the body draws ' + BODY_MODULES + ' modules, the annex the other ' + annex.length + ' of two components or more, ' + none.length + ' are not drawn');
  assert.deepEqual(kids(l3, 3), body.map(e => e.module.ref + ' · ' + e.module.title), 'a heading for each module the body draws, and for no other');
  for (const [i, e] of comps.entries()) {
    // Round 24, part 3: a module lists the components it is home to (where the figures draw them in full) and names the
    // ones it shares; the figure set's entry counts the home components.
    const r = rows[i], u = C.modules.modules.find(x => x.id === e.module.id), refs = u.home.map(c => c.ref), sharedRefs = u.components.filter(c => !u.home.includes(c)).map(c => c.ref);
    const [ownCell, shareCell = ''] = r.components.startsWith('shares ') ? ['', r.components] : r.components.split('; shares ').map((x, j) => (j ? 'shares ' + x : x));
    const listed = e.components ? members(ownCell.slice(ownCell.indexOf(' (') + 2, -1)) : [], more = listed.some(x => / more$/.test(x)), shares = shareCell ? members(shareCell.slice(7)) : [];
    assert.ok(sharedRefs.length ? shares.filter(x => !/ more$/.test(x)).every(x => sharedRefs.includes(x)) && shares.length > 0 : !shareCell, e.key + ': the components it shares (' + r.components + ')');
    assert.ok(u.home.length === e.components && (e.components ? ownCell.startsWith(e.components + ' (') && (more ? listed.filter(x => !/ more$/.test(x)).every(x => refs.includes(x)) : listed.slice().sort().join() === refs.slice().sort().join()) : (sharedRefs.length ? !ownCell : r.components === '—')), e.key + ': its components (' + r.components + ')');
    if (e.body) {
      const n = e.figures;
      assert.ok(n.length && r.figure === (n.length > 1 ? 'Figures ' + n[0] + '–' + n.at(-1) : 'Figure ' + n[0]) + ', below', e.key + ': its figures below (' + r.figure + ')');
      assert.deepEqual(figs(section(l3, e.module.ref + ' · ' + e.module.title, 3)), n, e.key + ': its figures under its heading');
    } else if (e.annex) {
      const title = 'Components of ' + e.module.ref + ' ' + e.module.title;
      assert.ok((e.components >= 2 || sharedRefs.length || u.home.some(c => (C.modules.modulesOf.get(c.id) || []).length > 1)) && r.figure === 'In the figures annex (Appendix D): “' + title + '”', e.key + ': named with its figure in the figures annex (' + r.figure + ')');
      assert.ok(annexSet.figures.some(f => f.key === e.key && f.title === title) && !set.figures.some(f => f.key === e.key), e.key + ': the figures annex draws it, the body does not');
    } else assert.ok(e.components < 2 && !set.figures.some(f => f.key === e.key) && r.figure === (e.components ? 'Not drawn: one component, which section 4 describes' : sharedRefs.length ? 'Not drawn: each of its components is shared, and drawn in full in the figure of its home module' : 'Not drawn: it holds no component'), e.key + ': why it has no figure (' + r.figure + ')');
  }
  // Every module with a figure of its own (home to a component, and holding two or more or home to a shared one, round 24
  // part 3): drawn in the body, or named with its figure in the figures annex.
  for (const u of C.modules.modules.filter(x => x.home.length && (x.components.length >= 2 || x.home.some(c => (C.modules.modulesOf.get(c.id) || []).length > 1)))) assert.ok(body.some(e => e.module.id === u.id) || annex.some(e => e.module.id === u.id), u.ref + ': in the body or named with its annex figure');
  assert.ok(!C.unplaced.length || l3.includes('Components no module holds: '), 'the components no module holds, named');
  // The content reading is the same with the figures drawn.
  const plain = r => JSON.parse(JSON.stringify(r));
  assert.deepEqual(plain(drawn.content), plain(doc.content), 'the content reading of the export with figures is the one without');
  assert.deepEqual(plain(contentReading(drawn.markdown)), plain(contentReading(md)), 'and read back from its Markdown');
  // In HTML: each figure drawn once, where the Markdown places it; the parts at their levels; the table a table.
  const html = renderSDD(drawn.markdown, logicalGraph(p), {figures: set});
  assert.ok(set.figures.every(f => html.split('id="figure-' + f.n + '"').length === 2) && !html.includes('is kept in the Markdown edition'), 'in HTML, each figure drawn once');
  assert.ok(/<h2 id="[^"]+">Module map<\/h2>/.test(html) && /<h2 id="[^"]+">Components by module \(Level 3\)<\/h2>/.test(html) && /<h3 id="[^"]+">RG-001 · Deposit Accounts<\/h3>[\s\S]*?<figure class="model-figure notation-figure" id="figure-5"/.test(html) && /<th scope="col">Figure<\/th>/.test(html), 'and the parts at their levels, the table as a table');
  // Without modules, the levels of before: no module map, the containers and their component diagrams, from Figure 1.
  const {document: rich} = await richProject(), R = sddDocument(rich), r5 = section(R.markdown, '5. Architecture models');
  assert.deepEqual(kids(r5, 2), ['Context diagram (Level 1)', 'Container diagram (Level 2)', 'Component diagrams (Level 3)', 'Deployment diagram', ...R.figures.section5.filter(e => e.level === 'chapter-model').map(chapterTitle)], 'without modules: the C4 levels by container, no module map, followed by the canonical chapter models');
  assert.ok(figs(r5).every((n, i) => n === i + 1) && R.figures.section5[0].level === 'context' && /^The models follow the C4 levels: /m.test(r5), 'from Figure 1, as before');
  pass('section 5 by module: the module map first (Figure 1, ' + list5[0].modules + ' modules), the containers by module with why (' + C.containerWhy + '), the components by module in a table of ' + rows.length + ' modules (' + body.length + ' drawn below, ' + annex.length + ' named with their figure in the figures annex, ' + none.length + ' not drawn, each saying why), the deployment; ' + set.figures.length + ' figures from 1 in reading order, each placed once; the same content reading; without modules, the levels of before');
}
console.log(JSON.stringify({passed: checks.length, checks, measured: {fixtureMs, exportMs, drawnMs, drawnPages, drawnFigures, bytes: Buffer.byteLength(md), modules: tree.modules.length, components: p.realisation.components.length, openItems: doc.openItems.total}}, null, 1));
