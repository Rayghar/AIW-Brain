"""Refresh the curated pilot from the supplied archive; no network or release promotion.

Usage: python scripts/import-akr-pilot.py /absolute/path/AKR.zip
Full-record hashes use sorted, compact JSON with ASCII escaping (the original pilot format).
"""
import hashlib
import json
from pathlib import Path
import sys
import zipfile

release = 'AKR-0.10.73.5'
indices = [0, 4, 87, 69, 112, 113, 115, 137]
fields = ['id', 'name', 'problem', 'context', 'prerequisites', 'benefits', 'tradeoffs',
          'failureModes', 'counterfactualExplanation', 'obligations', 'knowledgeAuthority',
          'lineageSummary', 'applicabilityRules', 'risks', 'alternatives']
destination = Path(__file__).resolve().parent.parent / 'public/knowledge-pack.js'
old = destination.read_text()
pack = json.loads(old[old.index('{'):].strip().removesuffix(';'))
prior = {r['id']: r for r in pack['records']}
digest = lambda data: hashlib.sha256(data).hexdigest()
with zipfile.ZipFile(sys.argv[1]) as archive:
    manifest_bytes = archive.read(release + '/RELEASE-MANIFEST.json')
    assert digest(manifest_bytes) == pack['manifestSha256'], 'Manifest differs from the approved pilot'
    for artifact in json.loads(manifest_bytes)['artifacts']:
        data = archive.read(release + '/' + artifact['name'])
        assert len(data) == artifact['bytes'] and digest(data) == artifact['sha256'], 'Manifest artifact verification failed'
    source = archive.read(pack['sourceFile'])
    assert digest(source) == pack['sourceSha256'], 'Pattern artifact differs from the manifest-verified pilot'
    records = json.loads(source)['records']
    selected = []
    for index in indices:
        record = records[index]
        record_hash = digest(json.dumps(record, sort_keys=True, separators=(',', ':')).encode())
        previous = prior.get(record['id'])
        if previous:
            assert previous['recordSha256'] == record_hash, 'Existing receipt must retain its source identity'
        assert record['knowledgeAuthority']['candidateKnowledgeInfluence'] == 'blocked'
        selected.append({**{key: record.get(key) for key in fields},
                         'sourcePointer': '/records/' + str(index), 'recordSha256': record_hash,
                         'claims': previous['claims'] if previous else []})
pack['records'] = selected
pack['curationRevision'] = 2
destination.write_text('// Curated projection of the manifest-verified AKR pilot. Full-record hashes preserve existing receipts.\nexport const KNOWLEDGE_PACK = ' + json.dumps(pack, indent=2, ensure_ascii=False) + ';\n')
print('Imported eight curated records; existing source identities preserved.')
