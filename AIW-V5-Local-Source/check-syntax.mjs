import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
const files=['.','public'].flatMap(dir=>readdirSync(dir).filter(name=>/\.(?:js|mjs)$/.test(name)).map(name=>dir+'/'+name));
for(const file of files){const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(check.status!==0){console.error(check.stderr);process.exit(check.status||1);}}
console.log('Syntax checks passed for '+files.length+' application, service and verification modules.');
