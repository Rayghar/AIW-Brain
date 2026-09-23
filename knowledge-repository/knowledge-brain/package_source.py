"""Package an explicit source allowlist; never include a vault or generated catalogue."""
import hashlib
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parent
FILES = ["verify_collection.py", "collection.py", "FULL_COLLECTION_PLAN.md", "brain.py", "package_source.py", "README.md", "IMPLEMENTATION_PLAN.md", "playbooks.md", ".gitignore"]
DIRECTORIES = ["web", "guide", "vault-template", "tests", "evidence"]


def main():
    paths = [ROOT / name for name in FILES]
    for directory in DIRECTORIES:
        paths.extend(p for p in (ROOT / directory).rglob("*") if p.is_file()
                     and "__pycache__" not in p.parts and p.suffix in (".md", ".py", ".cjs", ".json", ".html", ".css", ".js"))
    paths = sorted(paths)
    manifest = {}
    for path in paths:
        if path.is_symlink() or not path.resolve().is_relative_to(ROOT):
            raise ValueError("Package entry escapes source root")
        manifest[path.relative_to(ROOT).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
    destination = ROOT / "output" / "packages"
    destination.mkdir(parents=True, exist_ok=True)
    archive = destination / "AIW_v0.10.0-rc.10.73.6_knowledge-room_full-collection_source.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as package:
        for path in paths:
            info = zipfile.ZipInfo(path.relative_to(ROOT).as_posix(), date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            package.writestr(info, path.read_bytes())
        info = zipfile.ZipInfo("SOURCE_MANIFEST.json", date_time=(2026, 1, 1, 0, 0, 0))
        package.writestr(info, json.dumps(manifest, indent=2))
    with zipfile.ZipFile(archive) as package:
        if set(package.namelist()) != set(manifest) | {"SOURCE_MANIFEST.json"}:
            raise ValueError("Unexpected source package contents")
        for name, expected in manifest.items():
            if hashlib.sha256(package.read(name)).hexdigest() != expected:
                raise ValueError("Packaged source hash mismatch: " + name)
    report = {"archive": archive.name, "sha256": hashlib.sha256(archive.read_bytes()).hexdigest(),
              "verifiedContents": True, "sourceFileCount": len(paths), "productionAccepted": False, "files": manifest}
    (destination / "FULL_COLLECTION_PACKAGE_RECEIPT.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "files"}))


if __name__ == "__main__":
    main()
