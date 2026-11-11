/* Shared paper-turn sound for ordinary page navigation.
   Title scrolls keep their existing unroll sound. */
(() => {
 const clip = new Audio('assets/audio/sfx/card_flip.mp3');
 clip.preload = 'auto';
 clip.volume = 0.58;
 const scrollSelector = '#titleLinks a,#startGame,#storyModeStart,#storyUnlockChoices .story-unlock-choice';
 const flipButtonSelector = 'button[onclick*="returnToTitle"],#dialogueHome,#battleQuit';
 let lastPlay = 0;
 function enabled() {
  const storyFx = document.getElementById('storyFxToggle');
  if (storyFx && storyFx.getAttribute('aria-pressed') === 'false') return false;
  const gameFx = document.getElementById('sfxToggle');
  if (gameFx && /OFF/i.test(gameFx.textContent || '')) return false;
  return true;
 }
 function play() {
  if (!enabled()) return;
  if (Date.now() - lastPlay < 180) return;
  lastPlay = Date.now();
  try { clip.pause(); clip.currentTime = 0; const p = clip.play(); if (p?.catch) p.catch(() => {}); } catch (_) {}
 }
 document.addEventListener('click', event => {
  if (event.defaultPrevented || event.button !== 0) return;
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  if (!target) return;
  if (target.closest(scrollSelector)) return;
  const button = target.closest(flipButtonSelector);
  if (button) { play(); return; }
  const anchor = target.closest('a[href]');
  if (!anchor || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey ||
      anchor.hasAttribute('download') || (anchor.target && anchor.target !== '_self')) return;
  let url;
  try { url = new URL(anchor.href, location.href); } catch (_) { return; }
  if (url.origin !== location.origin || !/^https?:$/.test(url.protocol) ||
      (url.pathname === location.pathname && url.search === location.search && url.hash)) return;
  if (!enabled()) return;
  event.preventDefault();
  play();
  setTimeout(() => { location.href = url.href; }, 230);
 }, true);
})();