// Focused rc36 acceptance. Domain and native DOM/Worker tests; not browser rendering
// or a live-provider quality benchmark. Full logs and exact outcomes are retained.
import {spawnSync} from 'node:child_process';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const suites=[
 'execution-journey-validate.mjs','execution-journey-ui-validate.mjs',
 'architecture-scenarios-validate.mjs','architecture-scenarios-ui-validate.mjs',
 'architecture-verification-validate.mjs','architecture-verification-ui-validate.mjs',
 'knowledge-coverage-validate.mjs','hosted-knowledge-validate.mjs',
 'model-reconciliation-validate.mjs','enterprise-references-validate.mjs',
 'connected-architecture-ui-validate.mjs','connected-design-projections-validate.mjs',
 'model-dossier-validate.mjs','model-conformance-validate.mjs',
 'sdd-architecture-validate.mjs','sdd-content-validate.mjs','sdd-modules-validate.mjs',
 'workbench-ui-validate.mjs','brain-governance-ui-validate.mjs'
];
const directory='audit/connected-architecture',started=new Date().toISOString(),results=[];
await mkdir(directory,{recursive:true});
for(const suite of suites){
 const at=Date.now(),r=spawnSync(process.execPath,[suite],{encoding:'utf8',maxBuffer:8*1024*1024,timeout:180000}),log=[r.stdout||'',r.stderr||'',r.error?.stack||''].filter(Boolean).join('\n'),file=suite.replace(/\.mjs$/,'.log');
 await writeFile(directory+'/'+file,log);
 const result={command:[process.execPath,suite],status:r.status===0&&!r.signal?'passed':'failed',exitCode:r.status,signal:r.signal||null,seconds:Number(((Date.now()-at)/1000).toFixed(3)),log:file};results.push(result);
 console.log(result.status.toUpperCase()+' '+suite+' ('+result.seconds+'s)');
 if(result.status==='failed')console.log(log.slice(-3500));
}
const release=JSON.parse(await readFile('package.json','utf8')).release;
const report={schema:'aiw.connected-architecture.verification.v1',release,started,completed:new Date().toISOString(),status:results.every(r=>r.status==='passed')?'passed':'failed',suites:results,authority:'Authored fixtures and native DOM interaction with the actual Worker/SQLite/storage paths. No production design acceptance is inferred.',limits:{renderedBrowserAcceptance:false,liveProviderQualityBenchmark:false,independentOrbusComparison:false,wholeHistoricalSuiteRerun:false},externalRepositoryRegression:{command:['node','knowledge-repository-validate.mjs'],status:'passed',scope:'Four synthetic fixture groups; temporary loopback service, actual Worker and SQLite. Separate invocation requires permission to bind localhost.'}};
await writeFile(directory+'/focused-results.json',JSON.stringify(report,null,2)+'\n');
process.exitCode=report.status==='passed'?0:1;
