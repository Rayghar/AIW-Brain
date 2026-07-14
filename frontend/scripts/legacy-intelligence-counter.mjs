#!/usr/bin/env node
// Shadow-mode legacy counter (C2): recommendation authority outside the kernel
// must trend to zero. Counts direct engine-recommendation imports in web
// components (the kernel and store are the sanctioned consumers).
import fs from 'node:fs'; import path from 'node:path';
const root = path.resolve(process.argv[2] ?? '.');
const dir = path.join(root,'apps/web/src/components');
const offenders=[];
for(const f of fs.readdirSync(dir)){
  if(!/\.tsx?$/.test(f)) continue;
  const src=fs.readFileSync(path.join(dir,f),'utf8');
  if(/recommendArchitectureStyles|buildStageGuidance\s*\(/.test(src)) offenders.push(f);
}
const allow = new Set([]); // sanctioned exceptions must be listed here with a reason in docs
const bad = offenders.filter(f=>!allow.has(f));
for(const f of bad) console.log('LEGACY  '+f+' invokes recommendation logic directly — route through the kernel');
console.log(`\nlegacy recommendation invocations in components: ${bad.length} (target 0)`);
process.exit(bad.length?1:0);
