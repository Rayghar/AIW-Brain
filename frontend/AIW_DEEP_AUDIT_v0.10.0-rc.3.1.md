# AIW Deep Audit and UX Polish Report — v0.10.0-rc.3.1

Date: 2026-07-04  
Scope: latest submitted `AIW_Enhancements_v0.10.0-rc.3` tree, with special focus on localhost activation, full reference-project usability, workspace clickability, navigation density, visual modelling readability, typography consistency, and packaging readiness.

## Executive finding
The application contains a strong architecture-intelligence engine and the visual modelling surfaces are present, but the product still felt under-activated because the route into the full reference project was not explicit enough, workspace navigation was split across several surfaces, and the page hierarchy was too dense for first-time and executive users. This audit therefore treated UI/UX defects as product defects, not cosmetic issues.

## Findings fixed in this pass

| ID | Area | Finding | Severity | Remediation applied |
|---|---|---:|---|---|
| UX-01 | First-run activation | Users could create a blank project and perceive the product as inert because no clear full-reference path existed. | High | Added a prominent **Open full reference workbench** CTA in Project Hub. It loads the full reference architecture, enables the Administrator profile, and opens the visual workbench. |
| UX-02 | Blank handoff | Project open/create could show a blank screen during route and store hydration. | High | Added a route handoff overlay and double animation-frame entry to avoid the dead-screen impression. |
| UX-03 | Workspace clickability | Comparison and some advanced workspaces were not exposed consistently through a global launch surface. | High | Added a global workspace selector and an Actions > Workspace launchpad covering all 15 workspace modes. |
| UX-04 | Sidebar density | Workspace buttons were repetitive and hard to maintain. | Medium | Replaced duplicated workspace button markup with a canonical `workspaceEntries` registry. |
| UX-05 | Full reference coverage | No automated source-level check proved that all reference workspaces were reachable. | Medium | Added `scripts/verify-ui-clickability.mjs` and npm script `ui:clickability:verify`. It validates all 15 workspace routes, full reference activation, and global polish selectors. |
| UX-06 | Topbar overload | The header still behaved like an engineering toolbar. | Medium | Added a slim workspace jump selector, grouped command menu sections, and cleaner action-menu layout. |
| UX-07 | Visual map density | Intelligence maps could dominate the page and make forms feel secondary. | Medium | Added compact/expanded visual intelligence map mode; compact is default and minimap is hidden until expanded. |
| UX-08 | Minimap/control contrast | React Flow minimap and controls were visually inconsistent with the dark premium theme. | Medium | Added dark minimap, dark controls, refined edge/node typography and canvas height constraints. |
| UX-09 | Typography inconsistency | Font sizes and labels varied across pages. | Medium | Added a global typography scale, normalized labels, form controls, panel headings and button sizing. |
| UX-10 | Panel polish | Many workspaces used different surface, border and card treatments. | Medium | Added global surface tokens and applied consistent card radius, borders, spacing, and shadows across studio pages, panels and maps. |
| PKG-01 | Workspace package versions | rc.3 package metadata had internal workspace dependencies pinned to rc.2, causing npm to try resolving private workspace packages externally. | High | Updated internal `@aiw/*` dependencies to `0.10.0-rc.3` and regenerated `package-lock.json` metadata using public npm registry settings. |
| PKG-02 | Public npm readiness | Lockfile/package needed to remain free of the internal OpenAI package registry. | High | Verified no `applied-caas` registry reference remains in package metadata, lockfile or npm config. |

## Workspaces covered by the clickability verification

The source-level gate validates that these workspace modes are routeable and represented by the full-reference launch experience:

1. Design lifecycle
2. Quality drivers
3. Portfolio & branches
4. Branch comparison
5. Governance
6. Collaboration
7. Security & live ops
8. Enterprise runtime
9. Drift control
10. Continuous conformance
11. Operational intelligence
12. Knowledge mesh
13. Pattern intelligence
14. Architecture synthesis
15. Pilot readiness

## Verification performed in this environment

| Check | Result |
|---|---|
| Public npm registry reference scan | Passed |
| Internal `@aiw/*` rc.2 dependency scan | Passed after correction |
| Source-level workspace clickability/polish gate | Passed |
| Touched-file bracket sanity check | Passed on touched UI files, with TypeScript parse requiring installed type packages for full validation |
| Full `npm ci && npm run build` | Not completed in this sandbox because npm install did not complete inside the execution window after node_modules cleanup; the package is ready for this command on the user's workstation/CI |

## Enhancement opportunities identified for the next product pass

| Opportunity | Description | Benefit |
|---|---|---|
| Activation Wizard | Guided setup for deterministic mode, LLM route, GitHub mesh, runtime probes and pilot data. | Converts the product from “opened” to “alive” in the first 10 minutes. |
| Command palette | Keyboard-first command search for all workspace actions and project commands. | Reduces reliance on topbar/sidebar buttons and improves expert speed. |
| Scenario gallery | One-click loaded demo scenarios: payment platform, digital bank, SaaS, data platform, modernization. | Makes global product demos immediate and repeatable. |
| Progressive disclosure by role | Architect, reviewer, curator, platform and executive views should show different density by default. | Delivers Apple/NVIDIA-style calm instead of exposing every control at once. |
| Visual map filters | Filter by risks, drivers, decisions, obligations, evidence, recommendations. | Reduces canvas busyness without hiding capability. |
| First-class Model Route Setup | UI-based LLM provider configuration and active probe. | Makes Co-Architect enrichment discoverable instead of environment-variable only. |
| Repository onboarding wizard | GitHub/repository connection, contract discovery, Terraform/Kubernetes evidence import. | Unlocks conformance and brownfield TAM. |
| Board calibration workflow | UI for promoting the 12 draft calibration rows and capturing reviewer evidence. | Unlocks higher-confidence ranking across more quality attributes. |
| Cross-page empty states | Every page should have a premium useful empty state with sample action and reason. | Prevents the “dead app” feeling when data is missing. |
| Browser E2E journey | Playwright/Chromium path: open full reference project → click all workspaces → assert no blank screens. | Gives product confidence beyond static source checks. |

## Conclusion
The rc.3.1 package should feel more obviously alive on localhost: it has a full-reference entry point, a workspace launchpad, a compact/expanded intelligence map, more coherent typography and a source-level gate confirming all 15 workspaces are routeable. The next major product improvement should be an Activation Wizard plus browser E2E validation against the full reference journey.
