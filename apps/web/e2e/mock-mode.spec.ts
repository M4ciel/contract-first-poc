import { expect, test } from '@playwright/test';

// `VITE_USE_MOCKS=true` and no backend at all: the generated MSW handlers answer in the browser.
// booksV2 is on (VITE_FLAG_BOOKS_V2), so this is a frontend built against an alpha endpoint
// before the backend implements it.
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

test('shows the alpha v2 catalog when the booksV2 flag is on', async ({ page }) => {
  const v2Requests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/v2/books') v2Requests.push(request.url());
  });

  await page.goto('/');

  await expect(page.getByTestId('catalog-version')).toHaveText('Catalog v2 (alpha)');
  expect(v2Requests.length).toBeGreaterThan(0);
});
