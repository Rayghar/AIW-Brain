#!/usr/bin/env python3
"""Structure the user's SA Playbook into typed knowledge for AIW V5.

Reads SA Playbook_v2.xlsx and the Word documents (converted to plain text with pandoc into
./txt), keeps exact text with a locator for every entry, and writes public/playbook-knowledge.js.
The mapping (which cell is which attribute, tactic or pattern, and the x / (x) marks) is written
out below so it can be reviewed against the playbook.
"""
import hashlib, json, re, sys
import openpyxl

OUT = sys.argv[1] if len(sys.argv) > 1 else 'playbook-knowledge.js'
WB_FILE = 'SA Playbook_v2.xlsx'
wb = openpyxl.load_workbook(WB_FILE, data_only=True)
sha = lambda f: hashlib.sha256(open(f, 'rb').read()).hexdigest()

def cell(sheet, ref):
    v = wb[sheet][ref].value
    if v is None: raise SystemExit(f'empty {sheet}!{ref}')
    return str(v).strip()

def bullets(sheet, ref):
    """Split a guidebook cell ('- a <br> - b') into its bullet texts, exactly."""
    parts = [p.strip() for p in re.split(r'<br>', cell(sheet, ref))]
    return [re.sub(r'^-\s*', '', p).strip() for p in parts if re.sub(r'^-\s*', '', p).strip()]

def src(sheet, ref): return f'{sheet}!{ref}'

TXT = {}
def doc(name):
    if name not in TXT: TXT[name] = open(f'txt/{name}.txt').read().split('\n')
    return TXT[name]

def doc_line(name, startswith, after=0):
    """The exact line of a document that starts with a phrase (optionally the Nth line after it)."""
    lines = doc(name)
    for i, l in enumerate(lines):
        if l.strip().lstrip('-').strip().startswith(startswith):
            j = i + after
            while after and not lines[j].strip(): j += 1
            return re.sub(r'^[-\s]+', '', lines[j].strip()), i + 1
    raise SystemExit(f'not found in {name}: {startswith}')

def doc_para(name, heading):
    """The paragraph that follows a heading line in a document (joined lines until a blank)."""
    lines = doc(name)
    for i, l in enumerate(lines):
        if l.strip() == heading:
            out, j = [], i + 1
            while j < len(lines) and not lines[j].strip(): j += 1
            while j < len(lines) and lines[j].strip(): out.append(lines[j].strip()); j += 1
            return ' '.join(out), i + 1
    raise SystemExit(f'heading not found in {name}: {heading}')

# ------------------------------------------------------------------ quality attributes
FAMILIES = [
    {'id': 'reliability', 'name': 'Reliability', 'question': 'Does it keep working, and keep its results correct?'},
    {'id': 'efficiency', 'name': 'Performance and scale', 'question': 'Is it fast enough now, and as it grows?'},
    {'id': 'protection', 'name': 'Security', 'question': 'Is it protected, and can its actions be accounted for?'},
    {'id': 'change', 'name': 'Change', 'question': 'Can it be changed, tested and released safely?'},
    {'id': 'use', 'name': 'Use and fit', 'question': 'Can people use it, and can it work with others?'},
]

GUIDE = {  # QR-Guidebook rows
    'performance': 4, 'scalability': 5, 'usability': 6, 'availability': 7, 'maintainability': 8, 'deployability': 9,
}
DEEP = {  # Quality Requirements deep dives (trade-offs)
    'performance': 'B3', 'scalability': 'B7', 'usability': 'B10', 'availability': 'B13', 'maintainability': 'B16', 'deployability': 'B19',
}

def technologies(row):
    out = []
    for b in bullets('QR-Guidebook', f'H{row}'):
        if ':' not in b: continue
        kind, names = b.split(':', 1)
        out.append({'kind': kind.strip(), 'names': [n.strip() for n in re.split(r',(?![^()]*\))', names.strip().rstrip('.')) if n.strip()]})
    return out

