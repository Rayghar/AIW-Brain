// Word and PDF files of the SDD (round 5, Contract E; round 12, workstream F: GR-SDD-07, GR-SDD-08). One document model
// for every format: the Markdown the export route serves, read here into blocks (documentBlocks: the cover, the contents,
// headings at every level with the anchors the HTML gives them, paragraphs with bold, links and escapes, lists, tables,
// the landscape section the component table stands in, figures, code) that the Word builder below and the PDF writer
// (review-pdf.js) both lay out. Word gets a real contents field (the headings to level 3, refreshed when Word opens the
// file, cached here with the PDF's page numbers), heading styles to level 6 with a bookmark on each heading, a footer
// with the page field, the landscape section, and figures at page width. Both are built in the browser from the Output
// tab's form, where the figures the Markdown carries as inline SVG are drawn on a canvas (PNG for Word, JPEG for the
// PDF), and on the server by the export route (format=docx, format=pdf), where Word embeds each figure as its vector SVG
// and the PDF names each figure where it stands with its file and digest: the offline PDF writer draws no SVG.
import {unescapeMd, slugger} from './sdd-renderer.js';
const filename=p=>'AIW_'+p.name.replace(/[^A-Za-z0-9_-]+/g,'_').slice(0,100);
const EDITIONS=['executive','architecture'],AUDIENCES=['all','delivery','review'];
const unescapeXML=s=>String(s).replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,'&');
// The edition and audience chosen in the Output tab (review-ui.js export form); the architecture edition for everyone otherwise.
export function exportChoice(root=typeof document==='undefined'?null:document){
 const form=root?.activeElement?.closest?.('form.rv-export-form')||root?.querySelector?.('form.rv-export-form'),pick=(name,ok,fallback)=>{const v=form?.elements?.[name]?.value;return ok.includes(v)?v:v==='full'&&name==='edition'?'architecture':fallback;};
 return {edition:pick('edition',EDITIONS,'architecture'),audience:pick('audience',AUDIENCES,'all')};
}
// The figures a Markdown edition carries (sdd-document.js figureBlock): number, SVG, caption and the SHA-256 it declares.
export function figureBlocks(markdown){
 const lines=String(markdown).split('\n'),out=[];
 for(let i=0;i<lines.length;i++){
  const m=/^<figure id="figure-(\d+)"/.exec(lines[i]);if(!m)continue;
  const body=[];let j=i+1;while(j<lines.length&&lines[j]!=='</figure>')body.push(lines[j++]);
  const at=body.findIndex(l=>l.startsWith('<figcaption>'));
  out.push({n:Number(m[1]),sha256:/data-sha256="([0-9a-f]{64})"/.exec(lines[i])?.[1]||'',svg:body.slice(0,at<0?body.length:at).join('\n'),caption:at<0?'Figure '+m[1]:unescapeXML(body[at].replace(/^<figcaption>|<\/figcaption>$/g,'')),start:i,end:j});
  i=j;
 }
 return out;
}

