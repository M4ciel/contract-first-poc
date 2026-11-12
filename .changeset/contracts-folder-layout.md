---
'@acme/api-types': patch
'@acme/api-client': patch
'@acme/inventory-client': patch
'@acme/events': patch
---

The contracts repository was reorganised: generators moved to `contracts/tooling/` and each event
now lives in its own folder (`contracts/events/loan.created/v1.schema.json`). No API or event shape
changed. The HTTP packages are byte-for-byte the same; `@acme/events` only updates the source paths
in its generated comments.
