// Automated accessibility + contrast audit of the deployed site with axe-core.
//
// This is a floor, not a certificate: axe catches roughly a third of real accessibility problems.
// It is run in CI for regressions and reported honestly in the README.
const { chromium, devices } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.LIVE_URL || 'https://iiiiiiiiiiiiikk.github.io/contrastjudge/';
const AXE_PATH = require.resolve('axe-core/axe.min.js');

async function audit(page, label) {
  await page.addScriptTag({ path: AXE_PATH });
  const result = await page.evaluate(async () => {
    // `axe` is injected by addScriptTag above, inside the page context.
    return await globalThis.axe.run(document, {
      resultTypes: ['violations'],
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
    });
  });
  return {
    label,
    violations: result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.length,
      targets: v.nodes.slice(0, 3).map((n) => n.target.join(' ')),
    })),
  };
}

(async () => {
  const browser = await chromium.launch();
  const reports = [];

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  const page = await desktop.newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.getByTestId('contrast-ratio').waitFor();
  reports.push(await audit(page, 'workspace (light)'));

  // Every tab, so no panel escapes the scan.
  for (const [tab, name] of [
    ['Palette', 'palette'],
    ['Batch', 'batch'],
    ['Method', 'method'],
  ]) {
    await page.getByRole('tab', { name: new RegExp(tab, 'i') }).click();
    await page.waitForTimeout(250);
    reports.push(await audit(page, `${name} (light)`));
  }

  await page.getByRole('tab', { name: /Workspace/i }).click();
  await page.getByRole('button', { name: /Switch to dark theme/i }).click();
  await page.waitForTimeout(250);
  reports.push(await audit(page, 'workspace (dark)'));

  // Error state: invalid input must still be announced and labelled.
  await page.getByLabel('Foreground (text)', { exact: true }).fill('#zzz');
  await page.waitForTimeout(250);
  reports.push(await audit(page, 'workspace (invalid input, dark)'));

  // A phone viewport, because reflow and target size only show up there.
  const phone = await browser.newContext({ ...devices['iPhone 14'] });
  const mobile = await phone.newPage();
  await mobile.goto(BASE, { waitUntil: 'domcontentloaded' });
  await mobile.getByTestId('contrast-ratio').waitFor();
  reports.push(await audit(mobile, 'workspace (iPhone 14)'));

  await browser.close();

  const total = reports.reduce((sum, report) => sum + report.violations.length, 0);
  for (const report of reports) {
    if (report.violations.length === 0) {
      console.log(`PASS  ${report.label}: no axe violations`);
      continue;
    }
    console.log(`FAIL  ${report.label}: ${report.violations.length} violation(s)`);
    for (const violation of report.violations) {
      console.log(`        [${violation.impact}] ${violation.id} — ${violation.help} (${violation.nodes} node(s))`);
      for (const target of violation.targets) console.log(`          → ${target}`);
    }
  }

  const output = path.join(__dirname, '..', 'test-results', 'a11y-report.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(reports, null, 2));
  console.log(
    `\n${reports.length - reports.filter((r) => r.violations.length).length}/${reports.length} page states clean; ${total} violation(s) total`,
  );
  console.log(`report: ${output}`);
  if (total > 0) process.exit(1);
})();
