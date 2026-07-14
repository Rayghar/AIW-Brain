# AIW rc.10.48 — Brain Alive Implementation Plan

## Goal

Make AIW feel like a living architecture workbench where the system quietly responds to the architect's design decisions.

## Non-goal

Do not add another brain dashboard. Do not make the UI noisier. Do not make OpenAI/LLMs the authority.

## Implementation sequence

### Step 1 — Install brain runtime

Add `packages/brain-runtime` and export it to the web app. This runtime owns signal models, prioritization, adapters, and surface policies.

### Step 2 — Feed the runtime from existing state

Connect the runtime to existing AIW state:

- active lifecycle stage
- selected architecture style
- candidate styles
- accepted patterns
- architecture objects
- relationships
- interface definitions
- quality drivers
- Mind Factory release posture
- deterministic review findings

### Step 3 — Render quiet surfaces

Render these surfaces only inside the design workbench shell:

- `StageHealthChips` in the lifecycle ribbon
- `LibrarySignalChips` inside architecture library records
- `CanvasBrainBadges` on canvas objects
- `BottomBrainSignal` in the bottom dock
- `BrainInfoCenter` behind the Info toggle
- `DecisionRadarSignalPanel` behind the Decision Radar toggle
- `CoArchitectPromptMenu` behind user-invoked co-author actions

### Step 4 — Route LLM tasks through gateway only

The LLM should be invoked for:

- explaining style fit
- comparing trade-offs
- drafting interface descriptions
- critiquing architecture completeness
- preparing review notes
- drafting SDD sections

The LLM should not decide:

- stage completion
- policy pass/fail
- official design state
- approved knowledge release
- budget status

### Step 5 — Add gates and tests

Add the included gates:

- no direct UI LLM calls
- quiet intelligence budget check
- brain signal source classification check

Add the Playwright smoke test for:

project → stage → driver update → recommendation reorder → style selection → pattern obligation → interface warning → Info Center → Co-Architect.

## Acceptance criteria

A first-time architect should see:

1. Recommended styles change when quality-driver weights change.
2. Pattern/component kits narrow when a style is adopted.
3. Accepted patterns arm visible obligations.
4. Missing interfaces appear as small badges, not long text.
5. Info Center explains the full reasoning only when opened.
6. Co-Architect gives stage-aware actions without dominating the workspace.
7. No OpenAI/LLM call is made directly from the UI.
8. The workspace remains calm and canvas-first.