def tradeoffs(attr):
    text = cell('Quality Requirements', DEEP[attr])
    m = re.search(r'Trade-?offs?[^\n]*\n(.*?)(\n(?:Challenges)[^\n]*\n|$)', text, re.S)
    out, cur = [], None
    for line in [l.strip() for l in m.group(1).split('\n') if l.strip()]:
        mm = re.match(r'^([A-Z][A-Za-z]+) vs\.? ([A-Za-z ]+?):\s*(.*)$', line)
        if mm:
            cur = {'with': mm.group(2).strip(), 'text': mm.group(3).strip(), 'advice': ''}
            out.append(cur)
        elif cur is not None:
            if not cur['text']: cur['text'] = line
            else: cur['advice'] = (cur['advice'] + ' ' + line).strip()
    return out, src('Quality Requirements', DEEP[attr])

ATTR = [
    # id, name, family, chapter-2 category, playbook entry
    ('integrity', 'Transaction integrity', 'reliability'),
    ('availability', 'Availability', 'reliability'),
    ('recoverability', 'Recoverability', 'reliability'),
    ('performance', 'Performance', 'efficiency'),
    ('scalability', 'Scalability', 'efficiency'),
    ('security', 'Security', 'protection'),
    ('traceability', 'Traceability', 'protection'),
    ('maintainability', 'Maintainability', 'change'),
    ('testability', 'Testability', 'change'),
    ('deployability', 'Deployability', 'change'),
    ('usability', 'Usability', 'use'),
    ('interoperability', 'Interoperability', 'use'),
]
NOTES = {
    'integrity': 'The playbook has no entry for transaction integrity. The chapter\'s own decisions carry it.',
    'recoverability': 'The playbook measures recovery under Availability: MTTR, RTO and RPO.',
    'security': 'The playbook covers security through its tactics: detect intrusion, limit access and validate input.',
    'traceability': 'The playbook has no entry for traceability.',
    'testability': 'The playbook covers testability through its tactics and the style table.',
    'interoperability': 'The playbook covers interoperability only in the style table.',
}
attributes = []
for aid, name, fam in ATTR:
    a = {'id': aid, 'name': name, 'family': fam, 'guide': None, 'tradeoffs': [], 'note': NOTES.get(aid, '')}
    if aid in GUIDE:
        r = GUIDE[aid]
        a['guide'] = {
            'definition': cell('QR-Guidebook', f'C{r}'), 'importance': cell('QR-Guidebook', f'D{r}'),
            'metrics': bullets('QR-Guidebook', f'E{r}'),
            'targets': [b for b in bullets('QR-Guidebook', f'F{r}') if not b.startswith('Define') and b != 'Examples:'],
            'decisions': bullets('QR-Guidebook', f'G{r}'), 'technologies': technologies(r),
            'testing': bullets('QR-Guidebook', f'I{r}'),
            'risks': [b for b in bullets('QR-Guidebook', f'J{r}') if b != 'Mitigate by:'],
            'src': src('QR-Guidebook', f'B{r}:J{r}'),
        }
        a['tradeoffs'], a['tradeoffSrc'] = tradeoffs(aid)
    if aid == 'recoverability':
        a['metrics'] = [m for m in bullets('QR-Guidebook', 'E7') if re.match(r'(MTTR|RTO|RPO)', m)]
        a['metricsSrc'] = src('QR-Guidebook', 'E7')
    attributes.append(a)

# ------------------------------------------------------------------ tactics
TD = 'Architecture Tactics_'
tactics = []
def tactic(tid, name, attribute, group, concept, where, example='', use='', cues=(), kind='tactic'):
    tactics.append({'id': tid, 'name': name, 'attribute': attribute, 'group': group, 'kind': kind,
                    'concept': concept, 'example': example, 'useCase': use, 'src': where, 'cues': list(cues)})

