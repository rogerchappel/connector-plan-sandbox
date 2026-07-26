# connector-plan-sandbox

`connector-plan-sandbox` rehearses connector action plans against local policy
fixtures. It emits a dry-run receipt that explains reads, writes, sensitive
fields, required approvals, and blockers before an agent touches a live account.

## Quickstart

```bash
npm install
npm run smoke
node src/cli.js fixtures/action-plan.json --policy fixtures/policy.json --format markdown
```

## Action Plan Shape

```json
{
  "connector": "crm",
  "actions": [
    {
      "id": "create-note",
      "operation": "write",
      "resource": "contact.note",
      "fields": ["contactId", "body"],
      "description": "Draft a follow-up note"
    }
  ]
}
```

`actions` must be an array. Each action's optional `fields` value must also be
an array; omit it when the action has no fields. When both the plan and policy
declare a non-empty `connector`, the values must match so that a policy cannot
authorize a plan intended for another connector.

## Policy Shape

Policies define allowed resources, sensitive fields, approval modes, and blocked
operations. Approval modes `none`, `ask`, and `explicit` describe the approval
needed before execution. The `blocked` mode is a deny policy: whether set on a
resource or inherited from `defaultApproval`, it adds a blocker to each affected
action and makes the top-level receipt report `"blocked": true`.

`resources` is required and must be an object keyed by resource name. Each
resource must declare `operations` as an array of exact string operation names.
Its optional `sensitiveFields` value must be an array of exact field-name
strings; substring matching is never used.

The optional top-level `blocked` collection must be an array of rule objects.
Every rule requires non-empty string `operation` and `resource` fields; either
field may be `"*"` to match all values. Other shapes, including strings that
merely contain an operation or field name, are rejected before a receipt is
evaluated.

A plan containing both permitted and policy-blocked actions is blocked as a
whole. Review the receipt's per-action blockers; do not execute any part of the
plan until they are resolved. The sandbox itself never executes the action plan.

## CLI

```bash
connector-plan-sandbox plan.json --policy policy.json --format markdown --out receipt.md
connector-plan-sandbox plan.json --policy policy.json --format json
```

Invalid or incomplete options exit with status 1 and a concise error message,
without printing an implementation stack trace.

## Safety

The tool reads local files and writes only an explicit `--out` report. It does
not hold tokens, open OAuth flows, call connector APIs, or make external writes.
