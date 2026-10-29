// Round 6, Contract F: the technology-category icons and the lexicon that reads a product name into one. The rules live
// in public/technology-icons.js, because the browser loads only public/ and draws the icons on Chapter 7's picture; this
// module re-exports that one for the server and the suites, so there is one lexicon and one set of glyphs.
export {ICONS, ICON_IDS, iconFor, iconsDrawn} from '../public/technology-icons.js';
