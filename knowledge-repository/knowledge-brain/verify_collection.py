"""Verify a built collection's coverage, hashes and authority without modifying source data."""
from contextlib import closing
import json
from pathlib import Path
import sys
import collection
from brain import BOUNDARY, ROOT, source_hash, write_json


def verify(directory):
    directory=Path(directory).resolve(strict=True)
    catalog=json.loads((directory/'catalog.json').read_text(encoding='utf-8'))
    receipt=json.loads((directory/'build-receipt.json').read_text(encoding='utf-8'))
    for name,expected in receipt['files'].items():
        if source_hash(directory/name)!=expected:
            raise ValueError('Generated file hash mismatch: '+name)
    with closing(collection.connect(directory)) as db:
        if db.execute('PRAGMA integrity_check').fetchone()[0]!='ok':
            raise ValueError('Database integrity check failed')
        if db.execute('SELECT count(*) FROM records').fetchone()[0]!=catalog['stats']['indexed']:
            raise ValueError('Index denominator mismatch')
        if db.execute('SELECT count(*) FROM search').fetchone()[0]!=catalog['stats']['indexed']:
            raise ValueError('Search denominator mismatch')
        snapshot_root=Path(db.execute("SELECT value FROM meta WHERE key='snapshotRoot'").fetchone()[0])
        for source in catalog['sources']:
            if source['file'].startswith('snapshots/'):
                path=collection.beneath(snapshot_root,source['file'])
                if source_hash(path)!=source['sha256']:
                    raise ValueError('Source manifest changed: '+source['file'])
                manifest=json.loads(path.read_text(encoding='utf-8-sig'))
                collection.assert_reference_scope(manifest)
                for file in manifest['files']:collection.assert_reference_scope(file)
        checked=0
        for row in db.execute('SELECT data FROM records'):
            record=collection.unpack(row[0])
            if record['authority']!=BOUNDARY:
                raise ValueError('Record authority violation')
            checked+=1
        query=collection.search(db,repository='arc42/arc42-template',availability='verified-text',limit=1)
        if not query['items']:
            raise ValueError('Known acquired source missing')
        preview=collection.preview(db,query['items'][0]['id'])
        if preview['verification']!='content-sha256-matched':
            raise ValueError('Source preview verification failed')
    return {'baseline':catalog['baseline'],'productionAccepted':False,
        'knowledgeAuthority':'discovery-only','recordAuthorityChecks':checked,
        'generatedHashes':'passed','databaseIntegrity':'passed','indexAndSearchDenominators':'passed',
        'selectedManifestHashes':'passed','sharedScopeChecks':'passed','verifiedPreviewSmoke':'passed',
        'stats':catalog['stats'],'collectionCoverage':catalog['collectionReceipt'],
        'databaseSha256':source_hash(directory/'collection.sqlite')}


if __name__=='__main__':
    result=verify(Path(sys.argv[1]) if len(sys.argv)>1 else ROOT/'output/collection')
    write_json(ROOT/'evidence/full-collection-integrity.json',result)
    print(json.dumps(result))
