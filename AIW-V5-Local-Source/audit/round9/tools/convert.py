# Round 9 · every colour literal in the stylesheets becomes a token reference (audit/round9/DESIGN.md §2 B).
# Usage: python3 convert.py <public dir> <report.json> [--write]
import re, sys, json, glob, colorsys, math, collections
sys.dont_write_bytecode = True  # no cache beside the tools
sys.path.insert(0, __file__.rsplit('/', 1)[0]); from scales import SCALES, EXTRA
PUB, REPORT, WRITE = sys.argv[1], sys.argv[2], '--write' in sys.argv
SKIP = {'theme.css'}
HEX = re.compile(r'#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b')
def norm(h):
    h = h.lower()
    if len(h) in (3, 4): h = ''.join(c * 2 for c in h)
    return h[:6], (int(h[6:8], 16) / 255 if len(h) == 8 else 1.0)
def srgb(h): h = h.lstrip('#'); return [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
def lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def oklab(h):
    r, g, b = (lin(c) for c in srgb(h))
    l = 0.4122214708*r + 0.5363325363*g + 0.0514459929*b; m = 0.2119034982*r + 0.6806995451*g + 0.1073969566*b; s = 0.0883024619*r + 0.2817188376*g + 0.6299787005*b
    l, m, s = (x ** (1/3) for x in (l, m, s))
    return (0.2104542553*l + 0.7936177850*m - 0.0040720468*s, 1.9779984951*l - 2.4285922050*m + 0.4505937099*s, 0.0259040371*l + 0.7827717662*m - 0.8086757660*s)
def dist(a, b): A, B = oklab(a), oklab(b); return math.dist(A, B)
def hls(h): r, g, b = srgb(h); H, L, S = colorsys.rgb_to_hls(r, g, b); return H * 360, L, S
def lightness(h): return oklab(h)[0]
def family(h):
    H, L, S = hls(h)
    if S < 0.16 or L >= 0.965 or (L > 0.93 and S < 0.45) or (L < 0.2 and S < 0.3): return 'sage'
    if 70 <= H < 170: return 'green'
    if 170 <= H < 200: return 'teal'
    if 200 <= H < 245: return 'blue'
    if 245 <= H < 330: return 'violet'  # Sol's indigo (#5b4d8f, 253°) is violet: the AI-origin mark
    if H >= 330 or H < 18: return 'red'
    return 'gold'
TEXT = {'color', 'caret-color', '-webkit-text-fill-color', 'text-decoration-color', 'text-emphasis-color'}
BG = {'background', 'background-color', 'background-image'}
LINE_PREFIX = ('border', 'outline', 'column-rule', 'stroke', 'text-decoration', 'scrollbar-color', 'accent-color')
SHADOW = {'box-shadow', 'text-shadow', 'filter', 'shadow-blur'}
TEXTY = re.compile(r'(text|label|title|kicker|sub\b|-sub|cap\b|-cap|name|elabel|gtitle|qual|card\b|-t\b|-k\b|num|tag|legend)', re.I)
def nearest(h, fam, steps):
    s = SCALES[fam]['light']; return min(steps, key=lambda i: dist(h, s[i - 1]))
# Dark islands: a few components were drawn on a near-black ground in the light interface (the review desk's monitor
# strip, the tooltips, the dialog and Brain headers). Their ground is the neutral solid, which stays dark in both
# themes, and their text and strokes are light: white, or a light tint of their state's colour.
ISLAND = re.compile(r'\.dk-(monitor|tile|ecg|was-t)\b|\.brain-header\b|\.dc-dialog>header|\.intake-dialog>header|\.(r-)?cursor-tip\b|\.um-card\.root\b|#toast\b')
def island(selector):
    parts = [x for x in (selector or '').split(',') if x.strip()]
    return bool(parts) and all(ISLAND.search(x) for x in parts)
def island_token(h, p):
    fam, L = family(h), lightness(h)
    kind = 'text' if p in TEXT or p == 'fill' else 'bg' if p in BG else 'line' if p.startswith(LINE_PREFIX) or p in ('border-color', 'shadow-blur') else None
    if kind == 'bg' and L < 0.36:
        return 'sage-solid' if L < 0.23 else 'sage-solid-2' if L < 0.28 else f'{fam if fam != "sage" else "green"}-10'
    if kind == 'text':
        if L > 0.95: return 'on-solid'
        if (L > 0.85 and hls(h)[2] < 0.5) or fam == 'sage': return 'on-solid-muted'  # a strongly tinted reading keeps its hue
        return ('mix', f'color-mix(in srgb, var(--{fam}-9) 30%, var(--on-solid))')
    if kind == 'line':
        if L < 0.45: return ('mix', 'color-mix(in srgb, var(--on-solid-muted) 18%, transparent)')  # a dim line on the ground
        if fam == 'sage': return ('mix', 'color-mix(in srgb, var(--on-solid-muted) 35%, transparent)')
        return ('mix', f'color-mix(in srgb, var(--{fam}-9) 75%, var(--on-solid))')
    return None
def role_token(h, prop, selector):
    """The token for colour h used by property prop under selector."""
    fam, L = family(h), lightness(h)
    p = prop.lower()
    if island(selector):
        t = island_token(h, p)
        if t: return t
    if p in SHADOW:  # a blurred shadow layer: dark tints follow --shadow, a coloured glow keeps its hue
        if L < 0.45: return 'shadow'
        if fam != 'sage' and hls(h)[2] >= 0.35: return f'{fam}-{nearest(h, fam, range(6, 10))}'
        return 'shadow' if L < 0.6 else f'sage-{nearest(h, "sage", range(1, 7))}'
    if p == 'shadow-scrim':  # a spread-only layer wide enough to read as a surface (a scrim, a halo)
        return 'shadow' if L < 0.6 else f'sage-{nearest(h, "sage", range(1, 7))}'
    kind = 'text' if p in TEXT else 'bg' if p in BG else 'line' if p.startswith(LINE_PREFIX) else 'fill' if p == 'fill' else 'custom' if p.startswith('--') else 'other'
    if kind == 'fill': kind = 'text' if TEXTY.search(selector or '') and L < 0.55 else 'bg'
    if kind == 'text':
        if L > 0.93: return 'on-solid'
        if L > 0.8: return 'on-solid-muted'
        return f'{fam}-{nearest(h, fam, range(10, 13) if fam == "sage" else range(11, 13))}'
    if kind == 'bg':
        if L < 0.42: return ('sage-solid' if L < 0.36 else 'sage-solid-2') if fam == 'sage' else f'{fam}-{nearest(h, fam, (9, 10))}'
        return f'{fam}-{nearest(h, fam, range(1, 10))}'
    if kind == 'line':
        if L < 0.42: return f'{fam}-{nearest(h, fam, range(10, 13))}' if fam == 'sage' else f'{fam}-{nearest(h, fam, (9, 10, 11))}'
        return f'{fam}-{nearest(h, fam, range(2, 10))}'
    return f'{fam}-{nearest(h, fam, range(1, 13))}'
def ref(token, alpha):
    if isinstance(token, tuple): return token[1] if alpha >= 0.999 else f'color-mix(in srgb, {token[1]} {round(alpha * 100)}%, transparent)'
    v = f'var(--{token})'
    return v if alpha >= 0.999 else f'color-mix(in srgb, {v} {round(alpha * 100)}%, transparent)'
# ---- pass 1: single-colour custom properties defined once across all sheets (inlined at use sites by role)
files = [f for f in sorted(glob.glob(PUB + '/*.css')) if f.rsplit('/', 1)[1] not in SKIP]
defs = collections.defaultdict(set)
for f in files:
    for m in re.finditer(r'(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*(?=[;}])', open(f, encoding='utf-8').read()): defs[m.group(1)].add(norm(m.group(2)[1:]))
inline = {k: next(iter(v)) for k, v in defs.items() if len(v) == 1}
report = {'files': {}, 'tokens': collections.Counter(), 'inlined_vars': sorted(inline), 'changes': 0}
URL = re.compile(r'url\([^)]*\)')
DECL = re.compile(r'(^|[;{\s])(--[a-z0-9-]+|-?[a-z][a-z-]*)\s*:\s*([^;{}]*)')
COLOUR_PROPS = TEXT | BG | SHADOW | {'fill'}
RGB = re.compile(r'rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)')
def rgb_hex(m):
    a = m.group(4); a = 1.0 if a is None else float(a[:-1]) / 100 if a.endswith('%') else float(a)
    return '#' + ''.join(f'{int(m.group(i)):02x}' for i in (1, 2, 3)) + ('' if a >= 0.999 else f'{round(a * 255):02x}')
def split_top(value):
    out, depth, cur = [], 0, ''
    for c in value:
        depth += c == '('; depth -= c == ')'
        if c == ',' and depth == 0: out.append(cur); cur = ''
        else: cur += c
    return out + [cur]
COLOUR_TOKEN = re.compile(r'var\([^)]*\)|color-mix\((?:[^()]|\([^()]*\))*\)|#[0-9a-fA-F]{3,8}\b')
def layer_prop(layer):
    """How a shadow layer reads: blur 0 is a drawn line (an inset bar, a ring), a wide spread is a surface."""
    rest = COLOUR_TOKEN.sub(' ', layer).replace('inset', ' ').replace('!important', ' ').split()
    def px(t):
        try: return float(re.sub(r'(px|rem|em)$', '', t)) * (16 if t.endswith('rem') else 1)
        except ValueError: return 999 if t.endswith(('vmax', 'vmin', 'vw', 'vh')) else 0
    n = [px(t) for t in rest]
    blur, spread = (n[2] if len(n) > 2 else 0), (n[3] if len(n) > 3 else 0)
    if blur > 0: return 'shadow-blur'
    return 'shadow-scrim' if spread >= 16 else 'border-color'
def convert_value(prop, value, selector, stats):
    if prop.lower() in ('box-shadow', 'text-shadow'):
        return ','.join(convert_value(layer_prop(l), l, selector, stats) for l in split_top(value))
    if prop.lower() == 'filter' and 'drop-shadow' in value:
        return re.sub(r'drop-shadow\(([^()]*)\)', lambda m: 'drop-shadow(' + convert_value('shadow-blur' if layer_prop(m.group(1)) == 'shadow-blur' else 'border-color', m.group(1), selector, stats) + ')', value)
    if prop.lower() in COLOUR_PROPS or prop.lower().startswith(LINE_PREFIX) or prop.lower() in ('shadow-scrim',):
        value = RGB.sub(rgb_hex, value)
        value = re.sub(r'(?<![\w-])white(?![\w-])', '#ffffff', value); value = re.sub(r'(?<![\w-])black(?![\w-])', '#000000', value)
    masks = []
    def mask(m): masks.append(m.group(0)); return f'\u0000{len(masks) - 1}\u0000'
    v = URL.sub(mask, value)
    def var_sub(m):
        name, fallback = m.group(1), m.group(2)
        if name in inline and not prop.startswith('--'):
            h, a = inline[name]; t = role_token(h, prop, selector); stats[t if isinstance(t, str) else 'island-mix'] += 1; return ref(t, a)
        return m.group(0)
    v = re.sub(r'var\((--[a-z0-9-]+)(\s*,\s*#[0-9a-fA-F]{3,8})?\)', var_sub, v)
    def hex_sub(m):
        h, a = norm(m.group(1)); t = role_token(h, prop, selector); stats[t if isinstance(t, str) else 'island-mix'] += 1; return ref(t, a)
    v = HEX.sub(hex_sub, v)
    v = re.sub(r'\u0000(\d+)\u0000', lambda m: masks[int(m.group(1))], v)
    return v
BLOCK = re.compile(r'([^{}]*)\{([^{}]*)\}')
for f in files:
    src = open(f, encoding='utf-8').read(); stats = collections.Counter()
    # comments are kept verbatim: masked so no colour inside a comment changes
    comments = []
    def cmask(m): comments.append(m.group(0)); return f'\u0001{len(comments) - 1}\u0001'
    work = re.sub(r'/\*.*?\*/', cmask, src, flags=re.S)
    def block(m):
        sel, body = m.group(1), m.group(2)
        def decl(d):
            prop, value = d.group(2), d.group(3)
            nv = convert_value(prop, value, sel, stats)
            return d.group(1) + prop + ':' + nv if nv != value else d.group(0)
        return sel + '{' + DECL.sub(decl, body) + '}'
    out = BLOCK.sub(block, work)
    out = re.sub(r'\u0001(\d+)\u0001', lambda m: comments[int(m.group(1))], out)
    left = len(HEX.findall(re.sub(r'/\*.*?\*/', '', out, flags=re.S)))
    report['files'][f.rsplit('/', 1)[1]] = {'replaced': sum(stats.values()), 'left': left}
    report['tokens'].update(stats); report['changes'] += sum(stats.values())
    if WRITE and out != src: open(f, 'w', encoding='utf-8').write(out)
json.dump(report, open(REPORT, 'w'), indent=1)
print('replaced', report['changes'], 'tokens used', len(report['tokens']), 'inlined vars', len(inline))
print('left (hex outside comments):', {k: v['left'] for k, v in report['files'].items() if v['left']})
