// The round-9 style as source (audit/round9/DESIGN.md §2 A-F): one token source in theme.css, every colour in the
// other stylesheets a token, every token defined, the light and dark themes with the same tokens, text pairs that
// reach 4.5:1 in both themes, IBM Plex served by the app, Georgia for documents only, and one state and provenance
// language with Sol's violet for what came from the language model. No server, no browser.
// Run: npm run test:style-tokens
import assert from 'node:assert/strict';
import {readFileSync, readdirSync, existsSync} from 'node:fs';
const checks = [], pass = n => { checks.push(n); console.log('PASS', n); };
const read = f => readFileSync(new URL('./' + f, import.meta.url), 'utf8');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '');
const sheets = readdirSync(new URL('./public/', import.meta.url)).filter(f => f.endsWith('.css')).sort();
const css = Object.fromEntries(sheets.map(f => [f, strip(read('public/' + f))]));
const rules = text => [...text.matchAll(/([^{}]*)\{([^{}]*)\}/g)].map(m => ({sel: m[1].trim(), body: m[2]}));
const decls = body => [...body.matchAll(/(?:^|;)\s*(--[\w-]+|-?[a-z][a-z-]*)\s*:\s*([^;]*)/g)].map(m => ({prop: m[1], value: m[2].trim()}));
const theme = css['theme.css'];

