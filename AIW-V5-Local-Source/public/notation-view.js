// The Diagram view every chapter model mounts in its stage: the chapter's design in the standard
// notation (notation-model.js), arranged by notation-layout.js. The chapter keeps its shell, its
// companion and its selection; this module draws the header strip, the groups, the edges with their
// words, the elements as cards, and offers the Arrange menu, the layer filter, the scene picker,
// pins by dragging, and export to SVG and PNG.
import {notationDiagram, notationScenes, stripToLayers, describeNode, ARRANGEMENTS, LAYERS, KINDS} from './notation-model.js';
import {notationLayout, NL} from './notation-layout.js';
import {projectPreferenceKey} from './project-context.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
const LAYER_NAMES = {process: 'Process', logical: 'Logical application', physical: 'Physical application', data: 'Data', technology: 'Technology', interface: 'Interface', security: 'Security', deployment: 'Deployment'};
const ICONS = {
  application: 'M4 5h16v14H4zM4 9h16', 'application-logical': 'M4 5h16v14H4zM4 9h16M9 9v10', service: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 8v8M8 12h8', data: 'M12 3c-4.4 0-8 1.3-8 3v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6c0-1.7-3.6-3-8-3M4 6c0 1.7 3.6 3 8 3s8-1.3 8-3M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  'data-logical': 'M5 4h14v16H5zM8 9h8M8 13h8M8 17h5', 'data-entity': 'M4 6h16v12H4zM4 11h16M9 6v12', technology: 'M6 6h12v12H6zM9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4', 'technology-physical': 'M4 4h16v6H4zM4 14h16v6H4zM7 7h.01M7 17h.01', 'technology-service': 'M12 2 2 7l10 5 10-5-10-5M2 17l10 5 10-5M2 12l10 5 10-5',
  business: 'M4 20h16M6 20V9l6-5 6 5v11M10 20v-6h4v6', 'business-dark': 'M3 12h13m-4-5 5 5-5 5', process: 'M3 6h11l4 6-4 6H3l4-6z', intent: 'M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7z', decision: 'M12 2 2 12l10 10 10-10z', security: 'M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7zM9 12l2 2 4-4', threat: 'M12 3 2 21h20zM12 9v5M12 17h.01', deployment: 'M7 18a5 5 0 0 1-.5-10 7 7 0 0 1 13 1.5A4 4 0 0 1 18 18z',
  'bpmn-task': '', 'bpmn-event': '', 'bpmn-gateway': ''
};
const iconSVG = f => (ICONS[f] ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICONS[f]}"/></svg>` : '');