def sheet_tactic(tid, name, attribute, group, row, cues):
    c = cell('Architectural Tactics', f'B{row + 1}'); e = cell('Architectural Tactics', f'B{row + 2}'); u = cell('Architectural Tactics', f'B{row + 3}')
    strip = lambda s, k: re.sub(r'^' + k + r':\s*', '', s)
    tactic(tid, name, attribute, group, strip(c, 'Concept'), src('Architectural Tactics', f'B{row}:B{row + 3}'), strip(e, 'Example'), strip(u, 'Use Case'), cues)

def doc_detail(heading):
    """The document's longer treatment of a tactic: '-   Heading:' followed by Concept, Example and Use Case."""
    lines = doc(TD)
    for i, l in enumerate(lines):
        if re.match(r'^-\s+' + re.escape(heading) + r':\s*$', l.strip(), re.I):
            got = {}
            for m in lines[i + 1:i + 12]:
                mm = re.match(r'^\s*-\s+(Concept|Example|Use Case):\s*(.*)$', m)
                if mm: got[mm.group(1)] = mm.group(2).strip()
            return got, i + 1
    return {}, None

def doc_tactic(tid, name, attribute, group, heading, cues):
    text, line = doc_para(TD, heading)
    more, at = doc_detail(heading.capitalize() if heading[0].islower() else heading)
    if not more: more, at = doc_detail(heading.title())
    where = f'{TD}.docx › {heading} (line {line}' + (f'; detail line {at})' if at else ')')
    tactic(tid, name, attribute, group, text, where, more.get('Example', ''), more.get('Use Case', ''), cues)

# Availability — detect, recover, prevent (Bass, Clements & Kazman, as the playbook presents them).
sheet_tactic('T-AV-HEARTBEAT', 'Heartbeat', 'availability', 'Detect faults', 88, [r'heartbeat', r'health[ -]?(check|probe|endpoint)', r'liveness', r'readiness prob', r'\bping\b'])
doc_tactic('T-AV-TIMESTAMP', 'Timestamp', 'availability', 'Detect faults', 'Timestamp', [r'timestamp', r'sequence number', r'event time'])
doc_tactic('T-AV-SELFTEST', 'Self-test', 'availability', 'Detect faults', 'Self-test', [r'self-?test', r'synthetic (probe|check|transaction)', r'smoke test'])
sheet_tactic('T-AV-REDUNDANCY', 'Redundancy', 'availability', 'Recover from faults', 92, [r'redundan', r'standby', r'failover', r'active-?(active|passive)', r'second (instance|replica|zone)'])
sheet_tactic('T-AV-ROLLBACK', 'Rollback', 'availability', 'Recover from faults', 96, [r'roll ?back', r'checkpoint', r'snapshot', r'restore point'])
doc_tactic('T-AV-DEGRADATION', 'Degradation', 'availability', 'Recover from faults', 'Degradation', [r'degrad', r'fallback', r'reduced service', r'brownout', r'explicit unavailable'])
doc_tactic('T-AV-SHADOW', 'Shadow', 'availability', 'Recover from faults', 'Shadow', [r'\bshadow', r'dark launch', r'mirror(ed|ing)? traffic'])
doc_tactic('T-AV-REMOVAL', 'Removal from service', 'availability', 'Prevent faults', 'Removal from service', [r'removal from service', r'\bdrain', r'out of service', r'maintenance mode'])
doc_tactic('T-AV-PREDICTIVE', 'Predictive model', 'availability', 'Prevent faults', 'Predictive model', [r'predict', r'anomal', r'forecast'])
for i, (name, cues) in enumerate([
    ('Failover Mechanisms', [r'failover', r'fail over']),
    ('Load Balancing', [r'load[ -]balanc']),
    ('Monitoring and Alerting', [r'monitor', r'alert']),
    ('Regular Backups', [r'backup', r'back up']),
    ('Geographic Distribution', [r'multi-?region', r'second (region|site)', r'geo(graphic)?[ -]']),
    ('Data Replication', [r'replicat']),
]):
    text = next(b for b in bullets('QR-Guidebook', 'G7') if b.startswith(name))
    tactic(f'D-AV-{i + 1}', name, 'availability', 'Design decisions', text.split(':', 1)[1].strip(), src('QR-Guidebook', 'G7'), cues=cues, kind='design-decision')

