/* Share your "What are you like, anyway?" results with Mandy.

   The one place in this product where something a person did can leave their
   device — and it only ever happens because they tapped a button that told them,
   in plain words, exactly what was going and to whom. No beacon, nothing
   default-on, nothing in the background. If this script never runs, nothing is
   lost; the results stay where they always were.

   One script for both variants: it reads the completed result the engines have
   already saved to localStorage, so neither engine needed forking. The
   placeholder div on each page names its own storage key and variant.

   What goes: the six scored axes exactly as they are shown on the page, plus
   the name the person types. What never goes: their individual answers, any
   note they left on the honest exit, and anything in the wellness wheel. The
   server enforces that too (api/questionnaire-share.js builds its record from
   named fields), but it is enforced here first because this is where the person
   is being asked to trust it. */
(function () {
  'use strict';

  var ENDPOINT = '/api/questionnaire-share';
  var SENT_KEY_PREFIX = 'cowch-q-shared:';

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { return null; }
  }

  function mount() {
    var host = document.getElementById('shareToMandy');
    if (!host) return;

    var storeKey = host.getAttribute('data-store') || 'cowch-q-wayl';
    var variant = host.getAttribute('data-variant') || 'single';
    var sentKey = SENT_KEY_PREFIX + variant;

    host.innerHTML = [
      '<div class="panel no-print">',
        '<h2>Send this to Mandy?</h2>',
        '<p>Mandy Kloppers built Cowch. If you came here from her, she can see how you got ',
        'on with this &mdash; but only if you send it. Nothing has been sent so far, and ',
        'nothing will be unless you tap the button.</p>',
        '<div class="callout">',
          '<b>What would go:</b> the six results above &mdash; the bands and the sentences on ',
          'this page &mdash; and the name you type, so she knows whose they are.<br><br>',
          '<b>What would not:</b> your individual answers, anything you typed, and anything ',
          'in your wellness wheel. Those stay on this device.<br><br>',
          'Mandy looks at these to see how people are getting on with Cowch. It is not a ',
          'clinical assessment, and sending it is not booking an appointment or asking for ',
          'a reply.',
        '</div>',
        '<div class="btn-row" data-share-step="start">',
          '<button class="btn btn-primary" type="button" data-share="open">Send my results to Mandy</button>',
        '</div>',
        '<div data-share-step="form" hidden>',
          '<label class="qshare-label" for="qshare-name">The name to show Mandy</label>',
          '<input class="qshare-input" id="qshare-name" type="text" maxlength="80" autocomplete="name" placeholder="Whatever she&rsquo;d know you by">',
          '<label class="qshare-label" for="qshare-email">Your email, if you&rsquo;d like her to be able to reach you &mdash; optional</label>',
          '<input class="qshare-input" id="qshare-email" type="email" maxlength="320" autocomplete="email" placeholder="Leave it blank if you&rsquo;d rather not">',
          '<div class="btn-row">',
            '<button class="btn btn-primary" type="button" data-share="send">Send to Mandy</button>',
            '<button class="btn btn-ghost" type="button" data-share="cancel">Not now</button>',
          '</div>',
        '</div>',
        '<p class="qshare-status" data-share-status role="status" aria-live="polite"></p>',
      '</div>'
    ].join('');

    var style = document.createElement('style');
    style.textContent = [
      '.qshare-label{display:block;font-weight:700;font-size:.92rem;margin:14px 0 5px}',
      '.qshare-input{display:block;width:100%;box-sizing:border-box;font-family:inherit;',
      'font-size:1rem;padding:12px 14px;border:3px solid var(--ink,#2D2D2D);border-radius:10px;',
      'background:#fff;color:var(--ink,#2D2D2D)}',
      '.qshare-status{margin-top:14px;font-weight:700;font-size:.95rem}',
      '.qshare-status.is-error{color:#B03A1F}'
    ].join('');
    document.head.appendChild(style);

    var stepStart = host.querySelector('[data-share-step="start"]');
    var stepForm = host.querySelector('[data-share-step="form"]');
    var status = host.querySelector('[data-share-status]');

    /* If they already sent one from this device, say so rather than inviting a
       second — but leave the door open, since a re-run is a new result. */
    try {
      var already = localStorage.getItem(sentKey);
      if (already) status.textContent = 'You sent your results to Mandy on ' +
        new Date(already).toLocaleDateString() + '. Sending again would add a second copy.';
    } catch (e) {}

    function setStatus(msg, isError) {
      status.textContent = msg;
      status.classList.toggle('is-error', !!isError);
    }

    host.addEventListener('click', function (e) {
      var btn = e.target.closest && e.target.closest('button[data-share]');
      if (!btn) return;
      var act = btn.getAttribute('data-share');

      if (act === 'open') {
        stepStart.hidden = true;
        stepForm.hidden = false;
        setStatus('');
        var nameInput = host.querySelector('#qshare-name');
        if (nameInput) nameInput.focus();
        return;
      }
      if (act === 'cancel') {
        stepForm.hidden = true;
        stepStart.hidden = false;
        setStatus('Nothing sent. Your results are still only on this device.');
        return;
      }
      if (act === 'send') send(btn);
    });

    function send(btn) {
      var result = readJSON(storeKey);
      if (!result || !Array.isArray(result.bands) || !result.bands.length) {
        setStatus('We could not find your results on this device, so there is nothing to send.', true);
        return;
      }
      var displayName = (host.querySelector('#qshare-name').value || '').trim();
      if (!displayName) {
        setStatus('Please give Mandy a name to put to these.', true);
        host.querySelector('#qshare-name').focus();
        return;
      }
      var email = (host.querySelector('#qshare-email').value || '').trim();
      var source = '';
      try { source = localStorage.getItem('cowch-source') || ''; } catch (e) {}

      /* Named fields only — deliberately NOT a spread of the saved blob, which
         also holds `answers` and `abstentions`. */
      var payload = {
        consented: true,
        displayName: displayName,
        email: email,
        source: source,
        variant: result.variant === 'rank' ? 'rank' : variant,
        completed: result.completed || '',
        scenariosSeen: result.scenariosSeen,
        meta: result.meta || '',
        bands: result.bands.map(function (b) {
          var out = { k: b.k, name: b.name, scale: b.scale, focus: b.focus, sentence: b.sentence };
          if (b.scale === 'absolute') {
            out.dial = b.dial; out.spread = b.spread; out.position = b.position;
          } else {
            out.low = b.low; out.high = b.high;
          }
          return out;
        })
      };

      btn.disabled = true;
      setStatus('Sending…');

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) {
          if (!r.ok) throw new Error(body.error || ('Server said ' + r.status));
          return body;
        });
      }).then(function () {
        try { localStorage.setItem(sentKey, new Date().toISOString()); } catch (e) {}
        stepForm.hidden = true;
        stepStart.hidden = true;
        setStatus('Sent ✓ — that is with Mandy. Your answers and anything you typed stayed here.');
        if (window.cowchTrack) window.cowchTrack('questionnaire_shared', { variant: payload.variant });
      }).catch(function (err) {
        btn.disabled = false;
        setStatus('That did not send — nothing left this device. ' +
          (err && err.message ? err.message + '. ' : '') + 'You can try again.', true);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
