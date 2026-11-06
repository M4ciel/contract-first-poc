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
    Y["openapi.yaml<br/>paths/ · components/"] --> L["Redocly<br/>lint"]
    L --> B["Redocly<br/>bundle"]
    B --> O["Orval<br/>generate"]
    O --> P["Post-process<br/>tolerant responses"]
    P --> T["@acme/api-types<br/><i>Zod schemas</i>"]
    P --> C["@acme/api-client<br/><i>TanStack Query + MSW</i>"]
    D["@acme/domain<br/><i>pure rules</i>"]
  end

  CI{{"CI: lint · tests · mutation · oasdiff vs base commit"}} -. blocks .-> Y

  T & C & D --> REG[("📦 npm registry<br/>Verdaccio locally")]

  REG --> API["apps/api<br/>NestJS + Fastify"]
  REG --> WEB["apps/web<br/>React + Vite"]
  REG --> LEG["apps/legacy-client<br/>an old app"]
```

### The three published packages

| Package            | What it contains                                                  | Consumed by          | Versioning                    |
| ------------------ | ----------------------------------------------------------------- | -------------------- | ----------------------------- |
| `@acme/api-types`  | Generated **Zod** schemas: runtime validation + inferred TS types | Backend and frontend | Fixed group with `api-client` |
| `@acme/api-client` | Generated **TanStack Query** hooks + **MSW** handlers (`/mocks`)  | Frontends            | Fixed group with `api-types`  |
| `@acme/domain`     | Pure, shared business rules (no I/O, 100% mutation score)         | Backend and frontend | Independent                   |

### Running on (emulated) AWS

The same NestJS application runs locally and as a Lambda. Locally, the AWS side is emulated by
[MiniStack](https://github.com/ministackorg/ministack) and provisioned with Terraform.

```mermaid
flowchart LR
  W["🌐 apps/web"] -->|HTTPS| GW["API Gateway<br/>HTTP API"]
  GW --> L1["λ api<br/>NestJS + Fastify"]
  L1 --> DDB[("DynamoDB")]
  L1 -->|feature flags| CFG["AppConfig"]
  L1 -->|loan.created.v1| EB["EventBridge"]
  EB --> Q["SQS"] --> L2["λ loan-events-consumer"]
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

| Area            | Tools                                                                           |
| --------------- | ------------------------------------------------------------------------------- |
| Monorepo        | Nx 24, pnpm 12 workspaces, Node.js 24 LTS, TypeScript 6 (strict)                |
| Contract        | OpenAPI 3.1, Redocly CLI (lint + bundle), Scalar (API reference portal)         |
| Code generation | Orval → Zod 4, TanStack Query 5, MSW; TypeScript compiler API post-processing   |
| Backend         | NestJS 11 on Fastify, AWS Lambda adapter, DynamoDB, AppConfig, EventBridge, SQS |
| Frontend        | React 19, Vite, TanStack Query, MSW                                             |
| Quality         | ESLint (module boundaries), Prettier, Jest, Stryker, Playwright                 |
| Compatibility   | oasdiff against the exact base commit, `x-stability-level`                      |
| Release         | Changesets (fixed groups, snapshot previews), Verdaccio                         |
| Infrastructure  | Docker Compose, MiniStack, Terraform                                            |
| CI              | GitHub Actions pinned by commit SHA                                             |

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
├── contracts/           # the "contracts repository": OpenAPI, events, generator, packages
│   └── packages/        # @acme/api-types · @acme/api-client · @acme/domain
├── apps/                # example consumers: api (NestJS) · web (React) · legacy-client
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
- [ ] OpenAPI 3.1 contract
- [ ] Redocly lint and bundle
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
