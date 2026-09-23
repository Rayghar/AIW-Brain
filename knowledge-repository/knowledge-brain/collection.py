"""Manifest-bound local collection search. All output is a disposable discovery index."""
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path, PurePosixPath
import re
import sqlite3
import tempfile
import zlib
from urllib.parse import parse_qs, urlsplit
from brain import BASELINE, BOUNDARY, ROOT, build_site, digest, normalize, source_hash, write_json

MAX_STAGING_BYTES = 256 * 1024 * 1024
MAX_TEXT_BYTES = 2 * 1024 * 1024
SHARDS = [f"transformation-units-{i:02x}.ndjson" for i in range(16)]


def validate_relative(relative):
    if not isinstance(relative, str) or not relative or "\\" in relative or ":" in relative or "\0" in relative:
        raise ValueError("Unsafe source path")
    if PurePosixPath(relative).is_absolute() or any(p in (".", "..", "") for p in relative.split("/")):
        raise ValueError("Unsafe source path")
    return relative


def beneath(root, relative):
    validate_relative(relative)
    root = root.resolve(strict=True)
    resolved = (root / relative).resolve()
    if not resolved.is_relative_to(root):
        raise ValueError("Source path escapes snapshot root")
    return resolved


def verified_text(root, relative, expected):
    path = beneath(root, relative)
    if not path.is_file():
        return "missing-local-file", ""
    if not re.fullmatch(r"sha256:[0-9a-f]{64}", expected or ""):
        return "missing-content-hash", ""
    if path.stat().st_size > MAX_TEXT_BYTES:
        return "preview-size-limit", ""
    with path.open("rb") as stream:
        raw = stream.read(MAX_TEXT_BYTES + 1)
    if len(raw) > MAX_TEXT_BYTES:
        return "preview-size-limit", ""
    if digest(raw) != expected:
        return "content-hash-mismatch", ""
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        return "verified-non-utf8", ""
    return ("verified-binary", "") if "\0" in text else ("verified-text", text)


def prepared_files(files, root, prefix):
    # Bound both concurrent reads and retained source text; SQLite has one writer.
    def prepare(file):
        assert_reference_scope(file)
        relative = prefix + file["path"]
        validate_relative(relative)
        status = file.get("status", "unknown")
        if status == "accepted":
            return verified_text(root, relative, file.get("contentSha256", ""))
        return {"accepted-opaque": "opaque-no-text-preview", "quarantined": "quarantined", "policy-excluded": "policy-excluded", "rejected": "rejected"}.get(status, "blocked-unknown-disposition"), ""
    with ThreadPoolExecutor(max_workers=16) as workers:
        for start in range(0, len(files), 64):
            batch = files[start:start + 64]
            for offset, (status, text) in enumerate(workers.map(prepare, batch)):
                yield start + offset, batch[offset], status, text


def schema(db):
    db.executescript("""
      CREATE TABLE meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE records(id TEXT PRIMARY KEY, kind TEXT NOT NULL, repository TEXT NOT NULL,
        revision TEXT NOT NULL, path TEXT NOT NULL, availability TEXT NOT NULL,
        snapshot TEXT NOT NULL, filehash TEXT NOT NULL, acquisition TEXT NOT NULL, data BLOB NOT NULL);
      CREATE INDEX facets ON records(kind,repository,availability);
      CREATE INDEX file_link ON records(repository,revision,path,kind);
      CREATE VIRTUAL TABLE search USING fts5(words, content='');
    """)


def put(db, node, words, snapshot="", filehash="", acquisition=""):
    p = node["provenance"]
    cursor = db.execute("INSERT INTO records VALUES(?,?,?,?,?,?,?,?,?,?)", (
        node["id"], node["kind"], p["repository"], p["revision"], p["path"],
        node["availability"], snapshot, filehash, acquisition, zlib.compress(json.dumps(node, ensure_ascii=False).encode("utf-8"), 1)))
    db.execute("INSERT INTO search(rowid,words) VALUES(?,?)", (cursor.lastrowid, " ".join([
        node["title"], node["recordId"], p["repository"], p["path"], node["text"], words])))


def assert_reference_scope(record):
    for key, expected in (("tenantId", "repository-reference"), ("projectId", "shared-catalog")):
        if key in record and record[key] != expected:
            raise ValueError("Acquisition scope differs from repository-reference/shared-catalog")


def read_receipt(path, label):
    raw = path.read_bytes()
    sha = digest(raw)
    return json.loads(raw.decode("utf-8-sig")), {
        "id": digest((label + sha).encode())[7:31], "file": label, "sha256": sha,
        "indexed": 0, "total": 0, "truncated": False}


