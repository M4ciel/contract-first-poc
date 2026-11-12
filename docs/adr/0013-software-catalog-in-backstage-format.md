# 0013. Software catalog in Backstage format, without Backstage

- **Status:** accepted
- **Date:** 2026-11-12

## Context

The contracts say what each API and event looks like, but not who owns it, who consumes it or what
depends on what. That knowledge lived in people's heads and in a hand-written table in the events
README. The POC should look like a working platform that other developers can discover on their own.

## Decision

Each API, event, app and package gets a `catalog-info.yaml` in the Backstage descriptor format
(`backstage.io/v1alpha1`), with fictional teams as owners. A root `Location` lists them all.
`@acme/tools:catalog-check` validates the descriptors, every reference between them, that every
contract and project is described, and that `dependsOn` matches `package.json`. Backstage itself is
not deployed.

## Consequences

- A Backstage instance can import the catalog by registering one file.
- The catalog cannot silently drift: missing descriptors and wrong dependencies fail CI.
- Events are `API` entities of type `json-schema` until they have an AsyncAPI document.
- One more file per project, and a static portal still has to be built to browse it.