# Maintainability (modifiability) — localise changes, prevent ripple effects.
MOD = [
    ('T-MD-SPR', 'Single point of reference', 'Localize changes', 'Single Point of Reference', [r'single (point of reference|owner|source of truth)', r'system of record', r'one owner']),
    ('T-MD-ACS', 'Abstract common services', 'Localize changes', 'Abstract Common Services', [r'common service', r'shared service', r'reusable']),
    ('T-MD-SEM', 'Maintain semantic coherence', 'Localize changes', 'Maintain Semantic Coherence', [r'naming convention', r'canonical', r'semantic']),
    ('T-MD-ANT', 'Anticipate expected changes', 'Localize changes', 'Anticipate Expected Changes', [r'configur', r'plug-?in', r'dependency injection', r'\bstrategy\b']),
    ('T-MD-LIM', 'Limit possible options', 'Localize changes', 'Limit Possible Options', [r'limit(ed)? (the )?(options|interfaces)']),
    ('T-MD-INT', 'Maintain interfaces', 'Prevent ripple effects', 'Maintain Interfaces', [r'version(ed|ing)? (api|contract|interface)', r'backward[ -]compat', r'stable (interface|contract)']),
    ('T-MD-HIDE', 'Hide information', 'Prevent ripple effects', 'Hide Information', [r'encapsulat', r'information hiding', r'hide (internal|implementation)']),
    ('T-MD-OPEN', 'Open/closed components', 'Prevent ripple effects', 'Open/Closed Components', [r'open.?closed', r'extension point']),
    ('T-MD-PATH', 'Restrict communication paths', 'Prevent ripple effects', 'Restrict Communication Paths', [r'restrict(ed)? (communication|dependenc)', r'adjacent layer', r'only through']),
]
for tid, name, group, heading, cues in MOD:
    text, line = doc_line(TD, heading + ':')
    ex, _ = doc_line(TD, heading + ':', after=1)
    tactic(tid, name, 'maintainability', group, text.split(':', 1)[1].strip(), f'{TD}.docx › Modifiability Tactics › {heading} (line {line})', re.sub(r'^Example:\s*', '', ex), '', cues)
for i, (name, cues) in enumerate([
    ('Modular Design', [r'modul', r'bounded context', r'separation of concerns']),
    ('Automated Testing', [r'automated test', r'unit test', r'regression test', r'contract test']),
    ('CI/CD', [r'ci/?cd', r'pipeline', r'continuous (delivery|deployment|integration)']),
    ('Refactoring', [r'refactor']),
]):
    text = next(b for b in bullets('QR-Guidebook', 'G8') if b.startswith(name))
    tactic(f'D-MA-{i + 1}', name, 'maintainability', 'Design decisions', text.split(':', 1)[1].strip(), src('QR-Guidebook', 'G8'), cues=cues, kind='design-decision')

# Performance.
sheet_tactic('T-PF-CONC', 'Introduce concurrency', 'performance', 'Manage resources', 105, [r'concurren', r'parallel', r'asynchron', r'competing consumer', r'worker pool'])
sheet_tactic('T-PF-CACHE', 'Caching', 'performance', 'Manage resources', 109, [r'\bcach(e|ing)'])
tactic('T-PF-DEMAND', 'Control resource demand', 'performance', 'Control resource demand', cell('Architectural Tactics', 'B19'), src('Architectural Tactics', 'B19'), cues=[r'rate[ -]limit', r'throttl', r'bounded (queue|concurrency|timeout)', r'back-?pressure', r'load shed', r'bound(ed)? timeouts?'])
tactic('T-PF-SCHED', 'Schedule resources', 'performance', 'Manage resources', cell('Architectural Tactics', 'B21'), src('Architectural Tactics', 'B21'), cues=[r'schedul', r'priorit(y|ised|ized) (queue|work)', r'workload isolation'])
for i, (name, cues) in enumerate([
    ('Data Access', [r'index', r'query', r'read model', r'caching strateg']),
    ('Network Communication', [r'round[ -]trip', r'protocol', r'network latency']),
]):
    text = next(b for b in bullets('QR-Guidebook', 'G4') if b.startswith(name))
    tactic(f'D-PF-{i + 1}', name, 'performance', 'Design decisions', text.split(':', 1)[1].strip(), src('QR-Guidebook', 'G4'), cues=cues, kind='design-decision')

