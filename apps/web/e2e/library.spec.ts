import { getCreateLoanResponseMock, getListBooksResponseMock } from '@acme/api-client/mocks';
import { expect, test, type Page } from '@playwright/test';

const book = {
  id: '7c1e4b52-0000-4000-8000-000000000001',
  title: 'The Example Garden',
  author: 'A. Writer',
  publishedAt: '2001-04-01T00:00:00Z',
  createdAt: '2026-01-10T09:00:00Z',
};

const stubBooks = async (page: Page) => {
  await page.route('**/v1/books?*', (route) =>
    route.fulfill({ json: getListBooksResponseMock({ items: [book], nextCursor: null }) }),
  );
};

const stubCreateLoan = async (page: Page, status: number, body: unknown) => {
  await page.route('**/v1/loans', (route) =>
    route.fulfill({
      status,
      json: body,
      contentType: status < 400 ? 'application/json' : 'application/problem+json',
    }),
  );
};

test.beforeEach(async ({ page }) => {
  await stubBooks(page);
});

test('lists books and borrows one', async ({ page }) => {
  await stubCreateLoan(
    page,
    201,
    getCreateLoanResponseMock({
      bookId: book.id,
      status: 'active',
      startedAt: '2099-01-01T10:00:00Z',
      dueAt: '2099-01-15T10:00:00Z',
    }),
  );
  await page.goto('/');

  await page.getByRole('button', { name: `Borrow ${book.title}` }).click();

  const loan = page.getByRole('article', { name: 'Loan' });
  await expect(loan.getByTestId('loan-status')).toHaveText('On loan');
  await expect(loan).toContainText('Jan 15, 2099');
  await expect(loan).not.toContainText('Past due');
});

test('shows a status added after this build as a neutral badge and ignores new fields', async ({
  page,
}) => {
  await stubCreateLoan(page, 201, {
    ...getCreateLoanResponseMock({ bookId: book.id, dueAt: '2099-01-15T10:00:00Z' }),
    status: 'lost',
    renewals: 2,
  });
  await page.goto('/');

  await page.getByRole('button', { name: `Borrow ${book.title}` }).click();

  const badge = page.getByRole('article', { name: 'Loan' }).getByTestId('loan-status');
  await expect(badge).toHaveText('Status unavailable');
  await expect(badge).toHaveClass(/badge-neutral/);
});

test('warns that a loan is past due with the shared domain rule', async ({ page }) => {
  await stubCreateLoan(
    page,
    201,
    getCreateLoanResponseMock({
      bookId: book.id,
      status: 'active',
      startedAt: '2020-01-01T10:00:00Z',
      dueAt: '2020-01-15T10:00:00Z',
    }),
  );
  await page.goto('/');

  await page.getByRole('button', { name: `Borrow ${book.title}` }).click();

  await expect(page.getByRole('article', { name: 'Loan' })).toContainText('Past due');
});

test('explains a 409 book-unavailable problem', async ({ page }) => {
  await stubCreateLoan(page, 409, {
    type: 'urn:acme:problem:book-unavailable',
    title: 'Book unavailable',
    status: 409,
  });
  await page.goto('/');

  await page.getByRole('button', { name: `Borrow ${book.title}` }).click();

  await expect(page.getByRole('alert')).toContainText('No copy available');
});

test('falls back to the server title for a problem type added after this build', async ({
  page,
}) => {
  await page.route('**/v1/loans/*', (route) =>
    route.fulfill({
      status: 429,
      contentType: 'application/problem+json',
      json: { type: 'urn:acme:problem:rate-limited', title: 'Too many lookups', status: 429 },
    }),
  );
  await page.goto('/');

  await page.getByLabel('Find a loan').fill('3f0e8c1a-0000-4000-8000-000000000001');
  await page.getByRole('button', { name: 'Find' }).click();

  await expect(page.getByRole('alert')).toContainText('Too many lookups');
});
