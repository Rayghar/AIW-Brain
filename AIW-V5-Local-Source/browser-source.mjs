// Loads a browser module as classic-script source for the vm-based validation suites.
// Imports are stripped and exports become plain declarations, as before. Relative
// re-exports (export {a} from './x.js') are inlined so shared helpers stay defined.
import fs from 'node:fs';
import path from 'node:path';
export function browserSource(file,seen=new Set()){
  seen.add(path.resolve(file));
  return fs.readFileSync(file,'utf8')
    .replace(/^export \{[^}]*\} from '(\.\.?\/[^']+)';\n/gm,(_,spec)=>{const target=path.join(path.dirname(file),spec);return seen.has(path.resolve(target))?'':browserSource(target,seen)+'\n';})
    .replace(/^import .*?;\n/gm,'')
    .replaceAll('export function ','function ')
    .replaceAll('export const ','const ');
}
