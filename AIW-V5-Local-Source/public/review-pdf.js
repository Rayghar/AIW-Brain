// A small, offline PDF writer with embedded TrueType glyphs and a ToUnicode map. It preserves original Unicode text
// rather than replacing currencies.
// Round 12 (workstream F; GR-SDD-07, GR-SDD-08): the SDD's document model (review-documents.js documentBlocks) laid out
// on A4 pages: a cover page, a contents with the page of each section and subsection (laid out twice, so the pages the
// contents takes are counted before the numbers are written), headings at every level with an outline (bookmarks) to
// level 3 and links from the contents, every page but the cover numbered in its footer, tables with their header repeated
// on each page, the component table on landscape pages, lists, and the figures the browser drew (JPEG) at the text
// width; a figure that was not drawn (the server draws none) is named where it stands, with its file and digest.
import fontBase64 from './review-font.js';
import {documentBlocks, inlineRuns, contentsEntries} from './review-documents.js';
const bytes=Uint8Array.from(atob(fontBase64),c=>c.charCodeAt(0)),v=new DataView(bytes.buffer),u16=o=>v.getUint16(o),i16=o=>v.getInt16(o),u32=o=>v.getUint32(o),tables={};
for(let i=0;i<u16(4);i++){const o=12+16*i,tag=String.fromCharCode(...bytes.slice(o,o+4));tables[tag]=u32(o+8);}
const units=u16(tables.head+18),metrics=u16(tables.hhea+34),cmap=tables.cmap,sub=[];for(let i=0;i<u16(cmap+2);i++){const o=cmap+4+8*i,at=cmap+u32(o+4);sub.push({format:u16(at),at});}const cmap12=sub.find(t=>t.format===12),cmap4=sub.find(t=>t.format===4);
function glyph(cp){if(cmap12){let low=0,high=u32(cmap12.at+12)-1;while(low<=high){const mid=(low+high)>>1,o=cmap12.at+16+mid*12,start=u32(o),end=u32(o+4);if(cp<start)high=mid-1;else if(cp>end)low=mid+1;else return u32(o+8)+cp-start;}}if(cmap4&&cp<65536){const at=cmap4.at,count=u16(at+6)/2,end=at+14,start=end+count*2+2,delta=start+count*2,range=delta+count*2;for(let i=0;i<count;i++)if(cp<=u16(end+2*i)&&cp>=u16(start+2*i)){const offset=u16(range+2*i);return offset?((u16(range+2*i+offset+2*(cp-u16(start+2*i)))||0)+i16(delta+2*i))&65535:(cp+i16(delta+2*i))&65535;}}return 0;}
const width=g=>u16(tables.hmtx+Math.min(g,metrics-1)*4)/units*1000;
const encode=new TextEncoder(),join=parts=>{const out=new Uint8Array(parts.reduce((n,p)=>n+p.length,0));let at=0;for(const p of parts){out.set(p,at);at+=p.length;}return out;};
const hex=n=>n.toString(16).padStart(4,'0').toUpperCase(),utf16=cp=>cp<=65535?hex(cp):hex(0xD800+((cp-65536)>>10))+hex(0xDC00+((cp-65536)&1023));
const num=x=>(Math.round(x*100)/100).toString();
// A text string for the outline: UTF-16BE with its byte-order mark.
const pdfString=s=>'<FEFF'+[...String(s)].map(c=>utf16(c.codePointAt(0))).join('')+'>';

// The page and its parts (points). A4 portrait; a landscape page turns it.
const A4={w:595.28,h:841.89},MARGIN={left:56,right:56,top:62,bottom:60},SIZE={body:9.5,small:7.8,table:7.6,code:7.4,h:[0,16,13,11.2,10.2,9.8,9.6],title:24};
const LEAD=1.38;

