// Validates every relative link and image in all README files against the working tree, so the docs
// cannot drift from the files that actually exist.
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const files = fs.readdirSync(root).filter((name) => /^README(\..+)?\.md$/i.test(name));

let missingTotal = 0;

for (const file of files) {
  const readme = fs.readFileSync(path.join(root, file), 'utf8');
  const markdownLinks = [...readme.matchAll(/\]\((?!https?:|#|mailto:)([^)]+)\)/g)].map((m) => m[1]);
  const htmlImages = [...readme.matchAll(/src="(?!https?:|data:)([^"]+)"/g)].map((m) => m[1]);

  const check = (list, label) => {
    const missing = [];
    for (const entry of list) {
      const target = decodeURI(entry.split('#')[0]);
      if (target === '') continue;
      if (!fs.existsSync(path.join(root, target))) missing.push(entry);
    }
    console.log(
      `${file} ${label}: ${list.length} checked, ${missing.length === 0 ? 'all present' : 'MISSING -> ' + missing.join(', ')}`,
    );
    return missing.length;
  };

  missingTotal += check(markdownLinks, 'relative links');
  missingTotal += check(htmlImages, 'images');
}

if (missingTotal > 0) process.exit(1);
