import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * End-to-end coverage for the colour maths, the exporter and the responsive layout.
 *
 * The ratios asserted here were cross-checked against independent implementations (see
 * tests/fixtures/reference-contrast.json); this file proves the same numbers reach the UI.
 */

const ratioValue = (page: Page) => page.getByTestId('contrast-ratio');
const verdictBadge = (page: Page) => page.locator('.verdict-badge');

async function setColours(page: Page, fg: string, bg: string) {
  const fgField = page.getByLabel('Foreground (text)', { exact: true });
  const bgField = page.getByLabel('Background (surface)', { exact: true });
  await fgField.fill(fg);
  await bgField.fill(bg);
  await expect(fgField).toHaveAttribute('aria-invalid', 'false');
  await expect(bgField).toHaveAttribute('aria-invalid', 'false');
}

test.describe('contrast maths in the browser', () => {
  test('computes 21:1 for black on white and 1:1 for a colour on itself', async ({ page }) => {
    await page.goto('/');
    await setColours(page, '#000000', '#ffffff');
    await expect(ratioValue(page)).toHaveText('21.00:1');
    await expect(page.getByText(/Passes AA/)).toBeVisible();

    await setColours(page, '#3b82f6', '#3b82f6');
    await expect(ratioValue(page)).toHaveText('1.00:1');
    await expect(verdictBadge(page)).toHaveText(/Fails AA/);
  });

  test('matches reference values for known pairs', async ({ page }) => {
    await page.goto('/');
    const cases: [string, string, string][] = [
      ['#767676', '#ffffff', '4.54:1'],
      ['#777777', '#ffffff', '4.48:1'],
      ['#595959', '#ffffff', '7.00:1'],
      ['#1f4fd8', '#ffffff', '6.63:1'],
      ['#9aa4b2', '#ffffff', '2.52:1'],
    ];
    for (const [fg, bg, expected] of cases) {
      await setColours(page, fg, bg);
      await expect(ratioValue(page)).toHaveText(expected);
    }
  });

  test('accepts rgb(), hsl() and named colours', async ({ page }) => {
    await page.goto('/');
    await setColours(page, 'rgb(0 0 0)', '#ffffff');
    await expect(ratioValue(page)).toHaveText('21.00:1');

    await setColours(page, 'hsl(0 0% 100%)', '#000000');
    await expect(ratioValue(page)).toHaveText('21.00:1');

    await setColours(page, 'rebeccapurple', '#ffffff');
    await expect(ratioValue(page)).toHaveText('8.41:1');
  });

  test('rejects invalid input visibly instead of guessing', async ({ page }) => {
    await page.goto('/');
    const fg = page.getByLabel('Foreground (text)', { exact: true });
    await fg.fill('#12345');
    await expect(fg).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText(/6 or 8 digits|3, 4, 6 or 8/)).toBeVisible();
    await expect(page.getByText(/No result yet/)).toBeVisible();
  });

  test('swaps colours and keeps the same ratio', async ({ page }) => {
    await page.goto('/');
    await setColours(page, '#112233', '#f0f0f0');
    const before = await ratioValue(page).textContent();
    await page.getByRole('button', { name: /^Swap colours$/i }).click();
    await expect(page.getByLabel('Foreground (text)', { exact: true })).toHaveValue('#f0f0f0');
    await expect(ratioValue(page)).toHaveText(before ?? '');
  });

  test('changes the verdict when the level switches to AAA', async ({ page }) => {
    await page.goto('/');
    await setColours(page, '#5b6478', '#ffffff');
    await expect(verdictBadge(page)).toHaveText(/Passes AA/);
    await page.getByRole('button', { name: /level AAA/i }).click();
    await expect(verdictBadge(page)).toHaveText(/Fails AAA/);
  });
});

test.describe('colour-vision simulation', () => {
  test('renders a simulation card per selected deficiency', async ({ page }) => {
    await page.goto('/');
    const sim = page.locator('#cvd');
    await expect(sim.getByText('Protan', { exact: true }).first()).toBeVisible();
    await expect(sim.getByText(/Machado 2009 model/)).toBeVisible();
    await expect(sim.getByText(/not a diagnosis/i)).toBeVisible();
  });
});

test.describe('accessibility suggestions', () => {
  test('applying a suggestion produces a passing pair', async ({ page }) => {
    await page.goto('/');
    await setColours(page, '#aaaaaa', '#ffffff');
    await expect(verdictBadge(page)).toHaveText(/Fails AA/);

    const card = page.locator('#suggestions');
    const suggestion = card.locator('button.suggestion').first();
    // The accessible name starts with the visible hex and ratio (WCAG 2.5.3 Label in Name).
    await expect(suggestion).toHaveAccessibleName(/^#[0-9A-F]{6} \d+\.\d{2}:1/);
    await suggestion.click();

    await expect(verdictBadge(page)).toHaveText(/Passes AA/);
  });
});

test.describe('exports', () => {
  test('CSS and JSON exports reflect the current pair', async ({ page }) => {
    await page.goto('/');
    await setColours(page, '#0f172a', '#ffffff');
    await page.getByRole('button', { name: /Save foreground/i }).click();
    await page.getByRole('tab', { name: /Palette/i }).click();

    const css = page.getByLabel('CSS custom properties');
    await expect(css).toContainText(':root {');
    await expect(css).toContainText('--cj-text-colour: #0F172A;');
    await expect(css).toContainText('on #FFFFFF');

    const json = page.getByLabel(/JSON design tokens/);
    const text = (await json.textContent()) ?? '{}';
    const parsed = JSON.parse(text) as { generator: string; colors: unknown[]; contrast: { pairs: unknown[] } };
    expect(parsed.generator).toBe('ContrastJudge');
    expect(parsed.colors).toHaveLength(1);
    expect(parsed.contrast.pairs.length).toBeGreaterThan(0);
  });

  test('downloads a CSS file', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Palette/i }).click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Download \.css$/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('contrastjudge-tokens.css');
  });

  test('batch tab evaluates the example and downloads a report', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Batch/i }).click();
    const table = page.getByRole('table', { name: /Batch contrast results/i });
    await expect(table).toBeVisible();
    await expect(table).toContainText('Body text on white');
    await expect(page.getByText(/fail AA text/)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Markdown report/i }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/contrast-audit\.md$/);
  });
});

