// The design packages this server runs (rc44, slice S0; audit/rc44/BUILD-PLAN-2026-11-16.md §4), a server module that
// worker.js imports when it starts. Each package is one line here: an import of the module that registers it
// (registerExtension, public/design-extensions.js), so that every package is registered, synchronously, before the first
// request, and worker.js then checks each against the registration contract (design-extension-boundary.js
// assertExtensions). The browser does not read this file: there a package registers when its lazily loaded module
// arrives, and its route stub {id, needs, load} says when that must be before a document is drawn.
//
// A slice that adds a package adds its line below, and nothing else in the shared machinery.
import './adoption-server.js'; // p40-adoption: applied mechanisms bound to the model (wp2)
