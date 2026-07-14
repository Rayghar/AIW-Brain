import { readFile } from 'node:fs/promises';
const root=new URL('../../',import.meta.url);
const files={
 app:'apps/web/src/App.tsx', nav:'apps/web/src/lib/roleNavigation.ts', role:'apps/web/src/components/RoleProductBar.tsx', pattern:'apps/web/src/components/PatternIntelligenceWorkspace.tsx', synthesis:'apps/web/src/components/ArchitectureSynthesisWorkspace.tsx', css:'apps/web/src/styles/rc10_63_navigation_decision_flow.css'
};
const text={}; for(const [k,v] of Object.entries(files)) text[k]=await readFile(new URL(v,root),'utf8');
const checks=[
 ['ShellNavRail mounted',text.app.includes('<ShellNavRail')],
 ['role rail restored',text.css.includes('display:flex !important')],
 ['context-only role bar',!text.role.includes('role-product-bar__lenses')],
 ['compose navigation',text.nav.includes('Architecture Composition')],
 ['options navigation',text.nav.includes('Architecture Options')],
 ['composition scope',text.pattern.includes('Choose patterns that fit this model scope')],
 ['governance removed from architect pattern page',!text.pattern.includes('LLM Routes')&&!text.pattern.includes('Repository source registry')],
 ['synthesis release label removed',!text.synthesis.includes('rc.10.57 ·')],
 ['synthesis generation first action',text.synthesis.includes('Generate alternatives')],
 ['lifecycle status unified', (await readFile(new URL('apps/web/src/components/ProjectCockpit.tsx',root),'utf8')).includes('Journey progress')],
];
let failed=0; for(const [name,ok] of checks){ console.log(`${ok?'PASS':'FAIL'} ${name}`); if(!ok) failed++; }
if(failed) process.exit(1); console.log(`rc.10.63 gate: ${checks.length}/${checks.length} passed`);