export function createNotation({chapter, root, stage, project, onSelect = null}) {
  const pref = () => projectPreferenceKey('aiw-notation-v1-ch' + chapter);
  const scenes = notationScenes(chapter);
  const state = {scene: scenes[0]?.id || null, arrangement: null, layers: [...LAYERS], pins: {}, hub: null, environmentId: null, menu: null};
  try { const v = JSON.parse(localStorage.getItem(pref()) || '{}'); if (scenes.some(s => s.id === v.scene)) state.scene = v.scene; if (ARRANGEMENTS.some(a => a.id === v.arrangement)) state.arrangement = v.arrangement; if (Array.isArray(v.layers)) state.layers = v.layers.filter(l => LAYERS.includes(l)); if (v.pins && typeof v.pins === 'object') state.pins = v.pins; if (typeof v.environmentId === 'string') state.environmentId = v.environmentId; } catch { /* preferences are optional */ }
  const save = () => { try { localStorage.setItem(pref(), JSON.stringify({scene: state.scene, arrangement: state.arrangement, layers: state.layers, pins: state.pins, environmentId: state.environmentId})); } catch { /* optional */ } };
  let D = null, L = null, full = null, sel = null;
  const scene = () => scenes.find(s => s.id === state.scene) || scenes[0];
  const arrangement = () => state.arrangement || scene()?.arrangement || 'tree';
  const pinKey = () => `${state.scene}|${arrangement()}`;
  const pins = () => state.pins[pinKey()] || {};

  function build(p, viewW) {
    full = scene() ? notationDiagram(p, scene().id, {environmentId: state.environmentId}) : null;
    D = full ? stripToLayers(full, state.layers) : null;
    L = D ? notationLayout(D, {arrangement: arrangement(), pins: pins(), hub: state.hub, viewW}) : null;
    return L;
  }
  const nodeHTML = (n, box) => {
    const k = KINDS[n.kind], bpmn = k.family.startsWith('bpmn');
    const cls = `nt-node nt-${k.family}${n.hatched ? ' hatched' : ''}${sel === n.id ? ' sel' : ''}${box.pinned ? ' pinned' : ''}${bpmn ? ' ' + k.family : ''}`;
    const body = bpmn ? (n.kind === 'task' ? `<b>${esc(n.title)}</b>` : `<span class="nt-mark" aria-hidden="true"></span><b class="nt-cap">${esc(n.title)}</b>`) : `<small class="nt-kicker">${iconSVG(k.family)}${esc(n.kicker)}</small><b>${esc(n.title)}</b>${n.sub ? `<span class="nt-sub">${esc(n.sub)}</span>` : ''}${n.ref ? `<i class="nt-ref">${esc(n.ref)}</i>` : ''}`;
    return `<div class="${cls}" data-nt-node="${esc(n.id)}" data-sel="${esc(n.id)}" role="button" tabindex="0" aria-label="${esc((n.kicker || 'Step') + ' ' + n.title)}" style="left:${box.x}px;top:${box.y}px;width:${box.w}px;height:${box.h}px">${body}</div>`;
  };
  const groupSVG = g => { const narrow = g.w < g.title.length * 7.5 + g.sub.length * 5.6 + 40; return `<g class="nt-group nt-g-${esc(g.kind)}" data-nt-group="${esc(g.id)}"><rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="6"/><text x="${g.x + 10}" y="${g.y + 19}" class="nt-gtitle">${esc(g.title)}</text>${g.sub && !narrow ? `<text x="${g.x + g.w - 10}" y="${g.y + 19}" class="nt-gsub" text-anchor="end">${esc(g.sub)}</text>` : ''}</g>`; };
  const edgeSVG = e => { const d = e.pts.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join(''); const lit = sel && (e.from === sel || e.to === sel); return `<g class="nt-edge nt-e-${esc(e.kind)}${e.dashed ? ' dashed' : ''}${lit ? ' lit' : sel ? ' dim' : ''}" data-nt-edge="${esc(e.id)}"><path d="${d}" marker-end="url(#nt-arrow)"/>${e.label || e.step ? `<text x="${e.lx}" y="${e.ly - 4}" class="nt-elabel" text-anchor="middle">${e.step ? `<tspan class="nt-step">${e.step}</tspan> ` : ''}${esc(e.label)}</text>` : ''}</g>`; };
  const headerHTML = h => { const H = D.header; const cell = (k, v) => `<span><small>${k}</small>${v ? esc(v) : '<em>—</em>'}</span>`; return `<div class="nt-header" style="left:${h.x}px;top:${h.y}px;width:${h.w}px;height:${h.h}px"><b>${esc(scene()?.title || '')}</b>${cell('Model', H.model)}${cell('Template', H.template)}${cell('Author', H.author)}${cell('Created', H.created)}${cell('Last modified', H.modified)}${cell('Version', H.version)}</div>`; };

  const api = {
    state, scenes, scene, arrangement,
    diagram: () => D, layout: () => L,
    // The first look shows the whole picture, as a page does; never so far that the words vanish.
    fit() { stage.fitAll(); if (stage.cam.z < 0.62) { stage.cam.z = 0.62; stage.cam.px = 0; stage.cam.py = 0; stage.clamp(); stage.apply(); } },
    render({sel: s = null, viewW = 0} = {}) {
      sel = s; const p = project();
      build(p, viewW);
      const svg = root.querySelector('.cm-svg'), html = root.querySelector('.cm-html'), world = root.querySelector('.cm-world');
      if (!L) { svg.innerHTML = ''; html.innerHTML = '<p class="cm-empty">No diagram for this chapter.</p>'; return {W: 640, H: 320}; }
      world.style.width = L.W + 'px'; world.style.height = L.H + 'px';
      svg.setAttribute('width', L.W); svg.setAttribute('height', L.H); svg.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
      // A chapter's own stylesheet may size its canvas; the diagram's picture keeps its own size.
      svg.style.width = L.W + 'px'; svg.style.height = L.H + 'px'; svg.style.maxWidth = 'none';
      svg.innerHTML = `<defs><marker id="nt-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M1 1 9 5 1 9z" fill="#3c4a44"/></marker><pattern id="nt-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0v8" stroke="#d8c39a" stroke-width="3"/></pattern></defs>`
        + L.bands.map(b => `<g class="nt-band"><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}"/><text x="${b.x + 8}" y="${b.y + 14}">${esc(b.title)}</text></g>`).join('')
        + L.groups.map(groupSVG).join('') + L.edges.map(edgeSVG).join('');
      html.innerHTML = headerHTML(L.header) + L.nodes.map(b => nodeHTML(D.nodes.find(n => n.id === b.id), b)).join('')
        + (D.notes.length ? `<div class="nt-notes" style="left:${NL.LEFT}px;top:${L.H - 30 - 18 * D.notes.length}px">${D.notes.map(t => `<p>${esc(t)}</p>`).join('')}</div>` : '')
        + (!D.nodes.length ? `<div class="cm-empty-card" style="left:${NL.LEFT + 20}px;top:${NL.TOP + 20}px"><b>Nothing to draw yet</b><p>${esc(D.notes[0] || 'This chapter records nothing this diagram shows.')}</p></div>` : '');
      return L;
    },
    // What the lens row carries in the Diagram view: the scene, the arrangement, the layers, pins, export.
    barHTML() {
      const a = arrangement(), sc = scene();
      const scenePick = scenes.length > 1 ? `<label class="cm-scn nt-scene"><span>Diagram</span><select data-nt-field="scene" aria-label="Diagram">${scenes.map(s => `<option value="${s.id}" ${s.id === sc?.id ? 'selected' : ''}>${esc(s.title)}</option>`).join('')}</select></label>` : '';
      const envs = chapter === 10 ? (project()?.runtime?.environments || []) : [];
      const envPick = envs.length > 1 ? `<label class="cm-scn nt-env"><span>Environment</span><select data-nt-field="env" aria-label="Environment">${envs.map(e => `<option value="${esc(e.id)}" ${e.id === (full?.environmentId) ? 'selected' : ''}>${esc(e.title)}</option>`).join('')}</select></label>` : '';
      const arrange = `<div class="nt-menu" data-nt-menu="arrange"><button type="button" class="cm-btn" data-nt="menu" data-id="arrange" aria-expanded="${state.menu === 'arrange'}" aria-haspopup="menu">${arrangeIcon()}<span>Arrange · ${esc(ARRANGEMENTS.find(x => x.id === a)?.title || a)}</span></button>${state.menu === 'arrange' ? `<div class="nt-pop" role="menu">${ARRANGEMENTS.map(x => `<button type="button" role="menuitemradio" aria-checked="${x.id === a}" data-nt="arrange" data-id="${x.id}"><b>${esc(x.title)}</b><small>${esc(x.sub)}</small></button>`).join('')}<button type="button" data-nt="reset" ${Object.keys(pins()).length ? '' : 'disabled'}>Release pinned elements (${Object.keys(pins()).length})</button></div>` : ''}</div>`;
      const hidden = LAYERS.length - state.layers.length;
      const layers = `<div class="nt-menu" data-nt-menu="layers"><button type="button" class="cm-btn" data-nt="menu" data-id="layers" aria-expanded="${state.menu === 'layers'}" aria-haspopup="menu">${layersIcon()}<span>Layers${hidden ? ` · ${hidden} hidden` : ''}</span></button>${state.menu === 'layers' ? `<div class="nt-pop" role="menu">${LAYERS.map(l => { const n = full ? full.nodes.filter(x => x.layer === l).length : 0; return `<label class="nt-layer${n ? '' : ' none'}"><input type="checkbox" data-nt="layer" data-id="${l}" ${state.layers.includes(l) ? 'checked' : ''}> ${esc(LAYER_NAMES[l])}<small>${n}</small></label>`; }).join('')}<button type="button" data-nt="layers-all">Show every layer</button></div>` : ''}</div>`;
      const exp = `<div class="nt-menu"><button type="button" class="cm-btn" data-nt="export" data-id="svg" title="Download this diagram as SVG">${exportIcon()}<span>SVG</span></button><button type="button" class="cm-btn" data-nt="export" data-id="png" title="Download this diagram as PNG">${exportIcon()}<span>PNG</span></button></div>`;
      return scenePick + envPick + arrange + layers + exp;
    },
    status() { if (!D) return ''; const c = D.counts, drawn = L?.groups.length || 0; return `${scene()?.title || 'Diagram'} · ${c.nodes} element${c.nodes === 1 ? '' : 's'} · ${c.edges} relationship${c.edges === 1 ? '' : 's'}${drawn ? ` · ${drawn} group${drawn === 1 ? '' : 's'}` : ''}${c.hidden ? ` · ${c.hidden} hidden by the layers` : ''} · ${ARRANGEMENTS.find(x => x.id === arrangement())?.title || ''}`; },
    legendHTML() {
      const fam = [['application', 'Physical application component'], ['application-logical', 'Logical application component'], ['service', 'Application service'], ['data-logical', 'Logical data component'], ['data', 'Physical data component'], ['technology', 'Logical technology component'], ['technology-service', 'Technology service'], ['technology-physical', 'Physical technology component'], ['business', 'Business element'], ['security', 'Security control'], ['threat', 'Threat'], ['deployment', 'Placement']];
      const used = new Set((full?.nodes || []).map(n => KINDS[n.kind].family)), words = [...new Set((full?.edges || []).map(e => e.label).filter(Boolean))];
      return `<h5>Elements</h5>${fam.filter(([f]) => used.has(f)).map(([f, t]) => `<p><i class="nt-k nt-${f}">${iconSVG(f)}</i>${esc(t)}</p>`).join('') || '<p>Nothing drawn.</p>'}<p><i class="nt-k hatched"></i>Not chosen, not placed, or not selected</p>${(full?.groups || []).length ? `<p><i class="nt-k group"></i>${[...new Set(full.groups.map(g => g.kind))].map(k => ({system: 'application', module: 'module', external: 'external system', boundary: 'trust zone', environment: 'environment', zone: 'site or zone', lane: 'swimlane', unplaced: 'not placed', family: 'capability family'}[k] || k)).join(', ')}</p>` : ''}${words.length ? `<h5>Relationships</h5><p><svg width="40" height="10"><line x1="2" y1="5" x2="32" y2="5" stroke="#3c4a44" stroke-width="1.4" marker-end="url(#nt-arrow)"/></svg>${esc(words.join(' · '))}</p>` : ''}<p class="cm-muted">Every element is a saved record; positions are the reader's, never facts.</p>`;
    },
    readingHTML() { const sc = scene(); return `<section><h4>Reading this diagram</h4><p>${esc(sc?.title || 'This diagram')} in the standard notation: each box is a saved record with its element type above its name; each connector carries its relationship. ${esc(sc?.standard ? 'It answers the “' + sc.standard + '” page of a solution architecture document.' : '')}</p><p><b>Arrange</b> changes only where things stand; <b>Layers</b> strips what you do not want to see; drag an element to pin it. Export gives the same picture as SVG or PNG.</p></section>`; },
    specimenHTML(id) {
      const n = full?.nodes.find(x => x.id === id); if (!n) return '';
      const g = full.groups.find(g => g.id === n.group), r = n.record || {};
      const rows = [['Type', n.kicker || 'Process step'], ['Reference', n.ref], ['In', g?.title], ['Detail', n.sub], ['Purpose', r.purpose || r.description || r.scenario], ['Owner', r.owner], ['Status', r.status || r.state]].filter(([, v]) => v);
      return `<section class="cm-spec"><h4>${esc(n.kicker || 'Process step')}</h4><p class="cm-spec-t"><b>${esc(n.title)}</b></p><p>${esc(describeNode(full, id))}</p><dl class="cm-dl">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>`;
    },
    tipHTML(id) { const n = full?.nodes.find(x => x.id === id); return n ? `<b>${esc(n.title)}</b>${esc(describeNode(full, id))}<small class="h">Drag to pin · Enter to select</small>` : ''; },
    // The controls of the Diagram view; true when the click was one of them.
    handle(e) {
      const f = e.target.closest('[data-nt-field]');
      if (f) return false;
      const b = e.target.closest('[data-nt]'); if (!b || !root.contains(b)) { if (state.menu && !e.target.closest('.nt-pop')) { state.menu = null; api.onChange?.(); } return false; }
      const k = b.dataset.nt, id = b.dataset.id;
      if (k === 'menu') { state.menu = state.menu === id ? null : id; api.onChange?.(); return true; }
      if (k === 'arrange') { state.arrangement = id; state.menu = null; save(); api.onChange?.(true); return true; }
      if (k === 'reset') { delete state.pins[pinKey()]; state.menu = null; save(); api.onChange?.(true); return true; }
      if (k === 'layer') { state.layers = state.layers.includes(id) ? state.layers.filter(l => l !== id) : [...state.layers, id]; save(); api.onChange?.(true); return true; }
      if (k === 'layers-all') { state.layers = [...LAYERS]; state.menu = null; save(); api.onChange?.(true); return true; }
      if (k === 'export') { if (id === 'png') api.exportPNG(); else api.exportSVG(); return true; }
      return false;
    },
    change(e) { const f = e.target.closest('[data-nt-field]'); if (!f) return false; if (f.dataset.ntField === 'scene') { state.scene = f.value; state.hub = null; } if (f.dataset.ntField === 'env') state.environmentId = f.value; save(); api.onChange?.(true); return true; },
    keydown(e) { const n = e.target.closest?.('.nt-node'); if (!n || (e.key !== 'Enter' && e.key !== ' ')) return false; e.preventDefault(); onSelect?.(n.dataset.ntNode); return true; },
    // Dragging an element pins it; a click selects it; the stage does not pan under a drag.
    bindDrag() {
      const html = root.querySelector('.cm-html'); let drag = null;
      html.addEventListener('pointerdown', e => {
        const n = e.target.closest('.nt-node'); if (!n || e.button !== 0) return;
        e.stopPropagation();
        drag = {id: n.dataset.ntNode, el: n, x: e.clientX, y: e.clientY, left: parseFloat(n.style.left), top: parseFloat(n.style.top), moved: false};
        n.setPointerCapture?.(e.pointerId);
      });
      html.addEventListener('pointermove', e => {
        if (!drag) return; const z = stage.cam.z || 1, dx = (e.clientX - drag.x) / z, dy = (e.clientY - drag.y) / z;
        if (!drag.moved && Math.abs(dx) + Math.abs(dy) < 6) return;
        drag.moved = true; drag.el.classList.add('dragging'); drag.el.style.left = Math.max(0, drag.left + dx) + 'px'; drag.el.style.top = Math.max(0, drag.top + dy) + 'px';
      });
      const end = () => { if (!drag) return; const d = drag; drag = null; d.el.classList.remove('dragging'); if (!d.moved) return; root.dataset.suppress = '1'; setTimeout(() => { delete root.dataset.suppress; }, 60); const key = pinKey(); state.pins[key] = {...(state.pins[key] || {}), [d.id]: {x: Math.round(parseFloat(d.el.style.left)), y: Math.round(parseFloat(d.el.style.top))}}; save(); api.onChange?.(true); };
      html.addEventListener('pointerup', end); html.addEventListener('pointercancel', end);
    },
    // The same picture as a file: the SVG holds the header, groups, edges and elements as vectors.
    exportSVG() { const s = api.svgString(); if (!s) return; download(new Blob([s], {type: 'image/svg+xml;charset=utf-8'}), fileName('svg')); },
    exportPNG() {
      const s = api.svgString(); if (!s) return;
      const img = new Image(), url = URL.createObjectURL(new Blob([s], {type: 'image/svg+xml;charset=utf-8'}));
      img.onload = () => { const c = document.createElement('canvas'), k = 2; c.width = L.W * k; c.height = L.H * k; const g = c.getContext('2d'); g.scale(k, k); g.fillStyle = '#fff'; g.fillRect(0, 0, L.W, L.H); g.drawImage(img, 0, 0); URL.revokeObjectURL(url); c.toBlob(b => { if (b) download(b, fileName('png')); }, 'image/png'); };
      img.src = url;
    },
    svgString() {
      if (!L || !D) return '';
      const fill = {application: '#c7d3e6', 'application-logical': '#8ea6c8', service: '#d4e7ee', 'data-logical': '#b9a9d0', data: '#f4c9a4', 'data-entity': '#dbe3ee', technology: '#bcd4a6', 'technology-physical': '#9fc487', 'technology-service': '#e6e79a', business: '#f2c9a3', 'business-dark': '#3d6fb0', process: '#d9e7f2', intent: '#e6e2f2', decision: '#e2d6ea', security: '#e7d2df', threat: '#f0d2c8', deployment: '#cfdce8', 'bpmn-task': '#eef1ee', 'bpmn-event': '#fff', 'bpmn-gateway': '#fff'};
      const H = D.header, t = (x, y, s, cls = '', anchor = 'start') => `<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}">${esc(s)}</text>`;
      const nodes = L.nodes.map(b => { const n = D.nodes.find(x => x.id === b.id), k = KINDS[n.kind]; if (n.kind === 'event') return `<circle cx="${b.x + b.w / 2}" cy="${b.y + b.h / 2}" r="${b.w / 2 - 2}" class="ev"/>${t(b.x + b.w / 2, b.y + b.h + 14, n.title, 'cap', 'middle')}`; if (n.kind === 'gateway') return `<path d="M${b.x + b.w / 2} ${b.y}L${b.x + b.w} ${b.y + b.h / 2}L${b.x + b.w / 2} ${b.y + b.h}L${b.x} ${b.y + b.h / 2}z" class="gw"/>${t(b.x + b.w / 2, b.y + b.h + 14, n.title, 'cap', 'middle')}`; return `<g><rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" rx="3" fill="${n.hatched ? 'url(#nt-hatch)' : (fill[k.family] || '#eee')}" class="nd${n.hatched ? ' hatched' : ''}"/>${n.kind === 'task' ? t(b.x + b.w / 2, b.y + b.h / 2 + 4, n.title, 'ttl', 'middle') : `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="16" fill="#fff" fill-opacity=".55"/>${t(b.x + 6, b.y + 11, n.kicker.toUpperCase(), 'kk')}${t(b.x + b.w / 2, b.y + 33, n.title, 'ttl', 'middle')}${n.sub ? t(b.x + b.w / 2, b.y + 48, n.sub, 'sub', 'middle') : ''}`}</g>`; }).join('');
      const groups = L.groups.map(g => `<g><rect x="${g.x}" y="${g.y}" width="${g.w}" height="${g.h}" rx="6" class="grp ${esc(g.kind)}"/>${t(g.x + 10, g.y + 18, g.title, 'gt')}${g.sub ? t(g.x + g.w - 10, g.y + 18, g.sub, 'gs', 'end') : ''}</g>`).join('');
      const bands = L.bands.map(b => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" class="band"/>${t(b.x + 8, b.y + 14, b.title, 'gs')}`).join('');
      const edges = L.edges.map(e => `<g><path d="${e.pts.map(([x, y], i) => (i ? 'L' : 'M') + x + ' ' + y).join('')}" class="ed${e.dashed ? ' dashed' : ''}" marker-end="url(#nt-arrow)"/>${e.label || e.step ? t(e.lx, e.ly - 4, (e.step ? e.step + ' ' : '') + e.label, 'el', 'middle') : ''}</g>`).join('');
      const head = `<rect x="${L.header.x}" y="${L.header.y}" width="${L.header.w}" height="${L.header.h}" class="hd"/>${t(L.header.x + 10, L.header.y + 29, scene()?.title || '', 'ht')}${[['Model', H.model], ['Template', H.template], ['Author', H.author || '—'], ['Created', H.created || '—'], ['Last modified', H.modified || '—']].map(([k, v], i) => t(L.header.x + 280 + i * 190, L.header.y + 18, k + ': ' + v, 'hk')).join('')}`;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${L.W}" height="${L.H}" viewBox="0 0 ${L.W} ${L.H}" font-family="Inter, Segoe UI, system-ui, sans-serif"><style>.hd{fill:#fbfbf6;stroke:#c9d3c4}.ht{font:600 15px serif;fill:#1e2b26}.hk{font:9px sans-serif;fill:#4c5852}.grp{fill:#f7f8f4;stroke:#9aa79e;stroke-width:1.2}.grp.external{stroke-dasharray:5 4}.grp.boundary{stroke:#a06f92}.grp.zone,.grp.environment{fill:#f5f1ea;stroke:#a5947a}.grp.lane{fill:#fafaf7;stroke:#7d8b83}.grp.unplaced{fill:#fff8ea;stroke:#d09a4e;stroke-dasharray:4 3}.gt{font:600 12px sans-serif;fill:#2b3a33}.gs{font:10px sans-serif;fill:#66736c}.band{fill:#f5f7f2;stroke:#e0e6dc}.nd{stroke:#5a6a63;stroke-width:1}.nd.hatched{stroke-dasharray:4 3}.kk{font:600 6.5px sans-serif;fill:#3b4741;letter-spacing:.04em}.ttl{font:11.5px sans-serif;fill:#1e2b26}.sub{font:8.5px sans-serif;fill:#4c5852}.cap{font:9px sans-serif;fill:#2b3a33}.ev{fill:#fff;stroke:#2f6b4f;stroke-width:2}.gw{fill:#fff;stroke:#a8741f;stroke-width:1.6}.ed{fill:none;stroke:#3c4a44;stroke-width:1.2}.ed.dashed{stroke-dasharray:5 4}.el{font:italic 8.5px sans-serif;fill:#3c4a44;paint-order:stroke;stroke:#fff;stroke-width:3px}</style><defs><marker id="nt-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M1 1 9 5 1 9z" fill="#3c4a44"/></marker><pattern id="nt-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#fff8ea"/><path d="M0 0v8" stroke="#d8c39a" stroke-width="3"/></pattern></defs><rect width="100%" height="100%" fill="#fff"/>${head}${bands}${groups}${edges}${nodes}</svg>`;
    }
  };
  const fileName = ext => `AIW-${(project()?.name || 'design').replace(/[^\w.-]+/g, '-')}-ch${chapter}-${scene()?.id || 'diagram'}.${ext}`;
  return api;
}
function download(blob, name) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
const arrangeIcon = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 3h6v5H9zM3 16h6v5H3zM15 16h6v5h-6zM12 8v4M6 16v-4h12v4"/></svg>`;
const layersIcon = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3 2 8l10 5 10-5-10-5M2 13l10 5 10-5"/></svg>`;
const exportIcon = () => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 17v3h16v-3"/></svg>`;