// The glyphs in use, shared by every pass: a character the font lacks prints as "?" (counted, and said on the last page).
function fontUse(){
 const used=new Map(),missing=new Set();
 const cid=c=>{let cp=c.codePointAt(0);let g=glyph(cp);if(!g&&cp!==0&&cp!==32){missing.add(c);cp=63;g=glyph(63);}if(!used.has(cp))used.set(cp,{cid:used.size+1,gid:g,width:width(g)});return used.get(cp);};
 return {used,missing,cid,measure:(s,size)=>{let n=0;for(const c of String(s))n+=cid(c).width;return n*size/1000;},hexOf:s=>[...String(s)].map(c=>hex(cid(c).cid)).join('')};
}
// Runs into lines of at most maxW points: each line a list of segments {text, bold, link, w}.
function wrap(runs,maxW,size,F){
 const words=[];for(const r of runs)for(const part of String(r.text).split(/(\s+)/))if(part)words.push({text:part,bold:!!r.bold,link:r.link||null,space:/^\s+$/.test(part)});
 const lines=[];let line=[],w=0;
 const flush=()=>{while(line.length&&line.at(-1).space)line.pop();lines.push(line);line=[];w=0;};
 for(const t of words){
  if(t.space){if(line.length){const sw=F.measure(' ',size);line.push({...t,text:' ',w:sw});w+=sw;}continue;}
  let tw=F.measure(t.text,size);
  if(w+tw>maxW&&line.length)flush();
  if(tw>maxW){let chunk='';for(const c of t.text){if(F.measure(chunk+c,size)>maxW&&chunk){line.push({...t,text:chunk,w:F.measure(chunk,size)});flush();chunk='';}chunk+=c;}if(chunk){tw=F.measure(chunk,size);line.push({...t,text:chunk,w:tw});w+=tw;}continue;}
  line.push({...t,w:tw});w+=tw;
 }
 if(line.length)flush();
 return lines.length?lines:[[]];
}
const plain=runs=>runs.map(r=>r.text).join('');

