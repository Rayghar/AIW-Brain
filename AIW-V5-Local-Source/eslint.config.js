// ESLint for the workbench (audit F2-20): unused variables, empty blocks and static import cycles across
// public/, the server modules and the suites. Run through `npm run check` (scripts/lint.mjs), which holds the
// violations that predate the rules in a baseline that only goes down. The cycle rule is local: it reads the static import graph of
// public/*.js once and reports an import that closes a cycle. The two cycles F2-08 listed are retired (round 2,
// R2-G: guidance-record.js, design-basis.js and case-context.js hold the pieces both sides needed), so no module is
// exempt and every static cycle in public/ is an error.
import {readdirSync, readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
let graph = null;
function importGraph() {
  if (graph) return graph;
  graph = new Map();
  const dir = path.join(here, 'public');
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.js'))) {
    const text = readFileSync(path.join(dir, file), 'utf8');
    const edges = new Set();
    for (const m of text.matchAll(/^(?:import|export)\s[^'"]*?from\s*'\.\/([^']+)'/gm)) edges.add(m[1]);
    graph.set(file, edges);
  }
  return graph;
}
function reaches(g, from, to, seen = new Set()) {
  if (from === to) return true;
  if (seen.has(from)) return false;
  seen.add(from);
  for (const next of g.get(from) || []) if (reaches(g, next, to, seen)) return true;
  return false;
}
const importCycle = {
  meta: {type: 'problem', docs: {description: 'a static import that closes a cycle between modules in public/'}, schema: []},
  create(context) {
    const file = path.basename(context.filename || context.getFilename());
    if (!context.filename?.includes(`${path.sep}public${path.sep}`) || !file.endsWith('.js')) return {};
    return {
      ImportDeclaration(node) {
        const spec = String(node.source.value || '');
        if (!spec.startsWith('./')) return;
        const target = spec.slice(2);
        if (reaches(importGraph(), target, file)) context.report({node, message: `import cycle: ${file} → ${target} → … → ${file}`});
      },
    };
  },
};

// no-undef stays off (the modules share globals through window.aiw*, audit F2-26), so no globals are declared.
const rules = {
  'no-unused-vars': ['error', {args: 'after-used', argsIgnorePattern: '^_', caughtErrors: 'none', varsIgnorePattern: '^_', ignoreRestSiblings: true}],
  'no-empty': ['error', {allowEmptyCatch: false}],
  'no-undef': 'off',
  'aiw/no-import-cycle': 'error',
};
export default [
  {ignores: ['node_modules/**', 'dist/**', '.aiw-local/**', 'test-results/**', 'public/brain-catalogue.js', 'public/review-font.js', 'public/vendor-docx.js', 'public/brain-playbook.js', 'drizzle/**', 'db/**', 'evidence/**', 'candidate-sets/**']},
  {
    files: ['public/**/*.js'],
    languageOptions: {ecmaVersion: 2024, sourceType: 'module'},
    plugins: {aiw: {rules: {'no-import-cycle': importCycle}}},
    rules,
  },
  {
    files: ['*.js', '*.mjs', 'shared/**/*.js', 'scripts/**/*.mjs', 'scripts/**/*.js', 'repository-service/**/*.mjs', 'repository-service/**/*.js'],
    languageOptions: {ecmaVersion: 2024, sourceType: 'module'},
    plugins: {aiw: {rules: {'no-import-cycle': importCycle}}},
    rules: {...rules, 'aiw/no-import-cycle': 'off'},
  },
];
