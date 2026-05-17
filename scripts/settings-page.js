/* settings-page.js — drives /pages/settings.html.
 * Wires the export, import, and clear controls into the HDR storage API. */
(function () {
  'use strict';

  function refreshCounts() {
    if (!window.HDR) return;
    const saved = window.HDR.getSaved();
    const cookLog = window.HDR.getCookLog();
    const notes = window.HDR.getAllNotes();
    const cookTotal = Object.values(cookLog).reduce((sum, e) => sum + ((e && e.dates) ? e.dates.length : 0), 0);
    const notesCount = Object.keys(notes).length;

    document.querySelectorAll('[data-stat-saved], [data-saved-count]').forEach(el => { el.textContent = String(saved.length); });
    document.querySelectorAll('[data-stat-cooked]').forEach(el => { el.textContent = String(cookTotal); });
    document.querySelectorAll('[data-cooklog-count]').forEach(el => { el.textContent = String(Object.keys(cookLog).length); });
    document.querySelectorAll('[data-stat-notes], [data-notes-count]').forEach(el => { el.textContent = String(notesCount); });
  }

  function wireExports() {
    document.querySelectorAll('[data-export]').forEach(btn => {
      btn.addEventListener('click', () => {
        const which = btn.dataset.export;
        const stamp = window.HDR.dateStamp();
        if (which === 'saved') {
          window.HDR.downloadJson(`hdr-saved-${stamp}.json`, window.HDR.getSaved());
        } else if (which === 'cookLog') {
          window.HDR.downloadJson(`hdr-cooklog-${stamp}.json`, window.HDR.getCookLog());
        } else if (which === 'notes') {
          window.HDR.downloadJson(`hdr-notes-${stamp}.json`, window.HDR.getAllNotes());
        } else if (which === 'all') {
          window.HDR.downloadJson(`hdr-backup-${stamp}.json`, window.HDR.exportAll());
        }
      });
    });
  }

  function wireRestore() {
    const input = document.getElementById('restore-file');
    const status = document.getElementById('restore-status');
    if (!input) return;
    input.addEventListener('change', async () => {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const payload = JSON.parse(text);
        const summary = window.HDR.importAll(payload);
        const parts = [
          `${summary.savedAdded} new saved`,
          `${summary.cookDatesAdded} new cook dates`,
          `${summary.notesWritten} notes written`,
        ];
        if (summary.conflicts.length) {
          parts.push(`${summary.conflicts.length} note conflict${summary.conflicts.length === 1 ? '' : 's'} (kept incoming)`);
        }
        if (status) {
          status.textContent = `Restored: ${parts.join(' · ')}.`;
          status.classList.remove('is-err'); status.classList.add('is-ok');
        }
        refreshCounts();
      } catch (err) {
        if (status) {
          status.textContent = `Restore failed: ${err.message || 'invalid backup file'}.`;
          status.classList.remove('is-ok'); status.classList.add('is-err');
        }
      } finally {
        input.value = '';
      }
    });
  }

  function wireClears() {
    const confirms = {
      saved: 'Remove every starred recipe? This can\'t be undone.',
      cookLog: 'Erase your entire cook log? This can\'t be undone.',
      notes: 'Delete every recipe note? This can\'t be undone.',
    };
    document.querySelectorAll('[data-clear]').forEach(btn => {
      btn.addEventListener('click', () => {
        const which = btn.dataset.clear;
        if (!confirm(confirms[which] || 'Clear this data?')) return;
        if (which === 'saved') window.HDR.clearSaved();
        else if (which === 'cookLog') window.HDR.clearCookLog();
        else if (which === 'notes') window.HDR.clearAllNotes();
        refreshCounts();
      });
    });
  }

  function init() {
    if (!window.HDR) {
      console.warn('[hdr] settings page loaded without HDR API available');
      return;
    }
    refreshCounts();
    wireExports();
    wireRestore();
    wireClears();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
