import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
export async function signIn(page: Page, role = 'admin') {
  await page.goto('/#/login');
  await page.getByLabel(/^Email/).fill(`${role}@example.test`);
  await page.getByLabel(/^Password/).fill('BrowserTest-Only-932!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Report', exact: true })).toBeVisible();
}
