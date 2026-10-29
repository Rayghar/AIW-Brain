# Round 9 · The approved style: refined paper, with a night theme

Baseline `216c288` (AIW v0.10.0-rc.10.73.13 candidate). Branch `claude/dazzling-cerf-a3qshh`. Release field for this
round: AIW v0.10.0-rc.10.73.14 (candidate). The controlling baseline stays rc.10.73.6; `productionAccepted` stays
false.

## 1. Why

On the style canvas the owner approved direction A, refined paper, as AIW's look and direction C, night console, as
its dark theme, with two conditions: no functionality may be lost, and the AIW product vision must come out stronger.

Measured before any change:

- 42 stylesheets, 649,975 bytes, with 3,782 colour literals of 2,068 distinct values and about twenty local colour
  variable families (`--r-*`, `--cm-*`, `--gold-*`, `--green-*`, `--cream-*`, `--sk-*`, …).
- 90 declarations set Georgia, most of them on interface headings rather than documents.
- About 510 colour literals in scripts, most in the notation palette and SVG renderers that also draw exports.
- The content security policy allows fonts only from the app (`font-src 'self' data:`) and scripts only from the
  app; the hosted Worker packs only HTML, CSS and JavaScript.

## 2. Contracts

### A · One token system

`public/theme.css`, the first stylesheet, holds every colour and type token. Seven hue scales — sage (the neutral,
biased towards AIW's green), green (the accent), gold, red, blue, violet and teal — have twelve steps each, with a
light value and a dark value per step. Each step has one role in both themes:

| Step | Role |
| --- | --- |
| 1 | card and panel surface |
| 2 | app background |
| 3 | subtle background (sidebar, wells) |
| 4 | hover background |
| 5 | pressed background, soft divider |
| 6 | border |
| 7 | strong border, focus ring |
| 8 | quiet solid (dividers on solids, disabled) |
| 9 | solid |
| 10 | solid for buttons that carry white text |
| 11 | coloured or secondary text |
| 12 | primary text |

Semantic aliases sit on top: surface, background, line, ink, muted, accent and the text that sits on a solid; the
five states and the four provenance marks of contract F; the canvas ground and its grid; and three type families.

### B · Every colour becomes a token

Every colour literal in the 42 stylesheets is replaced by a token reference, mechanically: each colour goes to the
nearest step of its own hue family, a text colour only to a text step, white text on a solid to the on-solid token,
and a colour with transparency to a mix of its token. The local variable families keep their names and now resolve
to tokens, so no parallel palette is left. In the light theme the snapping is direction A's palette; the dark theme
follows the step roles.

### C · Type

The interface is set in IBM Plex Sans and record IDs in IBM Plex Mono; Georgia stays for documents only (the SDD
preview and exports, decision records). The fonts are served by the app itself under `public/fonts/` with their SIL
Open Font License, added to the client bundle and to the Worker's packed types (`font/woff2`).

### D · The theme setting

Light (the default), Dark, or Match the system, chosen from the top bar of the chapters and of the Projects page and
kept per viewer in the browser (`aiw.theme`). A small classic script, served by the app, applies the choice before
the first paint, so the policy stays `script-src 'self'`. Printing is always light, and exported documents carry
their own light styles.

### E · The model in the dark theme

The canvas ground, its grid, group frames, edge labels and their halos follow the theme. Notation fills such as the
ArchiMate and C4 layer colours keep their meaning and their light values. Exported SVG, PNG and SDD figures are
unchanged.

### F · One state and provenance language

The product's authority chain, where proposals are reviewed and people decide, is shown in one visual language
everywhere:

- **States:** to fix (red), to confirm (amber), proposed (blue), draft (grey) and passing (green).
- **Provenance:** stated, inferred and open question.
- **Sol:** keeps its violet, so a person can always tell what came from the language model. This is a deliberate
  departure from the mockup sheet, which showed Sol's suggestions in the proposed blue; AI disclosure outranks a
  single colour.

The chips of Validate, Output, the journey draft, the companion and the pictures read from these semantic tokens.

### G · Proof that nothing was lost

- The full regression passes. A suite that asserts a literal colour or font is adapted to read the token, never
  weakened.
- `test:theme` (new, browser) covers the setting on both pages, its persistence, computed surfaces in each theme on
  representative screens, text contrast of at least 4.5:1 on sampled text, no large light surface in the dark theme,
  the fonts loaded, and Georgia absent from the interface.
- `test:style-tokens` (new, static) allows no colour literal outside `theme.css` and the listed export and print
  sheets, and every token used must be defined.
- The walkthrough runs in light and in dark, and the screens are compared.

## 3. Rules

- No element, control, route or behaviour is removed; only colour, type and the theme setting change.
- Security headers are unchanged: no third-party font host, no inline script.
- Exports and documents keep their own light styles.
- One token source; the old local palettes resolve to it.
