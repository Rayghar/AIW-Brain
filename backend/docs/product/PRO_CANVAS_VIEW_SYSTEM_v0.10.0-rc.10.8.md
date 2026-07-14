# Pro Canvas View System — AIW v0.10.0-rc.10.8

The Pro Canvas View System introduces named `ArchitectureView` control on top of the semantic architecture model.

## Model separation
- `ArchitectureModel`: semantic truth.
- `ArchitectureView`: visual layout, layers, comments, density, filters and presentation state.
- `ArchitectureViewVersion`: saved review-ready view snapshot.
- `ArchitecturePresentationExport`: generated presentation/export artifact metadata.

## User capabilities
- Select or create named views.
- Duplicate an executive view from the current view.
- Save view versions before review.
- Toggle stage/relationship/comment layers.
- Add comments to a selected node or the whole view.
- Bundle edges to simplify high-density diagrams.
- Enter presentation mode.
- Export JSON, SVG, or PDF-manifest view artifacts.
