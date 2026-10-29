// Actual native chapter mounts and handlers. DOM/CSS acceptance; browser pixel
// acceptance is separate. All visibility choices are local view preferences.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {referenceProject} from './notation-fixtures.mjs';

const window = new Window({url: 'http://fixture.local/?chapter=5&tab=model&model=components&object=api-pod'});
Object.assign(globalThis, {window, document: window.document, location: window.location, history: window.history,
  localStorage: window.localStorage, CSS: window.CSS, CustomEvent: window.CustomEvent, MouseEvent: window.MouseEvent,
  AbortController: window.AbortController, ResizeObserver: window.ResizeObserver, MutationObserver: window.MutationObserver,
  requestAnimationFrame: cb => window.requestAnimationFrame(cb), cancelAnimationFrame: id => window.cancelAnimationFrame(id)});
globalThis.fetch = async (url, options = {}) => {
  assert.equal(options.method || 'GET', 'GET');
  assert.match(String(url), /^\/api\/intelligence\/(status\?mode=reasoning|reasonings)/);
  return new Response(JSON.stringify(String(url).includes('status') ? {configured: false} : {runs: []}));
};
const p = referenceProject(), original = JSON.stringify(p);let writes = 0;
window.aiwProjectStore = {value: {document: p}, command() { writes++; throw Error('Connection visibility must not write model records.'); }};
document.body.innerHTML = '<div class="studio"><div class="stage tab-content"></div></div>';
const styles = document.createElement('style');
styles.textContent = (await Promise.all(['story.css', 'utility.css', 'tradeoff.css', 'responsibility.css', 'threat.css', 'realise.css', 'platform.css', 'exchange.css', 'deploy.css', 'notation.css', 'model-round27.css'].map(f => readFile('public/' + f, 'utf8')))).join('\n');
document.head.append(styles);
const realise = await import('./public/realise-view.js'), platform = await import('./public/platform-view.js'),
  exchange = await import('./public/exchange-view.js'), deploy = await import('./public/deploy-view.js');
const story = await import('./public/story-view.js'), utility = await import('./public/utility-view.js'),
  tradeoff = await import('./public/tradeoff-view.js'), responsibility = await import('./public/responsibility-view.js'), threat = await import('./public/threat-view.js');
