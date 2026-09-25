#!/usr/bin/env python3
"""Build a bounded locator index from an AKR distribution ZIP.

The journal contains file metadata, not source bodies. This projection deliberately
publishes only a small, reproducible sample of safe documentation locators.
"""

import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOGUE = ROOT / "public" / "brain-catalogue.js"
OUTPUT = ROOT / "public" / "akr-discovery.js"
PATH = re.compile(r"^[\w./ -]{1,350}\.(?:md|mdx|txt)$", re.I)
HEX64 = re.compile(r"^sha256:([a-f0-9]{64})$", re.I)
HEX40 = re.compile(r"^[a-f0-9]{40}$", re.I)
KEYWORDS = ("architecture", "pattern", "cache", "retry", "circuit", "event", "security", "scal", "reliab", "service", "observ", "deploy", "design", "module")


def catalogue_repositories():
    source = CATALOGUE.read_text(encoding="utf-8")
    return {r["connectorId"]: r for r in json.loads(source.split("export const BRAIN_CATALOGUE=", 1)[1].rstrip().removesuffix(";"))["repositories"]}


def main(archive):
    repos = catalogue_repositories()
    archive_bytes = archive.read_bytes()
    grouped = {}
    with zipfile.ZipFile(archive) as z:
        checkpoints = sorted(n for n in z.namelist() if re.fullmatch(r"AKR-[^/]+/github-live/checkpoints/GH-[^/]+\.json", n))
        releases = {n.split("/", 1)[0] for n in checkpoints}
        if len(releases) != 1:
            raise ValueError("Expected one AKR live acquisition release")
        release = releases.pop()
        for name in checkpoints:
            checkpoint = json.loads(z.read(name))
            connector = checkpoint.get("connectorId")
            repo = repos.get(connector)
            commit = checkpoint.get("commitSha", "")
            if not repo or repo["repository"] != checkpoint.get("repository") or not HEX40.fullmatch(commit):
                continue
            journal = checkpoint.get("journal")
            if not isinstance(journal, str) or not re.fullmatch(r"checkpoints/GH-[\w-]+-[a-f0-9]{40}\.ndjson", journal):
                continue
            member = name.split("github-live/", 1)[0] + "github-live/" + journal
            if member not in z.namelist():
                continue
            choices = []
            for row in z.read(member).splitlines():
                item = json.loads(row)
                path = item.get("path", "")
                match = HEX64.fullmatch(item.get("contentSha256", ""))
                artefact = item.get("architectureArtefact") or {}
                if (item.get("status") != "accepted" or item.get("parserStatus") != "parsed"
                    or item.get("securityDisposition") != "safe-bounded-parser-input"
                    or not isinstance(path, str) or not PATH.fullmatch(path)
                    or any(part in {".", ".."} for part in path.split("/"))
                    or not match or not isinstance(item.get("sizeBytes"), int)
                    or not 100 <= item["sizeBytes"] <= 55000
                    or artefact.get("immutableCommit") != commit
                    or artefact.get("connectorId") != connector
                    or artefact.get("repository") != repo["repository"]):
                    continue
                lowered = path.lower()
                score = sum(4 for keyword in KEYWORDS if keyword in lowered)
                score += min(item.get("claimCandidateCount", 0), 20) // 5
                score += 2 if "/docs/" in "/" + lowered else 0
                score -= 3 if lowered.endswith("/readme.md") else 0
                choices.append((score, path, match.group(1), item["sizeBytes"]))
            choices.sort(key=lambda x: (-x[0], x[1]))
            picked, folders = [], set()
            for score, path, hash_value, size in choices:
                folder = "/".join(path.split("/")[:3])
                if folder in folders:
                    continue
                picked.append((path, hash_value, size))
                folders.add(folder)
                if len(picked) == 5:
                    break
            grouped[connector] = [(repo, commit, *entry) for entry in picked]
    leads = []
    for connector in sorted(grouped):
        for repo, commit, path, content_hash, size in grouped[connector]:
            identity = f"{connector}:{commit}:{path}:{content_hash}"
            leads.append({
                "id": "AKRL-" + hashlib.sha256(identity.encode()).hexdigest()[:16],
                "connectorId": connector,
                "repository": repo["repository"],
                "commitSha": commit,
                "path": path,
                "contentSha256": content_hash,
                "sizeBytes": size,
                "licenceReview": repo.get("licence", {}).get("reviewStatus", "requires-review"),
            })
    result = {
        "releaseId": release,
        "archiveSha256": hashlib.sha256(archive_bytes).hexdigest(),
        "catalogueReleaseId": "AKR-0.10.73.5",
        "indexedConnectorCount": sum(bool(x) for x in grouped.values()),
        "leads": leads,
    }
    OUTPUT.write_text("// Generated by scripts/generate-akr-discovery.py from the user's AKR ZIP.\n"
                      "// Metadata only; retrieve and verify the original before interpretation.\n"
                      "export const AKR_DISCOVERY=" + json.dumps(result, separators=(",", ":"), ensure_ascii=False) + ";\n", encoding="utf-8")
    print(f"{release}: {len(leads)} locators from {result['indexedConnectorCount']} registered connectors")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: generate-akr-discovery.py path/to/AKR.zip")
    main(Path(sys.argv[1]))
