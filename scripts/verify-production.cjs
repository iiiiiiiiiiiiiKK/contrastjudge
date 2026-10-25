// Production smoke test against the deployed GitHub Pages site.
// Proves the live bundle renders, computes, exports and responds to input — not just that the
// server returns 200 for index.html.
const { chromium, devices } = require('playwright');

const BASE = process.env.LIVE_URL || 'https://iiiiiiiiiiiiikk.github.io/contrastjudge/';
const results = [];
const record = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
};

async function setPair(page, fg, bg) {
  await page.getByLabel('Foreground (text)', { exact: true }).fill(fg);
  await page.getByLabel('Background (surface)', { exact: true }).fill(bg);
}

(async () => {
  const browser = await chromium.launch();

  // ---- Desktop ----
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'en-US' });
  const page = await desktop.newPage();
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => consoleErrors.push('pageerror: ' + error.message));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  record('title', (await page.title()).includes('ContrastJudge'), await page.title());
  record('h1 rendered', (await page.locator('h1').count()) === 1);
  record('X link present', await page.getByRole('link', { name: /Author on X/i }).isVisible());

  const ratio = page.getByTestId('contrast-ratio');
  await setPair(page, '#000000', '#ffffff');
  record('black on white = 21.00:1', (await ratio.textContent()) === '21.00:1', await ratio.textContent());

  await setPair(page, '#767676', '#ffffff');
  record('#767676 on white = 4.54:1', (await ratio.textContent()) === '4.54:1', await ratio.textContent());
  record('passes AA', (await page.locator('.verdict-badge').textContent()).includes('Passes AA'));

  await setPair(page, '#777777', '#ffffff');
  record('#777777 on white = 4.48:1 (fails)', (await ratio.textContent()) === '4.48:1', await ratio.textContent());
  record('fails AA', (await page.locator('.verdict-badge').textContent()).includes('Fails AA'));

  await setPair(page, 'rgb(0 0 0)', 'hsl(0 0% 100%)');
  record('rgb()/hsl() input = 21.00:1', (await ratio.textContent()) === '21.00:1');

  await setPair(page, '#12345', '#ffffff');
  record(
    'invalid hex flagged',
    (await page.getByLabel('Foreground (text)', { exact: true }).getAttribute('aria-invalid')) === 'true',
  );
  record('invalid hex shows no result', await page.getByText(/No result yet/).isVisible());

  await setPair(page, '#9aa4b2', '#ffffff');
  const suggestion = page.locator('#suggestions button.suggestion').first();
  await suggestion.waitFor();
  await suggestion.click();
  record(
    'applying a suggestion passes AA',
    (await page.locator('.verdict-badge').textContent()).includes('Passes AA'),
  );

  // Exports
  await page.getByRole('button', { name: /Save foreground/i }).click();
  await page.getByRole('tab', { name: /Palette/i }).click();
  const css = (await page.getByLabel('CSS custom properties').textContent()) ?? '';
  record(
    'CSS export contains :root and a hex value',
    css.includes(':root {') && /#[0-9A-F]{6}/.test(css),
    css.split('\n')[1] ?? '',
  );
  const jsonText = (await page.getByLabel(/JSON design tokens/).textContent()) ?? '{}';
  let jsonOk = false;
  try {
    const parsed = JSON.parse(jsonText);
    jsonOk = parsed.generator === 'ContrastJudge' && Array.isArray(parsed.colors) && parsed.colors.length > 0;
  } catch {
    jsonOk = false;
  }
  record('JSON export parses with colours', jsonOk);

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^Download \.css$/i }).click();
  const download = await downloadPromise;
  record(
    'CSS download works',
    download.suggestedFilename() === 'contrastjudge-tokens.css',
    download.suggestedFilename(),
  );

  // Batch
  await page.getByRole('tab', { name: /Batch/i }).click();
  const table = page.getByRole('table', { name: /Batch contrast results/i });
  await table.waitFor();
  record('batch table renders 4 example rows', (await table.locator('tbody tr').count()) === 4);
  record('batch reports failures', (await page.getByText(/fail AA text/).textContent())?.includes('fail') ?? false);

  // Dark mode
  await page.getByRole('tab', { name: /Workspace/i }).click();
  await page.getByRole('button', { name: /Switch to dark theme/i }).click();
  record('dark theme applied', (await page.locator('html').getAttribute('data-theme')) === 'dark');
  await page.reload({ waitUntil: 'domcontentloaded' });
  record('dark theme persists after reload', (await page.locator('html').getAttribute('data-theme')) === 'dark');

  record('no console errors on desktop', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

  // ---- iPhone viewport ----
  const phone = await browser.newContext({ ...devices['iPhone 14'], browserName: undefined, locale: 'en-US' });
  const mobile = await phone.newPage();
  const mobileErrors = [];
  mobile.on('pageerror', (error) => mobileErrors.push(error.message));
  await mobile.goto(BASE, { waitUntil: 'domcontentloaded' });

  const overflow = await mobile.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  record(
    'iPhone: no horizontal overflow',
    overflow.scrollWidth <= overflow.clientWidth + 1,
    `${overflow.scrollWidth} vs ${overflow.clientWidth}`,
  );

  const columns = mobile.locator('.workspace > .workspace__column');
  const first = await columns.nth(0).boundingBox();
  const second = await columns.nth(1).boundingBox();
  record(
    'iPhone: workspace stacks into one column',
    Boolean(first && second && second.y > first.y + first.height - 5),
    first && second
      ? `col1 y=${Math.round(first.y)} h=${Math.round(first.height)}, col2 y=${Math.round(second.y)}`
      : 'missing',
  );

  record('iPhone: X link visible in header', await mobile.getByRole('link', { name: /Author on X/i }).isVisible());
  await mobile.getByLabel('Foreground (text)', { exact: true }).fill('#2563eb');
  record(
    'iPhone: ratio updates',
    (await mobile.getByTestId('contrast-ratio').textContent())?.endsWith(':1') ?? false,
    await mobile.getByTestId('contrast-ratio').textContent(),
  );
  record('iPhone: no page errors', mobileErrors.length === 0, mobileErrors.slice(0, 2).join(' | '));

  // ---- Chinese UI: in-app switch ----
  await page.getByRole('tab', { name: /Workspace/i }).click();
  await page.getByRole('button', { name: /Switch language to 简体中文/i }).click();
  record('language switch applies Chinese', (await page.locator('html').getAttribute('lang')) === 'zh-CN');
  record(
    'Chinese heading rendered',
    ((await page.locator('h1').textContent()) ?? '').includes('按 WCAG 2.2 判定色彩对比度'),
  );
  await page.getByLabel('前景色（文字）', { exact: true }).fill('#767676');
  record(
    'Chinese UI still computes 4.54:1',
    (await page.getByTestId('contrast-ratio').textContent()) === '4.54:1',
    await page.getByTestId('contrast-ratio').textContent(),
  );
  record('Chinese verdict is translated', (await page.locator('.verdict-badge').textContent()).includes('通过'));

  await page.reload({ waitUntil: 'domcontentloaded' });
  record('Chinese survives a reload', (await page.locator('html').getAttribute('lang')) === 'zh-CN');
  record('no console errors in Chinese', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

  // ---- Chinese UI: automatic detection from the browser language ----
  const zhContext = await browser.newContext({ viewport: { width: 1440, height: 960 }, locale: 'zh-CN' });
  const zhPage = await zhContext.newPage();
  await zhPage.goto(BASE, { waitUntil: 'domcontentloaded' });
  await zhPage.getByTestId('contrast-ratio').waitFor();
  record(
    'zh-CN browser starts in Chinese',
    (await zhPage.locator('html').getAttribute('lang')) === 'zh-CN',
    await zhPage.locator('html').getAttribute('lang'),
  );
  const zhMobileContext = await browser.newContext({ ...devices['iPhone 14'], locale: 'zh-CN' });
  const zhMobile = await zhMobileContext.newPage();
  await zhMobile.goto(BASE, { waitUntil: 'domcontentloaded' });
  await zhMobile.getByTestId('contrast-ratio').waitFor();
  const zhOverflow = await zhMobile.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  record(
    'iPhone + Chinese: no horizontal overflow',
    zhOverflow.scrollWidth <= zhOverflow.clientWidth + 1,
    `${zhOverflow.scrollWidth} vs ${zhOverflow.clientWidth}`,
  );

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length > 0) {
    console.log('FAILED:', failed.map((f) => f.name).join(', '));
    process.exit(1);
  }
})();
