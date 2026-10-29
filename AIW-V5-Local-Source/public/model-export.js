// Export the visible instrument, including HTML tables/cards, without changing saved facts.
// Standard notation exports remain available in the Diagram toolbar.
const properties = ['display','position','left','top','right','bottom','width','height','min-width','min-height','max-width','max-height','padding','margin','gap','grid-template-columns','grid-template-rows','flex-direction','flex-wrap','align-items','justify-content','box-sizing','overflow','background-color','color','border','border-radius','font-family','font-size','font-weight','line-height','text-align','white-space','word-break','transform','transform-origin','opacity','fill','stroke','stroke-width','stroke-dasharray'];
export function modelExportName(chapter, view, extension) { return `aiw-chapter-${Number(chapter) || 'model'}-${String(view || 'view').replace(/[^a-z0-9-]/gi, '-')}-visible.${extension}`; }
function save(blob, name) { const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
export function visibleModelMarkup(root) {
  const host = root.classList.contains('nt-sheet-on') ? root.querySelector('.cm-sheet') : root.classList.contains('dk-table') ? root.querySelector('.dk-sheet') : root.querySelector('.cm-stage');
  if (!host || !host.clientWidth || !host.clientHeight) throw Error('Open a model view before exporting it.');
  const clone = host.cloneNode(true), originals = [host, ...host.querySelectorAll('*')], copies = [clone, ...clone.querySelectorAll('*')];
  if (originals.length > 12000) throw Error('This view is too large for a visible export. Narrow its scope or use the standard Diagram export.');
  originals.forEach((el, i) => { const copy = copies[i], style = getComputedStyle(el); for (const attr of [...copy.attributes]) if (/^on/i.test(attr.name)) copy.removeAttribute(attr.name); copy.setAttribute('style', properties.map(k => `${k}:${style.getPropertyValue(k)}`).join(';')); if (el instanceof HTMLInputElement) copy.setAttribute('value', el.value); });
  const width = Math.ceil(host.clientWidth), height = Math.ceil(host.clientHeight);
  clone.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml'); clone.style.cssText += `;position:relative;left:0;top:0;margin:0;width:${width}px;height:${height}px;overflow:hidden;transform:none`;
  // The snapshot depicts the same scroll window as the displayed sheet.
  if (host.scrollTop || host.scrollLeft) { const inner = document.createElement('div'); inner.style.transform = `translate(${-host.scrollLeft}px,${-host.scrollTop}px)`; while (clone.firstChild) inner.append(clone.firstChild); clone.append(inner); }
  return {width, height, html: new XMLSerializer().serializeToString(clone)};
}
export async function exportVisibleModel(root, format) {
  const {width, height, html} = visibleModelMarkup(root), chapter = root.dataset.chapter || new URL(location.href).searchParams.get('chapter'), view = root.querySelector('.cm-view[aria-pressed="true"]')?.dataset.id || 'view';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>AIW visible model view; displayed scope and filters only; not evidence of implementation.</title><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
  if (format === 'html') { save(new Blob([`<!doctype html><meta charset="utf-8"><title>AIW visible model view</title><p>Visible view snapshot; displayed scope and filters only. Not an implementation measurement.</p>${html}`], {type: 'text/html;charset=utf-8'}), modelExportName(chapter, view, 'html')); return; }
  if (format === 'svg') { save(new Blob([svg], {type: 'image/svg+xml;charset=utf-8'}), modelExportName(chapter, view, 'svg')); return; }
  const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  const img = new Image(); await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(Error('The browser could not render this view as PNG. Use SVG or View HTML.')); img.src = url; }); const canvas = document.createElement('canvas'); canvas.width = width * 2; canvas.height = height * 2; const g = canvas.getContext('2d'); g.scale(2, 2); g.fillStyle = '#fff'; g.fillRect(0, 0, width, height); g.drawImage(img, 0, 0); const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); if (!blob) throw Error('PNG export is unavailable in this browser. Use SVG or View HTML.'); save(blob, modelExportName(chapter, view, 'png'));
}
