#!/usr/bin/env node
/**
 * validate-relations.mjs — audit relations + tag health for hd-recipes.
 *   - Pages with fewer than MIN_PER_PAGE related entries (WARN)
 *   - Orphaned tags in tags.json (INFO)
 *   - Unknown tags used by entries (WARN)
 *   - Hub members[] that don't resolve (ERROR)
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { buildRelations } from './lib/relations.mjs';
import { createFinding, mergeFindings, reportFindings } from './lib/findings.mjs';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const CONTENT = path.join(ROOT, 'content');
const MIN_PER_PAGE = 4;

const entriesPath = path.join(ROOT, 'data', 'entries.json');
if (!fs.existsSync(entriesPath)) {
  console.error('validate-relations: data/entries.json missing — run npm run build first.');
  process.exit(1);
}
const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));

const findings = [];
function emit(level, category, file, msg, extra = {}) {
  findings.push(createFinding({ level, category, file, msg, ...extra }));
}

function contentPath(entry) {
  return entry.path.replace(/^pages\//, 'content/').replace(/\.html$/, '.md');
}

const relations = buildRelations(entries);
for (const [pagePath, related] of relations) {
  const entry = entries.find(e => e.path === pagePath);
  if (!entry || entry.status !== 'complete') continue;
  if (related.length < MIN_PER_PAGE) {
    emit('WARN', 'relations', contentPath(entry),
      `only ${related.length} related entries (min ${MIN_PER_PAGE})`,
      { fix: 'Add tags from content/_schema/tags.json or link more ingredients/techniques' });
  }
}

const tagsRaw = JSON.parse(fs.readFileSync(path.join(CONTENT, '_schema', 'tags.json'), 'utf8'));
const allTagSlugs = new Set(tagsRaw.map(t => t.slug));
const usage = {};
for (const e of entries) for (const t of (e.tags || [])) usage[t] = (usage[t] || 0) + 1;

const orphaned = [...allTagSlugs].filter(s => !usage[s]);
if (orphaned.length) emit('INFO', 'tags', 'content/_schema/tags.json',
  `${orphaned.length} tags defined but unused: ${orphaned.slice(0, 20).join(', ')}${orphaned.length > 20 ? '…' : ''}`);

const topTags = Object.entries(usage).sort((a, b) => b[1] - a[1]).slice(0, 30).map(([s, n]) => `${s}(${n})`).join(', ');
emit('INFO', 'tags', 'content/_schema/tags.json', `${Object.keys(usage).length} tags in use across ${entries.length} entries. Top: ${topTags}`);

const unknownTags = Object.keys(usage).filter(t => !allTagSlugs.has(t));
if (unknownTags.length) emit('WARN', 'tags', 'content/_schema/tags.json',
  `unknown tags used: ${unknownTags.join(', ')}`, { fix: 'Add to content/_schema/tags.json' });

// hub members
const knownSlugs = new Set(entries.map(e => e.path.replace(/^pages\//, '').replace(/\.html$/, '')));
function walk(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('_')) continue;
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walk(full));
    else if (name.endsWith('.md')) out.push(full);
  }
  return out;
}
for (const fp of walk(CONTENT)) {
  const { data: fm } = matter(fs.readFileSync(fp, 'utf8'));
  if (fm.type !== 'hub' || !Array.isArray(fm.members)) continue;
  const rel = path.relative(ROOT, fp);
  for (const m of fm.members) {
    if (!m.slug) continue;
    const norm = m.slug.replace(/^pages\//, '').replace(/\.html$/, '');
    if (!knownSlugs.has(norm)) emit('ERROR', 'hub-members', rel,
      `hub member slug "${m.slug}" does not resolve`, { fix: `Check content/${norm}.md` });
  }
}

reportFindings('validate-relations', findings);
mergeFindings(ROOT, findings, ['relations', 'tags', 'hub-members']);
process.exit(findings.filter(f => f.level === 'ERROR').length > 0 ? 1 : 0);
