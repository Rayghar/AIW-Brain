import type { AiwLifecycleStage, BrainSignal } from '@aiw/brain-runtime';
import { CO_ARCHITECT_PROMPTS_BY_STAGE } from '../../brain/coArchitectPrompts';

export function CoArchitectPromptMenu({
  stage,
  signals,
  onPrompt,
}: {
  stage: AiwLifecycleStage;
  signals: BrainSignal[];
  onPrompt: (instruction: string, taskType: string, signals: BrainSignal[]) => void;
}) {
  const prompts = CO_ARCHITECT_PROMPTS_BY_STAGE[stage] ?? [];

  return (
    <div className="aiw-coarchitect-menu" aria-label="AIW Co-Architect prompts">
      {prompts.map((prompt) => (
        <button key={prompt.id} onClick={() => onPrompt(prompt.instruction, prompt.taskType, signals)}>
          <span>{prompt.label}</span>
        </button>
      ))}
    </div>
  );
}
