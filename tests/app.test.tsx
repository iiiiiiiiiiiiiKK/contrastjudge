import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';

function renderApp() {
  return {
    user: userEvent.setup(),
    ...render(<App />),
  };
}

const fgInput = () => screen.getByLabelText(/^Foreground \(text\)$/i);
const bgInput = () => screen.getByLabelText(/^Background \(surface\)$/i);

/** The headline ratio lives in the result panel; suggestion chips reuse the same text. */
const ratioInResult = () => screen.getByTestId('contrast-ratio');

describe('ContrastJudge app shell', () => {
  it('renders the headline, the author X link and the default ratio', () => {
    renderApp();
    expect(
      screen.getByRole('heading', { level: 1, name: /Judge colour contrast against WCAG 2\.2/i }),
    ).toBeInTheDocument();

    const xLink = screen.getByRole('link', { name: /Author on X/i });
    expect(xLink).toHaveAttribute('href', 'https://x.com/0xkillcoin');
    expect(xLink).toHaveAttribute('target', '_blank');
    expect(xLink).toHaveAttribute('rel', expect.stringContaining('noopener'));

    // Default pair #5b6478 on #ffffff is 5.93:1
    expect(ratioInResult()).toHaveTextContent('5.93:1');
  });

  it('exposes a skip link as the first focusable element', async () => {
    const { user } = renderApp();
    await user.tab();
    expect(document.activeElement).toHaveTextContent('Skip to main content');
  });

  it('announces the verdict through the result panel', () => {
    renderApp();
    const result = screen.getByRole('region', { name: /Contrast result/i });
    expect(result).toBeInTheDocument();
    expect(screen.getByText(/Passes AA/i)).toBeInTheDocument();
  });

  it('rejects invalid foreground input with a visible error and no silent conversion', async () => {
    const { user } = renderApp();
    const input = fgInput();
    await user.clear(input);
    await user.type(input, '#zzzzzz');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/not valid hexadecimal/i)).toBeInTheDocument();
    // The result panel drops out instead of showing a stale or guessed ratio.
    expect(screen.getByText(/No result yet/i)).toBeInTheDocument();
    expect(screen.getByText(/Preview appears once both colours are valid/i)).toBeInTheDocument();
  });

  it('swaps foreground and background', async () => {
    const { user } = renderApp();
    expect(fgInput()).toHaveValue('#5b6478');
    expect(bgInput()).toHaveValue('#ffffff');

    await user.click(screen.getByRole('button', { name: /^Swap colours$/i }));

    expect(fgInput()).toHaveValue('#ffffff');
    expect(bgInput()).toHaveValue('#5b6478');
    // Ratio is symmetric, so it must not change.
    expect(ratioInResult()).toHaveTextContent('5.93:1');
  });

  it('switches between AA and AAA thresholds', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: /level AAA/i }));
    expect(screen.getByRole('button', { name: /level AAA/i })).toHaveAttribute('aria-pressed', 'true');
    // 5.93:1 passes AA but fails AAA for normal text.
    expect(screen.getByText(/Fails AAA/i)).toBeInTheDocument();
  });

  it('accepts hsl() and rgb() input', async () => {
    const { user } = renderApp();
    const input = fgInput();
    await user.clear(input);
    await user.type(input, 'hsl(0 0% 0%)');
    expect(input).toHaveAttribute('aria-invalid', 'false');
    expect(ratioInResult()).toHaveTextContent('21.00:1');
  });

  it('shows large-text classification when the size crosses 24px', () => {
    renderApp();
    const size = screen.getByLabelText(/Font size/i);
    expect(size).toHaveValue('16');
    // jsdom does not implement range-input keyboard stepping, so drive the change event directly.
    fireEvent.change(size, { target: { value: '24' } });
    expect(size).toHaveValue('24');
    expect(screen.getAllByText(/large text/i).length).toBeGreaterThan(0);
  });

  it('generates accessible alternatives that reach the target ratio', async () => {
    const { user } = renderApp();
    const input = fgInput();
    await user.clear(input);
    await user.type(input, '#aaaaaa');

    // The chip's accessible name starts with its visible text (WCAG 2.5.3): hex, then the ratio.
    const suggestions = await screen.findAllByRole('button', { name: /^#[0-9A-F]{6} \d+\.\d{2}:1/ });
    expect(suggestions.length).toBeGreaterThan(0);
    for (const suggestion of suggestions.slice(0, 3)) {
      expect(suggestion).toHaveAccessibleName(/\d+\.\d{2}:1/);
      expect(suggestion).toHaveAccessibleName(/use as the (text|surface) colour/i);
    }
  });

  it('saves the pair to history and to the palette', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: /Save to history/i }));
    const history = screen.getByRole('heading', { name: /Recent checks/i }).closest('.card');
    expect(history).not.toBeNull();
    expect(within(history as HTMLElement).getByText(/#5B6478 on #FFFFFF/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Save foreground/i }));
    expect(await screen.findByText(/Foreground added to the palette/i)).toBeInTheDocument();
  });

  it('supports arrow-key navigation across tabs', async () => {
    const { user } = renderApp();
    const workspaceTab = screen.getByRole('tab', { name: /Workspace/i });
    workspaceTab.focus();
    await user.keyboard('{ArrowRight}');
    const paletteTab = screen.getByRole('tab', { name: /Palette/i });
    expect(paletteTab).toHaveAttribute('aria-selected', 'true');
    expect(paletteTab).toHaveFocus();

    await user.keyboard('{ArrowLeft}');
    expect(screen.getByRole('tab', { name: /Workspace/i })).toHaveAttribute('aria-selected', 'true');
  });

  it('toggles the theme and persists the choice', async () => {
    const { user } = renderApp();
    const toggle = screen.getByRole('button', { name: /Switch to dark theme/i });
    await user.click(toggle);
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe('dark'));
    expect(window.localStorage.getItem('contrastjudge:theme')).toBe('dark');
    expect(screen.getByRole('button', { name: /Switch to light theme/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders colour-vision simulation cards with disclaimers', async () => {
    const { user } = renderApp();
    expect(screen.getByRole('heading', { name: /Colour-vision simulation/i })).toBeInTheDocument();
    expect(screen.getByText(/Simulations are an approximation, not a diagnosis/i)).toBeInTheDocument();

    // Turning off every simulation leaves a hint instead of an empty grid.
    for (const label of [/^Protan$/i, /^Deutan$/i, /^Tritan$/i]) {
      await user.click(screen.getByRole('checkbox', { name: label }));
    }
    expect(screen.getByText(/Select at least one simulation/i)).toBeInTheDocument();
  });

  it('never claims WCAG conformance beyond the colour pair', () => {
    renderApp();
    expect(screen.getByText(/it is not a statement that a whole page conforms to WCAG 2\.2/i)).toBeInTheDocument();
  });
});