def build_collection(snapshot_root, manifest_index, candidates, output, vault=None, progress=print):
    snapshot_root = snapshot_root.resolve(strict=True)
    manifest_index = manifest_index.resolve(strict=True)
    candidates = candidates.resolve(strict=True)
    output = output.resolve()
    if not output.is_relative_to((ROOT / "output").resolve()):
        raise ValueError("Collection output must be inside knowledge-brain/output")
    index, index_receipt = read_receipt(manifest_index, manifest_index.name)
    assert_reference_scope(index)
    entries = index.get("manifests")
    if not isinstance(entries, list) or not entries or len(entries) != index.get("expectedRepositories"):
        raise ValueError("Acquisition index repository denominator mismatch")
    if len({e["connectorId"] for e in entries}) != len(entries):
        raise ValueError("Duplicate repository in acquisition index")
    missing = [name for name in SHARDS if not (candidates / name).is_file()]
    if missing:
        raise ValueError("Incomplete candidate shard set: " + ", ".join(missing))
    output.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix="collection-", suffix=".sqlite.tmp", dir=output)
    os.close(fd)
    db = sqlite3.connect(":memory:")
    in_memory = True
    sources, selected = [], set()
    counts, acquisition_counts = Counter(), Counter()
    total_files = 0
    try:
        schema(db)
        for entry in entries:
            assert_reference_scope(entry)
            connector, snapshot = entry["connectorId"], entry["snapshotId"]
            relative = f"snapshots/{connector}/{snapshot}/manifest.json"
            manifest_path = beneath(snapshot_root, relative)
            if not manifest_path.is_file():
                raise ValueError("Selected manifest missing: " + connector)
            manifest, receipt = read_receipt(manifest_path, relative)
            assert_reference_scope(manifest)
            if any(manifest.get(k) != entry[v] for k, v in (
                ("connectorId", "connectorId"), ("snapshotId", "snapshotId"),
                ("repository", "repository"), ("commitSha", "immutableCommit"))):
                raise ValueError("Manifest identity differs from acquisition index: " + connector)
            files = manifest.get("files")
            if not isinstance(files, list) or len(files) != entry["denominatorCount"]:
                raise ValueError("File denominator mismatch: " + connector)
            selected.add(relative)
            receipt.update(repository=entry["repository"], snapshot=snapshot, total=len(files),
                           licenceDisposition=manifest.get("licenceEvidence", {}).get("finalDisposition", "not-supplied"))
            statuses, availability, seen = Counter(), Counter(), set()
            for position, file, status, text in prepared_files(files, snapshot_root, f"snapshots/{connector}/{snapshot}/files/"):
                source_path = file["path"]
                if source_path in seen:
                    raise ValueError("Duplicate file in manifest: " + source_path)
                seen.add(source_path)
                relative_file = f"snapshots/{connector}/{snapshot}/files/{source_path}"
                validate_relative(relative_file)
                acquisition = file.get("status", "unknown")
                statuses[acquisition] += 1
                content_hash = file.get("contentSha256", "")
                node = normalize({"objectId": "FILE-" + digest((snapshot + "\0" + source_path).encode())[7:31],
                    "name": source_path, "objectClass": "acquired-file", "repository": entry["repository"],
                    "immutableCommit": entry["immutableCommit"], "path": source_path,
                    "summary": f"Acquisition: {acquisition}. Local availability: {status}."},
                    receipt, f"/files/{position}", "repository-reference", "shared-catalog")
                node.update(availability=status, acquisitionStatus=acquisition, contentSha256=content_hash,
                            licenceDisposition=receipt["licenceDisposition"])
                node["provenance"]["passageStatus"] = "file-reference-not-a-passage"
                put(db, node, text, relative_file, content_hash, acquisition)
                counts[status] += 1
                availability[status] += 1
                total_files += 1
                if (position + 1) % 5000 == 0:
                    progress(f"  {connector}: {position + 1:,}/{len(files):,} entries", flush=True)
            receipt.update(indexed=len(files), acquisitionCounts=dict(statuses), availabilityCounts=dict(availability))
            acquisition_counts.update(statuses)
            sources.append(receipt)
            progress(f"Indexed {connector}: {len(files):,} file entries; {availability['verified-text']:,} verified text files", flush=True)
            db.commit()
            if in_memory and db.execute("PRAGMA page_count").fetchone()[0] * db.execute("PRAGMA page_size").fetchone()[0] > MAX_STAGING_BYTES:
                staging = sqlite3.connect(temporary)
                db.backup(staging)
                db.close()
                db, in_memory = staging, False
                db.execute("PRAGMA journal_mode=OFF")
                db.execute("PRAGMA synchronous=OFF")
                db.execute("PRAGMA cache_size=-65536")
        candidate_count, linked = 0, 0
        for name in SHARDS:
            path = candidates / name
            sha = source_hash(path)
            receipt = {"id": digest((name + sha).encode())[7:31], "file": name,
                       "sha256": sha, "indexed": 0, "total": 0, "truncated": False}
            with path.open(encoding="utf-8-sig") as stream:
                for line, raw in enumerate(stream, 1):
                    if not raw.strip():
                        continue
                    node = normalize(json.loads(raw), receipt, f"line:{line}", "repository-reference", "shared-catalog")
                    node["id"] = "unit-" + digest(node["recordId"].encode())[7:31]
                    node["kind"] = "candidate-semantic-unit"
                    p = node["provenance"]
                    match = db.execute("SELECT id,availability FROM records WHERE repository=? AND revision=? AND path=? AND kind='acquired-file'",
                                       (p["repository"], p["revision"], p["path"])).fetchone()
                    node["availability"] = "linked-source" if match else "source-not-in-selection"
                    node["linkedFileId"] = match[0] if match else None
                    node["sourceAvailability"] = match[1] if match else "not-found"
                    put(db, node, "")
                    linked += bool(match)
                    receipt["indexed"] += 1
                    candidate_count += 1
            receipt["total"] = receipt["indexed"]
            if source_hash(path) != receipt["sha256"]:
                raise ValueError("Candidate input changed during indexing: " + name)
            sources.append(receipt)
            progress(f"Indexed {name}: {receipt['indexed']:,} candidate records", flush=True)
            db.commit()
        if source_hash(manifest_index) != index_receipt["sha256"]:
            raise ValueError("Acquisition index changed during build")
        for receipt in sources[:len(entries)]:
            if source_hash(beneath(snapshot_root, receipt["file"])) != receipt["sha256"]:
                raise ValueError("Snapshot manifest changed during build")
        extras = sorted(p.relative_to(snapshot_root).as_posix() for p in (snapshot_root / "snapshots").glob("*/*/manifest.json")
                        if p.relative_to(snapshot_root).as_posix() not in selected)
        catalog = {"schemaVersion": "aiw-discovery-v2", "mode": "collection", "baseline": BASELINE,
            "authority": dict(BOUNDARY), "scope": {"tenantId": "repository-reference", "projectId": "shared-catalog"},
            "sources": sources, "nodes": [], "repositories": sorted(e["repository"] for e in entries),
            "kinds": ["acquired-file", "candidate-semantic-unit"],
            "availability": sorted(set(counts) | {"linked-source", "source-not-in-selection"}),
            "stats": {"indexed": total_files + candidate_count, "total": total_files + candidate_count,
                      "fileEntries": total_files, "candidateUnits": candidate_count, "linkedCandidates": linked,
                      "repositories": len(entries), "verifiedTextFiles": counts["verified-text"],
                      "incompleteLineage": 0, "acquisitionCounts": dict(acquisition_counts), "availabilityCounts": dict(counts)},
            "collectionReceipt": {"manifestIndex": index_receipt, "candidateShards": len(SHARDS),
                "unselectedHistoricalManifests": extras,
                "indexScope": "All selected manifest entries and all transformation shards; earlier derived/replay datasets are not duplicated",
                "textCoverage": "Full UTF-8 text for hash-verified accepted files up to 2 MiB; all other entries remain metadata only"}}
        db.execute("INSERT INTO meta VALUES('snapshotRoot',?)", (str(snapshot_root),))
        db.execute("INSERT INTO meta VALUES('catalog',?)", (json.dumps(catalog),))
        db.commit()
        if db.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
            raise ValueError("SQLite integrity check failed")
        if in_memory:
            staging = sqlite3.connect(temporary)
            try:
                db.backup(staging)
            finally:
                staging.close()
        db.close()
        build_site(catalog, output, vault)
        os.replace(temporary, output / "collection.sqlite")
        write_json(output / "graph.json", {"purpose": "repository-navigation-summary", "authority": BOUNDARY,
                   "repositories": catalog["repositories"], "note": "File and candidate relationships are resolved by record ID through the local API."})
        write_json(output / "collection-receipt.json", {"baseline": BASELINE, **BOUNDARY,
                   "databaseSha256": source_hash(output / "collection.sqlite"), "stats": catalog["stats"],
                   "coverage": catalog["collectionReceipt"], "sourceReceipts": sources})
        write_json(output / "build-receipt.json", {"baseline": BASELINE, **BOUNDARY,
                   "files": {name: source_hash(output / name) for name in ("index.html", "app.js", "style.css", "catalog.json", "pages.json", "graph.json", "collection.sqlite", "collection-receipt.json")}})
        return catalog
    finally:
        db.close()
        Path(temporary).unlink(missing_ok=True)


