"""Package a stopped audit honestly; unexamined objects never become passes."""
from collections import Counter, defaultdict
import json
import os
from pathlib import Path
import sys
import repository_layer as r

root, index_path, out = map(Path, sys.argv[1:])
index = json.loads(index_path.read_text())
counts, errors, statuses = defaultdict(Counter), defaultdict(Counter), defaultdict(Counter)
truncated = 0
with (out/'inventory.jsonl').open(encoding='utf-8') as f:
    for line in f:
        try: row = json.loads(line)
        except ValueError:
            truncated += 1
            continue
        key = row['repositoryId']
        if row['acquisition'] == 'accepted-opaque':
            row['errors'] = [e for e in row['errors'] if e != 'missing-file']
            row['resolution'] = 'failed' if row['errors'] else 'verified-object-only'
        counts[key]['fileEntries'] += 1
        counts[key][row.get('resolution','failed')] += 1
        errors[key].update(row['errors'])
        statuses[key][row['acquisition']] += 1
repos, totals, physical = [], Counter(), Counter()
for entry in index['manifests']:
    key = entry['connectorId']
    snapshot = root/'snapshots'/key/entry['snapshotId']
    for folder in ('objects','quarantine'):
        counts[key][folder+'OnDisk'] = sum(len(files) for _,_,files in os.walk(snapshot/folder))
    cp = root/'checkpoints'/(key+'.json')
    checkpoint = json.loads(cp.read_text()) if cp.exists() else {}
    repos.append({'repositoryId':key,'repository':entry['repository'],'commit':entry['immutableCommit'],'snapshot':entry['snapshotId'],
        'expectedFileEntries':entry['denominatorCount'],'auditComplete':counts[key]['fileEntries']==entry['denominatorCount'],
        'counts':dict(counts[key]),'errors':dict(errors[key]),'acquisitionStatuses':dict(statuses[key]),
        'checkpoint':{'present':bool(checkpoint),'commitMatches':checkpoint.get('commitSha')==entry['immutableCommit'],'processedCount':checkpoint.get('processedCount')},
        'licenceDisposition':'requires-independent-review; no export clearance inferred','exportDisposition':'metadata-only'})
    totals.update(counts[key])
manifests = list(root.glob('snapshots/*/*/manifest.json'))
selected = {e['snapshotId'] for e in index['manifests']}
for mp in manifests:
    for folder in ('objects','quarantine'):
        physical[folder] += sum(len(files) for _,_,files in os.walk(mp.parent/folder))
summary = {'schemaVersion':'aiw-corpus-audit-v1','auditComplete':False,
    'stopReason':'User requested the handoff before the full corpus audit completed. Completed hash observations retained; remaining material unverified.',
    'productionAccepted':False,'sourceAuthority':index.get('knowledgeAuthority'),'acquisitionProductionAccepted':index.get('productionAccepted'),
    'selectedManifests':len(index['manifests']),'manifestsOnDisk':len(manifests),'repositories':repos,'counts':dict(totals),
    'expectedFileEntries':sum(e['denominatorCount'] for e in index['manifests']),
    'allSnapshotPhysicalCounts':dict(physical),'historicalSnapshots':[mp.parent.name for mp in manifests if mp.parent.name not in selected],
    'truncatedRowsIgnored':truncated,'errors':[],
    'canonicalManifestDigestRecomputed':False,'quarantineBytesVerified':False,
    'opaquePolicy':'Opaque snapshot file copies are intentionally absent; accepted opaque stored objects were hash checked where processed.'}
r.dump(out/'corpus-summary.json',summary)
print(json.dumps({'auditedFileEntries':totals['fileEntries'],'expectedFileEntries':summary['expectedFileEntries'],'physical':dict(physical),'auditComplete':False}))
