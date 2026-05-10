/**
 * hover-card.js — popover previews on internal links.
 *
 * On hover (≥250ms) over .x-link, .ing-link, .pair-card, .hub-chip, .rl-card,
 * shows a small popover with: eyebrow, title, one-line description, and
 * type-specific meta (time/diff for recipes, primary tag for ingredients).
 *
 * Suppressed on touch devices unless long-press (≥500ms) — touch users get
 * keyboard focus (tab) instead, which we mirror.
 *
 * Lazy-loads data/entries.json on first hover. Cached forever per page.
 */
(function () {
  'use strict';

  // Skip on coarse pointers unless explicitly long-pressed.
  const isCoarse = matchMedia('(pointer: coarse)').matches;

  function resolveRoot() {
    const path = location.pathname;
    if (path === '/' || (path.endsWith('/index.html') && path.split('/').length === 2)) return '';
    const parts = path.split('/').filter(Boolean);
    if (parts.length <= 1) return '';
    return '../'.repeat(parts.length - 1);
  }
  const ROOT = resolveRoot();

  const SELECTOR = 'a.x-link, a.ing-link, a.pair-card, a.hub-chip, a.rl-card, a.hm-link, a.entry-card, a.ff-card';
  const HOVER_DELAY = 250;
  const LONG_PRESS = 500;

  let entries = null;
  let entriesByPath = null;
  let loadingPromise = null;

  function loadEntries() {
    if (entriesByPath) return Promise.resolve(entriesByPath);
    if (loadingPromise) return loadingPromise;
    loadingPromise = fetch(ROOT + 'data/entries.json')
      .then(r => r.json())
      .then(arr => {
        entries = arr;
        entriesByPath = new Map(arr.map(e => [e.path, e]));
        return entriesByPath;
      })
      .catch(() => {
        // Network fail — disable silently.
        entriesByPath = new Map();
        return entriesByPath;
      });
    return loadingPromise;
  }

  // Build the popover lazily.
  let card = null;
  function getCard() {
    if (card) return card;
    card = document.createElement('div');
    card.className = 'hcard';
    card.hidden = true;
    card.setAttribute('role', 'tooltip');
    document.body.appendChild(card);
    return card;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // Resolve the href of a link to a `pages/...` key in entries.json.
  // Links can be relative ("../recipes/foo.html"), root-relative ("/pages/x"),
  // or absolute. We normalize to the entries.json path key.
  function pathFromHref(href) {
    if (!href) return null;
    try {
      const url = new URL(href, location.href);
      // Strip the host root: leading slash gone.
      let p = url.pathname.replace(/^\//, '');
      // Drop the project's site prefix if it ever appears (no-op on recipes.hd.dev).
      // Match against entries.json paths which are like "pages/recipes/foo.html".
      return p;
    } catch {
      return null;
    }
  }

  function fmtMin(min) {
    const n = Number(min);
    if (!isFinite(n) || n <= 0) return '';
    if (n < 60) return `${Math.round(n)} min`;
    const h = Math.floor(n / 60);
    const m = Math.round(n - h * 60);
    return m ? `${h} h ${m} min` : `${h} h`;
  }

  function buildBody(e) {
    const eyebrow = `<span class="hcard-eyebrow hcard-eyebrow-${escapeHtml(e.type || 'entry')}">${escapeHtml(e.category || e.type || '')}</span>`;
    const title = `<div class="hcard-title">${escapeHtml(e.title || '')}</div>`;
    const desc = e.desc ? `<div class="hcard-desc">${escapeHtml(e.desc.slice(0, 140))}</div>` : '';

    const meta = [];
    if (e.type === 'recipe') {
      const t = e.time && (e.time.active_min || e.time.total_min);
      if (t) meta.push(`<span class="hcard-meta-item">${escapeHtml(fmtMin(t))}</span>`);
      if (e.servings) meta.push(`<span class="hcard-meta-item">${escapeHtml(e.servings)} servings</span>`);
      if (e.difficulty) meta.push(`<span class="hcard-meta-item hcard-diff hcard-diff-${escapeHtml(e.difficulty)}">${escapeHtml(e.difficulty)}</span>`);
      if (e.cuisine) meta.push(`<span class="hcard-meta-item">${escapeHtml(e.cuisine)}</span>`);
    } else if (e.type === 'ingredient') {
      const c = e._card || {};
      if (c.primaryTag) meta.push(`<span class="hcard-meta-item">${escapeHtml(c.primaryTag)}</span>`);
      if (c.usedInCount) meta.push(`<span class="hcard-meta-item">${c.usedInCount} ${c.usedInCount === 1 ? 'recipe' : 'recipes'}</span>`);
    } else if (e.type === 'technique' || e.type === 'cuisine') {
      const c = e._card || {};
      if (c.usedInCount) meta.push(`<span class="hcard-meta-item">${c.usedInCount} ${c.usedInCount === 1 ? 'recipe' : 'recipes'}</span>`);
    } else if (e.type === 'hub') {
      const c = e._card || {};
      if (c.memberCount) meta.push(`<span class="hcard-meta-item">${c.memberCount} ${c.memberCount === 1 ? 'entry' : 'entries'}</span>`);
    }
    const metaRow = meta.length ? `<div class="hcard-meta">${meta.join('')}</div>` : '';
    return eyebrow + title + desc + metaRow;
  }

  function position(card, anchor) {
    const r = anchor.getBoundingClientRect();
    const cardW = 320;
    const cardH = card.offsetHeight || 140;
    const margin = 8;
    let left = r.left + (r.width / 2) - (cardW / 2);
    let top = r.bottom + margin;
    // Clamp horizontally
    if (left < 8) left = 8;
    if (left + cardW > window.innerWidth - 8) left = window.innerWidth - cardW - 8;
    // Flip up if it would clip the bottom of the viewport
    if (top + cardH > window.innerHeight - 8) {
      top = r.top - cardH - margin;
    }
    card.style.left = (left + window.scrollX) + 'px';
    card.style.top = (top + window.scrollY) + 'px';
  }

  let showTimer = null;
  let activeAnchor = null;

  function show(anchor) {
    activeAnchor = anchor;
    const path = pathFromHref(anchor.getAttribute('href'));
    if (!path) return;
    loadEntries().then(map => {
      // Bail if the user moved off this anchor before data arrived.
      if (activeAnchor !== anchor) return;
      // Try direct hit, then with leading "pages/" if not present, then suffix match.
      let entry = map.get(path);
      if (!entry) {
        // Suffix match: link href may be relative-rendered as "pages/..." while
        // entries.json key is the same. The URL parser already produced a clean
        // "pages/..." path so a direct miss usually means the href points
        // somewhere we don't index (e.g. /index.html). Fall back to suffix.
        for (const [key, e] of map) {
          if (path.endsWith(key) || key.endsWith(path)) { entry = e; break; }
        }
      }
      if (!entry) return;
      const c = getCard();
      c.innerHTML = buildBody(entry);
      c.hidden = false;
      // Force reflow for size before positioning
      c.style.left = '-9999px';
      c.style.top = '-9999px';
      requestAnimationFrame(() => {
        position(c, anchor);
        c.classList.add('is-open');
      });
    });
  }

  function hide() {
    activeAnchor = null;
    if (showTimer) { clearTimeout(showTimer); showTimer = null; }
    if (!card) return;
    card.classList.remove('is-open');
    setTimeout(() => { if (card && !activeAnchor) card.hidden = true; }, 130);
  }

  // Pointer events — use mouseover/mouseout (which bubble) for delegation.
  // mouseenter/mouseleave do NOT bubble, so attaching them to document with
  // capture is unreliable across browsers — the capture phase still requires
  // the event to be dispatched, and these two are dispatched only on the
  // listener element itself.
  let hoverAnchor = null;
  document.addEventListener('mouseover', (e) => {
    if (isCoarse) return;
    const a = e.target.closest && e.target.closest(SELECTOR);
    if (!a || a === hoverAnchor) return;
    hoverAnchor = a;
    if (showTimer) clearTimeout(showTimer);
    showTimer = setTimeout(() => { if (hoverAnchor === a) show(a); }, HOVER_DELAY);
  });

  document.addEventListener('mouseout', (e) => {
    if (isCoarse) return;
    const a = e.target.closest && e.target.closest(SELECTOR);
    if (!a) return;
    // relatedTarget is the element entering — if it's still inside the same
    // anchor, we haven't actually left.
    const into = e.relatedTarget;
    if (into && a.contains(into)) return;
    if (hoverAnchor === a) hoverAnchor = null;
    hide();
  });

  // Touch: long-press to preview without navigation.
  let pressTimer = null;
  let pressAnchor = null;
  document.addEventListener('touchstart', (e) => {
    if (!isCoarse) return;
    const a = e.target.closest && e.target.closest(SELECTOR);
    if (!a) return;
    pressAnchor = a;
    pressTimer = setTimeout(() => {
      // Long-press fired — show preview and prevent the imminent click navigation.
      pressAnchor && show(pressAnchor);
      // The browser still queues a click; suppress it once.
      const suppress = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        document.removeEventListener('click', suppress, true);
      };
      document.addEventListener('click', suppress, true);
    }, LONG_PRESS);
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    pressAnchor = null;
    // Don't auto-hide on touchend — user may want to read; tap-outside to dismiss.
  }, { passive: true });

  document.addEventListener('touchcancel', () => {
    if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; }
    pressAnchor = null;
  }, { passive: true });

  // Tap outside the card to dismiss on touch
  document.addEventListener('click', (e) => {
    if (!card || card.hidden) return;
    if (card.contains(e.target)) return;
    if (e.target.closest && e.target.closest(SELECTOR)) return;
    hide();
  });

  // Keyboard navigation gets the link target via the link itself; auto-popping
  // hover-cards on every Tab press creates noise. Skip focus-driven hover-cards.

  // Hide on scroll — popover positioning would otherwise drift.
  window.addEventListener('scroll', () => {
    if (card && !card.hidden) hide();
  }, { passive: true });
})();
