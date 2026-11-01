import { test } from 'node:test';
import assert from 'node:assert/strict';
import { policyYears } from './client';

test('all years accepted by leave applications are selectable for review and policy settings', () => {
  const years = policyYears();
  assert.equal(years[0], 2000);
  assert.equal(years.at(-1), 2100);
  assert.ok(years.includes(2028));
  assert.equal(years.length, 101);
});
