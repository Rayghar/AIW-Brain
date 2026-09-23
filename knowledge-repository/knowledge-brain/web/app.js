"use strict";
const $ = id => document.getElementById(id);
const state = {view: "library", catalog: null, pages: [], selected: null, limit: 40};
function element(tag, text, cls) {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (cls) node.className = cls;
  return node;
}
function paragraph(parent, text, cls) { parent.append(element("p", text, cls)); }
function field(parent, key, value) {
  parent.append(element("dt", key), element("dd", value || "Not supplied"));
}
function excerpt(text) { return text.length > 165 ? text.slice(0, 165) + "…" : text; }
function sourceURL(p) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(p.repository) || !/^[a-f0-9]{40}([a-f0-9]{24})?$/.test(p.revision) || !p.path) return null;
  if (p.path.split("/").some(part => part === ".." || part === ".")) return null;
  return "https://github.com/" + p.repository + "/blob/" + p.revision + "/" + p.path.split("/").map(encodeURIComponent).join("/");
}
function selectRecord(item) {
  state.selected = item.id;
  const panel = $("detail"); panel.replaceChildren();
  paragraph(panel, "DISCOVERY RECORD · NOT APPROVED", "eyebrow");
  panel.append(element("h2", item.title));
  paragraph(panel, item.text || "This record contains metadata only. Read the referenced material before drawing conclusions.");
  const dl = element("dl"); panel.append(dl);
  field(dl, "Record ID", item.recordId);
  field(dl, "Record type", item.kind);
  field(dl, "Repository", item.provenance.repository);
  field(dl, "Source path", item.provenance.path);
  field(dl, "Revision", item.provenance.revision);
  field(dl, "Passage location", [item.provenance.heading, item.provenance.structuralRange].filter(Boolean).join(" · "));
  field(dl, "Passage hash", item.provenance.excerptHash);
  field(dl, "Passage status", item.provenance.passageStatus);
  paragraph(panel, "Source locators are reported from the selected input. Upstream passage bytes and historical approval claims have not been independently verified.");
  const url = sourceURL(item.provenance);
  if (url) { const a = element("a", "Read pinned source on GitHub ↗"); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; panel.append(a); }
  panel.append(element("h3", "Input receipt"));
  const receipt = element("dl"); panel.append(receipt);
  field(receipt, "Selected file", item.citation.file);
  field(receipt, "Record locator", item.citation.locator);
  field(receipt, "File SHA-256", item.citation.sha256);
  field(receipt, "Scope", item.tenantId + " / " + item.projectId);
  const related = state.catalog.nodes.filter(n => n.id !== item.id && item.provenance.repository && n.provenance.repository === item.provenance.repository);
  panel.append(element("h3", "More from this repository"));
  paragraph(panel, "These links group source references; they do not imply support, contradiction, or architectural equivalence.");
  if (!related.length) paragraph(panel, "No related records in this selection.");
  for (const n of related.slice(0, 8)) { const b = element("button", n.title, "related"); b.onclick = () => { selectRecord(n); render(); }; panel.append(b); }
  render();
}
function selectPage(page) {
  state.selected = page.id;
  const panel = $("detail"); panel.replaceChildren(element("h2", page.title));
  const body = element("div", undefined, "note-body");
  // Render text, never HTML or executable Markdown. Resolve only local page links.
  const pattern = /\[([^\]]+)\]\(([^\s)]+)\)|\[\[([^\]]+)\]\]/g;
  let start = 0;
  for (const m of page.text.matchAll(pattern)) {
    body.append(document.createTextNode(page.text.slice(start, m.index)));
    const target = (m[2] || m[3].split("|")[0]).split("#")[0];
    const base = page.id.slice(0, page.id.lastIndexOf("/") + 1);
    let normalized = "";
    try {
      if (!/^[a-z][a-z0-9+.-]*:/i.test(target) && !target.startsWith("//")) {
        normalized = new URL(target, "https://local.invalid/" + base).pathname.slice(1);
      }
    } catch { /* Malformed source links remain inert text. */ }
    const matches = normalized ? state.pages.filter(p => p.id === normalized || (!target.includes("/") && p.kind === page.kind && p.id.split("/").pop() === (target.endsWith(".md") ? target : target + ".md"))) : [];
    if (matches.length === 1) {
      const button = element("button", m[1] || m[3], "related");
      button.onclick = () => selectPage(matches[0]); body.append(button);
    } else body.append(document.createTextNode(m[0]));
    start = m.index + m[0].length;
  }
  body.append(document.createTextNode(page.text.slice(start))); panel.append(body); render();
}
function render() {
  if (!state.catalog) return;
  const query = $("search").value.toLowerCase().trim();
  let items = state.view === "library" ? state.catalog.nodes : state.view === "sources" ? state.catalog.sources : state.pages.filter(p => p.kind === state.view);
  items = items.filter(item => {
    if (state.view === "library" && (($("kind").value && item.kind !== $("kind").value) || ($("repo").value && item.provenance.repository !== $("repo").value))) return false;
    return JSON.stringify(item).toLowerCase().includes(query);
  });
  $("result-count").textContent = items.length + " results";
  const results = $("results"); results.replaceChildren();
  for (const item of items.slice(0, state.limit)) {
    const card = element("button", undefined, "card" + (state.selected === item.id ? " selected" : ""));
    card.append(element("small", item.kind || "Source receipt"), element("strong", item.title || item.file));
    paragraph(card, excerpt(item.text || (item.sha256 ? `${item.indexed} indexed / ${item.total} records` : "Open to read")));
    paragraph(card, item.provenance ? (item.provenance.repository || "No direct repository locator") : item.id, "meta");
    card.onclick = () => {
      if (state.view === "library") selectRecord(item);
      else if (state.view === "sources") {
        state.selected = item.id;
        $("detail").replaceChildren(element("h2", item.file));
        const dl = element("dl"); $("detail").append(dl);
        field(dl, "Input SHA-256", item.sha256); field(dl, "Coverage", `${item.indexed} of ${item.total}`);
        paragraph($("detail"), item.truncated ? "Partial index. Increase --limit to include more records." : "All records from this selected file are indexed.");
        paragraph($("detail"), "This receipt verifies the selected input bytes at build time, not the original repository content or any licence approval."); render();
      } else selectPage(item);
    };
    results.append(card);
  }
  if (!items.length) paragraph(results, state.view === "vault" ? "No notes selected. Create a starter vault with the init command, then build with --vault." : "No matches in this selection. Try another search or build with an explicit --input file.", "empty");
  $("more").hidden = items.length <= state.limit;
}
function view(name) {
  if (!["library", "guide", "vault", "sources"].includes(name)) name = "library";
  state.view = name; state.selected = null; state.limit = 40;
  $("search").value = "";
  document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  $("kind-label").hidden = $("repo-label").hidden = name !== "library";
  const names = {library: "Knowledge collection", guide: "The AIW second brain guide", vault: "Your linked notes", sources: "Selected source files"};
  $("list-title").textContent = names[name];
  $("detail").replaceChildren(element("h2", name === "library" ? "Select an idea to begin." : "Select an entry to read."));
  render();
}
document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => { location.hash = b.dataset.view; });
window.addEventListener("hashchange", () => view(location.hash.slice(1)));
for (const id of ["search", "kind", "repo"]) $(id).addEventListener("input", () => { state.limit = 40; render(); });
$("more").onclick = () => { state.limit += 40; render(); };
Promise.all([fetch("catalog.json").then(r => { if (!r.ok) throw Error("Missing catalogue"); return r.json(); }), fetch("pages.json").then(r => { if (!r.ok) throw Error("Missing pages"); return r.json(); })]).then(([catalog, pages]) => {
  state.catalog = catalog; state.pages = pages;
  $("count").textContent = catalog.stats.indexed.toLocaleString();
  $("source-count").textContent = catalog.sources.length;
  $("gaps").textContent = catalog.stats.incompleteLineage.toLocaleString();
  $("coverage").textContent = `${catalog.stats.indexed.toLocaleString()} of ${catalog.stats.total.toLocaleString()} records in explicitly selected files. Scope: ${catalog.scope.tenantId} / ${catalog.scope.projectId}. No approval is inferred.`;
  for (const [id, values] of [["kind", catalog.nodes.map(n => n.kind)], ["repo", catalog.nodes.map(n => n.provenance.repository).filter(Boolean)]]) {
    for (const value of [...new Set(values)].sort()) { const option = element("option", value); option.value = value; $(id).append(option); }
  }
  view(location.hash.slice(1));
}).catch(error => { $("coverage").textContent = "Unable to load the workspace. Build first, then use python brain.py serve. " + error.message; });
