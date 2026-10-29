# AIW V5 — UI/UX audit

Code: `release/aiw-v0.10.0-rc.10.73.6-standard-diagrams`, folder `AIW-V5-Local-Source`, run with `npm ci && npm start` exactly as `LOCAL-RUN.md` describes, fresh local database, illustrative Bank Payment Journey, no OpenAI key (rule-based guidance). Headless Chromium on the same machine, so timings are loopback timings and real networks will be slower.

## How it was checked

| Check | Scope |
|---|---|
| Automated sweep | All 11 chapters × Work, Model, Validate, Output at 1440×900 (44 pages); Chapters 1, 4, 11 at 1100×760 and 390×844 |
| Per page | axe-core (WCAG 2.1 A/AA + best practice), console and page errors, failed requests, horizontal overflow, clipped text, controls under 24 px, unnamed controls, headings, landmarks, JS module count |
| Interaction | Ask Sol, Mind Factory, Cursor, Review & edit brief, Sources, Changes, project switcher, All projects; focus on open and after Escape; tab order from the top |
| Navigation cost | Tab switches and chapter switches: time, requests, full page loads |
| Contrast detail | Foreground, background, ratio and size of every distinct failing style on five representative pages |

Screenshots are in `screens/` (`chNN-<tab>-<width>.png`, `ui-*.png`), raw data in `screens/sweep-*.json`.

## Findings