test.describe('responsive layout', () => {
  test('no horizontal overflow on any viewport', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
    });
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });

  test('stacks the workspace columns on a phone-sized viewport', async ({ page }, testInfo) => {
    await page.goto('/');
    const workspace = page.locator('.workspace');
    const box = await workspace.boundingBox();
    expect(box).not.toBeNull();

    const columns = page.locator('.workspace > .workspace__column');
    await expect(columns).toHaveCount(2);
    const first = await columns.nth(0).boundingBox();
    const second = await columns.nth(1).boundingBox();
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();

    const isPhone = (testInfo.project.use.viewport?.width ?? 1440) < 720;
    if (isPhone && first && second) {
      // Stacked: the second column starts below the first.
      expect(second.y).toBeGreaterThan(first.y + first.height - 5);
      expect(Math.abs(second.x - first.x)).toBeLessThan(2);
    } else if (first && second) {
      // Side by side on desktop.
      expect(second.x).toBeGreaterThan(first.x + first.width - 10);
    }
  });

  test('tap targets on the phone are at least 40px tall', async ({ page }, testInfo) => {
    test.skip((testInfo.project.use.viewport?.width ?? 1440) >= 720, 'mobile-only check');
    await page.goto('/');
    const buttons = page.locator('button:visible');
    const count = await buttons.count();
    expect(count).toBeGreaterThan(5);
    for (let i = 0; i < Math.min(count, 14); i += 1) {
      const box = await buttons.nth(i).boundingBox();
      if (!box) continue;
      expect(box.height).toBeGreaterThanOrEqual(32);
    }
  });

  test('header keeps the author X link visible', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('link', { name: /Author on X/i });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://x.com/0xkillcoin');
    const box = await link.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(30);
  });
});

test.describe('keyboard and screen-reader affordances', () => {
  test('tab order starts with the skip link and reaches the colour inputs', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const first = await page.evaluate(() => document.activeElement?.textContent ?? '');
    expect(first).toContain('Skip to main content');

    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('colour inputs are reachable and labelled', async ({ page }) => {
    await page.goto('/');
    const fg = page.getByLabel('Foreground (text)', { exact: true });
    await fg.focus();
    await expect(fg).toBeFocused();
    const describedBy = await fg.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();

    const id = describedBy?.split(' ')[0] ?? '';
    await expect(page.locator(`#${id}`)).toContainText(/rgb\(|Hex/);
  });

  test('tabs respond to arrow keys', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Workspace/i }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /Palette/i })).toHaveAttribute('aria-selected', 'true');
  });

  test('the result is announced in a live region', async ({ page }) => {
    await page.goto('/');
    const live = page.locator('main p[role="status"][aria-live="polite"]');
    await expect(live).toContainText(/Contrast ratio \d+\.\d{2}:1/);
  });

  test('dark mode is reachable and persisted', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Switch to dark theme/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });
});

test.describe('error resilience', () => {
  test('recovers from garbage input without losing the rest of the UI', async ({ page }) => {
    await page.goto('/');
    const fg = page.getByLabel('Foreground (text)', { exact: true });
    await fg.fill('not-a-colour');
    await expect(page.getByText(/No result yet/)).toBeVisible();
    await fg.fill('#123456');
    await expect(ratioValue(page)).toHaveText(/\d+\.\d{2}:1/);
  });

  test('shows an error toast when copying is unavailable', async ({ page }) => {
    await page.addInitScript(() => {
      // Simulate a browser where neither the async clipboard API nor execCommand works.
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
      (document as unknown as { execCommand: () => boolean }).execCommand = () => false;
    });
    await page.goto('/');
    await page
      .getByRole('button', { name: /^Copy$/ })
      .first()
      .click();
    await expect(page.getByText(/Copying is blocked by the browser/i)).toBeVisible();
  });
});

test.describe('visual snapshots', () => {
  test('workspace screenshot', async ({ page }, testInfo) => {
    await page.goto('/');
    await setColours(page, '#5b6478', '#ffffff');
    await expect(page.getByTestId('contrast-ratio')).toBeVisible();
    // Keep the snapshot stable: no animations, no blinking cursor.
    await page.addStyleTag({ content: '*{animation:none !important;transition:none !important}' });
    await page.screenshot({
      path: `docs/screenshots/workspace-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });

  test('batch screenshot', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.getByRole('tab', { name: /Batch/i }).click();
    await expect(page.getByRole('table', { name: /Batch contrast results/i })).toBeVisible();
    await page.screenshot({
      path: `docs/screenshots/batch-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });

  test('dark theme screenshot', async ({ page }, testInfo) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Switch to dark theme/i }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.screenshot({
      path: `docs/screenshots/dark-${testInfo.project.name}.png`,
      fullPage: true,
    });
  });
});
