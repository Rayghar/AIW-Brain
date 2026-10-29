// Bounded, read-only OOXML intake. Formulas are retained, never executed.
// No workbook macros, relationships, hyperlinks or external data are followed.
export const WORKBOOK_LIMITS=Object.freeze({bytes:12*1024*1024,entries:1500,expanded:64*1024*1024,entry:24*1024*1024,rows:10000,columns:128,cells:300000});
const decode=new TextDecoder('utf-8',{fatal:true});
export async function sha256(bytes){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');}
function fail(message){throw Error(message);}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function crc32(bytes){let n=0xffffffff;for(const b of bytes)n=crcTable[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;}
// The bounded ZIP reader of an OOXML package, shared by the workbook intake and the brief reader (public/brief-reader.js,
// round 4): the same byte, entry and expanded-size limits, CRC and size checks, no encryption, ZIP64 or multi-volume
// archives, no ambiguous paths, fatal UTF-8 and no XML entity declarations. It reads only the parts it is asked for by
// name and follows nothing. `noun` words its messages ('workbook' for .xlsx, 'document' for .docx).
const ARCHIVE_WORDS={workbook:{noun:'workbook',Noun:'Workbook',kind:'XLSX',ext:'.xlsx',choose:'an .xlsx workbook'},document:{noun:'document',Noun:'Document',kind:'DOCX',ext:'.docx',choose:'a .docx document'}};
export function openArchive(input,noun='workbook'){
 const w=ARCHIVE_WORDS[noun];if(!w)throw Error('Unknown archive kind.');
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 if(bytes.length>WORKBOOK_LIMITS.bytes||bytes.length<22)fail(`Choose ${w.choose} up to 12 MB.`);
 const d=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let end=-1;
 for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(d.getUint32(i,true)===0x06054b50&&i+22+d.getUint16(i+20,true)===bytes.length){end=i;break;}
 if(end<0)fail(`This is not a readable ${w.kind} archive. Save it as an unencrypted ${w.ext} ${w.noun}.`);
 const count=d.getUint16(end+10,true),offset=d.getUint32(end+16,true),size=d.getUint32(end+12,true);
 if(d.getUint16(end+4,true)||d.getUint16(end+6,true)||count===65535||count!==d.getUint16(end+8,true)||count>WORKBOOK_LIMITS.entries||offset+size>end)fail(`Multi-volume, ZIP64 or oversized ${w.noun}s are not supported.`);
 const entries=new Map();let cursor=offset,total=0;
 for(let i=0;i<count;i++){
  if(cursor+46>end||d.getUint32(cursor,true)!==0x02014b50)fail(`The ${w.noun} directory is damaged.`);
  const flags=d.getUint16(cursor+8,true),method=d.getUint16(cursor+10,true),crc=d.getUint32(cursor+16,true),compressed=d.getUint32(cursor+20,true),expanded=d.getUint32(cursor+24,true),nameLength=d.getUint16(cursor+28,true),extra=d.getUint16(cursor+30,true),comment=d.getUint16(cursor+32,true),start=d.getUint32(cursor+42,true);
  if(cursor+46+nameLength+extra+comment>end)fail(`The ${w.noun} directory is incomplete.`);
  const name=decode.decode(bytes.subarray(cursor+46,cursor+46+nameLength));cursor+=46+nameLength+extra+comment;total+=expanded;
  if(flags&1||![0,8].includes(method)||expanded>WORKBOOK_LIMITS.entry||total>WORKBOOK_LIMITS.expanded)fail(`This ${w.noun} uses unsupported encryption, compression or exceeds the 64 MB expanded limit.`);
  if(name.startsWith('/')||name.includes('\\')||name.split('/').includes('..')||entries.has(name))fail(`The ${w.noun} contains an ambiguous file path.`);
  if(start+30>offset||d.getUint32(start,true)!==0x04034b50)fail(`The ${w.noun} contains a damaged entry.`);
  const localName=d.getUint16(start+26,true),localExtra=d.getUint16(start+28,true),data=start+30+localName+localExtra;
  if(data+compressed>offset||decode.decode(bytes.subarray(start+30,start+30+localName))!==name||d.getUint16(start+8,true)!==method||d.getUint16(start+6,true)&1)fail(`The ${w.noun} entry does not match its directory.`);
  entries.set(name,{method,crc,compressed,expanded,data});
 }
 async function read(name,optional=false){
  const entry=entries.get(name);if(!entry){if(optional)return '';fail(`The ${w.noun} is missing ${name}.`);}
  let out=bytes.subarray(entry.data,entry.data+entry.compressed);
  if(entry.method===8){
   const reader=new Blob([out]).stream().pipeThrough(new DecompressionStream('deflate-raw')).getReader(),parts=[];let length=0;
   try{while(true){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>entry.expanded||length>WORKBOOK_LIMITS.entry){await reader.cancel();fail(`A ${w.noun} entry exceeds its declared size.`);}parts.push(part.value);}}finally{reader.releaseLock();}
   out=new Uint8Array(length);let at=0;for(const part of parts){out.set(part,at);at+=part.length;}
  }
  if(out.length!==entry.expanded||crc32(out)!==entry.crc)fail(`A ${w.noun} entry failed its integrity check.`);
  const xml=decode.decode(out);if(/<!DOCTYPE|<!ENTITY/i.test(xml))fail(`${w.Noun} XML entity declarations are not supported.`);return xml;
 }
 return {entries,read};
}
// Round 12 (GR-INT-07): a number stored in a cell whose number format is a date or a time is read as the date it shows,
// in ISO form (2026-08-01, 2026-08-01T09:30:00, 09:30:00), with the stored number kept beside it (raw) and the cell
// typed 'd'. The formats are the workbook's own (xl/styles.xml: the built-in date and time formats and any custom format
// whose code holds day, month, year, hour or second parts outside quotes and brackets); an elapsed time ([h]:mm) or a
// number no calendar holds stays the number it is. The 1900 and 1904 date systems are both read.
const DATE_IDS=new Set([14,15,16,17,27,28,29,30,31,34,35,36,50,51,52,53,54,55,56,57,58]),DATETIME_IDS=new Set([22]),TIME_IDS=new Set([18,19,20,21,32,33,45]);
export function formatKind(code){
 const body=String(code||'').split(';')[0];if(/\[(?:h+|m+|s+)\]/i.test(body))return null;
 const t=body.replace(/"[^"]*"/g,'').replace(/\\./g,'').replace(/\[[^\]]*\]/g,'').replace(/[_*]./g,'').toLowerCase();
 const date=/[yd]/.test(t)||/m/.test(t)&&!/[hs]/.test(t)&&!/[0#?]/.test(t),time=/[hs]/.test(t);
 return date&&time?'datetime':date?'date':time?'time':null;
}
const pad2=n=>String(n).padStart(2,'0');
export function serialDate(serial,kind,date1904=false){
 const v=Number(serial);if(!Number.isFinite(v)||v<0||v>=2958466||(!date1904&&v>=60&&v<61))return null;
 let days=Math.floor(v),seconds=Math.round((v-days)*86400);if(seconds>=86400){days++;seconds-=86400;}
 const epoch=date1904?Date.UTC(1904,0,1):days<60?Date.UTC(1899,11,31):Date.UTC(1899,11,30),d=new Date(epoch+days*86400000);
 const day=d.getUTCFullYear()+'-'+pad2(d.getUTCMonth()+1)+'-'+pad2(d.getUTCDate()),time=pad2(Math.floor(seconds/3600))+':'+pad2(Math.floor(seconds/60)%60)+':'+pad2(seconds%60);
 return kind==='time'?time:kind==='datetime'?day+'T'+time:day;
}
function styleKinds(xml){
 const custom=new Map([...xml.matchAll(/<(?:\w+:)?numFmt\b([^>]*?)\/?>/g)].map(m=>{const a=attributes(m[1]);return [Number(a.numFmtId),formatKind(a.formatCode)];}));
 const xfs=/<(?:\w+:)?cellXfs\b[^>]*>([\s\S]*?)<\/(?:\w+:)?cellXfs>/.exec(xml)?.[1]||'';
 return [...xfs.matchAll(/<(?:\w+:)?xf\b([^>]*?)(?:\/>|>)/g)].map(m=>{const id=Number(attributes(m[1]).numFmtId||0);return custom.has(id)?custom.get(id):DATE_IDS.has(id)?'date':DATETIME_IDS.has(id)?'datetime':TIME_IDS.has(id)?'time':null;});
}
export async function openWorkbook(input){
 const {entries,read}=openArchive(input,'workbook');
 const workbook=await read('xl/workbook.xml'),rels=await read('xl/_rels/workbook.xml.rels');
 const relations=[...rels.matchAll(/<(?:\w+:)?Relationship\b([^>]*?)(?:\/?>)/g)].map(m=>attributes(m[1]));
 const targets=new Map(relations.map(a=>[a.Id,a.TargetMode==='External'?null:a.Target]));
 const sheets=[...workbook.matchAll(/<(?:\w+:)?sheet\b([^>]*?)\/?\s*>/g)].map(m=>{const a=attributes(m[1]),target=targets.get(a['r:id']);if(!target)fail('A worksheet refers to an external or missing part.');const path=target.startsWith('/')?target.slice(1):'xl/'+target;if(path.split('/').includes('..')||!entries.has(path))fail('A worksheet path is not supported.');return {name:a.name,path,hidden:a.state==='hidden'||a.state==='veryHidden'};});
 if(!sheets.length||sheets.length>100)fail('Choose a workbook with 1–100 worksheets.');
 const date1904=/<(?:\w+:)?workbookPr\b[^>]*\bdate1904\s*=\s*["'](?:1|true)["']/i.test(workbook);
 const stylesTarget=relations.find(a=>/\/styles$/.test(a.Type||'')&&a.TargetMode!=='External')?.Target,stylesPath=stylesTarget?(stylesTarget.startsWith('/')?stylesTarget.slice(1):'xl/'+stylesTarget):'xl/styles.xml';
 let strings,kinds;
 async function sheet(name){
  const entry=sheets.find(s=>s.name===name);if(!entry)fail('Choose a worksheet from this workbook.');
  if(!strings){const shared=await read('xl/sharedStrings.xml',true);strings=[...shared.matchAll(/<(?:\w+:)?si\b[^>]*>([\s\S]*?)<\/(?:\w+:)?si>/g)].map(m=>textRuns(m[1]));}
  if(!kinds)kinds=stylesPath.split('/').includes('..')||!entries.has(stylesPath)?[]:styleKinds(await read(stylesPath,true));
  const xml=await read(entry.path),rows=[];let cellCount=0;
  for(const m of xml.matchAll(/<(?:\w+:)?row\b([^>]*)>([\s\S]*?)<\/(?:\w+:)?row>/g)){
   const number=Number(attributes(m[1]).r);if(!Number.isInteger(number)||number<1||number>1048576)fail('A worksheet row has no valid position.');
   const cells=[];
   for(const c of m[2].matchAll(/<(?:\w+:)?c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:\w+:)?c>)/g)){
    const a=attributes(c[1]),body=c[2]||'',loc=/^([A-Z]{1,3})(\d+)$/.exec(a.r||'');if(!loc||Number(loc[2])!==number)fail('A worksheet cell has an invalid address.');
    const column=columnNumber(loc[1]);if(column>WORKBOOK_LIMITS.columns)fail('Import supports up to 128 populated columns.');
    const raw=unescapeXML(body.match(/<(?:\w+:)?v\b[^>]*>([\s\S]*?)<\/(?:\w+:)?v>/)?.[1]||''),formula=unescapeXML(body.match(/<(?:\w+:)?f\b[^>]*>([\s\S]*?)<\/(?:\w+:)?f>/)?.[1]||'');
    let value=a.t==='s'?strings[Number(raw)]:a.t==='inlineStr'?textRuns(body):raw;
    if(value===undefined)fail('A cell refers to a missing shared string.');
    if(value.length>32000)fail('A source cell exceeds the supported 32,000-character limit.');
    if(++cellCount>WORKBOOK_LIMITS.cells)fail('This sheet exceeds the 300,000-cell import limit.');
    const kind=(!a.t||a.t==='n')&&raw!==''&&a.s?kinds[Number(a.s)]:null,shown=kind?serialDate(raw,kind,date1904):null;
    cells.push({address:a.r,column,value:shown??value,type:shown?'d':a.t||'n',...(shown?{raw}:{}),...(a.s?{style:Number(a.s)}:{}),...(formula?{formula}:{} )});
   }
   if(cells.some(c=>c.value!==''||c.formula))rows.push({number,cells});
   if(rows.length>WORKBOOK_LIMITS.rows+100)fail('This worksheet exceeds the 10,000-row intake limit.');
  }
  return {name,rows,cellCount,mergedCells:[...xml.matchAll(/<(?:\w+:)?mergeCell\b([^>]*)\/?\s*>/g)].map(m=>attributes(m[1]).ref),formulaCount:rows.reduce((n,r)=>n+r.cells.filter(c=>c.formula).length,0)};
 }
 return {sheets:sheets.map(({name,hidden})=>({name,hidden})),sheet};
}
export function columnNumber(label){let n=0;for(const c of label)n=n*26+c.charCodeAt(0)-64;return n;}
export function columnLabel(n){let s='';while(n){n--;s=String.fromCharCode(65+n%26)+s;n=Math.floor(n/26);}return s;}
export function unescapeXML(s){return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi,(_,c)=>c[0]==='#'?String.fromCodePoint(c[1].toLowerCase()==='x'?parseInt(c.slice(2),16):Number(c.slice(1))):({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"})[c.toLowerCase()]);}
function attributes(s){return Object.fromEntries([...s.matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(m=>[m[1],unescapeXML(m[2]??m[3])]));}
function textRuns(s){return [...s.matchAll(/<(?:\w+:)?t\b[^>]*>([\s\S]*?)<\/(?:\w+:)?t>/g)].map(m=>unescapeXML(m[1])).join('');}
