# Presentation script

About 40 minutes. Each slide has a title and the points to say; demos run from `demos/` (start the
environment before the session: `pnpm nx run @acme/infra:up`).

## 1. Current pains (4 min)

- The API lives in a YAML file in a wiki; every repository rewrites types, validation, clients and
  mocks.
- A rename in the backend becomes a production bug in a client nobody in the review owned.
- A new enum value crashes an app users have not updated in months; the old build cannot be fixed.
- The frontend waits for the backend, because there is nothing to call.
- "Does this break anyone?" is answered by intuition.

## 2. The proposal (4 min)

- The contract is the single source of truth: OpenAPI for HTTP, JSON Schema for events.
- Everything consumers wrote by hand is generated and published as versioned packages.
- Requests strict, responses tolerant: old clients survive additive changes.
- A machine answers "does this break anyone?" on every pull request, against the exact base commit.

## 3. Architecture (5 min)

- `contracts/` → lint → bundle → generation → packages → registry → apps
  ([overview diagram](./00-overview.md)).
- Two APIs with the same rules: the public library API and the internal inventory API (a Lambda).
- `@acme/domain`: shared rules with 100% mutation score; `@acme/events`: the event catalog.
- Runtime on emulated AWS, flags in Flagsmith through OpenFeature, one command to start.

## 4. Demos (12 min)

- **Demo 3, a new enum value:** add `lost` to `Loan.status`. CI passes; the app frozen on 1.0.0
  reads `unknown` and shows "Status unavailable"; without post-processing it throws `ZodError`.
- **Demo 4, a breaking change blocked:** rename `author` to `writer` in `/v1`. oasdiff fails on the
  pull request; the right paths are a new field plus deprecation, or `/v2`.
- **Demo 5, preview in alpha:** break `/v2/books` freely, publish a preview, show `npm dist-tag ls`:
  `latest` did not move.
- If there is time: demo 11 (flip a flag in the Flagsmith UI, the running backend follows) and
  demo 9 (100% coverage, a surviving mutant).

## 5. Agile flow (5 min)

- The contract is ready before the sprint: an `alpha` operation, reviewed as an API design.
- Front starts on day one on generated mocks; back implements behind a flag.
- Adjustments during the sprint are free in `alpha`; each one is a new preview.
- Promotion to `stable` is a pull request; from then on oasdiff protects the operation forever.
  ([sequence diagram](./08-stability-and-preview.md))

## 6. Trade-offs (4 min)

- Costs: a contract PR and a release before a field can be used; heavier CI; more tools.
- Mitigations: alpha + previews, Nx caching, one-command environment.
- Not worth it for a single-consumer internal API, prototypes, or very small teams.
  ([details](./12-agile-and-trade-offs.md))

## 7. Incremental adoption (4 min)

- Level 1: centralise the YAML and lint it. Level 2: publish generated types.
- Level 4 (oasdiff) is the first that protects clients; level 5 (tolerant responses) first if there
  is a mobile app.
- Each level delivers value alone; stop wherever it stops paying.
  ([table](./13-incremental-adoption.md))

## 8. Next steps (2 min)

- AsyncAPI for events, generators for other languages, contract tests against real responses, an
  outbox for events, `426 Upgrade Required` for a minimum app version.
  ([list](./next-steps.md))
- Questions: [FAQ](./14-faq-and-gotchas.md) covers the usual objections.
