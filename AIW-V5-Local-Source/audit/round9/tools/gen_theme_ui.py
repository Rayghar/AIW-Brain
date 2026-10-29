import sys
DARK = '''.cm svg .nt-hd{fill:var(--sage-3);stroke:var(--sage-6)}
.cm svg .nt-ht{fill:var(--sage-12)}
.cm svg .nt-group rect{fill:var(--sage-3);stroke:var(--sage-7)}
.cm svg .nt-g-boundary rect{fill:var(--violet-2);stroke:var(--violet-8)}
.cm svg .nt-g-zone rect,.cm svg .nt-g-environment rect{fill:var(--gold-2);stroke:var(--gold-8)}
.cm svg .nt-g-lane rect{fill:var(--sage-2);stroke:var(--sage-8)}
.cm svg .nt-g-pool rect,.cm svg .nt-g-system rect{fill:var(--sage-3);stroke:var(--sage-9)}
.cm svg .nt-g-unplaced rect{fill:var(--gold-2);stroke:var(--gold-9)}
.cm svg .nt-g-family rect,.cm svg .nt-g-module rect{fill:var(--green-2);stroke:var(--green-7)}
.cm svg .nt-g-node rect{fill:var(--sage-4);stroke:var(--sage-8)}
.cm svg .nt-band rect{fill:var(--sage-3);stroke:var(--sage-5)}
.cm svg .nt-lane:nth-of-type(even) rect{fill:var(--sage-2)}
.cm svg .nt-band-collapsed rect{fill:var(--sage-3);stroke:var(--sage-6)}
.cm svg .nt-band text,.cm svg .nt-band-collapsed text{fill:var(--sage-11)}
.cm svg .nt-gtitle{fill:var(--sage-12)}
.cm svg .nt-gsub{fill:var(--sage-11)}
.cm svg .nt-elabel,.cm svg .nt-qual{fill:var(--sage-12);stroke:var(--sage-1)}
.cm svg .nt-keybox,.cm svg .nt-cross,.cm svg .nt-callout circle{fill:var(--sage-1)}
.cm svg .nt-keybox{stroke:var(--sage-6)}
.cm svg .nt-lifeline line{stroke:var(--sage-9)}
.cm svg .nt-edge [stroke="#3c4a44"],.cm svg marker [stroke="#3c4a44"],.cm svg .nt-edge [stroke="#778478"],.cm svg marker [stroke="#778478"]{stroke:var(--sage-10)}
.cm svg marker [fill="#3c4a44"],.cm svg marker [fill="#778478"]{fill:var(--sage-10)}
.cm svg marker [fill="#fff"],.cm svg marker [fill="#ffffff"]{fill:var(--sage-1)}
.cm svg .nt-edge [stroke="#2f6b4f"],.cm svg marker [stroke="#2f6b4f"],.cm svg .nt-edge [stroke="#587448"],.cm svg marker [stroke="#587448"]{stroke:var(--green-11)}
.cm svg marker [fill="#2f6b4f"],.cm svg marker [fill="#587448"]{fill:var(--green-11)}
.cm svg .nt-edge [stroke="#6f5a93"],.cm svg marker [stroke="#6f5a93"],.cm svg .nt-edge [stroke="#805d83"],.cm svg marker [stroke="#805d83"],.cm svg .nt-edge [stroke="#8a7f90"],.cm svg marker [stroke="#8a7f90"]{stroke:var(--violet-11)}
.cm svg marker [fill="#6f5a93"],.cm svg marker [fill="#805d83"],.cm svg marker [fill="#8a7f90"]{fill:var(--violet-11)}
.cm svg .nt-edge [stroke="#b0493a"],.cm svg marker [stroke="#b0493a"]{stroke:var(--red-11)}
.cm svg marker [fill="#b0493a"]{fill:var(--red-11)}'''
def scoped(prefix):
    return '\n'.join(','.join(prefix + ' ' + s.strip() for s in rule.split('{')[0].split(',')) + '{' + rule.split('{', 1)[1] for rule in DARK.split('\n'))
css = f'''/* The theme's own interface (round 9, audit/round9/DESIGN.md §2 D and E): the theme setting in the top bars, and
   the model's pictures in the dark theme. The pictures are drawn with their own embedded styles, which is also what
   an export carries; in the dark theme the page re-colours the canvas furniture (the header, group frames, bands,
   edge labels and their halos, the key) and the edges, matched by the edge colour the notation draws with, to the
   scale step of the same role. Notation fills, the node boxes and the text inside them keep their colours, so a
   picture means the same thing in both themes and an exported figure is unchanged. The light theme draws the
   pictures exactly as they are exported. */
.theme-switch{{display:inline-flex;align-items:center;gap:0;flex:none;border:1px solid var(--sage-6);border-radius:6px;background:var(--sage-1);padding:1px}}
.theme-switch button{{min-height:26px;padding:0 9px;border:0;border-radius:5px;background:transparent;color:var(--sage-11);font:inherit;font-size:12px;line-height:1;cursor:pointer}}
.theme-switch button:hover{{background:var(--sage-4);color:var(--sage-12)}}
.theme-switch button[aria-pressed="true"]{{background:var(--green-10);color:var(--on-solid)}}
.theme-switch button:focus-visible{{outline:2px solid var(--green-7);outline-offset:1px}}
.theme-switch svg{{display:none;width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}}
.theme-switch svg .fill{{fill:currentColor;stroke:none}}
.top-actions{{display:flex;align-items:center;gap:16px}}
.p-top .theme-switch{{margin-left:auto}}
.p-top .theme-switch+small{{margin-left:0}}
@media (max-width:700px){{.theme-switch button{{padding:0 6px;display:inline-grid;place-items:center}}.theme-switch svg{{display:block}}
.theme-switch .ts-label{{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}}
.top-actions .theme-switch{{order:-1}}
.logical-studio .top-actions{{grid-template-columns:auto auto;column-gap:8px;align-items:center}}.logical-studio .top-actions .theme-switch{{grid-row:1/span 2}}
body.explorer-workspace .topbar{{padding-left:16px;padding-right:16px}}.p-top{{gap:14px}}}}
@media print{{.theme-switch{{display:none}}}}
{scoped(':root[data-theme="dark"]')}
@media (prefers-color-scheme:dark){{
{scoped(':root[data-theme="system"]')}
}}
'''
open(sys.argv[1], 'w').write(css); print(len(css), 'bytes')
