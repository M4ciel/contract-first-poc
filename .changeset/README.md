# Changesets

Every change to a published package (`@acme/api-types`, `@acme/api-client`,
`@acme/inventory-client`, `@acme/domain`, `@acme/events`) comes with a changeset: run
`pnpm changeset`, pick the packages and the bump, and describe the change for consumers.

- **Contract changes count.** The packages are generated from `contracts/`, so a change to an
  OpenAPI file or an event schema needs a changeset for the package generated from it, even though
  no file inside the package changed.
- `@acme/api-types` and `@acme/api-client` are a **fixed** group: they always share a version,
  because the client's types come from the types package.
- **Bumps:** additive contract change → `minor`; fix that changes no shape → `patch`; a `major` is
  only for a new major API version or the removal of a deprecated operation.
- Nothing is published from a pull request. Releases and previews are manual (`docs/`, step
  "Release"); locally they go to Verdaccio with `nx run @acme/infra:release-local`.
