# ADR-0002 — AIW intelligence must be quiet by default

## Status

Accepted for rc.10.47.3 foundation.

## Context

AIW previously risked becoming noisy because too many intelligence surfaces were visible at once: inspectors, embedded intelligence cards, AI panels, decision radar, admin diagnostics, lifecycle panels, and implementation metadata.

## Decision

AIW will use the Brain Signal Engine and noise budget to show only contextual, stage-relevant intelligence by default.

Detailed reasoning is user-invoked through:

- Info Center,
- Decision Radar,
- Co-Architect,
- Stage Gate details.

## Consequences

Positive:

- Cleaner design studio experience.
- Better focus.
- Less cognitive load.
- More credible professional product feel.

Negative:

- Requires signal prioritization.
- Requires consistent surface policy.
- Some users may need an explicit Detailed mode.