// One layout of the blocks, with `reserve` pages kept for the contents. Returns the pages (with their drawing operators,
// images and links), the headings with the page and height each stands at, and the contents pages to fill.
function layout(blocks,{figures,F,reserve}){
 const pages=[],heads=[];let page=null,y=0,W=0,H=0,landscape=false;
 const newPage=(land=landscape,kind='body')=>{landscape=land;W=land?A4.h:A4.w;H=land?A4.w:A4.h;page={w:W,h:H,ops:[],images:new Set(),links:[],kind};pages.push(page);y=H-MARGIN.top;return page;};
 const textW=()=>W-MARGIN.left-MARGIN.right,room=h=>{if(y-h<MARGIN.bottom)newPage();};
 const text=(segs,x,size,base=y)=>{let at=x;for(const s of segs){if(s.text&&!s.space)page.ops.push('BT /F1 '+num(size)+' Tf '+(s.bold?'2 Tr 0.32 w ':'')+'1 0 0 1 '+num(at)+' '+num(base)+' Tm <'+F.hexOf(s.text)+'> Tj'+(s.bold?' 0 Tr':'')+' ET');if(s.link&&s.text.trim())page.links.push({rect:[at,base-2,at+s.w,base+size*0.8],anchor:s.link});at+=s.w;}};
 const lines=(runs,size,{x=MARGIN.left,maxW=textW(),after=4,lead=LEAD}={})=>{for(const l of wrap(runs,maxW,size,F)){room(size*lead);text(l,x,size);y-=size*lead;}y-=after;};
 const head=(b,level,size,{newPageFirst=false}={})=>{
  if(newPageFirst&&y<H-MARGIN.top-1)newPage(landscape);
  room(size*LEAD*3+size);
  const runs=inlineRuns(b.text.replace(/\[\^\d+\]/g,'')).map(r=>({...r,bold:true}));
  heads.push({anchor:b.anchor,level,title:plain(runs),page:pages.length-1,y:y+size});
  y-=size*0.35;lines(runs,size,{after:size*0.45});
 };
 const tableOf=(rows,header,size)=>{
  const cols=Math.max(...rows.map(r=>r.length)),pad=3.2,avail=textW(),cells=rows.map(r=>Array.from({length:cols},(_,j)=>inlineRuns(r[j]||'')));
  const nat=Array(cols).fill(0),minw=Array(cols).fill(0);
  for(const r of cells)r.forEach((c,j)=>{const t=plain(c);nat[j]=Math.max(nat[j],F.measure(t,size)+pad*2);minw[j]=Math.max(minw[j],Math.min(Math.max(0,...t.split(/\s+/).map(w=>F.measure(w,size))),avail/cols)+pad*2);});
  let widths=nat.slice();const total=nat.reduce((a,b)=>a+b,0);
  if(total>avail){const base=minw.reduce((a,b)=>a+b,0);if(base>=avail)widths=minw.map(m=>m*avail/base);else{const extra=avail-base,flex=nat.reduce((n,x,j)=>n+(x-minw[j]),0)||1;widths=nat.map((x,j)=>minw[j]+(x-minw[j])*extra/flex);}}
  const lay=r=>r.map((c,j)=>wrap(header&&r===cells[0]?c.map(x=>({...x,bold:true})):c,widths[j]-pad*2,size,F)),rowH=ls=>Math.max(...ls.map(l=>l.length))*size*LEAD+pad*2;
  const draw=(ls,isHead)=>{const h=rowH(ls);let x=MARGIN.left;if(isHead)page.ops.push('0.91 0.93 0.95 rg '+num(MARGIN.left)+' '+num(y-h)+' '+num(widths.reduce((a,b)=>a+b,0))+' '+num(h)+' re f 0 0 0 rg');ls.forEach((cl,j)=>{let ty=y-pad-size*0.85;for(const l of cl){text(l,x+pad,size,ty);ty-=size*LEAD;}page.ops.push('0.55 w 0.75 0.75 0.75 RG '+num(x)+' '+num(y-h)+' '+num(widths[j])+' '+num(h)+' re S 0 0 0 RG');x+=widths[j];});y-=h;};
  const headLines=header?lay(cells[0]):null;
  if(headLines){room(rowH(headLines)+size*LEAD*2);draw(headLines,true);}
  for(const r of cells.slice(header?1:0)){const ls=lay(r),h=rowH(ls);if(y-h<MARGIN.bottom){newPage(landscape);if(headLines)draw(headLines,true);}draw(ls,false);}
  y-=8;
 };
 let first=true;const contentsPages=[];
 for(const b of blocks){
  if(b.type==='cover'){
   newPage(false,'cover');y=H*0.62;
   for(const c of b.blocks){if(c.type==='heading'){lines(inlineRuns(c.text).map(r=>({...r,bold:true})),SIZE.title,{after:18,lead:1.2});heads.push({anchor:c.anchor,level:0,title:plain(inlineRuns(c.text)),page:0,y:y+SIZE.title});}else if(c.type==='para')lines(inlineRuns(c.text),11,{after:8});}
   continue;
  }
  if(b.type==='note')continue;
  if(!page||page.kind==='cover')newPage(false);
  if(b.type==='contents'){
   if(y<H-MARGIN.top-1)newPage(false);
   for(let k=0;k<reserve;k++){if(k)newPage(false);page.kind='contents';contentsPages.push(pages.length-1);}
   heads.push({anchor:b.anchor,level:1,title:b.title,page:contentsPages[0],y:H-MARGIN.top+SIZE.h[1]});
   newPage(false);continue;
  }
  if(b.type==='landscape'){newPage(b.on);continue;}
  if(b.type==='heading'){head(b,b.level,SIZE.h[b.level],{newPageFirst:b.level===1&&!first});first=false;continue;}
  first=false;
  if(b.type==='para'){lines(inlineRuns(b.text),SIZE.body,{after:5});continue;}
  if(b.type==='list'){for(const [k,item] of b.items.entries()){const mark=b.ordered?(k+1)+'.':'•',indent=b.ordered?16:11;room(SIZE.body*LEAD);text([{text:mark,w:0}],MARGIN.left+2,SIZE.body);lines(inlineRuns(item.replace(/\n/g,' ')),SIZE.body,{x:MARGIN.left+indent,maxW:textW()-indent,after:1.5});}y-=4;continue;}
  if(b.type==='table'){tableOf(b.rows,b.header,landscape?SIZE.table-0.4:SIZE.table);continue;}
  if(b.type==='code'){for(const l of b.lines)lines([{text:l||' '}],SIZE.code,{after:0});y-=6;continue;}
  if(b.type==='figure'){
   const img=figures.get(b.n);
   if(img?.type==='image/jpeg'){let w=textW(),h=w*img.pixelHeight/img.pixelWidth;const max=H-MARGIN.top-MARGIN.bottom-34;if(h>max){h=max;w=h*img.pixelWidth/img.pixelHeight;}room(h+24);page.ops.push('q '+num(w)+' 0 0 '+num(h)+' '+num(MARGIN.left)+' '+num(y-h)+' cm /Im'+b.n+' Do Q');page.images.add(b.n);y-=h+8;lines([{text:b.caption}],SIZE.small,{after:10});}
   else lines([{text:b.caption+' — not drawn in this PDF; the figure is in the HTML, Markdown and Word editions under this name.'}],SIZE.small,{after:10});
   continue;
  }
 }
 return {pages,heads,contentsPages};
}
// How many contents lines a page holds, and the entries a contents lists.
const PER_PAGE=Math.floor((A4.h-MARGIN.top-MARGIN.bottom-SIZE.h[1]*2.2)/(SIZE.body*1.62));
const entriesOf=(blocks,contents)=>contentsEntries(blocks).filter(e=>e.anchor!==contents?.anchor);

