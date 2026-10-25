import { GitHubIcon, MoonIcon, SunIcon, XLogoIcon } from './Icons';
import type { ThemeMode } from '../hooks/useTheme';
import { useI18n } from '../i18n';

export const AUTHOR_X_URL = 'https://x.com/0xkillcoin';
export const AUTHOR_X_HANDLE = '@0xkillcoin';
export const REPO_URL = 'https://github.com/iiiiiiiiiiiiiKK/contrastjudge';

interface HeaderProps {
  readonly theme: ThemeMode;
  readonly onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  const { t, locale, toggleLocale } = useI18n();
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  // The visible label names the language you would switch *to*: "中文" while reading English.
  const nextLanguageLabel = t('header.languageShort');

  return (
    <header className="header">
      <div className="header__inner">
        {/* Not a link: the skip link already provides keyboard access, and a link here would need an
            accessible name that repeats the visible product name (WCAG 2.5.3). */}
        <div className="brand">
          <img className="brand__mark" src="./favicon.svg" alt="" width={38} height={38} />
          <span className="brand__text">
            <span className="brand__name">ContrastJudge</span>
            <span className="brand__tag">{t('header.tagline')}</span>
          </span>
        </div>

        <div className="header__spacer" />

        <div className="header__actions">
          <button
            type="button"
            className="lang-button"
            onClick={toggleLocale}
            lang={locale === 'en' ? 'zh-CN' : 'en'}
            // WCAG 2.5.3 (Label in Name): the accessible name must contain the visible label, so it
            // starts with it and then adds what activating the button does.
            aria-label={`${nextLanguageLabel} — ${t('header.language')}`}
            title={t('header.languageCurrent')}
          >
            {nextLanguageLabel}
          </button>
          <a
            className="x-link"
            href={AUTHOR_X_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('header.xLink', { handle: AUTHOR_X_HANDLE })}
          >
            <XLogoIcon />
            <span className="x-link__handle">{AUTHOR_X_HANDLE}</span>
          </a>
          <a
            className="icon-button icon-button--ghost"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('header.github')}
            title={t('header.github')}
          >
            <GitHubIcon />
          </a>
          <button
            type="button"
            className="icon-button"
            onClick={onToggleTheme}
            aria-label={t(nextTheme === 'dark' ? 'header.themeToDark' : 'header.themeToLight')}
            aria-pressed={theme === 'dark'}
            title={t(nextTheme === 'dark' ? 'header.themeToDark' : 'header.themeToLight')}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </div>
    </header>
  );
}
