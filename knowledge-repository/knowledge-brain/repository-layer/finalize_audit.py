"""Correct opaque-copy classification; preserve original observations locally.

Acquisition writes files/ copies only for accepted non-opaque material. Already
measured object failures remain failures. No object verification is invented.
"""
from collections import Counter, defaultdict
import json
from pathlib import Path
import sys
import repository_layer as r

out = Path(sys.argv[1])
summary = json.loads((out / 'corpus-summary.json').read_text())
counts, errors = defaultdict(Counter), defaultdict(Counter)
raw = out / 'inventory-raw.jsonl'
if not raw.exists():
    (out / 'inventory.jsonl').rename(raw)
with raw.open(encoding='utf-8') as source, (out / 'inventory.jsonl').open('w', encoding='utf-8') as target:
    for line in source:
        row = json.loads(line)
        if row['acquisition'] == 'accepted-opaque':
            row['errors'] = [e for e in row['errors'] if e != 'missing-file']
            row['snapshotCopyResolution'] = 'not-materialized-by-acquisition-policy'
            row['resolution'] = 'failed' if row['errors'] else 'verified-object-only'
        key = row['repositoryId']
        counts[key]['fileEntries'] += 1
        counts[key][row.get('resolution', 'failed')] += 1
        errors[key].update(row['errors'])
        target.write(json.dumps(row) + '\n')
totals = Counter()
for repo in summary['repositories']:
    key = repo['repositoryId']
    for metric in ('fileEntries', 'verified', 'verified-object-only', 'restricted-not-read', 'failed'):
        repo['counts'][metric] = counts[key][metric]
    prefixes = ('missing-', 'corrupt-', 'unresolvable-', 'invalid-content-hash')
    other = {k:v for k,v in repo['errors'].items() if not k.startswith(prefixes)}
    repo['errors'] = dict(Counter(other) + errors[key])
    totals.update(repo['counts'])
summary['counts'] = dict(totals)
summary['opaquePolicy'] = 'Only non-opaque accepted material has files/ copies; opaque objects are hash-verified in objects/ only.'
summary['storedObjectCountIncludingQuarantine'] = sum(summary['allSnapshotPhysicalCounts'].values())
r.dump(out / 'corpus-summary.json', summary)
print(json.dumps({'counts':summary['counts'],'allPhysical':summary['allSnapshotPhysicalCounts'],'errors':sum(sum(x['errors'].values()) for x in summary['repositories'])}))
