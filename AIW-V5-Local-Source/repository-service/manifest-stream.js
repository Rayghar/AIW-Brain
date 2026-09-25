// Streams an acquisition manifest (aiw-github-acquisition-v4) without loading it whole: some are
// hundreds of megabytes. Scans bytes; JSON structure characters never occur inside UTF-8 multi-byte
// sequences, so chunk boundaries are safe. Small top-level fields are parsed; each files[] entry is
// handed to onFile as it completes; the large artefact arrays are skipped unread.
import {createReadStream} from 'node:fs';
import {createHash} from 'node:crypto';

const SKIP=new Set(['architectureArtefacts','crossFileArchitectureGroups']);
const QUOTE=34,BACKSLASH=92,OPEN_OBJ=123,CLOSE_OBJ=125,OPEN_ARR=91,CLOSE_ARR=93,COLON=58,COMMA=44;

export async function readManifest(file,onFile,{chunkSize=1<<20}={}){
 const header={},hash=createHash('sha256');let bytes=0;
 // depth counts open containers; the manifest object itself is depth 1.
 let depth=0,inString=false,escape=false,key=null,expectKey=true;
 let capture=null,skipping=false,element=null,elementDepth=0,keyParts=null;
 const finishValue=()=>{if(capture&&key!=null)header[key]=JSON.parse(Buffer.concat(capture).toString('utf8'));capture=null;key=null;expectKey=true;};
 for await(const chunk of createReadStream(file,{highWaterMark:chunkSize})){
  hash.update(chunk);bytes+=chunk.length;
  let from=0;// start of the not-yet-copied slice of this chunk for active captures
  const flush=i=>{if(capture)capture.push(chunk.subarray(from,i));if(element)element.push(chunk.subarray(from,i));if(keyParts)keyParts.push(chunk.subarray(from,i));from=i;};
  for(let i=0;i<chunk.length;i++){
   const c=chunk[i];
   if(inString){
    if(escape){escape=false;continue;}
    if(c===BACKSLASH){escape=true;continue;}
    if(c===QUOTE){inString=false;
     if(keyParts){flush(i+1);key=JSON.parse(Buffer.concat(keyParts).toString('utf8'));keyParts=null;expectKey=false;}
    }
    continue;
   }
   if(c===QUOTE){
    inString=true;
    if(depth===1&&expectKey){flush(i);keyParts=[];from=i;}
    else if(depth===1&&key!=null&&!capture&&!skipping&&key!=='files'){flush(i);capture=[];from=i;}
    continue;
   }
   if(c===OPEN_OBJ||c===OPEN_ARR){
    if(depth===1&&key!=null&&!capture&&!skipping){
     if(key==='files'){if(c!==OPEN_ARR)throw Error('Manifest files must be an array.');}
     else if(SKIP.has(key))skipping=true;
     else{flush(i);capture=[];from=i;}
    }
    else if(depth===2&&key==='files'&&c===OPEN_OBJ){flush(i);element=[];from=i;elementDepth=depth+1;}
    depth++;continue;
   }
   if(c===CLOSE_OBJ||c===CLOSE_ARR){
    // A string or scalar that ends at the manifest's own closing brace.
    if(depth===1&&capture){flush(i);finishValue();}
    depth--;
    if(element&&depth===elementDepth-1){flush(i+1);onFile(JSON.parse(Buffer.concat(element).toString('utf8')));element=null;}
    if(depth===1&&key!=null){if(capture){flush(i+1);finishValue();}else{skipping=false;key=null;expectKey=true;}}
    continue;
   }
   if(depth===1&&(c===COMMA)){if(capture){flush(i);finishValue();}else if(key!=null&&!skipping){key=null;expectKey=true;}continue;}
   if(depth===1&&c===COLON)continue;
   // A scalar (number, true, false, null) directly under the manifest object.
   if(depth===1&&key!=null&&!capture&&!skipping&&c>32){flush(i);capture=[];from=i;}
  }
  flush(chunk.length);
 }
 if(capture)finishValue();
 if(depth!==0||inString)throw Error('The manifest ended before its JSON was complete.');
 return {header,rawSha256:hash.digest('hex'),bytes};
}