// A · the page loads the theme first, its boot script from the app, and the theme-ui sheet with the others.
{
  const html = read('public/index.html');
  const links = [...html.matchAll(/<link rel="stylesheet" href="\/([\w-]+\.css)">/g)].map(m => m[1]);
  assert.equal(links[0], 'theme.css', 'theme.css is the first stylesheet, so every sheet after it reads its tokens');
  assert.ok(links.includes('theme-ui.css'), 'theme-ui.css is linked');
  for (const l of links) assert.ok(sheets.includes(l), 'every linked stylesheet exists: ' + l);
  for (const s of sheets) assert.ok(links.includes(s), 'every stylesheet is linked, so none is left behind: ' + s);
  assert.ok(html.indexOf('<script src="/theme-boot.js"></script>') > -1 && html.indexOf('<script src="/theme-boot.js"></script>') < html.indexOf('theme.css'), 'the theme boot script is served by the app and runs before the stylesheets');
  assert.doesNotMatch(html, /<script>(?!<\/script>)/, 'no inline script: the policy stays script-src \'self\'');
  assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic|https?:\/\/[^"']*\.woff2?/, 'no third-party font host');
  const boot = read('public/theme-boot.js');
  assert.match(boot, /localStorage\.getItem\('aiw\.theme'\)/, 'the boot script reads the viewer\'s choice');
  assert.match(boot, /dataset\.theme|setAttribute\('data-theme'/, 'and sets data-theme before the first paint');
  pass('A · theme.css first, every sheet linked, the boot script from the app before the first paint, no inline script, no font host');
}

// B · no colour literal outside theme.css. theme-ui.css may name a diagram's literal stroke in an attribute selector
// (the SVG keeps its exported colours; the dark theme restyles it in the page), never in a declaration.
const COLOUR_PROP = /^(color|background(-color|-image)?|border(-(top|right|bottom|left|block|inline))?(-color)?|outline(-color)?|fill|stroke|box-shadow|text-shadow|filter|caret-color|accent-color|text-decoration(-color)?|column-rule(-color)?|scrollbar-color|-webkit-text-fill-color|--[\w-]+)$/;
const NAMED = /(?<![\w-])(white|black|red|green|blue|gold|gray|grey|silver|navy|orange|yellow|purple|pink|brown|ivory|beige|teal|olive|maroon|crimson|tomato|salmon|coral|khaki|lavender|wheat)(?![\w-])/i;
{
  const offenders = [];
  for (const [f, text] of Object.entries(css)) {
    if (f === 'theme.css') continue;
    for (const r of rules(text)) for (const d of decls(r.body)) {
      if (!COLOUR_PROP.test(d.prop)) continue;
      const v = d.value.replace(/url\([^)]*\)/g, '');
      if (/#[0-9a-f]{3,8}\b/i.test(v) || /\b(rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i.test(v) || NAMED.test(v)) offenders.push(`${f}: ${r.sel.slice(0, 60)} { ${d.prop}: ${d.value.slice(0, 60)} }`);
    }
  }
  assert.deepEqual(offenders, [], 'no colour literal in a declaration outside theme.css');
  const selectorHex = rules(css['theme-ui.css']).filter(r => /#[0-9a-f]{3,8}/i.test(r.sel));
  for (const r of selectorHex) assert.match(r.sel, /\[(stroke|fill)="#[0-9a-f]{3,8}"\]/i, 'theme-ui.css names a literal only as a diagram attribute: ' + r.sel.slice(0, 80));
  pass(`B · no colour literal in any declaration of the ${sheets.length - 1} stylesheets beside theme.css; theme-ui.css names diagram literals only in ${selectorHex.length} attribute selectors`);
}

// C · every token used is defined: in a stylesheet, or set on the element by a script (a per-element colour or size).
{
  const defined = new Set(Object.values(css).flatMap(t => [...t.matchAll(/(--[\w-]+)\s*:/g)].map(m => m[1])));
  const scripts = readdirSync(new URL('./public/', import.meta.url)).filter(f => f.endsWith('.js')).map(f => read('public/' + f)).join('\n');
  const setByScript = new Set([...scripts.matchAll(/(--[\w-]+)\s*:/g), ...scripts.matchAll(/setProperty\(\s*['"](--[\w-]+)/g)].map(m => m[1]));
  // A retired rule: Chapter 2's driver strip left the page in round 3; its rule names the colour the strip set inline.
  const RETIRED = {'--q-color': 'q-driver-strip'};
  for (const [v, cls] of Object.entries(RETIRED)) assert.doesNotMatch(scripts + read('public/index.html'), new RegExp(cls), `${cls} is retired, so ${v} is never needed`);
  const missing = [];
  for (const [f, text] of Object.entries(css)) for (const m of text.matchAll(/var\(\s*(--[\w-]+)\s*(,)?/g)) {
    if (!defined.has(m[1]) && !setByScript.has(m[1]) && !RETIRED[m[1]]) missing.push(f + ': ' + m[1]);
  }
  assert.deepEqual([...new Set(missing)], [], 'every var() names a defined token');
  pass(`C · every var() names a token defined in a stylesheet (${defined.size}) or set by a script (${setByScript.size}); one retired rule is accounted for`);
}

// D · the themes: the scales defined once for light and again for dark, dark under data-theme and the system choice,
// print forced light; the semantic tokens name the scales.
const block = re => { const m = theme.match(re); assert.ok(m, 'theme block ' + re); return Object.fromEntries([...m[1].matchAll(/(--[\w-]+):([^;]+);/g)].map(x => [x[1], x[2].trim()])); };
const light = block(/:root\{color-scheme:light;([\s\S]*?)\}\s*:root\[data-theme="dark"\]/);
const dark = block(/:root\[data-theme="dark"\]\{color-scheme:dark;([\s\S]*?)\}/);
const system = block(/@media \(prefers-color-scheme:dark\)\{:root\[data-theme="system"\]\{color-scheme:dark;([\s\S]*?)\}\}/);
const print = block(/@media print\{:root\[data-theme\]\{color-scheme:light;([\s\S]*?)\}\}/);
const FAMILIES = ['sage', 'green', 'gold', 'red', 'blue', 'violet', 'teal'];
{
  for (const fam of FAMILIES) for (let i = 1; i <= 12; i++) {
    const k = `--${fam}-${i}`;
    for (const [name, b] of [['light', light], ['dark', dark]]) assert.match(b[k] || '', /^#[0-9a-f]{6}$/i, `${k} is a colour in ${name}`);
    assert.equal(system[k], dark[k], k + ': the system choice on a dark OS is the dark theme'); assert.equal(print[k], light[k], k + ': print is light');
  }
  // Round 19 (audit/round19/ROUND19-RELEASE.md) gave focus outlines a theme-specific token, gold-9 in light and gold-11
  // in dark, so that each keeps more than 3:1 against the surface (E). It is the one token besides the scales that the
  // dark theme redefines; in every theme block it names a scale step, the System choice follows dark and print light.
  const THEMED = ['--focus-outline'];
  const scaleKeys = Object.keys(light).filter(k => /^--[a-z]+-\d+$|^--(on-solid|on-solid-muted|sage-solid|sage-solid-2|shadow)$/.test(k));
  assert.deepEqual(Object.keys(dark).sort(), [...scaleKeys, ...THEMED].sort(), 'dark redefines exactly the scale tokens light defines, and the theme-specific focus outline');
  for (const k of THEMED) {
    for (const [name, b] of [['light', light], ['dark', dark], ['system', system], ['print', print]]) assert.match(b[k] || '', new RegExp(`^var\\(--(${FAMILIES.join('|')})-\\d+\\)$`), `${k} names a scale step in ${name}`);
    assert.equal(system[k], dark[k], k + ': the system choice on a dark OS is the dark theme'); assert.equal(print[k], light[k], k + ': print is light');
  }
  const STATES = ['fix', 'confirm', 'proposed', 'draft', 'pass'], ROLES = ['wash', 'bg', 'line', 'solid', 'fg'];
  const fam = {fix: 'red', confirm: 'gold', proposed: 'blue', draft: 'sage', pass: 'green'};
  for (const s of STATES) for (const r of ROLES) assert.match(light[`--state-${s}-${r}`] || '', new RegExp(`^var\\(--${fam[s]}-\\d+\\)$`), `--state-${s}-${r} names the ${fam[s]} scale`);
  for (const [k, f] of [['--prov-stated', 'green'], ['--prov-inferred', 'sage'], ['--prov-open', 'gold'], ['--prov-sol', 'violet'], ['--prov-sol-wash', 'violet'], ['--prov-sol-bg', 'violet'], ['--prov-sol-line', 'violet'], ['--prov-sol-solid', 'violet']]) assert.match(light[k] || '', new RegExp(`^var\\(--${f}-\\d+\\)$`), `${k} names the ${f} scale`);
  pass(`D · ${FAMILIES.length} scales of 12 steps in light and dark, dark for data-theme="dark" and for System on a dark OS, print light; ${STATES.length} states × ${ROLES.length} roles and the provenance marks name the scales; the focus outline names one scale step per theme`);
}

// E · contrast, from the token values: text steps on surfaces, state text on its chip, white on every solid.
{
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const resolve = (b, v) => { while (/^var\(/.test(v)) v = b[v.slice(4, -1)] ?? light[v.slice(4, -1)]; return v; };
  let n = 0, focus = 0;
  for (const [name, b] of [['light', light], ['dark', dark]]) {
    const t = k => resolve(b, b[k] ?? light[k]);
    // Non-text contrast (Round 19): the focus outline keeps 3:1 against the surfaces a focused control sits on, the
    // neutral steps 1-4 and the accent and caution washes.
    for (const s of ['--sage-1', '--sage-2', '--sage-3', '--sage-4', '--green-2', '--green-3', '--gold-2', '--gold-3']) { assert.ok(ratio(t('--focus-outline'), t(s)) >= 3, `${name}: the focus outline keeps 3:1 against ${s} (${ratio(t('--focus-outline'), t(s)).toFixed(2)})`); focus++; }
    for (const fam of FAMILIES) {
      for (const surface of ['--sage-1', '--sage-2', '--sage-3', `--${fam}-2`, `--${fam}-3`]) for (const text of [`--${fam}-11`, `--${fam}-12`]) { assert.ok(ratio(t(text), t(surface)) >= 4.5, `${name}: ${text} on ${surface} reaches 4.5:1 (${ratio(t(text), t(surface)).toFixed(2)})`); n++; }
      if (fam !== 'sage') for (const solid of [`--${fam}-9`, `--${fam}-10`]) { assert.ok(ratio(t('--on-solid'), t(solid)) >= 4.5, `${name}: white on ${solid} reaches 4.5:1 (${ratio(t('--on-solid'), t(solid)).toFixed(2)})`); n++; }
    }
    assert.ok(ratio(t('--on-solid'), t('--sage-9')) >= 4.5 && ratio(t('--on-solid'), t('--sage-solid')) >= 4.5 && ratio(t('--on-solid-muted'), t('--sage-solid')) >= 4.5, name + ': text on the neutral solids'); n += 3;
    assert.ok(ratio(t('--sage-10'), t('--sage-1')) >= 4.5, `${name}: the faint text step still reads on a card (${ratio(t('--sage-10'), t('--sage-1')).toFixed(2)})`); n++;
    for (const s of ['fix', 'confirm', 'proposed', 'draft', 'pass']) for (const g of ['wash', 'bg']) { assert.ok(ratio(t(`--state-${s}-fg`), t(`--state-${s}-${g}`)) >= 4.5, `${name}: ${s} text on its ${g}`); n++; }
    assert.ok(ratio(t('--prov-sol'), t('--prov-sol-bg')) >= 4.5 && ratio(t('--on-solid'), t('--prov-sol-solid')) >= 4.5, name + ': Sol\'s violet reads on its chip and carries white text'); n += 2;
  }
  pass(`E · ${n} token pairs reach 4.5:1 in both themes: text on surfaces and chips, white on every solid, each state's text on its wash and chip, Sol's violet; the focus outline keeps 3:1 against ${focus} surface pairs`);
}

// F · type: IBM Plex served by the app with its licence, packed by both builds; Georgia only in the document token.
{
  const faces = [...theme.matchAll(/url\("\/fonts\/([\w-]+\.woff2)"\)/g)].map(m => m[1]);
  assert.equal(faces.length, 5, 'Plex Sans 400/500/600 and Plex Mono 400/500');
  for (const f of faces) assert.ok(existsSync(new URL('./public/fonts/' + f, import.meta.url)), 'the font file is in the app: ' + f);
  for (const f of ['OFL-IBM-Plex-Sans.txt', 'OFL-IBM-Plex-Mono.txt']) assert.match(read('public/fonts/' + f), /SIL OPEN FONT LICENSE/i, f + ' is the SIL Open Font License');
  assert.match(read('client-bundle.mjs'), /readdir\('public\/fonts'\)/, 'the client bundle copies the fonts');
  assert.match(read('client-bundle.mjs'), /theme-boot\.js/, 'and the boot script');
  assert.match(read('build.mjs'), /'\.woff2':'font\/woff2'/, 'the Worker packs font/woff2');
  assert.match(read('security-headers.js'), /"font-src 'self' data:"/, 'fonts come from the app itself');
  assert.match(light['--font-ui'], /^"IBM Plex Sans",/, 'the interface font is Plex Sans'); assert.match(light['--font-mono'], /^"IBM Plex Mono",/, 'record IDs in Plex Mono'); assert.match(light['--font-doc'], /^Georgia,/, 'documents keep Georgia');
  const stacks = [];
  for (const [f, text] of Object.entries(css)) { if (f === 'theme.css') continue;
    if (/Georgia/.test(text)) stacks.push(f + ': Georgia');
    // a font shorthand may name only a token or inherit once its style, weight, size and line height are set aside
    const family = v => v.replace(/!important/, '').replace(/\b(clamp|calc|min|max)\((?:[^()]|\([^()]*\))*\)/g, ' ').replace(/var\(--(fs|lh)[\w-]*\)/g, ' ')
      .split(/\s+/).filter(t => t && !/^(italic|oblique|normal|bold|bolder|lighter|small-caps|\d{3}|[\d.]+(px|rem|em|%)?(\/[\d.]+(px|rem|em|%)?)?|\/[\d.]+(px|rem|em|%)?)$/.test(t)).join(' ');
    for (const r of rules(text)) for (const d of decls(r.body)) if ((d.prop === 'font-family' && !/^(var\(--font-(ui|mono|doc)\)|inherit)$/.test(d.value)) || (d.prop === 'font' && !/^(var\(--font-(ui|mono|doc)\)|inherit|)$/.test(family(d.value)))) stacks.push(`${f}: ${r.sel.slice(0, 50)} { ${d.prop}: ${d.value} }`); }
  assert.deepEqual(stacks, [], 'no font stack outside the tokens');
  const doc = Object.values(css).flatMap(t => rules(t).filter(r => /var\(--font-doc\)/.test(r.body)).map(r => r.sel));
  for (const s of doc) assert.match(s, /\.rv-document-cover h3|\.rv-doc-title|\.an-narr|\.p-principle p/, 'only the document rules use the document font: ' + s);
  pass(`F · ${faces.length} Plex faces served by the app under the OFL and packed by both builds; no font stack outside --font-ui/--font-mono/--font-doc; Georgia in ${doc.length} document rules only`);
}

// G · one state and provenance language: the chips of Validate, Output, the journey draft, the companion and the
// pictures read the semantic tokens; a proposal reads blue, never the amber of "to confirm"; Sol keeps its violet.
{
  const all = Object.entries(css).filter(([f]) => f !== 'theme.css').flatMap(([f, t]) => rules(t).map(r => ({...r, f})));
  const find = sel => { const r = all.find(x => x.sel === sel); assert.ok(r, 'rule ' + sel); return r.body; };
  for (const s of ['fix', 'confirm', 'pass']) {
    assert.match(find(`.sdd-st.${s}`), new RegExp(`color:var\\(--state-${s}-fg\\)`), `the Output register's ${s} chip reads --state-${s}-fg`);
    assert.match(find(`.vx-word.${s}`), new RegExp(`color:var\\(--state-${s}-fg\\)`), `Validate's ${s} word reads --state-${s}-fg`);
    assert.match(find(`.sdd-row.${s} th`), new RegExp(`var\\(--state-${s}-solid\\)`), `the register row's ${s} bar reads --state-${s}-solid`);
    assert.match(find(`.nt-mk-g.${s}`), new RegExp(`var\\(--state-${s}-solid\\)`), `the picture's ${s} marker reads --state-${s}-solid`);
  }
  assert.match(find('.sr-sev.fix'), /var\(--state-fix-fg\)/, 'the companion\'s severity chip reads the state');
  for (const [t, k] of [['stated', 'prov-stated-line'], ['inferred', 'prov-inferred-line'], ['gap', 'prov-open-line'], ['sol', 'prov-sol-line']]) assert.match(find(`.jd-tag.${t}`), new RegExp(`var\\(--${k}\\)`), `the journey draft's ${t} tag reads --${k}`);
  const proposed = all.filter(r => /\.(proposed|suggested)\b/.test(r.sel) && r.sel.split(',').every(p => /\.(proposed|suggested)\b/.test(p)));
  const amberProposals = proposed.filter(r => /var\(--gold-\d+\)/.test(r.body));
  assert.deepEqual(amberProposals.map(r => r.f + ': ' + r.sel), [], 'no proposal is drawn in amber');
  assert.ok(proposed.filter(r => /var\(--state-proposed-/.test(r.body)).length >= 40, 'the proposals of the pictures read --state-proposed-*');
  const solRules = all.filter(r => r.sel.split(',').every(p => /\.(?:[a-z0-9]+-)*sol[a-z]*(?:-[a-z0-9]+)*\b/.test(p)));
  const offHue = solRules.filter(r => /var\(--(blue|gold)-\d+\)/.test(r.body));
  assert.deepEqual(offHue.map(r => r.f + ': ' + r.sel), [], 'nothing of Sol\'s is drawn in the proposed blue or in amber');
  assert.ok(solRules.filter(r => /var\(--prov-sol(-[a-z]+)?\)/.test(r.body)).length >= 30, 'Sol\'s panels, chips and bands read --prov-sol*');
  assert.match(find('.spark-band-sol .spark-band-label b'), /var\(--prov-sol\)/, 'the field spark\'s Sol draft band is violet');
  pass(`G · the chips of Validate, Output, the companion, the journey draft and the pictures read the state tokens; ${proposed.length} proposal rules read blue and none amber; ${solRules.length} Sol rules keep the violet`);
}

console.log(`\n${checks.length} checks passed.`);