def unpack(data):
    return json.loads(zlib.decompress(data).decode("utf-8"))


def connect(directory):
    db = sqlite3.connect((Path(directory).resolve() / "collection.sqlite").as_uri() + "?mode=ro", uri=True)
    db.row_factory = sqlite3.Row
    return db


def search(db, query="", repository="", kind="", availability="", offset=0, limit=40):
    if len(query) > 250 or not 0 <= offset <= 2147483647 or not 1 <= limit <= 100:
        raise ValueError("Invalid search length or pagination")
    clauses, parameters = [], []
    for column, value in (("repository", repository), ("kind", kind), ("availability", availability)):
        if value:
            clauses.append("r." + column + "=?")
            parameters.append(value)
    words = re.findall(r"\w+", query, flags=re.UNICODE)[:20]
    join = ""
    if words:
        join = " JOIN search s ON s.rowid=r.rowid"
        clauses.append("search MATCH ?")
        parameters.append(" AND ".join('"' + w + '"*' for w in words))
    elif query.strip():
        return {"items": [], "total": 0, "offset": offset, "limit": limit}
    where = " WHERE " + " AND ".join(clauses) if clauses else ""
    total = db.execute("SELECT count(*) FROM records r" + join + where, parameters).fetchone()[0]
    rows = db.execute("SELECT r.data FROM records r" + join + where + " ORDER BY r.rowid LIMIT ? OFFSET ?", parameters + [limit, offset])
    return {"items": [unpack(row[0]) for row in rows], "total": total, "offset": offset, "limit": limit}


