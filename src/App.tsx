import { useCallback, useMemo } from 'react';
import { Header, AUTHOR_X_URL, AUTHOR_X_HANDLE, REPO_URL } from './components/Header';
import { SkipLink } from './components/Card';
import { ColorField } from './components/ColorField';
import { ResultCard } from './components/ResultCard';
import { PreviewCard } from './components/PreviewCard';
import { SuggestionsCard } from './components/SuggestionsCard';
import { CvdCard } from './components/CvdCard';
import { PaletteCard } from './components/PaletteCard';
import { ExportCard } from './components/ExportCard';
import { BatchPanel } from './components/BatchPanel';
import { LearnPanel } from './components/LearnPanel';
import { HistoryList } from './components/HistoryList';
import { ToastProvider } from './hooks/useToast';
import { useToast } from './hooks/toast-context';
import { useTheme } from './hooks/useTheme';
import { useJudge } from './hooks/useJudge';
import { I18nProvider, useI18n } from './i18n';
import type { TranslationKey } from './i18n';
import type { TabId } from './types';
import type { RGBA } from './lib/color';
import { normalizeColor, rgbToHex } from './lib/color';
import { copyText } from './lib/exports';
import { resolvePair } from './lib/wcag';
import {
  BookIcon,
  DiceIcon,
  GitHubIcon,
  LayersIcon,
  ListIcon,
  PaletteIcon,
  SwapIcon,
  TrashIcon,
} from './components/Icons';

const TABS: readonly { id: TabId; labelKey: TranslationKey; icon: React.ReactNode }[] = [
  { id: 'workspace', labelKey: 'tabs.workspace', icon: <SwapIcon /> },
  { id: 'palette', labelKey: 'tabs.palette', icon: <PaletteIcon /> },
  { id: 'batch', labelKey: 'tabs.batch', icon: <ListIcon /> },
  { id: 'learn', labelKey: 'tabs.method', icon: <BookIcon /> },
];

function toHexValue(color: RGBA): string {
  return rgbToHex(color, { alpha: normalizeColor(color).a < 1 }).toUpperCase();
}

