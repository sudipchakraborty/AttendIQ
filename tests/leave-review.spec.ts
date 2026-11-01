import { test, expect } from '@playwright/test';

test('employees submit private leave; admin approves and changes allowances', async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  const cloudRequests: string[] = [];
  await page.route('**/api/**', (route) => {
    cloudRequests.push(route.request().url());
    return route.abort();
  });
  page.on('pageerror', (error) => errors.push(error.message));
  async function login(email: string) {
    await page.goto('/#/login');
    await page.getByLabel(/^Email/).fill(email);
    await page.getByLabel(/^Password/).fill('Review@2026!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  }
  await login('employee1@attendiq.local');
  await expect(page.getByRole('heading', { name: 'My leave' })).toBeVisible();
  await page.getByLabel('Year', { exact: true }).selectOption('2028');
  await expect(page.getByLabel('Year', { exact: true })).toHaveValue('2028');
  await expect(page.getByRole('link', { name: 'Admin Settings' })).toHaveCount(0);
  await page.getByLabel('Year', { exact: true }).selectOption('2026');
  await page.getByLabel('Leave type').selectOption('SL');
  await page.getByLabel('Start date').fill('2026-11-10');
  await page.getByLabel('Number of days').fill('2');
  await page.getByLabel('Reason (optional)').fill('Medical appointment and rest');
  await page.getByRole('button', { name: 'Submit application' }).click();
  await expect(page.getByText('Leave application submitted for approval.')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Pending', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('cell', { name: 'Pending', exact: true })).toBeVisible();
  const second = await browser.newContext();
  const other = await second.newPage();
  await other.goto('/#/login');
  await other.getByLabel(/^Email/).fill('employee2@attendiq.local');
  await other.getByLabel(/^Password/).fill('Review@2026!');
  await other.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(other.getByText('No leave applications yet')).toBeVisible();
  await other.goto('/#/admin/settings');
  await expect(other.getByText('Your role does not have access to this page.')).toBeVisible();
  await second.close();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await login('admin@attendiq.local');
  await page.getByRole('link', { name: 'Leave', exact: true }).click();
  await page.getByLabel('Year', { exact: true }).selectOption('2026');
  await expect(page.getByRole('cell', { name: /Aarav Sharma/ }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Approve leave for Aarav Sharma' }).click();
  await expect(page.getByRole('dialog', { name: 'Approve leave?' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm approval' }).click();
  await expect(page.getByRole('cell', { name: 'Approved', exact: true })).toBeVisible();
  await page.screenshot({ path: 'playwright-report/leave-admin-desktop.png', fullPage: true });
  await page.getByRole('link', { name: 'Admin Settings' }).click();
  await page.getByLabel('Duty start time').fill('09:00');
  await page.getByLabel('Duty end time').fill('18:00');
  await page.getByLabel('Tiffin start time').fill('13:00');
  await page.getByLabel('Tiffin end time').fill('13:45');
  await page.getByRole('button', { name: 'Save working hours' }).click();
  await expect(page.getByText('Duty and tiffin hours saved.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Duty start time')).toHaveValue('09:00');
  await expect(page.getByLabel('Duty end time')).toHaveValue('18:00');
  await expect(page.getByLabel('Tiffin start time')).toHaveValue('13:00');
  await expect(page.getByLabel('Tiffin end time')).toHaveValue('13:45');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: 'playwright-report/admin-hours-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: 'playwright-report/admin-hours-desktop.png', fullPage: true });
  await page.getByLabel('Policy year').selectOption('2028');
  await expect(page.getByLabel('SL allowance (days)')).toHaveValue('10');
  await page.getByLabel('Policy year').selectOption('2026');
  await page.getByLabel('SL allowance (days)').fill('12');
  await page.getByLabel('CL allowance (days)').fill('14');
  await page.getByRole('button', { name: 'Save leave settings' }).click();
  await expect(page.getByText('Leave settings saved for 2026.')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('SL allowance (days)')).toHaveValue('12');
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await login('employee1@attendiq.local');
  await expect(page.getByTestId('balance-SL')).toContainText('10');
  await expect(page.getByTestId('balance-SL')).toContainText('2 approved');
  await expect(page.getByRole('cell', { name: 'Approved', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('heading', { name: 'My leave' })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
  ).toBeTruthy();
  await page.screenshot({ path: 'playwright-report/leave-employee-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({ path: 'playwright-report/leave-employee-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
  expect(cloudRequests).toEqual([]);
});
