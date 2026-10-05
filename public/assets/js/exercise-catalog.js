/* ============================================================
   Exercise catalogue — the one list of IMAGINE exercises.

   Each IMAGINE letter's page shows exactly ONE exercise (its "keeper").
   Every other exercise lives on the "More exercises" page
   (/imagine/more.html), grouped by the letter it belongs to.

   TO SWAP A LETTER'S KEEPER: change its one line in KEEPERS below to the
   slug (the exercise's file name without .html) of any exercise listed
   under that letter. Nothing else needs touching — the letter page, the
   in-app IMAGINE guide and "More exercises" all read from here.
   (Bump CACHE_NAME in /sw.js afterwards, as for any change.)
   ============================================================ */
(function () {
  'use strict';

  var KEEPERS = {
    self:         'self-compassion',
    mindfulness:  'box-breathing',
    acceptance:   'radical-acceptance',
    gratitude:    'gratitude',
    interactions: 'connection-web',
    nurturing:    'fun-prompts',
    exploring:    'values-compass'
  };

  // In IMAGINE order. `key` is the letter page's file name (/imagine/<key>.html).
  var AREAS = [
    { key: 'self', letter: 'I', name: 'I, Me, Myself', color: '#E87EA8', exercises: [
      { slug: 'self-compassion',     title: 'Self-Compassion',     desc: 'Respond to yourself the way you would to a good friend.' },
      { slug: 'minute-reset',        title: '1 Minute Reset',      desc: 'A quick superhero pose to shift your energy and posture.' },
      { slug: 'inner-weather',       title: 'Inner Weather',       desc: 'Check in with your inner weather — just noticing, no judgement.' },
      { slug: 'wellness-checkin',    title: 'Wellness Check-in',   desc: 'A gentle look across the different parts of your life.' },
      { slug: 'energy-audit',        title: 'Energy Audit',        desc: 'Notice what fills your cup and what drains it.' }
    ]},
    { key: 'mindfulness', letter: 'M', name: 'Mindfulness', color: '#5BB4E0', exercises: [
      { slug: 'box-breathing',       title: 'Box Breathing',       desc: '4-count breathing to help you settle.' },
      { slug: 'body-scan',           title: 'Body Scan',           desc: 'Tense and release each muscle group to let tension go.' },
      { slug: 'grounding-54321',     title: '5-4-3-2-1 Grounding', desc: 'Use your five senses to anchor in the present.' },
      { slug: 'thought-stream',      title: 'Leaves on a Stream',  desc: 'Watch your thoughts float by without getting caught up in them.' }
    ]},
    { key: 'acceptance', letter: 'A', name: 'Acceptance', color: '#9C7CD4', exercises: [
      { slug: 'radical-acceptance',  title: 'Radical Acceptance',  desc: 'Acknowledge what is, so you can let go of the extra struggle.' },
      { slug: 'wave',                title: 'Let the Feeling Rise & Fall', desc: 'Ride a difficult feeling like a wave, watching it peak and pass.' },
      { slug: 'heal-framework',      title: 'HEAL',                desc: 'A gentle way to look again at an unkind thought.' }
    ]},
    { key: 'gratitude', letter: 'G', name: 'Gratitude', color: '#34B7AE', exercises: [
      { slug: 'gratitude',           title: 'Gratitude Stars',     desc: 'Name a few good things and watch them light up your sky.' },
      { slug: 'small-wins',          title: 'Small Wins',          desc: 'Notice one small thing you did today that moved you forward.' },
      { slug: 'gratitude-journal',   title: 'Gratitude Journal',   desc: 'Keep a collection of things that make you happy.' }
    ]},
    { key: 'interactions', letter: 'I', name: 'Interactions', color: '#FFD21E', exercises: [
      { slug: 'connection-web',      title: 'Connection Web',      desc: 'Map who supports you across your inner, middle and outer circles.' },
      { slug: 'good-communication',  title: 'Good Communication',  desc: 'Express a need clearly, without aggression or avoidance.' },
      { slug: 'boundary-setting',    title: 'Boundary Setting',    desc: 'Practise saying no and holding a healthy limit.' },
      { slug: 'kindness',            title: 'Kindness Ripple',     desc: 'Plan a small act of kindness and notice how it lands.' },
      { slug: 'comfort-ladder',      title: 'Comfort-Zone Ladder', desc: 'Stretch your comfort zone with others in small, manageable steps.' }
    ]},
    { key: 'nurturing', letter: 'N', name: 'Nurturing', color: '#F2802E', exercises: [
      { slug: 'fun-prompts',         title: 'Fun Prompt Generator', desc: 'Random playful suggestions to add a little spontaneity to your day.' },
      { slug: 'joy',                 title: 'Joy Bubbles',         desc: 'Pop bubbles — no goals, no pressure, just a two-minute reset.' },
      { slug: 'playfulness-diary',   title: 'Playfulness Diary',   desc: 'Log the moments that made you smile.' },
      { slug: 'creative-expression', title: 'Creative Expression', desc: 'Make time for something creative and see how it feels.' },
      { slug: 'silly-dice',          title: 'Silly Dice',          desc: 'Roll for jokes, silly challenges and fun facts.' },
      { slug: 'oracle-cards',        title: 'Oracle Cards',        desc: 'Draw a card for a moment of playful reflection.' },
      { slug: 'inner-child-work',    title: 'Inner Child',         desc: 'Reconnect with the younger you and what they enjoyed.' }
    ]},
    { key: 'exploring', letter: 'E', name: 'Exploring', color: '#F25C6A', exercises: [
      { slug: 'values-compass',      title: 'Values Compass',      desc: 'Get clear on what matters most to you.' },
      { slug: 'wonder',              title: 'Wonder Cards',        desc: 'Swap worried predictions for a little curiosity.' },
      { slug: 'trigger-mapping',     title: 'Trigger Mapping',     desc: 'Map what set you off, step by step, so it feels clearer.' }
    ]}
  ];

  function url(slug) { return '/exercises/' + slug + '.html'; }
  function area(key) {
    for (var i = 0; i < AREAS.length; i++) if (AREAS[i].key === key) return AREAS[i];
    return null;
  }
  // The keeper exercise for a letter (falls back to the first listed if the
  // KEEPERS line names something not under that letter).
  function keeper(key) {
    var a = area(key);
    if (!a) return null;
    for (var i = 0; i < a.exercises.length; i++) if (a.exercises[i].slug === KEEPERS[key]) return a.exercises[i];
    return a.exercises[0];
  }
  // Everything under a letter except its keeper — what "More exercises" lists.
  function others(key) {
    var a = area(key), k = keeper(key);
    return a ? a.exercises.filter(function (e) { return e !== k; }) : [];
  }

  window.CowchExercises = {
    KEEPERS: KEEPERS,
    AREAS: AREAS,
    MORE_URL: '/imagine/more.html',
    url: url,
    area: area,
    keeper: keeper,
    others: others
  };
})();
