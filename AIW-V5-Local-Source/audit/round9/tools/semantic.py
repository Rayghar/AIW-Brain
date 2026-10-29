# Round 9 · one state and provenance language (audit/round9/DESIGN.md §2 F). After convert.py has made every colour a
# scale token, a rule whose selector carries a state reads the state's semantic token instead of the scale step:
# to fix (red), to confirm (amber), proposed (blue), draft (grey), passing (green), the provenance marks of the journey
# draft, and Sol's violet for what came from the language model. Usage: python3 semantic.py <public dir> <report> [--write]
import re, sys, glob, json, collections
PUB, REPORT, WRITE = sys.argv[1], sys.argv[2], '--write' in sys.argv
SKIP = {'theme.css', 'theme-ui.css'}
# class → state, and the scale families a state takes over in that rule
STATE_CLASS = [
    ('proposed', re.compile(r'\.(proposed|suggested)\b'), {'gold', 'blue'}),
    ('fix', re.compile(r'\.(fix|error|danger|reconsider|bad)\b'), {'red', 'gold'}),
    ('confirm', re.compile(r'\.(confirm|warn|gap|missing|hole|judge)\b'), {'gold'}),
    ('pass', re.compile(r'\.(pass|ok|done|accepted|resolved)\b'), {'green'}),
    ('draft', re.compile(r'\.(draft|candidate|insufficient|withheld)\b'), {'sage'}),
]
SOL = re.compile(r'\.(?:[a-z0-9]+-)*sol[a-z]*(?:-[a-z0-9]+)*\b')
SOL_GOLD = re.compile(r'\.(spark-sol|spark-band-sol|brain-band-sol)\b')  # Sol's draft band was gold before round 9
PROV = re.compile(r'\.jd-')  # the journey draft's provenance tags
TEXT = {'color', 'caret-color', '-webkit-text-fill-color', 'text-decoration-color'}
BG = {'background', 'background-color', 'fill'}
LINE = ('border', 'outline', 'stroke', 'box-shadow', 'column-rule', 'text-decoration')
BAR = re.compile(r'^(border-(left|right|top|bottom)|box-shadow)')
def role(prop, n):
    p = prop.lower()
    if p in TEXT: return 'fg'
    if p in BG: return 'wash' if n <= 2 else 'bg' if n <= 5 else 'line' if n <= 7 else 'solid'
    if p.startswith(LINE):
        if n <= 3: return 'wash'  # a light inner ring is a spacer, not a line
        if n <= 6: return 'line'
        return 'solid' if BAR.match(p) or n >= 8 else 'line'  # a bar reads solid in every state
    return None
def sem_token(state, r):
    if state == 'sol': return {'fg': 'prov-sol', 'wash': 'prov-sol-wash', 'bg': 'prov-sol-bg', 'line': 'prov-sol-line', 'solid': 'prov-sol-solid'}[r]
    if state in ('stated', 'inferred', 'open'):
        if r == 'fg': return f'prov-{state}'
        if r in ('line', 'solid'): return f'prov-{state}-line'
        return None  # a provenance tag keeps its own ground
    return f'state-{state}-{r}'
def split_top(s):
    out, depth, cur = [], 0, ''
    for c in s:
        depth += c in '(['; depth -= c in ')]'
        if c == ',' and depth == 0: out.append(cur); cur = ''
        else: cur += c
    return out + [cur]
def states_of(part):
    """The states a selector part carries, each with the scale families it takes over."""
    found = {}
    for name, rx, fams in STATE_CLASS:
        if rx.search(part): found[name] = set(fams)
    if PROV.search(part):  # in the journey draft: stated, inferred and open question are provenance
        if re.search(r'\.stated\b', part): found['stated'] = {'green'}
        if re.search(r'\.inferred\b', part): found['inferred'] = {'blue', 'sage'}
        if 'confirm' in found and re.search(r'\.gap\b', part): found['open'] = found.pop('confirm')
    if SOL.search(part):
        found['sol'] = {'violet', 'gold'} if SOL_GOLD.search(part) else {'violet'}
    # a family claimed by two states goes to the more specific one: proposed, then fix, then the rest
    order = ['sol', 'proposed', 'stated', 'inferred', 'open', 'fix', 'confirm', 'pass', 'draft']
    claimed, out = set(), {}
    for name in order:
        if name in found:
            fams = found[name] - claimed
            if fams: out[name] = frozenset(fams); claimed |= fams
    return out
