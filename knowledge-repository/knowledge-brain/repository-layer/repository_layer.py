"""Streaming acquisition audit and bounded, candidate-only repository service (stdlib)."""
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import re
import sqlite3
import sys
import time
import uuid

VERSION = 'aiw-repository-packet-v1'
MAX_BYTES = 8_000_000


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def identity(kind, *parts):
    return kind + '-' + sha(json.dumps(parts, separators=(',', ':')).encode())[:32]


def file_hash(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def safe(root, relative):
    if not isinstance(relative, str) or not relative or '\\' in relative or ':' in relative or any(x in ('', '.', '..') for x in relative.split('/')):
        raise ValueError('unsafe path')
    root = Path(root).resolve()
    p = (root / relative).resolve()
    if not p.is_relative_to(root):
        raise ValueError('path outside root')
    return p


class StreamJSON:
    """Incremental decoder: retains one JSON value, never a manifest files array."""
    def __init__(self, f):
        self.f, self.buf, self.pos, self.eof = f, '', 0, False
        self.decoder = json.JSONDecoder()

    def fill(self):
        self.buf = self.buf[self.pos:] + self.f.read(65536)
        self.pos = 0
        if not self.buf:
            raise ValueError('truncated JSON')

    def peek(self):
        while True:
            while self.pos < len(self.buf) and self.buf[self.pos].isspace():
                self.pos += 1
            if self.pos < len(self.buf):
                return self.buf[self.pos]
            self.fill()

    def eat(self, char):
        if self.peek() != char:
            raise ValueError('malformed JSON: expected ' + char)
        self.pos += 1

    def value(self):
        self.peek()
        while True:
            try:
                v, self.pos = self.decoder.raw_decode(self.buf, self.pos)
                return v
            except json.JSONDecodeError:
                tail = self.f.read(65536)
                if not tail:
                    raise ValueError('truncated JSON value')
                self.buf = self.buf[self.pos:] + tail
                self.pos = 0


def manifest_values(path):
    with Path(path).open(encoding='utf-8-sig') as f:
        stream = StreamJSON(f)
        stream.eat('{')
        while stream.peek() != '}':
            key = stream.value()
            stream.eat(':')
            if stream.peek() == '[':
                stream.eat('[')
                while stream.peek() != ']':
                    value = stream.value()
                    if key == 'files':
                        yield 'file', value
                    if stream.peek() != ']':
                        stream.eat(',')
                stream.eat(']')
            else:
                value = stream.value()
                if key in ('connectorId', 'repository', 'commitSha', 'snapshotId', 'licenceEvidence', 'manifestSha256'):
                    yield key, value
            if stream.peek() != '}':
                stream.eat(',')
        stream.eat('}')


def dump(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(data, indent=2, ensure_ascii=True) + '\n', encoding='utf-8')
    for attempt in range(6):
        try:
            os.replace(temp, path)
            break
        except PermissionError:
            if attempt == 5: raise
            time.sleep(0.05 * (attempt + 1))


def check_file(snapshot, f):
    status = f.get('status', 'unknown')
    result = {'path': f['path'], 'hash': f.get('contentSha256', '').removeprefix('sha256:'), 'acquisition': status,
              'restricted': status not in ('accepted', 'accepted-opaque'), 'exportDisposition': 'metadata-only', 'errors': []}
    if status not in ('accepted', 'accepted-opaque'):
        result['resolution'] = 'restricted-not-read'
        return result
    expected = result['hash']
    if not re.fullmatch('[a-f0-9]{64}', expected):
        result['errors'].append('invalid-content-hash')
        return result
    for kind, rel in [('file', 'files/' + f['path']), ('object', f.get('contentAddressedObject', ''))]:
        if kind == 'file' and status == 'accepted-opaque':
            result['snapshotCopyResolution'] = 'not-materialized-by-acquisition-policy'
            continue
        try:
            p = safe(snapshot, rel)
            if not p.is_file():
                result['errors'].append('missing-' + kind)
            elif file_hash(p) != expected:
                result['errors'].append('corrupt-' + kind)
        except (OSError, ValueError):
            result['errors'].append('unresolvable-' + kind)
    result['resolution'] = ('verified-object-only' if status == 'accepted-opaque' else 'verified') if not result['errors'] else 'failed'
    return result


def inventory(root, index_path, output):
    root, output = Path(root).resolve(), Path(output)
    output.mkdir(parents=True, exist_ok=True)
    index = json.loads(Path(index_path).read_text(encoding='utf-8-sig'))
    # Disk-backed object reconciliation keeps corpus-scale identities out of memory.
    dbpath = output / 'inventory.sqlite'
    db = sqlite3.connect(dbpath)
    db.executescript('DROP TABLE IF EXISTS refs; CREATE TABLE refs(snapshot TEXT, object TEXT, PRIMARY KEY(snapshot,object));')
    summary = {'schemaVersion': 'aiw-corpus-audit-v1', 'productionAccepted': False,
               'sourceAuthority': index.get('knowledgeAuthority'), 'acquisitionProductionAccepted': index.get('productionAccepted'),
               'repositories': [], 'counts': {}, 'errors': []}
    totals = Counter()
    with (output / 'inventory.jsonl').open('w', encoding='utf-8') as out, ThreadPoolExecutor(max_workers=12) as pool:
        for e in index['manifests']:
            rel = 'snapshots/' + e['connectorId'] + '/' + e['snapshotId']
            snapshot = safe(root, rel)
            mp = snapshot / 'manifest.json'
            counts, statuses, errors = Counter(), Counter(), Counter()
            meta = {}
            cp = root / 'checkpoints' / (e['connectorId'] + '.json')
            checkpoint = json.loads(cp.read_text()) if cp.is_file() else {}
            checkpoint_ok = checkpoint.get('commitSha') == e['immutableCommit']
            journal = checkpoint.get('journal')
            journal_count = 0
            if journal:
                jp = safe(root, journal)
                if jp.is_file():
                    with jp.open('rb') as jf:
                        journal_count = sum(1 for line in jf if line.strip())
            if not checkpoint_ok:
                errors['checkpoint-commit-mismatch'] += 1
            if not mp.is_file():
                summary['errors'].append(e['connectorId'] + ':missing-manifest')
                continue
            raw_manifest_hash = file_hash(mp)
            batch = []
            def consume(batch):
                for f, checked in zip(batch, pool.map(lambda x: check_file(snapshot, x), batch)):
                    counts['fileEntries'] += 1
                    statuses[checked['acquisition']] += 1
                    counts[checked.get('resolution', 'failed')] += 1
                    errors.update(checked['errors'])
                    if f.get('contentAddressedObject'):
                        db.execute('INSERT OR IGNORE INTO refs VALUES(?,?)', (rel, f['contentAddressedObject']))
                    record = dict(checked, repositoryId=e['connectorId'], repository=e['repository'], remote='https://github.com/' + e['repository'],
                                  commit=e['immutableCommit'], snapshot=e['snapshotId'], checkpointResolved=checkpoint_ok,
                                  licenceDisposition=meta.get('licenceEvidence', {}).get('finalDisposition', 'unknown'))
                    out.write(json.dumps(record) + '\n')
            for key, value in manifest_values(mp):
                if key != 'file':
                    meta[key] = value
                    continue
                batch.append(value)
                if len(batch) == 64:
                    consume(batch); batch = []
            consume(batch)
            if meta.get('manifestSha256') != e['manifestChecksum']:
                errors['embedded-manifest-checksum-mismatch'] += 1
            for key, expected in [('connectorId', e['connectorId']), ('repository', e['repository']), ('commitSha', e['immutableCommit']), ('snapshotId', e['snapshotId'])]:
                if meta.get(key) != expected:
                    errors['manifest-identity-mismatch'] += 1
            if counts['fileEntries'] != e['denominatorCount']:
                errors['denominator-mismatch'] += 1
            for folder in ('objects', 'quarantine'):
                for directory, _, files in os.walk(snapshot / folder):
                    for name in files:
                        counts[folder + 'OnDisk'] += 1
                        relative = (Path(directory) / name).relative_to(snapshot).as_posix()
                        if folder == 'objects' and not db.execute('SELECT 1 FROM refs WHERE snapshot=? AND object=?', (rel, relative)).fetchone():
                            counts['unreferencedObjects'] += 1
            db.commit()
            totals.update(counts)
            summary['repositories'].append({'repositoryId': e['connectorId'], 'repository': e['repository'], 'commit': e['immutableCommit'],
                'snapshot': e['snapshotId'], 'rawManifestSha256': raw_manifest_hash, 'canonicalManifestDigestRecomputed': False, 'checkpoint': {'present': bool(checkpoint), 'commitMatches': checkpoint_ok, 'processedCount': checkpoint.get('processedCount'), 'journalRows': journal_count},
                'counts': dict(counts), 'acquisitionStatuses': dict(statuses), 'errors': dict(errors),
                'licence': meta.get('licenceEvidence', {}), 'exportDisposition': 'metadata-only'})
            print(e['connectorId'], dict(counts), dict(errors), flush=True)
    db.close()
    all_manifests = list(root.glob('snapshots/*/*/manifest.json'))
    selected = {e['snapshotId'] for e in index['manifests']}
    summary.update(selectedManifests=len(summary['repositories']), manifestsOnDisk=len(all_manifests),
                   historicalSnapshots=[p.parent.name for p in all_manifests if p.parent.name not in selected])
    summary['counts'] = dict(totals)
    # Count all stores, including unselected history, without opening restricted bytes.
    physical = Counter()
    for p in all_manifests:
        for folder in ('objects', 'quarantine'):
            for _, _, files in os.walk(p.parent / folder):
                physical[folder] += len(files)
    summary['allSnapshotPhysicalCounts'] = dict(physical)
    dump(output / 'corpus-summary.json', summary)
    return summary


EDGE_RULES = {'concept': r'\barchitecture\b', 'pattern': r'\bpattern\b', 'tactic': r'\b(cache|retry|timeout)\b',
 'component': r'\b(service|component)\b', 'interface': r'\b(api|interface|endpoint)\b', 'prerequisite': r'\b(require|requires|must)\b',
 'risk': r'\b(risk|failure|fail)\b', 'trade-off': r'\b(trade.?off|however|cost)\b', 'alternative': r'\b(alternative|instead|either)\b',
 'contradiction': r'\b(avoid|not recommended|must not)\b'}


def passages(raw):
    text = raw.decode('utf-8')
    lines = text.split('\n')
    result, block, start = [], [], 0
    fenced = False
    front = bool(lines and lines[0].strip() == '---')
    def flush():
        if block:
            excerpt = '\n'.join(block)
            if len(excerpt.strip()) >= 60:
                result.append({'lineStart': start + 1, 'lineEnd': start + len(block), 'excerptHash': sha(excerpt.encode()), 'text': excerpt})
            block.clear()
    for i, line in enumerate(lines):
        if front:
            if i and line.strip() == '---': front = False
            continue
        if re.match(r'\s*(```|~~~)', line):
            flush(); fenced = not fenced; continue
        if fenced: continue
        if not line.strip() or line.lstrip().startswith(('#', '<', '|', '![')) or len(line) > 1400:
            flush(); continue
        if len(block) >= 4 or sum(map(len, block)) + len(line) > 1400: flush()
        if not block: start = i
        block.append(line)
    flush()
    return result[:8]


def select_pilot(root, index_path, target):
    entries = json.loads(Path(index_path).read_text())['manifests']
    plan = []
    repos = {'GH-MICROSOFT-ARCH-CENTER': 12, 'GH-OTEL-DEMO': 12}
    for e in entries:
        if e['connectorId'] not in repos: continue
        rel = 'snapshots/' + e['connectorId'] + '/' + e['snapshotId']
        chosen = 0
        for key, f in manifest_values(safe(root, rel + '/manifest.json')):
            if key != 'file' or f.get('status') != 'accepted' or not f['path'].endswith('.md'): continue
            if e['connectorId'] == 'GH-MICROSOFT-ARCH-CENTER' and not f['path'].startswith(('docs/patterns/', 'docs/best-practices/')): continue
            p = safe(root, rel + '/files/' + f['path'])
            if p.stat().st_size > 60000: continue
            raw = p.read_bytes()
            try: ps = passages(raw)
            except UnicodeDecodeError: continue
            if not ps or check_file(safe(root, rel), f)['errors']: continue
            plan.append({'repositoryId': e['connectorId'], 'repository': e['repository'], 'commit': e['immutableCommit'], 'path': f['path'],
                'hash': f['contentSha256'].removeprefix('sha256:'), 'snapshot': rel, 'object': f['contentAddressedObject'],
                'manifestHash': file_hash(safe(root, rel + '/manifest.json')), 'licenceDisposition': 'requires-human-licence-review', 'exportDisposition': 'metadata-only'})
            chosen += 1
            if chosen == repos[e['connectorId']]: break
    dump(target, plan)
    return plan


def connect(path):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(path, timeout=30)
    db.execute('PRAGMA foreign_keys=ON')
    db.executescript('''
    CREATE TABLE IF NOT EXISTS revisions(id TEXT PRIMARY KEY, logical TEXT, hash TEXT, data TEXT, state TEXT);
    CREATE TABLE IF NOT EXISTS heads(logical TEXT PRIMARY KEY, revision TEXT);
    CREATE TABLE IF NOT EXISTS claims(id TEXT PRIMARY KEY, revision TEXT REFERENCES revisions(id), data TEXT, state TEXT);
    CREATE TABLE IF NOT EXISTS events(cursor INTEGER PRIMARY KEY AUTOINCREMENT, kind TEXT, data TEXT);
    CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, position INTEGER);
    CREATE TABLE IF NOT EXISTS metadata(key TEXT PRIMARY KEY, value TEXT);
    ''')
    db.execute("INSERT OR IGNORE INTO metadata VALUES('storeId',?)", (str(uuid.uuid4()),))
    db.commit()
    return db


def event(db, kind, data):
    db.execute('INSERT INTO events(kind,data) VALUES(?,?)', (kind, json.dumps(data)))


def invalidate(db, logical, reason):
    old = db.execute('SELECT revision FROM heads WHERE logical=?', (logical,)).fetchone()
    if old:
        prior = db.execute('SELECT state FROM revisions WHERE id=?', old).fetchone()[0]
        if prior == reason: return
        db.execute('UPDATE revisions SET state=? WHERE id=?', (reason, old[0]))
        db.execute("UPDATE claims SET state='ineligible-pending-review' WHERE revision=?", old)
        event(db, 'invalidation', {'revisionId': old[0], 'reason': reason, 'dependentClaimsIneligible': True})


def refresh(root, plan, dbpath, batch=30, dry_run=False):
    if not 1 <= batch <= 30 or len(plan) > 100: raise ValueError('bounded refresh requires batch 1..30 and <=100 selections')
    db = connect(':memory:' if dry_run else dbpath)
    if dry_run and Path(dbpath).exists():
        src = sqlite3.connect('file:' + Path(dbpath).resolve().as_posix() + '?mode=ro', uri=True); src.backup(db); src.close()
    job = sha(json.dumps(plan, sort_keys=True).encode())
    row = db.execute('SELECT position FROM jobs WHERE id=?', (job,)).fetchone()
    start = row[0] if row and row[0] < len(plan) else 0
    result = {'dryRun': dry_run, 'processed': 0, 'newRevisions': 0, 'unchanged': 0, 'errors': [], 'start': start}
    try:
        db.execute('BEGIN IMMEDIATE')
        db.execute('PRAGMA defer_foreign_keys=ON')
        for i in range(start, min(start + batch, len(plan))):
            item = plan[i]; logical = identity('file', item['repository'], item['path'])
            try:
                if item.get('withdrawn'):
                    invalidate(db, logical, 'withdrawn'); result['processed'] += 1; continue
                snapshot = safe(root, item['snapshot'])
                mp = snapshot / 'manifest.json'
                if file_hash(mp) != item['manifestHash']: raise ValueError('manifest-changed')
                found = next((f for k, f in manifest_values(mp) if k == 'file' and f['path'] == item['path']), None)
                if not found or found.get('status') != 'accepted' or found.get('contentSha256') != 'sha256:' + item['hash'] or found.get('contentAddressedObject') != item['object']:
                    raise ValueError('manifest-disposition-or-identity-mismatch')
                # Verify repo and commit, independent of caller-supplied selectors.
                header = {}
                for k, v in manifest_values(mp):
                    if k == 'file': break
                    header[k] = v
                if header.get('repository') != item['repository'] or header.get('commitSha') != item['commit'] or header.get('connectorId') != item['repositoryId']:
                    raise ValueError('manifest-repository-mismatch')
                checked = check_file(snapshot, found)
                if checked['errors']: raise ValueError(','.join(checked['errors']))
                p = safe(snapshot, 'files/' + item['path'])
                if p.stat().st_size > 60000: raise ValueError('source-over-60000-byte-limit')
                raw = p.read_bytes()
                if sha(raw) != item['hash']: raise ValueError('source-changed-during-read')
                parsed = passages(raw)
                if not parsed: raise ValueError('no-readable-passages')
                rid = identity('revision', item['repository'], item['commit'], item['path'], item['hash'])
                old = db.execute('SELECT revision FROM heads WHERE logical=?', (logical,)).fetchone()
                existing = db.execute('SELECT state FROM revisions WHERE id=?', (rid,)).fetchone()
                if existing:
                    if old and old[0] != rid: raise ValueError('historical-revision-replay-blocked')
                    if existing[0] != 'current': raise ValueError('invalidated-revision-requires-review')
                    result['unchanged'] += 1
                else:
                    if old: invalidate(db, logical, 'superseded')
                    data = dict(item, revisionId=rid, supersedes=old[0] if old else None, passages=[])
                    for ps in parsed:
                        pid = identity('passage', rid, ps['lineStart'], ps['lineEnd'], ps['excerptHash'])
                        passage = {k: v for k, v in ps.items() if k != 'text'}
                        passage['passageId'] = pid; data['passages'].append(passage)
                        edges = [{'type': kind, 'target': identity('concept', kind, match.group(0).lower()), 'label': match.group(0).lower(), 'status': 'suggestion',
                                  'inference': 'lexical-cue-only; applicability and semantics unverified'} for kind, regex in EDGE_RULES.items() if (match := re.search(regex, ps['text'], re.I))]
                        claim = {'claimId': identity('claim', pid), 'revisionId': rid, 'passageId': pid, 'statement': 'Candidate interpretation pending human architecture review.',
                                 'reviewState': 'unreviewed', 'releaseState': 'unreleased', 'eligible': False, 'edges': edges,
                                 'contextStatus': 'conditions-limitations-and-polarity-unresolved'}
                        db.execute('INSERT INTO claims VALUES(?,?,?,?)', (claim['claimId'], rid, json.dumps(claim), 'candidate'))
                    db.execute('INSERT INTO revisions VALUES(?,?,?,?,?)', (rid, logical, item['hash'], json.dumps(data), 'current'))
                    # claims reference the revision, so the FK is deferred for this transaction.
                    db.execute('INSERT OR REPLACE INTO heads VALUES(?,?)', (logical, rid))
                    event(db, 'revision', {'revisionId': rid, 'supersedes': data['supersedes']})
                    result['newRevisions'] += 1
            except (ValueError, OSError, UnicodeError) as exc:
                invalidate(db, logical, 'source-unavailable')
                result['errors'].append({'path': item['path'], 'reason': str(exc)})
            result['processed'] += 1
        position = min(start + batch, len(plan))
        db.execute('INSERT OR REPLACE INTO jobs VALUES(?,?)', (job, position))
        result.update(nextPosition=position, complete=position == len(plan), cursor=db.execute('SELECT COALESCE(MAX(cursor),0) FROM events').fetchone()[0])
        db.commit()
        return result
    finally:
        db.close()


def query(dbpath, question, mode='candidate', limit=12):
    if mode not in ('candidate', 'approved') or not 1 <= limit <= 12 or len(question) > 500: raise ValueError('invalid query bounds')
    if mode == 'approved': return []  # No trust adapter / independent signed releases installed.
    terms = re.findall('[a-z0-9]+', question.lower())[:20]
    db = sqlite3.connect('file:' + Path(dbpath).resolve().as_posix() + '?mode=ro', uri=True)
    hits = []
    for data, in db.execute("SELECT data FROM revisions WHERE state='current'"):
        item = json.loads(data)
        score = sum(t in (item['repository'] + '/' + item['path']).lower() for t in terms)
        if score: hits.append((score, item))
    db.close()
    return [dict(item, matchReason='repository/path lexical match; interpretation unverified') for _, item in sorted(hits, key=lambda x: (-x[0], x[1]['revisionId']))[:limit]]


def packet(dbpath, tenant, project, cursor=0):
    if not tenant or not project or cursor < 0: raise ValueError('scope/cursor required')
    db = sqlite3.connect('file:' + Path(dbpath).resolve().as_posix() + '?mode=ro', uri=True)
    db.execute('BEGIN')
    current = db.execute('SELECT COALESCE(MAX(cursor),0) FROM events').fetchone()[0]
    if cursor > current:
        db.close()
        raise ValueError('cursor ahead of store')
    revisions = [json.loads(x[0]) for x in db.execute("SELECT data FROM revisions WHERE state='current' ORDER BY id LIMIT 101")]
    claims = [json.loads(x[0]) for x in db.execute("SELECT c.data FROM claims c JOIN revisions r ON r.id=c.revision WHERE r.state='current' AND c.state='candidate' ORDER BY c.id LIMIT 251")]
    notices = [dict(cursor=n, kind=k, **json.loads(d)) for n,k,d in db.execute('SELECT cursor,kind,data FROM events WHERE cursor>? ORDER BY cursor LIMIT 501', (cursor,))]
    store_id = db.execute("SELECT value FROM metadata WHERE key='storeId'").fetchone()[0]
    db.close()
    result = {'schemaVersion': VERSION, 'storeId': store_id, 'tenantId': tenant, 'projectId': project, 'fromCursor': cursor, 'cursor': current,
              'authority': 'candidate', 'productionAccepted': False, 'sources': revisions, 'claims': claims, 'notices': notices,
              'release': {'status': 'blocked', 'reason': 'Independent approval, licence clearance and trusted signature verification required.'}}
    if len(revisions) > 100 or len(claims) > 250 or len(notices) > 500 or len(json.dumps(result).encode()) > MAX_BYTES:
        raise ValueError('packet exceeds project bounds; select a smaller shared-store view')
    return result


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers(dest='command', required=True)
    for name in ('inventory', 'select', 'refresh'):
        p = sub.add_parser(name); p.add_argument('--root', required=True)
        if name in ('inventory', 'select'): p.add_argument('--index', required=True); p.add_argument('--output', required=True)
        else:
            p.add_argument('--plan', required=True); p.add_argument('--db', required=True); p.add_argument('--batch', type=int, default=30); p.add_argument('--dry-run', action='store_true')
    p = sub.add_parser('export'); p.add_argument('--db', required=True); p.add_argument('--tenant', required=True); p.add_argument('--project', required=True); p.add_argument('--cursor', type=int, default=0); p.add_argument('--output', required=True)
    p = sub.add_parser('query'); p.add_argument('--db', required=True); p.add_argument('--question', required=True); p.add_argument('--mode', choices=['candidate','approved'], default='candidate')
    a = parser.parse_args()
    if a.command == 'inventory': inventory(a.root, a.index, a.output)
    elif a.command == 'select': print(len(select_pilot(a.root,a.index,a.output)))
    elif a.command == 'refresh':
        result = refresh(a.root,json.loads(Path(a.plan).read_text()),a.db,a.batch,a.dry_run)
        print(json.dumps(result))
        if result['errors']: sys.exit(2)
    elif a.command == 'export': dump(a.output,packet(a.db,a.tenant,a.project,a.cursor))
    else: print(json.dumps(query(a.db,a.question,a.mode)))

if __name__ == '__main__': main()
