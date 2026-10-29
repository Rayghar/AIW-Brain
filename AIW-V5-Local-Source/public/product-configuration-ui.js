// Product-specific facts stay in the existing option editor. Unknown, false and
// zero are distinct; editing an option never silently turns a blank into yes.
import {configurationFieldsFor} from './product-knowledge.js';
import {esc} from './html-escape.js';

export function configurationFieldsHTML(option={}){
 const fields=configurationFieldsFor(option.product),facts=option.configurationFacts||{};
 if(!fields.length)return '<p class="l-note">Record this product’s version, topology and configuration basis above. Reviewed repository claims can supply more specific conditions.</p>';
 const known=fields.filter(f=>Object.hasOwn(facts,f.key)).length;
 return '<details class="tr-configuration-conditions"><summary>Conditions for this product’s mechanisms · '+known+' / '+fields.length+' stated</summary><p class="l-note">Answer for this proposed configuration. Leave unconfirmed facts open. These declarations guide comparison; tests establish the outcome.</p><div class="l-form-grid">'+fields.map(f=>{
  const raw=Object.hasOwn(facts,f.key)?facts[f.key]:'',value=raw&&typeof raw==='object'?raw.value:raw,attrs=' data-tr-config="'+esc(f.key)+'" data-tr-config-type="'+f.type+'"';
  const choices=f.type==='boolean'?[['','Not established'],['true','Yes'],['false','No']]:[['','Not established'],...(f.options||[])];
  const control=f.type==='number'?'<input type="number" min="0" step="1"'+attrs+' value="'+esc(value)+'" placeholder="Not established">':'<select'+attrs+'>'+choices.map(([v,label])=>'<option value="'+esc(v)+'"'+(String(value)===v?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select>';
  return '<label class="l-field"><span>'+esc(f.label)+'</span>'+control+'</label>';
 }).join('')+'</div></details>';
}

export function configurationFactsFromForm(form,previous={}){
 const facts={...previous};
 for(const input of form.querySelectorAll('[data-tr-config]')){
  const key=input.dataset.trConfig,value=input.value.trim(),type=input.dataset.trConfigType;
  if(!value){delete facts[key];continue;}
  if(type==='boolean')facts[key]=value==='true';
  else if(type==='number'){const number=Number(value);if(!Number.isFinite(number)||number<0||!Number.isInteger(number))throw Error('Use a whole non-negative count for '+key+'.');facts[key]=number;}
  else facts[key]=value;
 }
 return Object.keys(facts).length?facts:null;
}

export function configurationFactsHTML(option={}){
 const fields=configurationFieldsFor(option.product),facts=option.configurationFacts||{},rows=Object.entries(facts);
 if(!rows.length)return '';
 return '<dl class="tr-configuration-facts">'+rows.map(([key,raw])=>{
  const f=fields.find(f=>f.key===key),v=raw&&typeof raw==='object'?raw.value:raw,value=typeof v==='boolean'?(v?'Yes':'No'):f?.options?.find(([id])=>id===v)?.[1]??v;
  return '<div><dt>'+esc(f?.label||key)+'</dt><dd>'+esc(value)+'</dd></div>';
 }).join('')+'</dl>';
}
