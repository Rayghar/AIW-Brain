// Chapters own their guidance and actions. The workbench owns their presentation.
let surface=null,dialogDepth=0;
export function registerAssistantSurface(present){surface=present;}
export function presentAssistant(kind,title,body){
 if(!['sol','mind'].includes(kind)||!surface||dialogDepth||document.querySelector('dialog[open]'))return false;
 return surface({kind,title,body})===true;
}
// Existing guided tasks adopt a chapter dialog while they are being edited.
export function withAssistantDialog(open){dialogDepth++;try{return open();}finally{dialogDepth--;}}
