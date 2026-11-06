<div align="center">

# 📜 Contract-First POC

**The OpenAPI contract becomes code.**
One source of truth generates versioned packages (types, validation, HTTP client, mocks), and CI
blocks incompatible changes by machine, not by intuition.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
![Node.js](https://img.shields.io/badge/node-24.22-339933?logo=nodedotjs&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-12-F69220?logo=pnpm&logoColor=white)
![Nx](https://img.shields.io/badge/nx-24-143055?logo=nx&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-6.0-3178C6?logo=typescript&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI-3.1-6BA539?logo=openapiinitiative&logoColor=white)
![Status](https://img.shields.io/badge/status-work%20in%20progress-orange)

[Why](#-why) •
[Architecture](#-architecture) •
[How it flows](#-how-a-change-flows) •
[Stack](#-tech-stack) •
[Getting started](#-getting-started) •
[Docs](#-documentation) •
[Roadmap](#-roadmap)

</div>

---

> [!NOTE]
> This is a **generic proof of concept** built for an engineering knowledge-transfer session. The
> domain is a fictional library (`books`, `loans`) and the npm scope is `@acme`. No real company,
> product or personal data is used anywhere.

## 🤔 Why

Many teams already do "API-first", but only halfway: there is an `openapi.yaml`, yet it is just
documentation. Every repository (backend, web, mobile, BFF) rewrites its own types, validation,
HTTP clients and mocks, and nothing checks whether a change breaks existing clients.

| Pain                           | Day-to-day symptom                                                                         | Fixed here by                          |
| ------------------------------ | ------------------------------------------------------------------------------------------ | -------------------------------------- |
| 🔀 **Contract drift**          | The YAML says `string`, the backend returns `number`, the frontend typed `string \| null`. | Code generated from a single contract  |
| 📋 **Duplicated work**         | N repositories writing the same types and validations.                                     | Published `@acme/*` packages           |
| 💥 **Silent client breakage**  | Renaming a field or adding an enum value takes down an old mobile app.                     | `oasdiff` in CI + tolerant responses   |
| ⏳ **Front blocked by back**   | The frontend waits for the endpoint to exist in staging.                                   | Generated MSW mocks from day one       |
| 🧩 **Inconsistent validation** | Zod here, Joi there, nothing elsewhere.                                                    | Generated Zod schemas, strict requests |
| 🚨 **Heterogeneous errors**    | Every service invents its own error format.                                                | RFC 9457 Problem Details everywhere    |
| 🏷️ **Informal versioning**     | "Which API version does app 3.2 use?"                                                      | Changesets, changelogs and dist-tags   |

## 🏗️ Architecture

```mermaid
flowchart LR
  subgraph contracts["📜 contracts/ — source of truth"]
    direction LR
    Y1["apis/library<br/><i>public API</i>"] --> L["Redocly<br/>lint"]
    Y2["apis/inventory<br/><i>internal API</i>"] --> L
    L --> B["Redocly<br/>bundle"]
    B --> O["Orval<br/>generate"]
    O --> P["Post-process<br/>tolerant responses"]
    P --> T["@acme/api-types<br/><i>Zod schemas</i>"]
    P --> C["@acme/api-client<br/><i>TanStack Query + MSW</i>"]
    P --> IC["@acme/inventory-client<br/><i>Zod + fetch + MSW</i>"]
    D["@acme/domain<br/><i>pure rules</i>"]
  end

  CI{{"CI: lint · tests · mutation · oasdiff vs base commit"}} -. blocks .-> Y1 & Y2

  T & C & IC & D --> REG[("📦 npm registry<br/>Verdaccio locally")]

  REG --> API["apps/api<br/>NestJS + Fastify"]
  REG --> WEB["apps/web<br/>React + Vite"]
  REG --> INV["apps/inventory<br/>AWS Lambda"]
  REG --> LEG["apps/legacy-client<br/>an old app"]
```

Two contracts live side by side and follow the same rules: the **public library API** (web →
backend) and the **internal inventory API** (backend → Lambda). Contract-first is not only for
frontends: the backend is a consumer too.

### The published packages

| Package                  | What it contains                                                  | Consumed by          | Versioning                          |
| ------------------------ | ----------------------------------------------------------------- | -------------------- | ----------------------------------- |
| `@acme/api-types`        | Generated **Zod** schemas: runtime validation + inferred TS types | Backend and frontend | Fixed group with `api-client`       |
| `@acme/api-client`       | Generated **TanStack Query** hooks + **MSW** handlers (`/mocks`)  | Frontends            | Fixed group with `api-types`        |
| `@acme/inventory-client` | Generated **Zod** schemas, **fetch** client + **MSW** handlers    | Backend              | Independent (follows inventory API) |
| `@acme/domain`           | Pure, shared business rules (no I/O, 100% mutation score)         | Backend and frontend | Independent                         |

### Runtime on (emulated) AWS

The NestJS backend runs as a container. The inventory service is **Lambda only**: the backend
calls it over HTTP with the generated client. Locally, AWS is emulated by
[MiniStack](https://github.com/ministackorg/ministack) and provisioned with Terraform.

```mermaid
flowchart LR
  WEB["🌐 apps/web"] -->|"@acme/api-client"| API["apps/api<br/>NestJS + Fastify<br/><i>container</i>"]
  API --> DDB1[("DynamoDB<br/>loans")]
  API -->|feature flags| CFG["AppConfig"]
  API -->|"@acme/inventory-client"| GW["API Gateway<br/>HTTP API"]
  GW --> INV["λ inventory"]
  INV --> DDB2[("DynamoDB<br/>copies")]
  API -->|loan.created.v1| EB["EventBridge"]
  EB --> Q["SQS"] --> CON["λ loan-events-consumer"]
```

When a loan is created, the backend reserves a copy synchronously and announces the loan
asynchronously:

```mermaid
sequenceDiagram
  autonumber
  participant Web as apps/web
  participant Api as apps/api (NestJS)
  participant Inv as λ inventory
  participant Bus as EventBridge → SQS
  participant Con as λ loan-events-consumer

  Web->>Api: POST /v1/loans { bookId }
  Api->>Api: strict Zod validation (400 on unknown fields)
  Api->>Inv: POST /v1/reservations { bookId, loanId }
  alt no copy available
    Inv-->>Api: 409 Problem Details
    Api-->>Web: 409 Problem Details
  else copy reserved
    Inv-->>Api: 201 Reservation
    Api->>Api: dueAt = calculateDueDate(...) from @acme/domain
    Api-)Bus: loan.created.v1
    Api-->>Web: 201 Loan
    Bus-)Con: loan.created.v1
  end
```

## 🔄 How a change flows

The contract is ready **before** the sprint. Stability levels (`draft` → `alpha` → `beta` →
`stable`) let it keep changing during the sprint without breaking anyone, and preview packages
never touch the `latest` dist-tag.

```mermaid
sequenceDiagram
  autonumber
  participant TL as Tech Lead
  participant C as Contracts
  participant CI as CI (oasdiff)
  participant R as Registry
  participant Dev as Back & Front devs

  TL->>C: PR: new operation (x-stability-level: alpha) + changeset
  C->>CI: lint, generate, test, oasdiff
  CI-->>C: ✅ alpha may still change
  TL->>R: Publish preview → 0.2.0-preview-… (tag: preview)
  Dev->>R: pnpm add @acme/api-client@preview
  Note over Dev: back behind a feature flag,<br/>front on generated MSW mocks
  TL->>C: PR: promote to stable
  C->>CI: oasdiff now protects it forever
  TL->>R: Publish release → 0.2.0 (tag: latest)
```

### Strict requests, tolerant responses

Old clients survive additive changes: unknown fields are dropped and unknown enum values become
`'unknown'` instead of a parse error.

```mermaid
flowchart LR
  subgraph before["❌ Strict response schema"]
    A1["status: 'lost'"] --> A2["ZodError 💥<br/>app crashes"]
  end
  subgraph after["✅ Post-processed schema"]
    B1["status: 'lost'"] --> B2["'unknown'<br/>neutral badge"]
  end
```

## 🧰 Tech stack

| Area            | Tools                                                                         |
| --------------- | ----------------------------------------------------------------------------- |
| Monorepo        | Nx 24, pnpm 12 workspaces, Node.js 24 LTS, TypeScript 6 (strict)              |
| Contract        | OpenAPI 3.1, Redocly CLI (lint + bundle), Scalar (API reference portal)       |
| Code generation | Orval → Zod 4, TanStack Query 5, MSW; TypeScript compiler API post-processing |
| Backend         | NestJS 11 on Fastify (container), DynamoDB, AppConfig, EventBridge            |
| Serverless      | AWS Lambda (inventory service, event consumer), API Gateway HTTP API, SQS     |
| Frontend        | React 19, Vite, TanStack Query, MSW                                           |
| Quality         | ESLint (module boundaries), Prettier, Jest, Stryker, Playwright               |
| Compatibility   | oasdiff against the exact base commit, `x-stability-level`                    |
| Release         | Changesets (fixed groups, snapshot previews), Verdaccio                       |
| Infrastructure  | Docker Compose, MiniStack, Terraform                                          |
| CI              | GitHub Actions pinned by commit SHA                                           |

## 🚀 Getting started

> [!WARNING]
> The project is being built step by step. The commands below describe the target experience and
> become available as the [roadmap](#-roadmap) progresses.

**Prerequisites:** [nvm](https://github.com/nvm-sh/nvm), Docker with Compose, and pnpm 12.

```bash
nvm use                # Node.js 24.22.2 from .nvmrc
pnpm install
pnpm nx run contracts:generate
pnpm nx run-many -t lint test typecheck
```

## 📂 Repository layout

```
contract-first-poc/
├── AGENTS.md            # rules for AI agents (CLAUDE.md imports it)
├── contracts/           # the "contracts repository"
│   ├── apis/            # library (public) and inventory (internal) OpenAPI contracts
│   ├── shared/          # components shared by every API (Problem Details, error responses)
│   ├── events/          # domain event catalog
│   └── packages/        # @acme/api-types · @acme/api-client · @acme/inventory-client · @acme/domain
├── apps/                # api (NestJS) · inventory (Lambda) · web (React) · legacy-client
├── infra/               # Terraform for the emulated AWS environment
├── demos/               # scripts for the live demo scenarios
└── docs/                # one document per piece + ADRs
```

> In real life, `contracts/` would be its own repository and the apps would install the packages
> from a private registry. The monorepo keeps the demo self-contained.

## 📚 Documentation

| Document                                 | What you will find                                 |
| ---------------------------------------- | -------------------------------------------------- |
| [Original specification](./docs/spec.md) | The brief that drove this POC                      |
| [Rules for AI agents](./AGENTS.md)       | Source of truth, compatibility rules, prohibitions |

More documents (one per piece, ADRs, FAQ, glossary and the presentation script) are added as each
step lands.

## 🗺️ Roadmap

```mermaid
timeline
  title Incremental adoption — every level delivers value on its own
  Level 1 : Centralised contract : Redocly lint in CI
  Level 2 : Generated Zod types : published as a package
  Level 3 : Generated client : MSW mocks
  Level 4 : oasdiff against the base commit
  Level 5 : Tolerant responses : unknown enum fallback
  Level 6 : Changesets : controlled manual release
  Level 7 : Stability levels : preview packages
  Level 8 : Domain package with mutation testing : event catalog
```

- [x] Monorepo skeleton (Nx, pnpm, strict TypeScript, module boundaries, agent rules)
- [x] OpenAPI 3.1 contract
- [x] Redocly lint and bundle
- [ ] Orval code generation
- [ ] Tolerant-response post-processing
- [ ] `@acme/domain` with mutation testing
- [ ] `apps/api` (NestJS + Fastify)
- [ ] `apps/legacy-client`
- [ ] `apps/web` (React + MSW)
- [ ] oasdiff and stability levels
- [ ] Emulated AWS (MiniStack + Terraform) and domain events
- [ ] Changesets, Verdaccio and preview releases
- [ ] GitHub Actions workflows
- [ ] Live demo scripts
- [ ] Full documentation and ADRs

## 📄 License

[MIT](./LICENSE) © Caio Maciel