// The page each heading stands at (by anchor), as the PDF lays the document out: the Word builder caches them in its
// contents field until Word refreshes it.
export function pdfPageNumbers(markdown,title='Solution design'){
 const blocks=documentBlocks(markdown),F=fontUse(),contents=blocks.find(b=>b.type==='contents'),entries=entriesOf(blocks,contents);let reserve=contents?Math.max(1,Math.ceil(entries.length/PER_PAGE)):0;
 // The same cover page makeReviewPDF adds to a document that has none, so the numbers agree.
 if(!blocks.some(b=>b.type==='cover'))blocks.unshift({type:'cover',blocks:[{type:'heading',level:1,text:title,anchor:'document-title'}]});
 const L=layout(blocks,{figures:new Map(),F,reserve});
 return new Map(L.heads.map(h=>[h.anchor,h.page+1]));
}

// How many pages the PDF of a Markdown text takes with its figures drawn at the sizes given (n -> {type:'image/jpeg',
// pixelWidth, pixelHeight}, no image data needed): the architecture edition keeps its figures within the page bound.
export function pdfPageCount(markdown,title='Solution design',figures=new Map()){
 const blocks=documentBlocks(markdown),F=fontUse(),contents=blocks.find(b=>b.type==='contents'),entries=entriesOf(blocks,contents),reserve=contents?Math.max(1,Math.ceil(entries.length/PER_PAGE)):0;
 if(!blocks.some(b=>b.type==='cover'))blocks.unshift({type:'cover',blocks:[{type:'heading',level:1,text:title,anchor:'document-title'}]});
 return layout(blocks,{figures,F,reserve}).pages.length;
}
export function makeReviewPDF(markdown,title='Architecture review',{figures=new Map()}={}){
 const blocks=documentBlocks(markdown),F=fontUse(),contents=blocks.find(b=>b.type==='contents'),entries=entriesOf(blocks,contents);
 if(!blocks.some(b=>b.type==='cover'))blocks.unshift({type:'cover',blocks:[{type:'heading',level:1,text:title,anchor:'document-title'}]});
 let reserve=contents?Math.max(1,Math.ceil(entries.length/PER_PAGE)):0;const L=layout(blocks,{figures,F,reserve});
 // The contents: each entry with its dotted leader, its page and a link to its heading.
 if(contents){
  const at=new Map(L.heads.map(h=>[h.anchor,h]));let k=0;
  for(const [n,pi] of L.contentsPages.entries()){
   const pg=L.pages[pi];let y=pg.h-MARGIN.top;
   if(!n){pg.ops.push('BT /F1 '+SIZE.h[1]+' Tf 2 Tr 0.32 w 1 0 0 1 '+MARGIN.left+' '+num(y-SIZE.h[1])+' Tm <'+F.hexOf(contents.title)+'> Tj 0 Tr ET');y-=SIZE.h[1]*2.2;}
   for(let row=0;row<PER_PAGE&&k<entries.length;row++,k++){
    const e=entries[k],h=at.get(e.anchor),num1=h?String(h.page+1):'',x=MARGIN.left+(e.level-1)*14,size=SIZE.body,right=pg.w-MARGIN.right,label=e.title.length>95?e.title.slice(0,94)+'…':e.title,lw=F.measure(label,size),nw=F.measure(num1,size),dots=Math.max(0,Math.floor((right-nw-x-lw-8)/F.measure('.',size)));
    y-=size*1.62;
    pg.ops.push('BT /F1 '+size+' Tf '+(e.level===1?'2 Tr 0.3 w ':'')+'1 0 0 1 '+num(x)+' '+num(y)+' Tm <'+F.hexOf(label)+'> Tj'+(e.level===1?' 0 Tr':'')+' ET');
    if(dots)pg.ops.push('BT /F1 '+size+' Tf 0.55 g 1 0 0 1 '+num(x+lw+4)+' '+num(y)+' Tm <'+F.hexOf('.'.repeat(dots))+'> Tj 0 g ET');
    pg.ops.push('BT /F1 '+size+' Tf 1 0 0 1 '+num(right-nw)+' '+num(y)+' Tm <'+F.hexOf(num1)+'> Tj ET');
    if(h)pg.links.push({rect:[x,y-2,right,y+size*0.8],anchor:e.anchor});
   }
  }
 }
 if(F.missing.size){const last=L.pages.at(-1);last.ops.push('BT /F1 7 Tf 1 0 0 1 '+MARGIN.left+' '+(MARGIN.bottom-14)+' Tm <'+F.hexOf(F.missing.size+' characters the embedded font does not cover print as ?; the Word and HTML editions keep them.')+'> Tj ET');}
 // Every page but the cover numbered in its footer.
 const total=L.pages.length;
 L.pages.forEach((pg,i)=>{if(pg.kind==='cover')return;const label=(title.length>80?title.slice(0,79)+'…':title)+' · Page '+(i+1)+' of '+total,w=F.measure(label,7.5);pg.ops.push('BT /F1 7.5 Tf 0.35 g 1 0 0 1 '+num((pg.w-w)/2)+' 30 Tm <'+F.hexOf(label)+'> Tj 0 g ET');});
 // The objects.
 const objects=[null],add=x=>(objects.push(x),objects.length-1),stream=(data,extra='')=>join([encode.encode('<< /Length '+data.length+' '+extra+' >>\nstream\n'),data,encode.encode('\nendstream')]);
 const catalog=add(''),pageTree=add(''),fontFile=add(stream(bytes,'/Length1 '+bytes.length)),descriptor=add(`<< /Type /FontDescriptor /FontName /DejaVuSans /Flags 32 /FontBBox [${[36,38,40,42].map(o=>Math.round(i16(tables.head+o)/units*1000)).join(' ')}] /ItalicAngle 0 /Ascent 928 /Descent -236 /CapHeight 729 /StemV 80 /FontFile2 ${fontFile} 0 R >>`);
 const used=F.used,cidMap=new Uint8Array((used.size+1)*2),widths=[];for(const g of used.values()){cidMap[g.cid*2]=g.gid>>8;cidMap[g.cid*2+1]=g.gid&255;widths.push(Math.round(g.width));}const mapRef=add(stream(cidMap));
 let cm='/CIDInit /ProcSet findresource begin\n12 dict begin\nbegincmap\n/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def\n/CMapName /AIWUnicode def\n/CMapType 2 def\n1 begincodespacerange\n<0000> <FFFF>\nendcodespacerange\n';const pairs=[...used.entries()];for(let i=0;i<pairs.length;i+=100){const group=pairs.slice(i,i+100);cm+=group.length+' beginbfchar\n'+group.map(([cp,g])=>'<'+hex(g.cid)+'> <'+utf16(cp)+'>').join('\n')+'\nendbfchar\n';}cm+='endcmap\nCMapName currentdict /CMap defineresource pop\nend\nend';const unicode=add(stream(encode.encode(cm))),descendant=add(`<< /Type /Font /Subtype /CIDFontType2 /BaseFont /DejaVuSans /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${descriptor} 0 R /CIDToGIDMap ${mapRef} 0 R /W [1 [${widths.join(' ')}]] >>`),font=add(`<< /Type /Font /Subtype /Type0 /BaseFont /DejaVuSans /Encoding /Identity-H /DescendantFonts [${descendant} 0 R] /ToUnicode ${unicode} 0 R >>`);
 const imageRefs=new Map();for(const n of new Set(L.pages.flatMap(p=>[...p.images]))){const img=figures.get(n);imageRefs.set(n,add(join([encode.encode(`<< /Type /XObject /Subtype /Image /Width ${img.pixelWidth} /Height ${img.pixelHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.data.length} >>\nstream\n`),img.data,encode.encode('\nendstream')])));}
 // Page objects are numbered first, so a link and the outline can point at any page.
 const pageRefs=L.pages.map(()=>add('')),dest=h=>'['+pageRefs[h.page]+' 0 R /XYZ 0 '+num(h.y+4)+' 0]',at=new Map(L.heads.map(h=>[h.anchor,h]));
 L.pages.forEach((pg,i)=>{
  const contents=add(stream(encode.encode(pg.ops.join('\n')))),xobjects=pg.images.size?` /XObject << ${[...pg.images].map(n=>'/Im'+n+' '+imageRefs.get(n)+' 0 R').join(' ')} >>`:'';
  const annots=pg.links.filter(l=>at.has(l.anchor)).map(l=>add(`<< /Type /Annot /Subtype /Link /Rect [${l.rect.map(num).join(' ')}] /Border [0 0 0] /Dest ${dest(at.get(l.anchor))} >>`));
  objects[pageRefs[i]]=`<< /Type /Page /Parent ${pageTree} 0 R /MediaBox [0 0 ${num(pg.w)} ${num(pg.h)}] /Resources << /Font << /F1 ${font} 0 R >>${xobjects} >> /Contents ${contents} 0 R${annots.length?' /Annots ['+annots.map(a=>a+' 0 R').join(' ')+']':''} >>`;
 });
 // The outline: the headings to level 3, nested, each opening at its heading.
 const items=L.heads.filter(h=>h.level>=1&&h.level<=3),outlines=add(''),nodes=items.map(h=>({h,ref:add(''),kids:[],parent:null}));
 const stack=[];const root={kids:[],ref:outlines};
 for(const n of nodes){while(stack.length&&stack.at(-1).h.level>=n.h.level)stack.pop();const parent=stack.at(-1)||root;n.parent=parent;parent.kids.push(n);stack.push(n);}
 const countOf=n=>n.kids.length+n.kids.reduce((t,k)=>t+countOf(k),0);
 for(const n of nodes){const sib=n.parent.kids,i=sib.indexOf(n);objects[n.ref]=`<< /Title ${pdfString(n.h.title.length>120?n.h.title.slice(0,119)+'…':n.h.title)} /Parent ${n.parent.ref} 0 R${i>0?' /Prev '+sib[i-1].ref+' 0 R':''}${i<sib.length-1?' /Next '+sib[i+1].ref+' 0 R':''}${n.kids.length?' /First '+n.kids[0].ref+' 0 R /Last '+n.kids.at(-1).ref+' 0 R /Count -'+countOf(n):''} /Dest ${dest(n.h)} >>`;}
 objects[outlines]=`<< /Type /Outlines${root.kids.length?' /First '+root.kids[0].ref+' 0 R /Last '+root.kids.at(-1).ref+' 0 R':''} /Count ${countOf(root)} >>`;
 objects[catalog]=`<< /Type /Catalog /Pages ${pageTree} 0 R /Outlines ${outlines} 0 R /PageMode /UseOutlines >>`;objects[pageTree]=`<< /Type /Pages /Kids [${pageRefs.map(id=>id+' 0 R').join(' ')}] /Count ${pageRefs.length} >>`;
 const info=add(`<< /Title ${pdfString(title)} /Producer (AIW) >>`);
 const chunks=[encode.encode('%PDF-1.7\n%AIW\n')],offsets=[0];let offset=chunks[0].length;for(let i=1;i<objects.length;i++){offsets.push(offset);const data=typeof objects[i]==='string'?encode.encode(objects[i]):objects[i],chunk=join([encode.encode(i+' 0 obj\n'),data,encode.encode('\nendobj\n')]);chunks.push(chunk);offset+=chunk.length;}chunks.push(encode.encode('xref\n0 '+objects.length+'\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n ').join('\n')+'\ntrailer\n<< /Size '+objects.length+' /Root '+catalog+' 0 R /Info '+info+' 0 R >>\nstartxref\n'+offset+'\n%%EOF'));return join(chunks);
}
