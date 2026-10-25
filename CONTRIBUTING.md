# Contributing to ContrastJudge

Thanks for considering a contribution. This project is deliberately small and strict about one
thing: the maths has to stay correct and independently verifiable.

## Ground rules

1. **No colour value may leave the browser.** ContrastJudge is local-first by design. A pull request
   that adds analytics, a remote API call, or a server-side calculation for user colours will be
   declined.
2. **The maths comes first.** Any change to `src/lib/wcag.ts` needs a test that fails before the
   change and passes after it. If you touch the luminance or contrast formula, explain the source in
   the pull request — cite the WCAG definition or the errata you are following.
3. **Do not round before comparing.** `4.499:1` must not meet `4.5:1`. Display rounding lives in
   `formatRatio` and nowhere else.
4. **Fail loudly.** Parsing an invalid colour must produce a typed error, never a silent fallback.
5. **Accessibility is a requirement, not a nice-to-have.** Every control needs a name, a visible
   focus state and a keyboard path. Colour must never be the only carrier of meaning.

## Getting started

```bash
npm ci
npm run dev        # http://localhost:5173/contrastjudge/
npm test           # unit tests (Vitest)
npm run test:e2e   # Playwright, desktop + iPhone viewport
npm run verify     # typecheck + lint + tests + build
```

The dev server honours the GitHub Pages base path, so the app lives at `/contrastjudge/` locally
too. Pass `VITE_BASE=/` if you want it at the root.

## What to work on

- Bugs in parsing or conversion: open an issue with the exact input string and the value you expect.
- New colour syntax support (for example `color(display-p3 …)`) is out of scope until WCAG itself
  defines how to evaluate non-sRGB spaces.
- Translations are welcome, but keep the English copy in `src/` as the source of truth.

## Before you open a pull request

```bash
npm run verify
npm run test:e2e
```

Both must pass. Include a short note about what you verified manually (viewport, browser, screen
reader if relevant).

## Commit style

Imperative subject line under 72 characters, for example:

```
Fix batch parser swallowing the label after " on "
```

Explain the _why_ in the body, not the _what_ — the diff already shows the what.

## Reporting security issues

Please do not open a public issue for a security problem. Email the maintainer listed in
`package.json` or open a private security advisory on GitHub.

## Licence

By contributing you agree that your work is licensed under the MIT licence in `LICENSE`.
