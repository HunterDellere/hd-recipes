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

  const els = document.querySelectorAll(SELECTORS.join(', '));
  if (!els.length) return;

  els.forEach(el => el.classList.add('rv-init'));

  // threshold 0 (any pixel intersecting) rather than a ratio — long lists like
  // the Cook page's 107-recipe `.card-grid` are taller than the viewport, so
  // max intersection ratio (viewport_height / target_height) drops below any
  // small fixed threshold and the observer never fires. The negative bottom
  // rootMargin keeps the reveal from triggering too eagerly at the page edge.
  const io = new IntersectionObserver((entries, obs) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('rv-on');
        obs.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

  els.forEach(el => io.observe(el));
})();
