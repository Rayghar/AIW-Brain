// The work glance's drawing engine as one module (rc42): the notation model, its layout, its renderer and the figure
// budget are the Model tab's own code, and the glance (work-glance.js) asks for all four at once the first time it
// draws. Asked for one by one they were four requests and four files of a few hundred bytes each; this module is the
// one request. It holds no code of its own.
export {notationDiagram, notationScenes} from './notation-model.js';
export {notationLayout} from './notation-layout.js';
export {notationSVG} from './notation-svg.js';
export {foldDiagram} from './figure-budget.js';
