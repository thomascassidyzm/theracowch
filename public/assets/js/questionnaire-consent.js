/* Questionnaire consent gate.

   The app's first-launch consent gate lives in app.html. Anyone who arrives at a
   questionnaire directly — a link from Mandy's site, a ?ref= / ?utm_source= link,
   a shared URL — never passes through app.html, so they had never been shown it.
   This puts the same moment in front of them, before they tap a single answer.

   Same storage key and same three statements as the app gate, so a person who has
   already agreed in the app never sees it twice, and agreeing here means they
   won't see it when they open the app either.

   No framework, no build step: one script tag, styles injected here. */
(function () {
  'use strict';

  var CONSENT_KEY = 'cowch-consent-v1';

  var stored = null;
  try { stored = localStorage.getItem(CONSENT_KEY); } catch (e) {}
  if (stored === 'accepted') return;

  // First-touch acquisition label (?ref= / ?utm_source=), matching analytics.js.
  // Recorded here too so a referral that lands straight on a questionnaire isn't
  // lost — it's a channel label, never anything personal.
  try {
    var params = new URLSearchParams(window.location.search);
    var src = params.get('utm_source') || params.get('ref');
    if (src && !localStorage.getItem('cowch-source')) {
      localStorage.setItem('cowch-source', String(src).slice(0, 40));
    }
  } catch (e) {}

  function build() {
    var style = document.createElement('style');
    style.textContent = [
      '.qconsent-gate{position:fixed;inset:0;z-index:10000;background:rgba(45,45,45,.55);',
      '-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);display:flex;align-items:center;',
      'justify-content:center;padding:16px;overflow-y:auto;font-family:inherit}',
      '.qconsent-gate[hidden]{display:none}',
      '.qconsent-card{background:#FDF5E8;color:#2D2D2D;border:4px solid #2D2D2D;border-radius:14px;',
      'padding:24px;max-width:520px;width:100%;box-shadow:8px 8px 0 rgba(60,46,40,.2);',
      'max-height:90vh;overflow-y:auto}',
      '.qconsent-title{font-size:clamp(1.3rem,4vw,1.7rem);font-weight:900;margin:0 0 6px}',
      '.qconsent-lede{color:#5C4432;margin:0 0 16px}',
      '.qconsent-statement{background:#FFF6F0;border-left:5px solid #C9A857;padding:14px;',
      'margin-bottom:20px;font-size:.95rem;line-height:1.5}',
      '.qconsent-statement p{margin:0}',
      '.qconsent-statement p+p{margin-top:10px}',
      '.qconsent-row{display:flex;align-items:flex-start;gap:10px;margin-bottom:16px;cursor:pointer;',
      'font-size:.95rem;line-height:1.45}',
      '.qconsent-row input{margin-top:4px;flex-shrink:0;width:20px;height:20px;accent-color:#E35B32}',
      '.qconsent-row a{color:#E35B32;font-weight:700;text-decoration:underline}',
      '.qconsent-accept{width:100%;background:#FFD6C9;color:#2D2D2D;border:4px solid #F37A53;',
      'border-radius:10px;padding:14px 20px;font-family:inherit;font-size:1rem;font-weight:900;',
      'text-transform:uppercase;letter-spacing:.03em;cursor:pointer;margin-top:8px;',
      'box-shadow:4px 4px 0 rgba(60,46,40,.2)}',
      '.qconsent-accept:disabled{opacity:.4;cursor:not-allowed}',
      '.qconsent-footnote{font-size:.8rem;color:#7A6556;margin-top:16px;text-align:center}'
    ].join('');
    document.head.appendChild(style);

    var gate = document.createElement('div');
    gate.className = 'qconsent-gate';
    gate.setAttribute('role', 'dialog');
    gate.setAttribute('aria-modal', 'true');
    gate.setAttribute('aria-labelledby', 'qconsent-title');
    gate.innerHTML = [
      '<div class="qconsent-card">',
      '<h2 id="qconsent-title" class="qconsent-title">Welcome to Cowch 🐄</h2>',
      '<p class="qconsent-lede">Before you start, a few things to know.</p>',
      '<div class="qconsent-statement">',
      '<p><strong>Cowch is a wellbeing-support app. It does not replace clinical therapy, medical care, diagnosis, medication, or emergency services.</strong></p>',
      '<p>Your answers are kept on this device. Nothing is sent anywhere unless you choose to share your results.</p>',
      '<p>If you’re in crisis right now, please contact emergency services (UK 999 / US 911), NHS 111 option 2, Samaritans 116 123, or text SHOUT to 85258.</p>',
      '</div>',
      '<label class="qconsent-row"><input type="checkbox" data-qconsent="age">',
      '<span>I am 18 or over, or using this with a parent or guardian involved in my care.</span></label>',
      '<label class="qconsent-row"><input type="checkbox" data-qconsent="terms">',
      '<span>I have read and agree to the <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a> and <a href="/terms.html" target="_blank" rel="noopener">Terms of Use</a>.</span></label>',
      '<label class="qconsent-row"><input type="checkbox" data-qconsent="clinical">',
      '<span>I understand this is for wellbeing support and is not a substitute for clinical therapy or crisis services.</span></label>',
      '<button type="button" class="qconsent-accept" disabled>I agree and continue</button>',
      '<p class="qconsent-footnote">You can review these policies any time.</p>',
      '</div>'
    ].join('');
    document.body.appendChild(gate);

    var boxes = [].slice.call(gate.querySelectorAll('input[data-qconsent]'));
    var btn = gate.querySelector('.qconsent-accept');

    function update() {
      btn.disabled = !boxes.every(function (b) { return b.checked; });
    }
    boxes.forEach(function (b) { b.addEventListener('change', update); });

    btn.addEventListener('click', function () {
      try {
        localStorage.setItem(CONSENT_KEY, 'accepted');
        localStorage.setItem(CONSENT_KEY + ':date', new Date().toISOString());
      } catch (e) {}
      gate.remove();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
