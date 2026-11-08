# 0009. Feature flags in Flagsmith, read through OpenFeature

- **Status:** accepted (supersedes the first implementation on AWS AppConfig)
- **Date:** 2026-11-08

## Context

Operations below `stable` must stay behind flags in production. The first implementation used AWS
AppConfig, which has no local UI. Teams commonly use LaunchDarkly; the POC should look familiar and
stay vendor-neutral.

## Decision

Flags live in a self-hosted Flagsmith (open source, with a UI) in Docker Compose. Backend and
frontend read them through OpenFeature. The backend uses a small provider of its own over
`@flagsmith/nodejs` in local-evaluation mode, because the official server provider depends on the
deprecated `flagsmith-nodejs`; the frontend uses the official client provider. Without Flagsmith,
both use OpenFeature's in-memory provider with fixed values.

## Consequences

- Swapping vendors means swapping a provider; flag checks in the code do not change.
- Two more containers locally, seeded with example values on every `up`.
- The custom provider is maintained here until the official one catches up.