| ID | Severity | Finding | Evidence | Recommendation |
|---|---|---|---|---|
| UX-01 | High | The selected segment of the view toggles is unreadable: its label is dark green on dark green. It affects the selected "Diagram" / "Vitals" toggle on every Model tab and the "Review all …" buttons on the review desk. | Contrast 1.14:1 (`#1f4336` on `#214d40`, 13 px) on ch4 and ch11 Model; `ch04-model-1440.png`, `ch11-model-1440.png` | Give the selected state light text: white on `#214d40` measures 9.5:1, as the Work tab's primary button already does. |
| UX-02 | High | Secondary text fails contrast almost everywhere. The muted token `#76866f` gives 3.35–3.88:1 on the app's light surfaces, used at 10–11 px; chapter numbers use `#88957c` at 3.01:1. | axe `color-contrast` (serious) on all 44 pages, 12 to 75 nodes each; measured ratios in the contrast run | Darken the muted token; `#5d6b57` measures 4.9–5.7:1 on the same backgrounds. Use it for the chapter numbers too. One token change clears most of the failures. |
| UX-03 | High | Text is too small in the dense views. The review desk, diagram kickers, IDs and subtitles use 9–10.5 px; diagram subtitles are also 2.98:1 (`#4c5852` on `#8ea6c8`). | Contrast run: 9 px diagram text, 10–10.5 px desk cells; `ch11-model-1440.png` | Set a 12 px floor for reading text; scale the desk cells up and show less per cell, with detail on selection. |
| UX-04 | High | The Chapter 11 review desk is hard to read at any width: 14 parts × 8 vitals of truncated phrases, overlapping glyphs, and 27–28 controls under 24 px; on a phone the matrix needs sideways scrolling. | `ch11-model-1440.png`, `ch11-model-390.png`; sweep: 27 small targets at 1100, 28 at 390 | Offer a list or "worst first" view by default, show one vital per column with a full-text popover, and keep targets at least 24 px (WCAG 2.5.8). |
| UX-05 | Medium | On the review desk and other Chapters 1–3 and 9–11 models, the Key and zoom controls sit on top of the content (Key over the part list, zoom over the cells). The README notes only Chapters 4–8 moved them to the footer. | `ch11-model-1440.png` | Move Key and zoom into the footer for every chapter, as Chapters 4–8 already do. |
| UX-06 | Medium | At 1100 px, a common laptop width, both Model toolbars collapse to unlabeled icons (views, Add, Explore, fullscreen, panel; Arrange, Layers, SVG, PNG). | `ch04-model-1100.png`; sweep: clipped labels "Diagram", "Responsibilities", "Coverage", "Explore all perspectives" | Keep text labels down to about 1000 px and drop lower-priority buttons into a "More" menu instead. |
| UX-07 | Medium | The diagram header strip shows truncated, empty fields: "AUTH…", "CREAT…", "LAST MODIFI…", "VERSI…" with "—" values. It reads as broken. | `ch04-model-1440.png`, `ch04-model-1100.png` | Hide empty header fields, or give each field its full label on a second line. |
| UX-08 | Medium | Crossing from Chapters 1–2 into Chapters 3–11 reloads the whole app: 208 requests and about 1.7 s on loopback. Within a chapter, tab switches take about 0.4–0.5 s. Chapters 1–2 are buttons and 3–11 are links, so the two halves behave differently. | Navigation cost run; tab-order run shows 01–02 as buttons, 03–11 as links | Serve all chapters from one client-side shell, or at least preload the explorer shell while the user is in Chapters 1–2. |
| UX-09 | Medium | Every page loads 142–164 separate JS modules (about 4.1 MB on Chapter 1, 4.8 MB on Chapter 4 Model) plus 40 stylesheets (0.6 MB), uncompressed, and takes 1.8–2.5 s to settle even on loopback. | Module counts and timings from the sweep; bytes from the on-disk size of every file the page requested (the sweep's own byte count under-read some responses and is not used) | Bundle and minify for production (the README itself names the bundle as the lever); lazy-load chapter views. |
| UX-10 | Medium | Opening Ask Sol leaves keyboard focus on the page body; closing Ask Sol or Mind Factory with Escape moves focus to an unrelated element instead of back to the button that opened it. The Review & edit brief dialog does this correctly. | Interaction run: focus after open and after Escape | Move focus into the panel on open and return it to the opener on close, as the brief dialog already does. |
| UX-11 | Medium | The Sol / Mind Factory panel floats over the right part of the page and covers the "Selected context" companion. | `ui-ask-sol.png`, `ui-mind-factory.png` | Dock the panel in the companion's column (replace or tab with it) instead of overlaying it. |
| UX-12 | Medium | "Cursor" is an unclear name for its function, "explain an object on hover or keyboard focus". It is on by default, its state shows only as a subtle tint, and clicking it on the Work tab shows no visible change. It is absent on Model tabs. | Interaction run: `aria-pressed` true → false with no visible change; title text | Rename it (for example "Hover explanations"), show On/Off in the label, and give immediate feedback. |
| UX-13 | Medium | Coined vocabulary piles up: Cursor, Mind Factory, Stewards, Vitals, What it takes, Trace, Walk the rounds, Anatomy, Map perspectives vs Model layers for the same sidebar setting. | Screens across chapters; the sidebar reads "Map perspectives" in Chapter 1 and "Model layers" in Chapters 4, 5 and 11 | Use one name per concept, and add a glossary with inline definitions at first use. |
| UX-14 | Medium | Every view has the same browser title ("Bank Payment Journey · AIW V5"), so tabs, history entries and screen-reader page announcements cannot tell chapters or tabs apart. | Sweep: identical title on all 44 pages | Put the chapter and tab in the title, for example "Ch 4 Model · Bank Payment Journey · AIW V5". |
| UX-15 | Medium | Model tabs place a sidebar `h2` ("Model layers") before the page's `h1`, and use `h4` directly under `h2` in the companion (heading-order). The review desk and quality-driver cards nest interactive controls inside interactive cards. | axe `heading-order` on all 11 Model tabs; `nested-interactive` on Chapters 2, 3 and 11 Model (`.um-card`, `.dk-rh`) | Put the main heading first in source order; fix the heading levels; make a card either the control or a container of controls, not both. |
| UX-16 | Low | Two controls' spoken names don't contain their visible text: "Changes" is announced as "Review change history", and the project card as "Switch or create project". Voice-control users saying the visible word can't reach them (WCAG 2.5.3). | Interaction run | Start each accessible name with the visible text, for example "Changes: review change history". |
| UX-17 | Low | The project card has a dropdown chevron but navigates to the projects page instead of opening a menu. | Interaction run: navigates to `/?view=projects` | Either open a switcher menu or drop the chevron and style it as a link. |
| UX-18 | Low | The projects page uses a different logo (a diamond) from the workspace (stacked layers), and its secondary actions ("Organisation guidance", "Restore / import project") are very small. | `ui-all-projects.png` | Use one brand mark; size secondary actions like the rest of the product. |
| UX-19 | Low | The empty Changes dialog fills the screen with blank space and still shows the "review the change…" footer. | `ui-changes.png` | Size the dialog to its content and hide the review footer when there is nothing to review. |
| UX-20 | Low | Moving from Chapter 1's Validate tab to Chapter 4 landed on the Model tab, so the user's tab is not kept. | Navigation run: `?chapter=1&tab=validate` → sidebar Chapter 4 → `?chapter=4&tab=model` | Keep the user's tab when moving between chapters, unless the tab does not exist there. |

## What works well (verified)

- No console errors, page errors or failed requests on any of the 59 pages swept; no horizontal overflow at 1440, 1100 or 390 px.
- Every page has exactly one `h1` and one main landmark, and every control has an accessible name.
- A skip link comes first, and every keyboard stop in the header and chapter list shows a visible focus ring.
- The Review & edit brief dialog is a correct modal: focus moves in, Escape closes it, and focus returns to the button.
- The phone layout reflows into one column with a Chapters button; nothing is cut off except the review desk matrix.
- Honesty cues are clear and consistent: "Reference example", "Illustrative reference brief — confirm against your project", "Rule-based guidance", "Sol not connected", "Working architecture, pending review".
- Each chapter has a stable frame: breadcrumb, readiness meter, "Next:" action and the same four tabs.
- The Chapter 4 diagram draws a readable standard-notation picture with typed elements and labelled relationships, and exports SVG and PNG.

## Not verified

- Behaviour with an OpenAI key (Sol's LLM rounds), local accounts, the knowledge repository service, or the hosted deployment.
- Timings on a real network; all timings above are loopback.
- Screen-reader output with a real screen reader; checks were automated plus keyboard focus tracing.
- Large projects: the sweep used the illustrative Bank Payment Journey only.
