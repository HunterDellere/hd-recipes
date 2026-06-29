/**
 * reveal.js — gentle fade-up on first scroll-in for major content blocks.
 *
 * Targets sections that benefit from arrival framing without making the
 * whole page feel theatrical. Recipe steps and ingredient lists are NOT
 * targeted — those should be there immediately when you scroll past the
 * hero (a cook scrolling looks for them; making them fade in delays the
 * thing they came for).
 *
 * Honors prefers-reduced-motion: no animation, just visible.
 */
(function () {
  'use strict';

  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('rv-noanim');
    return;
  }

  const SELECTORS = [
    '.recipe-hero',
    '.topic-hero',
    '.home-section',
    '.fam-section',
    '.related-cards-wrap',
    '.rl-groups',
    '.pair-grid',
    '.card-grid',
    '.recipe-nutrition',
  ];

  const SELECTOR = SELECTORS.join(', ');

  function on(el) {
    el.classList.remove('rv-init');
    el.classList.add('rv-on');
  }

  // threshold 0 (any pixel intersecting) rather than a ratio — long lists like
  // the Cook page's 107-recipe `.card-grid` are taller than the viewport, so
  // max intersection ratio (viewport_height / target_height) drops below any
  // small fixed threshold and the observer never fires. The negative bottom
  // rootMargin keeps the reveal from triggering too eagerly at the page edge.
  const io = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        on(entry.target);
        obs.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

  // Tag + observe an element once. `rv-init` drops it to opacity:0 — which also
  // makes it invisible AND un-clickable (an opacity:0 grid still occupies layout
  // but the cards inside it can't be aimed at), so anything we hide here MUST be
  // guaranteed to come back. The IntersectionObserver normally does that, but it
  // can miss: a grid that homepage.js re-renders after we observed it leaves the
  // IO holding a detached node that never fires. The load-time safety sweep below
  // is the backstop so no grid is ever stranded hidden.
  function track(el) {
    if (el.dataset.rv) return;        // already tracked — idempotent
    el.dataset.rv = '1';
    // Above-the-fold content must be visible and clickable immediately — never
    // hide it. Hiding it (opacity:0) both blanks it and makes its cards
    // impossible to aim at, which is the intermittent "first click does nothing"
    // bug. Only fade in things that start below the fold; reveal the rest now.
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight) { on(el); return; }
    el.classList.add('rv-init');
    io.observe(el);
  }

  function scan() {
    document.querySelectorAll(SELECTOR).forEach(track);
  }

  scan();

  // Re-scan after the page (and homepage.js's async card render) settles, so
  // late-injected grids get the reveal too. Then a final safety net: reveal any
  // element that is still sitting in rv-init — covers detached/never-fired nodes
  // and any grid the IO's negative rootMargin skipped at the very bottom edge.
  function sweepStranded() {
    document.querySelectorAll('.rv-init').forEach(el => {
      const r = el.getBoundingClientRect();
      // If it's in or above the viewport, it should already be showing — reveal it.
      if (r.top < window.innerHeight) on(el);
    });
  }

  window.addEventListener('load', () => {
    scan();
    // One frame later, force-reveal anything the IO hasn't picked up.
    setTimeout(sweepStranded, 200);
  });
})();
