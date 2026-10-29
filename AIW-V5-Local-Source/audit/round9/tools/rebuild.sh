#!/bin/sh
# Round 9 · rebuild every stylesheet from the round-8 sources: colours to tokens (convert.py), type (fonts.py), then the
# state and provenance language (semantic.py). Usage: rebuild.sh <round-8 public dir> <out public dir>
# The reports go to a temporary directory, so a run leaves the tree as it found it.
set -e; D=$(dirname "$0"); BASE=$1; OUT=$2; R=$(mktemp -d)
for f in "$BASE"/*.css; do cp "$f" "$OUT/"; done
python3 "$D/convert.py" "$OUT" "$R/convert-report.json" --write
python3 "$D/fonts.py" "$OUT" --write
# the root font stack: Plex carries its own fallbacks in --font-ui
sed -i 's/:root{font-family:var(--font-ui),-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;/:root{font-family:var(--font-ui);/' "$OUT/styles.css"
python3 "$D/semantic.py" "$OUT" "$R/semantic-report.json" --write
# the Sol custom properties some panels define name the provenance tokens
sed -i -e 's/--sol:var(--violet-10)/--sol:var(--prov-sol)/g' -e 's/--solbg:var(--sage-2)/--solbg:var(--prov-sol-wash)/g' -e 's/--solline:var(--violet-5)/--solline:var(--prov-sol-line)/g' "$OUT"/*.css
echo "reports in $R"
