# rc.10.48 Brain Alive Web Integration

## Required imports

Add the CSS once in the web app entry or product shell:

```ts
import './styles/brain-alive.css';
```

Inside the design workspace shell:

```tsx
import { QuietBrainSignalLayer } from './components/brain/QuietBrainSignalLayer';

<QuietBrainSignalLayer workspace={workspaceStoreSnapshot} />
```

Inside library cards:

```tsx
<LibrarySignalChips signals={brain.librarySignals.filter(s => s.patternId === pattern.id || s.styleId === style.id)} />
```

Inside canvas nodes:

```tsx
<CanvasBrainBadges signals={brain.canvasSignals.filter(s => s.objectId === node.id)} />
```

Inside Decision Radar drawer:

```tsx
<DecisionRadarSignalPanel signals={brain.radarSignals} />
```

Inside Co-Architect menu:

```tsx
<CoArchitectPromptMenu stage={brain.context.activeStage} signals={brain.coArchitectSignals} onPrompt={openCoArchitect} />
```

## Rules

- Do not show all signals by default.
- Do not render long explanation text directly on the canvas.
- Do not call OpenAI or any LLM provider from a React component.
- Detailed reasoning belongs in Info Center, Decision Radar, or Co-Architect.