# Scalability — the guidebook's design decisions.
for i, (name, cues) in enumerate([
    ('Horizontal Scaling', [r'horizontal', r'scale[ -]out', r'autoscal', r'add(ing)? (more )?(instances|replicas|servers)']),
    ('Decoupling', [r'decoupl', r'independent(ly)? scal']),
    ('Data Management', [r'shard', r'partition', r'read replica', r'replicat']),
    ('Asynchronous Communication', [r'asynchron', r'\bqueue', r'message', r'event']),
    ('Capacity Planning', [r'capacity plan', r'capacity basis', r'sizing']),
    ('Stateless Design', [r'stateless']),
    ('Automation', [r'autoscal', r'automat']),
]):
    text = next(b for b in bullets('QR-Guidebook', 'G5') if b.startswith(name))
    tactic(f'D-SC-{i + 1}', name, 'scalability', 'Design decisions', text.split(':', 1)[1].strip(), src('QR-Guidebook', 'G5'), cues=cues, kind='design-decision')

# Security.
sheet_tactic('T-SE-DETECT', 'Detect intrusion', 'security', 'Detect attacks', 127, [r'intrusion', r'\bsiem\b', r'threat detect', r'auditable denial', r'alert on'])
sheet_tactic('T-SE-LIMIT', 'Limit access', 'security', 'Resist attacks', 131, [r'authori[sz]', r'access control', r'\brbac\b', r'least privilege', r'authenticat'])
tactic('T-SE-VALIDATE', 'Validate input', 'security', 'Resist attacks', cell('Architectural Tactics', 'B29'), src('Architectural Tactics', 'B29'), cues=[r'validat', r'sanitis', r'sanitiz', r'schema check'])

# Testability.
sheet_tactic('T-TE-CONTROL', 'Control and observe system state', 'testability', 'Control and observe', 140, [r'test harness', r'\bmock', r'\bstub', r'test double', r'replay'])
tactic('T-TE-IFACE', 'Specialized test interfaces', 'testability', 'Control and observe', cell('Architectural Tactics', 'B32'), src('Architectural Tactics', 'B32'), cues=[r'test (interface|endpoint|hook)'])
tactic('T-TE-LIMIT', 'Limit complexity', 'testability', 'Limit complexity', cell('Architectural Tactics', 'B33'), src('Architectural Tactics', 'B33'), cues=[r'limit complexity', r'simplif'])

# Deployability — the guidebook's design decisions.
for i, (name, cues) in enumerate([
    ('CI/CD', [r'ci/?cd', r'pipeline', r'continuous (delivery|deployment)']),
    ('IaC', [r'infrastructure as code', r'\biac\b', r'terraform']),
    ('Containerization', [r'container', r'kubernetes', r'docker']),
    ('Blue-Green Deployments', [r'blue[ -]?green']),
    ('Canary Releases', [r'canary', r'progressive']),
    ('Rollback Mechanisms', [r'roll ?back']),
]):
    text = next(b for b in bullets('QR-Guidebook', 'G9') if b.startswith(name))
    tactic(f'D-DP-{i + 1}', name, 'deployability', 'Design decisions', text.split(':', 1)[1].strip(), src('QR-Guidebook', 'G9'), cues=cues, kind='design-decision')

