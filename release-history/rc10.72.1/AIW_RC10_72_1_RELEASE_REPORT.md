# AIW v0.10.0-rc.10.72.1 Release Report

## Release identity

- **Name:** Product Truth, Signature Canvas Smart Layout and Navigation Rebuild
- **Codename:** Sol Signature Canvas
- **Baseline:** v0.10.0-rc.10.72.0
- **Knowledge release:** AKR-0.10.72.0 (unchanged)
- **Production accepted:** No

## Purpose

rc.10.72.1 responds directly to the installed-product audit. It improves the two surfaces that most visibly undermined the product's differentiation: the modelling canvas and the role journey navigation. The release also fixes lifecycle-context drift and the Architecture Viewbook route discovered during the same audit.

This is a structural interaction release. It does not introduce a second architecture engine, alter model semantics, or bypass the governed proposal and acceptance boundary.

## Delivered capabilities

### 1. Model-aware canvas arrangement

The modelling toolbar now exposes one **Arrange** control with:

- Smart
- Tree: left to right
- Tree: top to bottom
- Radial
- Grid
- Undo arrangement

Smart mode evaluates graph size, density, cycle structure and connectivity. Tree layouts use relationship depth. Radial layout centres a high-degree architecture object and distributes related objects around bounded rings. Child objects are arranged relative to compound boundaries, and boundaries are resized around their contents.

A layout change is committed as one reversible presentation mutation. It does not create, remove or retype architecture objects or relationships.

### 2. Navigation rebuilt under one owner

The role journey rail is now owned by one component and one final stylesheet:

- expanded desktop state: 292 px;
- collapsed desktop state: 72 px;
- responsive overlay below 1440 px;
- left-aligned headings, labels and supporting text;
- no hover expansion;
- no workspace movement during hover;
- no rail-to-workspace gap;
- deliberate overlay backdrop and close behaviour.

Legacy selectors that competed for geometry and hover state were removed from active ownership.

### 3. Product-truth corrections

- The explicit lifecycle stage now controls current-stage and next-move projections.
- Architecture Brain requests display Project, Stage, Scope and Revision.
- Architecture Viewbook now mounts the real interactive Viewbook instead of returning to SDD Delivery Pack.
- Stale Living Canvas responses cannot overwrite a newer autonomy mode.
- An open ghost-topology preview is protected from background recomputation.
- Numeric keyboard actions bind to fresh actions after mode changes.
- Toasts are positioned at top centre so they do not cover canvas controls.

## Verification summary

| Verification | Result |
|---|---:|
| Backend full build | Passed |
| Frontend packages and production bundle | Passed |
| Smart layout/lifecycle unit tests | 12/12 passed |
| rc.10.72.1 structural gate | 36/36 passed |
| Desktop/laptop focused browser acceptance | 2/2 passed |
| rc.10.70.1 integrated-flow regression | 2/2 passed |
| Architecture Genesis regression | 2/2 passed when executed per viewport |
| Single-Brain authority regression | 2/2 passed when executed per viewport |
| Living Canvas/C4 co-creation desktop regression | 4/4 passed |
| Backend intelligence regression | 30/30 passed |
| Backend intelligence-authority gate | 39/39 passed |
| rc.10.72 evidence/trust gate | 34/34 passed |
| Frontend internal dependency gate | Passed |
| Backend internal dependency gate | Passed |
| Frontend release-integrity gate | Passed |
| Backend release-integrity gate | Passed |
| Production dependency vulnerabilities | 0 frontend / 0 backend |
| Horizontal overflow in focused acceptance | 0 px |
| Hover-induced geometry movement | 0 px |
| ZIP integrity | Verified during packaging |

## Bundle observation

The production bundle succeeds. The product shell remains approximately 651 kB minified and the artifact core approximately 1.62 MB; Vite continues to report the artifact chunk above its warning threshold. This was not concealed as a failure of the smart-layout release, but remains a performance-hardening item.

## Acceptance boundary

This release is implementation-verified for the focused desktop and laptop navigation, arrangement and Viewbook journeys. It is not production accepted. External KMS, remote GitHub, managed infrastructure, live provider acceptance, external human review and an authorised enterprise pilot remain separate gates.
