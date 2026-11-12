# 0014. A static developer portal, published on GitHub Pages

- **Status:** accepted
- **Date:** 2026-11-12

## Context

The [software catalog](./0013-software-catalog-in-backstage-format.md) records who owns, provides
and consumes each API, event and package, but only in YAML files inside the repository. Developers
who would consume these APIs should be able to find them, see who owns them and learn how to use
them without cloning anything. Backstage is the usual answer and was deliberately not deployed.

## Decision

`pnpm nx run contracts:portal` generates a static site from the root `catalog-info.yaml`, the
bundled OpenAPI and AsyncAPI documents and the packages' `package.json`, README and changelog. HTTP
APIs get an interactive reference (Scalar) and events an AsyncAPI view; viewer libraries are loaded
from a CDN at exact versions with Subresource Integrity. `.github/workflows/portal.yml` runs the
catalog check, builds the site and deploys it to GitHub Pages on every push to `main`.

## Consequences

- The portal always reflects `main`, and cannot be edited out of sync: every page is generated.
- A catalog error fails before deployment, so the portal never shows a broken catalog.
- No server to run. No search or plugins either; adopting Backstage later reuses the same
  descriptors.
- GitHub Pages is public: acceptable for this public repository, not for internal APIs, which would
  need a host with access control.