def get_record(db, record_id):
    row = db.execute("SELECT * FROM records WHERE id=?", (record_id,)).fetchone()
    if row is None:
        raise KeyError("Record not found")
    return row


def preview(db, record_id):
    row = get_record(db, record_id)
    if row["kind"] != "acquired-file" or row["acquisition"] != "accepted" or row["availability"] != "verified-text":
        raise PermissionError("This record is metadata only; source preview is blocked")
    root = Path(db.execute("SELECT value FROM meta WHERE key='snapshotRoot'").fetchone()[0])
    node = unpack(row["data"])
    manifest = beneath(root, node["citation"]["file"])
    if source_hash(manifest) != node["citation"]["sha256"]:
        raise ValueError("Acquisition manifest changed; rebuild before reading this source")
    status, text = verified_text(root, row["snapshot"], row["filehash"])
    if status != "verified-text":
        raise ValueError("Source has changed or is unavailable: " + status)
    return {"recordId": record_id, "verification": "content-sha256-matched", "sha256": row["filehash"],
            "text": text, "authority": dict(BOUNDARY), "notice": "Untrusted source text. Hash verification does not grant approval or redistribution rights."}


def handle_api(handler):
    parts = urlsplit(handler.path)
    if not parts.path.startswith("/api/"):
        return False
    def respond(status, payload):
        raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        handler.send_response(status)
        handler.send_header("Content-Type", "application/json; charset=utf-8")
        handler.send_header("Content-Length", str(len(raw)))
        handler.end_headers()
        handler.wfile.write(raw)
    host = handler.headers.get("Host", "")
    valid_hosts = {f"127.0.0.1:{handler.server.server_port}", f"localhost:{handler.server.server_port}"}
    origin = handler.headers.get("Origin")
    if host not in valid_hosts or (origin and origin not in {"http://" + h for h in valid_hosts}):
        respond(403, {"error": "Local origin required"})
        return True
    if not (Path(handler.directory) / "collection.sqlite").is_file():
        respond(404, {"error": "No collection index; run the collection command"})
        return True
    db = None
    try:
        db = connect(handler.directory)
        if parts.path == "/api/search":
            values = parse_qs(parts.query)
            get = lambda key, default="": values.get(key, [default])[0]
            result = search(db, get("q"), get("repository"), get("kind"), get("availability"), int(get("offset", "0")), int(get("limit", "40")))
        elif re.fullmatch(r"/api/records/[a-z0-9-]+(?:/content)?", parts.path):
            record_id = parts.path.split("/")[3]
            result = preview(db, record_id) if parts.path.endswith("/content") else unpack(get_record(db, record_id)["data"])
        else:
            respond(404, {"error": "Unknown collection endpoint"})
            return True
        respond(200, result)
    except PermissionError as exc:
        respond(403, {"error": str(exc)})
    except KeyError:
        respond(404, {"error": "Record not found"})
    except (ValueError, OSError) as exc:
        respond(409 if parts.path.endswith("/content") else 400, {"error": str(exc)})
    except sqlite3.Error:
        respond(503, {"error": "Collection index unavailable; rebuild before continuing"})
    finally:
        if db is not None:
            db.close()
    return True
