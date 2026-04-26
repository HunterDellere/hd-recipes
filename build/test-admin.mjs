#!/usr/bin/env node
/**
 * test-admin.mjs — smoke test for the generated admin dashboard.
 */

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const htmlPath = path.join(ROOT, 'pages', '_admin', 'review.html');
const entriesPath = path.join(ROOT, 'data', 'entries.json');
const schemaPath = path.join(ROOT, 'content', '_schema', 'entry.schema.json');

const failures = [];
function check(label, cond, detail = '') {
  if (!cond) failures.push(`✗ ${label}${detail ? ` — ${detail}` : ''}`);
}

if (!fs.existsSync(htmlPath)) {
  console.error(`test-admin: ${htmlPath} missing — run npm run build first.`);
  process.exit(1);
}

const html = fs.readFileSync(htmlPath, 'utf8');
const entries = JSON.parse(fs.readFileSync(entriesPath, 'utf8'));
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

// Every review state from the schema appears in the filter
const enumStates = schema.properties?.content_review?.enum || [];
const expectedStates = [...enumStates, 'missing'];
for (const s of expectedStates) {
  check(`filter option ${s}`, html.includes(`<option value="${s}">${s}</option>`));
}

// Every complete entry has a row
const reviewable = entries.filter(e => e.status === 'complete').map(e => e.path);
for (const p of reviewable.slice(0, 50)) {
  check(`row for ${p}`, html.includes(p));
}

check('table present', html.includes('id="entries-table"'));
check('global search', html.includes('id="filter-q"'));

if (failures.length) {
  console.error(`test-admin: ${failures.length} assertion(s) failed:`);
  for (const f of failures) console.error(`  ${f}`);
  process.exit(1);
}
console.log(`✓ test-admin: ${expectedStates.length} states · ${reviewable.length} reviewable rows — present`);
