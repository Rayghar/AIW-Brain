// The viewer's theme, applied before the first paint (round 9, audit/round9/DESIGN.md §2 D). A classic script
// served by the app (script-src 'self'): it reads the choice kept in this browser and sets data-theme on the root,
// which theme.css reads. Light is the default; "system" follows the operating system. Without storage the page is
// light. The setting itself lives in theme.js.
(function () {
  var choice = 'light';
  try { var saved = window.localStorage.getItem('aiw.theme'); if (saved === 'dark' || saved === 'system' || saved === 'light') choice = saved; } catch (e) { /* storage unavailable: light */ }
  document.documentElement.setAttribute('data-theme', choice);
})();