function AppShell() {
  const { theme, toggle } = useTheme();
  const judge = useJudge();
  const { notify } = useToast();
  const { t } = useI18n();
  const {
    state,
    foreground,
    background,
    pageBackground,
    foregroundColor,
    backgroundColor,
    pageBackgroundColor,
    report,
  } = judge;

  const handleCopy = useCallback(
    async (text: string, label: string) => {
      const result = await copyText(text);
      if (result.ok) {
        notify(t('toast.copied', { label }));
      } else {
        notify(t('toast.copyFailed'), 'error');
      }
    },
    [notify, t],
  );

  // A polite live region announces the verdict; it is derived, not stored, so it cannot lag behind.
  const announcement = report
    ? report.bestLevel === 'Fail AA'
      ? t('result.liveAnnounceFails', { ratio: report.displayRatio })
      : t('result.liveAnnounceMeets', { ratio: report.displayRatio, level: report.bestLevel })
    : t('result.liveWaiting');

  const effective = useMemo(() => {
    if (!foregroundColor || !backgroundColor) return null;
    return resolvePair(foregroundColor, backgroundColor, pageBackgroundColor);
  }, [foregroundColor, backgroundColor, pageBackgroundColor]);

  const ratioText = report?.displayRatio ?? '—';
  const activeTabIndex = TABS.findIndex((tab) => tab.id === state.activeTab);

  const onTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const lastIndex = TABS.length - 1;
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = activeTabIndex === lastIndex ? 0 : activeTabIndex + 1;
    if (event.key === 'ArrowLeft') nextIndex = activeTabIndex === 0 ? lastIndex : activeTabIndex - 1;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = lastIndex;
    if (nextIndex === null) return;
    event.preventDefault();
    const next = TABS[nextIndex];
    if (!next) return;
    judge.setActiveTab(next.id);
    document.getElementById(`tab-${next.id}`)?.focus();
  };

  return (
    <div className="app">
      <SkipLink />
      <Header theme={theme} onToggleTheme={toggle} />

      <main className="app__main" id="main-content" tabIndex={-1}>
        <div className="hero">
          <div className="hero__copy">
            <h1>{t('hero.title')}</h1>
            <p>{t('hero.subtitle')}</p>
            <div className="hero__badges">
              <span className="pill pill--accent">{t('hero.badgeStandard')}</span>
              <span className="pill">{t('hero.badgeCriteria')}</span>
              <span className="pill">{t('hero.badgeLocal')}</span>
              <span className="pill">{t('hero.badgeOpenSource')}</span>
            </div>
          </div>
        </div>

        <div className="tabs" role="tablist" aria-label={t('tabs.label')} onKeyDown={onTabKeyDown}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              className="tab"
              role="tab"
              type="button"
              aria-selected={state.activeTab === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={state.activeTab === tab.id ? 0 : -1}
              onClick={() => judge.setActiveTab(tab.id)}
            >
              {tab.icon}
              {t(tab.labelKey)}
              {tab.id === 'palette' && state.palette.length > 0 ? (
                <span className="tab__count">{state.palette.length}</span>
              ) : null}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`panel-${state.activeTab}`} aria-labelledby={`tab-${state.activeTab}`} tabIndex={0}>
          {state.activeTab === 'workspace' ? (
            <div className="workspace">
              <div className="workspace__column">
                <section className="card" aria-labelledby="colours-heading">
                  <div className="card__header">
                    <h2 className="card__title" id="colours-heading">
                      {t('colours.title')}
                    </h2>
                    <span className="card__hint">{t('colours.hint')}</span>
                  </div>
                  <div className="card__body stack">
                    <ColorField
                      idPrefix="fg"
                      label={t('colours.fgLabel')}
                      role={t('colours.fgRole')}
                      value={state.foregroundInput}
                      parsed={foreground}
                      onChange={judge.setForegroundInput}
                      onCopy={
                        foreground.ok
                          ? () => void handleCopy(toHexValue(foreground.color), t('toast.copiedLabel.foreground'))
                          : undefined
                      }
                    />

                    <div className="button-row" style={{ justifyContent: 'center' }}>
                      {/* The visible text is the accessible name: adding an aria-label with different
                          wording would break WCAG 2.5.3 (Label in Name). */}
                      <button type="button" className="button" onClick={judge.swap}>
                        <SwapIcon />
                        {t('colours.swap')}
                      </button>
                      <button type="button" className="button" onClick={judge.randomize}>
                        <DiceIcon />
                        {t('colours.random')}
                      </button>
                      <button type="button" className="button button--quiet" onClick={judge.reset}>
                        <TrashIcon />
                        {t('colours.reset')}
                      </button>
                    </div>

                    <ColorField
                      idPrefix="bg"
                      label={t('colours.bgLabel')}
                      role={t('colours.bgRole')}
                      value={state.backgroundInput}
                      parsed={background}
                      onChange={judge.setBackgroundInput}
                      onCopy={
                        background.ok
                          ? () => void handleCopy(toHexValue(background.color), t('toast.copiedLabel.background'))
                          : undefined
                      }
                    />

                    <details>
                      <summary className="small" style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                        {t('colours.pageBgSummary')}
                      </summary>
                      <div style={{ marginTop: '0.6rem' }}>
                        <ColorField
                          idPrefix="page"
                          label={t('colours.pageBgLabel')}
                          role={t('colours.pageBgRole')}
                          value={state.pageBackgroundInput}
                          parsed={pageBackground}
                          onChange={judge.setPageBackgroundInput}
                        />
                      </div>
                    </details>

                    <div className="button-row">
                      <button
                        type="button"
                        className="button button--primary"
                        onClick={() => {
                          judge.recordHistory();
                          notify(t('toast.pairSaved'));
                        }}
                        disabled={!foregroundColor || !backgroundColor}
                      >
                        {t('colours.saveHistory')}
                      </button>
                      <button
                        type="button"
                        className="button"
                        onClick={() => {
                          if (!foregroundColor) {
                            notify(t('toast.fixForeground'), 'error');
                            return;
                          }
                          const added = judge.addPaletteColor(t('colours.textColourName'), foregroundColor);
                          notify(added ? t('toast.fgSaved') : t('toast.duplicate'), added ? 'success' : 'info');
                        }}
                        disabled={!foregroundColor}
                      >
                        <PaletteIcon />
                        {t('colours.saveForeground')}
                      </button>
                      <button
                        type="button"
                        className="button"
                        onClick={() => {
                          if (!backgroundColor) {
                            notify(t('toast.fixBackground'), 'error');
                            return;
                          }
                          const added = judge.addPaletteColor(t('colours.surfaceColourName'), backgroundColor);
                          notify(added ? t('toast.bgSaved') : t('toast.duplicate'), added ? 'success' : 'info');
                        }}
                        disabled={!backgroundColor}
                      >
                        <PaletteIcon />
                        {t('colours.saveBackground')}
                      </button>
                    </div>
                  </div>
                </section>

                {foregroundColor && backgroundColor ? (
                  <SuggestionsCard
                    foreground={foregroundColor}
                    background={backgroundColor}
                    target={state.targetRatio}
                    targetOptions={[3, 4.5, 7]}
                    onTargetChange={judge.setTargetRatio}
                    onApplyForeground={(color: RGBA) => judge.setForegroundInput(toHexValue(color))}
                    onApplyBackground={(color: RGBA) => judge.setBackgroundInput(toHexValue(color))}
                  />
                ) : null}

                <HistoryList history={state.history} onRestore={judge.restoreHistory} onClear={judge.clearHistory} />
              </div>

              <div className="workspace__column">
                <ResultCard
                  report={report}
                  level={state.level}
                  onLevelChange={judge.setLevel}
                  fontSizePx={state.preview.fontSizePx}
                  bold={state.preview.bold}
                  hasAlpha={Boolean(
                    (foreground.ok && foreground.color.a < 1) || (background.ok && background.color.a < 1),
                  )}
                />

                {foregroundColor && backgroundColor && effective ? (
                  <>
                    <PreviewCard
                      settings={state.preview}
                      onChange={judge.setPreview}
                      foreground={effective.foreground}
                      background={effective.background}
                      effectiveBackground={effective.background}
                      ratioText={ratioText}
                    />
                    <CvdCard
                      foreground={effective.foreground}
                      background={effective.background}
                      threshold={state.level === 'AAA' ? (report?.largeText ? 4.5 : 7) : report?.largeText ? 3 : 4.5}
                      selected={state.cvdTypes}
                      severity={state.cvdSeverity}
                      onToggle={judge.toggleCvdType}
                      onSeverityChange={judge.setCvdSeverity}
                    />
                  </>
                ) : (
                  <section className="card" aria-labelledby="preview-empty-heading">
                    <div className="card__header">
                      <h2 className="card__title" id="preview-empty-heading">
                        {t('preview.emptyHeading')}
                      </h2>
                    </div>
                    <div className="card__body">
                      <div className="empty-state">
                        <LayersIcon />
                        <h3>{t('preview.emptyTitle')}</h3>
                        <p>{t('preview.emptyBody')}</p>
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </div>
          ) : null}

          {state.activeTab === 'palette' ? (
            <div className="stack--lg stack">
              <PaletteCard
                palette={state.palette}
                foreground={foregroundColor}
                background={backgroundColor}
                pageBackground={pageBackgroundColor}
                onAdd={(name, color, role) => {
                  const added = judge.addPaletteColor(name, color);
                  notify(
                    added ? t(role === 'text' ? 'toast.savedText' : 'toast.savedSurface') : t('toast.duplicate'),
                    added ? 'success' : 'info',
                  );
                }}
                onRemove={(id) => {
                  judge.removePaletteColor(id);
                  notify(t('toast.removed'));
                }}
                onRename={judge.renamePaletteColor}
                onUse={(entry, role) => {
                  judge.usePaletteColor(entry, role);
                  notify(t('toast.applied'));
                }}
                onCopy={(text, label) => void handleCopy(text, label)}
              />
              <ExportCard
                palette={state.palette}
                foreground={foregroundColor}
                background={backgroundColor}
                pageBackground={pageBackgroundColor}
                onCopy={(text, label) => void handleCopy(text, label)}
                onNotify={notify}
              />
            </div>
          ) : null}

          {state.activeTab === 'batch' ? (
            <BatchPanel onCopy={(text, label) => void handleCopy(text, label)} onNotify={notify} />
          ) : null}

          {state.activeTab === 'learn' ? <LearnPanel /> : null}
        </div>

        <p className="visually-hidden" role="status" aria-live="polite">
          {announcement}
        </p>
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <span>
            {/* Split into prefix/suffix so the handle can be a real link without printing twice. */}
            {t('footer.licensePrefix')}{' '}
            <a href={AUTHOR_X_URL} target="_blank" rel="noopener noreferrer">
              {AUTHOR_X_HANDLE}
            </a>{' '}
            {t('footer.licenseSuffix')}
          </span>
          <span className="footer__links">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              <GitHubIcon style={{ width: 14, height: 14, verticalAlign: '-2px', marginRight: 4 }} />
              {t('footer.github')}
            </a>
            <a href="https://www.w3.org/TR/WCAG22/" target="_blank" rel="noopener noreferrer">
              {t('footer.wcag')}
            </a>
            <a href="#main-content">{t('common.backToTop')}</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </I18nProvider>
  );
}
