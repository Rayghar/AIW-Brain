// The module structure on screen (round 24, D-24-08), loaded on first use: the rail's Modules section, the module map
// (a shared view of every chapter's Model tab) and Chapter 1's structure screen. Each reads the saved document (never a
// scope's projection: every module is listed whatever the scope) through module-model.js and module-lens.js; a choice
// sets the shell's scope through the shell's own handler ([data-scope-to], app.js). The structure screen sends the
// module structure's commands (requirement-commands.js): propose, a person's reviewed acceptance, discard; a module or a
// sub-module is edited in Chapter 1's group editor ([data-r-edit-group], requirements.js). Nothing here approves anything.
import {moduleTree, MODULE_COLUMNS, proposeModules} from './module-model.js';
import {moduleScope} from './module-scope.js';
import {scopeLens} from './module-lens.js';
import {architectureModel} from './architecture-model.js';
import {scopedChecks} from './readiness-model.js';
import {GROUP_RULE_FIELDS} from './requirement-groups.js';
import {shellScopeId, projectURL, currentProject} from './project-context.js';
import {remember} from './document-memo.js';
import {esc} from './html-escape.js';

const n = v => Number(v || 0).toLocaleString('en-GB');
const plural = (v, one, many) => n(v) + ' ' + (v === 1 ? one : many);
// The records each chapter holds, as its register and its connected model count them; Chapter 11 reads them all.
const CHAPTER_TYPES = {1: ['requirement'], 2: ['quality'], 3: ['decision'], 4: ['responsibility'], 5: ['component'], 6: ['capability'], 7: ['technology'], 8: ['contract', 'data', 'party'], 9: ['threat', 'control'], 10: ['runtime', 'instance']};
const RECORD_WORDS = {1: ['requirement', 'requirements'], 2: ['driver', 'drivers'], 3: ['decision', 'decisions'], 4: ['responsibility', 'responsibilities'], 5: ['component', 'components'], 6: ['capability', 'capabilities'], 7: ['technology choice', 'technology choices'], 8: ['interface or data record', 'interface and data records'], 9: ['threat or control', 'threats and controls'], 10: ['running part', 'running parts'], 11: ['record', 'records']};
const typesOf = chapter => (Number(chapter) === 11 ? Object.values(CHAPTER_TYPES).flat() : CHAPTER_TYPES[Number(chapter)] || []);
const STATE_WORDS = {proposed: 'Proposed by AIW, not yet accepted', accepted: 'Accepted', mixed: 'Partly accepted'};
const COLUMN_WORDS = Object.fromEntries(GROUP_RULE_FIELDS);
export function moduleProposalAvailability(p,options={}){
  if(!p)return {viable:false,notes:['Open a project before proposing its module structure.'],count:0};
  return remember(p,'module-ui','proposal-availability:'+JSON.stringify(options),()=>{const proposed=proposeModules(p,options);return {viable:proposed.modules.length>0,notes:proposed.notes,count:proposed.modules.length};});
}
const proposalOptions=form=>{const first=form.elements.first.value,second=form.elements.second.value;return {...(first?{first}:{}),...(second==='none'?{second:null}:second?{second}:{})};};
function proposalState(form,p=currentProject()){
  const state=moduleProposalAvailability(p,proposalOptions(form)),status=form.closest('.r-modules')?.querySelector('.r-modules-prerequisite');
  const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=!state.viable;
  if(status)status.textContent=state.viable?state.count+' proposed modules can be derived from these recorded columns. Review remains yours.':state.notes.join(' ')+' Use New module to define the grouping yourself.';
  return state;
}

