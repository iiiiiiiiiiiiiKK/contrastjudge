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
import type { TabId } from './types';
import type { RGBA } from './lib/color';
import { rgbToHex, normalizeColor } from './lib/color';
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

const TABS: readonly { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'workspace', label: 'Workspace', icon: <SwapIcon /> },
  { id: 'palette', label: 'Palette', icon: <PaletteIcon /> },
  { id: 'batch', label: 'Batch', icon: <ListIcon /> },
  { id: 'learn', label: 'Method', icon: <BookIcon /> },
];

function toHexValue(color: RGBA): string {
  return rgbToHex(color, { alpha: normalizeColor(color).a < 1 }).toUpperCase();
}

function AppShell() {
  const { theme, toggle } = useTheme();
  const judge = useJudge();
  const { notify } = useToast();
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
        notify(`Copied ${label}.`);
      } else {
        notify(result.message, 'error');
      }
    },
    [notify],
  );

  // A polite live region announces the verdict; it is derived, not stored, so it cannot lag behind.
  const announcement = report
    ? `Contrast ratio ${report.displayRatio}. ${
        report.bestLevel === 'Fail AA' ? 'Fails AA for normal text.' : `Meets ${report.bestLevel}.`
      }`
    : 'Waiting for valid colours.';

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
    const button = document.getElementById(`tab-${next.id}`);
    button?.focus();
  };

  return (
    <div className="app">
      <SkipLink />
      <Header theme={theme} onToggleTheme={toggle} />

      <main className="app__main" id="main-content" tabIndex={-1}>
        <div className="hero">
          <div className="hero__copy">
            <h1>Judge colour contrast against WCAG 2.2 — without sending anything anywhere.</h1>
            <p>
              Type any CSS colour, get the exact ratio, see which success criteria it meets for body text, large text
              and UI components, simulate colour-vision deficiency, and export accessible alternatives. Every
              calculation runs locally in this tab.
            </p>
            <div className="hero__badges">
              <span className="pill pill--accent">WCAG 2.2 AA &amp; AAA</span>
              <span className="pill">SC 1.4.3 路 1.4.6 路 1.4.11</span>
              <span className="pill">100% local 路 no uploads</span>
              <span className="pill">Open source 路 MIT</span>
            </div>
          </div>
        </div>

        <div className="tabs" role="tablist" aria-label="ContrastJudge sections" onKeyDown={onTabKeyDown}>
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
              {tab.label}
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
                      Colours under test
                    </h2>
                    <span className="card__hint">Foreground on background</span>
                  </div>
                  <div className="card__body stack">
                    <ColorField
                      idPrefix="fg"
                      label="Foreground (text)"
                      role="The colour of the text or icon being judged"
                      value={state.foregroundInput}
                      parsed={foreground}
                      onChange={judge.setForegroundInput}
                      onCopy={
                        foreground.ok ? () => void handleCopy(toHexValue(foreground.color), 'foreground') : undefined
                      }
                    />

                    <div className="button-row" style={{ justifyContent: 'center' }}>
                      {/* The visible text is the accessible name: adding an aria-label with different
                          wording would break WCAG 2.5.3 (Label in Name). */}
                      <button type="button" className="button" onClick={judge.swap}>
                        <SwapIcon />
                        Swap colours
                      </button>
                      <button type="button" className="button" onClick={judge.randomize}>
                        <DiceIcon />
                        Random pair
                      </button>
                      <button type="button" className="button button--quiet" onClick={judge.reset}>
                        <TrashIcon />
                        Reset
                      </button>
                    </div>

                    <ColorField
                      idPrefix="bg"
                      label="Background (surface)"
                      role="What the text sits on — usually a card or button fill"
                      value={state.backgroundInput}
                      parsed={background}
                      onChange={judge.setBackgroundInput}
                      onCopy={
                        background.ok ? () => void handleCopy(toHexValue(background.color), 'background') : undefined
                      }
                    />

                    <details>
                      <summary className="small" style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                        Page background (for translucent colours)
                      </summary>
                      <div style={{ marginTop: '0.6rem' }}>
                        <ColorField
                          idPrefix="page"
                          label="Page background"
                          role="Used to flatten any alpha channel before measuring"
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
                          notify('Pair saved to history.');
                        }}
                        disabled={!foregroundColor || !backgroundColor}
                      >
                        Save to history
                      </button>
                      <button
                        type="button"
                        className="button"
                        onClick={() => {
                          if (!foregroundColor) {
                            notify('Fix the foreground colour first.', 'error');
                            return;
                          }
                          const added = judge.addPaletteColor('Text colour', foregroundColor);
                          if (added) notify('Foreground added to the palette.');
                          else notify('That colour is already in the palette.', 'info');
                        }}
                        disabled={!foregroundColor}
                      >
                        <PaletteIcon />
                        Save foreground
                      </button>
                      <button
                        type="button"
                        className="button"
                        onClick={() => {
                          if (!backgroundColor) {
                            notify('Fix the background colour first.', 'error');
                            return;
                          }
                          const added = judge.addPaletteColor('Surface colour', backgroundColor);
                          if (added) notify('Background added to the palette.');
                          else notify('That colour is already in the palette.', 'info');
                        }}
                        disabled={!backgroundColor}
                      >
                        <PaletteIcon />
                        Save background
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
                        Live preview
                      </h2>
                    </div>
                    <div className="card__body">
                      <div className="empty-state">
                        <LayersIcon />
                        <h3>Preview appears once both colours are valid</h3>
                        <p>
                          Enter a valid foreground and background to see real text, buttons and links rendered in that
                          pair, plus colour-vision simulations.
                        </p>
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
                  if (added) notify(`${role === 'text' ? 'Text' : 'Surface'} colour saved.`);
                  else notify('That colour is already in the palette.', 'info');
                }}
                onRemove={(id) => {
                  judge.removePaletteColor(id);
                  notify('Colour removed.');
                }}
                onRename={judge.renamePaletteColor}
                onUse={(entry, role) => {
                  judge.usePaletteColor(entry, role);
                  notify('Applied to the workspace.');
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
            ContrastJudge — MIT licensed. Built by{' '}
            <a href={AUTHOR_X_URL} target="_blank" rel="noopener noreferrer">
              {AUTHOR_X_HANDLE} on X
            </a>
            . No analytics, no accounts, no server.
          </span>
          <span className="footer__links">
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
              <GitHubIcon style={{ width: 14, height: 14, verticalAlign: '-2px', marginRight: 4 }} />
              GitHub
            </a>
            <a href="https://www.w3.org/TR/WCAG22/" target="_blank" rel="noopener noreferrer">
              WCAG 2.2
            </a>
            <a href="#main-content">Back to top</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  );
}