# Usability — the guidebook's design decisions.
for i, (name, cues) in enumerate([
    ('User-Centered Design', [r'user[ -]cent(er|re)d', r'user research']),
    ('Accessibility', [r'accessib', r'wcag']),
    ('User Feedback', [r'user feedback']),
]):
    text = next(b for b in bullets('QR-Guidebook', 'G6') if b.startswith(name))
    tactic(f'D-US-{i + 1}', name, 'usability', 'Design decisions', text.split(':', 1)[1].strip(), src('QR-Guidebook', 'G6'), cues=cues, kind='design-decision')

# ------------------------------------------------------------------ styles
ST = 'Arch Style + Quality Props'
HR = next(r for r in range(1, 40) if wb[ST].cell(row=r, column=2).value == 'Quality Property')
head = [wb[ST].cell(row=HR, column=c).value for c in range(3, 8)]  # Layered .. Microservices
assert head == ['Layered', 'Microkernel', 'Modular Monolith', 'SOA', 'Microservices'], head
ROW_ATTR = {'Deployability': 'deployability', 'Interoperability': 'interoperability', 'Maintainability': 'maintainability',
            'Modifiability': 'maintainability', 'Performance': 'performance', 'Scalability': 'scalability', 'Testability': 'testability'}
ALSO = {'Parallel Development', 'Portability', 'Reusability'}
styles = [{'id': 'S-' + re.sub(r'[^A-Z]', '', n.upper())[:6], 'name': n, 'effects': {}, 'also': {}, 'rows': {}} for n in head]
styles[0]['id'], styles[1]['id'], styles[2]['id'], styles[3]['id'], styles[4]['id'] = 'S-LAYERED', 'S-MICROKERNEL', 'S-MODMONO', 'S-SOA', 'S-MICROSERVICES'
rank = {'x': 2, '(x)': 1}
for r in range(HR + 1, HR + 12):
    prop = wb[ST].cell(row=r, column=2).value
    if not prop: break
    for k, s in enumerate(styles):
        v = (wb[ST].cell(row=r, column=3 + k).value or '').strip()
        if not v: continue
        s['rows'][prop] = f'{ST}!{openpyxl.utils.get_column_letter(3 + k)}{r}'
        if prop in ROW_ATTR:
            a = ROW_ATTR[prop]
            if rank[v] > rank.get(s['effects'].get(a), 0): s['effects'][a] = v
        elif prop in ALSO: s['also'][prop] = v
STYLE_Q = {'S-LAYERED': 'Layered Architecture', 'S-MICROKERNEL': 'Microkernel Architecture', 'S-MODMONO': 'Modular Monolith Architecture', 'S-SOA': 'Service-Oriented Architecture (SOA)', 'S-MICROSERVICES': 'Microservices Architecture'}
sq = wb['Arch Style Suitability Ass']
rows = [(r, (sq.cell(row=r, column=2).value or '').strip()) for r in range(1, sq.max_row + 1)]
for s in styles:
    start = next(i for i, (r, t) in enumerate(rows) if t == STYLE_Q[s['id']])
    qs = []
    for r, t in rows[start + 1:]:
        if not t: continue
        if not t.endswith('?'): break
        qs.append({'text': t, 'src': f'Arch Style Suitability Ass!B{r}'})
    s['questions'] = qs
    s['src'] = f'{ST}!B{HR}:G{HR + 10}'
GENERAL_Q = []
for r, t in rows:
    if t.endswith('?') and len(GENERAL_Q) < 5 and r < 12: GENERAL_Q.append({'text': t, 'src': f'Arch Style Suitability Ass!B{r}'})
DECIDE_Q = []
di = next(i for i, (r, t) in enumerate(rows) if t == 'Decision-Making Questions')
for r, t in rows[di + 1:]:
    if t.endswith('?'): DECIDE_Q.append({'text': t, 'src': f'Arch Style Suitability Ass!B{r}'})
