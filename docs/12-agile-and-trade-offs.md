# Agile and trade-offs

## TL;DR

Contract-first moves the API conversation to the start of the sprint and lets back and front work
in parallel. It costs a contract pull request and a release before a field can be used; stability
levels and previews keep that cost small. For an internal API with one consumer, it is not worth it.

## What pain it solves

Teams fear that a contract-first process makes them slower and more rigid. This page is the honest
answer: what improves, what costs more, and when to skip it.

## How it works

### Advantages

- **Parallel work from day one.** The contract exists before the code; the frontend builds on
  generated MSW mocks (`VITE_USE_MOCKS=true`) while the backend implements.
- **Review before code.** The contract pull request is an API design conversation, when changing a
  name costs nothing.
- **Deploy without fear.** Compatibility is checked by a machine on every pull request, against the
  exact base commit.
- **Changelogs for free.** Changesets turn each change's description into a changelog that other
  squads read.
- **Executable documentation.** The contract generates the client, the mocks and the API reference;
  a new engineer reads one source.

### Costs and mitigations

| Cost                                                                | Mitigation                                                            |
| ------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Longer cycle for small changes (contract PR, release, bump, code)   | Snapshot previews; `workspace:*` while developing inside the monorepo |
| Approval bottleneck on the contract owner                           | Stability levels: `alpha` gives freedom without risk                  |
| Rigidity: a bad name in `stable` lasts until the next major version | Be born `alpha`; promote only after real use                          |
| Heavier CI (generation, mutation, an environment)                   | Nx caching; mutation only on the small domain package; parallel jobs  |
| Coupling to Orval's output shape                                    | AST post-processing with full tests; Orval pinned                     |
| More moving parts locally (MiniStack, Flagsmith, Verdaccio)         | One command (`nx run @acme/infra:up`) and a smoke test                |

### When it is not worth it

- An internal API with a single consumer, deployed together with its backend.
- Throwaway prototypes.
- Very small teams where the release overhead outweighs the gain. Start with levels 1 and 2 of the
  [adoption model](./13-incremental-adoption.md) instead.

## Day-to-day usage

The flow during a sprint is in [stability and preview](./08-stability-and-preview.md).

## Trade-offs

This page is the trade-offs. The alternatives considered for each piece are in its own document
and in the [ADRs](./adr/).

## How to demonstrate

[Demo 7](../demos/07-frontend-without-backend.sh) shows the frontend running with the backend
off; [demo 5](../demos/05-preview-in-alpha.sh) shows an alpha contract changing freely.

## Frequently asked questions

See [FAQ and gotchas](./14-faq-and-gotchas.md): "Doesn't this make everything slower?" and "What
if I need to change something urgently?".
