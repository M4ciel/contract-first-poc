# 0010. Nx, NestJS on Fastify and Jest

- **Status:** accepted (deviation from the specification)
- **Date:** 2026-11-06

## Context

The specification suggested pnpm workspaces alone, a minimal backend (Fastify or Hono) and Vitest.
The POC should reflect the stack the team uses.

## Decision

- **Nx 24** over pnpm workspaces: task graph, caching, module boundaries as lint rules, `affected`.
- **NestJS 11 on Fastify** for the backend, built with `tsc` (decorator metadata) and run as a
  container.
- **Jest 30** with native ESM for unit tests, **Playwright** for the web app.
- TypeScript 6 in strict mode everywhere; imports never climb with `../` (folder aliases instead).

## Consequences

- Familiar for the team; Nx caching keeps CI and local runs fast.
- Jest needs `--experimental-vm-modules` for ESM, and Stryker needs explicit plugin configuration in
  a pnpm monorepo (see the FAQ).
