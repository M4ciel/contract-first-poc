# Stability and preview

## TL;DR

Every operation declares `x-stability-level`. New contracts are born `alpha`: they can change
freely, are published as **snapshot previews** (`0.2.0-preview-<datetime>`) under the `preview`
dist-tag, and stay behind a **feature flag** in production. Promoting to `stable` is a pull request;
from then on oasdiff protects the operation forever.

## What pain it solves

The main objection to contract-first: "it makes the flow rigid". The tech lead wants the contract
ready before the sprint, but it will change during implementation. Treated as stable, every
adjustment is a blocked breaking change. Published as a normal version, it leaks into production.

## How it works

1. **Levels**: `draft`, `alpha`, `beta`, `stable`, required by the lint on every operation.
2. **oasdiff understands them**, verified by tests that run the real binary
   (`contracts/scripts/compat/stability-levels.spec.ts`):

   | Change                                     | Result                              |
   | ------------------------------------------ | ----------------------------------- |
   | breaking change in `draft` or `alpha`      | allowed                             |
   | breaking change in `beta` or `stable`      | blocked                             |
   | `stable` → `beta` (lowering the level)     | blocked (`api-stability-decreased`) |
   | `alpha` → `stable` (promotion)             | allowed                             |
   | removing an `alpha` / a `stable` operation | allowed / blocked                   |

3. **Preview publishing** (`preview.yml`, `workflow_dispatch` on `main` only):
   - `changeset version --snapshot preview` turns pending changesets into versions such as
     `0.2.0-preview-20261108041557` (`useCalculatedVersion` + `{tag}-{datetime}`);
   - a **guard** fails the job if no `-preview-` version was produced. Without pending changesets
     nothing changes, and `publish` would push the normal version under the `preview` tag;
   - `changeset publish --tag preview --no-git-tag`: `latest` never moves, nothing is committed.
4. **Production protection lives in the consumers**: the backend hides `GET /v2/books` behind the
   `booksV2` flag (404, as if it did not exist), and the web app shows the v2 catalog only when the
   same flag is on ([feature flags](./16-feature-flags.md)).
5. **Promotion**: a pull request changes the level to `stable`, a normal release follows, and the
   flag is removed.

```mermaid
sequenceDiagram
  participant TL as Tech lead
  participant C as Contracts
  participant CI as CI (oasdiff)
  participant R as Registry
  participant Dev as Back and front
  TL->>C: PR: new operation, x-stability-level alpha, changeset
  C->>CI: lint, generation, tests, oasdiff
  CI-->>C: green (alpha may change)
  TL->>R: Preview → 0.2.0-preview-… (preview tag)
  Dev->>R: pnpm add @acme/api-client@preview
  Dev->>Dev: back behind a flag; front on generated MSW mocks
  TL->>C: adjustments during the sprint (allowed in alpha)
  TL->>R: new preview
  TL->>C: PR: promote to stable
  C->>CI: from now on oasdiff protects it
  TL->>R: Release → 0.2.0 (latest)
  Dev->>Dev: remove the flag, upgrade to the release
```

- The contract is ready **before** the sprint and unblocks back and front in parallel.
- The frontend starts on day one with generated mocks: `VITE_USE_MOCKS=true VITE_FLAG_BOOKS_V2=true`
  builds the v2 screen with no backend at all (the web app's mock-mode e2e test does exactly that).
- The contract review is an API design conversation, the cheapest moment to change a name.

**Snapshots, not pre mode** ([ADR 0005](./adr/0005-snapshot-instead-of-pre-mode.md)): Changesets'
pre mode puts the whole `main` in prerelease mode (`pre.json`), which conflicts with trunk-based
development. Snapshots are ephemeral and change nothing that is committed.

**Preview is not `/v2`.** A new endpoint can be born in `/v1` as `alpha`: adding an endpoint breaks
nobody. `/v2` is only for breaking something that is already `stable`.

## Day-to-day usage

```bash
pnpm nx run @acme/infra:up
PREVIEW_ONLY=1 bash infra/release-local.sh   # preview the changesets pending in HEAD
pnpm add @acme/api-client@preview            # in a consuming repository
```

## Trade-offs

- Consumers of a preview accept breakage; it must never reach production builds, which the feature
  flag guarantees on the runtime side.
- Snapshot versions sort below the release they precede (`0.2.0-preview-…` < `0.2.0`), so
  `latest` consumers are never upgraded to a preview by a caret range.
- Someone must remember to promote. An operation that stays `alpha` for months is a smell; the
  review of the contracts repository is the place to ask.

## How to demonstrate

- [Demo 5](../demos/05-preview-in-alpha.sh): a breaking change to `/v2/books` (alpha) passes, a
  preview is published, `latest` is untouched.
- [Demo 6](../demos/06-promotion-and-protection.sh): promote to `stable`; the same change now
  fails, and so does lowering the level to `beta`.

## Frequently asked questions

**Can I go back to `alpha` after a mistaken promotion?** Not on `main`: lowering the level is
blocked. Deprecate the operation and add a corrected one, which is exactly why operations should
stay `alpha` until real use proves them.
