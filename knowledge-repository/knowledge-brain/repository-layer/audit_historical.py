"""Verify stored history omitted from the current acquisition selection.

History never gains authority or replaces a current source. Quarantine presence
is checked without opening restricted bytes, as in the current-snapshot audit.
"""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
import repository_layer as r

p=argparse.ArgumentParser()
p.add_argument('--root',required=True)
p.add_argument('--index',required=True)
p.add_argument('--output',required=True)
a=p.parse_args()
root=Path(a.root).resolve()
index=json.loads(Path(a.index).read_text())
selected={e['snapshotId'] for e in index['manifests']}
results=[]
for manifest in root.glob('snapshots/*/*/manifest.json'):
    if manifest.parent.name in selected: continue
    meta,counts,statuses,errors={},Counter(),Counter(),Counter()
    with ThreadPoolExecutor(max_workers=12) as pool:
        batch=[]
        def consume(items):
            for row in pool.map(lambda item:r.check_file(manifest.parent,item),items):
                counts['fileEntries']+=1
                counts[row.get('resolution','failed')]+=1
                statuses[row['acquisition']]+=1
                errors.update(row['errors'])
        for key,value in r.manifest_values(manifest):
            if key!='file':meta[key]=value;continue
            batch.append(value)
            if len(batch)==64:consume(batch);batch=[]
        consume(batch)
    results.append({'repository':meta.get('repository'),'repositoryId':meta.get('connectorId'),
        'commit':meta.get('commitSha'),'snapshot':manifest.parent.name,'rawManifestSha256':r.file_hash(manifest),
        'counts':dict(counts),'acquisitionStatuses':dict(statuses),'errors':dict(errors),
        'licence':meta.get('licenceEvidence',{}),'authority':'unselected-historical-candidate',
        'currentCheckpoint':'not-applicable; current acquisition index selects its successor',
        'canonicalDigestRecomputed':False,'quarantineBytesVerified':False})
    print(manifest.parent.name,dict(counts),dict(errors),flush=True)
r.dump(a.output,{'auditRunFinished':True,'historicalSnapshots':results,'integrityPassed':not any(any(x['errors'].values()) for x in results),
    'scope':'Every manifest not selected by the current acquisition index; accepted file/object hashes and quarantine presence only','productionAccepted':False})
