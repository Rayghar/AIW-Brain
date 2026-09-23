"""Measure actual provenance and locator relevance, not architectural correctness."""
import argparse
import json
from pathlib import Path
import repository_layer as r

p = argparse.ArgumentParser()
p.add_argument('--root', required=True)
p.add_argument('--output', required=True)
a = p.parse_args()
out = Path(a.output)
packet = r.packet(out / 'pilot.sqlite', 'local-architect', 'second-brain-pilot')
checks = []
for item in packet['sources']:
    raw = r.safe(a.root, item['snapshot'] + '/files/' + item['path']).read_bytes()
    lines = raw.decode('utf-8').split('\n')
    checks.append({'revisionId': item['revisionId'], 'path': item['path'],
        'fileHashPassed': r.sha(raw) == item['hash'],
        'passagesPassed': all(r.sha('\n'.join(lines[s['lineStart']-1:s['lineEnd']]).encode()) == s['excerptHash'] for s in item['passages'])})
questions = [
    ('Where should caching trade-offs be reviewed?', 'caching', 'docs/best-practices/caching.md'),
    ('Where is API design evidence?', 'api design', 'docs/best-practices/api-design.md'),
    ('Where is transient failure guidance?', 'transient faults', 'docs/best-practices/transient-faults.md'),
    ('Where is the accounting component documented?', 'accounting', 'src/accounting/README.md'),
    ('Where is Kafka documented in the demo?', 'kafka', 'src/kafka/README.md'),
    ('Where should autoscaling prerequisites be reviewed?', 'auto scaling', 'docs/best-practices/auto-scaling.md')]
results = []
for question, query, expected in questions:
    hits = r.query(out / 'pilot.sqlite', query)
    results.append({'question': question, 'query': query, 'expectedPath': expected,
        'expectedReason': 'Direct topic or component match; applicability and advice require human review.',
        'actual': [{k: x[k] for k in ('revisionId', 'repository', 'commit', 'path', 'matchReason')} for x in hits],
        'passed': expected in [x['path'] for x in hits],
        'approvedHits': len(r.query(out / 'pilot.sqlite', query, mode='approved'))})
r.dump(out / 'evaluation.json', {'label': 'Actual local pilot; lexical source-location evaluation only',
    'provenance': checks, 'questions': results, 'passed': sum(x['passed'] for x in results),
    'failed': sum(not x['passed'] for x in results), 'humanArchitectureReview': 'not performed',
    'SEABaaS': 'untested; workbook and app workflow not verified', 'claimPrecision': 'unmeasured',
    'contextualRelevance': 'unmeasured', 'omissions': 'unmeasured', 'productionAccepted': False})
with (out / 'pilot-manifest.jsonl').open('w', encoding='utf-8') as f:
    for s in packet['sources']:
        f.write(json.dumps(s) + '\n')
print(json.dumps({'files': len(checks), 'passages': sum(len(s['passages']) for s in packet['sources']),
    'candidateClaims': len(packet['claims']), 'provenancePassed': all(x['fileHashPassed'] and x['passagesPassed'] for x in checks),
    'questionsPassed': sum(x['passed'] for x in results), 'questionsTotal': len(results)}))
