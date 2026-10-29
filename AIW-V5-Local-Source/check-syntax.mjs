import {readdirSync,existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
// Syntax of every application, service, script and verification module (round 2, B2-12): the root, the client, the
// server modules shared with the suites, the repository service and the scripts; since round 12 the client's domain
// lenses (public/lenses). A directory that does not exist is
// skipped. Python helpers under scripts/ are not JavaScript and are not checked here.
const files=['.','public','public/lenses','shared','repository-service','scripts'].filter(dir=>existsSync(dir)).flatMap(dir=>readdirSync(dir).filter(name=>/\.(?:js|mjs)$/.test(name)).map(name=>dir+'/'+name));
for(const file of files){const check=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(check.status!==0){console.error(check.stderr);process.exit(check.status||1);}}
console.log('Syntax checks passed for '+files.length+' application, service, script and verification modules.');
