# Workbench refinement

The source-led work introduced an additional assistance hierarchy beside the existing chapter assistants. This refinement moves that work into the established interaction model and removes redundant presentation.

## Interaction contract

- Project navigation has three sections: Project, Architecture journey, and Map perspectives / Model layers. Sources and Changes use one compact project toolbar. The chapter list has no independent clipping or scrolling; the perspectives list scrolls within its remaining space. On small or short screens the outer navigation can scroll so every chapter remains reachable.
- The project switcher opens the existing project collection. Reference content is still labelled as requiring confirmation. No project records or ownership settings change.
- Source-based work adopts the existing Sol or Mind Factory dialog instead of opening a second modal. The native dialog moves outside the chapter render root while editing, so successful saves can refresh the chapter without destroying the task. Returning restores the chapter's dialog lifecycle and opens fresh contextual actions. Closing restores focus to the current assistant launcher.
- Project sources has a compact saved-source selector, source content and related work. A source can start a Sol draft or open an existing task trail. This retains access from all eleven chapters. Within Sol, cited source text is an on-demand disclosure, not a permanent third column.
- Sol retains the saved need, acceptance, owner, assumptions, draft editing, whole-bundle review, explicit application and trail. Mind Factory retains pattern considerations and their rationale. Existing source revisions, stale-source reviews, dismissals and guarded withdrawals continue to use the same commands and storage.
- Lens placement is a small layout menu inside the object context panel. Desktop side/bottom preferences remain unchanged. Small screens retain their existing stacked context layout. A closed foundation context panel no longer reserves an empty side column.
- Output handoffs retain validation, acknowledgement and navigation behavior. Their explanation is available on demand in a compact footer.

## Verification

- `npm run check` passed.
- `node evidence-validate.mjs` passed: linked drafts, retained source versions and citations, explicit confirmation boundaries, blank isolation, persistence, write failure, concurrent revision protection, frozen SDD and guarded withdrawal.
- `node workspace-validate.mjs` passed: failed/conflicting saves preserve the last saved model and current-revision retry behavior.
- `workbench-ui-validate.mjs` exercises the real client modules against an in-memory Worker and DOM implementation. Chapters 1–3 passed source creation, dirty-edit protection, save and rerender continuity in the same native dialog, saved drafting, pattern reasoning, applying three linked records, trail access, returning to contextual Sol, and close/focus restoration. All eleven chapters passed the three-section navigation, project source access and lens preference checks.
- The DOM harness uses Happy DOM 20.14.5 supplied by `AIW_DOM_MODULE`. For example, set that variable to an installed `happy-dom/lib/index.js` and run `node workbench-ui-validate.mjs 1`; pass a chapter number from 1 through 11. It does not use a browser or exercise production data.
- Visual desktop/mobile inspection could not complete because the preview browser connection repeatedly timed out. The DOM checks do not verify pixels, layout overflow or touch interactions. Responsive CSS and the provided screenshots were reviewed in source; no claim of a passed visual walkthrough is made for this increment.

No schema migration, data-model change, new assistant product, LLM connection or access-policy change is included.
