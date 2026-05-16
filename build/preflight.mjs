#!/usr/bin/env node
/**
 * preflight.mjs — quick pre-validate sanity checks on draft content
 *
 * Catches the cheap errors before `npm run validate` even fires:
 *   - Em-dash budget (max 2 per file, hard rule in validate-formatting)
 *   - Unknown tags (must exist in content/_schema/tags.json)
 *   - Invalid course / diet enums
 *   - Broken homemade_alternatives recipe_slug references
 *   - Missing ingredient slug references (warning only)
 *
 * Usage:
 *   node build/preflight.mjs content/recipes/my-new-recipe.md [more files]
 *   node build/preflight.mjs --staged    # auto-pick uncommitted/new content
 *   node build/preflight.mjs --all-new   # any content/ file modified since main
 *
 * Exits 0 if clean, 1 if any hard error.
 */

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import matter from 'gray-matter';

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const MAX_EMDASH = 2;

const VALID_COURSES = new Set(['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'side', 'sauce', 'drink', 'stock', 'appetizer', 'bread']);
const VALID_DIETS = new Set(['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'low-carb', 'pescatarian']);

const TAGS_PATH = path.join(ROOT, 'content/_schema/tags.json');
const validTags = new Set(JSON.parse(fs.readFileSync(TAGS_PATH, 'utf8')).map(t => t.slug));

function resolveFiles(argv) {
  if (argv.includes('--staged')) {
    const out = execSync('git status --porcelain content/', { cwd: ROOT, encoding: 'utf8' });
    return out.split('\n').map(l => l.slice(3).trim()).filter(p => p && p.endsWith('.md')).map(p => path.join(ROOT, p));
  }
  if (argv.includes('--all-new')) {
    const out = execSync('git diff --name-only main...HEAD content/ && git status --porcelain content/ | awk \'{print $2}\'', { cwd: ROOT, encoding: 'utf8' });
    return [...new Set(out.split('\n').filter(p => p && p.endsWith('.md')))].map(p => path.join(ROOT, p));
  }
  return argv.filter(a => !a.startsWith('--')).map(p => path.resolve(p));
}

let hardErrors = 0;
let warnings = 0;

function err(file, msg) {
  console.log(`✗ ${path.relative(ROOT, file)}: ${msg}`);
  hardErrors++;
}
function warn(file, msg) {
  console.log(`! ${path.relative(ROOT, file)}: ${msg}`);
  warnings++;
}

function countEmdashes(raw) {
  let total = 0;
  let inFence = false;
  for (const line of raw.split('\n')) {
    if (/^\s*```/.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;
    const matches = line.replace(/`[^`]*`/g, '').match(/—/g);
    if (matches) total += matches.length;
  }
  return total;
}

function checkFile(file) {
  if (!fs.existsSync(file)) {
    err(file, 'file does not exist');
    return;
  }
  const raw = fs.readFileSync(file, 'utf8');
  let parsed;
  try {
    parsed = matter(raw);
  } catch (e) {
    err(file, `YAML parse error: ${e.message}`);
    return;
  }
  const fm = parsed.data;

  // Em-dash budget
  const emdashes = countEmdashes(raw);
  if (emdashes > MAX_EMDASH) {
    err(file, `${emdashes} em-dashes — limit is ${MAX_EMDASH}. Replace with commas/colons/periods/parens.`);
  }

  // Tags
  for (const tag of fm.tags || []) {
    if (!validTags.has(tag)) {
      err(file, `unknown tag "${tag}" — add to content/_schema/tags.json or use existing`);
    }
  }

  // Course
  if (fm.course && !VALID_COURSES.has(fm.course)) {
    err(file, `invalid course "${fm.course}" — must be one of: ${[...VALID_COURSES].join(', ')}`);
  }

  // Diet
  for (const d of fm.diet || []) {
    if (!VALID_DIETS.has(d)) {
      err(file, `invalid diet "${d}" — must be one of: ${[...VALID_DIETS].join(', ')}`);
    }
  }

  // homemade_alternatives recipe_slug resolution
  for (const ha of fm.homemade_alternatives || []) {
    if (!ha.recipe_slug) continue;
    const slug = ha.recipe_slug.replace(/^recipes\//, '');
    const target = path.join(ROOT, 'content/recipes', `${slug}.md`);
    if (!fs.existsSync(target)) {
      err(file, `homemade_alternatives.recipe_slug "${ha.recipe_slug}" → no content/recipes/${slug}.md (draft full recipe or create stub)`);
    }
  }

  // Ingredient slug references (warning only)
  for (const ing of fm.ingredients || []) {
    if (!ing.slug) continue;
    const slug = ing.slug.replace(/^ingredients\//, '');
    const target = path.join(ROOT, 'content/ingredients', `${slug}.md`);
    if (!fs.existsSync(target)) {
      warn(file, `ingredient slug "${ing.slug}" → no content/ingredients/${slug}.md (will render as plain text)`);
    }
  }
}

const files = resolveFiles(process.argv.slice(2));
if (files.length === 0) {
  console.log('Usage: node build/preflight.mjs <file.md> [...]  |  --staged  |  --all-new');
  process.exit(2);
}

console.log(`Pre-flight checking ${files.length} file(s)...`);
for (const f of files) checkFile(f);

if (hardErrors === 0 && warnings === 0) {
  console.log(`\n✓ Pre-flight clean. Safe to run \`npm run validate\` / \`npm run verify\`.`);
  process.exit(0);
}
console.log(`\n${hardErrors} hard error(s), ${warnings} warning(s).`);
process.exit(hardErrors > 0 ? 1 : 0);
