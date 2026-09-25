import {projectURL} from './project-context.js';
export function createProjectStore(){
  let current=null,status='saved';
  function announce(value){status=value;if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('aiw:save',{detail:{status}}));}
  async function request(path,options){
    const response=await fetch(projectURL(path),{credentials:'same-origin',...options});let data;
    try{data=await response.json()}catch{throw Error('Project storage returned an unexpected response. Your input is still here.')}
    if(!response.ok){const error=new Error(data.error||'The project could not be saved.');error.conflict=response.status===409;throw error}
    return data;
  }
  const store={get value(){return current},get status(){return status},async load(){try{current=await request('/api/project');if(typeof window!=='undefined')window.aiwCurrentProject=current.document;announce('saved');return current}catch(error){announce('error');throw error}},async command(command){if(typeof window!=='undefined'&&window.aiwReviewOrdinaryChange){command=await window.aiwReviewOrdinaryChange(current?.document,command);if(!command)throw Error('The change was not applied. Your input is retained.');}if(!current)throw Error('Open your project first.');announce('saving');try{const result=await request('/api/commands',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:current.revision,command})});current=result;if(typeof window!=='undefined')window.aiwCurrentProject=current.document;announce('saved');return result}catch(error){announce('error');throw error}}};
  if(typeof window!=='undefined')window.aiwProjectStore=store;
  return store;
}
