/* enhance.js — service worker, theme toggle, share button, reading progress.
 * Lean and focused — recipe-specific behavior lives in recipe.js. */
if (window.__enhanceInit) { /* already loaded */ }
else { window.__enhanceInit = true; (function () {
  'use strict';

  // ── Service worker ────────────────────────────────────────────────────
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    const swPath = location.pathname.includes('/pages/') ? '../../sw.js' : 'sw.js';
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(swPath).catch(err => console.warn('SW failed:', err));
    });
  }

  // ── Theme toggle ──────────────────────────────────────────────────────
  const THEME_KEY = 'hdr-theme';
  const META_THEME = document.getElementById('meta-theme-color');
  function applyTheme(t) {
    if (t === 'dark' || t === 'light') {
      document.documentElement.setAttribute('data-theme', t);
      if (META_THEME) META_THEME.content = t === 'dark' ? '#15110a' : '#b8423a';
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
  const tt = document.getElementById('theme-toggle');
  if (tt) {
    tt.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') ||
        (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const next = cur === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch {}
      applyTheme(next);
    });
  }

  // ── Topnav sheet (mobile drawer) ──────────────────────────────────────
  // Below 560px, primary + utility nav collapse into a slide-down sheet.
  // The hamburger button toggles open/close; click outside, Escape, or any
  // link inside the sheet closes it. Body scroll is locked while open so the
  // background can't scroll under the sheet on iOS.
  const menuBtn = document.getElementById('topnav-menu-btn');
  const sheet = document.getElementById('topnav-sheet');
  if (menuBtn && sheet) {
    const setOpen = (open) => {
      if (open) {
        sheet.hidden = false;
        // next frame so the transition runs
        requestAnimationFrame(() => sheet.setAttribute('data-open', 'true'));
      } else {
        sheet.removeAttribute('data-open');
        // wait for transition before hiding from AT
        setTimeout(() => { if (sheet.getAttribute('data-open') !== 'true') sheet.hidden = true; }, 220);
      }
      sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    };
    menuBtn.addEventListener('click', () => {
      setOpen(sheet.getAttribute('data-open') !== 'true');
    });
    sheet.addEventListener('click', (e) => {
      // Backdrop click (anywhere outside the panel) or any link inside closes.
      if (e.target === sheet || e.target.closest('.topnav-sheet-link')) setOpen(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sheet.getAttribute('data-open') === 'true') setOpen(false);
    });
    // If the viewport grows past the breakpoint while the sheet is open, close it.
    const mq = matchMedia('(min-width: 560px)');
    const onMq = () => { if (mq.matches && sheet.getAttribute('data-open') === 'true') setOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onMq);
    else if (mq.addListener) mq.addListener(onMq);
  }

  // ── Share button (Web Share API + clipboard fallback) ─────────────────
  document.querySelectorAll('[data-share]').forEach(btn => {
    const labelEl = btn.querySelector('[data-share-label]');
    btn.addEventListener('click', async () => {
      const url = location.href;
      const title = document.title;
      try {
        if (navigator.share) {
          await navigator.share({ title, url });
          return;
        }
      } catch {}
      try {
        await navigator.clipboard.writeText(url);
        if (labelEl) {
          const orig = labelEl.textContent;
          labelEl.textContent = 'Copied';
          setTimeout(() => { labelEl.textContent = orig; }, 1400);
        }
      } catch {}
    });
  });
})(); }
