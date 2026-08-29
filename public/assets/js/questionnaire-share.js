/* What happens to your results, on the two "What are you like, anyway?" screens.

   Two different things live in this panel, and keeping them apart is the whole
   point of the copy.

   The FIRST is not a send at all. Mandy is the companion inside the Cowch app,
   and a person's results are already on this device — the same origin the app
   runs on. So the app hands her the six scored results at conversation time
   (public/assets/js/therapy-profile.js -> api/chat.js) and nothing has to be
   shared, stored or uploaded for that to work. Saying so plainly matters:
   before this, the panel invited people to "send their results to Mandy", which
   with an in-app companion of the same name reads as though the thing they are
   already talking to needs posting a copy.

   The SECOND is a real send, to the people who build Cowch, and it is opt-in,
   clearly separated, and described as what it is. That is the only route by
   which anything from a questionnaire leaves a device.

   What goes on that send: the six scored axes exactly as shown on the page,
   plus the name typed. What never goes: individual answers, anything typed on
   the honest exit, the wellness wheel. The server enforces it too
   (api/questionnaire-share.js builds from named fields), but it is enforced
   here first, because here is where the person is being asked to trust it. */

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
        '<h2>Send a copy to the people who build Cowch?</h2>',
        '<p>Separate thing, entirely up to you, and nothing has gone anywhere so far. Cowch ',
        'is made by Mandy Kloppers and a small team, and seeing real results helps them work ',
        'out whether any of this is actually landing. Unlike the above, <b>this does leave ',
        'your device.</b></p>',
        '<div class="callout">',
          '<b>What would go:</b> the six results above &mdash; the bands and the sentences on ',
          'this page &mdash; and the name you type, so they know whose they are.<br><br>',
          '<b>What would not:</b> your individual answers, anything you typed, and anything ',
          'in your wellness wheel. Those stay here.<br><br>',
          'This is not a clinical assessment, and sending it is not booking an appointment, ',
          'asking for advice, or requesting a reply. Skipping it changes nothing about how ',
          'the app works for you.',
        '</div>',
        '<div class="btn-row" data-share-step="start">',
          '<button class="btn btn-ghost" type="button" data-share="open">Send a copy</button>',
        '</div>',
        '<div data-share-step="form" hidden>',
          '<label class="qshare-label" for="qshare-name">A name to put to these</label>',
          '<input class="qshare-input" id="qshare-name" type="text" maxlength="80" autocomplete="name" placeholder="Whatever you&rsquo;d like to be known by">',
          '<label class="qshare-label" for="qshare-email">Your email, if you&rsquo;d like them to be able to reach you &mdash; optional</label>',
          '<input class="qshare-input" id="qshare-email" type="email" maxlength="320" autocomplete="email" placeholder="Leave it blank if you&rsquo;d rather not">',
          '<div class="btn-row">',
            '<button class="btn btn-primary" type="button" data-share="send">Send the copy</button>',
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
      if (already) status.textContent = 'You sent a copy on ' +
        new Date(already).toLocaleDateString() + '. Sending again would add a second one.';
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
        setStatus('Please add a name to put to these.', true);
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
        setStatus('Sent ✓ — the copy is with the Cowch team. Your answers and anything you typed stayed here.');
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
