# Round 9 · the style migration, reproducible

These scripts made the round-9 stylesheets from the round-8 sources. They are kept so the migration can be checked,
repeated and reversed; from round 9 on, `public/theme.css` and the stylesheets are the source.

- `scales.py`: the seven twelve-step scales, light and dark, and the constants (DESIGN.md §2 A).
- `convert.py`: every colour literal to the nearest step of its own hue family, by the role of the property that uses
  it (text, background, line, shadow layer), dark islands kept dark in both themes (§2 B).
- `fonts.py`: the interface in IBM Plex Sans, record IDs in IBM Plex Mono, Georgia for the four document rules (§2 C).
- `semantic.py`: a rule whose selector carries a state reads the state's token: to fix, to confirm, proposed, draft,
  passing; the journey draft's provenance; Sol's violet (§2 F).
- `gen_theme.py`, `gen_theme_ui.py`: write `public/theme.css` and `public/theme-ui.css`.
- `rebuild.sh`: runs the three passes in order.

To reproduce this round's stylesheets (Python 3, no packages):

```sh
git worktree add /tmp/aiw-r8 a9701d9            # round 8 with the round-9 design, before any style change
mkdir -p /tmp/aiw-r9 && cp public/theme.css public/theme-ui.css /tmp/aiw-r9/
sh audit/round9/tools/rebuild.sh /tmp/aiw-r8/AIW-V5-Local-Source/public /tmp/aiw-r9
python3 audit/round9/tools/gen_theme.py audit/round9/tools /tmp/aiw-r9/theme.css
python3 audit/round9/tools/gen_theme_ui.py /tmp/aiw-r9/theme-ui.css
for f in public/*.css; do cmp -s "$f" "/tmp/aiw-r9/${f##*/}" || echo "differs: $f"; done   # no output: identical
```
