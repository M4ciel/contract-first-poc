# Incremental adoption

## TL;DR

Nobody has to adopt everything at once. Each level below delivers value on its own, and the team
can stop at any of them. Most teams get most of the value from levels 1 to 4.

## What pain it solves

"Rewrite everything around contracts" is never approved. "Put the YAML in one place and lint it"
is a one-day task that already stops the worst drift.

## How it works

| Level | What is adopted                                             | Pain it solves                        | In this repository                                |
| ----- | ----------------------------------------------------------- | ------------------------------------- | ------------------------------------------------- |
| 0     | YAML as documentation; each repository writes its schemas   | (the starting point)                  | —                                                 |
| 1     | YAML centralised in one repository + **Redocly lint** in CI | Conventions become rules              | `contracts/apis`, `redocly.yaml`                  |
| 2     | **Types and Zod generated**, published as a package         | No more drift and duplication         | `@acme/api-types`                                 |
| 3     | Generated **client + MSW mocks**                            | Frontend unblocked from the backend   | `@acme/api-client`, `/mocks`, web mock mode       |
| 4     | **oasdiff** against the base commit                         | No more silent breakage               | `contracts:compat`                                |
| 5     | Tolerant responses + `unknown` fallback                     | Old clients survive additive changes  | AST post-processing, `apps/legacy-client`         |
| 6     | **Changesets** + controlled manual release                  | Reliable versions and changelogs      | `.changeset/`, `release.yml`                      |
| 7     | **Stability levels + previews**                             | Agility without losing safety         | `x-stability-level`, `preview.yml`, feature flags |
| 8     | Domain package with mutation testing + **event catalog**    | Rules and events with the same rigour | `@acme/domain`, `contracts/events`                |

A suggested path from level 0:

1. **Week 1:** move the existing YAML into one repository, add the lint, fix or explicitly ignore
   the findings. No consumer changes.
2. **Weeks 2–3:** generate and publish the types package; migrate one consumer (the one that
   suffers most from drift) and delete its hand-written types.
3. **Week 4:** add oasdiff to CI. From this day, breaking changes are visible.
4. Then the client and mocks for the frontend, tolerant responses before the next mobile release,
   and Changesets once there is more than one consumer of the packages.

## Day-to-day usage

Each level's document has its commands; the repository is the end state, so any level can be
copied from it.

## Trade-offs

- Stopping at level 2 still leaves breakage invisible; level 4 is the first one that protects
  clients.
- Level 5 (tolerant responses) is the one to prioritise when there is a mobile app: old builds
  cannot be fixed after the fact.

## How to demonstrate

Walk the table with the demos: level 1 → [demo 1](../demos/01-convention-blocked.sh), level 3 →
[demo 7](../demos/07-frontend-without-backend.sh), level 4 → [demo 4](../demos/04-breaking-change-blocked.sh),
level 5 → [demo 3](../demos/03-new-enum-value.sh), level 7 → [demo 5](../demos/05-preview-in-alpha.sh),
level 8 → [demos 9](../demos/09-mutation-testing.sh) and [10](../demos/10-event-immutable.sh).

## Frequently asked questions

**Do all teams need to move together?** No. A consumer can stay on its hand-written types while
another uses the package; the contract is the same. The value grows as more consumers join.
