# Round 9 · type (audit/round9/DESIGN.md §2 C): the interface in IBM Plex Sans, record IDs and code in IBM Plex Mono,
# Georgia kept for documents only. Usage: python3 fonts.py <public dir> [--write]
import re, glob, sys
PUB, WRITE = sys.argv[1], '--write' in sys.argv
DOC = re.compile(r'(\.rv-document-cover h3|\.rv-doc-title|\.an-narr|\.p-principle p)\s*$')
SERIF = re.compile(r'Georgia\s*,\s*(?:"Times New Roman"|\'Times New Roman\')?\s*,?\s*serif|Georgia\s*,\s*serif|Georgia')
SANS = re.compile(r'Inter\s*,[^;}]*?sans-serif|Arial\s*,\s*sans-serif|(?:ui-sans-serif|system-ui)\s*,\s*sans-serif|(?<![\w-])system-ui(?![\w-])')
MONO = re.compile(r'ui-monospace\s*,[^;}]*?monospace')
stats = {'serif-ui': 0, 'serif-doc': 0, 'sans': 0, 'mono': 0, 'weight': 0}
for f in sorted(glob.glob(PUB + '/*.css')):
    if f.endswith('/theme.css'): continue
    src = open(f, encoding='utf-8').read(); comments = []
    work = re.sub(r'/\*.*?\*/', lambda m: (comments.append(m.group(0)), f'\u0001{len(comments)-1}\u0001')[1], src, flags=re.S)
    def block(m):
        sel, body = m.group(1), m.group(2)
        if 'Georgia' in body:
            doc = any(DOC.search(s.strip()) for s in sel.split(','))
            fam = 'var(--font-doc)' if doc else 'var(--font-ui)'
            body2 = re.sub(r'(font-family\s*:\s*)([^;}]*)', lambda d: d.group(1) + (fam if 'Georgia' in d.group(2) else d.group(2)), body)
            body2 = re.sub(r'(\bfont\s*:\s*)([^;}]*)', lambda d: d.group(1) + (SERIF.sub(fam, d.group(2)).replace(fam + ', serif', fam) if 'Georgia' in d.group(2) else d.group(2)), body2)
            if not doc:
                n0 = body2
                body2 = re.sub(r'font-weight\s*:\s*(400|normal)\b', 'font-weight:600', body2)
                body2 = re.sub(r'(\bfont\s*:\s*)(400|normal)(\s)', r'\g<1>600\3', body2)
                if body2 != n0: stats['weight'] += 1
            stats['serif-doc' if doc else 'serif-ui'] += 1
            body = body2
        if SANS.search(body): body = re.sub(r'(font-family\s*:\s*)(' + SANS.pattern + ')', r'\1var(--font-ui)', body); body = re.sub(r'(\bfont\s*:[^;}]*?)(' + SANS.pattern + ')', r'\1var(--font-ui)', body); stats['sans'] += 1
        if MONO.search(body): body = re.sub(MONO, 'var(--font-mono)', body); stats['mono'] += 1
        return sel + '{' + body + '}'
    out = re.sub(r'([^{}]*)\{([^{}]*)\}', block, work)
    out = re.sub(r'\u0001(\d+)\u0001', lambda m: comments[int(m.group(1))], out)
    if WRITE and out != src: open(f, 'w', encoding='utf-8').write(out)
print(stats)
