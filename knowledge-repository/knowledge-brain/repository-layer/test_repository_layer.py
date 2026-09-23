import copy
import json
from pathlib import Path
import sqlite3
import tempfile
import unittest
import repository_layer as r

TEXT = ('# Synthetic architecture fixture\n\nA service must use a retry pattern when failures are transient and the interface allows repeated requests.\n\n'
        'Avoid retry for a service with irreversible effects; however an alternative tactic requires an idempotency prerequisite.\n')

class LayerTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(); self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name); self.db = self.root/'state.sqlite'
        self.item = self.source(TEXT, 'a'*40)

    def source(self, text, commit):
        raw=text.encode(); h=r.sha(raw); rel='snapshots/TEST/'+commit
        snap=self.root/rel; (snap/'files').mkdir(parents=True,exist_ok=True)
        (snap/'files/guide.md').write_bytes(raw)
        obj='objects/sha256/'+h[:2]+'/'+h; p=snap/obj; p.parent.mkdir(parents=True,exist_ok=True); p.write_bytes(raw)
        manifest={'connectorId':'TEST','repository':'example/architecture','commitSha':commit,'snapshotId':commit,
                  'files':[{'path':'guide.md','status':'accepted','contentSha256':'sha256:'+h,'contentAddressedObject':obj}]}
        r.dump(snap/'manifest.json',manifest)
        return dict(repositoryId='TEST',repository='example/architecture',commit=commit,path='guide.md',hash=h,
                    snapshot=rel,object=obj,manifestHash=r.file_hash(snap/'manifest.json'),licenceDisposition='synthetic-test-only',exportDisposition='metadata-only')

    def test_provenance(self):
        result=r.refresh(self.root,[self.item],self.db); self.assertEqual(result['newRevisions'],1)
        packet=r.packet(self.db,'t','p'); self.assertFalse(packet['productionAccepted'])
        for ps in packet['sources'][0]['passages']:
            excerpt='\n'.join(TEXT.split('\n')[ps['lineStart']-1:ps['lineEnd']])
            self.assertEqual(r.sha(excerpt.encode()),ps['excerptHash'])
        self.assertNotIn(TEXT,json.dumps(packet)); self.assertTrue(packet['claims'])

    def test_unchanged(self):
        r.refresh(self.root,[self.item],self.db); result=r.refresh(self.root,[self.item],self.db)
        self.assertEqual((result['newRevisions'],result['unchanged']),(0,1))

    def test_change_invalidates(self):
        r.refresh(self.root,[self.item],self.db); nxt=self.source(TEXT+'\nA changed architectural condition requires review.\n','b'*40)
        result=r.refresh(self.root,[nxt],self.db); self.assertEqual(result['newRevisions'],1)
        db=sqlite3.connect(self.db); self.addCleanup(db.close)
        self.assertGreater(db.execute("SELECT count(*) FROM claims WHERE state='ineligible-pending-review'").fetchone()[0],0)
        packet=r.packet(self.db,'t','p'); self.assertTrue(packet['sources'][0]['supersedes']); self.assertTrue(any(n['kind']=='invalidation' for n in packet['notices']))

    def test_withdrawal(self):
        r.refresh(self.root,[self.item],self.db); item=dict(self.item,withdrawn=True)
        r.refresh(self.root,[item],self.db); self.assertEqual(r.packet(self.db,'t','p')['sources'],[])

    def test_missing_object(self):
        (self.root/self.item['snapshot']/self.item['object']).unlink()
        result=r.refresh(self.root,[self.item],self.db); self.assertIn('missing-object',result['errors'][0]['reason']); self.assertEqual(result['newRevisions'],0)

    def test_corrupt_object_revokes(self):
        r.refresh(self.root,[self.item],self.db)
        (self.root/self.item['snapshot']/self.item['object']).write_text('corrupt')
        result=r.refresh(self.root,[self.item],self.db); self.assertIn('corrupt-object',result['errors'][0]['reason']); self.assertEqual(r.query(self.db,'guide'),[])

    def test_tampered_manifest(self):
        (self.root/self.item['snapshot']/'manifest.json').write_text('{}')
        result=r.refresh(self.root,[self.item],self.db); self.assertEqual(result['errors'][0]['reason'],'manifest-changed')

    def test_no_authority_from_labels(self):
        r.refresh(self.root,[self.item],self.db)
        self.assertTrue(r.query(self.db,'guide')); self.assertEqual(r.query(self.db,'guide',mode='approved'),[])
        self.assertTrue(all(not c['eligible'] for c in r.packet(self.db,'t','p')['claims']))

    def test_dry_run_no_write(self):
        r.refresh(self.root,[self.item],self.db); before=r.file_hash(self.db)
        nxt=self.source(TEXT+'\nNew candidate service text.\n','c'*40)
        result=r.refresh(self.root,[nxt],self.db,dry_run=True)
        self.assertEqual(result['newRevisions'],1); self.assertEqual(r.file_hash(self.db),before)

    def test_checkpoint_resume(self):
        other=self.source(TEXT,'d'*40); other['path']='other.md'
        snap=self.root/other['snapshot']; (snap/'files/guide.md').rename(snap/'files/other.md')
        m=json.loads((snap/'manifest.json').read_text()); m['files'][0]['path']='other.md'; r.dump(snap/'manifest.json',m); other['manifestHash']=r.file_hash(snap/'manifest.json')
        a=r.refresh(self.root,[self.item,other],self.db,batch=1); b=r.refresh(self.root,[self.item,other],self.db,batch=1)
        self.assertEqual((a['complete'],b['start'],b['complete']),(False,1,True))

    def test_conflict_suggestion_not_advice(self):
        r.refresh(self.root,[self.item],self.db)
        edges=[e for c in r.packet(self.db,'t','p')['claims'] for e in c['edges']]
        self.assertIn('contradiction',{e['type'] for e in edges}); self.assertTrue(all(e['status']=='suggestion' for e in edges))

    def test_path_escape(self):
        for p in ['../secret','C:/secret','/secret','a\\b','a/../b']:
            with self.assertRaises(ValueError): r.safe(self.root,p)

    def test_bounds_and_cursor(self):
        r.refresh(self.root,[self.item],self.db)
        with self.assertRaises(ValueError): r.refresh(self.root,[self.item],self.db,batch=31)
        with self.assertRaises(ValueError): r.packet(self.db,'t','p',999)
        with self.assertRaises(ValueError): r.query(self.db,'guide',limit=13)
        packet=r.packet(self.db,'t','p'); self.assertEqual(r.packet(self.db,'t','p',packet['cursor'])['notices'],[])

    def test_historical_replay(self):
        r.refresh(self.root,[self.item],self.db); nxt=self.source(TEXT+'\nA new interface risk requires review.\n','b'*40)
        r.refresh(self.root,[nxt],self.db); result=r.refresh(self.root,[self.item],self.db)
        self.assertIn('historical-revision-replay-blocked',result['errors'][0]['reason'])

    def test_restricted_never_read(self):
        checked=r.check_file(self.root,{'path':'secret','status':'quarantined','contentSha256':'sha256:'+'0'*64})
        self.assertEqual(checked['resolution'],'restricted-not-read')

    def test_opaque_object_only(self):
        snapshot=self.root/self.item['snapshot']
        (snapshot/'files/guide.md').unlink()
        result=r.check_file(snapshot,{'path':'guide.md','status':'accepted-opaque','contentSha256':'sha256:'+self.item['hash'],'contentAddressedObject':self.item['object']})
        self.assertEqual(result['resolution'],'verified-object-only')
        self.assertEqual(result['errors'],[])

    def test_streaming_array(self):
        p=self.root/'large.json'; r.dump(p,{'connectorId':'T','files':[{'path':str(i),'text':'x'*100} for i in range(2000)],'other':[{'skip':True}]*3000})
        self.assertEqual(sum(k=='file' for k,v in r.manifest_values(p)),2000)

if __name__=='__main__': unittest.main(verbosity=2)
