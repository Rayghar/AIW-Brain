// One lens vocabulary (round 11, A): the seven lens names of Whole design, in one place. Every chapter's lens bar shows
// its subset under these names, and the design anatomy reads its labels from here, so a lens is called the same thing
// on every picture. Each lens carries the body part it is likened to (the surgeon analogy) and the question it answers
// of the whole design; a chapter adds its own question for its subset.
export const LENS_VOCABULARY = [
  {id: 'structure', label: 'Structure', like: 'skeleton', q: 'What holds it together?'},
  {id: 'flow', label: 'Flow', like: 'muscles', q: 'How does work move through it?'},
  {id: 'signals', label: 'Signals', like: 'nervous system', q: 'How do parts talk, and react when a call fails?'},
  {id: 'information', label: 'Information', like: 'circulation', q: 'Who owns which data, and where does it travel?'},
  {id: 'protection', label: 'Protection', like: 'immune system', q: 'What defends it, and what is still exposed?'},
  {id: 'operation', label: 'Operation', like: 'vital signs', q: 'Where does it run, and what fails together?'},
  {id: 'reasoning', label: 'Reasoning', like: 'DNA', q: 'Why is it shaped this way?'}
];
export const LENS_IDS = LENS_VOCABULARY.map(l => l.id);
const byId = Object.fromEntries(LENS_VOCABULARY.map(l => [l.id, l]));
export const lensWord = id => byId[id]?.label || String(id);
// A chapter's lens bar: its subset of the seven, each with the chapter's own question, under the one vocabulary's name
// and likeness. An id outside the vocabulary is refused, so no chapter can coin a lens of its own.
export function chapterLenses(questions) {
  return Object.entries(questions).map(([id, q]) => {
    const l = byId[id]; if (!l) throw Error('Not a lens of the vocabulary: ' + id);
    return {id, label: l.label, like: l.like, q};
  });
}
