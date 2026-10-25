// Scans every text file for the repository account slug and reports any mention whose length or
// shape differs from the canonical one. Used as a one-off consistency check during release.
const fs = require('node:fs');
const path = require('node:path');

const CANONICAL = 'iiiiiiiiiiiiiKK';
const SKIP = new Set([
  'node_modules',
  'dist',
  '.refcalc',
  '.git',
  'test-results',
  'playwright-report',
  '.playwright',
]);
const EXT = /\.(ts|tsx|js|cjs|mjs|json|md|css|html|yml|yaml|txt)$/;

const mentions = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP.has(entry.name)) walk(full);
      continue;
    }
    if (!EXT.test(entry.name)) continue;
    const text = fs.readFileSync(full, 'utf8');
    for (const match of text.matchAll(/iiii+KK/g)) {
      mentions.push({ file: full, slug: match[0] });
    }
  }
}

walk(path.resolve(__dirname, '..'));

const wrong = mentions.filter((m) => m.slug !== CANONICAL);
console.log('repo slug mentions:', mentions.length);
console.log('canonical:', CANONICAL, `(${CANONICAL.length} chars, ${(CANONICAL.match(/i/g) || []).length} i's)`);
console.log('mismatches:', wrong.length);
for (const m of wrong) console.log('  ', m.file, '->', m.slug, `(${m.slug.length})`);
process.exit(wrong.length === 0 ? 0 : 1);
