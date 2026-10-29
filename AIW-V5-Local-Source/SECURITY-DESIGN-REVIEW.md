# Guided threat and control design

Chapter 9 Sol keeps its normal contextual actions visible. Choosing Develop protection opens the guided task within that same dialog, using the shared proposal review, project records and SDD. This reimplementation replaces the automatic task takeover in the first Chapter 9 update. No additional navigation or evidence workspace is introduced.

## Delivered behavior

- Starts from a saved threat and a requirement traced through its affected objects. The selected or linked control is offered first; the architect can explicitly choose another control or a new definition.
- Four directly accessible questions: exposure; enforcement; failure and operation; verification and reasoning. Saved exposure and control identity appear as readable context, with editing on demand. Partial drafts persist, and reopening goes to the first unfinished group.
- Existing control references, other threat links and protected objects are retained. New tasks require explicit selection of affected objects before proposing protection. A new control can cover a subset of the threat scope; remaining objects are disclosed as outside its claim. Earlier drafts retain their original scope and can still be opened, edited and accepted.
- Threat and control use the existing gold-ghost preview, saved/proposed comparison, linked records, chapter findings, explicit reviewer and atomic acceptance. Editing returns to the same Sol task.
- An unchanged threat retains its reviewed assumptions and revision when only its control changes. New controls stay working definitions. No test evidence, residual-risk acceptance or governance approval is created. Prior evidence records remain; revision-sensitive verification becomes stale when its control or linked threat changes.
- The source basis includes the requirement, drivers, decisions, upstream design stamp, threat, selected control, target definitions and trust boundaries. New tasks also capture connected payloads, participants and mapped responsibilities, while earlier snapshots remain compatible. Source comparison uses named design fields rather than raw object dumps. Source changes require explicit review, both before and after design acceptance.
- DES tasks, ALT proposals, CHG changes and reasoning reuse the existing private stores and SDD. Frozen baselines remain unchanged.
- Mind Factory retains its existing tactics, scopes saved alternatives to Security, and keeps saved task access in a compact disclosure. Generic security suggestions no longer insert payment/beneficiary assumptions into unrelated projects.
- Native threat/control editors, evidence, risk treatment, simulation and runtime handoff remain available through Chapter actions. Security threats and trust boundaries are now resolvable in the shared change review.

## Verification and limits

`security-design-validate.mjs` exercises reference-control revision and a new control in an equipment project, explicit partial scope, compatibility with earlier drafts, unchanged-threat preservation, source review before and after acceptance, evidence invalidation without evidence mutation, explicit acceptance, identity and link preservation, no payment-domain leakage, private blob persistence, owner isolation, concurrent revisions, failed-write recovery, SDD and frozen baselines.

`security-task-ui-validate.mjs` exercises the actual entry, dialog, store and Worker for both cases: normal Sol actions, repeat entry/restoration of the same dialog, explicit scope, draft preservation, unsaved-close guard, save/reopen/resume, joint ghosts, returning to Sol, refreshing and accepting in the common review, accepted-source review, preserving local input across concurrent source changes, retained reasoning, native actions and Mind Factory. The three navigation sections remain present.

Existing security, Chapter 4–7 guided design, Chapter 8 exchange design, change review and saved-alternative UI checks passed for this reimplementation. These are behavior and storage checks, not independent assessment of the architecture's security.

Desktop/mobile visual verification remains incomplete. The sanctioned preview browser timed out refreshing its tabs before page inspection. No screenshots or pixel-level verification are claimed.

Scope remains bounded: threat discovery, attack execution, independent evidence verification and external LLM generation are not implemented by this task.
