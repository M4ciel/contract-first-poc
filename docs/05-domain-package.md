# Domain package

## TL;DR

`@acme/domain` holds the business rules that more than one app needs, as pure functions, with 100%
coverage **and** a 100% mutation score enforced by Stryker. The backend and the frontend import the
same `isLoanOverdue`, so they cannot disagree about when a loan is overdue.

## What pain it solves

The same rule implemented three times behaves three ways. The backend says a book returned exactly
at the due instant is on time; the app shows it as overdue for that one second; the BFF rounds to
the day. Each implementation has tests, and each test passes.

## How it works

```ts
// contracts/packages/domain/src/loan.ts
export const calculateDueDate = (
  loanStartedAt: Date,
  policy: LoanPolicy = DEFAULT_LOAN_POLICY,
): Date => {
  assertValidDate(loanStartedAt, 'loanStartedAt');
  if (!Number.isInteger(policy.loanPeriodDays) || policy.loanPeriodDays < 1) {
    throw new RangeError('loanPeriodDays must be a positive integer');
  }
  return new Date(loanStartedAt.getTime() + policy.loanPeriodDays * MILLISECONDS_PER_DAY);
};

/** A loan is overdue only after its due instant: returning it exactly at `dueAt` is on time. */
export const isLoanOverdue = (dueAt: Date, now: Date): boolean => {
  assertValidDate(dueAt, 'dueAt');
  assertValidDate(now, 'now');
  return now.getTime() > dueAt.getTime();
};
```

- The backend computes `dueAt` with `calculateDueDate` when it creates a loan, and derives the
  `status` with `isLoanOverdue`.
- The web app shows "Past due" with the same `isLoanOverdue`.
- Days are fixed 24-hour periods on the UTC timeline, so the result does not depend on the
  server's or the browser's time zone.
- Pure: no I/O, no framework, no dependency. Module boundaries (ESLint) forbid the package from
  importing anything else in the repository.

### Why mutation testing

Coverage says a line **ran**; it does not say a test would notice if the line were wrong. Stryker
changes the code (`>` to `>=`, `true` to `false`, a string to `""`), runs the tests for each
change (a **mutant**) and requires at least one test to fail. A surviving mutant is a bug the tests
would let through.

`stryker.config.mjs` uses the Jest runner and the TypeScript checker, analyses coverage per test,
and has `thresholds: { high: 100, low: 100, break: 100 }`: one surviving mutant fails the build.
An **equivalent** mutant (a change that does not change behaviour) is disabled inline, where review
sees it:

```ts
// Stryker disable next-line EqualityOperator: <why this mutant cannot change behaviour>
```

There are none today.

## Day-to-day usage

```bash
pnpm nx run @acme/domain:test        # 16 tests, 100% coverage threshold
pnpm nx run @acme/domain:mutation    # Stryker; report in reports/mutation/domain/index.html
```

Add a rule here only when two apps need it. A rule used by one app belongs in that app.

## Trade-offs

- Mutation testing is slow on large code bases. Here it runs on one small package, so CI runs it on
  every pull request; on a larger package it would run only when the package changes (`nx
affected`).
- 100% is a deliberate bar for a tiny, critical package, not a recommendation for the whole code
  base; everything else has an 80% global coverage floor (`nx run @acme/tools:coverage`).
- Stryker needs some setup in a pnpm monorepo: plugins listed explicitly (pnpm does not hoist them)
  and a sandbox that keeps only the root configs and the package (see the FAQ).

## How to demonstrate

[Demo 9](../demos/09-mutation-testing.sh) deletes the two tests that check the exact due instant.
Coverage stays at 100%; Stryker reports a surviving `EqualityOperator` mutant (`>` became `>=`)
and fails.

## Frequently asked questions

**Why is it versioned independently?** It changes for business reasons, not because the API
changed; it has no reason to follow the contract's version.

**Could the backend just send `isOverdue`?** It does send `status`. The frontend still needs the
rule to show a countdown or to update a screen that stays open past the due instant.
