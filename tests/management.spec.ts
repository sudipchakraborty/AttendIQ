import { test, expect } from '@playwright/test';
import { signIn } from './helpers';

test('employee and salary changes persist, reports follow managed IDs, archive/restore works', async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Employees', exact: true }).click();
  await page.getByRole('button', { name: 'Add employee', exact: true }).click();
  await page.getByLabel('Device employee ID').fill('99');
  await page.getByLabel(/^Employee name/).fill('Browser Employee');
  await page.getByRole('button', { name: 'Save employee' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Browser Employee' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('row').filter({ hasText: 'Browser Employee' })).toBeVisible();
  await page.getByRole('link', { name: 'Salaries', exact: true }).click();
  await page
    .getByRole('row')
    .filter({ hasText: 'Browser Employee' })
    .getByRole('button', { name: 'Modify salary' })
    .click();
  await page.getByLabel(/^Monthly base salary/).fill('12345.67');
  await page.getByRole('button', { name: 'Save salary' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Browser Employee' })).toContainText(
    '12,345.67',
  );
  await page.getByRole('link', { name: 'Employees', exact: true }).click();
  await page
    .getByRole('row')
    .filter({ hasText: 'Browser Employee' })
    .getByRole('button', { name: 'Edit', exact: true })
    .click();
  await page.getByLabel(/^Employee name/).fill('Browser Renamed');
  await page.getByRole('button', { name: 'Save employee' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Browser Renamed' })).toBeVisible();
  await page.getByRole('link', { name: 'Reports', exact: true }).click();
  await expect(page.getByRole('tab', { name: /Browser Renamed/ })).toBeVisible();
  await page.getByRole('tab', { name: /Browser Renamed/ }).click();
  await expect(page.getByRole('tabpanel')).toContainText('12,345.67');
  await page.getByRole('link', { name: 'Employees', exact: true }).click();
  await page
    .getByRole('row')
    .filter({ hasText: 'Browser Renamed' })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await page.getByRole('button', { name: 'Delete employee', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Browser Renamed' })).toHaveCount(0);
  await page.getByLabel('Show archived').check();
  await page
    .getByRole('row')
    .filter({ hasText: 'Browser Renamed' })
    .getByRole('button', { name: 'Restore' })
    .click();
  await expect(page.getByRole('row').filter({ hasText: 'Browser Renamed' })).toContainText(
    'Active',
  );
  await page
    .getByRole('row')
    .filter({ hasText: 'Browser Renamed' })
    .getByRole('button', { name: 'Delete', exact: true })
    .click();
  await page.getByRole('button', { name: 'Delete employee', exact: true }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Browser Renamed' })).toContainText(
    'Archived',
  );
});

test('Viewer and HR routes and sidebar follow server permissions; logout protects reports', async ({
  page,
}) => {
  await signIn(page, 'viewer');
  await expect(page.getByRole('link', { name: 'Employees', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Salaries', exact: true })).toHaveCount(0);
  await page.goto('/#/employees');
  await expect(page.getByRole('alert')).toContainText('does not have access');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await page.goto('/#/report');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  await page.goto('/#/login');
  await signIn(page, 'hr');
  await expect(page.getByRole('link', { name: 'Employees', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Users & roles', exact: true })).toHaveCount(0);
});

test('Admin user management creates roles and support submits to the local SMTP receiver', async ({
  page,
}) => {
  await signIn(page);
  await page.getByRole('link', { name: 'Users & roles', exact: true }).click();
  await page.getByRole('button', { name: 'Add user', exact: true }).click();
  await page.getByLabel(/^Name/).fill('Browser New Viewer');
  await page.getByLabel(/^Account email/).fill('newviewer@example.test');
  await page.getByLabel(/^Initial password/).fill('BrowserNew-Only-321!');
  await page.getByRole('button', { name: 'Save account' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Browser New Viewer' })).toContainText(
    'Viewer',
  );
  await page.getByRole('link', { name: 'Support', exact: true }).click();
  await page.getByLabel(/^Subject/).fill('Local test only');
  await page
    .getByLabel(/^Message/)
    .fill('This request must only be sent to the isolated local SMTP receiver.');
  await page.getByRole('button', { name: 'Submit request' }).click();
  await expect(page.getByRole('alert')).toContainText('mail server accepted');
  await expect(page.getByRole('alert')).toContainText('info@niyanti.com');
});
