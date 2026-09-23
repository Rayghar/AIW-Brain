"use strict";
const $ = id => document.getElementById(id);
const state = {view: "library", catalog: null, pages: [], selected: null, limit: 40, offset: 0, request: 0};
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
async function api(url) {
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) throw Error(body.error || "Collection request failed");
  return body;
}
function markSelection() {
  document.querySelectorAll("#results .card").forEach(card => card.classList.toggle("selected", card.dataset.id === state.selected));
}
async function selectRecord(item) {
  state.selected = item.id;
  const panel = $("detail"); panel.replaceChildren();
  paragraph(panel, "DISCOVERY RECORD / NOT APPROVED", "eyebrow");
  panel.append(element("h2", item.kind === "acquired-file" ? item.title.split("/").pop() : item.title));
  paragraph(panel, item.text || "This record contains metadata only. Read the referenced material before drawing conclusions.");
  const dl = element("dl"); panel.append(dl);
  for (const [label, value] of [["Record ID", item.recordId], ["Record type", item.kind],
    ["Repository", item.provenance.repository], ["Source path", item.provenance.path],
    ["Revision", item.provenance.revision], ["Passage location", [item.provenance.heading, item.provenance.structuralRange].filter(Boolean).join(" / ")],
    ["Passage hash", item.provenance.excerptHash], ["Passage status", item.provenance.passageStatus]]) field(dl, label, value);
  if (item.availability) {
    field(dl, "Local availability", item.availability);
    field(dl, "Acquisition disposition", item.acquisitionStatus || "candidate transformation");
    field(dl, "Licence disposition (recorded, not approval)", item.licenceDisposition || "See source manifest");
    if (item.contentSha256) field(dl, "Source content SHA-256", item.contentSha256);
  }
  paragraph(panel, "Source locators are reported from the selected input. Passage meaning, historical approval claims and licences have not been independently verified.");
  const url = sourceURL(item.provenance);
  if (url) { const a = element("a", "Read pinned source on GitHub"); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; panel.append(a); }
  if (item.availability === "verified-text") {
    const button = element("button", "Read verified local source", "related"); button.id = "read-source";
    const content = element("section");
    const reader = element("section"); reader.append(element("h3", "Downloaded source"), button, content);
    panel.insertBefore(reader, dl);
    button.onclick = async () => {
      button.disabled = true; content.replaceChildren(element("p", "Rechecking source integrity..."));
      try {
        const result = await api("/api/records/" + encodeURIComponent(item.id) + "/content");
        if (state.selected !== item.id) return;
        content.replaceChildren(element("p", result.notice), element("p", "Content SHA-256 verified on this read."), element("pre", result.text, "source-text"));
      } catch (error) { content.replaceChildren(element("p", error.message, "empty")); }
      finally { button.disabled = false; }
    };
  } else if (item.availability && item.kind === "acquired-file") {
    paragraph(panel, "Local text preview unavailable: " + item.availability + ". The metadata remains visible for coverage.");
  }
  if (item.linkedFileId) {
    const button = element("button", "Open acquired source file", "related"); button.id = "linked-source";
    button.onclick = async () => {
      try { const source = await api("/api/records/" + encodeURIComponent(item.linkedFileId)); if (state.selected === item.id) selectRecord(source); }
      catch (error) { paragraph(panel, error.message, "empty"); }
    };
    panel.append(button); field(dl, "Linked source availability", item.sourceAvailability);
  }
  panel.append(element("h3", "Input receipt"));
  const receipt = element("dl"); panel.append(receipt);
  field(receipt, "Selected file", item.citation.file); field(receipt, "Record locator", item.citation.locator);
  field(receipt, "Input SHA-256", item.citation.sha256); field(receipt, "Scope", item.tenantId + " / " + item.projectId);
  panel.append(element("h3", "More from this repository"));
  paragraph(panel, "Shared repository references do not imply support, contradiction, or architectural equivalence.");
  const relatedPanel = element("div"); panel.append(relatedPanel);
  markSelection();
  try {
    let related;
    if (state.catalog.mode === "collection") {
      related = (await api("/api/search?" + new URLSearchParams({repository: item.provenance.repository, kind: "acquired-file", availability: "verified-text", limit: "9"}))).items;
    } else related = state.catalog.nodes.filter(n => n.provenance.repository === item.provenance.repository);
    if (state.selected !== item.id) return;
    related = related.filter(n => n.id !== item.id).slice(0, 8);
    if (!related.length) paragraph(relatedPanel, "No related readable records in this selection.");
    for (const n of related) { const b = element("button", n.title, "related"); b.onclick = () => selectRecord(n); relatedPanel.append(b); }
  } catch (error) { paragraph(relatedPanel, error.message, "empty"); }
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
function selectSource(item) {
  state.selected = item.id;
  $("detail").replaceChildren(element("h2", item.repository || item.file));
  const dl = element("dl"); $("detail").append(dl);
  field(dl, "Input file", item.file); field(dl, "Input SHA-256", item.sha256);
  field(dl, "Coverage", `${item.indexed} of ${item.total}`);
  if (item.snapshot) field(dl, "Snapshot", item.snapshot);
  if (item.licenceDisposition) field(dl, "Recorded licence disposition", item.licenceDisposition);
  for (const [label, values] of [["Acquisition", item.acquisitionCounts], ["Local availability", item.availabilityCounts]]) {
    if (values) { $("detail").append(element("h3", label)); for (const [key, value] of Object.entries(values)) field(dl, key, value.toLocaleString()); }
  }
  paragraph($("detail"), item.truncated ? "Partial index. Increase --limit to include more records." : "All records from this selected file are indexed.");
  paragraph($("detail"), "This receipt identifies the selected input bytes. It grants no licence approval, scoring or production authority.");
  markSelection();
}
async function render() {
  if (!state.catalog) return;
  const request = ++state.request;
  const query = $("search").value.trim();
  const paged = state.catalog.mode === "collection" && state.view === "library";
  let items, total;
  if (paged) {
    $("result-count").textContent = "Searching...";
    $("results").setAttribute("aria-busy", "true");
    try {
      const data = await api("/api/search?" + new URLSearchParams({q: query, repository: $("repo").value, kind: $("kind").value, availability: $("availability").value, offset: state.offset, limit: "40"}));
      if (request !== state.request) return;
      items = data.items; total = data.total;
    } catch (error) {
      if (request !== state.request) return;
      $("results").replaceChildren(element("p", "Search unavailable: " + error.message, "empty"));
      $("results").removeAttribute("aria-busy");
      $("result-count").textContent = "Unavailable"; $("more").hidden = $("previous").hidden = true; return;
    }
  } else {
    items = state.view === "library" ? state.catalog.nodes : state.view === "sources" ? state.catalog.sources : state.pages.filter(p => p.kind === state.view);
    items = items.filter(item => {
      if (state.view === "library" && (($("kind").value && item.kind !== $("kind").value) || ($("repo").value && item.provenance.repository !== $("repo").value))) return false;
      return JSON.stringify(item).toLowerCase().includes(query.toLowerCase());
    });
    total = items.length; items = items.slice(0, state.limit);
  }
  $("result-count").textContent = paged && total ? `${state.offset + 1}-${state.offset + items.length} of ${total.toLocaleString()}` : total.toLocaleString() + " results";
  const results = $("results"); results.replaceChildren();
  for (const item of items) {
    const card = element("button", undefined, "card" + (state.selected === item.id ? " selected" : "")); card.dataset.id = item.id;
    card.append(element("small", item.kind || "Source receipt"), element("strong", item.title || item.repository || item.file));
    paragraph(card, excerpt(item.text || (item.sha256 ? `${item.indexed.toLocaleString()} indexed / ${item.total.toLocaleString()} records` : "Open to read")));
    paragraph(card, item.provenance ? (item.provenance.repository || "No direct repository locator") : item.file, "meta");
    card.onclick = () => state.view === "library" ? selectRecord(item) : state.view === "sources" ? selectSource(item) : selectPage(item);
    results.append(card);
  }
  if (!items.length) paragraph(results, state.view === "vault" ? "No notes selected. Build with --vault to include your notes." : "No matches in this selection. Try another search or change the filters.", "empty");
  $("more").textContent = paged ? "Next page" : "Show more";
  $("more").hidden = paged ? state.offset + items.length >= total : state.limit >= total;
  $("previous").hidden = !paged || state.offset === 0;
  $("results").removeAttribute("aria-busy");
}
function view(name) {
  if (!["library", "guide", "vault", "sources"].includes(name)) name = "library";
  state.view = name; state.selected = null; state.limit = 40; state.offset = 0;
  $("search").value = "";
  document.querySelectorAll("[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  $("availability-label").hidden = name !== "library" || state.catalog?.mode !== "collection";
  $("kind-label").hidden = $("repo-label").hidden = name !== "library";
  const names = {library: "Knowledge collection", guide: "The AIW second brain guide", vault: "Your linked notes", sources: "Selected source files"};
  $("list-title").textContent = names[name];
  $("detail").replaceChildren(element("h2", name === "library" ? "Select an idea to begin." : "Select an entry to read."));
  render();
}
document.querySelectorAll("[data-view]").forEach(b => b.onclick = () => { location.hash = b.dataset.view; });
window.addEventListener("hashchange", () => view(location.hash.slice(1)));
for (const id of ["search", "kind", "repo", "availability"]) $(id).addEventListener("input", () => { state.limit = 40; state.offset = 0; render(); });
$("more").onclick = () => { if (state.catalog.mode === "collection" && state.view === "library") state.offset += 40; else state.limit += 40; render(); };
$("previous").onclick = () => { state.offset = Math.max(0, state.offset - 40); render(); };
Promise.all([fetch("catalog.json").then(r => { if (!r.ok) throw Error("Missing catalogue"); return r.json(); }), fetch("pages.json").then(r => { if (!r.ok) throw Error("Missing pages"); return r.json(); })]).then(([catalog, pages]) => {
  state.catalog = catalog; state.pages = pages;
  $("count").textContent = catalog.stats.indexed.toLocaleString();
  $("source-count").textContent = catalog.sources.length;
  $("gaps").textContent = catalog.stats.incompleteLineage.toLocaleString();
  $("coverage").textContent = `${catalog.stats.indexed.toLocaleString()} of ${catalog.stats.total.toLocaleString()} records in explicitly selected files. Scope: ${catalog.scope.tenantId} / ${catalog.scope.projectId}. No approval is inferred.`;
  for (const [id, values] of [["kind", (catalog.kinds || catalog.nodes.map(n => n.kind))], ["repo", (catalog.repositories || catalog.nodes.map(n => n.provenance.repository).filter(Boolean))]]) {
    for (const value of [...new Set(values)].sort()) { const option = element("option", value); option.value = value; $(id).append(option); }
  }
  if (catalog.mode === "collection") {
    $("source-count").textContent = catalog.stats.repositories; $("source-count-label").textContent = "GitHub repositories";
    $("gaps").textContent = catalog.stats.verifiedTextFiles.toLocaleString(); $("gaps-label").textContent = "verified local text files";
    $("coverage").textContent = `${catalog.stats.fileEntries.toLocaleString()} file entries + ${catalog.stats.candidateUnits.toLocaleString()} candidate units. All ${catalog.stats.repositories} selected snapshots and all ${catalog.collectionReceipt.candidateShards} candidate shards are indexed. Source text remains untrusted.`;
    $("collection-coverage").hidden = false;
    const dl = element("dl"); $("coverage-details").replaceChildren(dl);
    for (const [key, count] of Object.entries(catalog.stats.availabilityCounts)) field(dl, key, count.toLocaleString());
    paragraph($("coverage-details"), catalog.collectionReceipt.textCoverage);
    paragraph($("coverage-details"), "Historical snapshots not double-counted: " + catalog.collectionReceipt.unselectedHistoricalManifests.length);
    for (const name of catalog.collectionReceipt.unselectedHistoricalManifests) paragraph($("coverage-details"), name);
    paragraph($("coverage-details"), catalog.collectionReceipt.indexScope);
    for (const value of catalog.availability) { const option = element("option", value); option.value = value; $("availability").append(option); }
    $("kind").value = "acquired-file"; $("availability").value = "verified-text";
  }
  view(location.hash.slice(1));
}).catch(error => { $("coverage").textContent = "Unable to load the workspace. Build first, then use python brain.py serve. " + error.message; });
