// The Model integrity lens opens on demand. Read its chapter projections from one
// lazy module so the production bundle does not write a separate import facade
// for each model that is already shared with the chapter workspace.
import {architectureModel, relationshipFindings} from './architecture-model.js';
import {storySource, storyInsights} from './story-model.js';
import {utilitySource, utilityInsights} from './utility-model.js';
import {tradeoffSource, tradeoffInsights} from './tradeoff-model.js';
import {responsibilitySource, responsibilityInsights} from './responsibility-model.js';
import {realiseSource, realiseInsights} from './realise-model.js';
import {platformSource, platformInsights} from './platform-model.js';
import {stackSource, stackInsights} from './stack-model.js';
import {exchangeSource, exchangeInsights} from './exchange-model.js';
import {threatSource, threatInsights} from './threat-model.js';
import {deploySource, deployInsights} from './deploy-model.js';
import {deskModel, describeTrace} from './desk-model.js';

const chapters = {
  1: [storySource, storyInsights],
  2: [utilitySource, utilityInsights],
  3: [tradeoffSource, tradeoffInsights],
  4: [responsibilitySource, responsibilityInsights],
  5: [realiseSource, realiseInsights],
  6: [platformSource, platformInsights],
  7: [stackSource, stackInsights],
  8: [exchangeSource, exchangeInsights],
  9: [threatSource, threatInsights],
  10: [deploySource, deployInsights]
};

export function chapterModelPrompts(p, chapter) {
  if (Number(chapter) === 11) {
    const D = deskModel(p);
    return [...D.trace.filter(t => t.firstBreak).map(t => ({id:t.id,kind:'gap',text:describeTrace(t)})), ...D.findings.map(x => ({id:x.finding?.objectId || '',kind:'warning',text:x.anti.title + ': ' + (x.anti.detail || x.anti.description || x.treatment)}))];
  }
  const pair = chapters[chapter];
  if (!pair) return [];
  return pair[1](pair[0](p)) || [];
}

export function validationModel(p, chapter) {
  const model = architectureModel(p), typed = relationshipFindings(p, {chapter});
  let prompts = [];
  try { prompts = chapterModelPrompts(p, chapter); } catch { /* structural checks remain available */ }
  return {model, typed, prompts};
}
