import fs from 'node:fs';

const file = 'packages/brain-runtime/src/noiseBudget.ts';
const text = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
const checks = {
  canvasBadges: /canvasBadges:\s*5/.test(text),
  libraryChipsPerItem: /libraryChipsPerItem:\s*2/.test(text),
  stageHealthChips: /stageHealthChips:\s*4/.test(text),
  bottomBrainSignals: /bottomBrainSignals:\s*1/.test(text),
};
const failed = Object.entries(checks).filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Quiet intelligence budget drift detected:');
  for (const [name] of failed) console.error(` - ${name}`);
  process.exit(1);
}
console.log('PASS: quiet intelligence budget is intact.');
