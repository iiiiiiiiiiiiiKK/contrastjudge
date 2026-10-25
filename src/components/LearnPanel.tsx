import { useI18n } from '../i18n';
import { Card } from './Card';
import { BookIcon } from './Icons';

export function LearnPanel() {
  const { t } = useI18n();

  return (
    <div className="two-col">
      <Card id="learn" title={t('learn.methodTitle')} icon={<BookIcon />}>
        <div className="prose">
          <p>{t('learn.intro')}</p>

          <h3>{t('learn.step1Title')}</h3>
          <p>{t('learn.step1Body')}</p>
          <pre className="formula">{`if Csrgb <= 0.04045  ->  C = Csrgb / 12.92
else                 ->  C = ((Csrgb + 0.055) / 1.055) ^ 2.4`}</pre>
          <p className="small muted">{t('learn.step1Note')}</p>

          <h3>{t('learn.step2Title')}</h3>
          <pre className="formula">{`L = 0.2126 * R + 0.7152 * G + 0.0722 * B`}</pre>
          <p>{t('learn.step2Body')}</p>

          <h3>{t('learn.step3Title')}</h3>
          <pre className="formula">{`ratio = (L_lighter + 0.05) / (L_darker + 0.05)`}</pre>
          <p>{t('learn.step3Body')}</p>

          <h3>{t('learn.step4Title')}</h3>
          <ul>
            <li>{t('learn.step4AA')}</li>
            <li>{t('learn.step4AAA')}</li>
            <li>{t('learn.step4NonText')}</li>
          </ul>
          <p>{t('learn.step4Rounding')}</p>

          <h3>{t('learn.step5Title')}</h3>
          <p>{t('learn.step5Body')}</p>

          <h3>{t('learn.step6Title')}</h3>
          <ul>
            <li>{t('learn.step6Item1')}</li>
            <li>{t('learn.step6Item2')}</li>
            <li>{t('learn.step6Item3')}</li>
            <li>{t('learn.step6Item4')}</li>
            <li>{t('learn.step6Item5')}</li>
          </ul>

          <h3>{t('learn.step7Title')}</h3>
          <p>{t('learn.step7Body')}</p>
        </div>
      </Card>

      <div className="stack">
        <Card title={t('learn.limitsTitle')} icon={<BookIcon />}>
          <div className="prose">
            <p>{t('learn.limitsIntro')}</p>
            <ul>
              <li>{t('learn.limitsItem1')}</li>
              <li>{t('learn.limitsItem2')}</li>
              <li>{t('learn.limitsItem3')}</li>
              <li>{t('learn.limitsItem4')}</li>
            </ul>
            <p>{t('learn.limitsOutro')}</p>
          </div>
        </Card>

        <Card title={t('learn.refsTitle')} icon={<BookIcon />}>
          <div className="prose">
            <ul>
              <li>
                <a href="https://www.w3.org/TR/WCAG22/" target="_blank" rel="noopener noreferrer">
                  {t('learn.refWcag')}
                </a>
              </li>
              <li>
                <a
                  href="https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('learn.refUnderstanding')}
                </a>
              </li>
              <li>
                <a
                  href="https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('learn.refNonText')}
                </a>
              </li>
              <li>
                <a
                  href="https://www.w3.org/TR/WCAG22/#dfn-relative-luminance"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t('learn.refLuminance')}
                </a>
              </li>
              <li>{t('learn.refMachado')}</li>
              <li>
                <a href="https://www.w3.org/TR/css-color-4/" target="_blank" rel="noopener noreferrer">
                  {t('learn.refCss')}
                </a>
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
