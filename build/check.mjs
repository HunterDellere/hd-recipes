#!/usr/bin/env node
/**
 * check.mjs — post-build invariants for hd-recipes.
 *
 *   - Every page has a parseable metadata comment.
 *   - Layout universals (topnav, main, footer, stylesheet, scripts).
 *   - Type invariants for complete pages.
 *   - Internal hrefs/srcs resolve; #fragments resolve.
 *   - content/**.md ↔ pages/**.html 1:1.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, relative, resolve } from 'path';
import { fileURLToPath } from 'url';
import { createFinding, mergeFindings } from './lib/findings.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EMIT = process.argv.includes('--emit-findings');

function walkHtml(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walkHtml(full));
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

function walkMd(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_')) continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) out.push(...walkMd(full));
    else if (name.endsWith('.md')) out.push(full);
  }
  return out;
}

function parseMetaComment(html) {
  const m = html.match(/^<!DOCTYPE html>\s*<!--\s*(\{[\s\S]*?\})\s*-->/);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

function collectIds(html) {
  const ids = new Set();
  const re = /\bid="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) ids.add(m[1]);
  return ids;
}

function collectLinks(html) {
  const stripped = html
    .replace(/<script\b[\s\S]*?<\/script>/g, '')
    .replace(/<style\b[\s\S]*?<\/style>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const links = [];
  const re = /\b(href|src)="([^"]+)"/g;
  let m;
  while ((m = re.exec(stripped)) !== null) links.push({ attr: m[1], value: m[2] });
  return links;
}

function stripQueryAndHash(s) { return s.split('#')[0].split('?')[0]; }
function isExternal(v) { return /^(https?:|mailto:|tel:|javascript:|data:)/i.test(v); }

const LAYOUT_INVARIANTS = [
  { name: 'layout.topnav',     test: h => /<nav class="topnav"/.test(h) },
  { name: 'layout.main',       test: h => /<main[^>]*class="(main|fam-main)"/.test(h) },
  { name: 'layout.footer',     test: h => /<footer class="page-footer"/.test(h) },
  { name: 'layout.stylesheet', test: h => /href="[^"]*style\.css/.test(h) },
  { name: 'layout.toc-scroll', test: h => /toc-scroll\.js/.test(h) },
  { name: 'layout.lang-en',    test: h => /<html[^>]*lang="en"/.test(h) },
];

const TYPE_INVARIANTS = {
  recipe: [
    { name: 'recipe.hero',         test: h => /<header[^>]*class="recipe-hero"/.test(h) },
    { name: 'recipe.ingredients',  test: h => /class="recipe-ingredients"/.test(h) },
    { name: 'recipe.execution',    test: h => /id="execution"/.test(h) },
  ],
  ingredient: [{ name: 'ingredient.topic-hero', test: h => /<header[^>]*class="topic-hero"/.test(h) }],
  technique:  [{ name: 'technique.topic-hero',  test: h => /<header[^>]*class="topic-hero"/.test(h) }],
  cuisine:    [{ name: 'cuisine.topic-hero',    test: h => /<header[^>]*class="topic-hero"/.test(h) }],
  equipment:  [{ name: 'equipment.topic-hero',  test: h => /<header[^>]*class="topic-hero"/.test(h) }],
  hub:        [{ name: 'hub.topic-hero',        test: h => /<header[^>]*class="topic-hero"/.test(h) }],
  family:     [{ name: 'family.fam-hero',       test: h => /<header[^>]*class="fam-hero"/.test(h) }],
};

const errors = [];
function fail(file, msg) { errors.push(`${relative(ROOT, file)}\n  ${msg}`); }

const pagesDir = join(ROOT, 'pages');
const htmlFiles = [join(ROOT, 'index.html'), ...walkHtml(pagesDir)];

const pageInfo = new Map();
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  pageInfo.set(file, { html, meta: parseMetaComment(html), ids: collectIds(html) });
}

const INDEX_INVARIANTS = [
  { name: 'index.topnav-brand', test: h => /class="topnav-brand"/.test(h) },
  { name: 'index.stylesheet',   test: h => /href="[^"]*style\.css/.test(h) },
  { name: 'index.homepage-js',  test: h => /homepage\.js/.test(h) },
];

// Top-level personalization shells aren't content-backed and use a
// minimalist layout (no sidebar, no TOC). Skip them like `_` dirs.
const STATIC_TOPLEVEL_FILES = new Set(['saved.html', 'settings.html']);
for (const [file, { html, meta }] of pageInfo) {
  const isIndex = file === join(ROOT, 'index.html');
  const relPath = relative(pagesDir, file);
  if (relPath.startsWith('_')) continue;
  if (STATIC_TOPLEVEL_FILES.has(relPath)) continue;
  if (isIndex) {
    for (const inv of INDEX_INVARIANTS) if (!inv.test(html)) fail(file, `invariant failed: ${inv.name}`);
    continue;
  }
  for (const inv of LAYOUT_INVARIANTS) if (!inv.test(html)) fail(file, `invariant failed: ${inv.name}`);
  if (!meta) { fail(file, 'missing/unparseable metadata comment'); continue; }
  if (!meta.type) fail(file, 'metadata missing "type"');
  if (!meta.category) fail(file, 'metadata missing "category"');
  if (meta.status === 'complete') {
    for (const inv of (TYPE_INVARIANTS[meta.type] || [])) {
      let ok; try { ok = inv.test(html, meta); } catch { ok = false; }
      if (!ok) fail(file, `invariant failed: ${inv.name}`);
    }
  }
}

for (const [file, { html }] of pageInfo) {
  const relPathS3 = relative(pagesDir, file);
  if (relPathS3.startsWith('_')) continue;
  const isIndex = file === join(ROOT, 'index.html');
  const fileDir = dirname(file);
  for (const { attr, value } of collectLinks(html)) {
    if (!value || isExternal(value)) continue;
    if (value.startsWith('#')) {
      if (isIndex) continue;
      const frag = value.slice(1);
      if (!frag) continue;
      if (!pageInfo.get(file).ids.has(frag)) fail(file, `broken fragment ${attr}="${value}"`);
      continue;
    }
    const pathPart = stripQueryAndHash(value);
    if (!pathPart) continue;
    const fragMatch = value.match(/#([^?]*)$/);
    const fragment = fragMatch ? fragMatch[1] : '';
    const absTarget = resolve(fileDir, pathPart);
    if (!existsSync(absTarget)) {
      fail(file, `broken ${attr}="${value}" — target "${relative(ROOT, absTarget)}" missing`);
      continue;
    }
    if (fragment && pageInfo.has(absTarget)) {
      if (!pageInfo.get(absTarget).ids.has(fragment)) {
        fail(file, `broken fragment ${attr}="${value}" — target has no id="${fragment}"`);
      }
    }
  }
}

const contentDir = join(ROOT, 'content');
const contentFiles = walkMd(contentDir);
const contentSlugs = new Set();
for (const f of contentFiles) {
  contentSlugs.add(relative(contentDir, f).replace(/\.md$/, ''));
}
const pageSlugs = new Set();
for (const f of walkHtml(pagesDir)) {
  pageSlugs.add(relative(pagesDir, f).replace(/\.html$/, ''));
}
for (const slug of contentSlugs) {
  if (!pageSlugs.has(slug)) fail(join(contentDir, slug + '.md'), `orphan content: no pages/${slug}.html`);
}
const STATIC_TOPLEVEL_SLUGS = new Set(['saved', 'settings']);
for (const slug of pageSlugs) {
  if (slug.startsWith('_')) continue;
  // pages/tags/<slug>.html are generated indices, not content-backed
  if (slug.startsWith('tags/')) continue;
  // Personalization shells (saved.html / settings.html) intentionally have
  // no markdown source — they render from localStorage.
  if (STATIC_TOPLEVEL_SLUGS.has(slug)) continue;
  if (!contentSlugs.has(slug)) fail(join(pagesDir, slug + '.html'), `orphan page: no content/${slug}.md`);
}

if (EMIT) {
  const findings = errors.map(e => {
    const msg = e.replace(/^[^\n]+\n\s*/, '');
    const file = e.split('\n')[0].trim();
    let category = 'layout';
    if (/broken (href|src)/.test(msg))   category = 'links';
    if (/broken fragment/.test(msg))     category = 'anchors';
    if (/orphan/.test(msg))              category = 'orphans';
    return createFinding({ level: 'ERROR', category, file, msg });
  });
  mergeFindings(ROOT, findings, ['links', 'anchors', 'orphans', 'layout']);
}

if (!errors.length) {
  console.log(`✓ check.mjs: ${pageInfo.size} pages, ${contentSlugs.size} content sources — invariants hold, links resolve.`);
} else {
  console.error(`\n${errors.length} check error(s):\n`);
  for (const e of errors) console.error('✗ ' + e + '\n');
  process.exit(1);
}
