import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const expect = (name, condition) => checks.push({ name, condition });

const shellNav = read('apps/web/src/components/ShellNavRail.tsx');
const roleNav = read('apps/web/src/lib/roleNavigation.ts');
const roleTray = read('apps/web/src/components/RoleToolsTray.tsx');
const pageObjectives = read('apps/web/src/lib/pageObjectiveRegistry.ts');
const app = read('apps/web/src/App.tsx');
const css = read('apps/web/src/design-system/product-experience.css');

expect('left rail uses role navigation registry', shellNav.includes('getRoleRailSections'));
expect('left rail no longer renders role tools section', !shellNav.includes('studio-nav__section--role-tools'));
expect('left rail has no All tools label', !shellNav.includes('All tools'));
expect('left rail footer opens capability map instead of all-tools rail', shellNav.includes('setCapabilityMapOpen'));
expect('solution architect rail is design lifecycle only', roleNav.includes('"solution-architect"') && roleNav.includes('title: "Design lifecycle"'));
expect('administrator rail is admin control plane', roleNav.includes('title: "Admin control plane"'));
expect('knowledge curator rail is knowledge operations', roleNav.includes('title: "Knowledge operations"'));
expect('reviewer rail is review and assurance', roleNav.includes('title: "Review & assurance"'));
expect('enterprise architect rail is enterprise oversight', roleNav.includes('title: "Enterprise oversight"'));
expect('platform architect rail is platform runtime', roleNav.includes('title: "Platform & runtime"'));
expect('workspace tools tray is task launcher not primary nav', roleTray.includes('Contextual task launcher') && roleTray.includes('Start task'));
expect('workspace tools tray opens capability map', roleTray.includes('Capability map'));
expect('page objective registry exists', pageObjectives.includes('resolvePageObjective') && pageObjectives.includes('featureUiRegistry'));
expect('page objective strip is mounted in app', app.includes('PageObjectiveStrip'));
expect('role nav CSS hides old role tools nav section', css.includes('rc.10.48.15') && css.includes('role-based-nav'));

const failed = checks.filter((check) => !check.condition);
if (failed.length) {
  console.error('Role-based navigation architecture gate failed:');
  for (const check of failed) console.error(`- ${check.name}`);
  process.exit(1);
}
console.log(`Role-based navigation architecture gate passed (${checks.length} checks).`);
