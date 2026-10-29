// The theme setting (round 9, audit/round9/DESIGN.md §2 D): Light, Dark or System, chosen from the top bar of the
// chapters and of the Projects page, kept per viewer in this browser (aiw.theme, a convenience: without storage the
// page stays light) and applied to the root's data-theme, which theme.css reads. theme-boot.js applies the kept
// choice before the first paint; this module offers the control and applies a change at once.
import {esc} from './html-escape.js';
const KEY = 'aiw.theme', CHOICES = [['light', 'Light'], ['dark', 'Dark'], ['system', 'System']];
// On a phone the words give way to a sun, a moon and a half-filled circle (theme-ui.css); the words stay for assistive
// technology and in the title.
const GLYPH = {
  light: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  dark: '<path d="M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.2 6.2 0 0 0 10.1 10.1z"/>',
  system: '<circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16z" class="fill"/>',
};
export function themeChoice() {
  const now = typeof document !== 'undefined' ? document.documentElement.getAttribute('data-theme') : null;
  return CHOICES.some(([id]) => id === now) ? now : 'light';
}
export function themeControl() {
  const now = themeChoice();
  return `<div class="theme-switch" role="group" aria-label="Theme">${CHOICES.map(([id, name]) => `<button type="button" data-theme-choice="${esc(id)}" aria-pressed="${id === now}" title="${esc(id === 'system' ? 'Follow the operating system' : name + ' theme')}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${GLYPH[id]}</svg><span class="ts-label">${esc(name)}</span></button>`).join('')}</div>`;
}
export function setTheme(choice) {
  if (!CHOICES.some(([id]) => id === choice)) return themeChoice();
  document.documentElement.setAttribute('data-theme', choice);
  try { window.localStorage.setItem(KEY, choice); } catch { /* storage unavailable: the choice lasts for this page */ }
  document.querySelectorAll('[data-theme-choice]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeChoice === choice)));
  return choice;
}
if (typeof document !== 'undefined' && !window.__aiwThemeControl) {
  window.__aiwThemeControl = true;
  document.addEventListener('click', (event) => { const b = event.target?.closest?.('[data-theme-choice]'); if (b) setTheme(b.dataset.themeChoice); });
}
