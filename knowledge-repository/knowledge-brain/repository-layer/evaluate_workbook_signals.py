"""Local-only workbook topic smoke check; never export cells or requirements.

This does not establish the approved SEABaaS baseline or assess architecture.
Only aggregate topic counts, a file digest and public pilot locators are emitted.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET
import zipfile
import repository_layer as r

p = argparse.ArgumentParser()
p.add_argument('--workbook', required=True)
p.add_argument('--db', required=True)
p.add_argument('--output', required=True)
a = p.parse_args()
book = Path(a.workbook)
topics = [('API design', r'\bAPI\b', 'api design', 'docs/best-practices/api-design.md'),
          ('Caching', r'\bcach(?:e|ing)\b', 'caching', 'docs/best-practices/caching.md'),
          ('Transient faults', r'\b(?:retry|retries|transient)\b', 'transient faults', 'docs/best-practices/transient-faults.md'),
          ('Autoscaling', r'\b(?:scalability|scaling|autoscaling)\b', 'auto scaling', 'docs/best-practices/auto-scaling.md')]
counts = [0] * len(topics)
cells = sheets = 0
with zipfile.ZipFile(book) as z:
    if sum(i.file_size for i in z.infolist()) > 100_000_000:
        raise ValueError('Workbook exceeds bounded parser limit')
    ns = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'
    shared = []
    if 'xl/sharedStrings.xml' in z.namelist():
        for item in ET.fromstring(z.read('xl/sharedStrings.xml')).findall(ns+'si'):
            shared.append(''.join(t.text or '' for t in item.iter(ns+'t')))
    for name in z.namelist():
        if not re.fullmatch(r'xl/worksheets/sheet\d+\.xml', name): continue
        sheets += 1
        for cell in ET.fromstring(z.read(name)).iter(ns+'c'):
            value = cell.find(ns+'v')
            text = ''
            if cell.get('t') == 's' and value is not None:
                text = shared[int(value.text)]
            elif cell.get('t') == 'str' and value is not None:
                text = value.text or ''
            elif cell.get('t') == 'inlineStr':
                text = ''.join(t.text or '' for t in cell.iter(ns+'t'))
            if not text: continue
            cells += 1
            for i, (_, regex, _, _) in enumerate(topics):
                counts[i] += bool(re.search(regex, text, re.I))
results = []
for (label, _, query, expected), count in zip(topics, counts):
    hits = r.query(a.db, query) if count else []
    results.append({'topic': label, 'matchingCells': count, 'expectedPublicSource': expected,
        'actualPublicPaths': [x['path'] for x in hits],
        'locatorCheck': 'passed' if count and any(x['path']==expected for x in hits) else 'not-exercised-no-topic-signal'})
r.dump(a.output, {'kind': 'private-workbook-topic-smoke-check', 'workbookSha256': r.file_hash(book),
    'baselineStatus': 'file selected by descriptive title; authoritative version not confirmed', 'sheets': sheets, 'textCellsScanned': cells,
    'results': results, 'originalContentExported': False, 'architectureCaseVerified': False, 'humanReview': 'not performed',
    'limitations': 'Cell keyword presence is not a requirement interpretation, condition verification or architecture evaluation.'})
print(json.dumps({'sheets': sheets, 'topicSignals': counts, 'locatorChecksPassed': sum(x['locatorCheck']=='passed' for x in results), 'architectureCaseVerified': False}))