# Explicit rules: Sol's offer row in the journey draft and the Sol-draft badge of the design companion were drawn in
# the interface's neutral and amber; they carry Sol's violet now.
EXPLICIT = {
    '.jd-sol': {'border': '1px solid var(--prov-sol-line)', 'background': 'var(--prov-sol-wash)'},
    '.dc-sol-draft': {'background': 'var(--prov-sol-bg)', 'color': 'var(--prov-sol)'},
    '.r-badge.draft': {'background': 'var(--state-draft-bg)'},
    # a count chip read its colour from the heading; its text is now its own family's text step, which reads on the
    # chip in both themes (style-tokens E)
    '.journey-context-body h3 small': {'color': 'var(--green-11)'},
    '.dk-solpref': {'border-left': '2px solid var(--prov-sol-line)'},  # "Sol would lean to …": Sol's advice
    '.jd-sol.withheld': {'border-color': 'var(--state-draft-line)', 'background': 'var(--state-draft-wash)'},  # a Sol draft not used, grey as on the desk
}
DECL = re.compile(r'(^|[;{\s])(--[a-z0-9-]+|-?[a-z][a-z-]*)\s*:\s*([^;{}]*)')
TOK = re.compile(r'var\(--(sage|green|gold|red|blue|violet|teal)-(\d{1,2})\)')
BLOCK = re.compile(r'([^{}]*)\{([^{}]*)\}')
report = {'rules': 0, 'tokens': collections.Counter(), 'files': {}}
for f in sorted(glob.glob(PUB + '/*.css')):
    name = f.rsplit('/', 1)[1]
    if name in SKIP: continue
    src = open(f, encoding='utf-8').read(); comments = []
    work = re.sub(r'/\*.*?\*/', lambda m: (comments.append(m.group(0)), f'\u0001{len(comments) - 1}\u0001')[1], src, flags=re.S)
    def block(m):
        sel, body = m.group(1), m.group(2)
        bare = re.sub(r'\u0001\d+\u0001', '', sel).strip()
        if bare.startswith('@') or not bare: return m.group(0)
        parts = [p.strip() for p in split_top(bare)]
        sets = [states_of(p) for p in parts]
        if not sets[0] or any(s != sets[0] for s in sets): return m.group(0)
        st = sets[0]
        def decl(d):
            prop, value = d.group(2), d.group(3)
            if prop.startswith('--'): return d.group(0)
            def tok(t):
                fam, n = t.group(1), int(t.group(2))
                for state, fams in st.items():
                    if fam in fams and not (state == 'draft' and n <= 2):  # sage 1-2 are the surfaces
                        r = role(prop, n)
                        if not r: return t.group(0)
                        name2 = sem_token(state, r)
                        if not name2: return t.group(0)
                        report['tokens'][name2] += 1
                        return f'var(--{name2})'
                return t.group(0)
            nv = TOK.sub(tok, value)
            return d.group(1) + prop + ':' + nv if nv != value else d.group(0)
        nb = DECL.sub(decl, body)
        if nb != body: report['rules'] += 1
        return sel + '{' + nb + '}'
    out = BLOCK.sub(block, work)
    for selector, decls in EXPLICIT.items():
        def ex(m):
            sel, body = m.group(1), m.group(2)
            if re.sub(r'\u0001\d+\u0001', '', sel).strip() != selector: return m.group(0)
            for prop, val in decls.items():
                body, k = re.subn(r'(^|;)' + re.escape(prop) + r':[^;]*', lambda d: d.group(1) + prop + ':' + val, body)
                if not k: body = body.rstrip(';') + ';' + prop + ':' + val  # a property the rule did not set
                report['tokens'][val] += 1
            report['rules'] += 1
            return sel + '{' + body + '}'
        out = BLOCK.sub(ex, out)
    out = re.sub(r'\u0001(\d+)\u0001', lambda m: comments[int(m.group(1))], out)
    report['files'][name] = out != src
    if WRITE and out != src: open(f, 'w', encoding='utf-8').write(out)
json.dump(report, open(REPORT, 'w'), indent=1, default=list)
print('rules', report['rules'], 'tokens', sum(report['tokens'].values()), dict(report['tokens'].most_common(12)))
