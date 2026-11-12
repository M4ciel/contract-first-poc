# Architecture decision records

Short records of the decisions that shaped this repository: context, decision, consequences.
Records marked _deviation_ differ from the [original specification](../spec.md) and say why.

| ADR                                                      | Decision                                                  |
| -------------------------------------------------------- | --------------------------------------------------------- |
| [0001](./0001-contract-first-with-generated-packages.md) | Contract-first with generated, published packages         |
| [0002](./0002-strict-requests-tolerant-responses.md)     | Strict Zod requests, tolerant responses                   |
| [0003](./0003-oasdiff-against-base-commit.md)            | oasdiff against the exact base commit                     |
| [0004](./0004-changesets-with-manual-publishing.md)      | Changesets with manual publishing                         |
| [0005](./0005-snapshot-instead-of-pre-mode.md)           | Snapshot previews instead of pre mode                     |
| [0006](./0006-emulated-aws-with-ministack.md)            | Emulated AWS with MiniStack, Terraform and Docker Compose |
| [0007](./0007-inventory-as-a-separate-service.md)        | Inventory as a separate service with its own contract     |
| [0008](./0008-english-only-repository.md)                | English for every file, documentation included            |
| [0009](./0009-flagsmith-through-openfeature.md)          | Feature flags in Flagsmith, read through OpenFeature      |
| [0010](./0010-nx-nestjs-jest-stack.md)                   | Nx, NestJS on Fastify and Jest                            |
| [0011](./0011-problem-type-catalog.md)                   | A shared catalog of problem types                         |
| [0012](./0012-oasdiff-severity-for-new-enum-values.md)   | Lower oasdiff's severity for new response enum values     |
| [0013](./0013-software-catalog-in-backstage-format.md)   | Software catalog in Backstage format, without Backstage   |
| [0014](./0014-static-portal-on-github-pages.md)          | A static developer portal, published on GitHub Pages      |
