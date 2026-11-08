# 0006. Emulated AWS with MiniStack, Terraform and Docker Compose

- **Status:** accepted (deviation from the specification, which did not prescribe a runtime)
- **Date:** 2026-11-07

## Context

The POC needs real services (a backend, a Lambda, a queue) to show contracts at runtime, without an
AWS account.

## Decision

Everything runs locally in Docker Compose on MiniStack, an MIT-licensed AWS emulator, provisioned
by the same Terraform that would target AWS (endpoints and dummy credentials aside). A one-shot job
resets MiniStack and applies Terraform from a fresh state on every `up`. The backend is a container;
serverless pieces (Lambdas, API Gateway, DynamoDB, EventBridge, SQS) are Terraform resources.

## Consequences

- One command starts the environment, and CI runs it with a smoke test on every pull request.
- An emulator does not enforce IAM and implements a subset of each service; this environment proves
  wiring and contracts, not permissions.
- LocalStack was the alternative; MiniStack is smaller and starts in seconds.
