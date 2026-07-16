# PRD: connector-plan-sandbox

## Summary

Build a local-first dry-run receipt generator for connector action plans.

## Users

- Agents planning connector reads or writes.
- Maintainers reviewing approval boundaries.
- Connector builders testing policy fixtures.

## MVP

- Parse a local action plan and local policy fixture.
- Classify action operations, resources, sensitive fields, approval modes, and
  blockers.
- Emit Markdown and JSON receipts.
- Include fixtures, tests, smoke command, safety notes, and `SKILL.md`.

## Non-Goals

- Executing connector actions.
- OAuth, token handling, or live account reads.
- Replacing host-specific consent screens.