describe('palette, export and batch tabs', () => {
  it('adds a palette colour and exports matching CSS', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('button', { name: /Save foreground/i }));
    await user.click(screen.getByRole('tab', { name: /Palette/i }));

    const nameButton = await screen.findByRole('button', { name: /Rename Text colour/i });
    expect(nameButton).toHaveTextContent('Text colour');

    const cssBlock = screen.getByLabelText(/CSS custom properties/i);
    expect(cssBlock.textContent).toContain(':root {');
    expect(cssBlock.textContent).toContain('--cj-text-colour: #5B6478;');

    const jsonBlock = screen.getByLabelText(/JSON design tokens/i);
    const parsed = JSON.parse(jsonBlock.textContent ?? '{}');
    expect(parsed.generator).toBe('ContrastJudge');
    expect(parsed.colors).toHaveLength(1);
  });

  it('shows an empty state before any palette entry exists', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('tab', { name: /Palette/i }));
    expect(screen.getByText(/No saved colours yet/i)).toBeInTheDocument();
  });

  it('evaluates the batch example and reports failing rows', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('tab', { name: /Batch/i }));

    // Scope the query to the results table: the textarea also contains this label.
    const table = await screen.findByRole('table', { name: /Batch contrast results/i });
    expect(within(table).getByText(/Body text on white/i)).toBeInTheDocument();
    const rows = within(table).getAllByRole('row');
    // header + 4 example pairs
    expect(rows).toHaveLength(5);
    expect(within(table).getByText(/Muted caption/i)).toBeInTheDocument();
    expect(screen.getByText(/fail AA text/i)).toBeInTheDocument();
  });

  it('reports skipped lines in the batch input', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('tab', { name: /Batch/i }));
    const textarea = screen.getByLabelText(/Colour pairs/i);
    await user.clear(textarea);
    await user.type(textarea, '#fff on #000');
    await user.keyboard('{Enter}');
    await user.type(textarea, 'nonsense-line');
    expect(await screen.findByText(/1 line skipped/i)).toBeInTheDocument();
    expect(screen.getByText(/Could not find two colours/i)).toBeInTheDocument();
  });
});

describe('method tab', () => {
  it('documents the formulas and the scope limits', async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole('tab', { name: /Method/i }));
    expect(screen.getByRole('heading', { name: /Method & formulas/i })).toBeInTheDocument();
    expect(screen.getByText(/0\.2126 \* R \+ 0\.7152 \* G \+ 0\.0722 \* B/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /What this tool does not tell you/i })).toBeInTheDocument();
  });
});

describe('copy behaviour', () => {
  it('reports a copy failure instead of pretending success', async () => {
    const { user } = renderApp();
    // Prevent the clipboard API and the execCommand fallback from succeeding.
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    Object.defineProperty(document, 'execCommand', { value: vi.fn(() => false), configurable: true });

    const [copyButton] = screen.getAllByRole('button', { name: /^Copy$/i });
    expect(copyButton).toBeDefined();
    await user.click(copyButton as HTMLElement);
    expect(await screen.findByText(/Copying is blocked by the browser/i)).toBeInTheDocument();
  });
});
