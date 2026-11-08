# Glossary

**Additive change.** A change that existing clients cannot notice in a harmful way: a new optional
response field, a new endpoint, a new optional parameter, a new response enum value (here). See
[compatibility rules](./09-compatibility-rules.md).

**API-first.** Designing the API before implementing it. Contract-first goes further: the design is
a machine-readable contract that generates code and is checked in CI.

**Breaking change.** A change that can make an existing client fail: removing or renaming a field,
changing a type, adding a required request field, removing a success status code.

**Bundle.** A single OpenAPI file produced from the split files (`redocly bundle`), read by the
generator, oasdiff and the API reference portal. Generated and git-ignored.

**Changeset.** A small Markdown file that names the packages a change affects, the bump (patch,
minor, major) and a description for consumers. Consumed when versions are bumped.

**Contract-first.** The contract (OpenAPI, JSON Schema) is written first and is the single source of
truth; code on both sides is generated from it or validated against it.

**Cursor pagination.** Pages addressed by an opaque cursor returned with each page
(`nextCursor`), instead of an offset. Stable when items are inserted while a client pages.

**Dist-tag.** A named pointer to a version of an npm package. `latest` is what `npm install` gets;
`preview` points to snapshot versions of contracts still in `alpha`.

**Feature flag.** A runtime switch that turns a behaviour on or off without a deploy. Here, it keeps
operations below `stable` invisible in production.

**Mutant.** A copy of the code with one small change (`>` became `>=`). Mutation testing runs the
tests against each mutant; a mutant that no test kills is a bug the tests would let through.

**OpenFeature.** A vendor-neutral standard (CNCF) for reading feature flags; the vendor is a
pluggable provider.

**Problem Details.** RFC 9457: a standard JSON shape for HTTP errors (`type`, `title`, `status`,
`detail`), served as `application/problem+json`.

**Snapshot version.** A throwaway prerelease version built from pending changesets
(`0.2.0-preview-20261108041557`), published under the `preview` dist-tag without changing anything
committed.

**Stability level.** `x-stability-level` on each operation: `draft`, `alpha` (may change freely),
`beta`, `stable` (protected by oasdiff).

**Tolerant reader.** A client that ignores what it does not know (extra fields, new enum values)
instead of failing. Here, generated response schemas are tolerant readers.

**Trunk-based development.** Everyone integrates into `main` often, in small changes; long-lived
branches are avoided. Previews and flags make unfinished contracts safe on `main`.
