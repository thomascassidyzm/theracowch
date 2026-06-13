/**
 * Share Cowch — native share sheet with a copy-link fallback.
 *
 * Public API:
 *   window.CowchShare.share()    — open the native share sheet, or (where the
 *                                  Web Share API isn't available, e.g. desktop)
 *                                  copy the link and show a brief toast.
 *   window.CowchShare.canShare() — true if a native share sheet is available.
 *
 * Self-contained: injects its own toast styles, no dependency on app.js.
 */
(function () {
  'use strict';

  var SHARE_URL = 'https://cowch.app/';
  var SHARE_TITLE = 'Cowch — your pocket wellness coach';
  var SHARE_TEXT =
    "Mandy's a warm AI wellness coach built on a real CBT therapist's approach — " +
    "free, private, and always there when you need her. Have a look:";

  function canShare() {
    return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  }

  function share() {
    haptic('light');
    if (canShare()) {
      track('share', { channel: 'native' });
      navigator.share({ title: SHARE_TITLE, text: SHARE_TEXT, url: SHARE_URL })
        .then(function () { haptic('success'); })
        .catch(function () { /* user dismissed the sheet — nothing to do */ });
      return;
    }
    // No native share (typically desktop) → copy the link instead.
    track('share', { channel: 'copy' });
    copyLink();
  }

  function track(name, data) {
    try { if (window.cowchTrack) window.cowchTrack(name, data); } catch (_) {}
  }

  function copyLink() {
    var done = function () {
      haptic('success');
      toast('Link copied — paste it to share 💚');
    };
    var fail = function () {
      toast('Copy this link to share: ' + SHARE_URL, 6000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(SHARE_URL).then(done).catch(function () {
        legacyCopy(SHARE_URL) ? done() : fail();
      });
    } else {
      legacyCopy(SHARE_URL) ? done() : fail();
    }
  }

  function legacyCopy(text) {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.top = '-1000px';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch (_) { return false; }
  }

  // ----- Toast -----
  var toastEl = null;
  var toastTimer = null;
  function toast(msg, ms) {
    ms = ms || 2600;
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'cowch-share-toast';
      toastEl.setAttribute('role', 'status');
      toastEl.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    requestAnimationFrame(function () { toastEl.classList.add('is-visible'); });
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      if (toastEl) toastEl.classList.remove('is-visible');
    }, ms);
  }

  // ----- Haptics (best-effort, mirrors pwa-install.js) -----
  function haptic(kind) {
    try {
      if (window.hapticFeedback) return window.hapticFeedback(kind);
      if (navigator.vibrate) {
        if (kind === 'success') navigator.vibrate([10, 30, 10]);
        else navigator.vibrate(8);
      }
    } catch (_) {}
  }

  // ----- Self-contained toast styles -----
  function injectStyles() {
    if (document.getElementById('cowch-share-styles')) return;
    var s = document.createElement('style');
    s.id = 'cowch-share-styles';
    s.textContent =
      '.cowch-share-toast{' +
      'position:fixed;left:50%;z-index:10000;' +
      'bottom:calc(env(safe-area-inset-bottom, 0px) + 92px);' +
      'transform:translate(-50%,12px);' +
      'max-width:min(92vw,420px);padding:13px 18px;border-radius:14px;' +
      'background:#2D2D2D;color:#F5F0E8;font-size:15px;line-height:1.35;' +
      'font-family:inherit;text-align:center;word-break:break-word;' +
      'box-shadow:0 8px 28px rgba(0,0,0,.28);' +
      'opacity:0;pointer-events:none;' +
      'transition:opacity .24s ease, transform .24s ease;}' +
      '.cowch-share-toast.is-visible{opacity:1;transform:translate(-50%,0);}';
    document.head.appendChild(s);
  }
  injectStyles();

  window.CowchShare = { share: share, canShare: canShare };
})();
