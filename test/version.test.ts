// The CLI header, `--version` and the exported ENGINE_VERSION all read one constant, and that
// constant is hand-written — 0.1.3 shipped to npm announcing itself as 0.1.2 because the bump
// touched package.json and not src/index.ts. Assert the relationship, not the value.
import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { ENGINE_VERSION } from '../src/index.js';

test('version — ENGINE_VERSION matches package.json', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
    version: string;
  };
  assert.equal(
    ENGINE_VERSION,
    pkg.version,
    'bump src/index.ts ENGINE_VERSION together with package.json version',
  );
});
