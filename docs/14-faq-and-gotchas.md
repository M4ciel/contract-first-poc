# FAQ and gotchas

## TL;DR

The objections the team will raise, with honest answers, and every non-obvious problem we hit while
building this repository, so nobody has to rediscover them.

## What pain it solves

Most time lost on a setup like this goes to small surprises in the tooling. They are listed here
with the fix.

## How it works

### Objections

**"Doesn't this make everything slower?"**
A field now goes through a contract pull request and a release before the code that uses it. In
exchange, back and front start in parallel on day one, reviews happen before code, and deploys stop
breaking clients. During a sprint, `alpha` contracts and snapshot previews remove most of the wait
([stability and preview](./08-stability-and-preview.md)). For one-consumer internal APIs, skip it.

**"What if I need to change something urgently?"**
An additive change (new optional field, new endpoint) passes CI immediately and can be released in
minutes. A breaking change is never urgent in the sense that matters: it must go to a new operation
or `/v2` anyway, or it breaks clients in the field. A hotfix that changes no shape is a `patch`.

**"Why not generate directly in each repository?"**
Each repository would pin a different version of the contract without anyone seeing it, and the
generator configuration (and the tolerant post-processing) would be copied and drift. Publishing
packages makes the version explicit, reviewable and upgradable.

**"Why Zod and not just TypeScript types?"**
Types disappear at runtime. A response that does not match the contract becomes a wrong value
three screens later. Zod validates at the boundary, and it is what makes tolerance possible:
unknown enum values become `'unknown'` instead of an exception. Types are inferred from the same
schemas, so there is still one definition.

**"Why not GraphQL or tRPC?"**
tRPC requires TypeScript on both sides and couples clients to the server's code; it fits a
monorepo with one frontend, not public or multi-language APIs. GraphQL solves a different problem
(flexible queries) and brings its own (caching, N+1, a new server stack); it does not remove the
need for compatibility rules. OpenAPI over REST keeps the existing stack and tooling.

**"Who owns the contracts repository?"**
The team that owns the API owns its contract; changes to it are reviewed like any API design. In
practice a tech lead or staff engineer approves contract pull requests and triggers releases.
Consumers propose changes through pull requests too.

**"What about services in other languages?"**
The contract is still the source. Each language gets its own generator (openapi-generator,
oapi-codegen, kiota…), and oasdiff, the lint and the event JSON Schemas work for all of them.
Only the TypeScript packages and the post-processing are specific.

### Gotchas

**Toolchain**

- **Node version:** pnpm (through corepack) fails on an older Node. Run `nvm use` first; versions
  are pinned in `.nvmrc` and `package.json#engines`, and `engineStrict` refuses other versions.
- **pnpm build scripts** need approval (`allowBuilds` in `pnpm-workspace.yaml`), and `savePrefix: ''`
  makes `pnpm add` write exact versions. Peer dependencies of published packages use caret ranges.
- **Release age:** we only used versions published at least 14 days earlier (supply-chain
  hygiene). Exceptions are explicit (`minimumReleaseAgeExclude`). Docker images are pinned by digest;
  official base images are rebuilt often, so the rule applies to the Node version, not the rebuild.

**Generation**

- **Orval** writes extension-less relative imports: fine through tsdown and Vite, not for raw Node
  ESM.
- `coerce` only applies to per-operation validators (`client: 'zod'`), not to model schemas: hence
  the separate `*Validators` Orval projects.
- TanStack **mutation variables** (`{ data: CreateLoanRequest }`) look like responses. The
  post-processing requires both `data` and `status` to tell them apart.
- **Post-processing coupled to Orval:** when upgrading Orval, run the core tests and read the diff
  of the generated output.

**Tests**

- **Jest with native ESM:** `--experimental-vm-modules` on every test target, and no global `jest`
  object (`jest.fn` is undefined); tests use plain recording functions.
- **Stryker in a pnpm monorepo:** plugins must be listed explicitly (pnpm does not hoist them next
  to the core), and the sandbox breaks `extends: ../../tsconfig.base.json`; Stryker runs from the
  workspace root with `ignorePatterns` that keep only the root configs and the package.
- **Equivalent mutants:** disable them one by one with a reason, never lower the threshold.
- **MSW 3:** `onUnhandledRequest` became `onUnhandledFrame`; `msw init` asks a question unless run
  with `--no-save`; the worker file is served only in mock mode so it never ships.
- **Nx swallows `--verbose`** passed to Jest; the Nx cache is shared between git worktrees (fine,
  the inputs are the same).
- **Bash:** a `local status` in a helper hides a `status` variable of the caller from functions it
  runs (dynamic scoping). The demo helpers prefix their locals.

**Backend**

- **NestJS needs decorator metadata**, which esbuild does not emit: the API is built with `tsc`
  (then `tsc-alias` rewrites the path aliases). Constructor parameters with default values confuse
  dependency injection; use a factory provider.
- **Fastify adds `; charset=utf-8`** to `content-type`: assert with a pattern, not equality.
- **Path aliases vs npm scopes:** an alias named `@aws/*` collided with the real package
  `@aws/lambda-invoke-store`; aliases must not reuse a scope that exists on npm.
- **OpenFeature's registry is global:** each app instance registers its provider under its own
  domain, or tests share flags.
- **Flagsmith:** the official OpenFeature server provider depends on the deprecated
  `flagsmith-nodejs`, so this repository has a small provider over `@flagsmith/nodejs`. In the web
  app, wait for the provider before the first render or the screen switches versions after loading.

**Contracts and CI**

- **oasdiff and `x-stability-level`:** verified by tests with the real binary: `alpha` allows
  breaking changes, lowering a level is blocked.
- **oasdiff `--color`** is only accepted by text formats; CI uses `--format githubactions`.
- **First contract commit:** there is no base to compare with; the check skips with a message.
- **Snapshot without a changeset:** without the guard, the normal version would be published under
  the `preview` tag.
- **`workspace:*` on publish:** pnpm replaces it with the real version; `release-local` checks it
  from a consumer.
- **`changesets/action` v2** renamed its inputs (`version` → `version-script`, ...); actionlint does
  not know action input schemas, so only a run catches it.
- **The Version PR gets no CI:** pull requests created with `GITHUB_TOKEN` do not trigger workflows.

**Local environment**

- **Terraform on MiniStack:** dummy credentials and endpoints per service; the provider still asks
  STS for the account id (some ARNs need it), which MiniStack answers.
- **One-shot compose jobs are restarted, not recreated:** their `/tmp` survives, so the Terraform
  job clears it first.
- **Flagsmith's bootstrap** creates the admin without a password; the seed job sets an example one
  and fixed example keys, so nothing is configured by hand.

## Day-to-day usage

When something surprising happens, add it here in the same pull request that works around it.

## Trade-offs

A long gotcha list is a sign of a long tool chain. Each tool here earned its place; the
[ADRs](./adr/) say why.

## How to demonstrate

—

## Frequently asked questions

This page is the FAQ.