// ---------------------------------------------------------------- the document model
// A paragraph's words as runs: {text, bold, link (an anchor), note (a provenance note's number)}; escapes read back.
export function inlineRuns(text){
 const s=String(text??''),out=[];let bold=false,buf='';
 const push=()=>{if(buf)out.push({text:buf,bold});buf='';};
 for(let i=0;i<s.length;){
  const c=s[i];
  if(c==='\\'&&i+1<s.length&&/[\\`*_{}[\]()#+\-.!<>|~=]/.test(s[i+1])){buf+=s[i+1];i+=2;continue;}
  if(c==='*'&&s[i+1]==='*'){push();bold=!bold;i+=2;continue;}
  if(c==='['){
   const note=/^\[\^(\d+)\]/.exec(s.slice(i));if(note){push();out.push({text:note[1],bold,note:note[1]});i+=note[0].length;continue;}
   const link=/^\[((?:\\.|[^\]\\])+)\]\((#[^)\s]+)\)/.exec(s.slice(i));if(link){push();out.push({text:unescapeMd(link[1]).replace(/\*\*/g,''),bold,link:link[2].slice(1)});i+=link[0].length;continue;}
  }
  if(c==='`'){i++;continue;}
  buf+=c;i++;
 }
 push();
 return out;
}
// The blocks of a Markdown edition, in order. A heading carries its anchor (the HTML's, sdd-renderer.js slugger); a cover
// holds its own blocks; the contents and the landscape section are markers the SDD writes as HTML comments.
export function documentBlocks(markdown,slug=slugger()){
 const lines=String(markdown??'').split('\n'),out=[];let i=0;
 const stop=l=>!l.trim()||/^#{1,6}\s/.test(l)||/^<!--.*-->$/.test(l.trim())||/^<figure id="figure-/.test(l)||/^```/.test(l.trim())||/^- /.test(l)||/^\d+\. /.test(l)||/^\[\^\d+\]: /.test(l)||(l.startsWith('|')&&true);
 while(i<lines.length){
  const line=lines[i],t=line.trim();
  if(!t){i++;continue;}
  if(t==='<!-- aiw:cover -->'){const body=[];i++;while(i<lines.length&&lines[i].trim()!=='<!-- aiw:/cover -->')body.push(lines[i++]);i++;out.push({type:'cover',blocks:documentBlocks(body.join('\n'),slug)});continue;}
  if(t==='<!-- aiw:contents -->'){const at=out.length&&out.at(-1).type==='heading'&&/^Contents$/i.test(unescapeMd(out.at(-1).text))?out.pop():null;while(i<lines.length&&lines[i].trim()!=='<!-- aiw:/contents -->')i++;i++;out.push({type:'contents',title:at?unescapeMd(at.text):'Contents',anchor:at?.anchor||slug('Contents')});continue;}
  if(t==='<!-- aiw:landscape -->'||t==='<!-- aiw:/landscape -->'){out.push({type:'landscape',on:t==='<!-- aiw:landscape -->'});i++;continue;}
  if(/^<!--.*-->$/.test(t)){i++;continue;}
  const fig=/^<figure id="figure-(\d+)"/.exec(line);
  if(fig){let j=i+1;while(j<lines.length&&lines[j]!=='</figure>')j++;const cap=lines.slice(i+1,j).find(l=>l.startsWith('<figcaption>'));out.push({type:'figure',n:Number(fig[1]),caption:cap?unescapeXML(cap.replace(/^<figcaption>|<\/figcaption>$/g,'')):'Figure '+fig[1]});i=j+1;continue;}
  if(t.startsWith('```')){const body=[];i++;while(i<lines.length&&!lines[i].trim().startsWith('```'))body.push(lines[i++]);i++;out.push({type:'code',lines:body});continue;}
  const h=/^(#{1,6})\s+(.+)$/.exec(line);
  if(h){out.push({type:'heading',level:h[1].length,text:h[2],anchor:slug(h[2].replace(/\[\^\d+\]/g,''))});i++;continue;}
  const note=/^\[\^(\d+)\]: (.*)$/.exec(line);
  if(note){out.push({type:'note',n:note[1],text:note[2]});i++;continue;}
  if(line.startsWith('|')){
   const split=l=>l.trim().replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(c=>c.trim());const rows=[];let header=false;
   while(i<lines.length&&lines[i].startsWith('|')){if(/^\|[\s:|-]+\|\s*$/.test(lines[i])){header=true;i++;continue;}rows.push(split(lines[i++]));}
   out.push({type:'table',rows,header});continue;
  }
  if(/^- /.test(line)||/^\d+\. /.test(line)){
   const ordered=/^\d+\. /.test(line),items=[];
   while(i<lines.length&&(ordered?/^\d+\. /.test(lines[i]):/^- /.test(lines[i])||/^ {2}\S/.test(lines[i])&&items.length)){if(/^ {2}\S/.test(lines[i])&&!ordered)items[items.length-1]+='\n'+lines[i++].trim();else items.push(lines[i++].replace(ordered?/^\d+\. /:/^- /,''));}
   out.push({type:'list',ordered,items});continue;
  }
  const para=[line.trim()];i++;while(i<lines.length&&!stop(lines[i]))para.push(lines[i++].trim());
  out.push({type:'para',text:para.join(' ')});
 }
 return out;
}
// The headings a contents lists (levels 1 and 2 below the cover), in order.
export const contentsEntries=blocks=>blocks.filter(b=>b.type==='heading'&&b.level<=2).map(b=>({title:unescapeMd(b.text.replace(/\*\*/g,'').replace(/\[\^\d+\]/g,'')),level:b.level,anchor:b.anchor}));

// ---------------------------------------------------------------- figures drawn in the browser
// One figure on a canvas: the SVG as an image, on white, at up to one and a half times its size and at most 1,500 pixels
// wide (about 230 dots an inch across a Word or PDF page).
async function rasterise(svg,type){
 const size=k=>Number(new RegExp('^<svg[^>]*?\\s'+k+'="([\\d.]+)"').exec(svg)?.[1])||0,width=size('width')||1200,height=size('height')||800,scale=Math.min(1.5,1500/width),pixelWidth=Math.max(1,Math.round(width*scale)),pixelHeight=Math.max(1,Math.round(height*scale));
 const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 try{
  const img=new Image();img.src=url;await img.decode();
  const canvas=document.createElement('canvas');canvas.width=pixelWidth;canvas.height=pixelHeight;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,pixelWidth,pixelHeight);ctx.drawImage(img,0,0,pixelWidth,pixelHeight);
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('the canvas produced no image')),type,.85));
  return {type,width,height,pixelWidth,pixelHeight,data:new Uint8Array(await blob.arrayBuffer())};
 }finally{URL.revokeObjectURL(url);}
}
export async function rasteriseFigures(markdown,type='image/png'){
 const out=new Map();if(typeof document==='undefined'||typeof Image==='undefined'||typeof URL?.createObjectURL!=='function')return out;
 for(const f of figureBlocks(markdown)){try{out.set(f.n,await rasterise(f.svg,type));}catch(e){console.warn('Figure '+f.n+' could not be drawn for the document: '+(e?.message||e));}}
 return out;
}
// The figures a server embeds in Word: each figure's own SVG, as a vector picture at its drawn size (no canvas there).
export function vectorFigures(markdown){
 const out=new Map();
 for(const f of figureBlocks(markdown)){const size=k=>Number(new RegExp('^<svg[^>]*?\\s'+k+'="([\\d.]+)"').exec(f.svg)?.[1])||0,w=size('width')||1200,h=size('height')||800;out.set(f.n,{type:'image/svg+xml',width:w,height:h,pixelWidth:w,pixelHeight:h,svg:f.svg});}
 return out;
}
// A one-pixel white PNG: the fallback picture Word requires beside an SVG, shown only by a reader that cannot draw SVG.
const BLANK_PNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=';
const bytesOf=b64=>typeof Buffer!=='undefined'?Uint8Array.from(Buffer.from(b64,'base64')):Uint8Array.from(atob(b64),c=>c.charCodeAt(0));

