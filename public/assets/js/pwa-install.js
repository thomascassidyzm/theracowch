/**
 * PWA Install — banner + full-screen guide.
 *
 * Public API:
 *   window.CowchInstall.openGuide()      — open the full guide overlay
 *   window.CowchInstall.markEngagement() — call when user does something meaningful
 *                                          (e.g. sends first chat message); banner
 *                                          may appear if eligible.
 */
(function () {
  'use strict';

  // ----- Storage keys & policy -----
  const DISMISS_AT_KEY = 'cowch-install-dismissed-at';
  const DISMISS_COUNT_KEY = 'cowch-install-dismiss-count';
  const MAX_DISMISSALS = 3;
  const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const ENGAGEMENT_DELAY_MS = 1500; // small breath after engagement before banner slides in

  // ----- Platform detection -----
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|Edg/.test(ua);
  const isChromeIOS = /CriOS/.test(ua);

  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone === true;
  }

  // ----- Native prompt capture -----
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    hideBanner();
  });

  // ----- Eligibility -----
  function shouldShowBanner() {
    if (isStandalone()) return false;
    const count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || '0', 10);
    if (count >= MAX_DISMISSALS) return false;
    const at = localStorage.getItem(DISMISS_AT_KEY);
    if (at) {
      const elapsed = Date.now() - parseInt(at, 10);
      if (elapsed < COOLDOWN_MS) return false;
    }
    return true;
  }

  // ----- Banner -----
  let bannerEl = null;

  function showBanner() {
    if (bannerEl || !shouldShowBanner()) return;

    const el = document.createElement('div');
    el.className = 'cowch-install-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', 'Install Cowch');
    el.innerHTML = `
      <div class="cowch-install-banner__inner">
        <div class="cowch-install-banner__left">
          <div class="cowch-install-banner__icon">
            <img src="/icons/icon-192x192.png" alt="" width="44" height="44" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'🐄',className:'cowch-install-banner__icon-fallback'}))">
          </div>
          <div class="cowch-install-banner__text">
            <span class="cowch-install-banner__title">Install Cowch</span>
            <span class="cowch-install-banner__subtitle">Faster, offline, full-screen</span>
          </div>
        </div>
        <div class="cowch-install-banner__actions">
          <button type="button" class="cowch-install-banner__cta" data-action="install">Install</button>
          <button type="button" class="cowch-install-banner__close" data-action="dismiss" aria-label="Dismiss">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    bannerEl = el;

    // Animate in on next frame
    requestAnimationFrame(function () {
      el.classList.add('is-visible');
    });

    el.querySelector('[data-action="install"]').addEventListener('click', onBannerInstall);
    el.querySelector('[data-action="dismiss"]').addEventListener('click', onBannerDismiss);

    if (window.cowchTrack) window.cowchTrack('install_banner_shown');
  }

  function hideBanner() {
    if (!bannerEl) return;
    const el = bannerEl;
    bannerEl = null;
    el.classList.remove('is-visible');
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 320);
  }

  function onBannerInstall() {
    haptic('medium');
    hideBanner();
    // Native prompt available → fire it inline. Otherwise → open the guide.
    if (deferredPrompt && !isIOS) {
      const p = deferredPrompt;
      deferredPrompt = null;
      p.prompt();
      p.userChoice && p.userChoice.then(function (res) {
        if (res && res.outcome === 'accepted') haptic('success');
      });
    } else {
      openGuide();
    }
  }

  function onBannerDismiss() {
    haptic('light');
    hideBanner();
    const count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || '0', 10) + 1;
    localStorage.setItem(DISMISS_COUNT_KEY, String(count));
    localStorage.setItem(DISMISS_AT_KEY, String(Date.now()));
  }

  // ----- Full-screen guide overlay -----
  let overlayEl = null;
  let guideStep = 0;

  function openGuide() {
    if (overlayEl) return;
    hideBanner();

    const flow = pickFlow();
    guideStep = 0;

    if (window.cowchTrack) window.cowchTrack('install_guide_opened', { flow: flow });

    const el = document.createElement('div');
    el.className = 'cowch-install-overlay';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.innerHTML = renderOverlay(flow);
    document.body.appendChild(el);
    overlayEl = el;

    document.body.style.overflow = 'hidden';

    requestAnimationFrame(function () {
      el.classList.add('is-visible');
    });

    bindOverlay(el, flow);

    if (flow === 'installed') {
      let n = 2;
      const tick = setInterval(function () {
        n--;
        const c = el.querySelector('[data-countdown]');
        if (c) c.textContent = String(Math.max(0, n));
        if (n <= 0) {
          clearInterval(tick);
          closeGuide();
        }
      }, 1000);
    }

    // Android: if the prompt arrives after the guide is open, swap the loader for the button
    if (flow === 'android' || flow === 'desktop') {
      const t0 = Date.now();
      const poll = setInterval(function () {
        if (!overlayEl) { clearInterval(poll); return; }
        if (deferredPrompt) {
          clearInterval(poll);
          const slot = overlayEl.querySelector('[data-prompt-slot]');
          if (slot) {
            slot.innerHTML = '<button type="button" class="cowch-install-btn" data-action="native-install">Install</button>';
            const btn = slot.querySelector('[data-action="native-install"]');
            if (btn) btn.addEventListener('click', triggerNativeInstall);
          }
        } else if (Date.now() - t0 > 4000) {
          clearInterval(poll);
          // Fall back to manual on Android if prompt never came
          if (flow === 'android') {
            const slot = overlayEl.querySelector('[data-prompt-slot]');
            if (slot) slot.innerHTML = '';
            const fallback = overlayEl.querySelector('[data-android-fallback]');
            if (fallback) fallback.style.display = 'block';
          }
        }
      }, 250);
    }
  }

  function closeGuide() {
    if (!overlayEl) return;
    const el = overlayEl;
    overlayEl = null;
    el.classList.remove('is-visible');
    document.body.style.overflow = '';
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 320);
  }

  function pickFlow() {
    if (isStandalone()) return 'installed';
    if (isIOS) return 'ios';
    if (isAndroid) return 'android';
    return 'desktop';
  }

  function renderOverlay(flow) {
    const close = `
      <button type="button" class="cowch-install-overlay__close" data-action="close" aria-label="Close">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    `;

    if (flow === 'installed') {
      return `
        <div class="cowch-install-overlay__bg"></div>
        <div class="cowch-install-overlay__sheet">
          ${close}
          <div class="cowch-install-section">
            ${appIcon(96)}
            <h1 class="cowch-install-h1">You're all set!</h1>
            <p class="cowch-install-subtitle">Cowch is already installed.</p>
            <p class="cowch-install-muted">Closing in <span data-countdown>2</span>s…</p>
          </div>
        </div>
      `;
    }

    if (flow === 'android') {
      return `
        <div class="cowch-install-overlay__bg"></div>
        <div class="cowch-install-overlay__sheet">
          ${close}
          <div class="cowch-install-section">
            ${appIcon(96)}
            <h1 class="cowch-install-h1">Install Cowch</h1>
            <p class="cowch-install-subtitle">A calmer space, on your home screen</p>
            <ul class="cowch-install-bullets">
              <li><span class="cowch-install-bullet-tick" aria-hidden="true"></span>Opens instantly — no browser bar</li>
              <li><span class="cowch-install-bullet-tick" aria-hidden="true"></span>Works offline — Mandy's still here</li>
              <li><span class="cowch-install-bullet-tick" aria-hidden="true"></span>Picks up where you left off</li>
            </ul>
            <div class="cowch-install-prompt-slot" data-prompt-slot>
              ${deferredPrompt ? '<button type="button" class="cowch-install-btn" data-action="native-install">Install</button>' : loadingDots()}
            </div>
            <div class="cowch-install-fallback" data-android-fallback style="display:none">
              <div class="cowch-install-steps">
                <div class="cowch-install-step"><span class="cowch-install-step__num">1</span><span>Tap the <strong>menu</strong> <svg class="cowch-install-inline-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg> in your browser</span></div>
                <div class="cowch-install-step"><span class="cowch-install-step__num">2</span><span>Tap <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong></span></div>
                <div class="cowch-install-step"><span class="cowch-install-step__num">3</span><span>Tap <strong>"Add"</strong></span></div>
              </div>
            </div>
            <button type="button" class="cowch-install-skip" data-action="dismiss">Not now</button>
          </div>
        </div>
      `;
    }

    if (flow === 'ios') {
      const totalSteps = isSafari ? 4 : 4;
      return `
        <div class="cowch-install-overlay__bg"></div>
        <div class="cowch-install-overlay__sheet">
          ${close}
          <div class="cowch-install-section cowch-install-section--ios">
            ${appIcon(64, true)}
            <h1 class="cowch-install-h1 cowch-install-h1--small">Install Cowch</h1>
            <div class="cowch-install-dots" data-dots>
              ${Array.from({length: totalSteps}, function (_, i) {
                return '<span class="cowch-install-dot' + (i === 0 ? ' is-active' : '') + '"></span>';
              }).join('')}
            </div>
            <div class="cowch-install-step-area" data-step-area></div>
            <div class="cowch-install-nav">
              <button type="button" class="cowch-install-nav-btn" data-action="prev" style="visibility:hidden">Back</button>
              <button type="button" class="cowch-install-nav-btn cowch-install-nav-btn--primary" data-action="next">Next</button>
            </div>
          </div>
        </div>
      `;
    }

    // desktop
    return `
      <div class="cowch-install-overlay__bg"></div>
      <div class="cowch-install-overlay__sheet">
        ${close}
        <div class="cowch-install-section">
          ${appIcon(96)}
          <h1 class="cowch-install-h1">Install Cowch</h1>
          <p class="cowch-install-subtitle">Its own window — no tabs, no distractions</p>
          <ul class="cowch-install-bullets">
            <li><span class="cowch-install-bullet-tick" aria-hidden="true"></span>Opens in its own window</li>
            <li><span class="cowch-install-bullet-tick" aria-hidden="true"></span>Works offline</li>
            <li><span class="cowch-install-bullet-tick" aria-hidden="true"></span>Picks up where you left off</li>
          </ul>
          <div class="cowch-install-prompt-slot" data-prompt-slot>
            ${deferredPrompt ? '<button type="button" class="cowch-install-btn" data-action="native-install">Install</button>' : loadingDots()}
          </div>
          <p class="cowch-install-muted cowch-install-desktop-hint">
            If nothing happens, look for the install icon
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="vertical-align:-2px"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="12" y1="8" x2="12" y2="14"/><polyline points="9 11 12 14 15 11"/></svg>
            in your address bar.
          </p>
          <button type="button" class="cowch-install-skip" data-action="dismiss">Not now</button>
        </div>
      </div>
    `;
  }

  function bindOverlay(root, flow) {
    root.querySelector('[data-action="close"]').addEventListener('click', closeGuide);
    root.querySelector('.cowch-install-overlay__bg').addEventListener('click', closeGuide);

    const dismiss = root.querySelector('[data-action="dismiss"]');
    if (dismiss) dismiss.addEventListener('click', function () {
      onBannerDismiss();
      closeGuide();
    });

    const native = root.querySelector('[data-action="native-install"]');
    if (native) native.addEventListener('click', triggerNativeInstall);

    if (flow === 'ios') bindIOSGuide(root);

    // Esc closes
    const onKey = function (e) {
      if (e.key === 'Escape') {
        closeGuide();
        document.removeEventListener('keydown', onKey);
      }
    };
    document.addEventListener('keydown', onKey);
  }

  function triggerNativeInstall() {
    if (!deferredPrompt) return;
    haptic('medium');
    const p = deferredPrompt;
    deferredPrompt = null;
    p.prompt();
    p.userChoice && p.userChoice.then(function (res) {
      if (res && res.outcome === 'accepted') {
        haptic('success');
        closeGuide();
      }
    });
  }

  // ----- iOS step content -----
  function bindIOSGuide(root) {
    const stepArea = root.querySelector('[data-step-area]');
    const dots = root.querySelectorAll('[data-dots] .cowch-install-dot');
    const prev = root.querySelector('[data-action="prev"]');
    const next = root.querySelector('[data-action="next"]');
    const totalSteps = 4;

    function render() {
      stepArea.innerHTML = iosStepHTML(guideStep);
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === guideStep);
      });
      prev.style.visibility = guideStep === 0 ? 'hidden' : 'visible';
      next.textContent = guideStep === totalSteps - 1 ? 'Done' : 'Next';
    }

    prev.addEventListener('click', function () {
      if (guideStep > 0) { guideStep--; render(); }
    });
    next.addEventListener('click', function () {
      if (guideStep < totalSteps - 1) { guideStep++; render(); }
      else closeGuide();
    });

    render();
  }

  function iosStepHTML(i) {
    if (i === 0) {
      const where = isChromeIOS ? 'in the menu (top right)' : 'at the bottom of Safari';
      const dir = isChromeIOS ? 'cowch-install-pointer--up' : 'cowch-install-pointer--down';
      return `
        <div class="cowch-install-step-card">
          <div class="cowch-install-step-instruction">
            Tap the <strong>Share</strong> button
            ${shareSvg(22)}
          </div>
          <p class="cowch-install-step-hint">It's ${where}</p>
          <div class="cowch-install-pointer ${dir}">
            <span class="cowch-install-pulse"></span>
            ${shareSvg(36, true)}
          </div>
        </div>
      `;
    }
    if (i === 1) {
      return `
        <div class="cowch-install-step-card">
          <div class="cowch-install-step-instruction">
            Scroll down and tap <strong>"Add to Home Screen"</strong>
          </div>
          <div class="cowch-mock-sheet">
            <div class="cowch-mock-row cowch-mock-row--faded">
              <span class="cowch-mock-icon">${iconSvg('copy')}</span>
              <span>Copy</span>
            </div>
            <div class="cowch-mock-row cowch-mock-row--highlight">
              <span class="cowch-mock-icon cowch-mock-icon--highlight">${iconSvg('add')}</span>
              <span class="cowch-mock-label--highlight">Add to Home Screen</span>
            </div>
            <div class="cowch-mock-row cowch-mock-row--faded">
              <span class="cowch-mock-icon">${iconSvg('reading')}</span>
              <span>Add to Reading List</span>
            </div>
          </div>
        </div>
      `;
    }
    if (i === 2) {
      return `
        <div class="cowch-install-step-card">
          <div class="cowch-install-step-instruction">
            Tap <strong>"Add"</strong> in the top right
          </div>
          <div class="cowch-mock-confirm">
            <div class="cowch-mock-confirm__head">
              <span class="cowch-mock-cancel">Cancel</span>
              <span class="cowch-mock-title">Add to Home Screen</span>
              <span class="cowch-mock-add">Add</span>
            </div>
            <div class="cowch-mock-confirm__body">
              ${appIconRaw(48)}
              <div>
                <div class="cowch-mock-app-name">Cowch</div>
                <div class="cowch-mock-app-url">cowch.app</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }
    return `
      <div class="cowch-install-step-card cowch-install-step-card--done">
        <div class="cowch-install-step-instruction cowch-install-step-instruction--done">
          That's it! Open <strong>Cowch</strong> from your home screen.
        </div>
        ${appIcon(80, false, 'cowch-install-bounce')}
        <p class="cowch-install-step-hint">It runs full-screen, no browser bar.</p>
      </div>
    `;
  }

  // ----- SVG / icon helpers -----
  function appIcon(size, small, extraClass) {
    const cls = ['cowch-install-app-icon'];
    if (small) cls.push('cowch-install-app-icon--small');
    if (extraClass) cls.push(extraClass);
    return `
      <div class="${cls.join(' ')}" style="width:${size}px;height:${size}px">
        <img src="/icons/icon-192x192.png" alt="Cowch" width="${size}" height="${size}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'🐄',className:'cowch-install-app-icon__fallback'}))">
      </div>
    `;
  }
  function appIconRaw(size) {
    return `<img class="cowch-install-app-icon-raw" src="/icons/icon-192x192.png" alt="" width="${size}" height="${size}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'🐄',className:'cowch-install-app-icon__fallback',style:'font-size:'+${size}+'*0.65+\\'px\\''}))">`;
  }
  function shareSvg(size, withStroke) {
    const stroke = withStroke ? 'var(--coral)' : 'currentColor';
    return `<svg class="cowch-install-share-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>`;
  }
  function iconSvg(name) {
    if (name === 'copy') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>';
    if (name === 'add') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>';
    if (name === 'reading') return '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/></svg>';
    return '';
  }
  function loadingDots() {
    return '<div class="cowch-install-dots-loader" aria-label="Preparing install"><span></span><span></span><span></span></div>';
  }

  // ----- Haptics (best-effort) -----
  function haptic(kind) {
    try {
      if (window.hapticFeedback) return window.hapticFeedback(kind);
      if (navigator.vibrate) {
        if (kind === 'success') navigator.vibrate([10, 30, 10]);
        else if (kind === 'medium') navigator.vibrate(15);
        else navigator.vibrate(8);
      }
    } catch (_) {}
  }

  // ----- Engagement-driven banner trigger -----
  let engaged = false;
  function markEngagement() {
    if (engaged) return;
    engaged = true;
    setTimeout(showBanner, ENGAGEMENT_DELAY_MS);
  }

  // Public API
  window.CowchInstall = {
    openGuide: openGuide,
    markEngagement: markEngagement,
    isStandalone: isStandalone,
  };
})();
