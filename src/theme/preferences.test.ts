import test from 'node:test';
import assert from 'node:assert/strict';
import { readTheme, saveTheme } from './preferences.ts';

test('validates stored theme names and safely handles blocked browser storage', () => {
  assert.equal(readTheme({ getItem: () => 'midnight' }), 'midnight');
  assert.equal(readTheme({ getItem: () => 'pearl' }), 'pearl');
  assert.equal(readTheme({ getItem: () => 'graphite' }), 'graphite');
  assert.equal(readTheme({ getItem: () => null }), 'midnight');
  assert.equal(readTheme({ getItem: () => 'unknown' }), 'midnight');
  assert.equal(
    readTheme({
      getItem: () => {
        throw new Error('blocked');
      },
    }),
    'midnight',
  );
  assert.doesNotThrow(() =>
    saveTheme('graphite', {
      setItem: () => {
        throw new Error('blocked');
      },
    }),
  );
  const writes: string[] = [];
  saveTheme('graphite', {
    setItem: (key, value) => {
      writes.push(key, value);
    },
  });
  assert.deepEqual(writes, ['attendiq-theme', 'graphite']);
});
