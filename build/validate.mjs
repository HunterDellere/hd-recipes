#!/usr/bin/env node
/**
 * validate.mjs — schema validation for all content files in hd-recipes.
 * Also checks that hub members[] resolve to known entries.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, basename, relative } from 'path';
import { fileURLToPath } from 'url';
import matter from 'gray-matter';
import { validateEntry } from './lib/validate.mjs';
import { createFinding, mergeFindings } from './lib/findings.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const EMIT = process.argv.includes('--emit-findings');

function walk(dir) {
  const results = [];
  if (!existsSync(dir)) return results;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (!name.startsWith('_')) results.push(...walk(full));
    } else if (name.endsWith('.md') && !name.startsWith('_')) results.push(full);
  }
  return results;
}

const contentDir = join(ROOT, 'content');
const files = walk(contentDir);
const adminFindings = [];
let errors = 0;
const allFm = [];

for (const filePath of files) {
  const rel = relative(contentDir, filePath);
  try {
    const { data: fm } = matter(readFileSync(filePath, 'utf8'));
    validateEntry(fm, filePath);
    allFm.push({ fm, filePath, rel });
  } catch (err) {
    console.error(`✗ ${rel}\n  ${err.message}`);
    errors++;
    if (EMIT) adminFindings.push(createFinding({ level: 'ERROR', category: 'schema', file: `content/${rel}`, msg: err.message }));
  }
}

const knownSlugs = new Set(allFm.map(({ rel }) => `${rel.split('/')[0]}/${basename(rel, '.md')}`));

for (const { fm, rel } of allFm) {
  if (fm.type === 'hub' && Array.isArray(fm.members)) {
    for (const m of fm.members) {
      if (!m.slug) continue;
      const norm = m.slug.replace(/^pages\//, '').replace(/\.html$/, '');
      if (!knownSlugs.has(norm)) {
        console.error(`✗ ${rel}\n  members[].slug: "${m.slug}" not found`);
        errors++;
        if (EMIT) adminFindings.push(createFinding({ level: 'ERROR', category: 'hub-members', file: `content/${rel}`, msg: `members[].slug: "${m.slug}" not found`, fix: `Check content/${norm}.md exists` }));
      }
    }
  }
  if (fm.type === 'recipe' && Array.isArray(fm.ingredients)) {
    for (const ing of fm.ingredients) {
      if (!ing.slug) continue;
      const norm = ing.slug.replace(/^ingredients\//, 'ingredients/').replace(/^([^/]+)$/, 'ingredients/$1');
      if (!knownSlugs.has(norm)) {
        console.warn(`! ${rel}\n  ingredient slug "${ing.slug}" — no content/${norm}.md (will render as plain text)`);
        if (EMIT) adminFindings.push(createFinding({ level: 'WARN', category: 'crosslinks', file: `content/${rel}`, msg: `ingredient slug "${ing.slug}" has no matching ingredient page`, fix: `Create content/${norm}.md or remove the slug field` }));
      }
    }
    for (const t of (fm.techniques || [])) {
      const norm = t.startsWith('techniques/') ? t : `techniques/${t}`;
      if (!knownSlugs.has(norm)) {
        console.warn(`! ${rel}\n  technique "${t}" — no content/${norm}.md`);
        if (EMIT) adminFindings.push(createFinding({ level: 'WARN', category: 'crosslinks', file: `content/${rel}`, msg: `technique "${t}" has no matching page`, fix: `Create content/${norm}.md` }));
      }
    }
  }
}

if (EMIT) mergeFindings(ROOT, adminFindings, ['schema', 'hub-members', 'crosslinks']);

if (!errors) console.log(`✓ All ${files.length} content files valid.`);
else { console.error(`\n${errors} validation error(s).`); process.exit(1); }
