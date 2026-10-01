/**
 * Keep the focused text field in sight when the screen shrinks around it.
 *
 * Tom, 2026-10-01, iPhone: the onboarding name field and the chat composer sat
 * behind the keyboard. The main cause was the PLAY shell's frame not giving the
 * keyboard its strip (fixed in command-surface), but it left a second gap: once
 * the frame (or, on Android, the page) gets shorter, a field that was lower on a
 * scrolling page is now below the bottom edge, and the browser does not scroll
 * a nested or resized document back to the caret on its own.
 *
 * So: whenever the viewport resizes (or a field takes focus) and the focused
 * field is outside what is visible, scroll it into view. If it is already
 * visible this does nothing, so it never fights iOS Safari's own pan to the caret.
 */
(function () {
  'use strict';

  var TEXT = /^(text|email|search|tel|url|password|number)$/i;
  function isField(el) {
    if (!el) return false;
    if (el.isContentEditable || el.tagName === 'TEXTAREA') return true;
    return el.tagName === 'INPUT' && TEXT.test(el.type || 'text');
  }

  function reveal() {
    var el = document.activeElement;
    if (!isField(el)) return;
    var vv = window.visualViewport;
    var top = vv ? vv.offsetTop : 0;
    var bottom = top + (vv ? vv.height : window.innerHeight);
    var r = el.getBoundingClientRect();
    if (r.top >= top && r.bottom <= bottom) return;
    el.scrollIntoView({ block: 'center', inline: 'nearest' });
  }

  var timer = null;
  function soon() { clearTimeout(timer); timer = setTimeout(reveal, 60); }

  window.addEventListener('resize', soon);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', soon);
  // iOS can drop the last resize of the keyboard animation; one late re-check
  document.addEventListener('focusin', function () { setTimeout(reveal, 400); });
})();
