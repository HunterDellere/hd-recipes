/**
 * Page-body augmentations for hd-recipes:
 *   - renderSourcesHtml: small Sources block from frontmatter
 *   - buildPageFooter: unified footer
 *   - ensureMainContentId: skip-link target
 *   - buildLinkMap + autoLinkBody: link first occurrence of other entries' titles
 */

function escapeHtmlInline(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(s) {
  return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function renderSourcesHtml(fm) {
  const general = Array.isArray(fm.sources) ? fm.sources : [];
  const factual = Array.isArray(fm.content_sources) ? fm.content_sources : [];
  const direct = fm.source && fm.source.name ? [fm.source] : [];
  if (!general.length && !factual.length && !direct.length) return '';
  const seen = new Set();
  const items = [];
  for (const s of direct) {
    const k = (s.url ? `<a href="${escapeAttr(s.url)}" target="_blank" rel="noopener">${escapeHtmlInline(s.name)}</a>` : escapeHtmlInline(s.name)) + (s.note ? ` — ${escapeHtmlInline(s.note)}` : '');
    items.push(`<li>${k}</li>`);
  }
  for (const s of [...general, ...factual]) {
    const k = String(s).trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    items.push(`<li>${escapeHtmlInline(k)}</li>`);
  }
  if (!items.length) return '';
  return `
    <aside class="sources" aria-label="Sources">
      <span class="sources-label">Sources</span>
      <ul class="sources-list">
        ${items.join('\n        ')}
      </ul>
    </aside>`;
}

export function buildPageFooter(body, fm, slug, category) {
  const corrTitle = encodeURIComponent(`Correction: ${category}/${slug}`);
  const corrBody = encodeURIComponent(`Page: pages/${category}/${slug}.html\n\nDescribe the correction:\n\n`);
  const corrUrl = `https://github.com/HunterDellere/hd-recipes/issues/new?title=${corrTitle}&body=${corrBody}&labels=correction`;
  const reqTitle = encodeURIComponent('Request: ');
  const reqUrl = `https://github.com/HunterDellere/hd-recipes/issues/new?title=${reqTitle}&labels=request`;

  const idLabel = fm.title ? `${fm.title} · ${slug}` : slug;
  const updated = fm.updated ? ` · updated ${fm.updated}` : '';

  const footer = `<footer class="page-footer">
      <div class="page-footer-actions">
        <div class="page-footer-buttons">
          <button type="button" class="pf-btn pf-btn-share" data-share aria-label="Share this page">
            <svg class="pf-btn-icon" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            <span data-share-label>Share</span>
          </button>
        </div>
        <div class="page-footer-links">
          <a href="${corrUrl}" class="pf-link" target="_blank" rel="noopener noreferrer">Corrections</a>
          <a href="${reqUrl}" class="pf-link" target="_blank" rel="noopener noreferrer">Request a recipe</a>
        </div>
      </div>
      <div class="page-footer-row">
        <span class="footer-id">hd · recipes · <span>${escapeHtmlInline(idLabel)}${escapeHtmlInline(updated)}</span></span>
        <a href="../../index.html" class="footer-back">← All entries</a>
      </div>
    </footer>`;

  body = body.replace(/[ \t]*<!--\s*FOOTER\s*-->\s*\n?/g, '');
  body = body.replace(/<footer class="page-footer">[\s\S]*?<\/footer>\s*/g, '');
  return body.replace('</main>', `\n    ${footer}\n  </main>`);
}

export function ensureMainContentId(body) {
  if (/\bid="main-content"/.test(body)) return body;
  return body
    .replace('<main class="main">', '<main class="main" id="main-content">')
    .replace('<main class="fam-main">', '<main class="fam-main" id="main-content">');
}

/**
 * Build a map of phrase → target entry, used by autoLinkBody.
 * Each entry contributes its title (first segment before " — ") and any aliases.
 */
export function buildLinkMap(entries, currentEntry) {
  const map = new Map();
  for (const e of entries) {
    if (e.path === currentEntry.path) continue;
    if (e.status !== 'complete') continue;
    const title = (e.title || '').split('—')[0].split('·')[0].trim();
    if (!title) continue;
    if (title.length < 4) continue; // skip ultra-short titles to avoid noise
    const key = title.toLowerCase();
    if (!map.has(key)) map.set(key, e);
  }
  return map;
}

function relPath(fromPath, toPath) {
  const fromParts = fromPath.split('/').slice(0, -1);
  const toParts = toPath.split('/');
  let common = 0;
  while (common < fromParts.length && common < toParts.length - 1 && fromParts[common] === toParts[common]) common++;
  const ups = fromParts.length - common;
  const downs = toParts.slice(common);
  return ('../'.repeat(ups) + downs.join('/')) || './';
}

const SKIP_TAGS = new Set(['a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'code', 'pre', 'script', 'style']);

/**
 * Auto-link first occurrence of each link-map phrase in the body.
 * Walks text nodes outside skipped tags and inside auto-link-skip sentinels.
 * Implemented as a string scan with a tag-tracking stack — light but safe.
 */
export function autoLinkBody(body, linkMap, currentEntry) {
  if (!linkMap.size) return body;
  const phrases = Array.from(linkMap.keys()).sort((a, b) => b.length - a.length);
  const used = new Set();
  let out = '';
  let i = 0;
  const stack = [];
  let skipDepth = 0; // inside <!-- auto-link-skip -->
  while (i < body.length) {
    if (body.startsWith('<!-- auto-link-skip -->', i)) {
      skipDepth++; out += '<!-- auto-link-skip -->'; i += 23; continue;
    }
    if (body.startsWith('<!-- /auto-link-skip -->', i)) {
      skipDepth = Math.max(0, skipDepth - 1); out += '<!-- /auto-link-skip -->'; i += 24; continue;
    }
    if (body[i] === '<') {
      const close = body.indexOf('>', i);
      if (close < 0) { out += body.slice(i); break; }
      const tagText = body.slice(i, close + 1);
      const m = tagText.match(/^<\/?([a-zA-Z][a-zA-Z0-9]*)/);
      if (m) {
        const tag = m[1].toLowerCase();
        if (tagText.startsWith('</')) {
          if (stack.length && stack[stack.length - 1] === tag) stack.pop();
        } else if (!tagText.endsWith('/>')) {
          stack.push(tag);
        }
      }
      out += tagText;
      i = close + 1;
      continue;
    }
    // Text node up to next '<'
    const nextLt = body.indexOf('<', i);
    const text = body.slice(i, nextLt < 0 ? body.length : nextLt);
    const inSkippedTag = stack.some(t => SKIP_TAGS.has(t));
    if (skipDepth > 0 || inSkippedTag) {
      out += text;
    } else {
      out += linkifyText(text, phrases, linkMap, used, currentEntry);
    }
    i = nextLt < 0 ? body.length : nextLt;
  }
  return out;
}

function linkifyText(text, phrases, linkMap, used, currentEntry) {
  let result = '';
  let cursor = 0;
  const lower = text.toLowerCase();
  while (cursor < text.length) {
    let bestStart = -1, bestEnd = -1, bestEntry = null, bestPhrase = '';
    for (const phrase of phrases) {
      if (used.has(phrase)) continue;
      const idx = lower.indexOf(phrase, cursor);
      if (idx < 0) continue;
      // word boundary check for ASCII phrases
      if (/^[a-z0-9]/.test(phrase)) {
        const before = idx === 0 ? ' ' : text[idx - 1];
        const after = idx + phrase.length >= text.length ? ' ' : text[idx + phrase.length];
        if (/[a-z0-9]/i.test(before) || /[a-z0-9]/i.test(after)) continue;
      }
      if (bestStart < 0 || idx < bestStart) {
        bestStart = idx; bestEnd = idx + phrase.length; bestEntry = linkMap.get(phrase); bestPhrase = phrase;
      }
    }
    if (bestStart < 0) { result += text.slice(cursor); break; }
    result += text.slice(cursor, bestStart);
    const original = text.slice(bestStart, bestEnd);
    const href = relPath(currentEntry.path, bestEntry.path);
    result += `<a class="x-link" data-category="${bestEntry.category}" href="${href}">${original}</a>`;
    used.add(bestPhrase);
    cursor = bestEnd;
  }
  return result;
}
