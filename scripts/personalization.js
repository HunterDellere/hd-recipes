/* personalization.js — saved recipes, cook log, per-recipe notes.
 *
 * All state lives in localStorage under the `hdr.` prefix:
 *   hdr.schema       — integer schema version (currently 1)
 *   hdr.saved        — JSON array of recipe slugs (favorites)
 *   hdr.cookLog      — JSON object { <slug>: { dates: [ISO, ...] } }
 *   hdr.notes.<slug> — string (per-recipe notes)
 *
 * The module is split into two concerns: (1) a pure storage layer exposed
 * globally on `window.HDR` so the saved/settings pages can read and mutate
 * the same data; (2) a recipe-page UI injector that adds the star, cooked,
 * and notes affordances directly into the rendered DOM. Doing it at runtime
 * (rather than baking buttons into recipe-render.mjs) avoids rebuilding the
 * site to introduce personalization and keeps the persistence layer in a
 * single file.
 */
if (window.__hdrPersonalizationInit) { /* already loaded */ }
else { window.__hdrPersonalizationInit = true; (function () {
  'use strict';

  // ── Storage layer ────────────────────────────────────────────────────
  const SCHEMA_VERSION = 1;
  const K = {
    schema:  'hdr.schema',
    saved:   'hdr.saved',
    cookLog: 'hdr.cookLog',
    notesPrefix: 'hdr.notes.',
  };

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw == null) return fallback;
      const parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch { return fallback; }
  }
  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch (err) { console.warn(`[hdr] localStorage write failed for ${key}:`, err); }
  }

  // Migration handler — version-by-version, no-op when schema is current.
  // Bumping SCHEMA_VERSION should always come with a new branch here.
  function runMigrations() {
    let cur = parseInt(localStorage.getItem(K.schema), 10);
    if (!isFinite(cur)) cur = 0;
    if (cur === SCHEMA_VERSION) return;
    // v0 → v1: nothing to migrate (initial schema). Just stamp the version.
    if (cur < 1) cur = 1;
    try { localStorage.setItem(K.schema, String(SCHEMA_VERSION)); } catch {}
  }
  runMigrations();

  // ── Saved (favorites) ────────────────────────────────────────────────
  function getSaved() {
    const arr = readJson(K.saved, []);
    return Array.isArray(arr) ? arr.slice() : [];
  }
  function isSaved(slug) { return getSaved().indexOf(slug) !== -1; }
  function toggleSaved(slug) {
    const cur = getSaved();
    const i = cur.indexOf(slug);
    let next;
    if (i === -1) next = cur.concat([slug]);
    else next = cur.slice(0, i).concat(cur.slice(i + 1));
    writeJson(K.saved, next);
    return next.indexOf(slug) !== -1;
  }
  function clearSaved() { try { localStorage.removeItem(K.saved); } catch {} }

  // ── Cook log ─────────────────────────────────────────────────────────
  function getCookLog() {
    const obj = readJson(K.cookLog, {});
    return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
  }
  function getCookEntry(slug) {
    const log = getCookLog();
    const e = log[slug];
    if (!e || !Array.isArray(e.dates)) return { dates: [] };
    return { dates: e.dates.slice() };
  }
  function logCook(slug) {
    const log = getCookLog();
    const prev = log[slug] && Array.isArray(log[slug].dates) ? log[slug].dates : [];
    const next = { ...log, [slug]: { dates: prev.concat([new Date().toISOString()]) } };
    writeJson(K.cookLog, next);
    return next[slug];
  }
  function clearCookLog() { try { localStorage.removeItem(K.cookLog); } catch {} }

  // ── Notes ────────────────────────────────────────────────────────────
  function notesKey(slug) { return K.notesPrefix + slug; }
  function getNote(slug) {
    try { return localStorage.getItem(notesKey(slug)) || ''; }
    catch { return ''; }
  }
  function setNote(slug, text) {
    try {
      if (text == null || text === '') localStorage.removeItem(notesKey(slug));
      else localStorage.setItem(notesKey(slug), String(text));
    } catch (err) { console.warn('[hdr] note write failed:', err); }
  }
  function getAllNotes() {
    const out = {};
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(K.notesPrefix)) {
          out[k.slice(K.notesPrefix.length)] = localStorage.getItem(k) || '';
        }
      }
    } catch {}
    return out;
  }
  function clearAllNotes() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(K.notesPrefix)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
    } catch {}
  }

  // ── Export / import ──────────────────────────────────────────────────
  function exportAll() {
    return {
      version: SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      saved: getSaved(),
      cookLog: getCookLog(),
      notes: getAllNotes(),
    };
  }

  // Returns a summary describing what was merged so the UI can confirm.
  // Saved slugs dedupe; cook-log date arrays merge + dedupe + sort; notes
  // overwrite unless a non-empty local note differs from the import (then
  // both are kept, import wins, conflict flagged).
  function importAll(payload) {
    if (!payload || typeof payload !== 'object') {
      throw new Error('Backup file is not a valid JSON object.');
    }
    const summary = { savedAdded: 0, cookDatesAdded: 0, notesWritten: 0, conflicts: [] };

    if (Array.isArray(payload.saved)) {
      const before = new Set(getSaved());
      const merged = Array.from(new Set([...before, ...payload.saved.filter(s => typeof s === 'string')]));
      summary.savedAdded = merged.length - before.size;
      writeJson(K.saved, merged);
    }

    if (payload.cookLog && typeof payload.cookLog === 'object' && !Array.isArray(payload.cookLog)) {
      const cur = getCookLog();
      const next = { ...cur };
      for (const [slug, entry] of Object.entries(payload.cookLog)) {
        if (!entry || !Array.isArray(entry.dates)) continue;
        const prev = (next[slug] && Array.isArray(next[slug].dates)) ? next[slug].dates : [];
        const combined = Array.from(new Set([...prev, ...entry.dates.filter(d => typeof d === 'string')])).sort();
        summary.cookDatesAdded += combined.length - prev.length;
        next[slug] = { dates: combined };
      }
      writeJson(K.cookLog, next);
    }

    if (payload.notes && typeof payload.notes === 'object' && !Array.isArray(payload.notes)) {
      for (const [slug, incoming] of Object.entries(payload.notes)) {
        if (typeof incoming !== 'string') continue;
        const current = getNote(slug);
        if (current && current !== incoming) {
          summary.conflicts.push({ slug, kept: 'incoming' });
        }
        setNote(slug, incoming);
        summary.notesWritten++;
      }
    }
    return summary;
  }

  function downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function dateStamp() {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // Expose the storage layer so saved.html / settings.html can use it.
  window.HDR = {
    SCHEMA_VERSION,
    getSaved, isSaved, toggleSaved, clearSaved,
    getCookLog, getCookEntry, logCook, clearCookLog,
    getNote, setNote, getAllNotes, clearAllNotes,
    exportAll, importAll,
    downloadJson, dateStamp,
  };

  // ── Recipe-page UI injection ─────────────────────────────────────────
  // Recipe pages are detected by the presence of `.recipe-hero` plus a
  // metadata comment at the top whose `category` is `recipes`. We pull the
  // slug from `location.pathname` (last segment, sans `.html`).
  function getSlugIfRecipe() {
    if (!document.querySelector('.recipe-hero')) return null;
    if (document.body.dataset.category !== 'recipes') return null;
    const m = location.pathname.match(/\/recipes\/([^/]+)\.html?$/);
    return m ? m[1] : null;
  }

  function fmtRelativeTime(iso) {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (!isFinite(then)) return '';
    const diffSec = Math.max(0, Math.round((Date.now() - then) / 1000));
    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) {
      const m = Math.round(diffSec / 60);
      return `${m} minute${m === 1 ? '' : 's'} ago`;
    }
    if (diffSec < 86400) {
      const h = Math.round(diffSec / 3600);
      return `${h} hour${h === 1 ? '' : 's'} ago`;
    }
    const days = Math.round(diffSec / 86400);
    if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
    return new Date(iso).toLocaleDateString();
  }

  function fmtDateShort(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }); }
    catch { return iso.slice(0, 10); }
  }

  function injectRecipeUI() {
    const slug = getSlugIfRecipe();
    if (!slug) return;
    const actions = document.querySelector('.rh-actions');
    if (actions && !actions.querySelector('[data-save-toggle]')) {
      actions.appendChild(buildSaveButton(slug));
      actions.appendChild(buildCookedButton(slug));
    }
    injectNotesPanel(slug);
  }

  function buildSaveButton(slug) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rh-save-btn';
    btn.setAttribute('data-save-toggle', '');
    const sync = () => {
      const saved = isSaved(slug);
      btn.setAttribute('aria-pressed', saved ? 'true' : 'false');
      btn.setAttribute('aria-label', saved ? 'Remove from saved recipes' : 'Save this recipe');
      btn.innerHTML = `
        <span class="rh-save-icon" aria-hidden="true">
          ${saved
            ? '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
            : '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'}
        </span>
        <span class="rh-save-label">${saved ? 'Saved' : 'Save'}</span>`;
    };
    sync();
    btn.addEventListener('click', () => { toggleSaved(slug); sync(); });
    return btn;
  }

  function buildCookedButton(slug) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rh-cooked-btn';
    btn.setAttribute('data-cooked-toggle', '');
    btn.setAttribute('aria-label', 'Log that you cooked this recipe');
    const sync = (announce) => {
      const entry = getCookEntry(slug);
      const count = entry.dates.length;
      const last = count ? entry.dates[entry.dates.length - 1] : null;
      const label = count === 0
        ? 'I cooked this'
        : `Cooked ${count} time${count === 1 ? '' : 's'}`;
      btn.innerHTML = `
        <span class="rh-cooked-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 7h16"/><path d="M5 7l1 13h12l1-13"/><path d="M9 4h6"/>
          </svg>
        </span>
        <span class="rh-cooked-label">${label}</span>`;
      // Inline confirmation appended/refreshed below the actions row
      let conf = document.querySelector('.rh-cooked-confirm');
      if (count > 0) {
        if (!conf) {
          conf = document.createElement('p');
          conf.className = 'rh-cooked-confirm';
          const actionsHost = btn.parentNode;
          if (actionsHost && actionsHost.parentNode) {
            actionsHost.parentNode.insertBefore(conf, actionsHost.nextSibling);
          }
        }
        conf.textContent = `Cooked ${count} time${count === 1 ? '' : 's'}. Last: ${fmtDateShort(last)}.`;
        if (announce) {
          conf.classList.remove('is-flash');
          // Force reflow so the animation restarts cleanly.
          void conf.offsetWidth;
          conf.classList.add('is-flash');
        }
      } else if (conf && conf.parentNode) {
        conf.parentNode.removeChild(conf);
      }
    };
    sync(false);
    btn.addEventListener('click', () => { logCook(slug); sync(true); });
    return btn;
  }

  // The notes panel goes between Substitutions and Notes. If Substitutions
  // is absent we fall back to inserting just before Notes; if both are
  // absent we append to the main content area. Empty notes render as a
  // collapsed details; non-empty notes auto-expand on load so the cook
  // sees what they wrote last time without an extra click.
  function injectNotesPanel(slug) {
    if (document.querySelector('.recipe-mynotes')) return;
    const main = document.querySelector('main.main') || document.querySelector('main');
    if (!main) return;
    const notesAnchor = document.querySelector('#notes')?.closest('.section-anchor')
      || document.querySelector('#notes');
    const subsAnchor = document.querySelector('#substitutions')?.closest('.section-anchor')
      || document.querySelector('#substitutions');

    const initial = getNote(slug);
    const wrap = document.createElement('section');
    wrap.className = 'recipe-mynotes';
    wrap.innerHTML = `
      <span class="section-anchor" id="my-notes"></span>
      <details class="mynotes-details"${initial ? ' open' : ''}>
        <summary class="mynotes-summary">
          <span class="mynotes-title">My notes</span>
          <span class="mynotes-hint">Your private notes — saved on this device only.</span>
        </summary>
        <div class="mynotes-body">
          <textarea class="mynotes-textarea" rows="6"
            placeholder="Cook notes, swaps, what you'd do differently next time…"
            aria-label="Your private notes for this recipe">${escapeHtml(initial)}</textarea>
          <div class="mynotes-meta">
            <span class="mynotes-status" aria-live="polite"></span>
          </div>
        </div>
      </details>`;

    // Prefer inserting between Substitutions and Notes. The section-anchor
    // span sits as a sibling immediately before the section's content div,
    // so we insert before the Notes section's anchor (so My notes appears
    // right above Notes). Falls back gracefully when the page lacks one or
    // both sections.
    let insertBefore = notesAnchor || null;
    if (subsAnchor && notesAnchor) insertBefore = notesAnchor;
    else if (notesAnchor) insertBefore = notesAnchor;
    else if (subsAnchor) insertBefore = subsAnchor.nextSibling;

    if (insertBefore && insertBefore.parentNode) {
      insertBefore.parentNode.insertBefore(wrap, insertBefore);
    } else {
      main.appendChild(wrap);
    }

    wireNotesAutosave(wrap.querySelector('.mynotes-textarea'), wrap.querySelector('.mynotes-status'), slug);
  }

  function wireNotesAutosave(ta, status, slug) {
    if (!ta) return;
    let lastSavedAt = getNote(slug) ? Date.now() : null;
    let debounceId = null;

    const renderStatus = () => {
      if (!status) return;
      if (lastSavedAt == null) { status.textContent = ''; return; }
      status.textContent = `Last edited: ${fmtRelativeTime(new Date(lastSavedAt).toISOString())}`;
    };
    renderStatus();
    const tick = setInterval(renderStatus, 30 * 1000);
    window.addEventListener('beforeunload', () => clearInterval(tick));

    const flush = () => {
      const text = ta.value;
      setNote(slug, text);
      lastSavedAt = Date.now();
      renderStatus();
    };

    ta.addEventListener('input', () => {
      if (debounceId) clearTimeout(debounceId);
      debounceId = setTimeout(flush, 5000);
    });
    ta.addEventListener('blur', () => {
      if (debounceId) { clearTimeout(debounceId); debounceId = null; }
      flush();
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectRecipeUI);
  } else {
    injectRecipeUI();
  }
})(); }
