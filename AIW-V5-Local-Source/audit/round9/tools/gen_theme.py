import sys; sys.dont_write_bytecode = True; sys.path.insert(0, sys.argv[1]); from scales import SCALES, EXTRA  # no cache beside the tools
def block(theme):
    out = []
    for fam, t in SCALES.items():
        out.append(''.join(f'--{fam}-{i+1}:{v};' for i, v in enumerate(t[theme])))
    out.append(''.join(f'--{k}:{v[0 if theme == "light" else 1]};' for k, v in EXTRA.items()))
    return '\n'.join(out)
# The five states and the provenance marks (DESIGN.md §2 F): each state has a wash, a chip background, a line, a solid
# and a text step; Sol's violet marks what came from the language model.
STATE_STEPS = {'wash': 2, 'bg': 3, 'line': 7, 'solid': 9, 'fg': 11}
STATES = {'fix': 'red', 'confirm': 'gold', 'proposed': 'blue', 'pass': 'green'}
STATE_TOKENS = ''.join(f'--state-{st}-{role}:var(--{fam}-{n});' for st, fam in STATES.items() for role, n in STATE_STEPS.items())
STATE_TOKENS += ''.join(f'--state-draft-{role}:var(--sage-{n});' for role, n in {'wash': 2, 'bg': 4, 'line': 6, 'solid': 8, 'fg': 11}.items())
STATE_TOKENS += ('--prov-stated:var(--green-11);--prov-stated-line:var(--green-7);--prov-inferred:var(--sage-11);--prov-inferred-line:var(--sage-7);'
                 '--prov-open:var(--gold-11);--prov-open-line:var(--gold-7);--prov-sol:var(--violet-11);--prov-sol-wash:var(--violet-2);'
                 '--prov-sol-bg:var(--violet-3);--prov-sol-line:var(--violet-7);--prov-sol-solid:var(--violet-9);')
SEM = '''--ui-bg:var(--sage-2);--ui-surface:var(--sage-1);--ui-subtle:var(--sage-3);--ui-hover:var(--sage-4);--ui-line:var(--sage-5);--ui-border:var(--sage-6);--ui-ink:var(--sage-12);--ui-muted:var(--sage-11);--ui-faint:var(--sage-10);--ui-accent:var(--green-10);--ui-accent-text:var(--green-11);--ui-accent-soft:var(--green-3);
''' + STATE_TOKENS + '''
--font-ui:"IBM Plex Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;--font-mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;--font-doc:Georgia,"Times New Roman",serif;'''
fonts = ''.join(f'@font-face{{font-family:"IBM Plex {fam.title()}";font-style:normal;font-weight:{w};font-display:swap;src:url("/fonts/ibm-plex-{fam}-latin-{w}-normal.woff2") format("woff2")}}\n' for fam, ws in (('sans', (400, 500, 600)), ('mono', (400, 500))) for w in ws)
css = f'''/* AIW tokens (round 9, audit/round9/DESIGN.md §2 A). The one source of colour and type for the app: seven
   twelve-step scales, each step one role in both themes (1 card surface, 2 app background, 3 subtle background,
   4 hover, 5 pressed and soft divider, 6 border, 7 strong border, 8 quiet solid, 9 solid (white text on it reaches
   4.5:1 in both themes), 10 solid under white text,
   11 coloured or secondary text, 12 primary text), the constants, and the semantic names the product speaks in:
   the five states, the provenance marks and Sol's violet for AI-originated content. Light is the default; the dark
   values apply when the viewer chooses Dark, or chooses System on a dark operating system (theme-boot.js sets
   data-theme before the first paint). Print and exported documents stay light. Fonts are served by the app
   (font-src 'self'); IBM Plex is under the SIL Open Font License (fonts/OFL-IBM-Plex-Sans.txt, fonts/OFL-IBM-Plex-Mono.txt).
   Written in round 9 by audit/round9/tools/gen_theme.py from its scales.py, which reproduce this round's version. */
{fonts}:root{{color-scheme:light;
{block("light")}
{SEM}}}
:root[data-theme="dark"]{{color-scheme:dark;
{block("dark")}}}
@media (prefers-color-scheme:dark){{:root[data-theme="system"]{{color-scheme:dark;
{block("dark")}}}}}
@media print{{:root[data-theme]{{color-scheme:light;
{block("light")}}}}}
'''
open(sys.argv[2], 'w').write(css); print(len(css), 'bytes')
