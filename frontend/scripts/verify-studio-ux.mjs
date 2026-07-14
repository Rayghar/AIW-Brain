#!/usr/bin/env node
// Studio UX gate (lessons→law from the global UI audit). Institutionalizes the
// mechanical audit fixes so they can never regress: the legibility floor, the
// route-level error boundary, and the command palette. Design-judgment items
// (4-mode nav, cockpit, inspector, canvas shell) are roadmap, not gated here.
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(process.argv[2] ?? '.');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const failures = [];
const check = (name, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`); if (!ok) failures.push(name); };

// 1. Legibility floor: no font-size below 11px anywhere in web CSS.
let below = 0; const offenders = [];
const walk = (dir) => { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
  const p = path.join(dir, e.name);
  if (e.isDirectory() && e.name !== 'node_modules') walk(p);
  else if (e.name.endsWith('.css')) { for (const m of read(path.relative(root, p)).matchAll(/font-size:\s*(\d+)px/g)) if (Number(m[1]) < 11) { below++; offenders.push(`${e.name}:${m[1]}px`); } }
} };
walk(path.join(root, 'apps/web/src'));
check('legibility floor: no font-size below 11px', below === 0, below ? `${below} offenders e.g. ${offenders.slice(0,3).join(', ')}` : 'floor holding');

// 2. Type scale institutionalized as tokens.
check('type scale tokens defined', /--text-(tiny|body|section|page)/.test(read('apps/web/src/design-system/tokens.css')));

// 3. Route-level error boundary exists and wraps the workspace render.
const app = read('apps/web/src/App.tsx');
check('WorkspaceErrorBoundary component exists', fs.existsSync(path.join(root, 'apps/web/src/design-system/WorkspaceErrorBoundary.tsx')));
check('workspace render is wrapped in the error boundary', /<WorkspaceErrorBoundary[\s\S]*\{mainContent\}[\s\S]*<\/WorkspaceErrorBoundary>/.test(app));

// 4. Command palette present (audit Gap 7 — already shipped; guard against regression).
check('command palette (Ctrl/Cmd+K) wired', /key\.toLowerCase\(\)\s*===\s*'k'/.test(app) && /commandItems/.test(app));

// 5. Four-primary-mode navigation (Gap 1): every workspace maps to exactly one
//    primary group; the four groups exist; no workspace orphaned.
const navGroups = [...app.matchAll(/id: "(studio|intelligence|delivery|operations)", label:/g)].map((m) => m[1]);
check('four primary nav groups defined', new Set(navGroups).size === 4, navGroups.join(',') || 'missing');
const mapBlock = (app.match(/WORKSPACE_PRIMARY_GROUP[^{]*\{([\s\S]*?)\}/) || [,''])[1];
const mapped = [...mapBlock.matchAll(/(\w+):\s*"(studio|intelligence|delivery|operations)"/g)].map((m) => m[1]);
const navIds = [...app.matchAll(/\{ id: "([a-z]+)", icon:/g)].map((m) => m[1]);
const orphans = navIds.filter((id) => !mapped.includes(id));
check('every workspace maps to a primary group', orphans.length === 0, orphans.join(',') || `${mapped.length} mapped`);
check('grouped nav render (not flat)', /PRIMARY_NAV_GROUPS\.map/.test(app) && /toggleNavGroup/.test(app));

// 6. Project Cockpit (Gap 16): exists, is a workspace mode, is the landing, and
//    is a PURE PROJECTION of the kernel (no self-computed score — doctrine).
const profiles = read('apps/web/src/lib/experienceProfiles.ts');
check('cockpit is a workspace mode', /\|\s*'cockpit'/.test(profiles));
check('cockpit is the post-project landing', /preferredWorkspaces: \['cockpit'/.test(profiles));
check('cockpit renders in App', /workspaceMode === "cockpit"[\s\S]*<ProjectCockpit \/>/.test(app));
const cockpit = read('apps/web/src/features/cockpit/ProjectCockpit.tsx');
check('cockpit projects kernel intelligence (not a second authority)', /intelligence\?\.health/.test(cockpit) && !/Math\.round\(100/.test(cockpit) && !/score\s*=\s*\d/.test(cockpit));

// 7. Selected-object Inspector (Gap 5/9): projects relationships + governed
//    evidence provenance for the selected object (kernel-sourced, not invented).
const canvas = read('apps/web/src/features/canvas/ProCanvasViewSystem.tsx');
check('inspector projects relationships + governed evidence', /Relationships and governance/.test(canvas) && /inspectorIntel\?\.evidence/.test(canvas) && /knowledgeReleaseId/.test(canvas));

console.log(failures.length ? `\nSTUDIO UX GATE: ${failures.length} violation(s)` : '\nSTUDIO UX GATE: PASSED — legibility floor, error boundaries and command palette enforced');
process.exit(failures.length ? 1 : 0);
