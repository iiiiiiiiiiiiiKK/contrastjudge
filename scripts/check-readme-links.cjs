// Checks every relative link and image reference in the README against the working tree, so the
// docs cannot drift from the files that actually exist.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

const markdownLinks = [...readme.matchAll(/\]\((?!https?:|#|mailto:)([^)]+)\)/g)].map((m) => m[1]);
const htmlImages = [...readme.matchAll(/src="(?!https?:|data:)([^"]+)"/g)].map((m) => m[1]);

function check(list, label) {
  const missing = [];
  for (const entry of list) {
    const target = entry.split('#')[0];
    if (target === '') continue;
    if (!fs.existsSync(path.join(root, target))) missing.push(entry);
  }
  console.log(
    `${label}: ${list.length} checked, ${missing.length === 0 ? 'all present' : 'MISSING -> ' + missing.join(', ')}`,
  );
  return missing.length;
}

const missingLinks = check(markdownLinks, 'relative links');
const missingImages = check(htmlImages, 'images');
if (missingLinks + missingImages > 0) process.exit(1);
