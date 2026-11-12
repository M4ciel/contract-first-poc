# CI and compatibility

## TL;DR

Every pull request runs lint, generation, tests, mutation testing and **oasdiff `breaking`**
against the contract of the **exact base commit**. A breaking change in a `beta` or `stable`
operation fails CI; so does changing a published event.

## What pain it solves

"Does this change break anyone?" used to be answered by intuition in code review. Renaming a field
looks harmless in a diff; the breakage shows up later, in a client nobody in the review owned.

## How it works

`.github/workflows/ci.yml` runs on every pull request and every push to `main`, with every action
pinned by commit SHA:

| Job                  | Steps                                                                                                                                                          |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lint, test, contract | format, actionlint, Terraform format, contract lint, lint + typecheck + build, tests with the 80% global coverage floor, Stryker, **oasdiff**, changeset check |
| Web end-to-end       | Playwright against the stubbed API and against the backend-free mock mode                                                                                      |
| Local environment    | `docker compose` (MiniStack, Terraform, Flagsmith, the API) and the end-to-end smoke test                                                                      |

### oasdiff against the exact base commit

`contracts/tooling/compat/check-compatibility.sh` (`pnpm nx run contracts:compat`):

1. installs oasdiff 1.34.1, verifying its SHA-256 against `oasdiff.checksums` before running it;
2. takes the base commit from `BASE_SHA`: in CI `github.event.pull_request.base.sha`, or
   `github.event.before` on a push; locally the merge-base with `main`;
3. extracts the contract of that commit with `git archive` and bundles it the same way as HEAD;
4. runs `oasdiff breaking base head --fail-on ERR` for each API, with annotations on the pull
   request (`--format githubactions`);
5. fails when an API disappears, and when a file in `contracts/events/` changed or disappeared
   ([events are immutable](./10-events.md)).

It skips with an explicit message when there is no base (a push that creates a branch) or when the
base has no contract yet (the first contract commit).

**Why the exact base commit and not `main`:** while a pull request is open, `main` moves. Comparing
with the current `main` would blame the pull request for someone else's change, or miss its own
breaking change when `main` already contains a similar one.

oasdiff reads `x-stability-level`: breaking changes are allowed in `draft` and `alpha`, `beta` and
`stable` are protected, and lowering the level is itself an error
([stability and preview](./08-stability-and-preview.md)). One rule is lowered from error to info in
`oasdiff-severity.txt`: `response-property-enum-value-added`, because a new response enum value is
additive here (clients map it to `unknown`). Tests show that oasdiff alone would block it
([ADR 0012](./adr/0012-oasdiff-severity-for-new-enum-values.md)).

### Other checks

- **Global coverage** (`nx run @acme/tools:coverage`): adds up every Jest project's report and
  fails below 80% on any metric, or when a project has no report.
- **Clean clone** (`nx run @acme/tools:clean-clone`): clones HEAD into a temporary folder, rejects
  committed generated files, installs, generates, tests, and requires a clean working tree after.
- **Changeset check** (`nx run @acme/tools:changeset-check`): every published package affected by
  the change has a changeset ([versioning](./07-versioning-and-release.md)).

## Day-to-day usage

```bash
pnpm nx run contracts:compat                    # against the merge-base with main
BASE_SHA=<sha> pnpm nx run contracts:compat     # against a given commit
pnpm nx run @acme/tools:coverage
pnpm nx run @acme/tools:clean-clone
```

## Trade-offs

- CI takes about four minutes, most of it the local environment job. It runs in parallel with the
  others; on a larger repository it would run only when the infrastructure or the apps change.
- oasdiff knows OpenAPI, not your clients. Some changes it does not block are still risky (see the
  gaps in [compatibility rules](./09-compatibility-rules.md)).
- Downloading a binary at runtime is a supply-chain risk; the pinned version and checksum make it
  fail closed.
- **Golden rule:** never weaken the check to make a pull request pass. A breaking change goes to a
  new operation or to `/v2`.

## How to demonstrate

[Demo 4](../demos/04-breaking-change-blocked.sh) renames `author` to `writer` in `/v1` and shows
oasdiff failing with `response-required-property-removed`, then prints the right paths.

## Frequently asked questions

**What if the check is wrong?** Fix the contract or, if oasdiff really misjudges a case, raise it
as a reviewed change to `oasdiff-severity.txt` with tests that document why.

**Do I need to fetch the whole history?** CI uses `fetch-depth: 0` so the base commit is present;
the script fails with a clear message when it is not.
