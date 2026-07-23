# Connector Plan Sandbox

Use this skill when an agent needs to rehearse connector actions before any live
read or write.

## Required Inputs

- A local connector action plan JSON file.
- A local connector policy fixture JSON file.
- Optional output path for the receipt.

## Side-Effect Boundaries

- Read only local plan and policy fixtures.
- Write only the explicit `--out` receipt.
- Do not call connector APIs, manage OAuth, fetch live data, or mutate accounts.

## Workflow

1. Draft the proposed connector action plan.
2. Choose or create a local policy fixture.
3. Run `connector-plan-sandbox plan.json --policy policy.json`.
4. Review approval mode, blocked actions, and sensitive fields.
5. Ask the user for any required approval before using real connector tools.

## Approval Requirements

No approval is required for local fixture rehearsal. Approval is required before
any live connector read or write described by the receipt.

Treat an approval mode of `blocked` as a deny policy, not as an approval request.
It produces an action blocker and a top-level `blocked: true` receipt whether it
comes from a resource policy or `defaultApproval`. If any action is blocked,
stop the entire plan and resolve every receipt blocker before using real
connector tools; do not execute the otherwise permitted actions separately.

## Verification

Run `npm test`, `npm run check`, `npm run build`, `npm run smoke`, and
`bash scripts/validate.sh`.
