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
    ('When should caching be considered, and which applicability constraints need review?', 'caching', 'docs/best-practices/caching.md'),
    ('Which interface-design principles and consumer constraints should an API design review examine?', 'api design', 'docs/best-practices/api-design.md'),
    ('What retry and failure-handling conditions need review before selecting a resilience tactic?', 'transient faults', 'docs/best-practices/transient-faults.md'),
    ('How should an architect assess the demo accounting component without generalizing its implementation?', 'accounting', 'src/accounting/README.md'),
    ('What evidence should an architect inspect when assessing Kafka in the demo event flow?', 'kafka', 'src/kafka/README.md'),
    ('Which workload and operational assumptions need review before choosing autoscaling?', 'auto scaling', 'docs/best-practices/auto-scaling.md')]
reasons = {
    'caching': 'Caching is the selected source topic; reviewers must establish consistency, invalidation and operational conditions from its original context.',
    'api design': 'API design is the selected source topic; interface guidance must be evaluated against consumer requirements.',
    'transient faults': 'Transient-fault guidance is the selected topic; retry applicability and failure conditions require explicit interpretation.',
    'accounting': 'The demo component README is implementation-specific evidence, not independently approved reusable architecture advice.',
    'kafka': 'The demo Kafka README is the expected component evidence; it does not establish suitability for a different project.',
    'auto scaling': 'Autoscaling guidance is the expected topic; workload assumptions and limitations must be reviewed before proposing a tactic.'}
results = []
for question, query, expected in questions:
    hits = r.query(out / 'pilot.sqlite', query)
    results.append({'question': question, 'query': query, 'expectedPath': expected,
        'expectedReason': reasons[query],
        'actual': [{k: x[k] for k in ('revisionId', 'repository', 'commit', 'path', 'matchReason')} for x in hits],
        'passed': expected in [x['path'] for x in hits],
        'approvedHits': len(r.query(out / 'pilot.sqlite', query, mode='approved'))})
r.dump(out / 'evaluation.json', {'label': 'Actual local pilot; lexical source-location evaluation only',
    'provenance': checks, 'questions': results, 'passed': sum(x['passed'] for x in results),
    'failed': sum(not x['passed'] for x in results), 'humanArchitectureReview': 'not performed',
    'SEABaaS': 'Workbook topic signals checked separately; authoritative baseline and architect-reviewed application case unverified', 'claimPrecision': 'unmeasured',
    'contextualRelevance': 'unmeasured', 'omissions': 'unmeasured', 'productionAccepted': False})
with (out / 'pilot-manifest.jsonl').open('w', encoding='utf-8') as f:
    for s in packet['sources']:
        f.write(json.dumps(s) + '\n')
print(json.dumps({'files': len(checks), 'passages': sum(len(s['passages']) for s in packet['sources']),
    'candidateClaims': len(packet['claims']), 'provenancePassed': all(x['fileHashPassed'] and x['passagesPassed'] for x in checks),
    'questionsPassed': sum(x['passed'] for x in results), 'questionsTotal': len(results)}))
