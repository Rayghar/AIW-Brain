import {REASONING_INSTRUCTIONS,REVIEW_INSTRUCTIONS} from '../shared/reasoning-instructions.js';
// Fail the build when browser-visible receipts differ from server instructions.
import {instructionsPin,REASONING_PROMPT_VERSION} from '../public/brain-reasoning.js';
import {sha256} from '../public/brain-integrity.js';
const expected=sha256(REASONING_INSTRUCTIONS+'\n--- review ---\n'+REVIEW_INSTRUCTIONS);
if(instructionsPin().promptVersion!==REASONING_PROMPT_VERSION||instructionsPin().sha256!==expected)throw Error('Reasoning instruction receipt is stale. Run node scripts/pin-reasoning-instructions.mjs, review its diff, and rebuild.');
