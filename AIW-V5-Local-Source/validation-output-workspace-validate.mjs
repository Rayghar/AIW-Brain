// Presentation integration against every native chapter adapter. No provider,
// network, approval or saved-project command is needed to inspect a workspace.
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
const w=new Window({url:'https://aiw.test/?chapter=1&tab=validate',settings:{disableIframePageLoading:true,disableCSSFileLoading:true}});
for(const k of ['window','document','history','location','localStorage','CustomEvent','Event','FormData','Node','Element','HTMLElement','MutationObserver','navigator','CSS'])Object.defineProperty(globalThis,k,{value:k==='window'?w:w[k],configurable:true,writable:true});
for(const k of ['matchMedia','getComputedStyle','requestAnimationFrame','cancelAnimationFrame'])globalThis[k]=w[k].bind(w);
const {seedProject}=await import('./public/requirements-domain.js');
const {withFinalReview}=await import('./public/review-domain.js');
const {createProject}=await import('./shared/projects-domain.js');
const {mountValidate,mountOutput,leaveValidate,leaveOutput,modelIntegrityCounts}=await import('./public/validate-view.js');
const {outputStage}=await import('./public/output-documents.js');
const {outputWorkspaceHTML}=await import('./public/output-workspace.js');
const constructors=[['requirements','Requirements'],['quality','Quality'],['decisions','Decisions'],['logical-ui','Logical'],['realisation-ui','Realisation'],['technology-ui','Technology'],['technology-realisation-ui','TechnologyRealisation'],['interfaces-ui','Interfaces'],['security-ui','Security'],['runtime-ui','Runtime'],['review-ui','Review']];
let commands=0,asserted=0,promptFolds=0;
try{
  for(const fixture of ['populated','blank']){
    const p=fixture==='populated'?withFinalReview(seedProject()):withFinalReview(createProject({name:'Workspace test',template:'blank'},'workspace-test'));
    const before=JSON.stringify(p),store={value:{document:p,revision:1},command:async()=>{commands++;throw Error('Presentation tests must not save');}};window.aiwProjectStore=store;
    for(let chapter=1;chapter<=11;chapter++){
      history.replaceState({},'','/?chapter='+chapter+'&tab=validate');
      const [file,name]=constructors[chapter-1],{['create'+name+'Studio']:create}=await import('./public/'+file+'.js'),studio=create(store);
      const state={chapter,tab:'validate',selected:null,visible:[],focus:false,zoom:1,pan:{x:0,y:0}};
      studio.bind({state,getNode:()=>null,render(){},persist(){},toast(){},setTab(tab){state.tab=tab;},setChapter(){},selectNode(id){state.selected=id;},hideTip(){},refreshSimulation(){}});
      document.body.innerHTML='<div class="studio"><div class="stage tab-content">'+studio.validation()+'</div></div>';
      mountValidate({chapter});
      assert.equal(document.querySelectorAll('[data-validation-workspace]').length,1,fixture+' C'+chapter+': one explicit validation composition');
      assert.equal(document.querySelectorAll('.vx-head,.vx-causes,.vx-group').length,0,'No legacy layered summary or findings tables');
      assert(document.querySelector('#vx-sdd'),'SDD passage reading remains accessible');
      // rc41 close (W4: Chapter 8's words): a list of findings says each explanation once; a later item with the same
      // explanation shows its status, record and title, and its explanation is the selected finding's in full.
      {const items=[...document.querySelectorAll('.validation-queue .validation-item')],said=items.map(b=>b.querySelector('small')?.textContent).filter(Boolean);
        assert.equal(new Set(said).size,said.length,fixture+' C'+chapter+': no explanation is repeated down the queue');
        if(items.length)assert(items[0].querySelector('small'),'the first finding says its explanation');
        if(fixture==='populated'&&chapter===8)assert(items.length>said.length,'Chapter 8’s queue holds findings that share an explanation');}
      const queue=document.querySelector('.validation-queue'),selection=queue.querySelector('[data-validation-select]');
      if(selection){selection.click();assert(document.querySelector('.validation-detail h3'));assert(document.querySelector('.validation-detail-actions button,.validation-detail-actions a'),'Native remedy remains actionable');}
      document.querySelector('[data-validation-filter="gaps"]').click();
      assert([...document.querySelectorAll('.validation-item')].every(b=>b.classList.contains('gaps')),'Gap filter does not mix review items');
      document.querySelector('[data-validation-filter="all"]').click();
      const search=document.querySelector('[data-validation-search]');search.value='no such finding zz999';search.dispatchEvent(new Event('input',{bubbles:true}));assert.equal(document.querySelectorAll('.validation-item').length,0,'Search filters the actual queue');document.querySelector('[data-validation-reset]').click();
      if(chapter===11){
        const finalCount=document.querySelector('.validation-queue-heading b').textContent;
        assert.notEqual(finalCount,'0 findings','Fixture has final checks to recover after a set switch');
        document.querySelector('[data-validation-set="source"]').click();
        const source=document.querySelector('[data-validation-source]');
        assert(source,'Inherited findings retain source-chapter filtering');
        assert([...source.options].some(o=>o.value==='4'),'Fixture includes Chapter 4 source findings');
        source.value='4';source.dispatchEvent(new Event('change',{bubbles:true}));
        assert(document.querySelectorAll('.validation-item').length>0,'Chapter 4 filter returns actual inherited findings');
        assert([...document.querySelectorAll('.validation-item-meta')].every(el=>el.textContent.includes('Ch 4 ·')),'Source filter limits inherited findings to Chapter 4');
        document.querySelector('[data-validation-set="final"]').click();
        assert.equal(document.querySelector('[data-validation-source]'),null,'Source filter is not a control in final checks');
        assert.equal(document.querySelector('.validation-queue-heading b').textContent,finalCount,'Inherited Chapter 4 filter cannot hide final checks');
        assert(document.querySelector('.validation-detail-actions button,.validation-detail-actions a'),'Final remedy is available after returning from filtered inherited findings');
        document.querySelector('[data-validation-set="source"]').click();
        assert.equal(document.querySelector('[data-validation-source]').value,'all','A set switch resets its source-only filter');
        document.querySelector('[data-validation-set="final"]').click();
      }
      // rc41 close (W4: screens-at-size): the models' further prompts are drawn when their fold opens, a page at a time.
      {for(let i=0;i<300&&document.querySelector('.vx-obs')?.hidden!==false;i++)await new Promise(r=>setTimeout(r,10));
        const more=document.querySelector('.vx-obs .vx-prompts-more');
        if(more){const n=Number(more.querySelector('summary').textContent.match(/Show all ([\d,]+) prompts/)[1].replace(/,/g,'')),rest=()=>more.querySelectorAll('ul > li').length;
          assert.equal(rest(),0,'a closed fold draws none of its prompts');more.open=true;more.dispatchEvent(new Event('toggle'));
          assert.equal(rest(),Math.min(50,n-8),'opened, it draws the next page');
          for(let i=0;i<10&&more.querySelector('[data-vx-prompts-page]');i++)more.querySelector('[data-vx-prompts-page]').click();
          assert.equal(rest(),n-8,'Show more draws the rest');assert.equal(more.querySelector('[data-vx-prompts-page]'),null);promptFolds++;}}
      if(chapter===4&&fixture==='populated'){
        // rc41 close (C20): the Model integrity item says each count in its number, on the strip and in its description.
        assert.equal(modelIntegrityCounts(0,1,1),'0 structural · 1 relationship type · 1 prompt');
        assert.equal(modelIntegrityCounts(1,0,2),'1 structural · 0 relationship types · 2 prompts');
        assert.equal(modelIntegrityCounts(1400,12,1),'1,400 structural · 12 relationship types · 1 prompt');
        document.querySelector('[data-vx-lens-view="model"]').click();
        for(let i=0;i<300&&document.querySelector('.vx-model-panel')?.dataset.ready!=='1';i++)await new Promise(r=>setTimeout(r,10));
        const said=[...document.querySelectorAll('.vx-model-summaries b')].map(b=>Number(b.textContent.replace(/,/g,'')));
        assert.equal(said.length,3,'the panel counts structural findings, relationship types and prompts');
        assert.equal(document.querySelector('.vx-switch [data-chapter-strip-item="model"] .chapter-strip-count').textContent,modelIntegrityCounts(...said),'the strip item reads the panel’s own counts');
        assert(document.querySelector('.vx-switch [data-vx-lens-view="model"]').getAttribute('aria-description').endsWith(' · '+modelIntegrityCounts(...said)),'and its description says them the same way');
        document.querySelector('[data-vx-lens-view="sdd"]').click();
      }
      leaveValidate();state.tab='output';history.replaceState({},'','/?chapter='+chapter+'&tab=output');
      document.body.innerHTML='<div class="studio"><div class="stage tab-content">'+studio.output()+'</div></div>';mountOutput({chapter});
      assert.equal(document.querySelectorAll('[data-output-workspace]').length,1,'One explicit Output composition');
      assert(document.querySelector('.output-source-panel .output-passages'),'Output retains SDD contributions');
      assert(document.querySelector('.output-handoff-panel button'),'Native handoff remains present');
      const documentButtons=[...document.querySelectorAll('[data-output-document]')],strips=document.querySelectorAll('.chapter-strip[data-chapter-strip="output"]');
      assert.equal(strips.length,1,'One chapter strip holds the documents (rc41, W2)');assert.equal(document.querySelector('[data-output-select]'),null,'The mobile picker is retired: the strip scrolls sideways on a phone');
      assert.deepEqual([...strips[0].querySelectorAll('.chapter-strip-item > button[data-output-document]')].map(b=>b.dataset.outputDocument),documentButtons.map(b=>b.dataset.outputDocument),'Every document button is an item of the one strip, in order');
      const currentItems=()=>[...strips[0].querySelectorAll('.chapter-strip-item[data-chapter-strip-current]')];
      assert.equal(currentItems().length,1,'Exactly one document is current');assert.equal(currentItems()[0].querySelector('[data-output-document]').getAttribute('aria-pressed'),'true','The current item holds the pressed button');
      documentButtons.at(-1).click();
      assert.equal(document.querySelector('[data-output-document][aria-pressed="true"]').dataset.outputDocument,documentButtons.at(-1).dataset.outputDocument,'Choosing a document presses its button');
      assert.equal(currentItems().length,1);assert.equal(currentItems()[0].dataset.chapterStripItem,documentButtons.at(-1).dataset.outputDocument,'The current item follows the choice');assert.equal(documentButtons.at(-1).getAttribute('aria-current'),'true','and carries aria-current');
      const stage=outputStage(p,chapter),available=stage.now.filter(d=>!d.perRecord);
      for(const d of available){const b=document.querySelector('[data-output-document="'+d.id+'"]');assert(b,'Every available artifact has a selector: '+d.id);b.click();if(d.preview){assert(document.querySelector('iframe.output-inline-preview'),'Selected HTML document has a real inline preview');assert.match(document.querySelector('iframe').getAttribute('src'),/\/api\/export\?/);}for(const format of d.formats){if(d.id==='sdd')assert(document.querySelector('form.rv-export-form'),'SDD retains edition/audience and format form');else if(d.pack)assert(document.querySelector('[data-vx-madr]'));else assert([...document.querySelectorAll('.output-formats a')].some(a=>a.href.includes('format='+format)),'Format retained: '+format);}}
      if(chapter===5&&fixture==='populated'){
        // rc41 close (C5): the component specifications are ONE item of the strip; the component is chosen inside the
        // document, so the strip keeps a few items whatever the count and the primary stays near.
        const ids=p.realisation.components.map(c=>c.id),specItems=[...strips[0].querySelectorAll('[data-output-document]')].filter(b=>b.dataset.outputDocument.startsWith('spec'));
        assert.deepEqual(specItems.map(b=>b.dataset.outputDocument),['spec'],'One strip item holds every component specification');
        specItems[0].click();assert.equal(specItems[0].getAttribute('aria-pressed'),'true');assert.equal(currentItems()[0].dataset.chapterStripItem,'spec','The specifications item is current');
        const pick=()=>document.querySelector('.output-document select[data-output-record="spec"]');
        assert(pick(),'The chosen document offers its component');
        assert.deepEqual([...pick().options].map(o=>o.value).sort(),ids.map(id=>'spec:'+id).sort(),'Every component specification can be selected');
        assert.equal([...pick().options].length,ids.length);
        const first=pick().value.slice(5);assert(ids.includes(first));assert.match(document.querySelector('iframe').src,new RegExp('document=spec&id='+encodeURIComponent(first)+'&'));
        const last=[...pick().options].at(-1).value;pick().value=last;pick().dispatchEvent(new Event('change',{bubbles:true}));
        assert.equal(pick().value,last,'The choice holds');assert.match(document.querySelector('iframe').src,new RegExp('document=spec&id='+encodeURIComponent(last.slice(5))+'&'),'The preview follows the chosen component');
        assert([...document.querySelectorAll('.output-formats a')].every(a=>a.href.includes('id='+encodeURIComponent(last.slice(5)))),'Its downloads are the chosen component’s');
        assert.equal(document.querySelector('[data-output-document="spec"]').getAttribute('aria-pressed'),'true','The item stays current while a component is chosen');
        documentButtons[0].click();document.querySelector('[data-output-document="spec"]').click();assert.equal(pick().value,last,'Coming back to the specifications opens the component chosen last');
        assert.equal(document.querySelectorAll('.output-source-panel [data-out-preview]').length,0,'Source records do not duplicate the document toolbar');
        // At size: forty components make the same strip, the forty in the document's choice.
        const many=structuredClone(p),c0=many.realisation.components[0];for(let i=many.realisation.components.length;i<40;i++)many.realisation.components.push({...structuredClone(c0),id:'scale-'+i,ref:'APP-9'+String(i).padStart(2,'0'),title:'Scale component '+i});
        const items=html=>{const t=document.createElement('template');t.innerHTML=html;return t.content;},big=items(outputWorkspaceHTML(many,5)),small=items(outputWorkspaceHTML(p,5));
        assert.equal(big.querySelectorAll('.chapter-strip-item').length,small.querySelectorAll('.chapter-strip-item').length,'Forty components do not add strip items');
        assert(big.querySelectorAll('.chapter-strip-item').length<=6,'The strip stays a few items');
      }
      if(chapter===11){document.querySelector('[data-output-document="sdd"]').click();const edition=document.querySelector('[name="edition"]');edition.value='executive';edition.dispatchEvent(new Event('change',{bubbles:true}));assert.match(document.querySelector('iframe').src,/edition=executive/);document.querySelector('[data-output-document="frozen"]').click();assert.match(document.querySelector('.output-document').textContent,/No frozen baseline selected/);assert(document.querySelector('[data-rv-action="baseline"]'),'Freeze workflow is preserved separately');document.querySelector('[data-output-document="sdd"]').click();assert.equal(document.querySelector('[name="edition"]').value,'executive','Edition choice survives document switches');}
      assert.equal(JSON.stringify(p),before,'Read-only UI interactions do not alter saved design');
      leaveOutput();studio.dispose();asserted++;
    }
  }
  assert(promptFolds>0,'a chapter folds further model prompts, drawn on open');
  assert.equal(commands,0,'No confirmation, approval, check stamp or handoff is synthesized');
  console.log('PASS: '+asserted+' native chapter/fixture combinations; single compositions; ranked selection, filters/search, C11 source/final split; actual preview URLs, all available formats, component selectors, SDD options, sources and handoff; no saved mutations.');
}finally{await w.happyDOM.close();}
