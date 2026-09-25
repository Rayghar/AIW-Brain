// Development-only adapter; never packaged into the hosted Worker.
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,unlink} from 'node:fs/promises';
import path from 'node:path';
export function localFiles(directory='.aiw-local/baselines'){
  const filename=key=>path.join(directory,createHash('sha256').update(key).digest('hex')+'.json');
  return {
    async put(key,value){await mkdir(directory,{recursive:true});await writeFile(filename(key),value)},
    async get(key){try{const value=await readFile(filename(key));return {text:async()=>value.toString('utf8'),arrayBuffer:async()=>value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength)}}catch(e){if(e.code==='ENOENT')return null;throw e}},
    async delete(key){try{await unlink(filename(key))}catch(e){if(e.code!=='ENOENT')throw e}}
  };
}
