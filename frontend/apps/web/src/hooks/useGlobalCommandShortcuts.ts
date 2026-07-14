import { useEffect, type Dispatch, type SetStateAction } from 'react';

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || Boolean(target.closest("input, textarea, select, [contenteditable='true']"));
}

export function useGlobalCommandShortcuts(setCommandOpen: Dispatch<SetStateAction<boolean>>): void {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const commandShortcut = (event.metaKey && key === 'k')
        || (event.ctrlKey && event.shiftKey && key === 'k')
        || (event.ctrlKey && key === 'k');
      const slashShortcut = key === '/'
        && !event.ctrlKey
        && !event.metaKey
        && !event.altKey
        && !isTypingTarget(event.target);

      if (commandShortcut || slashShortcut) {
        event.preventDefault();
        setCommandOpen((value) => !value);
        return;
      }
      if (event.key === 'Escape') setCommandOpen(false);
    };

    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [setCommandOpen]);
}