// ---------------------------------------------------------------- counts and readiness
// A module's requirements, what it serves (a platform module), and the records the chapter shows under its scope.
export function moduleCounts(p, id, chapter) {
  return remember(p, 'module-ui', id + '|' + chapter, () => {
    const S = moduleScope(p, id), L = scopeLens(p, id); if (!S || !L) return null;
    const M = architectureModel(p), types = new Set(typesOf(chapter)), type = x => M.objects.get(x)?.type;
    let here = 0; if (Number(chapter) === 1) here = S.requirements.size; else for (const x of L.shows) if (types.has(type(x))) here++;
    let served = 0; for (const x of S.served) if (type(x) === 'requirement') served++;
    return {requirements: S.requirements.size, served, here};
  });
}
// The chapter's checks on the records a scope shows (readiness-model.js scopedChecks): what is to fix, to confirm and how
// many of its passages pass. Chapter 11's are the whole design's.
const readiness = (p, chapter, lens) => { try { return scopedChecks(p, chapter, lens); } catch { return null; } };
const readyHTML = r => (r?.total ? `${r.toFix ? `<span class="mm-r fix">✕ ${n(r.toFix)} to fix</span> · ` : ''}${r.toConfirm ? `<span class="mm-r confirm">○ ${n(r.toConfirm)} to confirm</span> · ` : ''}<span class="mm-r pass">✓ ${n(r.passing)} of ${plural(r.total, 'passage', 'passages')} passing</span>` : '<span class="mm-r none">No check in this chapter yet</span>');
const herePhrase = (c, chapter) => (Number(chapter) === 1 ? '' : ` · ${n(c.here)} ${RECORD_WORDS[chapter]?.[c.here === 1 ? 0 : 1] || 'records'} here`);

// ---------------------------------------------------------------- the rail's Modules section
// The tree: All modules, the business modules, then the platform modules; the sub-modules of the module in scope under
// it. Each item a button that sets the scope (aria-current on the one held), with its requirements and what the chapter
// on screen holds of it; the structure's state; the way to the module map.
export function railModulesHTML(p, chapter) {
  const tree = moduleTree(p); if (!tree.modules.length) return '';
  const scope = shellScopeId(), held = tree.byId.get(scope), open = held ? (held.kind === 'module' ? held.id : held.parentId) : '';
  const total = (p.artefacts || []).filter(a => a.type === 'requirement').length;
  const item = (g, sub = false) => {
    const c = moduleCounts(p, g.id, chapter) || {requirements: 0, served: 0, here: 0}, label = `${plural(c.requirements, 'requirement', 'requirements')}${c.served ? ' · serves ' + n(c.served) : ''}${herePhrase(c, chapter)}`;
    return `<button type="button" class="rm-item${sub ? ' rm-sub' : ''}" data-scope-to="${esc(g.id)}" aria-current="${g.id === scope}" title="${esc(g.title + ' · ' + label)}"><span class="rm-t">${esc(g.title)}</span><small>${esc(label)}</small></button>`;
  };
  const branch = m => `<li>${item(m.group)}${m.group.id === open && m.children.length ? `<ul class="rm-subs" aria-label="Sub-modules of ${esc(m.group.title)}">${m.children.map(s => `<li>${item(s, true)}</li>`).join('')}</ul>` : ''}</li>`;
  const business = tree.modules.filter(m => m.group.role !== 'platform'), platform = tree.modules.filter(m => m.group.role === 'platform');
  const list = (title, ms) => (ms.length ? `<h3 class="rm-kind">${title} · ${ms.length}</h3><ul class="rm-tree">${ms.map(branch).join('')}</ul>` : '');
  return `<h2 id="rail-modules-title">Modules</h2><p class="rm-state">${esc(STATE_WORDS[tree.state] || '')}${tree.state !== 'accepted' ? ` · <a href="${esc(projectURL('/?chapter=1&tab=work#modules'))}">review it in Chapter 1</a>` : ''}</p><ul class="rm-tree"><li><button type="button" class="rm-item rm-all" data-scope-to="" aria-current="${!held}"><span class="rm-t">All modules</span><small>${plural(total, 'requirement', 'requirements')}</small></button></li></ul>${list('Business', business)}${list('Platform', platform)}<p class="rm-map"><a href="${esc(projectURL('/?chapter=' + chapter + '&tab=model&model=modules'))}">Open the module map</a></p>`;
}
export function fillRailModules(box, p, chapter) { const html = p ? railModulesHTML(p, chapter) : ''; if (box.dataset.drawn !== html) { box.innerHTML = html; box.dataset.drawn = html; } }