const {adoptProject, projectPreferenceKey} = await import('./public/project-context.js');
const results = [], pass = x => results.push(x), route = (chapter, model, object = '') => history.replaceState(null, '', `/?chapter=${chapter}&tab=model&model=${model}${object ? '&object=' + encodeURIComponent(object) : ''}`);
const modeButton = (root, mode) => root.querySelector(`[data-cm-connections="${mode}"]`);
const currentMode = root => root.querySelector('[data-cm-connections][aria-pressed="true"]')?.dataset.cmConnections;
const choose = (root, mode) => { const button = modeButton(root, mode);assert.ok(button && !button.disabled, mode + ' is available');button.click();assert.equal(currentMode(root), mode); };
const view = (root, prefix, id) => { const button = root.querySelector(`[data-${prefix}="view"][data-id="${id}"]`);assert.ok(button, id + ' is a native view destination');button.click(); };
const nativeClass = el => [...el.classList].filter(c => !c.startsWith('cm-native-link')).sort().join(' ');
// Happy DOM's HTML parser consumes SVG after an inline <style>. Use its XML
// parser for this one SVG setter, as the existing model-journey suite does.
const parseSVG = svg => Object.defineProperty(svg, 'innerHTML', {
  get() { return [...this.childNodes].map(n => n.outerHTML || n.textContent).join(''); },
  set(markup) { const doc = new window.DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg">' + markup + '</svg>', 'image/svg+xml');this.replaceChildren(...[...doc.documentElement.childNodes].map(n => document.importNode(n, true))); }
});

function verifyVisibility(root, inkSelector, structureSelector, label) {
  const world = root.querySelector('.cm-world'), ink = [...world.querySelectorAll(inkSelector)], structure = [...root.querySelectorAll(structureSelector)];
  assert.ok(ink.length > 0, label + ' draws actual connections');assert.ok(structure.length > 0, label + ' retains meaningful structure');
  assert.equal(root.querySelectorAll('[data-native-connections]').length, 1);
  assert.equal(root.querySelectorAll('[data-cm-connections]').length, 4);
  assert.ok(ink.every(el => el.classList.contains('cm-native-link')), label + ' includes every line, arrow and connection label');
  const members = new Map(ink.map(el => [el, JSON.parse(el.dataset.cmLinks || '[]')]));
  assert.ok([...members.values()].every(ids => ids.length && ids.every(id => typeof id === 'string')), label + ' attaches real view relationship identities to every connector fragment');
  const geometry = ink.map(el => [...el.attributes].filter(a => a.name !== 'class').map(a => [a.name, a.value]));
  const semantics = ink.map(nativeClass), highlighted = ink.filter(el => el.matches('.lit,.carries'));
  assert.ok(highlighted.length > 0, label + ' has native selection or failure context');
  choose(root, 'none');
  assert.ok(ink.every(el => window.getComputedStyle(el).display === 'none'), label + ' hides connecting lines and labels');
  assert.ok(structure.every(el => !el.classList.contains('cm-native-link-off') && window.getComputedStyle(el).display !== 'none'), label + ' keeps cards, cells, lanes and lifelines');
  choose(root, 'all');
  assert.ok(ink.every(el => window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).opacity === '1'), label + ' restores every drawn connection under selection');
  choose(root, 'selected');
  assert.ok(highlighted.every(el => window.getComputedStyle(el).display !== 'none'), label + ' keeps actual highlighted connections');
  assert.ok(ink.filter(el => !highlighted.includes(el)).every(el => window.getComputedStyle(el).display === 'none'), label + ' excludes unrelated connections');
  choose(root, 'overview');
  assert.deepEqual(ink.map(nativeClass), semantics, label + ' preserves native failure and selection semantics');
  assert.deepEqual(ink.map(el => [...el.attributes].filter(a => a.name !== 'class').map(a => [a.name, a.value])), geometry, label + ' does not change record identity or geometry');
  const visible = () => new Set(ink.filter(el => !el.classList.contains('cm-native-link-off')));
  const total = new Set([...members.values()].flat());
  let shown = visible(), reveals = 0;
  while (!root.querySelector('[data-cm-reveal]').hidden) {
    const before = shown;
    root.querySelector('[data-cm-reveal]').click();shown = visible();reveals++;
    assert.ok([...before].every(el => shown.has(el)), label + ' never removes an already visible segment while revealing');
    assert.ok(shown.size > before.size, label + ' reveals complete additional paths');
    assert.deepEqual(ink.map(el => [...el.attributes].filter(a => a.name !== 'class').map(a => [a.name, a.value])), geometry, label + ' revelation never rearranges objects or routes');
    assert.ok(reveals <= Math.ceil(total.size / 6), label + ' reaches all connections in bounded steps');
  }
  assert.equal(shown.size, ink.length, label + ' progressive reveal reaches every path, arrowhead and label');
  for (const id of total) assert.ok(ink.filter(el => members.get(el).includes(id)).every(el => shown.has(el)), label + ' includes every part of ' + id);
  choose(root, 'overview');
  assert.ok(ink.every(el => !el.classList.contains('cm-native-link-all')));
  return {ink: ink.length, highlighted: highlighted.length, structure: structure.length};
}

