# Documentation

Start with the [overview](./00-overview.md), then read in order or jump to the piece you need.
Every piece follows the same template: TL;DR, the pain it solves, how it works, day-to-day usage,
trade-offs, how to demonstrate it and frequently asked questions.

| #   | Document                                                         | Piece                                                   | Demo    |
| --- | ---------------------------------------------------------------- | ------------------------------------------------------- | ------- |
| 00  | [Overview](./00-overview.md)                                     | The problem, the proposal and the architecture          | —       |
| 01  | [OpenAPI contract](./01-openapi-contract.md)                     | Two APIs, conventions, Problem Details                  | —       |
| 02  | [Lint and bundle](./02-lint-and-bundle.md)                       | Redocly rules as CI errors                              | 1       |
| 03  | [Code generation](./03-code-generation.md)                       | Orval → Zod, TanStack Query, fetch client, MSW          | 2       |
| 04  | [Tolerant responses](./04-tolerant-responses.md)                 | Strict requests, tolerant responses (AST post-process)  | 3       |
| 05  | [Domain package](./05-domain-package.md)                         | `@acme/domain` and mutation testing                     | 9       |
| 06  | [CI and compatibility](./06-ci-and-compatibility.md)             | oasdiff against the exact base commit                   | 4       |
| 07  | [Versioning and release](./07-versioning-and-release.md)         | Changesets, Verdaccio, manual publishing                | 5       |
| 08  | [Stability and preview](./08-stability-and-preview.md)           | `x-stability-level`, snapshot previews, the agile flow  | 5, 6    |
| 09  | [Compatibility rules](./09-compatibility-rules.md)               | Change → breaking? → what to do                         | 2, 4, 6 |
| 10  | [Events](./10-events.md)                                         | Event catalog, `@acme/events`, immutability             | 10      |
| 11  | [AI agents](./11-ai-agents.md)                                   | `AGENTS.md` and `CLAUDE.md`                             | —       |
| 12  | [Agile and trade-offs](./12-agile-and-trade-offs.md)             | Advantages, costs, when not to use it                   | —       |
| 13  | [Incremental adoption](./13-incremental-adoption.md)             | Level 0 to level 8, one step at a time                  | —       |
| 14  | [FAQ and gotchas](./14-faq-and-gotchas.md)                       | Objections and everything that bit us                   | —       |
| 15  | [Runtime and local environment](./15-runtime-and-environment.md) | NestJS, the inventory Lambda, MiniStack, Docker Compose | 7, 8    |
| 16  | [Feature flags](./16-feature-flags.md)                           | Flagsmith through OpenFeature, backend and frontend     | 11      |

Also: [presentation script](./presentation.md), [glossary](./glossary.md),
[next steps](./next-steps.md), [implementation report](./implementation-report.md), [architecture decision records](./adr/) and the
[original specification](./spec.md).

The live demos are in [`demos/`](../demos/README.md). Each one asserts its expected outcome, so
`bash demos/run-all.sh` checks that everything described here still behaves as described.

> The specification asked for this documentation in Brazilian Portuguese. It is in English because
> the repository is public and every other file is in English; see
> [ADR 0008](./adr/0008-english-only-repository.md).
