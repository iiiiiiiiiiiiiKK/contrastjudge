import { GitHubIcon, MoonIcon, SunIcon, XLogoIcon } from './Icons';
import type { ThemeMode } from '../hooks/useTheme';

export const AUTHOR_X_URL = 'https://x.com/0xkillcoin';
export const AUTHOR_X_HANDLE = '@0xkillcoin';
export const REPO_URL = 'https://github.com/iiiiiiiiiiiiiKK/contrastjudge';

interface HeaderProps {
  readonly theme: ThemeMode;
  readonly onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  return (
    <header className="header">
      <div className="header__inner">
        {/* Not a link: the skip link already provides keyboard access, and a link here would need an
            accessible name that repeats the visible product name (WCAG 2.5.3). */}
        <div className="brand">
          <img className="brand__mark" src="./favicon.svg" alt="" width={38} height={38} />
          <span className="brand__text">
            <span className="brand__name">ContrastJudge</span>
            <span className="brand__tag">WCAG 2.2 contrast checker</span>
          </span>
        </div>

        <div className="header__spacer" />

        <div className="header__actions">
          <a
            className="x-link"
            href={AUTHOR_X_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Author on X: ${AUTHOR_X_HANDLE} (opens in a new tab)`}
          >
            <XLogoIcon />
            <span className="x-link__handle">{AUTHOR_X_HANDLE}</span>
          </a>
          <a
            className="icon-button icon-button--ghost"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="View source on GitHub (opens in a new tab)"
            title="Source on GitHub"
          >
            <GitHubIcon />
          </a>
          <button
            type="button"
            className="icon-button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${nextTheme} theme`}
            aria-pressed={theme === 'dark'}
            title={`Switch to ${nextTheme} theme`}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}
