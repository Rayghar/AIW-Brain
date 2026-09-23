"""Generate the exact metadata wire schema and an original synthetic example."""
import json
from pathlib import Path
import repository_layer as r

def obj(fields):
    return {'type': 'object', 'additionalProperties': False, 'required': list(fields), 'properties': fields}
def string(maximum=500):
    return {'type': 'string', 'minLength': 1, 'maxLength': maximum}
def array(item, maximum):
    return {'type': 'array', 'items': item, 'maxItems': maximum}
def ident(kind):
    return {'type': 'string', 'pattern': '^' + kind + '-[a-f0-9]{32}$'}
def const(value):
    return {'const': value}
integer = {'type': 'integer', 'minimum': 0, 'maximum': 9007199254740991}
hash_schema = {'type': 'string', 'pattern': '^[a-f0-9]{64}$'}
passage = obj({'lineStart': {'type': 'integer', 'minimum': 1}, 'lineEnd': {'type': 'integer', 'minimum': 1}, 'excerptHash': hash_schema, 'passageId': ident('passage')})
edge = obj({'type': {'enum': list(r.EDGE_RULES)}, 'target': ident('concept'), 'label': string(60), 'status': const('suggestion'), 'inference': const('lexical-cue-only; applicability and semantics unverified')})
source = obj({'repositoryId': string(100), 'repository': {'type': 'string', 'maxLength': 160, 'pattern': '^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$'},
    'commit': {'type': 'string', 'pattern': '^[a-f0-9]{40}$'}, 'path': string(350), 'hash': hash_schema,
    'snapshot': string(350), 'object': string(350), 'manifestHash': hash_schema, 'licenceDisposition': string(200),
    'exportDisposition': const('metadata-only'), 'revisionId': ident('revision'), 'supersedes': {'anyOf': [ident('revision'), {'type': 'null'}]}, 'passages': array(passage, 8)})
claim = obj({'claimId': ident('claim'), 'revisionId': ident('revision'), 'passageId': ident('passage'),
    'statement': const('Candidate interpretation pending human architecture review.'), 'reviewState': const('unreviewed'),
    'releaseState': const('unreleased'), 'eligible': const(False), 'edges': array(edge, 10),
    'contextStatus': const('conditions-limitations-and-polarity-unresolved')})
notice = {'oneOf': [obj({'cursor': integer, 'kind': const('revision'), 'revisionId': ident('revision'), 'supersedes': {'anyOf': [ident('revision'), {'type': 'null'}]}}),
    obj({'cursor': integer, 'kind': const('invalidation'), 'revisionId': ident('revision'),
         'reason': {'enum': ['withdrawn', 'superseded', 'source-unavailable']}, 'dependentClaimsIneligible': const(True)})]}
schema = obj({'schemaVersion': const(r.VERSION), 'storeId': {'type': 'string', 'pattern': '^[a-f0-9-]{36}$'},
    'tenantId': string(180), 'projectId': string(80), 'fromCursor': integer, 'cursor': integer, 'authority': const('candidate'),
    'productionAccepted': const(False), 'sources': array(source, 100), 'claims': array(claim, 250), 'notices': array(notice, 500),
    'release': obj({'status': const('blocked'), 'reason': string(1000)})})
schema.update({'$schema': 'https://json-schema.org/draft/2020-12/schema', '$id': 'urn:aiw:repository-packet:v1'})
base = Path(__file__).parent
r.dump(base / 'contract.schema.json', schema)
text = 'A synthetic service may retry a request when the operation is idempotent. Review its timeout and failure conditions.'
h = r.sha(text.encode())
rid = r.identity('revision', 'example/synthetic', 'a'*40, 'guide.md', h)
pid = r.identity('passage', rid, 1, 1, h)
sample_source = {'repositoryId': 'SYNTHETIC', 'repository': 'example/synthetic', 'commit': 'a'*40, 'path': 'guide.md', 'hash': h,
    'snapshot': 'snapshots/SYNTHETIC/example', 'object': 'objects/sha256/' + h[:2] + '/' + h, 'manifestHash': '0'*64,
    'licenceDisposition': 'original-synthetic-test-only', 'exportDisposition': 'metadata-only', 'revisionId': rid, 'supersedes': None,
    'passages': [{'lineStart': 1, 'lineEnd': 1, 'excerptHash': h, 'passageId': pid}]}
sample_claim = {'claimId': r.identity('claim', pid), 'revisionId': rid, 'passageId': pid, 'statement': 'Candidate interpretation pending human architecture review.',
    'reviewState': 'unreviewed', 'releaseState': 'unreleased', 'eligible': False, 'contextStatus': 'conditions-limitations-and-polarity-unresolved',
    'edges': [{'type': 'prerequisite', 'target': r.identity('concept', 'prerequisite', 'idempotent'), 'label': 'idempotent',
        'status': 'suggestion', 'inference': 'lexical-cue-only; applicability and semantics unverified'}]}
sample = {'schemaVersion': r.VERSION, 'storeId': '00000000-0000-0000-0000-000000000001', 'tenantId': 'synthetic-tenant', 'projectId': 'synthetic-project',
    'fromCursor': 0, 'cursor': 1, 'authority': 'candidate', 'productionAccepted': False, 'sources': [sample_source], 'claims': [sample_claim],
    'notices': [{'cursor': 1, 'kind': 'revision', 'revisionId': rid, 'supersedes': None}],
    'release': {'status': 'blocked', 'reason': 'Synthetic fixture; no human approval or signed release.'}}
r.dump(base / 'architecture-knowledge-sample.json', sample)
(base / 'synthetic-fixture.txt').write_text(text, encoding='utf-8')
