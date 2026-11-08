# 0012. Lower oasdiff's severity for new response enum values

- **Status:** accepted
- **Date:** 2026-11-07

## Context

oasdiff reports `response-property-enum-value-added` as an error: a client written against the old
enum may not handle the new value. Here, every generated response schema maps unknown values to
`'unknown'` ([0002](./0002-strict-requests-tolerant-responses.md)), and the compatibility rules
declare a new response enum value additive. oasdiff's suggested alternative, `x-extensible-enum`,
would make Orval generate a plain string and lose the type.

## Decision

`contracts/scripts/compat/oasdiff-severity.txt` lowers that one rule to `info`. Nothing else is
relaxed. A test runs oasdiff with and without the file to document the difference.

## Consequences

- Demo 3 (`lost` in `Loan.status`) passes CI, as the rules intend.
- The decision depends on every consumer using the generated tolerant schemas; a consumer with
  hand-written closed enums would not be protected.
