import functools
from contextlib import closing
import json
from pathlib import Path
import sqlite3
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from http.server import ThreadingHTTPServer
import brain
import collection


class CollectionTests(unittest.TestCase):
    def setUp(self):
        (brain.ROOT/'output').mkdir(exist_ok=True)
        self.temp = tempfile.TemporaryDirectory(dir=brain.ROOT/'output')
        self.root = Path(self.temp.name)
        self.snap = self.root/'snapshots-root'
        self.snap.mkdir()
        self.folder = self.snap/'snapshots/GH-EXAMPLE/KSNAP-EXAMPLE'
        (self.folder/'files/docs').mkdir(parents=True)
        self.manifest = self.folder/'manifest.json'
        self.shards = self.root/'candidates'
        self.shards.mkdir()
        self.output = self.root/'site'
        self.index = self.root/'index.json'
        self.files = [
            {'path':'docs/readme.md','status':'accepted','contentSha256':brain.digest(b'# Hello\narchitectureunique123 <script>bad()</script>')},
            {'path':'docs/quarantine.md','status':'quarantined','contentSha256':brain.digest(b'quarantinemarker992')},
            {'path':'docs/excluded.md','status':'policy-excluded'},
            {'path':'docs/missing.md','status':'accepted','contentSha256':brain.digest(b'missing')},
            {'path':'docs/mismatch.md','status':'accepted','contentSha256':brain.digest(b'old bytes')},
            {'path':'docs/diagram.png','status':'accepted-opaque'}]
        (self.folder/'files/docs/readme.md').write_bytes(b'# Hello\narchitectureunique123 <script>bad()</script>')
        (self.folder/'files/docs/quarantine.md').write_bytes(b'quarantinemarker992')
        (self.folder/'files/docs/excluded.md').write_bytes(b'excludedmarker992')
        (self.folder/'files/docs/mismatch.md').write_bytes(b'changed bytes')
        self.payload = {'connectorId':'GH-EXAMPLE','snapshotId':'KSNAP-EXAMPLE','repository':'example/repo','commitSha':'a'*40,'files':self.files}
        self.save_manifest()
        brain.write_json(self.index, {'expectedRepositories':1,'manifests':[{'connectorId':'GH-EXAMPLE','snapshotId':'KSNAP-EXAMPLE','repository':'example/repo','immutableCommit':'a'*40,'denominatorCount':6}]})
        for name in collection.SHARDS:
            (self.shards/name).write_text('',encoding='utf-8')
        self.candidate = {'semanticUnitId':'unit-1','repository':'example/repo','immutableCommit':'a'*40,'path':'docs/readme.md','heading':'Example','excerptHash':'sha256:'+'b'*64,'authority':'approved'}
        (self.shards/collection.SHARDS[0]).write_text(json.dumps(self.candidate)+'\n',encoding='utf-8')

    def save_manifest(self):
        brain.write_json(self.manifest,self.payload)

    def build(self):
        return collection.build_collection(self.snap,self.index,self.shards,self.output,progress=lambda *a,**k:None)

    def tearDown(self):
        self.temp.cleanup()

    def test_complete_denominator_and_dispositions(self):
        catalog=self.build()
        self.assertEqual(catalog['stats']['indexed'],7)
        self.assertEqual(catalog['stats']['fileEntries'],6)
        self.assertEqual(catalog['stats']['verifiedTextFiles'],1)
        self.assertEqual(len(catalog['sources']),17)
        self.assertEqual(catalog['stats']['availabilityCounts']['missing-local-file'],1)
        self.assertEqual(catalog['stats']['availabilityCounts']['content-hash-mismatch'],1)
        with closing(collection.connect(self.output)) as db:
            self.assertEqual(collection.search(db)['total'],7)
            self.assertEqual(collection.search(db,'architectureunique123')['total'],1)
            self.assertEqual(collection.search(db,'quarantinemarker992')['total'],0)
            self.assertEqual(collection.search(db,'excludedmarker992')['total'],0)
            for row in collection.search(db)['items']:
                self.assertEqual(row['authority'],brain.BOUNDARY)

    def test_project_scoped_files_cannot_enter_shared_collection(self):
        self.files[0]['tenantId']='private-tenant';self.save_manifest()
        with self.assertRaisesRegex(ValueError,'scope differs'):
            self.build()
        self.assertFalse((self.output/'collection.sqlite').exists())

    def test_pagination_reaches_every_record_without_overlap(self):
        self.build()
        with closing(collection.connect(self.output)) as db:
            found=[]
            for offset in range(0,7,2):
                page=collection.search(db,offset=offset,limit=2)
                found.extend(n['id'] for n in page['items'])
            self.assertEqual(len(set(found)),7)
            self.assertEqual(collection.search(db,offset=7)['items'],[])
            self.assertEqual(collection.search(db,availability='quarantined')['total'],1)
            self.assertEqual(collection.search(db,repository='other/repo')['total'],0)

    def test_candidate_links_to_selected_revision(self):
        self.build()
        with closing(collection.connect(self.output)) as db:
            unit=collection.search(db,kind='candidate-semantic-unit')['items'][0]
            self.assertEqual(unit['availability'],'linked-source')
            file=collection.get_record(db,unit['linkedFileId'])
            self.assertEqual(file['kind'],'acquired-file')
            self.assertIn('architectureunique123',collection.preview(db,file['id'])['text'])

    def test_changed_revision_cannot_link_to_different_snapshot(self):
        self.candidate['immutableCommit']='b'*40
        (self.shards/collection.SHARDS[0]).write_text(json.dumps(self.candidate)+'\n',encoding='utf-8')
        self.build()
        with closing(collection.connect(self.output)) as db:
            unit=collection.search(db,kind='candidate-semantic-unit')['items'][0]
            self.assertIsNone(unit['linkedFileId'])

    def test_preview_rechecks_source_hash(self):
        self.build()
        with closing(collection.connect(self.output)) as db:
            file=collection.search(db,availability='verified-text')['items'][0]
            (self.folder/'files/docs/readme.md').write_text('changed',encoding='utf-8')
            with self.assertRaisesRegex(ValueError,'changed'):
                collection.preview(db,file['id'])

    def test_changed_manifest_blocks_preview(self):
        self.build()
        with closing(collection.connect(self.output)) as db:
            file=collection.search(db,availability='verified-text')['items'][0]
            self.files[0]['status']='quarantined';self.save_manifest()
            with self.assertRaisesRegex(ValueError,'manifest changed'):
                collection.preview(db,file['id'])

    def test_blocked_records_cannot_preview(self):
        self.build()
        with closing(collection.connect(self.output)) as db:
            for state in ('quarantined','policy-excluded','missing-local-file','content-hash-mismatch','opaque-no-text-preview'):
                item=collection.search(db,availability=state)['items'][0]
                with self.subTest(state=state),self.assertRaises(PermissionError):
                    collection.preview(db,item['id'])

    def test_missing_shard_fails_without_partial_site(self):
        (self.shards/collection.SHARDS[-1]).unlink()
        with self.assertRaisesRegex(ValueError,'Incomplete candidate'):
            self.build()
        self.assertFalse((self.output/'collection.sqlite').exists())

    def test_manifest_identity_and_denominator_enforced(self):
        self.payload['repository']='other/repo';self.save_manifest()
        with self.assertRaisesRegex(ValueError,'identity'):
            self.build()
        self.payload['repository']='example/repo';self.payload['files']=[];self.save_manifest()
        with self.assertRaisesRegex(ValueError,'denominator'):
            self.build()

    def test_duplicate_candidates_and_files_fail(self):
        (self.shards/collection.SHARDS[1]).write_text(json.dumps(self.candidate)+'\n',encoding='utf-8')
        with self.assertRaises(sqlite3.IntegrityError):
            self.build()
        self.files[1]=dict(self.files[0]);self.save_manifest()
        with self.assertRaisesRegex(ValueError,'Duplicate file'):
            self.build()

    def test_path_escape_and_windows_stream_rejected(self):
        for relative in ('../outside','/absolute','x/../../outside','C:/secret','file:stream','x\\y'):
            with self.subTest(relative=relative),self.assertRaises(ValueError):
                collection.beneath(self.snap,relative)

    def test_oversized_and_non_text_never_rendered(self):
        file=self.folder/'files/docs/readme.md'
        file.write_bytes(b'a'*21)
        with patch.object(collection,'MAX_TEXT_BYTES',20):
            self.assertEqual(collection.verified_text(self.snap,'snapshots/GH-EXAMPLE/KSNAP-EXAMPLE/files/docs/readme.md',brain.digest(file.read_bytes()))[0],'preview-size-limit')
        file.write_bytes(b'abc\0def')
        self.assertEqual(collection.verified_text(self.snap,'snapshots/GH-EXAMPLE/KSNAP-EXAMPLE/files/docs/readme.md',brain.digest(file.read_bytes()))[0],'verified-binary')

    def test_spill_to_disk_preserves_search_and_previews(self):
        with patch.object(collection,'MAX_STAGING_BYTES',1):
            self.build()
        with closing(collection.connect(self.output)) as db:
            self.assertEqual(collection.search(db)['total'],7)
            file=collection.search(db,'architectureunique123')['items'][0]
            self.assertIn('architectureunique123',collection.preview(db,file['id'])['text'])

    def test_query_injection_and_invalid_limits(self):
        self.build()
        with closing(collection.connect(self.output)) as db:
            self.assertEqual(collection.search(db,"' OR 1=1 --")['total'],0)
            self.assertEqual(collection.search(db,'"* OR NEAR(')['total'],0)
            for kwargs in ({'offset':-1},{'offset':10**30},{'limit':101},{'query':'x'*251}):
                with self.assertRaises(ValueError):collection.search(db,**kwargs)
            self.assertEqual(db.execute('SELECT count(*) FROM records').fetchone()[0],7)

    def test_http_api_and_asset_boundaries(self):
        self.build()
        server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(brain.LocalHandler,directory=str(self.output)))
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        base=f'http://127.0.0.1:{server.server_port}'
        try:
            with urlopen(base+'/api/search?availability=verified-text') as r:
                data=json.load(r)
            source=data['items'][0]
            with urlopen(base+'/api/records/'+source['id']+'/content') as r:
                self.assertEqual(json.load(r)['verification'],'content-sha256-matched')
            for url,status in (('/collection.sqlite',404),('/api/search?offset=-1',400),('/api/records/not-found',404),('/api/records/../../README.md',404)):
                with self.subTest(url=url),self.assertRaises(HTTPError) as caught:urlopen(base+url)
                self.assertEqual(caught.exception.code,status)
            for headers in ({'Host':'attacker.example'},{'Origin':'https://attacker.example'}):
                with self.assertRaises(HTTPError) as caught:urlopen(Request(base+'/api/search',headers=headers))
                self.assertEqual(caught.exception.code,403)
        finally:
            server.shutdown();server.server_close();thread.join()


if __name__=='__main__':unittest.main()
