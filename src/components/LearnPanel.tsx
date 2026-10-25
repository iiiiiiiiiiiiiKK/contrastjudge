import { Card } from './Card';
import { BookIcon } from './Icons';

export function LearnPanel() {
  return (
    <div className="two-col">
      <Card id="learn" title="Method & formulas" icon={<BookIcon />}>
        <div className="prose">
          <p>
            ContrastJudge implements the definitions from <strong>WCAG 2.2</strong> (W3C Recommendation, 12 December
            2024) directly. No library stands between your colour and the number you see.
          </p>

          <h3>1. Linearise each sRGB channel</h3>
          <p>
            Channel values are divided by 255 to get <code>Csrgb</code> in 0–1, then converted to light-linear values
            using the transfer function from IEC 61966-2-1:
          </p>
          <pre className="formula">{`if Csrgb <= 0.04045  ->  C = Csrgb / 12.92
else                 ->  C = ((Csrgb + 0.055) / 1.055) ^ 2.4`}</pre>
          <p className="small muted">
            Before May 2021 the WCAG definition used 0.03928. The W3C notes this has no practical effect on the
            calculations in the context of these guidelines; ContrastJudge uses the current 0.04045 knee.
          </p>

          <h3>2. Relative luminance</h3>
          <pre className="formula">{`L = 0.2126 * R + 0.7152 * G + 0.0722 * B`}</pre>
          <p>
            R, G and B are the linearised channels. L is 0 for black and 1 for white. Alpha is not part of the
            definition — translucent colours are flattened onto their backdrop first, which is why the tool asks for a
            page background.
          </p>

          <h3>3. Contrast ratio</h3>
          <pre className="formula">{`ratio = (L_lighter + 0.05) / (L_darker + 0.05)`}</pre>
          <p>
            L<sub>lighter</sub> is the higher of the two luminances. The result ranges from 1:1 (identical colours) to
            21:1 (black on white). Order does not matter: swapping foreground and background produces the same ratio.
          </p>

          <h3>4. Thresholds</h3>
          <ul>
            <li>
              <strong>SC 1.4.3 Contrast (Minimum), AA</strong> — 4.5:1 for text, 3:1 for large text.
            </li>
            <li>
              <strong>SC 1.4.6 Contrast (Enhanced), AAA</strong> — 7:1 for text, 4.5:1 for large text.
            </li>
            <li>
              <strong>SC 1.4.11 Non-text Contrast, AA</strong> — 3:1 for visual information required to identify UI
              components and their states, and for graphical objects needed to understand content.
            </li>
          </ul>
          <p>
            Comparisons use the <em>unrounded</em> ratio. A computed 4.499:1 does not meet 4.5:1, even though it
            displays as “4.50”. ContrastJudge therefore keeps full precision internally and only rounds for display;
            the exact value is shown in the result panel.
          </p>

          <h3>5. What counts as large text</h3>
          <p>
            WCAG defines large-scale text as at least <strong>18pt</strong>, or at least <strong>14pt bold</strong>.
            Because 1pt = 1.333px, that is <strong>24px</strong>, or <strong>18.66px</strong> when bold. Font size is
            taken as authored, not as the user may have zoomed it.
          </p>

          <h3>6. Edge cases handled</h3>
          <ul>
            <li>3-, 4-, 6- and 8-digit hex, both legacy comma syntax and modern space syntax for rgb()/hsl().</li>
            <li>Percentage channels, unitless alpha, percentage alpha, hue units deg/grad/rad/turn.</li>
            <li>
              Out-of-range channel values are rejected with an explanation instead of being clamped, because silently
              changing a colour would produce a confident but wrong ratio.
            </li>
            <li>Translucent foreground and background are composited (source-over) against the page background.</li>
            <li>
              Black-on-white and white-on-black both resolve to exactly 21:1; identical colours resolve to exactly
              1:1.
            </li>
          </ul>

          <h3>7. Colour-vision simulation</h3>
          <p>
            Simulations apply the 3×3 matrices published by Machado, Oliveira &amp; Fernandes (2009) in{' '}
            <em>A Physiologically-based Model for Simulation of Color Vision Deficiency</em> to linear-light RGB, with
            linear interpolation between the published 0.1 severity steps. Achromatopsia is modelled as perceived
            luminance greyscale. These are approximations for design review, not a medical assessment.
          </p>
        </div>
      </Card>

      <div className="stack">
        <Card title="What this tool does not tell you" icon={<BookIcon />}>
          <div className="prose">
            <p>
              Contrast is one success criterion out of dozens. A 21:1 pair can still sit on an inaccessible page. When
              a pair passes here, that is the full extent of the claim.
            </p>
            <ul>
              <li>
                No automated tool can decide whether text is “incidental”, decorative, or a logotype — the exemptions
                in SC 1.4.3 that only a human can judge.
              </li>
              <li>Images of text, charts and diagrams need their own review; a single ratio cannot describe them.</li>
              <li>
                Focus appearance (SC 2.4.13), target size (SC 2.5.8), reflow (SC 1.4.10) and every other criterion are
                outside the scope of a contrast calculator.
              </li>
              <li>
                Rendered contrast on real screens differs from computed contrast because of anti-aliasing, subpixel
                rendering and display gamma. Thin fonts look fainter than the maths suggests.
              </li>
            </ul>
            <p>
              Use this tool to remove contrast as a variable, then test the page itself with a keyboard, a screen
              reader and real users.
            </p>
          </div>
        </Card>

        <Card title="References" icon={<BookIcon />}>
          <div className="prose">
            <ul>
              <li>
                <a href="https://www.w3.org/TR/WCAG22/" target="_blank" rel="noopener noreferrer">
                  Web Content Accessibility Guidelines (WCAG) 2.2
                </a>{' '}
                — normative text, 12 December 2024.
              </li>
              <li>
                <a
                  href="https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Understanding SC 1.4.3 Contrast (Minimum)
                </a>{' '}
                — including the note that computed values must not be rounded before comparison.
              </li>
              <li>
                <a
                  href="https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Understanding SC 1.4.11 Non-text Contrast
                </a>
              </li>
              <li>
                <a
                  href="https://www.w3.org/TR/WCAG22/#dfn-relative-luminance"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WCAG 2.2 definition: relative luminance
                </a>
              </li>
              <li>
                Machado, G. M., Oliveira, M. M., &amp; Fernandes, L. A. F. (2009).{' '}
                <em>A Physiologically-based Model for Simulation of Color Vision Deficiency</em>. IEEE Transactions on
                Visualization and Computer Graphics, 15(6), 1291–1298.
              </li>
              <li>
                <a href="https://www.w3.org/TR/css-color-4/" target="_blank" rel="noopener noreferrer">
                  CSS Color Module Level 4
                </a>{' '}
                — named colours and colour syntax.
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
