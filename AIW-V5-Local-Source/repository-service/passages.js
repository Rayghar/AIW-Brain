// Deterministic passage segmentation for documentation files. A passage is an exact, inclusive,
// 1-based line range of the original text; its excerpt is those lines joined with LF, CR retained,
// exactly as the Site slices a stored source (knowledge-governance.js). Nothing is normalised.
export const DOC_EXTENSIONS=['md','mdx','markdown','txt','text','adoc','asciidoc','rst'];
const KIND={md:'markdown',mdx:'markdown',markdown:'markdown',adoc:'asciidoc',asciidoc:'asciidoc',rst:'rst',txt:'text',text:'text'};
export const formatOf=path=>KIND[String(path).split('/').at(-1).split('.').at(-1)?.toLowerCase()]||null;

// Passages stay well inside the contract (≤100 lines) and the Site's claim excerpt limit (12,000 chars).
const TARGET_LINES=28,TARGET_CHARS=2200,MAX_LINES=60,MAX_CHARS=4000,LONG_LINE=12000,MIN_CONTENT=24,MAX_PASSAGES=400;
const blank=s=>!s.trim();
const atx=/^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*\r?$/;
const setext=/^ {0,3}(=+|-+)[ \t]*\r?$/;
const adocTitle=/^(={1,6})[ \t]+(\S.*?)\r?$/;
const rstRule=/^([=\-~^"'`#*+:.<>_])\1{2,}[ \t]*\r?$/;
const clean=s=>s.replace(/\r$/,'').trim().slice(0,180);

function frontMatter(lines,kind){
 if(kind!=='markdown')return {end:0,title:''};
 const open=lines[0]?.replace(/\r$/,'').trim();if(open!=='---'&&open!=='+++')return {end:0,title:''};
 for(let i=1;i<Math.min(lines.length,400);i++){const t=lines[i].replace(/\r$/,'').trim();if(t===open||(open==='---'&&t==='...')){
  const title=lines.slice(1,i).map(l=>/^title\s*[:=]\s*(.+?)\s*\r?$/i.exec(l)?.[1]).find(Boolean)||'';
  return {end:i+1,title:title.replace(/^["']|["']$/g,'').slice(0,180)};}}
 return {end:0,title:''};
}

// Returns {title, passages:[{lineStart,lineEnd,heading}]}. Headings start passages and stay in them.
export function segment(text,path){
 const kind=formatOf(path)||'text',lines=text.split('\n'),fm=frontMatter(lines,kind),out=[],stack=[];
 let title=fm.title,fence=null,cur=null;
 const headingPath=()=>stack.map(h=>h.text).filter(Boolean).join(' › ').slice(0,240);
 const close=()=>{
  if(!cur)return;let a=cur.start,b=cur.end;while(a<=b&&blank(lines[a]))a++;while(b>=a&&blank(lines[b]))b--;
  if(a<=b){const body=lines.slice(a,b+1).join('\n');if(body.replace(/\s+/g,'').length>=MIN_CONTENT&&body.length<=LONG_LINE)out.push({lineStart:a+1,lineEnd:b+1,heading:cur.heading});}
  cur=null;
 };
 const heading=(level,textValue)=>{close();while(stack.length&&stack.at(-1).level>=level)stack.pop();stack.push({level,text:clean(textValue)});if(!title&&level===1)title=clean(textValue);};
 for(let i=fm.end;i<lines.length&&out.length<MAX_PASSAGES;i++){
  const line=lines[i],t=line.replace(/\r$/,'');
  if(t.length>LONG_LINE){close();continue;}
  // Fenced or delimited blocks are kept as text but never split into headings.
  const fenceMark=kind==='markdown'?/^ {0,3}(`{3,}|~{3,})/.exec(t)?.[1]:kind==='asciidoc'?/^(-{4,}|\.{4,})\s*$/.exec(t)?.[1]:null;
  if(fence){if(fenceMark&&fenceMark[0]===fence[0]&&fenceMark.length>=fence.length)fence=null;}
  else if(fenceMark)fence=fenceMark;
  else if(kind==='markdown'){
   const m=atx.exec(t);if(m){heading(m[1].length,m[2]||'');cur={start:i,end:i,chars:t.length,heading:headingPath()};continue;}
   if(!blank(t)&&setext.test(lines[i+1]?.replace(/\r$/,'')||'')&&!/^ {0,3}([-*+]|\d+[.)])\s/.test(t)&&!setext.test(t)){heading(lines[i+1].trim()[0]==='='?1:2,t);cur={start:i,end:i+1,chars:t.length,heading:headingPath()};i++;continue;}
  }
  else if(kind==='asciidoc'){const m=adocTitle.exec(t);if(m){heading(m[1].length,m[2]);cur={start:i,end:i,chars:t.length,heading:headingPath()};continue;}}
  else if(kind==='rst'&&!blank(t)&&!rstRule.test(t)){
   const u=lines[i+1]?.replace(/\r$/,'')||'';
   if(rstRule.test(u)&&u.trim().length>=t.trim().length){const level=({'=':1,'-':2,'~':3,'^':4}[u.trim()[0]])||5;heading(level,t);cur={start:i,end:i+1,chars:t.length,heading:headingPath()};i++;continue;}
  }
  if(!cur){if(blank(t))continue;cur={start:i,end:i,chars:0,heading:headingPath()};}
  if(!fence&&blank(t)&&(cur.end-cur.start+1>=TARGET_LINES||cur.chars>=TARGET_CHARS)){close();continue;}
  cur.end=i;cur.chars+=t.length+1;
  if(cur.end-cur.start+1>=MAX_LINES||cur.chars>=MAX_CHARS)close();
 }
 close();
 if(!title)title=String(path).split('/').at(-1).slice(0,180);
 return {title,passages:out};
}
