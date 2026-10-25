import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { signIn } from './helpers';

test.beforeEach(async ({ page }) => {
  await signIn(page);
});

const themes = [
  ['Pearl Light', 'pearl', 'rgb(244, 246, 247)'],
  ['Graphite Dark', 'graphite', 'rgb(17, 22, 28)'],
  ['Midnight Blue', 'midnight', 'rgb(12, 18, 37)'],
];
async function chooseTheme(page: Page, name: string) {
  await page.getByRole('button', { name: 'Choose theme' }).click();
  await page.getByRole('menuitem', { name: new RegExp(name) }).click();
  await expect(page.getByRole('menu')).toBeHidden();
}

test('three complete themes persist across pages, refresh and mobile layouts', async ({ page }) => {
  await page.goto('/');
  for (const [name, id, background] of themes) {
    await chooseTheme(page, name);
    await expect(page.locator('html')).toHaveAttribute('data-theme', id);
    await expect(page.locator('body')).toHaveCSS('background-color', background);
    await expect(page.getByText('A little input. A clearer picture.')).toHaveCSS(
      'color',
      id === 'pearl' ? 'rgb(101, 120, 128)' : 'rgb(169, 181, 199)',
    );
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', id);
  }
  await page.getByRole('button', { name: 'Report', exact: true }).click();
  await expect(page.getByRole('tab')).toHaveCount(7);
  await expect(page.getByLabel('Grand total salary', { exact: true })).toHaveText('6,558.48');
  for (const [name, id] of themes) {
    await chooseTheme(page, name);
    await expect(page.locator('html')).toHaveAttribute('data-theme', id);
    await expect(page.getByLabel('Grand total salary', { exact: true })).toHaveText('6,558.48');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.getByRole('tab', { name: /Unnamed employee/ }).click();
  await expect(page.getByLabel('Grand total salary', { exact: true })).toHaveText('Unavailable');
  await page.reload();
  await expect(page.getByRole('tab')).toHaveCount(7);
  await expect(page.getByLabel('Grand total salary', { exact: true })).toHaveText('6,558.48');
  await page.getByRole('link', { name: 'Back to setup' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('uploaded payroll retains state and applies cutoff, holidays and CSV totals', async ({
  page,
}) => {
  await page.goto('/');
  const attendance =
    'No\tTMNo\tEnNo\tName GMNo\tMode\tDateTime\n1\t1\t1\tSANU MALlK 1\t0\t2026/10/01 09:00:00\n2\t1\t1\tSANU MALlK 1\t0\t2026/10/01 20:00:00\n3\t1\t1\tSANU MALlK 1\t0\t2026/10/03 09:00:00';
  await page.getByLabel('Monthly attendance', { exact: true }).setInputFiles({
    name: 'Attendance.TXT',
    mimeType: 'text/plain',
    buffer: Buffer.from(attendance),
  });
  await page.getByLabel('Salary list', { exact: true }).setInputFiles({
    name: 'Salary.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('SANU MALlK\t20800'),
  });
  await page.getByLabel(/^Office start time/).fill('09:00');
  await page.getByLabel(/^Office end time/).fill('18:00');
  await page.getByRole('spinbutton').fill('60');
  await page.getByLabel('Holiday date 1', { exact: true }).fill('2026-10-02');
  await page.getByRole('button', { name: 'Remove holiday row 2' }).click();
  await page.getByRole('button', { name: 'Report', exact: true }).click();
  await expect(page.getByLabel('Total salary', { exact: true })).toHaveText('800.00');
  await expect(page.getByLabel('Grand total salary', { exact: true })).toHaveText('4,154.85');
  await expect(page.getByRole('cell', { name: '20:00:00', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '8:00:00', exact: true })).toBeVisible();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloadPromise;
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv).toContain('4154.85');
  expect(csv).toContain('Incomplete punches');
  await page.getByRole('link', { name: 'Back to setup' }).click();
  await expect(page.getByLabel(/^Office end time/)).toHaveValue('18:00');
  await expect(page.getByRole('button', { name: 'Clear Salary list' })).toBeVisible();
  await page.getByLabel('Salary list', { exact: true }).setInputFiles({
    name: 'Salary.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('invalid salary'),
  });
  await page.getByRole('button', { name: 'Report', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Invalid salary row' })).toBeVisible();
});

test('theme selection still works if local storage is blocked', async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('blocked');
      },
    }),
  );
  await page.goto('/');
  await chooseTheme(page, 'Graphite Dark');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'graphite');
});
