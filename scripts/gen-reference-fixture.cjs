// Regenerates tests/fixtures/reference-contrast.json.
//
// The fixture exists so the test suite can prove ContrastJudge's maths against *independent*
// implementations instead of against itself. Two long-standing packages are used, both installed as
// devDependencies only (they never enter the production bundle):
//
//   - wcag-contrast v3          — built on `relative-luminance`
//   - color-contrast-checker v2 — a widely used WCAG 2.0/2.1 checker
//
// Usage: node scripts/gen-reference-fixture.cjs
const fs = require('node:fs');
const path = require('node:path');

const wcagContrast = require('wcag-contrast');
const relativeLuminanceModule = require('relative-luminance');
const relativeLuminance = relativeLuminanceModule.default || relativeLuminanceModule;
const ColorContrastChecker = require('color-contrast-checker');

const ccc = new ColorContrastChecker();

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const expanded =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = Number.parseInt(expanded, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

// A deterministic spread: extremes, primaries, common UI greys and the awkward near-threshold greys.
const palette = [
  '#000000', '#ffffff', '#808080', '#767676', '#777777', '#595959', '#5a5a5a',
  '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff',
  '#118ab2', '#06d6a0', '#ffd166', '#ef476f', '#073b4c', '#f8f9fa', '#212529',
  '#1f4fd8', '#e5ecff', '#0b6b3a', '#e0f5e8', '#b3261e', '#fdecea',
  '#010101', '#0a0a0a', '#101010', '#1a1a1a', '#333333', '#4d4d4d',
  '#8a8a8a', '#b0b0b0', '#cccccc', '#e6e6e6', '#f2f2f2', '#fafafa',
  '#7f7f7f', '#7e7e7e', '#767575', '#757676', '#3d3d3d', '#c0c0c0',
];

const pairs = [];
for (let i = 0; i < palette.length; i += 1) {
  for (let j = i; j < palette.length; j += 1) {
    const foreground = palette[i];
    const background = palette[j];
    const lumForeground = relativeLuminance(hexToRgb(foreground));
    const lumBackground = relativeLuminance(hexToRgb(background));
    const ratio = wcagContrast.rgb(hexToRgb(foreground), hexToRgb(background));
    pairs.push({
      foreground,
      background,
      luminanceForeground: Number(lumForeground.toFixed(12)),
      luminanceBackground: Number(lumBackground.toFixed(12)),
      ratio: Number(ratio.toFixed(6)),
      wcagAaNormal: ratio >= 4.5,
      wcagAaLarge: ratio >= 3,
      wcagAaaNormal: ratio >= 7,
      wcagAaaLarge: ratio >= 4.5,
    });
  }
}

// Agree with the second implementation on a sample of every 13th pair.
const crossChecks = pairs
  .filter((_, index) => index % 13 === 0)
  .map((pair) => {
    const a = ccc.hexToLuminance(pair.foreground);
    const b = ccc.hexToLuminance(pair.background);
    const ratio = ccc.getContrastRatio(a, b);
    return {
      foreground: pair.foreground,
      background: pair.background,
      wcagContrastRatio: pair.ratio,
      colorContrastCheckerRatio: Number(ratio.toFixed(6)),
      equal: Math.abs(ratio - pair.ratio) < 1e-6,
    };
  });

const output = {
  generatedBy: {
    wcagContrast: require('wcag-contrast/package.json').version,
    colorContrastChecker: require('color-contrast-checker/package.json').version,
    relativeLuminance: require('relative-luminance/package.json').version,
  },
  note: 'Reference values produced by independent third-party implementations; used to validate ContrastJudge without sharing code.',
  pairs,
  crossChecks,
};

const target = path.join(__dirname, '..', 'tests', 'fixtures', 'reference-contrast.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(output, null, 1));
console.log('pairs:', pairs.length, 'crossChecks:', crossChecks.length);
console.log('all cross checks equal:', crossChecks.every((check) => check.equal));
