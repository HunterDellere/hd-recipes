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

  // ── Mobile hamburger menu ─────────────────────────────────────────────
  // The hamburger button collapses Explore/Pantry/Saved/Settings into a
  // dropdown on viewports where the inline links don't fit. Outside taps,
  // Escape, and link activation all dismiss it; aria-expanded mirrors state.
  const menuBtn = document.getElementById('topnav-menu-btn');
  const menu = document.getElementById('topnav-menu');
  if (menuBtn && menu) {
    function setMenuOpen(open) {
      menu.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      document.body.classList.toggle('topnav-menu-locked', open);
    }
    menuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const open = menu.classList.contains('open');
      setMenuOpen(!open);
    });
    // Dismiss on link click — let the link navigate, but close the panel first
    // so the back button doesn't return to a still-open menu.
    menu.addEventListener('click', (e) => {
      if (e.target.closest('a')) setMenuOpen(false);
    });
    // Outside click dismisses.
    document.addEventListener('click', (e) => {
      if (!menu.classList.contains('open')) return;
      if (menu.contains(e.target) || menuBtn.contains(e.target)) return;
      setMenuOpen(false);
    });
    // Escape dismisses.
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        setMenuOpen(false);
        menuBtn.focus();
      }
    });
    // Resize past the mobile breakpoint clears state — otherwise the panel
    // stays half-styled after rotating a tablet from portrait to landscape.
    const mq = window.matchMedia('(min-width: 861px)');
    const onMqChange = () => { if (mq.matches) setMenuOpen(false); };
    if (mq.addEventListener) mq.addEventListener('change', onMqChange);
    else if (mq.addListener) mq.addListener(onMqChange);
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
