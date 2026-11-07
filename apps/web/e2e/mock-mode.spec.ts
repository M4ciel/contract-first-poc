import { expect, test } from '@playwright/test';

// `VITE_USE_MOCKS=true` and no backend at all: the generated MSW handlers answer in the browser.
test('runs without a backend on the contract mocks', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Mock data')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Borrow / }).first()).toBeVisible();

  await page
    .getByRole('button', { name: /^Borrow / })
    .first()
    .click();

  await expect(
    page.getByRole('article', { name: 'Loan' }).getByTestId('loan-status'),
  ).toBeVisible();
});
