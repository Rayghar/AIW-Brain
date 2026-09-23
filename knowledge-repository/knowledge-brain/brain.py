"""AIW's local discovery workbench. Python standard library only."""
from __future__ import annotations

import argparse
from collections import Counter
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
from pathlib import Path
import re
import shutil
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parent
BASELINE = "AIW v0.10.0-rc.10.73.6"
BOUNDARY = {"knowledgeAuthority": "discovery-only", "productionAccepted": False,
            "scoringEligible": False, "conformanceEligible": False,
            "canonicalGraphMutation": False}


def digest(data):
    return "sha256:" + hashlib.sha256(data).hexdigest()


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def source_hash(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return "sha256:" + h.hexdigest()


def records(path):
    if path.suffix.lower() == ".ndjson":
        with path.open(encoding="utf-8-sig") as stream:
            for line, text in enumerate(stream, 1):
                if text.strip():
                    yield f"line:{line}", json.loads(text)
    elif path.suffix.lower() == ".json":
        payload = json.loads(path.read_text(encoding="utf-8-sig"))
        if not isinstance(payload, dict) or not isinstance(payload.get("objects"), list):
            raise ValueError(f"{path.name}: expected an AIW objects array")
        for index, record in enumerate(payload["objects"]):
            yield f"/objects/{index}", record
    else:
        raise ValueError("Only explicit .json and .ndjson files are supported")


def string(value):
    return value if isinstance(value, str) else ""


def normalize(record, source, locator, tenant, project):
    if not isinstance(record, dict):
        raise ValueError(f"{locator}: record must be an object")
    for key, expected in (("tenantId", tenant), ("projectId", project)):
        if key in record and record[key] != expected:
            raise ValueError(f"{locator}: {key} differs from selected scope")
    rid = string(record.get("objectId") or record.get("semanticUnitId"))
    if not rid:
        raise ValueError(f"{locator}: missing objectId or semanticUnitId")
    provenance = record.get("provenance") or {}
    if not isinstance(provenance, dict):
        raise ValueError(f"{locator}: provenance must be an object")
    title = next((string(record.get(k)) for k in ("subjectName", "name", "heading")
                  if string(record.get(k))), rid)
    fields = {key: string(provenance.get(key) or record.get(key)) for key in
              ("repository", "path", "heading", "excerptHash", "structuralRange")}
    fields["revision"] = string(provenance.get("revision") or record.get("immutableCommit"))
    fields["sourceAuthorityClass"] = string(record.get("sourceAuthorityClass"))
    pinned = bool(re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", fields["revision"]))
    hashed = bool(re.fullmatch(r"sha256:[0-9a-f]{64}", fields["excerptHash"]))
    fields["passageStatus"] = "locator-present-unverified" if pinned and hashed and fields["path"] else "incomplete"
    # These are citations to the input record, never proof of the upstream passage.
    citation = {"sourceId": source["id"], "file": source["file"],
                "sha256": source["sha256"], "locator": locator}
    tags = record.get("contextTags", [])
    tags = [t for t in tags if isinstance(t, str)] if isinstance(tags, list) else []
    return {"id": digest((source["id"] + "\0" + rid).encode())[7:31], "recordId": rid,
            "title": title, "kind": string(record.get("objectClass")) or "candidate-semantic-unit",
            "text": string(record.get("statement") or record.get("summary")), "tags": tags,
            "provenance": fields, "citation": citation, "tenantId": tenant,
            "projectId": project, "authority": dict(BOUNDARY)}


def graph(nodes):
    """A disposable navigation projection, never the canonical Design Graph."""
    vertices = [{"id": n["id"], "label": n["title"], "type": "knowledge-record"} for n in nodes]
    edges, repos = [], {}
    for node in nodes:
        repo = node["provenance"]["repository"]
        if repo:
            repo_id = "repo-" + digest(repo.encode())[7:31]
            repos[repo_id] = {"id": repo_id, "label": repo, "type": "repository"}
            edges.append({"source": node["id"], "target": repo_id, "type": "cites-repository"})
    return {"purpose": "derived-navigation-only", "authority": dict(BOUNDARY),
            "nodes": vertices + list(repos.values()), "edges": edges}


def build_catalog(paths, tenant="repository-reference", project="shared-catalog", limit=10000):
    if limit < 1:
        raise ValueError("limit must be positive")
    nodes, sources, seen_paths = [], [], set()
    for path in paths:
        path = Path(path).resolve(strict=True)
        if path in seen_paths:
            raise ValueError("Duplicate input path")
        seen_paths.add(path)
        sha = source_hash(path)
        source = {"id": digest((path.name + sha).encode())[7:31], "file": path.name,
                  "sha256": sha, "indexed": 0, "total": 0, "truncated": False}
        if any(s["id"] == source["id"] for s in sources):
            raise ValueError("Duplicate input content and filename")
        seen_ids = set()
        for locator, record in records(path):
            node = normalize(record, source, locator, tenant, project)
            if node["recordId"] in seen_ids:
                raise ValueError(f"Duplicate record ID in {path.name}: {node['recordId']}")
            seen_ids.add(node["recordId"])
            source["total"] += 1
            if len(nodes) < limit:
                nodes.append(node)
                source["indexed"] += 1
        if source_hash(path) != sha:
            raise ValueError(f"Input changed during indexing: {path.name}; rebuild")
        source["truncated"] = source["indexed"] < source["total"]
        sources.append(source)
    return {"schemaVersion": "aiw-discovery-v1", "baseline": BASELINE,
            "authority": dict(BOUNDARY), "scope": {"tenantId": tenant, "projectId": project},
            "sources": sources, "nodes": nodes,
            "stats": {"indexed": len(nodes), "total": sum(s["total"] for s in sources),
                      "incompleteLineage": sum(n["provenance"]["passageStatus"] == "incomplete" for n in nodes),
                      "kinds": dict(Counter(n["kind"] for n in nodes))}}


def markdown_files(root):
    root = root.resolve(strict=True)
    files = sorted(root.rglob("*.md"))
    for path in files:
        if not path.resolve().is_relative_to(root):
            raise ValueError("Vault symlink escapes selected root")
    return files


def check_links(root):
    root = root.resolve(strict=True)
    files = markdown_files(root)
    results = []
    for path in files:
        body = re.sub(r"```.*?```", "", path.read_text(encoding="utf-8"), flags=re.S)
        targets = [(m, False) for m in re.findall(r"\]\(([^\s)]+)\)", body)]
        targets += [(m.split("|")[0], True) for m in re.findall(r"\[\[([^\]]+)\]\]", body)]
        for target, wiki in targets:
            parts = urlsplit(target)
            if parts.scheme in ("https", "http", "mailto"):
                continue
            clean = unquote(parts.path)
            if not clean:
                continue
            dest = (path.parent / clean).resolve()
            if wiki and not dest.suffix:
                dest = dest.with_suffix(".md")
            if not dest.is_relative_to(root):
                status = "outside-vault"
            elif dest.exists():
                status = "ok"
            else:
                matches = [f for f in files if f.stem == Path(clean).stem] if wiki else []
                status = "ok" if len(matches) == 1 else "ambiguous" if matches else "missing"
            if status != "ok":
                results.append({"file": path.relative_to(root).as_posix(), "target": target, "status": status})
    return {"filesChecked": len(files), "issues": results,
            "limitations": "Checks local file targets, not heading anchors or external URL availability"}


def build_site(catalog, output, vault=None):
    output = output.resolve()
    # Avoid accidental writes into source trees or the immutable acquisition roots.
    allowed = (ROOT / "output").resolve()
    if output != allowed and not output.is_relative_to(allowed):
        raise ValueError("Site output must be inside knowledge-brain/output")
    pages = []
    for folder, prefix in ((ROOT / "guide", "guide"), (vault, "vault")):
        if folder:
            folder = folder.resolve(strict=True)
            for path in markdown_files(folder):
                text = path.read_text(encoding="utf-8")
                title = next((line[2:] for line in text.splitlines() if line.startswith("# ")), path.stem)
                pages.append({"id": prefix + "/" + path.relative_to(folder).as_posix(),
                              "title": title, "text": text, "kind": prefix})
    output.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "app.js", "style.css", "catalog.json", "pages.json", "graph.json", "build-receipt.json"):
        if (output / name).is_symlink():
            raise ValueError("Generated asset must not be a symlink")
    for name in ("index.html", "app.js", "style.css"):
        shutil.copyfile(ROOT / "web" / name, output / name)
    write_json(output / "catalog.json", catalog)
    write_json(output / "pages.json", pages)
    write_json(output / "graph.json", graph(catalog["nodes"]))
    write_json(output / "build-receipt.json", {"baseline": BASELINE, **BOUNDARY,
               "files": {p.name: source_hash(p) for p in sorted(output.iterdir())
                         if p.is_file() and p.name != "build-receipt.json"},
               "sourceReceipts": catalog["sources"]})


class LocalHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        from collection import handle_api
        if handle_api(self):
            return
        if urlsplit(self.path).path not in {"/", "/index.html", "/app.js", "/style.css",
                                          "/catalog.json", "/pages.json", "/graph.json", "/build-receipt.json", "/collection-receipt.json"}:
            self.send_error(404)
            return
        super().do_GET()

    def do_HEAD(self):
        self.send_error(405)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    for name in ("build", "stats", "graph"):
        p = sub.add_parser(name)
        p.add_argument("--input", type=Path, action="append", default=[])
        p.add_argument("--tenant", default="repository-reference")
        p.add_argument("--project", default="shared-catalog")
        p.add_argument("--limit", type=int, default=10000)
        if name == "build":
            p.add_argument("--vault", type=Path)
            p.add_argument("--output", type=Path, default=ROOT / "output")
    p = sub.add_parser("check-links")
    p.add_argument("vault", type=Path)
    p = sub.add_parser("init")
    p.add_argument("destination", type=Path)
    p = sub.add_parser("chat")
    p.add_argument("input", type=Path)
    p.add_argument("--vault", type=Path, required=True)
    p = sub.add_parser("serve")
    p.add_argument("--port", type=int, default=8765)
    p.add_argument("--directory", type=Path, default=ROOT / "output")
    p = sub.add_parser("collection")
    p.add_argument("--snapshot-root", type=Path, required=True)
    p.add_argument("--manifest-index", type=Path, required=True)
    p.add_argument("--candidates", type=Path, required=True)
    p.add_argument("--vault", type=Path)
    p.add_argument("--output", type=Path, default=ROOT / "output" / "collection")
    args = parser.parse_args(argv)
    if args.command in ("build", "stats", "graph"):
        catalog = build_catalog(args.input, args.tenant, args.project, args.limit)
        if args.command == "build":
            build_site(catalog, args.output, args.vault)
            print(json.dumps({"output": str(args.output), "stats": catalog["stats"], **BOUNDARY}))
        else:
            print(json.dumps(catalog["stats"] if args.command == "stats" else graph(catalog["nodes"]), indent=2))
    elif args.command == "check-links":
        report = check_links(args.vault)
        print(json.dumps(report, indent=2))
        return int(bool(report["issues"]))
    elif args.command == "init":
        if args.destination.exists():
            raise ValueError("Destination exists; refusing to overwrite a vault")
        shutil.copytree(ROOT / "vault-template", args.destination)
        print("Created candidate-only starter vault")
    elif args.command == "chat":
        raw = args.input.read_bytes()
        messages = json.loads(raw)
        if not isinstance(messages, list) or any(not isinstance(m, dict) or m.get("role") not in
                ("user", "assistant", "system") or not isinstance(m.get("content"), str) for m in messages):
            raise ValueError("Expected a JSON array of {role: user|assistant|system, content: string}")
        inbox = args.vault.resolve(strict=True) / "inbox"
        inbox.mkdir(exist_ok=True)
        if not inbox.resolve().is_relative_to(args.vault.resolve()):
            raise ValueError("Inbox escapes vault")
        path = inbox / ("chat-" + digest(raw)[7:23] + ".md")
        body = "# Imported conversation\n\nStatus: candidate / untrusted source text\n\nSource SHA-256: " + digest(raw) + "\n\n"
        body += "\n\n".join("## " + m["role"] + "\n\n" + "\n".join("> " + line for line in m["content"].splitlines()) for m in messages)
        with path.open("x", encoding="utf-8") as stream:
            stream.write(body + "\n")
        print(path)
    elif args.command == "collection":
        from collection import build_collection
        catalog = build_collection(args.snapshot_root, args.manifest_index, args.candidates, args.output, args.vault)
        print(json.dumps(catalog["stats"]))
    elif args.command == "serve":
        directory = args.directory.resolve(strict=True)
        if not directory.is_relative_to((ROOT / "output").resolve()):
            raise ValueError("Serve only a generated output directory")
        handler = lambda *a, **kw: LocalHandler(*a, directory=str(directory), **kw)
        print(f"Local discovery workspace: http://127.0.0.1:{args.port}", flush=True)
        ThreadingHTTPServer(("127.0.0.1", args.port), handler).serve_forever()
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (ValueError, OSError) as exc:
        print(f"Error: {exc}", file=sys.stderr)
        sys.exit(1)
