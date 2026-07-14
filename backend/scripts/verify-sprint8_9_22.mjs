import { readFileSync } from 'node:fs';

const files = {
  main: 'apps/web/src/main.tsx',
  css: 'apps/web/src/rc10_39_design_studio.css',
  brief: 'apps/web/src/components/DesignBriefStudio.tsx',
  quality: 'apps/web/src/components/QualityAttributeStudio.tsx',
  canvas: 'apps/web/src/features/canvas/ProCanvasViewSystem.tsx',
  patterns: 'apps/web/src/components/PatternIntelligenceWorkspace.tsx',
  synthesis: 'apps/web/src/components/ArchitectureSynthesisWorkspace.tsx',
  review: 'apps/web/src/components/ReviewWorkspace.tsx',
};
const read = (file) => readFileSync(file, 'utf8');
const required = [
  [files.main, "./rc10_39_design_studio.css"],
  [files.css, 'Sprint 8.9.22 / rc.10.39'],
  [files.css, '.concept2-stage-board'],
  [files.css, '.canvas-concept2'],
  [files.css, '.synthesis-concept2'],
  [files.css, '.pattern-concept2'],
  [files.brief, 'design-brief-concept2'],
  [files.brief, 'Design brief workbench summary'],
  [files.quality, 'quality-concept2'],
  [files.quality, 'Quality driver workbench summary'],
  [files.canvas, 'canvas-concept2'],
  [files.canvas, 'Architecture workbench summary'],
  [files.patterns, 'pattern-concept2'],
  [files.patterns, 'Pattern studio summary'],
  [files.synthesis, 'synthesis-concept2'],
  [files.synthesis, 'Synthesis workbench summary'],
  [files.review, 'review-realize-concept2'],
];
const failures = [];
for (const [file, needle] of required) {
  const content = read(file);
  if (!content.includes(needle)) failures.push(`${file} missing ${needle}`);
}
const css = read(files.css);
if (/font-size:\s*(?:7|8|9|10)px/.test(css)) failures.push('Concept 2 CSS introduced sub-11px text.');
if (!css.includes('@media (max-width: 1100px)')) failures.push('Concept 2 CSS missing responsive fallback.');
if (failures.length) {
  console.error('Sprint 8.9.22 verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('Sprint 8.9.22 Concept 2 design studio page verification passed.');
