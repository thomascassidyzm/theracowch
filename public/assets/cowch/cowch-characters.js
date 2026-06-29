// Cowch character set. Two styles, both transparent and app-icon ready:
//   • render — rounded 3D portrait cutouts (webp), from the source artwork
//   • vector — editable SVG mascots (clean outlines, pastel, scale to any size)
// Mirrors the requested `cowchCharacters` shape, adapted to this repo's plain
// static stack (no build step): the data hangs off window and a small renderer
// fills the gallery. Edit the SVGs directly to tweak a variant.
//
// Note: copy here follows the product's hard rail — Cowch is a non-clinical
// wellbeing companion, never framed as a therapist or treatment.
window.cowchCharacters = [
  { id: 'cowch-classic',     name: 'Classic Cowch',      kind: 'render', image: '/assets/cowch/cowch-classic.webp',      alt: 'Friendly cow wellbeing companion standing, with sparkly eyes and a soft smile' },
  { id: 'cowch-mindful',     name: 'Mindful Cowch',      kind: 'render', image: '/assets/cowch/cowch-lotus.webp',        alt: 'Cow companion sitting cross-legged in a calm meditation pose' },
  { id: 'cowch-pink',        name: 'Pink-streak Cowch',  kind: 'render', image: '/assets/cowch/cowch-pink-earring.webp', alt: 'Cow companion with a pink hair streak and a small heart earring' },

  { id: 'cowch-neutral',     name: 'Cowch',              kind: 'vector', image: '/assets/cowch/cowch-neutral.svg',       alt: 'Cow companion with a warm, calm smile' },
  { id: 'cowch-grin',        name: 'Cheery Cowch',       kind: 'vector', image: '/assets/cowch/cowch-grin.svg',          alt: 'Cow companion smiling with small teeth' },
  { id: 'cowch-pink-streak', name: 'Pink Streak Cowch',  kind: 'vector', image: '/assets/cowch/cowch-pink-streak.svg',   alt: 'Cow companion with a pink streak in its fringe' },
  { id: 'cowch-earring',     name: 'Earring Cowch',      kind: 'vector', image: '/assets/cowch/cowch-earring.svg',       alt: 'Cow companion with one small heart earring' },
  { id: 'cowch-lashes',      name: 'Cowch · soft lashes', kind: 'vector', image: '/assets/cowch/cowch-lashes.svg',       alt: 'Cow companion with slightly thicker lashes' }
];

(function () {
  function card(c) {
    var d = document.createElement('div');
    d.className = 'cowch-card';
    var img = document.createElement('img');
    img.src = c.image; img.alt = c.alt; img.loading = 'lazy';
    var h = document.createElement('h3');
    h.textContent = c.name;
    d.appendChild(img); d.appendChild(h);
    return d;
  }
  function mount() {
    [['render', 'grid-render'], ['vector', 'grid-vector']].forEach(function (g) {
      var el = document.getElementById(g[1]);
      if (!el) return;
      window.cowchCharacters
        .filter(function (c) { return c.kind === g[0]; })
        .forEach(function (c) { el.appendChild(card(c)); });
    });
  }
  if (document.readyState !== 'loading') mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
