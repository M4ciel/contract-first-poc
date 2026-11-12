# Live demos

One script per scenario of the presentation. Each one shows the change, runs the real checks and
**asserts the expected outcome**, so a demo that stops behaving as described fails instead of
surprising you on stage.

Demos that change files run in a **temporary git worktree** on a `demo/<name>` branch: your
working tree is never touched, and the worktree and branch are removed at the end (`KEEP=1` keeps
them to look around). They pause between steps when run in a terminal (`DEMO_NO_PAUSE=1` to skip).

| #   | Script                           | What it shows                                                                         | Needs      |
| --- | -------------------------------- | ------------------------------------------------------------------------------------- | ---------- |
| 1   | `01-convention-blocked.sh`       | `/books` without a version and `operationId: list_books`: Redocly fails               | —          |
| 2   | `02-additive-change.sh`          | optional `isbn` in `Book`: oasdiff passes, the old client and the web app work        | —          |
| 3   | `03-new-enum-value.sh`           | `lost` in `Loan.status`: an app on 1.0.0 reads `unknown`, raw Orval schemas break     | —          |
| 4   | `04-breaking-change-blocked.sh`  | `author` → `writer` in `/v1`: oasdiff fails, the right paths are shown                | —          |
| 5   | `05-preview-in-alpha.sh`         | breaking `/v2/books` (alpha) is allowed; a preview is published, `latest` stays       | `infra:up` |
| 6   | `06-promotion-and-protection.sh` | promote `/v2/books` to `stable`; then a breaking change and a downgrade both fail     | —          |
| 7   | `07-frontend-without-backend.sh` | the web app on generated MSW mocks, no backend (`--check` runs its Playwright test)   | —          |
| 8   | `08-strict-request.sh`           | `POST /v1/loans` with an extra field: 400 Problem Details pointing at it              | —          |
| 9   | `09-mutation-testing.sh`         | a test without the boundary keeps 100% coverage but a mutant survives                 | —          |
| 10  | `10-event-immutable.sh`          | changing `loan.created.v1` fails: a new shape is `loan.created.v2`                    | —          |
| 11  | `11-live-feature-flag.sh`        | `booksV2` switched in Flagsmith; the running backend follows without a restart        | `infra:up` |
| 12  | `12-developer-portal.sh`         | find the Library API in the portal: owner, consumers, install, reference; drift fails | —          |

```bash
bash demos/04-breaking-change-blocked.sh   # one demo, with pauses
bash demos/run-all.sh                      # all of them, as a check (5 and 11 need infra:up)
```

Each demo takes from a few seconds to about two minutes (the first run installs dependencies in
the worktree from the local pnpm store and builds the generated packages).