KR = next(r for r in range(HR, 60) if (wb[ST].cell(row=r, column=2).value or '').startswith('x:'))
CR = next(r for r in range(KR, 60) if (wb[ST].cell(row=r, column=2).value or '').startswith('The level of support'))
KEY = {'x': cell(ST, f'B{KR}').split(':', 1)[1].strip(), '(x)': cell(ST, f'B{KR + 1}').split(':', 1)[1].strip(), 'caveat': cell(ST, f'B{CR}'), 'src': f'{ST}!B{KR}:B{CR}'}

# ------------------------------------------------------------------ patterns
PD = 'Table Analysis_Architectural Patterns and Quality Properties'
PATTERN_EFFECTS = [
    # name, {attribute: mark}, {other property: mark}, catalogue name
    ('Check-pointed System', {'availability': 'x'}, {}, 'Backup and Restore'),
    ('Standby', {'availability': 'x'}, {}, 'Active-Passive'),
    ('Comparator-Checked Fault Tolerant', {'availability': 'x'}, {'Safety': 'x'}, None),
    ('Protected System', {'availability': 'x', 'security': 'x'}, {'Safety': 'x'}, None),
    ('Secure Communication', {'availability': 'x', 'security': 'x'}, {'Safety': 'x'}, 'Data Encryption in Transit'),
    ('Canary Deployment', {'deployability': 'x'}, {'Migration between versions': 'x'}, 'Canary Release'),
    ('Facade', {'maintainability': '(x)', 'performance': '(x)'}, {'Encapsulation of common-case behaviour': 'x', 'Migration between versions': 'x'}, 'Facade'),
    ('Mediator', {'maintainability': 'x', 'scalability': '(x)'}, {}, None),
    ('Adapter', {}, {'Migration between versions': 'x', 'Reusability': 'x'}, 'Adapter'),
    ('Strangler', {}, {'Migration between versions': 'x'}, 'Strangler Fig'),
    ('Observer', {'maintainability': 'x', 'performance': '(x)'}, {'Responsiveness': 'x'}, 'Publish-Subscribe'),
    ('Strategy', {'maintainability': 'x'}, {'Portability': '(x)'}, 'Strategy Pattern'),
    ('Throttling', {'maintainability': 'x', 'performance': '(x)', 'scalability': '(x)'}, {}, 'Throttling'),
    ('Controller-responder', {'performance': '(x)'}, {}, None),
]
patterns = []
for name, eff, also, cat in PATTERN_EFFECTS:
    text, line = doc_line(PD, name + ':')
    ex = ''
    try:
        e, _ = doc_line(PD, name + ':', after=1)
        if e.startswith('Example:'): ex = e.split(':', 1)[1].strip()
    except SystemExit: pass
    patterns.append({'id': 'P-' + re.sub(r'[^A-Z0-9]+', '-', name.upper()).strip('-'), 'name': name, 'effects': eff, 'also': also,
                     'text': text.split(':', 1)[1].strip(), 'example': ex, 'catalogue': cat,
                     'src': f'{PD}.docx (line {line}); Arch PAttern + Quality Prop.!B5:B36'})
PATTERN_KEY = {'x': 'The pattern directly contributes to the quality property due to its inherent characteristics.',
               '(x)': 'The pattern can contribute to the quality property, but the effect depends on specific design and implementation choices.',
               'src': 'Arch PAttern + Quality Prop.!B38:B40'}
# the two interpretation lines are exact
ap = wb['Arch PAttern + Quality Prop.']
for r in range(1, 60):
    v = (ap.cell(row=r, column=2).value or '')
    if v.startswith('Positive Effect (x):'): PATTERN_KEY['x'] = v.split(':', 1)[1].strip(); PATTERN_KEY['src'] = f'Arch PAttern + Quality Prop.!B{r}'
    if v.startswith('Potential Effect ((x)):'): PATTERN_KEY['(x)'] = v.split(':', 1)[1].strip(); PATTERN_KEY['src'] += f',B{r}'