// ---------------------------------------------------------------- Word
// pages: the PDF writer's page numbers for the contents' cached entries (Word refreshes them when it opens the file).
export async function makeReviewDOCX(markdown,title,{figures=new Map(),pages=null}={}){
 const {Document,Packer,Paragraph,TextRun,HeadingLevel,Table,TableRow,TableCell,WidthType,BorderStyle,ImageRun,FootnoteReferenceRun,TableOfContents,Footer,PageNumber,PageOrientation,Bookmark,InternalHyperlink,AlignmentType}=await import('./vendor-docx.js');
 const blocks=documentBlocks(markdown),notes=new Map(),footnotes={};let footnoteId=0;
 for(const b of blocks)if(b.type==='note')notes.set(b.n,b.text);
 const runs=(text,style={})=>inlineRuns(text).map(r=>{
  if(r.note&&notes.has(r.note)){footnotes[++footnoteId]={children:[new Paragraph(unescapeMd(notes.get(r.note)))]};return new FootnoteReferenceRun(footnoteId);}
  const run=new TextRun({text:r.text,color:'000000',...(r.bold?{bold:true}:{}),...style});
  return r.link?new InternalHyperlink({anchor:r.link,children:[new TextRun({text:r.text,color:'1F4E79',underline:{},...style})]}):run;
 });
 const border={style:BorderStyle.SINGLE,size:4,color:'BFBFBF'};
 const table=(rows,header,size)=>{const max=Math.max(...rows.map(r=>r.length));return new Table({width:{size:100,type:WidthType.PERCENTAGE},borders:{top:border,bottom:border,left:border,right:border,insideHorizontal:border,insideVertical:border},rows:rows.map((row,i)=>new TableRow({tableHeader:header&&i===0,cantSplit:true,children:Array.from({length:max},(_,j)=>new TableCell({margins:{top:60,bottom:60,left:90,right:90},shading:header&&i===0?{fill:'E9EEF1'}:undefined,children:[new Paragraph({children:runs(row[j]||'',{...(header&&i===0?{bold:true}:{}),size})})]}))}))});};
 const PORTRAIT={width:11906,height:16838},margin={top:1080,bottom:1080,left:1020,right:1020},textWidth=landscape=>(landscape?PORTRAIT.height:PORTRAIT.width)-margin.left-margin.right;
 const footer=()=>({default:new Footer({children:[new Paragraph({alignment:AlignmentType.CENTER,children:[new TextRun({text:title+' · Page ',size:16,color:'555555'}),new TextRun({children:[PageNumber.CURRENT],size:16,color:'555555'}),new TextRun({text:' of ',size:16,color:'555555'}),new TextRun({children:[PageNumber.TOTAL_PAGES],size:16,color:'555555'})]})]})});
 const sections=[];let children=[],landscape=false;
 const close=(opts={})=>{if(!children.length&&!opts.force)return;sections.push({properties:{page:{size:{...PORTRAIT,orientation:landscape?PageOrientation.LANDSCAPE:PageOrientation.PORTRAIT},margin}},footers:opts.cover?undefined:footer(),children});children=[];};
 const picture=(n,caption)=>{const img=figures.get(n),max=textWidth(landscape)/15;
  if(!img)return [new Paragraph({children:[new TextRun({text:caption+' — not drawn in this Word file; the figure is in the HTML and Markdown editions under this name.',italics:true,size:17,color:'333333'})],spacing:{after:220}})];
  const s=Math.min(max/img.width,(((landscape?PORTRAIT.width:PORTRAIT.height)-margin.top-margin.bottom)/15-40)/img.height),transformation={width:Math.round(img.width*s),height:Math.round(img.height*s)},alt={name:'Figure '+n,title:caption,description:caption};
  const run=img.svg?new ImageRun({type:'svg',data:new TextEncoder().encode(img.svg),fallback:{type:'png',data:bytesOf(BLANK_PNG)},transformation,altText:alt}):new ImageRun({type:'png',data:img.data,transformation,altText:alt});
  return [new Paragraph({keepNext:true,children:[run]}),new Paragraph({children:[new TextRun({text:caption,italics:true,size:17,color:'333333'})],spacing:{after:220}})];};
 // The library numbers every bookmark 1 (it makes an id counter per bookmark), and Word wants each bookmark's id unique:
 // each is renumbered here, in document order.
 let bookmarks=0;const bookmark=(id,children)=>{const b=new Bookmark({id,children}),n=++bookmarks;for(const part of [b.start,b.end])for(const x of part.root)if(x?.root&&typeof x.root==='object'&&'id' in x.root)x.root.id=n;return b;};
 const heading=(b,first)=>new Paragraph({heading:HeadingLevel['HEADING_'+b.level],keepNext:true,pageBreakBefore:b.level===1&&!first,children:[bookmark(b.anchor,runs(b.text.replace(/\[\^\d+\]/g,'')))]});
 const cover=blocks.find(b=>b.type==='cover');
 if(cover){for(const b of cover.blocks){if(b.type==='heading')children.push(new Paragraph({heading:HeadingLevel.TITLE,children:runs(b.text)}));else if(b.type==='para')children.push(new Paragraph({spacing:{after:160},children:runs(b.text,{size:24})}));}close({cover:true});}
 else children.push(new Paragraph({text:title,heading:HeadingLevel.TITLE}));
 let firstHeading=!cover;
 for(const b of blocks){
  if(b.type==='cover'||b.type==='note')continue;
  if(b.type==='contents'){const entries=contentsEntries(blocks).filter(e=>e.anchor!==b.anchor);children.push(new Paragraph({heading:HeadingLevel.HEADING_2,children:[bookmark(b.anchor,[new TextRun(b.title)])]}));children.push(new TableOfContents(b.title,{hyperlink:true,headingStyleRange:'1-2',cachedEntries:entries.map(e=>({title:e.title,level:e.level,page:pages?.get?.(e.anchor),href:e.anchor}))}));firstHeading=false;continue;}
  if(b.type==='landscape'){close();landscape=b.on;continue;}
  if(b.type==='heading'){children.push(heading(b,firstHeading));firstHeading=false;continue;}
  if(b.type==='para'){children.push(new Paragraph({children:runs(b.text),spacing:{after:100,line:260}}));continue;}
  if(b.type==='list'){for(const [k,item] of b.items.entries())children.push(new Paragraph({...(b.ordered?{}:{bullet:{level:0}}),children:b.ordered?[new TextRun({text:(k+1)+'. ',color:'000000'}),...runs(item.replace(/\n/g,' '))]:runs(item.replace(/\n/g,' ')),spacing:{after:60}}));continue;}
  if(b.type==='table'){children.push(table(b.rows,b.header,landscape?15:17));children.push(new Paragraph(''));continue;}
  if(b.type==='figure'){children.push(...picture(b.n,b.caption));continue;}
  if(b.type==='code'){for(const l of b.lines)children.push(new Paragraph({children:[new TextRun({text:l,font:'Consolas',size:16})]}));continue;}
 }
 close({force:!sections.length});
 const document=new Document({creator:'AIW',title,description:'Solution design document, assembled by rule from the saved records',features:{updateFields:true},footnotes,styles:{default:{document:{run:{font:'Calibri',size:21,color:'000000'},paragraph:{spacing:{after:100}}}},paragraphStyles:[{id:'Title',name:'Title',basedOn:'Normal',run:{size:48,color:'000000',bold:true},paragraph:{spacing:{before:2400,after:400}}},...['Heading1','Heading2','Heading3','Heading4','Heading5','Heading6'].map((id,i)=>({id,name:'heading '+(i+1),basedOn:'Normal',next:'Normal',quickFormat:true,run:{color:'000000',bold:true,size:[32,27,24,22,21,21][i],...(i>=4?{italics:true}:{})},paragraph:{keepNext:true,spacing:{before:[360,280,220,180,160,160][i],after:120},outlineLevel:i}}))]},sections});
 return typeof window==='undefined'?Packer.toBuffer(document):Packer.toBlob(document);
}
// The Word or PDF file of the working SDD: the Markdown from the export route, its figures drawn here, the file saved.
// `urlFor` makes a route the tab's project's (project-context.js projectURL, which the caller holds): this module is
// also the server's Word writer (worker.js), so it reads nothing of the tab's address itself.
export async function exportReviewDocument(p,format,choice=exportChoice(),urlFor=path=>path){
 // choice.annex 'figures': the figures annex (Appendix D), every figure of section 5 drawn, as Word or PDF.
 const {edition,audience}=choice,annex=choice.annex==='figures',response=await fetch(urlFor(annex?'/api/export?chapter=11&annex=figures&format=md':'/api/export?chapter=11&format=md&edition='+edition+'&audience='+audience),{credentials:'same-origin'});
 if(!response.ok)throw Error('The SDD could not be prepared for the '+(format==='docx'?'Word':'PDF')+' file. Your saved project is unchanged.');
 const markdown=await response.text(),pdf=await import('./review-pdf.js');
 const figures=await rasteriseFigures(markdown,format==='docx'?'image/png':'image/jpeg'),title=p.name+' Solution Design'+(annex?' — figures annex':edition==='executive'?' — executive edition':'');
 const bytes=format==='docx'?await makeReviewDOCX(markdown,title,{figures,pages:pdf.pdfPageNumbers(markdown,title)}):pdf.makeReviewPDF(markdown,title,{figures});
 const blob=bytes instanceof Blob?bytes:new Blob([bytes],{type:format==='docx'?'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename(p)+(annex?'_Figures_Annex':'_Working_SDD'+(edition==='executive'?'_Executive':'')+(audience==='delivery'?'_Delivery':audience==='review'?'_Review':''))+'.'+format;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 return {format,edition,audience,bytes:blob.size,figures:figureBlocks(markdown).length,drawn:figures.size,filename:a.download};
}
