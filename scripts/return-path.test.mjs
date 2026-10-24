import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transformSync } from 'esbuild';

const { code } = transformSync(readFileSync(new URL('../src/lib/return-path.ts', import.meta.url), 'utf8'), { loader: 'ts', format: 'esm' });
const { safeReturnPath, rememberReturnPath, takeReturnPath } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('only workspace, event registration and form paths can be followed', () => {
  for (const path of ['/workspace/dashboard', '/events/95bb1d92-a8e6-49ac-9bfe-0580582c5790/register', '/forms/556a25c0-af3c-46f6-96dd-9ede385bb692?r=sample']) assert.equal(safeReturnPath(path), path);
  for (const path of ['https://example.com', '//example.com', '/', '/events/example', '/forms/../../auth', null]) assert.equal(safeReturnPath(path), null);
});

test('a return path survives less than 30 minutes and is consumed once', () => {
  const items = new Map();
  globalThis.localStorage = { setItem: (k, v) => items.set(k, v), getItem: k => items.get(k) ?? null, removeItem: k => items.delete(k) };
  const now = Date.now;
  let clock = 100000;
  Date.now = () => clock;
  try {
    rememberReturnPath('/forms/example');
    clock += 30 * 60 * 1000 - 1;
    assert.equal(takeReturnPath(), '/forms/example');
    assert.equal(takeReturnPath(), null);
    rememberReturnPath('/events/example/register');
    clock += 30 * 60 * 1000;
    assert.equal(takeReturnPath(), null);
  } finally { Date.now = now; delete globalThis.localStorage; }
});