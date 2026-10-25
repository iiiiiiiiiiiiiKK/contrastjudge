import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { AUTHOR_X_HANDLE, AUTHOR_X_URL, REPO_URL } from '../src/components/Header';

/**
 * A single-character typo in the account name silently breaks every link in the README and the
 * "source on GitHub" button. These tests treat the repository URL as data and check that every
 * mention across the project agrees with it, so a copy-paste slip fails the build instead of
 * shipping a 404.
 */

const ROOT = path.resolve(__dirname, '..');

/** Every file that references the repository URL. */
const FILES_WITH_LINKS = [
  'README.md',
  'README.zh-CN.md',
  'CONTRIBUTING.md',
  'package.json',
  '.env.example',
  'index.html',
  'src/components/Header.tsx',
  '.github/workflows/ci.yml',
  '.github/workflows/deploy-pages.yml',
];

const REPO_SLUG = /github\.com\/([A-Za-z0-9-]+)\/(contrastjudge)/g;

describe('repository links', () => {
  it('exposes a well-formed repository URL', () => {
    expect(REPO_URL).toBe('https://github.com/iiiiiiiiiiiiiKK/contrastjudge');
    expect(REPO_URL).toMatch(/^https:\/\/github\.com\/[A-Za-z0-9-]+\/contrastjudge$/);
  });

  it('uses exactly one account slug everywhere it mentions the repository', () => {
    const owners = new Map<string, string[]>();
    for (const file of FILES_WITH_LINKS) {
      const full = path.join(ROOT, file);
      if (!fs.existsSync(full)) continue;
      const text = fs.readFileSync(full, 'utf8');
      for (const match of text.matchAll(REPO_SLUG)) {
        const owner = match[1];
        if (owner === undefined) continue;
        const list = owners.get(owner) ?? [];
        list.push(file);
        owners.set(owner, list);
      }
    }

    expect(owners.size, `conflicting account slugs: ${[...owners.keys()].join(', ')}`).toBe(1);
    const [owner] = [...owners.keys()];
    expect(owner).toBe('iiiiiiiiiiiiiKK');
    // The account name is 13 lowercase "i" characters followed by "KK".
    expect(owner).toHaveLength(15);
    expect(owner).toMatch(/^i{13}KK$/);
  });

  it('keeps the Pages host consistent with the account name', () => {
    // GitHub serves project sites from <account>.github.io, lower-cased.
    const expectedHost = 'iiiiiiiiiiiiiKK'.toLowerCase();
    for (const file of ['README.md', 'README.zh-CN.md']) {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      const hosts = [...text.matchAll(/https:\/\/([a-z0-9]+)\.github\.io\/contrastjudge\//gi)].map((m) =>
        (m[1] ?? '').toLowerCase(),
      );
      expect(hosts.length, `${file} should link to the live site`).toBeGreaterThan(0);
      for (const host of hosts) {
        expect(host, `${file} has a Pages host that does not match the account`).toBe(expectedHost);
      }
    }
  });

  it('points the author link at the documented X profile', () => {
    expect(AUTHOR_X_URL).toBe('https://x.com/0xkillcoin');
    expect(AUTHOR_X_HANDLE).toBe('@0xkillcoin');
    for (const file of ['README.md', 'README.zh-CN.md']) {
      const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
      expect(text).toContain('https://x.com/0xkillcoin');
    }
  });
});
