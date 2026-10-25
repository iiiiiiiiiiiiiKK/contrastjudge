import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

/**
 * The language switch must be a genuine, complete switch: every visible string flips, the document
 * language attribute follows, and the choice survives a reload.
 */
async function switchToChinese(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /切换到 English|Switch language/i }));
}

describe('language switch', () => {
  it('starts in English and exposes a Chinese toggle in the header', () => {
    render(<App />);
    expect(document.documentElement.lang).toBe('en');
    const toggle = screen.getByRole('button', { name: /Switch language to 简体中文/i });
    expect(toggle).toBeVisible();
    expect(toggle).toHaveTextContent('中文');
    expect(
      screen.getByRole('heading', { level: 1, name: /Judge colour contrast against WCAG 2\.2/i }),
    ).toBeInTheDocument();
  });

  it('switches the whole interface to Chinese', async () => {
    const user = userEvent.setup();
    render(<App />);
    await switchToChinese(user);

    await waitFor(() => expect(document.documentElement.lang).toBe('zh-CN'));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('按 WCAG 2.2 判定色彩对比度');
    expect(screen.getByRole('tab', { name: /工作区/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /调色板/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /批量检查/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /计算方法/ })).toBeInTheDocument();
    expect(screen.getByLabelText('前景色（文字）')).toBeInTheDocument();
    expect(screen.getByLabelText('背景色（表面）')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '交换颜色' })).toBeInTheDocument();
    expect(screen.getByText('通过 AA')).toBeInTheDocument();
    expect(screen.getByText(/跳到主要内容/)).toBeInTheDocument();
  });

  it('keeps the ratio itself identical across languages', async () => {
    const user = userEvent.setup();
    render(<App />);
    const before = screen.getByTestId('contrast-ratio').textContent;
    await switchToChinese(user);
    expect(screen.getByTestId('contrast-ratio').textContent).toBe(before);
    expect(before).toBe('5.93:1');
  });

  it('translates validation errors and keeps them descriptive', async () => {
    const user = userEvent.setup();
    render(<App />);
    await switchToChinese(user);
    const input = screen.getByLabelText('前景色（文字）');
    await user.clear(input);
    await user.type(input, '#zzzzzz');
    expect(screen.getByText(/不是合法的十六进制颜色/)).toBeInTheDocument();
    expect(screen.getByText(/暂无结果/)).toBeInTheDocument();
  });

  it('translates the batch tab labels, summary and issue rows', async () => {
    const user = userEvent.setup();
    render(<App />);
    await switchToChinese(user);
    await user.click(screen.getByRole('tab', { name: /批量检查/ }));

    const table = await screen.findByRole('table', { name: /批量对比度结果/ });
    expect(table).toBeInTheDocument();
    expect(within(table).getByText('白底正文')).toBeInTheDocument();
    // The summary chip and the AAA pill both mention AA, so scope the assertion to the pills row.
    expect(screen.getAllByText(/组正文不达 AA/).length).toBeGreaterThan(0);

    const textarea = screen.getByLabelText('颜色组合');
    await user.clear(textarea);
    await user.type(textarea, '#fff on #000');
    await user.keyboard('{Enter}');
    await user.type(textarea, 'nonsense');
    expect(await screen.findByText(/已跳过 1 行/)).toBeInTheDocument();
    expect(screen.getByText(/找不到两个颜色/)).toBeInTheDocument();
  });

  it('translates the method tab prose', async () => {
    const user = userEvent.setup();
    render(<App />);
    await switchToChinese(user);
    await user.click(screen.getByRole('tab', { name: /计算方法/ }));
    expect(screen.getByRole('heading', { name: /计算方法与公式/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /这个工具不能告诉你什么/ })).toBeInTheDocument();
  });

  it('persists the choice and restores it after a remount', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await switchToChinese(user);
    await waitFor(() => expect(document.documentElement.lang).toBe('zh-CN'));
    expect(window.localStorage.getItem('contrastjudge:locale')).toBe('zh');
    first.unmount();

    render(<App />);
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(screen.getByRole('tab', { name: /工作区/ })).toBeInTheDocument();
  });

  it('switches back to English', async () => {
    const user = userEvent.setup();
    render(<App />);
    await switchToChinese(user);
    await waitFor(() => expect(document.documentElement.lang).toBe('zh-CN'));

    await user.click(screen.getByRole('button', { name: /切换到 English/ }));
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
    expect(screen.getByRole('tab', { name: /Workspace/ })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Foreground \(text\)$/i)).toBeInTheDocument();
  });

  it('respects a browser that prefers Chinese on first load', () => {
    const original = navigator.languages;
    Object.defineProperty(navigator, 'languages', { value: ['zh-CN', 'en'], configurable: true });
    Object.defineProperty(navigator, 'language', { value: 'zh-CN', configurable: true });
    try {
      render(<App />);
      expect(screen.getByRole('tab', { name: /工作区/ })).toBeInTheDocument();
    } finally {
      Object.defineProperty(navigator, 'languages', { value: original, configurable: true });
      Object.defineProperty(navigator, 'language', { value: 'en-US', configurable: true });
    }
  });
});
