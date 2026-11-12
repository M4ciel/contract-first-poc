# Next steps

What this POC does not do yet, in rough order of value.

- **Diff the AsyncAPI channels.** Events have an AsyncAPI document, linted in CI, and their payloads
  are immutable, but renaming a bus or a queue is not blocked. A small check against the base commit
  (channel addresses and operations only) would close it.
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
- **Publish the developer portal.** `pnpm nx run contracts:portal` builds it from the catalog, the
  contracts and the packages; hosting it (static) on every merge gives every team one place to look.
- **`426 Upgrade Required`.** A minimum app version, answered with Problem Details, for the rare
  breaking change that must reach mobile apps. Documented, not implemented.
- **A GitHub App token for the Version PR,** so CI runs on it (pull requests created with
  `GITHUB_TOKEN` do not trigger workflows).
- **Removing `booksV2`** once `/v2/books` is promoted to `stable`: flags are temporary.
