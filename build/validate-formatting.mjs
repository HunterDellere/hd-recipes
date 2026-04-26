#!/usr/bin/env node
/**
 * validate-formatting.mjs — formatting + structural quality checks for hd-recipes.
 *   - Recipe pages must have section-anchors for ingredients + execution
 *   - Verified entries should have a sources block
 *   - Recipes should declare servings and at least 2 steps
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { createFinding, mergeFindings, reportFindings } from './lib/findings.mjs';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const PAGES = path.join(ROOT, 'pages');
const findings = [];
function emit(level, file, msg, extra = {}) { findings.push(createFinding({ level, category: 'formatting', file, msg, ...extra })); }

function walkPages(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('_')) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walkPages(full));
    else if (name.endsWith('.html')) out.push(full);
  }
  return out;
}

for (const pageFull of walkPages(PAGES)) {
  const pageRel = path.relative(ROOT, pageFull);
  const contentRel = pageRel.replace(/^pages\//, 'content/').replace(/\.html$/, '.md');
  const contentFull = path.join(ROOT, contentRel);
  if (!fs.existsSync(contentFull)) continue;
  const html = fs.readFileSync(pageFull, 'utf8');
  const { data: fm } = matter(fs.readFileSync(contentFull, 'utf8'));
  if (fm.status !== 'complete') continue;

  if (!html.includes('class="section-anchor"')) {
    emit('WARN', contentRel, 'no section-anchor elements — TOC scroll-spy disabled', { fix: 'Add section anchors with ids' });
  }

  if (fm.type === 'recipe') {
    if (!html.includes('id="ingredients"')) emit('WARN', contentRel, 'recipe missing ingredients section', {});
    if (!html.includes('id="execution"')) emit('WARN', contentRel, 'recipe missing execution section', {});
    if (!fm.steps || fm.steps.length < 2) emit('WARN', contentRel, `recipe has ${(fm.steps || []).length} step(s) — typically need 2+`, {});
  }

  if (fm.content_review === 'verified') {
    const hasSources = /class="sources"/.test(html) || (fm.content_sources && fm.content_sources.length) || (fm.source && fm.source.name);
    if (!hasSources) emit('WARN', contentRel, 'content_review:verified but no sources', { fix: 'Add fm.source or fm.content_sources' });
  }
}

reportFindings('validate-formatting', findings);
mergeFindings(ROOT, findings, ['formatting']);
process.exit(findings.filter(f => f.level === 'ERROR').length > 0 ? 1 : 0);
