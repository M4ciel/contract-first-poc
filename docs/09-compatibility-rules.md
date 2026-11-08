# Compatibility rules

## TL;DR

In a `beta` or `stable` operation, only **additive** changes. Never change the meaning of a field:
deprecate it, add a replacement, and remove the old one only in the next major version. CI enforces
most of this with oasdiff; this page lists what it enforces and what it does not.

## What pain it solves

Without written rules, "is this breaking?" depends on who reviews the pull request. With rules
enforced by a tool, the answer is the same every time, and the exceptions are explicit.

## How it works

Every row was checked with the pinned oasdiff (1.34.1) and this repository's severity file. "CI"
says whether `contracts:compat` fails on a `stable` operation.

| Change                                       | Breaking?                                                                | CI                                                                                 | What to do                                                                              |
| -------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Add an optional response field               | No                                                                       | passes                                                                             | Just do it. Old clients drop it ([tolerant responses](./04-tolerant-responses.md)).     |
| Add a required request field                 | **Yes**: old clients do not send it                                      | **fails** (`new-required-request-property`)                                        | Make it optional with a default, or a new operation / `/v2`.                            |
| Add an optional request field                | No                                                                       | passes                                                                             | Just do it.                                                                             |
| Remove a required response field             | **Yes**                                                                  | **fails** (`response-required-property-removed`)                                   | Deprecate (`deprecated: true`), remove in the next major version.                       |
| Remove an optional response field            | **Yes** for clients that read it                                         | passes ⚠                                                                           | oasdiff does not flag it. Treat it as breaking: deprecate first.                        |
| Remove an optional request field             | **Yes** here: requests are strict, so clients still sending it get a 400 | passes ⚠ (warning only)                                                            | Keep accepting it until the next major version.                                         |
| Rename a field                               | **Yes** (a removal plus an addition)                                     | **fails**                                                                          | Add the new name, deprecate the old one, keep both until the next major version.        |
| Change a field's type                        | **Yes**                                                                  | **fails** (`response-property-type-changed`)                                       | A new field with the new type; deprecate the old one.                                   |
| Add an enum value to a response              | No, here: clients map unknown values to `unknown`                        | passes (lowered by [ADR 0012](./adr/0012-oasdiff-severity-for-new-enum-values.md)) | Just do it.                                                                             |
| Add an enum value to a request               | No                                                                       | passes                                                                             | Just do it.                                                                             |
| Remove an enum value from a request          | **Yes**                                                                  | **fails** (`request-property-enum-value-removed`)                                  | Keep accepting it; map it on the server.                                                |
| Make a response field optional               | **Yes**: clients rely on it                                              | **fails** (`response-property-became-optional`)                                    | Keep it required, or a new field.                                                       |
| Add an endpoint                              | No                                                                       | passes                                                                             | Born `alpha`, behind a flag until promoted.                                             |
| Change a success status code (201 → 200)     | **Yes**                                                                  | **fails** (`response-success-status-removed`)                                      | A new operation, or keep the old status.                                                |
| Add an error status code (409)               | Usually not                                                              | passes                                                                             | Document it; clients must already handle unexpected statuses and unknown problem types. |
| Remove an operation                          | **Yes**                                                                  | **fails** (`api-path-removed-without-deprecation`)                                 | Deprecate first; remove in the next major version.                                      |
| Change a field's meaning, same name and type | **Yes**, invisible to every tool                                         | passes ⚠                                                                           | Never. A new field with the new meaning.                                                |

The ⚠ rows are why review still matters: a tool checks shapes, not intent.

Other rules:

- Every path starts with a major version (`/v1`, `/v2`), enforced by the lint.
- Requests are strict and responses are tolerant. Do not change that split.
- Reserve `426 Upgrade Required` with Problem Details as a future minimum-app-version mechanism
  (documented in [next steps](./next-steps.md), not implemented).

## Day-to-day usage

`pnpm nx run contracts:compat` before opening the pull request; CI runs it again against the exact
base commit.

## Trade-offs

Additive-only means fields accumulate: a deprecated field lives until the next major version. That
is the price of never breaking a client in the field; majors exist to pay it down in one go.

## How to demonstrate

- [Demo 2](../demos/02-additive-change.sh): an optional field passes.
- [Demo 4](../demos/04-breaking-change-blocked.sh): a rename fails.
- [Demo 6](../demos/06-promotion-and-protection.sh): the same change is allowed in `alpha` and
  blocked once `stable`.

## Frequently asked questions

**Is a new required response field breaking?** Not for old clients (they drop it). It is the normal
way to add data that every response has.

**What about headers?** The same reasoning applies; oasdiff checks them too.
