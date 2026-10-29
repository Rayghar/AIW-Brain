// The one chapter-name table (round 12, G, GR-UX-16). The shell, the Running board and the review desk, the SDD, the
// chapter reasoning, the change review and the drafters all name a chapter from here, so a chapter reads the same
// everywhere (Chapter 2 is "Architectural drivers" since decision D-02 made it one register of drivers by kind).
//   title: the chapter's name; short: the same name where a line is narrow (the readiness board's columns); holds: what
//   the chapter's records are, where a sentence counts them (the chapter reasoning's brief).
// No imports: every module, on the server and in the browser, can read it without pulling a domain in.
// The rows of the chapter-name table (named apart from model.js's NAMES: the node harness evaluates both in one scope).
const CHAPTER_ROWS = [
  null,
  ['Requirements', 'Requirements', 'Requirements'],
  ['Architectural drivers', 'Architectural drivers', 'Architectural drivers'],
  ['Decisions', 'Decisions', 'Decisions'],
  ['Logical application', 'Logical app.', 'Responsibilities'],
  ['Application realization', 'App. realization', 'Components'],
  ['Logical technology', 'Logical tech.', 'Platform'],
  ['Technology realization', 'Tech. realization', 'Products'],
  ['Interfaces & data', 'Interfaces', 'Interfaces'],
  ['Security', 'Security', 'Threats'],
  ['Deployment / runtime', 'Runtime', 'Runtime'],
  ['Review & realize', 'Review', 'SDD and delivery']
];
const table = i => Object.freeze(Object.fromEntries(CHAPTER_ROWS.map((n, c) => [c, n?.[i]]).filter(([, v]) => v)));
export const CHAPTER_TITLES = table(0);
export const CHAPTER_SHORT = table(1);
export const CHAPTER_HOLDS = table(2);
export const chapterTitle = chapter => CHAPTER_TITLES[chapter] || '';
// "Chapter 2 · Architectural drivers", the arrival line and the label a list of chapters prints.
export const chapterLabel = chapter => (CHAPTER_TITLES[chapter] ? `Chapter ${chapter} · ${CHAPTER_TITLES[chapter]}` : `Chapter ${chapter}`);

// The same chapter metadata also declares the model layers opened by the shell.
// The layers each chapter's Model tab opens with: one table for the shell's sidebar and the model views (round 3, D).
// The eight model layers, in the order the sidebar and the Diagram list them; notation-model.js re-exports them.
export const LAYERS = ['process', 'logical', 'physical', 'data', 'technology', 'interface', 'security', 'deployment'];
export const LAYER_NAMES = {process: 'Process', logical: 'Logical application', physical: 'Physical application', data: 'Data', technology: 'Technology', interface: 'Interface', security: 'Security', deployment: 'Deployment'};
// Saved containers have an architecture level even when they have no drawable notation kind.
// Tables and matrices use that level so groups, boundaries and zones honor the same layer filter.
const LEVEL_LAYER = {intent: 'process', context: 'process', logical: 'logical', application: 'physical', capability: 'technology', technology: 'technology', interaction: 'interface', data: 'data', protection: 'security', deployment: 'deployment'};
export const layerForLevel = level => LEVEL_LAYER[level] || null;
export const CHAPTER_LAYERS = {1: ['process'], 2: ['process', 'logical'], 3: ['process', 'logical'], 4: ['process', 'logical'], 5: ['logical', 'physical'], 6: ['physical', 'technology'], 7: ['technology', 'deployment'], 8: ['physical', 'interface', 'data'], 9: ['security', 'interface', 'physical', 'data'], 10: ['deployment', 'physical', 'technology'], 11: ['process', 'logical', 'physical', 'technology', 'deployment']};
export const chapterLayers = chapter => CHAPTER_LAYERS[Number(chapter)] || [...LAYERS];
