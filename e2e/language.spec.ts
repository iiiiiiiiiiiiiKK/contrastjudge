import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * The language switch has to be complete and reversible: every visible string flips, the ratio is
 * unaffected, the choice survives a reload, and it works on a phone viewport too.
 */

const langButton = (page: Page, name: RegExp) => page.getByRole('button', { name });

/** The text input, not the colour-picker input that shares the same label prefix. */
const fgInput = (page: Page) => page.getByLabel('前景色（文字）', { exact: true });

test.describe('language switch', () => {
  test('is present in the header and flips the whole UI to Chinese', async ({ page }) => {
    await page.goto('/');
    await langButton(page, /Switch language to 简体中文/i).click();

    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/按 WCAG 2\.2 判定色彩对比度/);
    await expect(page.getByRole('tab', { name: /工作区/ })).toBeVisible();
    await expect(fgInput(page)).toBeVisible();
    await expect(page.getByRole('button', { name: '交换颜色' })).toBeVisible();
    await expect(page.getByText('对比度结果').first()).toBeVisible();
    await expect(page.getByText('无障碍替代色').first()).toBeVisible();
    await expect(page.getByText('色觉障碍模拟').first()).toBeVisible();
  });

  test('does not change the computed ratio', async ({ page }) => {
    await page.goto('/');
    const ratio = page.getByTestId('contrast-ratio');
    await expect(ratio).toHaveText('5.93:1');
    await langButton(page, /Switch language to 简体中文/i).click();
    await expect(ratio).toHaveText('5.93:1');
  });

  test('translates the change-a-colour advice and the threshold table', async ({ page }) => {
    await page.goto('/');
    await langButton(page, /Switch language to 简体中文/i).click();
    await fgInput(page).fill('#9aa4b2');
    await expect(page.getByText(/需要把对比度从/)).toBeVisible();
    await expect(page.getByText('正文（1.4.3 AA）')).toBeVisible();
    await expect(page.getByText('界面与图形（1.4.11 AA）')).toBeVisible();
  });

  test('reports invalid input in Chinese without inventing a colour', async ({ page }) => {
    await page.goto('/');
    await langButton(page, /Switch language to 简体中文/i).click();
    const fg = fgInput(page);
    await fg.fill('#12345');
    await expect(fg).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByText(/必须是 3、4、6 或 8 位/)).toBeVisible();
    await expect(page.getByText(/暂无结果/)).toBeVisible();
  });

  test('translates the batch report it downloads', async ({ page }) => {
    await page.goto('/');
    await langButton(page, /Switch language to 简体中文/i).click();
    await page.getByRole('tab', { name: /批量检查/ }).click();
    await expect(page.getByRole('table', { name: /批量对比度结果/ })).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Markdown 报告/ }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) chunks.push(chunk as Uint8Array);
    const markdown = Buffer.concat(chunks).toString('utf8');
    // The heading is the user-supplied report title; the prose around it must be Chinese.
    expect(markdown).toContain('# 设计系统审计');
    expect(markdown).toContain('阈值依据 WCAG 2.2');
    expect(markdown).toContain('并不意味着整个页面符合 WCAG');
    expect(markdown).toContain('| 组合 | 前景色 | 背景色 | 对比度 |');
  });

  test('persists the choice across a reload and still computes', async ({ page }) => {
    await page.goto('/');
    await langButton(page, /Switch language to 简体中文/i).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    await fgInput(page).fill('#000000');
    await expect(page.getByTestId('contrast-ratio')).toHaveText('21.00:1');
  });

  test('switches back to English and keeps working', async ({ page }) => {
    await page.goto('/');
    await langButton(page, /Switch language to 简体中文/i).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');

    await langButton(page, /切换到 English/i).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByRole('tab', { name: /Workspace/ })).toBeVisible();
    await page.getByLabel('Foreground (text)', { exact: true }).fill('#000000');
    await expect(page.getByTestId('contrast-ratio')).toHaveText('21.00:1');
  });

  test('the language button is a keyboard-reachable, labelled control', async ({ page }) => {
    await page.goto('/');
    const button = langButton(page, /Switch language to 简体中文/i);
    await button.focus();
    await expect(button).toBeFocused();
    const box = await button.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThan(30);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(32);
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
  });

  test('fits the phone header without overflow in both languages', async ({ page }, testInfo) => {
    test.skip((testInfo.project.use.viewport?.width ?? 1440) >= 720, 'mobile-only check');
    await page.goto('/');
    const overflowEn = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(overflowEn.scroll).toBeLessThanOrEqual(overflowEn.client + 1);

    await langButton(page, /Switch language to 简体中文/i).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN');
    const overflowZh = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(overflowZh.scroll).toBeLessThanOrEqual(overflowZh.client + 1);
    await expect(langButton(page, /切换到 English/i)).toBeVisible();
  });

  test('Chinese workspace screenshot for the docs', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop-chromium', 'one locale-neutral capture is enough');
    await page.goto('/');
    await langButton(page, /Switch language to 简体中文/i).click();
    await fgInput(page).fill('#5b6478');
    await expect(page.locator('.result__ratio-value')).toBeVisible();
    await page.addStyleTag({ content: '*{animation:none !important;transition:none !important}' });
    await page.screenshot({ path: 'docs/screenshots/workspace-zh.png', fullPage: true });
  });
});