// ---------------------------------------------------------------- the module map
// The functional decomposition as a picture of cards: the business modules as a grid, each card its sub-modules, the
// platform modules as a band; each with what the chapter holds of it and its readiness there. A card chosen scopes to it.
export function moduleMapHTML(p, chapter) {
  const tree = moduleTree(p);
  if (!tree.modules.length) return `<section class="mm" aria-labelledby="mm-title"><h3 id="mm-title">Module map</h3><p class="nt-sheet-empty">The requirements are not organised into modules yet. <a href="${esc(projectURL('/?chapter=1&tab=work#modules'))}">Propose modules in Chapter 1</a>.</p></section>`;
  const scope = shellScopeId(), held = tree.byId.get(scope), words = RECORD_WORDS[chapter] || RECORD_WORDS[11];
  const card = m => {
    const g = m.group, c = moduleCounts(p, g.id, chapter) || {requirements: 0, served: 0, here: 0}, r = readiness(p, chapter, scopeLens(p, g.id)), on = held && (held.id === g.id || held.parentId === g.id);
    const subs = m.children.map(s => { const k = moduleCounts(p, s.id, chapter) || {requirements: 0}; return `<li><button type="button" class="mm-sub" data-scope-to="${esc(s.id)}" aria-current="${s.id === scope}"><span>${esc(s.title)}</span><small>${n(k.requirements)}</small></button></li>`; }).join('');
    return `<li class="mm-card${on ? ' on' : ''}${g.role === 'platform' ? ' platform' : ''}"><h5><button type="button" class="mm-open" data-scope-to="${esc(g.id)}" aria-current="${g.id === scope}">${esc(g.title)}</button></h5><p class="mm-counts">${plural(c.requirements, 'requirement', 'requirements')}${c.served ? ' · serves ' + n(c.served) : ''}${Number(chapter) === 1 ? '' : ' · ' + n(c.here) + ' ' + words[c.here === 1 ? 0 : 1]}</p><p class="mm-ready">${readyHTML(r)}</p>${subs ? `<ul class="mm-subs" aria-label="Sub-modules of ${esc(g.title)}">${subs}</ul>` : ''}</li>`;
  };
  const business = tree.modules.filter(m => m.group.role !== 'platform'), platform = tree.modules.filter(m => m.group.role === 'platform');
  return `<section class="mm" aria-labelledby="mm-title"><header class="mm-head"><h3 id="mm-title">Module map</h3><p>${plural(business.length, 'business module', 'business modules')} and ${plural(platform.length, 'platform module', 'platform modules')} · ${esc(STATE_WORDS[tree.state] || '')} · counts and checks for Chapter ${esc(chapter)}. Choose a module or a sub-module to work in it.</p>${held ? `<p class="mm-held">Scope: ${esc(scopeLens(p, scope)?.title || held.title)} · <button type="button" class="mm-clear" data-action="clear-scope">Clear</button></p>` : ''}</header>${business.length ? `<h4 class="mm-band-title">Business modules</h4><ul class="mm-grid">${business.map(card).join('')}</ul>` : ''}${platform.length ? `<h4 class="mm-band-title">Platform modules · serving the business modules</h4><ul class="mm-grid mm-band">${platform.map(card).join('')}</ul>` : ''}</section>`;
}

