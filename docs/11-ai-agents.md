# AI agents

## TL;DR

`AGENTS.md` at the root holds the repository rules for AI coding agents (and humans): source of
truth, tooling, compatibility rules, workflow and prohibitions. `CLAUDE.md` only contains
`@AGENTS.md`, Claude Code's import syntax, so every agent reads the same file.

## What pain it solves

AI agents are fast and literal. Without rules they "invent" an endpoint to finish a task, edit a
generated file to fix a type error, or lower a coverage threshold to make CI pass. Each of those
is a perfectly reasonable local fix and a bad change for the system.

## How it works

`AGENTS.md` is short and specific. The parts that matter most:

- **Source of truth:** APIs only in `contracts/apis/`, events only in `contracts/events/`, shared
  rules only in `@acme/domain`.
- **Tooling:** the commands to run (`nx run-many -t lint test typecheck`, `contracts:generate`,
  `contracts:compat`, `@acme/tools:changeset-check`) and conventions such as imports without `../`.
- **Compatibility rules:** additive only in `stable`/`beta`; requests strict, responses tolerant.
- **Forbidden:** editing or committing generated files; adding or changing endpoints, fields or
  events without explicit human approval; **weakening a check to make CI pass** (lint rules,
  oasdiff, coverage, mutation, module boundaries); publishing or running release workflows without
  an explicit request; personal data, real company names or real domains anywhere.

Most rules are also enforced by tools, so the file states intent and the tools catch slips:
generated folders are git-ignored and the clean clone fails if one is committed; ESLint enforces
module boundaries and the import rule; oasdiff, coverage and Stryker thresholds fail CI.

This POC was built step by step with an AI agent under these rules. The agent stopped for human
approval of each contract change, and when a check failed (an oasdiff rule that contradicted the
documented compatibility rules), the change was raised for review with tests instead of silently
relaxing the check ([ADR 0012](./adr/0012-oasdiff-severity-for-new-enum-values.md)).

## Day-to-day usage

Keep `AGENTS.md` current when a convention changes, in the same pull request. One file serves
Claude Code, Copilot, Cursor and other agents that read `AGENTS.md`.

## Trade-offs

- Instructions are not guarantees; tools are. Every important rule should have a check, and
  `AGENTS.md` should say what the check is.
- A long rules file gets skimmed by people and agents alike. Rules that need explanation link to
  the docs instead.

## How to demonstrate

Ask an agent to "add an `isbn` field to the book response" and watch it stop for approval of the
contract change, add a changeset, and run `contracts:compat` before proposing the change.

## Frequently asked questions

**Why not `CLAUDE.md` with its own content?** Two files drift. The import keeps a single source.