try {
  realise.mountChapterModel({id: 'api-pod'});let root = document.querySelector('.cm.rz');
  parseSVG(root.querySelector('.cm-svg'));
  const components = verifyVisibility(root, '.rz-route,.rz-label', '.rz-card,.rz-lane', 'Components');
  choose(root, 'none');
  view(root, 'rz', 'specification');
  assert.equal(root.querySelectorAll('[data-native-connections],.nt-connections').length, 0, 'Specification has no connection control');
  for (const id of ['diagram', 'layers', 'table', 'cross']) {
    view(root, 'rz', id);
    assert.equal(root.querySelectorAll('[data-native-connections]').length, 0, id + ' never inherits native connection instruments');
    assert.equal(root.querySelectorAll('.nt-connections').length, ['diagram', 'layers'].includes(id) ? 1 : 0, id + ' has only the control appropriate to its view');
  }
  view(root, 'rz', 'components');assert.equal(currentMode(root), 'none');
  assert.ok([...root.querySelectorAll('.rz-route,.rz-label')].every(el => el.classList.contains('cm-native-link-off')));
  pass({view: 'Components', ...components, result: 'All, Selected, None and Overview include interaction labels; shared views have no duplicated native controls.'});
  realise.leaveChapterModel();

  route(6, 'platform');platform.mountChapterModel(null);root = document.querySelector('.cm.pf');
  root.querySelector('.pf-cap[data-sel]').click();
  const platformReading = verifyVisibility(root, '.pf-arc,.pf-arc-dot', '.pf-cell,.pf-plate,.pf-row,.pf-col', 'Platform');
  choose(root, 'none');view(root, 'pf', 'failure');assert.equal(currentMode(root), 'overview', 'failure is a separate native view preference');
  choose(root, 'all');view(root, 'pf', 'platform');assert.equal(currentMode(root), 'none');
  view(root, 'pf', 'failure');assert.equal(currentMode(root), 'all');
  assert.equal(localStorage.getItem(projectPreferenceKey('aiw-native-connections-v1-6-platform')), 'none');
  assert.equal(localStorage.getItem(projectPreferenceKey('aiw-native-connections-v1-6-failure')), 'all');
  pass({view: 'Platform', ...platformReading, result: 'Dependency ink changes while capability cells and guides remain; Platform and Failure retain separate choices.'});
  platform.leaveChapterModel();

  const contract = p.interfaces.contracts[0].id;route(8, 'data', contract);exchange.mountExchangeModel({id: contract});root = document.querySelector('.studio > .stage > .cm');
  parseSVG(root.querySelector('.cm-svg'));
  root.querySelector('.cm-mvl[data-sel]').click();
  const exchangeReading = verifyVisibility(root, '.cm-mv,.cm-mvl', '.cm-life,.cm-drow,.cm-auth', 'Data flow');
  view(root, 'ex', 'diagram');
  const scene = root.querySelector('[data-nt-field="scene"]');assert.ok([...scene.options].some(o => o.value === 'sequence'));
  scene.value = 'sequence';scene.dispatchEvent(new window.Event('change', {bubbles: true}));
  assert.equal(root.querySelectorAll('[data-native-connections]').length, 0);
  assert.equal(root.querySelectorAll('.nt-connections').length, 1);
  const lifelines = root.querySelectorAll('.nt-lifeline');assert.ok(lifelines.length > 0, 'the current Sequence picture has lifelines');
  root.querySelector('[data-nt="connections"][data-id="none"]').click();
  assert.ok(root.querySelector('.cm-svg').classList.contains('nt-connections-none'));
  assert.equal(root.querySelectorAll('.nt-lifeline').length, lifelines.length);
  assert.ok([...root.querySelectorAll('.nt-lifeline')].every(el => window.getComputedStyle(el).display !== 'none'));
  pass({view: 'Interfaces', ...exchangeReading, result: 'Data flow retains lifelines with lines hidden; the current notation Sequence owns one connection control and retains lifelines.'});
  exchange.leaveExchangeModel();

  const plan = p.runtime.plans.find(x => x.assetId === 'api-pod').id;route(10, 'deploy', plan);deploy.mountChapterModel({id: plan});root = document.querySelector('.cm.dp');
  root.querySelector('[data-dp="depth"][data-id="all"]').click();
  const connectedRow = deploy.deployDebug().L.arcs[0]?.from;assert.ok(connectedRow);
  root.querySelector('[data-row="' + connectedRow + '"]').click();
  const deployment = verifyVisibility(root, '.dp-rail,.dp-arc,.dp-head,.dp-mark,.dp-tick', '.dp-cell,.dp-row,.dp-zcol,.dp-sep', 'Deployment');
  view(root, 'dp', 'failure');
  assert.ok(root.querySelector('.dp-arc.carries'), 'a declared failure has actual failure-carrying dependencies');
  choose(root, 'selected');
  assert.ok([...root.querySelectorAll('.dp-arc.carries')].every(el => !el.classList.contains('cm-native-link-off')));
  pass({view: 'Deployment', ...deployment, result: 'Rails, arrowheads and relationship marks follow visibility; placed copies and zones remain; Selected retains failure-carrying links.'});
  deploy.leaveChapterModel();

  for (const [chapter, model, module, label, cards, ink, structure] of [
    [1, 'boundary', story, 'System context', '.sm-card.ctx[data-card]', '.sm-route,.sm-head,.sm-join,.sm-label', '.sm-card,.sm-lane'],
    [2, 'tree', utility, 'Quality drivers', '.um-card.drv[data-card]', '.um-edge,.um-join', '.um-card,.um-band'],
    [3, 'map', tradeoff, 'Decision alternatives', '.dx-card.alt[data-card]', '.dx-route,.dx-head,.dx-join', '.dx-card'],
    [4, 'map', responsibility, 'Responsibilities', '.lr-card[data-card]', '.lr-route,.lr-label', '.lr-card,.lr-band'],
    [9, 'model', threat, 'Security boundaries', '.tm-card[data-card]', '.tm-route,.tm-head,.tm-join,.tm-label', '.tm-card']
  ]) {
    route(chapter, model); module.mountChapterModel(null); root = document.querySelector('.studio > .stage > .cm');
    parseSVG(root.querySelector('.cm-svg'));
    if (chapter === 2 || chapter === 3) {
      choose(root, 'overview');
      const shown = new Set([...root.querySelectorAll(ink)].filter(el => !el.classList.contains('cm-native-link-off')).flatMap(el => JSON.parse(el.dataset.cmLinks || '[]')));
      if (chapter === 2) assert.ok([...shown].some(id => id.startsWith('U:root>')), 'Utility overview starts with its root hierarchy before driver leaves');
      else {
        const inputs = module.tradeoffDebug().L.routes.filter(r => r.kind === 'weighs').slice(0, 6);
        assert.ok(inputs.length > 0, 'Decisions have actual driver input routes');
        assert.ok(inputs.every(r => shown.has(r.id)), 'Decision overview introduces driver support before alternative branches');
      }
    }
    const card = root.querySelector(cards);assert.ok(card, label + ' contains a selectable record');card.click();
    pass({view: label, ...verifyVisibility(root, ink, structure, label), result: 'Progressive reveal preserves complete paths, labels, source identities, selection, structure and geometry.'});
    module.leaveChapterModel();
  }

  route(5, 'components', 'api-pod');adoptProject('connection-other');document.dispatchEvent(new CustomEvent('aiw:project-switched'));
  realise.mountChapterModel({id: 'api-pod'});root = document.querySelector('.cm.rz');view(root, 'rz', 'components');
  assert.equal(currentMode(root), 'overview', 'a different project does not inherit hidden connections');choose(root, 'all');
  assert.equal(localStorage.getItem(projectPreferenceKey('aiw-native-connections-v1-5-components')), 'all');
  adoptProject('bank-payment');document.dispatchEvent(new CustomEvent('aiw:project-switched'));realise.mountChapterModel({id: 'api-pod'});view(root, 'rz', 'components');
  assert.equal(currentMode(root), 'none', 'the original project retains its own connection preference');
  assert.equal(writes, 0);assert.equal(JSON.stringify(p), original);
  pass({view: 'Preference boundaries', result: 'Project and view preferences remain isolated; mode changes produce no project writes and preserve all source records.'});
} finally {
  realise.leaveChapterModel();platform.leaveChapterModel();exchange.leaveExchangeModel();deploy.leaveChapterModel();
  story.leaveChapterModel();utility.leaveChapterModel();tradeoff.leaveChapterModel();responsibility.leaveChapterModel();threat.leaveChapterModel();
  await window.happyDOM.abort();window.close();
}
console.log(JSON.stringify({passed: results.length, checks: results}, null, 2));