// ---------------------------------------------------------------- Chapter 1's structure screen
// The Requirements tab's lead: the tree with each module's role, requirements and state; the partition's findings (a
// requirement in no module or in two, each a filter of the register); a person's reviewed acceptance, refused with its
// reason while the partition is not clean; AIW's proposal from the columns a person chooses when there is none; the
// proposal discarded. A module or sub-module is edited in the group editor.
export function structureHTML(p) {
  const tree = moduleTree(p), reqs = (p.artefacts || []).filter(a => a.type === 'requirement');
  if (!tree.modules.length) {
    if (!reqs.length) return '<section class="r-modules" id="modules" aria-labelledby="r-modules-title"><h3 id="r-modules-title">Modules</h3><p class="r-note">No requirements are recorded yet, so there is nothing to group automatically. Capture requirements first, or create a named module manually and assign requirements when they exist.</p><button type="button" class="r-btn" data-r-action="new-module">New module</button></section>';
    const availability=moduleProposalAvailability(p);
    const cols = [...new Set([...MODULE_COLUMNS.first, ...MODULE_COLUMNS.second])].filter(f => COLUMN_WORDS[f]), options = (none = '') => `<option value="">AIW chooses</option>${none}${cols.map(f => `<option value="${esc(f)}">${esc(COLUMN_WORDS[f])}</option>`).join('')}`;
    return `<section class="r-modules" id="modules" aria-labelledby="r-modules-title"><div class="r-modules-head"><h3 id="r-modules-title">Modules</h3></div><p class="r-note">The requirements are not organised into modules yet. This rule-based proposal reads recorded domain, module or capability-theme columns; it does not invent a decomposition from sparse text. The proposal is saved as proposed; a person reviews and accepts it.</p><form class="r-modules-form" data-mu-form="propose"><label><span>Modules from</span><select name="first">${options()}</select></label><label><span>Sub-modules from</span><select name="second">${options('<option value="none">No sub-modules</option>')}</select></label><button type="submit" class="btn primary" aria-describedby="r-modules-prerequisite"${availability.viable?'':' disabled'}>Propose modules</button></form><p class="r-modules-prerequisite" id="r-modules-prerequisite" role="status">${esc(availability.viable?availability.count+' proposed modules can be derived from the recorded columns.':availability.notes.join(' ')+' Use New module to define the grouping yourself.')}</p><button type="button" class="r-btn" data-r-action="new-module">New module</button><p class="r-modules-error" role="alert" hidden></p></section>`;
  }
  const scope = shellScopeId(), basis = p.requirementGroups?.modules?.basis, clean = !tree.unassigned.length && !tree.doubled.length;
  const reason = !clean ? [tree.unassigned.length ? `${plural(tree.unassigned.length, 'requirement is', 'requirements are')} in no module` : '', tree.doubled.length ? `${plural(tree.doubled.length, 'requirement is', 'requirements are')} in two modules or sub-modules` : ''].filter(Boolean).join(' and ') + ': place each in one module, then accept.' : '';
  const state = g => (g.state === 'accepted' ? 'Accepted' : 'Proposed'), role = (g, sub) => (sub ? 'Sub-module' : g.role === 'platform' ? 'Platform' : 'Business');
  // On a phone the role and the state read under the title (r-mod-meta) and their columns stand down (r-mod-wide).
  const row = (g, sub, count) => `<tr class="${sub ? 'r-mod-sub' : 'r-mod'}${g.id === scope ? ' selected' : ''}"><th scope="row">${sub ? '<span class="r-mod-indent" aria-hidden="true">›</span>' : ''}<button type="button" data-scope-to="${esc(g.id)}" aria-current="${g.id === scope}" title="Work in ${esc(g.title)} across the chapters">${esc(g.title)}</button> <small>${esc(g.id)}</small><span class="r-mod-meta">${role(g, sub)} · ${state(g)}</span></th><td class="r-mod-wide">${role(g, sub)}</td><td>${n(count)}</td><td class="r-mod-wide">${state(g)}</td><td><button type="button" class="r-btn" data-r-edit-group="${esc(g.id)}" aria-label="Edit ${esc(g.title)}">Edit</button></td></tr>`;
  const count = id => moduleScope(p, id)?.requirements.size || 0;
  const bodies = tree.modules.map(m => `<tbody>${row(m.group, false, count(m.group.id))}${m.children.map(s => row(s, true, count(s.id))).join('')}</tbody>`).join('');
  const subs = tree.modules.reduce((k, m) => k + m.children.length, 0), platform = tree.modules.filter(m => m.group.role === 'platform').length;
  const findings = clean ? `<p class="r-modules-clean">Every requirement is in exactly one module or sub-module.</p>` : `<p class="r-modules-findings" role="status">${tree.unassigned.length ? `<button type="button" class="r-link" data-r-cause="module-none">${plural(tree.unassigned.length, 'requirement', 'requirements')} in no module</button>` : ''}${tree.unassigned.length && tree.doubled.length ? ' · ' : ''}${tree.doubled.length ? `<button type="button" class="r-link" data-r-cause="module-two">${plural(tree.doubled.length, 'requirement', 'requirements')} in two</button>` : ''}</p>`;
  const accepted = tree.state === 'accepted', by = accepted ? tree.modules[0].group : null;
  const accept = accepted ? `<p class="r-modules-accepted">Accepted${by?.acceptedBy ? ' by ' + esc(by.acceptedBy) : ''}${by?.acceptedAt ? ' on ' + esc(String(by.acceptedAt).slice(0, 10)) : ''}. A change to a module or its rule keeps it accepted; review the findings above after each change.</p>`
    : `<form class="r-modules-accept" data-mu-form="accept"><label class="r-checkbox"><input type="checkbox" name="reviewed"${clean ? '' : ' disabled'}> I reviewed the modules, the sub-modules and their rules.</label><button type="submit" class="btn primary"${clean ? '' : ' disabled aria-describedby="r-modules-why"'}>Accept the module structure</button>${clean ? '' : `<p id="r-modules-why" class="r-modules-why">${esc(reason)}</p>`}<p class="r-modules-error" role="alert" hidden></p></form>`;
  return `<section class="r-modules" id="modules" aria-labelledby="r-modules-title"><div class="r-modules-head"><h3 id="r-modules-title">Modules · ${n(tree.modules.length - platform)} business, ${n(platform)} platform, ${n(subs)} sub-modules</h3><span class="chip ${accepted ? 'pass' : 'draft'}">${esc(STATE_WORDS[tree.state] || '')}</span></div><p class="r-note">The requirements' functional decomposition: the business modules partition them, the platform modules serve the cross-cutting themes across them.${basis?.first ? ` Proposed from the ${esc((COLUMN_WORDS[basis.first] || basis.first).toLowerCase())} column${basis.second ? `, the sub-modules from the ${esc((COLUMN_WORDS[basis.second] || basis.second).toLowerCase())} column` : ''}.` : ''} Choose a module to work in it in every chapter.</p>${findings}<div class="r-modules-wrap"><table class="r-groups-table r-modules-table"><thead><tr><th scope="col">Module</th><th scope="col" class="r-mod-wide">Role</th><th scope="col">Requirements</th><th scope="col" class="r-mod-wide">State</th><th scope="col"><span class="r-sr-only">Actions</span></th></tr></thead>${bodies}</table></div>${accept}<div class="r-actions"><button type="button" class="r-btn" data-r-action="new-module">New module</button>${accepted ? '' : '<button type="button" class="r-btn" data-mu="discard">Discard the proposal</button>'}</div></section>`;
}
export function fillStructure(box, p) { const html = p ? structureHTML(p) : ''; if (box.dataset.drawn !== html) { box.innerHTML = html; box.dataset.drawn = html; } }

