import { test, expect } from '@playwright/test';

/** @brief Verify anonymous access and empty credentials against the real local API. */
test('empty and null credentials cannot establish a session', async ({ page, request }) => {
  await page.goto('/#/report');
  await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  let loginRequests = 0;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes(encodeURIComponent('/auth/login')))
      loginRequests++;
  });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  expect(
    await page
      .getByLabel(/^Email/)
      .evaluate((input: HTMLInputElement) => input.validity.valueMissing),
  ).toBe(true);
  expect(loginRequests).toBe(0);
  await expect(page).toHaveURL(/#\/login$/);

  const endpoint = '/api/index.php?route=';
  const session = await request.get(endpoint + encodeURIComponent('/auth/session'));
  const { csrfToken } = await session.json();
  for (const data of [
    {},
    { email: null, password: null },
    { email: '', password: '' },
    { email: 'admin@example.test', password: null },
    { email: 'admin@example.test', password: '' },
  ]) {
    const response = await request.post(endpoint + encodeURIComponent('/auth/login'), {
      headers: { 'X-CSRF-Token': csrfToken },
      data,
    });
    expect([401, 422]).toContain(response.status());
    expect(
      (await (await request.get(endpoint + encodeURIComponent('/auth/session'))).json()).user,
    ).toBeNull();
    expect((await request.get(endpoint + encodeURIComponent('/defaults'))).status()).toBe(401);
  }
});
