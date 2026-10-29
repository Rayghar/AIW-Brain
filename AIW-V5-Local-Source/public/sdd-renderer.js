import {esc as escape} from './html-escape.js';
// What a Markdown line says once its backslash escapes are read (round 12: the SDD escapes pasted markup, GR-SDD-23), and
// the anchor a heading gets (GitHub's rule: lower case, punctuation dropped, spaces as hyphens; a repeat gets -1, -2 …).
// The SDD's contents, the HTML ids, the Word bookmarks and the PDF outline read the same anchors.
export const unescapeMd = v => String(v ?? '').replace(/\\([\\`*_{}[\]()#+\-.!<>|~=])/g, '$1');
export function slugger() {
  const seen = new Map();
  return title => {
    const base = unescapeMd(String(title).replace(/\*\*/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')).toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s/g, '-') || 'section';
    const n = seen.get(base) || 0; seen.set(base, n + 1);
    return n ? base + '-' + n : base;
  };
}
const layerNames={process:'Process',logical:'Logical application',physical:'Application realization',data:'Data',technology:'Technology',interface:'Interfaces',security:'Security',deployment:'Deployment'};
const cell=value=>String(value??'').replace(/\r?\n/g,' ').replace(/\|/g,' / ');
export function architectureRegister(model){
  const {nodes,edges}=model,known=new Map(nodes.map(n=>[n.id,n]));
  return '## Connected model register\n\n'+nodes.length+' objects · '+edges.length+' relationships. Object references identify the same records in the live explorer.\n\n| Reference | Layer | Object | Responsibility / purpose |\n| --- | --- | --- | --- |\n'+nodes.map(n=>'| '+[n.ref||n.id,layerNames[n.layer]||n.layer,n.title,n.description].map(cell).join(' | ')+' |').join('\n')+'\n\n### Model relationships\n\n| From | Relationship | To |\n| --- | --- | --- |\n'+edges.map(e=>'| '+[known.get(e.from)?.ref||e.from,e.label||e.kind,known.get(e.to)?.ref||e.to].map(cell).join(' | ')+' |').join('\n')+'\n\n';
}
function words(text,max=29){const lines=[''];for(const word of String(text||'').split(/\s+/)){const i=lines.length-1;if(lines[i]&&(lines[i]+' '+word).length>max)lines.push(word);else lines[i]+=(lines[i]?' ':'')+word;}return lines.slice(0,2).map((line,i)=>line.slice(0,max)+(i===1&&lines.length>2?'…':''));}
function diagram(model,chosen,title,index){
  const position=new Map(),lanes=[];let y=34;
  for(const layer of Object.keys(layerNames)){
    const list=chosen.filter(n=>n.layer===layer);if(!list.length)continue;
    lanes.push({y,label:layerNames[layer]});y+=20;
    list.forEach((n,i)=>position.set(n.id,{x:22+(i%4)*204,y:y+Math.floor(i/4)*86}));y+=Math.ceil(list.length/4)*86+29;
  }
  const relations=model.edges.filter(e=>position.has(e.from)&&position.has(e.to));
  const marker='arrow-'+index;
  return '<figure class="model-figure"><figcaption>'+escape(title)+'</figcaption><svg viewBox="0 0 844 '+y+'" role="img" aria-label="'+escape(title)+'"><defs><marker id="'+marker+'" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 L7 3.5 L0 7 Z" fill="#6d8877"/></marker></defs>'+lanes.map(l=>'<text class="lane" x="22" y="'+l.y+'">'+escape(l.label.toUpperCase())+'</text>').join('')+relations.map(e=>{const a=position.get(e.from),b=position.get(e.to),down=a.y!==b.y,x1=a.x+92,y1=a.y+(a.y<b.y?64:0),x2=b.x+92,y2=b.y+(a.y<b.y?0:64);return '<path d="'+(down?'M'+x1+' '+y1+' C'+x1+' '+((y1+y2)/2)+','+x2+' '+((y1+y2)/2)+','+x2+' '+y2:'M'+(a.x+184)+' '+(a.y+32)+' L'+b.x+' '+(b.y+32))+'" fill="none" stroke="#99ad9c" stroke-width="1.2" marker-end="url(#'+marker+')"><title>'+escape(e.from+' '+(e.label||e.kind)+' '+e.to)+'</title></path>';}).join('')+chosen.map(n=>{const p=position.get(n.id);return '<g><rect x="'+p.x+'" y="'+p.y+'" width="184" height="64" rx="7" fill="#fffef8" stroke="#a8bba7"/><text class="ref" x="'+(p.x+10)+'" y="'+(p.y+16)+'">'+escape(n.ref||n.id)+'</text>'+words(n.title).map((line,i)=>'<text class="node-label" x="'+(p.x+10)+'" y="'+(p.y+33+i*15)+'">'+escape(line)+'</text>').join('')+'<title>'+escape(n.title+' · '+n.description)+'</title></g>';}).join('')+'</svg><p class="figure-note">Arrows show saved relationships between the objects on this page. The complete relationship register includes links across pages and views.</p></figure>';
}
function atlas(model){
  if(!model?.nodes.length)return '<section><h2 id="model-atlas">Architecture atlas</h2><p>No model objects have been created yet. The chapter registers retain the current brief and open findings.</p></section>';
  const views=[['Application responsibilities',['process','logical','physical']],['Contracts & information',['physical','interface','data']],['Technology support',['physical','technology']],['Protection & operation',['physical','security','deployment']]];
  let index=0;return '<section><h2 id="model-atlas">Architecture atlas</h2><p>Four perspectives of the same saved model. References connect these diagrams to the chapter registers; no architecture is inferred from the page layout.</p>'+views.map(([title,layers])=>{
    const nodes=model.nodes.filter(n=>layers.includes(n.layer)).sort((a,b)=>layers.indexOf(a.layer)-layers.indexOf(b.layer));if(!nodes.length)return '';
    const pages=Math.ceil(nodes.length/12);return Array.from({length:pages},(_,page)=>diagram(model,nodes.slice(page*12,page*12+12),title+(pages>1?' · '+(page+1)+' / '+pages:''),++index)).join('');
  }).join('')+'</section>';
}
// The SDD's figures (sdd-figures.js): the reviewed standard diagrams, each placed where the document discusses it —
// where the Markdown carries the figure (sdd-document.js), else under its chapter's register — with its caption, its
// text alternative and its SHA-256, and listed with the manifest in the Architecture figures section. Without figures
// the document keeps the connected-model atlas.
function figureHTML(f){return '<figure class="model-figure notation-figure" id="figure-'+f.n+'" data-scene="'+escape(f.scene)+'" data-sha256="'+escape(f.sha256)+'"><figcaption>'+escape(f.caption)+'</figcaption>'+f.svg+'<details class="figure-text"><summary>Read Figure '+f.n+' as text</summary><pre>'+escape(f.text)+'</pre></details><p class="figure-note">Drawn from the saved records by the same model, arrangement and renderer as the chapter Diagram; positions are a projection, never facts. SHA-256 '+escape(f.sha256)+'.</p></figure>';}
function figuresSection(set,placed){
 const list=set.figures,rows=list.map(f=>'<tr><td><a href="#figure-'+f.n+'">Figure '+f.n+'</a></td><td>'+f.chapter+'</td><td>'+escape(f.title)+'<br><small>'+escape(f.standard)+'</small></td><td>'+f.elements+' / '+f.relationships+'</td><td><code>'+escape(f.path)+'</code></td><td><code>'+escape(f.sha256)+'</code><br><small>'+f.bytes+' bytes</small></td></tr>').join('');
 const loose=list.filter(f=>!placed.has(f.n)).map(figureHTML).join('');
 return '<section><h2 id="model-atlas">Architecture figures</h2><p>'+list.length+' standard diagram'+(list.length===1?'':'s')+' drawn from the saved records, each placed where the document discusses it. The manifest gives each figure’s file name and SHA-256 and the fingerprint of the document they were drawn from, so a recipient can verify the figures they were sent.</p>'+(list.length?'<div class="table-wrap"><table class="figure-manifest"><thead><tr><th scope="col">Figure</th><th scope="col">Chapter</th><th scope="col">Picture</th><th scope="col">Elements / relationships</th><th scope="col">File</th><th scope="col">SHA-256</th></tr></thead><tbody>'+rows+'</tbody></table></div><p class="figure-note">Document fingerprint (SHA-256 of the canonical source document): <code>'+escape(set.documentFingerprint||'')+'</code> · schema '+escape(set.schema||'')+'</p>':'')+(set.omitted?.length?'<p class="figure-note">Not drawn, because nothing is recorded for them yet: '+set.omitted.map(o=>escape(o.title+' (Chapter '+o.chapter+')')).join(', ')+'.</p>':'')+loose+'</section>';
}
// A provenance note's reference ([^n], sdd-document.js) becomes a link to the note; everything else stays escaped text.
const inline=text=>{
 const kept=String(text??'').replace(/\\([\\`*_{}[\]()#+\-.!<>|~=])/g,'\uE001$1\uE002');
 return escape(kept).replace(/\[\^(\d+)\]/g,'<sup class="fn-ref"><a href="#fn-$1">$1</a></sup>').replace(/\*\*([^*\uE001]+?)\*\*/g,'<strong>$1</strong>').replace(/\[([^\]\uE001]+)\]\((#[\p{L}\p{N}_-]+)\)/gu,'<a href="$2">$1</a>').replace(/[\uE001\uE002]/g,'');
};
const FIGURE_LINE=/^<figure id="figure-(\d+)"/,NOTE_LINE=/^\[\^(\d+)\]: (.*)$/,COMMENT=/^<!--.*-->$/,MANIFEST='<!-- aiw:figure-manifest -->';
// The Mermaid edition (round 6, Contract F) is for Markdown readers: this rendering draws the SVG figures and refuses
// a figure set written as Mermaid, or a Markdown text that carries its figures as Mermaid blocks (sdd-document.js).
const MERMAID_EDITION=/^\*\*Figure \d+ · [^\n]*\*\*\n\n```mermaid\n/m;
export function renderSDD(markdown,model,{figures=null}={}){
 if(figures?.code==='mermaid'||MERMAID_EDITION.test(String(markdown??'')))throw Error('The HTML edition draws the SVG figures; the Mermaid figures are for the Markdown edition (format=md&figures=mermaid).');
  const lines=String(markdown).split('\n'),sections=[],placed=new Set(),slug=slugger();let html='',blocks=0;
  for(let i=0;i<lines.length;){
    const line=lines[i];if(!line.trim()){i++;continue;}
    // A figure the Markdown carries is drawn from the figure set by its number; its inline SVG is never passed through.
    const figure=FIGURE_LINE.exec(line);
    if(figure){const n=Number(figure[1]),sha=/data-sha256="([0-9a-f]{64})"/.exec(line)?.[1]||'';let j=i+1;while(j<lines.length&&lines[j]!=='</figure>')j++;i=j+1;blocks++;
      const f=figures?.figures?.find(x=>x.n===n&&!placed.has(x.n));
      if(f){placed.add(n);html+=figureHTML(f)+(sha&&sha!==f.sha256?'<p class="figure-note">This rendering draws Figure '+n+' again from the records it was drawn from; the copy kept in the Markdown, SHA-256 '+escape(sha)+', is the one the document holds.</p>':'');}
      else html+='<p class="figure-note">Figure '+n+' is kept in the Markdown edition'+(sha?' (SHA-256 '+escape(sha)+')':'')+'; this rendering does not draw it.</p>';
      continue;}
    const note=NOTE_LINE.exec(line);
    if(note){html+='<p class="footnote" id="fn-'+note[1]+'"><sup>'+note[1]+'</sup> '+escape(note[2])+'</p>';i++;continue;}
    // A marker the SDD writes for its other formats (cover, contents, landscape) is no text; the figure manifest goes where it says.
    if(COMMENT.test(line.trim())){if(line.trim()===MANIFEST)html+=MANIFEST;i++;continue;}
    // Headings at every level, h1 to h6, each with the anchor the contents links to (GR-SDD-07).
    const heading=line.match(/^(#{1,6})\s+(.+)$/);
    if(heading){const level=heading[1].length,label=heading[2],id=slug(label.replace(/\[\^\d+\]/g,''));html+='<h'+level+' id="'+escape(id)+'">'+inline(label)+'</h'+level+'>';if(level<3)sections.push({id,label:unescapeMd(label.replace(/\[\^\d+\]/g,'').replace(/\*\*/g,'')),level});i++;continue;}
    if(line.startsWith('|')&&/^\|[\s:|\-]+\|\s*$/.test(lines[i+1]||'')){
      const split=l=>l.trim().replace(/^\||\|$/g,'').split(/(?<!\\)\|/).map(c=>c.trim().replace(/\\\|/g,'|'));
      const heads=split(line);html+='<div class="table-wrap"><table><thead><tr>'+heads.map(c=>'<th scope="col">'+escape(c)+'</th>').join('')+'</tr></thead><tbody>';i+=2;
      while(i<lines.length&&lines[i].startsWith('|')){html+='<tr>'+split(lines[i++]).map(c=>'<td>'+inline(c)+'</td>').join('')+'</tr>';}
      html+='</tbody></table></div>';continue;
    }
    // A list is built item by item, a continuation line joining its item, so the document is never copied per line.
    if(line.startsWith('- ')){const items=[];while(i<lines.length&&(/^- |^  /.test(lines[i]))){if(lines[i].startsWith('- '))items.push(inline(lines[i++].slice(2)));else{items[items.length-1]+='<br>'+inline(lines[i++].trim());}}html+='<ul>'+items.map(x=>'<li>'+x+'</li>').join('')+'</ul>';continue;}
    if(/^\d+\. /.test(line)){const items=[];while(i<lines.length&&/^\d+\. /.test(lines[i]))items.push(inline(lines[i++].replace(/^\d+\. /,'')));html+='<ol>'+items.map(x=>'<li>'+x+'</li>').join('')+'</ol>';continue;}
    const block=[];while(i<lines.length&&lines[i].trim()&&!/^#{1,6} |^\|/.test(lines[i])&&!FIGURE_LINE.test(lines[i])&&!NOTE_LINE.test(lines[i])&&!COMMENT.test(lines[i].trim()))block.push(lines[i++]);if(!block.length)block.push(lines[i++]);html+='<p>'+inline(block.join('\n'))+'</p>';
  }
  let modelSection;
  if(figures&&Array.isArray(figures.figures)){
   // Without figure blocks in the Markdown (a baseline frozen before round 5), each figure stands under its chapter's
   // register heading; the rest go to the figures section.
   if(!blocks)html=html.replace(/(<h1 id="[^"]*">Chapter (\d+) — [^<]*<\/h1>)/g,(all,h,ch)=>{const mine=figures.figures.filter(f=>String(f.chapter)===ch&&!placed.has(f.n));for(const f of mine)placed.add(f.n);return h+mine.map(figureHTML).join('');});
   modelSection=figuresSection(figures,placed);
  }else modelSection=atlas(model);
  html=html.includes(MANIFEST)?html.replace(MANIFEST,modelSection).split(MANIFEST).join(''):html.includes('Connected model register</h2>')?html.replace(/(<h2[^>]*>Connected model register<\/h2>)/,modelSection+'$1'):html+modelSection;
  const title=unescapeMd(lines.find(l=>l.startsWith('# '))?.slice(2)||'Solution Design Document');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>'+escape(title)+' · AIW</title><style>'+styles+'</style></head><body><header class="document-brand"><b>aiw <small>V5</small></b><span>Private architecture record</span></header><div class="document-layout"><nav class="contents" aria-label="Document contents"><p>IN THIS DOCUMENT</p><a href="#model-atlas">'+(figures?'Architecture figures':'Architecture atlas')+'</a>'+sections.map(s=>'<a class="level-'+s.level+'" href="#'+s.id+'">'+escape(s.label)+'</a>').join('')+'</nav><main><aside class="print-note">Preview of saved records. Use Output for the matching Markdown, HTML, Word or PDF edition. Printing this preview does not change its assumptions or review status.</aside>'+html+'</main></div></body></html>';
}
const styles=`*{box-sizing:border-box}body{margin:0;background:#eff0e6;color:#294538;font:14px/1.75 system-ui,sans-serif}.document-brand{max-width:1350px;margin:auto;padding:22px 30px;display:flex;justify-content:space-between;border-bottom:1px solid #d5ddca}.document-brand b{font-size:27px;letter-spacing:-1px}.document-brand small{font-size:10px;letter-spacing:0}.document-brand>span{font-size:11px;align-self:center}.document-layout{max-width:1350px;display:grid;grid-template-columns:245px minmax(0,1fr);gap:26px;margin:26px auto;padding:0 30px}.contents{position:sticky;top:20px;align-self:start;max-height:calc(100vh - 40px);overflow:auto;padding-right:18px;font-size:11px}.contents>p{font-size:9px;letter-spacing:1.8px;color:#7d875e}.contents a{display:block;color:#527045;padding:5px 0;text-decoration:none;line-height:1.5}.contents a:hover{text-decoration:underline}.contents .level-1{font-weight:650;margin-top:10px}main{min-width:0;padding:42px;background:#fffef8;border:1px solid #dce2d1;border-radius:8px}h1,h2,h3,h4,h5,h6{font-family:Georgia,serif;font-weight:400;line-height:1.3;break-after:avoid}h4{font-size:17px;font-weight:600;margin-top:22px}h5,h6{font-size:15px;font-weight:600;margin-top:18px}h1{font-size:29px;border-top:2px solid #a08b51;padding-top:25px;margin-top:45px}h2{font-size:25px;margin-top:35px}h3{font-size:20px;margin-top:27px}p,li{overflow-wrap:anywhere;white-space:pre-wrap}p{margin:14px 0}li{margin:7px 0}ul{padding-left:23px}.print-note{font-size:11px;border-left:2px solid #bca369;padding:8px 14px;color:#748063;margin-bottom:30px}.table-wrap{overflow:auto;margin:20px 0}table{width:100%;border-collapse:collapse;font-size:11px;line-height:1.6}th,td{text-align:left;vertical-align:top;padding:10px;border:1px solid #d7decd;min-width:90px;overflow-wrap:anywhere}th{background:#edf0e4;font-weight:600}tbody tr:nth-child(even){background:#f9faf3}.model-figure{margin:25px 0;break-inside:avoid;border:1px solid #dbe2cf;border-radius:7px;padding:18px;background:#f7f9f0}figcaption{font-size:13px;font-weight:600;margin-bottom:10px}.model-figure > svg{width:100%;height:auto;display:block;min-width:0}.lane{font:9px system-ui;letter-spacing:1.5px;fill:#647557}.ref{font:9px system-ui;fill:#8c7c50}.node-label{font:11px system-ui;fill:#254638}.figure-note{font-size:10px;line-height:1.6;color:#75816b;margin:10px 0 0}.figure-text{font-size:11px;margin-top:8px}.figure-text summary{cursor:pointer}.figure-text pre{white-space:pre-wrap;font:11px/1.55 system-ui,sans-serif;background:#fffef8;border:1px solid #dbe2cf;border-radius:6px;padding:8px;max-height:320px;overflow:auto}.figure-manifest code{font-size:9px;overflow-wrap:anywhere}.footnote{font-size:11px;line-height:1.55;margin:4px 0;color:#4f5d48}.fn-ref{font-size:9px;line-height:0}.fn-ref a{color:#7d6a37;text-decoration:none;padding:0 1px}@media print{.figure-text{display:none}}@media(max-width:850px){.document-layout{display:block;padding:0 15px}.contents{position:static;max-height:190px;border:1px solid #ccd8c0;border-radius:6px;padding:15px;margin-bottom:20px}main{padding:25px}.model-figure{padding:8px;overflow:auto}.model-figure > svg{min-width:640px}.document-brand{padding:18px}h1{font-size:25px}}@media print{body{background:white;font-size:10pt}.document-brand{padding:0 0 15px}.document-layout{display:block;margin:0;padding:0}.contents,.print-note{display:none}main{padding:0;border:0}h1{break-before:page}h1:first-child{break-before:auto}.table-wrap{overflow:visible}table{font-size:8pt}thead{display:table-header-group}tr{break-inside:avoid}.model-figure{break-inside:avoid}.model-figure > svg{min-width:0;max-height:210mm}@page{size:A4;margin:17mm}}`;
