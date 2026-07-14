# AIW v0.10.0-rc.10.2 Clinical Refactor Foundation

This release creates the package boundaries and runtime scaffolding required before deeper Admin, Knowledge Ops, ArchitectureView and persistence work continues. It intentionally preserves product behaviour while moving toward a global-ready architecture.

## Boundaries added
- packages/admin
- packages/knowledge
- packages/modelling
- packages/intelligence
- packages/integrations
- packages/ui
- packages/testing
- apps/worker

## First semantic/view separation
`packages/domain/src/architectureView.ts` now defines ArchitectureView, ArchitectureViewVersion and ArchitecturePresentationExport so visual layout, styling, density and filters have a formal home separate from semantic architecture nodes.
