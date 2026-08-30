/* "What are you like, anyway?" — the share-with-Mandy switch.

   What actually travels: when you chat, therapy-profile.js reads the finished
   result out of localStorage and puts the SIX SCORED BANDS on the chat request,
   so Mandy knows a little about who she's talking to. Never the per-moment
   answers, never the abstention notes people type — those are not read at all.

   This is the one control over that, and it is an OPT-OUT: unset means on,
   because the companion is the point of the questionnaire. One key, one meaning:

     cowch-share-wayl-with-mandy : 'on' | 'off'   (absent === 'on')

   Enforcement is NOT here. It is one place only — getQuestionnaireResult() in
   assets/js/therapy-profile.js returns null when this says 'off', and everything
   downstream already handles null. Don't scatter the check.

   Wires every <input data-wayl-share-toggle> on the page. No build step. */
(function () {
  'use strict';

  var KEY = 'cowch-share-wayl-with-mandy';

  function isOn() {
    try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; }
  }

  function set(on) {
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) {}
  }

  function wire() {
    var boxes = [].slice.call(document.querySelectorAll('[data-wayl-share-toggle]'));
    if (!boxes.length) return;
    var on = isOn();
    boxes.forEach(function (box) {
      box.checked = on;
      box.addEventListener('change', function () {
        set(box.checked);
        boxes.forEach(function (other) { other.checked = box.checked; });
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }

  window.CowchWaylShare = { isOn: isOn, set: set, KEY: KEY };
})();