// The structure screen's commands, through the project store; the shell draws the page again once one is saved.
async function send(type, payload, box, done) {
  const store = window.aiwProjectStore, error = box?.querySelector('.r-modules-error');
  if (!store?.command) return;
  for (const b of box?.querySelectorAll('button') || []) b.disabled = true;
  try { await store.command({type, payload}); if (error) error.hidden = true; document.dispatchEvent(new Event('aiw:redraw')); window.dispatchEvent(new CustomEvent('aiw:notice', {detail: {message: done}})); }
  catch (e) { for (const b of box?.querySelectorAll('button') || []) b.disabled = false; if (error) { error.hidden = false; error.textContent = e?.message || 'The change was not saved.'; } }
}
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('submit', e => {
    const form = e.target.closest?.('[data-mu-form]'); if (!form) return; e.preventDefault();
    const box = form.closest('.r-modules');
    if (form.dataset.muForm === 'accept') {
      if (!form.elements.reviewed?.checked) { const error = box?.querySelector('.r-modules-error'); if (error) { error.hidden = false; error.textContent = 'Review the module structure, then tick that you did.'; } form.elements.reviewed?.focus(); return; }
      send('requirements.modules-accept', {reviewed: true}, box, 'The module structure is accepted. Your review is recorded.');
    } else if (form.dataset.muForm === 'propose') {
      if(!proposalState(form).viable)return;
      send('requirements.modules-propose', proposalOptions(form), box, 'Modules proposed from the columns. Review them, then accept.');
    }
  });
  document.addEventListener('change',e=>{const form=e.target.closest?.('[data-mu-form="propose"]');if(form)proposalState(form);});
  document.addEventListener('click', e => {
    const b = e.target.closest?.('[data-mu]'); if (!b || b.disabled) return;
    const box = b.closest('.r-modules');
    if (b.dataset.mu === 'discard') { b.dataset.mu = 'discard-sure'; b.textContent = 'Discard it: the domain groups return'; b.classList.add('danger'); return; }
    if (b.dataset.mu === 'discard-sure') send('requirements.modules-discard', {}, box, 'The proposed structure is discarded.');
  });
}
// The structure screen, wherever Chapter 1 draws its frame ([data-r-modules]); the module map's sheet asks moduleMapHTML.
export function fillScreens(root = document, p = currentProject()) { for (const box of root.querySelectorAll('[data-r-modules]')) fillStructure(box, p); }
