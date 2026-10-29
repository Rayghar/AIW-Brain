const preferenceKey='aiw-workspace-preferences-v1';
export function cursorPreference(fallback=true){
 try{const saved=JSON.parse(localStorage.getItem(preferenceKey)||'{}');return typeof saved.cursor==='boolean'?saved.cursor:fallback;}catch{return fallback;}
}
export function saveCursorPreference(cursor){
 try{localStorage.setItem(preferenceKey,JSON.stringify({cursor}));}catch{/* Keep the current session usable. */}
}
