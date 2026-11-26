// The one shared lazy entry of the design packages' first-draw readers (rc44, the lead's build S0-D10; rulings D10 and Y1
// of audit/rc44/RULINGS-2026-11-18.md, build contract rules 50 to 52). Every route stub of design-package-routes.js loads
// this entry before a document that holds any package's records is first drawn, and it registers every package the
// browser holds, from each package's registration module: its rows, readers, checks and design rows, no surface. Each
// surface stays in the lazy entry that hosts it (the knowledge workspace, the comparison tools, the Chapter 10 Model view),
// which imports this entry too, by an import that takes no name, so that its surface finds its package registered and
// the readers stay in one script. A package adds one line here, in id order, an import that takes no name: the module
// that registers it (as its line of design-packages.js names the server's).
import './knowledge-package.js'; // p10-knowledge (wp1)
import './topology.js'; // p30-deployment (wp9a)
import './adoption-package.js'; // p40-adoption (wp2)
// What reads the packages' rows at the first draw is the route's reader of every chapter's findings and of the design
// (review-domain.js), which every chapter's studio reaches; this entry reaches it as they do, so that adding the entry
// splits no script of the route (measured without it: model-alternatives-state.js left its chunk of the route, one more
// script file and 470 B more on the route; with it, 29 B). It is on the route already, so loading this entry fetches
// nothing more for it.
import './review-domain.js';
