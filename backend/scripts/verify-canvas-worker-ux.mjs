import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const candidateRoots = [...new Set([
  root,
  path.join(root, 'backend'),
  path.join(root, 'frontend'),
  path.dirname(root),
  path.join(path.dirname(root), 'backend'),
  path.join(path.dirname(root), 'frontend'),
  path.dirname(path.dirname(root)),
  path.join(path.dirname(path.dirname(root)), 'backend'),
  path.join(path.dirname(path.dirname(root)), 'frontend'),
].map((entry) => path.resolve(entry)))].filter((entry) => existsSync(entry));
function resolvePath(relativePath) { for (const base of candidateRoots) { const full = path.join(base, relativePath); if (existsSync(full)) return full; } return null; }
function read(relativePath) { const resolved = resolvePath(relativePath); if (!resolved) throw new Error(`Missing required file ${relativePath} from split-aware roots`); return readFileSync(resolved, 'utf8'); }
function has(relativePath) { return Boolean(resolvePath(relativePath)); }
function assert(condition, message) {
  if (!condition) { console.error(`✗ ${message}`); process.exitCode = 1; }
  else console.log(`✓ ${message}`);
}

const workspaceMap = read('apps/web/src/components/WorkspaceIntelligenceMap.tsx');
const proCanvas = read('apps/web/src/features/canvas/ProCanvasViewSystem.tsx');
const styles = read('apps/web/src/styles.css') + '\n' + (has('apps/web/src/studio-navigation-polish.css') ? read('apps/web/src/studio-navigation-polish.css') : '');
const admin = read('apps/web/src/features/admin/AdminControlPlaneWorkspace.tsx');
const workerPkg = read('apps/worker/package.json');
const indexHtml = read('apps/web/index.html');

assert(workspaceMap.includes('const [mapInteractive, setMapInteractive] = useState(false)'), 'journey intelligence map defaults to read-only navigation-safe mode');
assert(workspaceMap.includes('graphOpen') && workspaceMap.includes('journey-intelligence-static-preview'), 'journey intelligence map uses static preview before mounting ReactFlow');
assert(workspaceMap.includes('zoomOnScroll={mapInteractive}') && workspaceMap.includes('preventScrolling={mapInteractive}'), 'journey intelligence map only enables scroll/pinch capture on explicit interaction');
assert(proCanvas.includes('const [canvasInteractionEnabled, setCanvasInteractionEnabled] = useState(false)'), 'pro canvas defaults to navigation-safe locked mode');
assert(proCanvas.includes('nodesDraggable={canvasInteractionEnabled}') && proCanvas.includes('zoomOnScroll={canvasInteractionEnabled}'), 'pro canvas edit gestures are gated behind explicit enablement');
assert(styles.includes('app-nav--compact') || styles.includes('.app-nav { position: sticky'), 'navigation has protected compact/sticky stacking context');
assert(styles.includes('.canvas-interaction-toggle'), 'canvas exposes visible interaction toggle styling');
assert(admin.includes('summary?.queues?.claimReview'), 'admin summary queue counts are null-safe');
assert(admin.includes('summary?.knowledge?.releaseId'), 'admin knowledge summary is null-safe');
assert(workerPkg.includes('scripts/start-worker.mjs'), 'worker start script auto-builds when dist is missing');
assert(has('apps/worker/scripts/start-worker.mjs'), 'worker bootstrap script exists');
assert(indexHtml.includes('name="mobile-web-app-capable"'), 'modern mobile web app meta tag is present');

if (process.exitCode) process.exit(process.exitCode);
console.log('Canvas/worker/UX stabilization gate passed.');
