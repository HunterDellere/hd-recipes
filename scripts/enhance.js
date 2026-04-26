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

  // ── Reading progress bar ──────────────────────────────────────────────
  const bar = document.querySelector('.reading-progress-bar');
  if (bar) {
    let ticking = false;
    function update() {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      const pct = total > 0 ? Math.min(100, Math.max(0, (h.scrollTop / total) * 100)) : 0;
      bar.style.width = pct + '%';
      ticking = false;
    }
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(update); ticking = true; }
    }, { passive: true });
    update();
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
