import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const attendance =
  'No\tTMNo\tEnNo\tName GMNo\tMode\tDateTime\n1\t1\t1\tTEST EMPLOYEE 1\t0\t2026/10/01 09:00:00\n2\t1\t1\tTEST EMPLOYEE 1\t0\t2026/10/01 20:00:00\n3\t1\t1\tTEST EMPLOYEE 1\t0\t2026/10/03 09:00:00';

/** @brief Verify the deployed static calculator when every API request is unavailable. */
test('standalone upload calculates holidays and exports CSV without login or API calls', async ({
  page,
}) => {
  const apiRequests: string[] = [];
  await page.route('**/api/**', (route) => {
    apiRequests.push(route.request().url());
    return route.abort();
  });
  await page.goto('/#/login');
  await expect(page.getByRole('button', { name: 'Report', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'midnight');
  await expect(page.getByRole('link', { name: 'Employees', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Report', exact: true }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'Upload an attendance text file' }),
  ).toBeVisible();
  await page.getByLabel('Monthly attendance', { exact: true }).setInputFiles({
    name: 'Attendance.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(attendance),
  });
  await page.getByLabel('Salary list', { exact: true }).setInputFiles({
    name: 'Salary.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('TEST EMPLOYEE\t20800'),
  });
  await page.getByLabel(/^Office start time/).fill('09:00');
  await page.getByLabel(/^Office end time/).fill('18:00');
  await page.getByRole('spinbutton').fill('60');
  await page.getByLabel('Holiday date 1', { exact: true }).fill('2026-10-02');
  await page.getByRole('button', { name: 'Remove holiday row 2' }).click();
  await page.getByRole('button', { name: 'Report', exact: true }).click();
  await expect(page.getByRole('tab')).toHaveCount(1);
  await expect(page.getByLabel('Total salary', { exact: true })).toHaveText('800.00');
  await expect(page.getByLabel('Grand total salary', { exact: true })).toHaveText('4,154.85');
  await expect(page.getByLabel('Leave pay 2026-10')).toContainText('670.97');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download', exact: true }).click();
  const download = await downloading;
  const csv = await readFile((await download.path())!, 'utf8');
  expect(csv).toContain('4154.85');
  expect(csv).toContain('Incomplete punches');
  await page.getByRole('link', { name: 'Back to setup' }).click();
  await expect(page.getByLabel(/^Office end time/)).toHaveValue('18:00');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Clear Monthly attendance' })).toHaveCount(0);
  expect(apiRequests).toEqual([]);
});

test('attendance and leave reports work without a salary upload', async ({ page }) => {
  await page.route('**/api/**', (route) => route.abort());
  await page.goto('/');
  await page.getByLabel('Monthly attendance', { exact: true }).setInputFiles({
    name: 'Attendance.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from(attendance),
  });
  await page.getByRole('button', { name: 'Report', exact: true }).click();
  await expect(page.getByRole('tab', { name: /TEST EMPLOYEE/ })).toBeVisible();
  await expect(page.getByText('Incomplete punches', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Grand total salary', { exact: true })).toHaveText('Unavailable');
});
