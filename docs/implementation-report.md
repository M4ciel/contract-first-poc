# Implementation report

How the POC compares with the [specification](./spec.md): the acceptance criteria, what was
validated and where, what was never run, and every deliberate deviation with its reason.

State checked: `main` at the merge of the documentation step, from a fresh clone.

## Acceptance criteria (specification §12)

| Criterion                                                                                                         | Status | Evidence                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install && pnpm generate && pnpm test` work on a clean clone                                                | ✅     | Fresh clone: install (frozen lockfile), generate, then lint, test, typecheck and build for all 13 projects with no cache. Every CI job also starts from a fresh checkout.                                                  |
| `contract:lint` passes, and fails in the demo cases                                                               | ✅     | Passes on `main`; [demo 1](../demos/01-convention-blocked.sh) asserts that it fails.                                                                                                                                       |
| Global coverage ≥ 80%; `domain` 100% coverage and mutation score 100                                              | ✅     | Global 98.6% lines, 93.6% branches (every metric ≥ 80%). Domain: 100% coverage, mutation score 100 (26 mutants killed, 0 survived).                                                                                        |
| Post-processing tests cover the five required cases                                                               | ✅     | `contracts/scripts/apply-response-enum-fallback-core.spec.ts`: `strictObject`/`looseObject` replaced, enum without `'unknown'`, enum with `'unknown'`, enum with `.catch`, request schemas untouched (plus 12 more cases). |
| `ci.yml`, `changeset-version.yml`, `release.yml`, `preview.yml` present, actions pinned by SHA                    | ✅     | All four exist; every external `uses:` is pinned to a 40-character SHA; actionlint passes.                                                                                                                                 |
| `docker compose up` starts Verdaccio; a script publishes a release and a preview, showing both dist-tags          | ✅     | `pnpm nx run @acme/infra:release-local` (`latest` and `preview`, plus a consumer installing them); [demo 5](../demos/05-preview-in-alpha.sh).                                                                              |
| Each scenario in §14 has a script in `demos/` and a step by step in the docs                                      | ✅     | Demos 1–9 as specified, plus 10 (event immutability) and 11 (live feature flag). Each asserts its outcome; `bash demos/run-all.sh`: 11/11. Each is linked from the "How to demonstrate" section of its document.           |
| No generated file committed; `.gitignore` covers `src/generated/`, `artifacts/`, `dist/`, `coverage/`, `reports/` | ✅     | All five patterns ignored; `git ls-files` lists none of them.                                                                                                                                                              |
| No personal data, company name or real domain                                                                     | ✅     | Example values only (`example.test`, `acme`, fixed example keys); a scan for e-mail addresses and internal-looking URLs finds nothing outside the lockfile.                                                                |

## What was validated, and where

| Check                                                                      | Locally | In CI (every pull request)                |
| -------------------------------------------------------------------------- | ------- | ----------------------------------------- |
| Format, ESLint (module boundaries, no `../` imports), typecheck, build     | ✅      | ✅                                        |
| Unit and integration tests, coverage floor                                 | ✅      | ✅                                        |
| Domain mutation testing (Stryker, break threshold 100)                     | ✅      | ✅                                        |
| Redocly lint, oasdiff against the base commit, event immutability          | ✅      | ✅                                        |
| Changeset check (contract paths mapped to packages)                        | ✅      | ✅                                        |
| Clean-clone check (`tools/src/clean-clone.sh`)                             | ✅      | — (each job starts from a fresh checkout) |
| Web end-to-end (Playwright)                                                | ✅      | ✅                                        |
| Local environment: MiniStack + Terraform + Flagsmith + backend, smoke test | ✅      | ✅                                        |
| actionlint on the workflows                                                | ✅      | ✅                                        |
| Live demos (`demos/run-all.sh`)                                            | ✅      | —                                         |
| Local release and preview to Verdaccio (`release-local`)                   | ✅      | —                                         |
| API reference portal renders (headless Chromium, no console errors)        | ✅      | —                                         |
| `changeset-version.yml` opens the Version PR                               | —       | ✅ (PR #18 is open)                       |

## What was never run

- **`release.yml` and `preview.yml`.** Both are manual (`workflow_dispatch`) and publishing needs an
  explicit request. Their steps are the same commands as `release-local`, which runs locally, and
  both pass actionlint, but the workflows themselves have never been triggered.
- **A real private registry.** Without the `NPM_REGISTRY_URL` variable the workflows publish to a
  Verdaccio service container; the path with a real registry and `NPM_TOKEN` is untested.
- **Real AWS.** Everything AWS runs on MiniStack, where IAM is not enforced. The Terraform has never
  been applied to a real account.
- **CI on the Version PR.** Pull requests opened with `GITHUB_TOKEN` trigger no workflows (see
  [next steps](./next-steps.md)).

## Deviations from the specification

| Specification                                 | Implementation                                                                                                                              | Reason                                                                                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| pnpm workspaces only                          | Nx on top of pnpm workspaces                                                                                                                | Matches the team's stack; affected runs, caching and module boundaries ([ADR 0010](./adr/0010-nx-nestjs-jest-stack.md)).                                      |
| `apps/api` on Fastify or Hono, in memory      | NestJS 11 on Fastify, with DynamoDB (in memory in tests)                                                                                    | Team stack ([ADR 0010](./adr/0010-nx-nestjs-jest-stack.md)); a real store shows the contracts surviving real infrastructure.                                  |
| Vitest                                        | Jest 30 (ESM)                                                                                                                               | Team stack ([ADR 0010](./adr/0010-nx-nestjs-jest-stack.md)).                                                                                                  |
| Docs and presentation in Brazilian Portuguese | English                                                                                                                                     | Public repository, every other file in English ([ADR 0008](./adr/0008-english-only-repository.md)).                                                           |
| One OpenAPI file at `contracts/openapi.yaml`  | Two APIs: `contracts/apis/library` (public) and `contracts/apis/inventory` (internal), errors in `contracts/shared/`                        | Service-to-service compatibility is where contracts matter most ([ADR 0007](./adr/0007-inventory-as-a-separate-service.md)).                                  |
| Three published packages                      | Five: plus `@acme/inventory-client` and `@acme/events`                                                                                      | The inventory API needs its own client; events got a generated package from the catalog.                                                                      |
| Backend only, no infrastructure               | Inventory Lambda (API Gateway, DynamoDB), notifications Lambda (EventBridge → SQS), on MiniStack with Terraform and Docker Compose          | Shows the contracts between real services ([ADR 0006](./adr/0006-emulated-aws-with-ministack.md), [ADR 0007](./adr/0007-inventory-as-a-separate-service.md)). |
| `FEATURE_BOOKS_V2=true` environment flag      | Flagsmith (self-hosted, with a UI) through OpenFeature, in the backend and the web app; `FEATURE_*` still works for tests                   | A flag that changes at runtime; vendor-neutral ([ADR 0009](./adr/0009-flagsmith-through-openfeature.md)). AWS AppConfig was implemented first and replaced.   |
| —                                             | Our own OpenFeature `FlagsmithProvider` on the server                                                                                       | The official one depends on the deprecated `flagsmith-nodejs` ([ADR 0009](./adr/0009-flagsmith-through-openfeature.md)).                                      |
| oasdiff `breaking` as is                      | `oasdiff-severity.txt` lowers `response-property-enum-value-added` to info                                                                  | Tolerant responses make a new response enum value safe; this is demo 3's point ([ADR 0012](./adr/0012-oasdiff-severity-for-new-enum-values.md)).              |
| Generic Problem Details                       | A catalog of `urn:acme:problem:*` types with field-level errors; `about:blank` for framework errors outside the contract (415, for example) | One documented meaning per type ([ADR 0011](./adr/0011-problem-type-catalog.md)); RFC 9457's default for errors the contract does not describe.               |
| Separate Zod output in the packages           | Extra `validators` Orval projects (`@acme/api-types/validators`, `@acme/inventory-client/validators`)                                       | The backend validates requests strictly with them while consumers get tolerant responses.                                                                     |
| Exact versions everywhere                     | Exact everywhere except `peerDependencies` of published packages (ranges such as `^4.6.7`)                                                  | An exact peer version would force every consumer to that exact release.                                                                                       |
| —                                             | Folder aliases (`@config/*`, `@problems/*`, …) and no `../` imports, enforced by ESLint                                                     | Readable imports that survive moves.                                                                                                                          |
| —                                             | Extra checks: changeset-check, event immutability, coverage required for every Jest project, clean clone, actionlint, Terraform format      | Each closes a gap found while building; see [FAQ and gotchas](./14-faq-and-gotchas.md).                                                                       |
| Next step: documentation portal               | Already built (`pnpm nx run contracts:reference`, Scalar)                                                                                   | Cheap once the bundles exist.                                                                                                                                 |

## Known gaps

oasdiff does not flag three changes that matter here (details in
[compatibility rules](./09-compatibility-rules.md)): removing an optional response field, removing an
optional request field (a 400 for old clients, because requests are strict), and changing a field's
meaning. Review and the stability levels cover them; the tooling does not.
