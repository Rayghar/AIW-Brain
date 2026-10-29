// SHA-256 release manifest for AIW V5 (audit C-44). It lists every tracked source file of this folder with
// its size and SHA-256, the commit it was taken from, and one digest over the whole list, so a delivered
// package can be checked file by file. It is evidence, not approval: productionAccepted stays false and no
// release is named here unless --release is given (notation: AIW v0.10.0-rc.10.xx.x).
//
//   node scripts/release-manifest.mjs [--out manifest.json] [--release "AIW v0.10.0-rc.10.xx.x"]
//   node scripts/release-manifest.mjs --verify manifest.json [--root folder]
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readFileSync, writeFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const option = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const BASELINE = 'AIW v0.10.0-rc.10.73.6';
const sha256 = (data) => createHash('sha256').update(data).digest('hex');
const SKIP = /^(node_modules|dist|test-results|\.aiw-local|\.sites-runtime)(\/|$)/;
const MANIFEST = 'SOURCE-MANIFEST.json';

// Tracked files when this is a git checkout; otherwise every file outside build and runtime folders.
function sourceFiles(root) {
  try {
    const listed = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z', '--', '.'], {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']});
    return [...new Set(listed.split('\0').filter(Boolean))].filter((f) => f !== MANIFEST && f !== '.env' && existsSync(path.join(root, f))).sort();
  } catch {
    const out = [];
    (function walk(dir) {
      for (const entry of readdirSync(path.join(root, dir), {withFileTypes: true})) {
        const rel = dir ? dir + '/' + entry.name : entry.name;
        if (SKIP.test(rel) || entry.name === '.git' || rel === MANIFEST || rel === '.env') continue;
        if (entry.isDirectory()) walk(rel); else out.push(rel);
      }
    })('');
    return out.sort();
  }
}
const commit = (root) => { try { return execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim(); } catch { return null; } };

if (args.includes('--verify')) {
  const manifestPath = option('--verify'), root = path.resolve(option('--root') || '.');
  if (!manifestPath) throw new Error('Pass the manifest filename after --verify.');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const problems = [];
  if (sha256(JSON.stringify(manifest.files)) !== manifest.filesDigest) problems.push('the manifest file list does not match its own digest');
  const actualFiles = sourceFiles(root);
  const listedFiles = manifest.files.map(file => file.path);
  for (const file of actualFiles) if (!listedFiles.includes(file)) problems.push('unlisted: ' + file);
  for (const file of manifest.files) {
    const at = path.join(root, file.path);
    if (!existsSync(at)) { problems.push('missing: ' + file.path); continue; }
    const data = readFileSync(at);
    if (data.length !== file.bytes || sha256(data) !== file.sha256) problems.push('changed: ' + file.path);
  }
  console.log(JSON.stringify({verified: !problems.length, files: manifest.files.length, problems: problems.slice(0, 50)}, null, 2));
  process.exitCode = problems.length ? 1 : 0;
} else {
  const root = path.resolve('.');
  const files = sourceFiles(root).map((f) => { const data = readFileSync(path.join(root, f)); return {path: f, bytes: data.length, sha256: sha256(data)}; });
  const manifest = {
    schema: 'aiw.release-manifest.v1',
    product: 'AIW V5 Live Model Explorer',
    baseline: BASELINE,
    release: option('--release') || null,
    commit: commit(root),
    commitMeaning: 'Checkout parent at manifest generation. The Sites publication receipt and git source archive identify the final commit; filesDigest verifies this source content without a self-referential commit hash.',
    generatedAt: new Date().toISOString(),
    productionAccepted: false,
    authority: 'Integrity evidence only. It does not approve the design, accept the release for production or stand in for licence, review or signing decisions.',
    fileCount: files.length,
    totalBytes: files.reduce((n, f) => n + f.bytes, 0),
    filesDigest: sha256(JSON.stringify(files)),
    files,
  };
  const out = option('--out');
  if (out) writeFileSync(out, JSON.stringify(manifest, null, 2) + '\n');
  else process.stdout.write(JSON.stringify(manifest, null, 2) + '\n');
  if (out) console.log(`Manifest: ${files.length} files, ${manifest.totalBytes} bytes, digest ${manifest.filesDigest} → ${out}`);
}
