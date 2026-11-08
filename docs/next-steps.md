# Next steps

What this POC does not do yet, in rough order of value.

- **AsyncAPI for events.** The catalog validates payloads; channels (bus, queues, subscribers) are a
  table in a README. One AsyncAPI document per service, referencing the existing JSON Schemas, would
  make them machine-readable, linted and diffed in CI like OpenAPI.
- **An outbox for events.** The backend publishes `loan.created.v1` after saving the loan; a crash in
  between loses the event. Writing the event in the same transaction as the loan and relaying it
  (DynamoDB Streams, or a polling relay) makes delivery at-least-once.
- **Contract tests against real responses.** The backend's tests already parse every response with
  the generated schemas. The next step is the same check against a deployed environment (and
  against the inventory Lambda as deployed), so a difference between environments is caught too.
- **Generators for other languages.** The contracts are language-neutral. Kotlin or Swift clients for
  the mobile apps (openapi-generator) would get the same versioning; the tolerant post-processing
  would need an equivalent per language.
- **Publish the bundle as an artifact.** Versioned bundles let teams without the npm packages (or in
  other languages) diff and generate from the exact released contract.
- **Documentation portal.** `pnpm nx run contracts:reference` already renders the bundles with
  Scalar; publishing it per release (static hosting) gives every team one place to read the API.
- **`426 Upgrade Required`.** A minimum app version, answered with Problem Details, for the rare
  breaking change that must reach mobile apps. Documented, not implemented.
- **A GitHub App token for the Version PR,** so CI runs on it (pull requests created with
  `GITHUB_TOKEN` do not trigger workflows).
- **Removing `booksV2`** once `/v2/books` is promoted to `stable`: flags are temporary.
