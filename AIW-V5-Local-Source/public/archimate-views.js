// The chapter diagrams as ArchiMate views: each chapter's own standard diagram, drawn by the notation
// model and arrangement the workbench uses, mapped back to the connected model's elements and
// relationships so the views in an ArchiMate exchange file show the arranged pictures the architect
// reviewed. An occurrence the model does not record as an element (a capability family, a swimlane,
// the "not placed" box) is not drawn; its contents stand at their own place. DOM-free.
import {architectureModel} from './architecture-model.js';
import {notationDiagram, CHAPTER_SCENES, SCENES} from './notation-model.js';
import {notationLayout} from './notation-layout.js';

const PREFIXES = ['party:', 'unplaced:'];
export function archimateViews(p, {chapters = Object.keys(CHAPTER_SCENES).map(Number)} = {}) {
  const M = architectureModel(p), seen = new Set(), views = [];
  const modelId = id => (M.objects.has(id) ? id : PREFIXES.map(x => (String(id).startsWith(x) ? String(id).slice(x.length) : null)).find(x => x && M.objects.has(x)) || null);
  for (const ch of chapters) {
    const sceneId = CHAPTER_SCENES[ch]?.[0]; if (!sceneId || seen.has(sceneId)) continue; seen.add(sceneId);
    const scene = SCENES.find(s => s.id === sceneId), D = notationDiagram(p, sceneId); if (!D?.nodes.length) continue;
    const L = notationLayout(D, {arrangement: scene.arrangement === 'lanes' ? 'grouped' : scene.arrangement});
    const box = new Map([...L.nodes.map(n => [n.id, n]), ...L.groups.map(g => [g.id, g])]), keyOf = {};
    const occurrence = (key, children = []) => { const ref = modelId(key), b = box.get(key); if (!ref || !b) return null; if (!keyOf[ref]) keyOf[ref] = key; return {key, ref, x: b.x, y: b.y, w: b.w, h: b.h, children}; };
    // Containers that are model elements nest their contents; the others open up.
    const contents = gid => [...D.groups.filter(g => (g.parent || null) === gid).flatMap(g => { const kids = contents(g.id), o = occurrence(g.id, kids); return o ? [o] : kids; }), ...D.nodes.filter(n => (n.group || null) === gid).map(n => occurrence(n.id)).filter(Boolean)];
    const nodes = contents(null);
    const connections = [];
    for (const e of L.edges) {
      const a = modelId(e.from), b = modelId(e.to); if (!a || !b) continue;
      const rid = String(e.id).replace(/^serves:/, '');
      const rel = M.relationships.find(r => r.id === rid && ((r.from === a && r.to === b) || (r.from === b && r.to === a))) || M.relationships.find(r => (r.from === a && r.to === b) || (r.from === b && r.to === a));
      if (rel && !connections.some(c => c.relationshipRef === rel.id)) connections.push({relationshipRef: rel.id, from: a, to: b, bendpoints: e.pts.slice(1, -1)});
    }
    views.push({id: sceneId, name: `Chapter ${ch} · ${scene.title}`, documentation: `${scene.standard}. ${scene.purpose} Drawn by AIW from the saved records; positions are a projection, never facts.`, nodes, connections, keyOf});
  }
  return views;
}