# ------------------------------------------------------------------ anti-patterns (the playbook's own four)
anti = []
for r, aid, cat in [(41, 'AP-TIGHT-COUPLING', 'Distributed Monolith'), (42, 'AP-GOD-SERVICE', 'God Service'), (43, 'AP-DUPLICATED-CODE', 'Copy-Paste Architecture'), (44, 'AP-NO-DOCS', None)]:
    t = cell('anti patterns', f'B{r}')
    name, rest = t.split(':', 1)
    anti.append({'id': aid, 'name': name.strip(), 'text': rest.strip(), 'catalogue': cat, 'src': f'anti patterns!B{r}'})

# ------------------------------------------------------------------ decision template
s45 = wb['Sheet45']
TR_ = [r for r in range(1, 40) if s45.cell(row=r, column=2).value == 'Decision ID']
tmpl = [s45.cell(row=TR_[0], column=c).value for c in range(2, 9)]
DECISION_TEMPLATE = {'fields': [f.strip() for f in tmpl if f], 'src': f'Sheet45!B{TR_[0]}:H{TR_[0]}',
                     'examples': [{'id': cell('Sheet45', f'B{r + 1}'), 'name': cell('Sheet45', f'C{r + 1}'), 'src': f'Sheet45!B{r + 1}:H{r + 1}'} for r in TR_]}

files = [{'file': WB_FILE, 'sha256': sha(WB_FILE)}] + [{'file': f + '.docx', 'sha256': sha(f + '.docx')} for f in [TD, PD]]
PLAYBOOK = {'id': 'AIW-PLAYBOOK-3', 'title': 'SA Playbook', 'files': files,
            'posture': 'The user\'s own methodology, kept as exact text with its locator. The x and (x) marks are the playbook\'s qualitative judgements, not scores; applying them to this design needs the architect\'s judgement.'}

data = {'PLAYBOOK': PLAYBOOK, 'FAMILIES': FAMILIES, 'ATTRIBUTES': attributes, 'TACTICS': tactics, 'STYLES': styles,
        'STYLE_KEY': KEY, 'STYLE_QUESTIONS': {'general': GENERAL_Q, 'decide': DECIDE_Q}, 'PATTERNS': patterns, 'PATTERN_KEY': PATTERN_KEY,
        'ANTI_PATTERNS': anti, 'DECISION_TEMPLATE': DECISION_TEMPLATE}

HELPERS = r'''
const byId = new Map([...ATTRIBUTES, ...TACTICS, ...STYLES, ...PATTERNS, ...ANTI_PATTERNS].map(x => [x.id, x]));
export const knowledge = id => byId.get(id) || null;
export const attribute = id => ATTRIBUTES.find(a => a.id === id) || null;
export const family = id => FAMILIES.find(f => f.id === id) || null;
export const tacticsFor = id => TACTICS.filter(t => t.attribute === id);
export const patternsFor = id => PATTERNS.filter(p => p.effects[id]);
export const stylesFor = id => STYLES.filter(s => s.effects[id]);
export const MARK = {'x': 'strong support', '(x)': 'conditional support'};
// Where a playbook entry comes from, in words a reader can follow back to the file.
export function locator(src) {
  const s = String(src || '');
  return s.includes('.docx') ? s.replace(/\.docx/, '') : s.replace(/^([^!]+)!/, 'SA Playbook › $1 › ');
}
'''

with open(OUT, 'w') as f:
    f.write('// The SA Playbook, structured: quality attributes, tactics, styles, patterns, anti-patterns and the\n')
    f.write('// decision template, each entry exact text with its locator in the supplied workbook or document.\n')
    f.write('// Generated from SA Playbook_v2.xlsx and its Word documents; the marks and groupings are listed in\n')
    f.write('// the generator so they can be checked against the playbook. Descriptive knowledge only.\n')
    for k, v in data.items():
        f.write(f'export const {k} = {json.dumps(v, ensure_ascii=False, separators=(",", ":"))};\n')
    f.write(HELPERS)
print('wrote', OUT, len(attributes), 'attributes', len(tactics), 'tactics', len(styles), 'styles', len(patterns), 'patterns', len(anti), 'anti-patterns')
