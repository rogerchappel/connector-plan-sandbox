# connector-plan-sandbox

`connector-plan-sandbox` rehearses connector action plans against local policy
fixtures. It emits a dry-run receipt that explains planned operations, sensitive
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
  "requestId": "follow-up-123",
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

The plan must be a JSON object. `actions` must be an array containing at least
one action, and every action must be an object with non-blank string
`operation` and `resource` values. An optional `requestId` must be a non-blank
string; when omitted, the receipt uses `unknown-request`. Optional action `id`
values must be non-blank strings and unique within the plan. Actions without an
`id` receive positional identifiers such as `action-1`. The final identifiers
must also be unique when supplied and generated IDs are considered together;
for example, an explicit `action-2` conflicts with the generated ID of an
unidentified second action, and the plan is rejected before a receipt is
emitted. Optional `description` values must be strings, and optional `fields`
values must be arrays containing only strings. Omit `fields` when the action has
no fields. Supplied plan and policy `connector` identifiers must be non-blank
strings. When both declare a connector, the values must match so that a policy
cannot authorize a plan intended for another connector.

## Policy Shape

Policies define allowed resources, sensitive fields, approval modes, and blocked
operations. Approval modes `none`, `ask`, and `explicit` describe the approval
needed before execution. The `blocked` mode is a deny policy: whether set on a
resource or inherited from `defaultApproval`, it adds a blocker to each affected
action and makes the top-level receipt report `"blocked": true`.

`resources` is required and must be an object keyed by non-blank resource name.
Each resource must declare `operations` as an array of exact, non-blank string
operation names.
Its optional `sensitiveFields` value must be an array of exact field-name
strings; substring matching is never used.

For an allowed plan, the receipt summary counts every action under its exact
operation name, including policy-defined names such as `delete`, and lists
operation groups in their first-seen order. Read and write plans retain the same
`N read action(s), N write action(s)` form; other operation names are not folded
into either count or omitted.

The optional top-level `blocked` collection must be an array of rule objects.
Every rule requires non-blank string `operation` and `resource` fields; either
field may be `"*"` to match all values. Other shapes, including strings that
merely contain an operation or field name, are rejected before a receipt is
evaluated.

A plan containing both permitted and policy-blocked actions is blocked as a
whole. Review the receipt's per-action blockers; do not execute any part of the
plan until they are resolved. The sandbox itself never executes the action plan.

## CLI

Help is a standalone command: run `connector-plan-sandbox --help` without a plan or other options.

```bash
connector-plan-sandbox plan.json --policy policy.json --format markdown --out receipt.md
connector-plan-sandbox plan.json --policy policy.json --format json
```

The plan path must be first. After it, `--policy`, `--format`, and `--out` may
appear in any order, but each option may be specified only once and must be
followed by a value rather than another option. `--policy` is required;
`--format` defaults to `markdown`, and `--out` defaults to standard output.

Invalid or incomplete options and malformed plan shapes exit with status 1 and
a concise domain error, without printing an implementation stack trace. No
receipt is printed or written when validation fails, including for an invalid
`requestId`, duplicate supplied or generated action IDs, or an empty `actions`
array.

## Safety

The tool reads local files and writes only an explicit `--out` report. It does
not hold tokens, open OAuth flows, call connector APIs, or make external writes.

## Release verification

Run the complete source and packed-artifact gate before release:

```bash
npm ci
npm run release:check
```

The gate checks source syntax and tests, the build contract, and the CLI smoke.
It then creates and extracts the npm tarball, verifies the shipped CLI, library,
documentation, fixtures, license, and build scripts, and runs the build and CLI
again from the extracted package.
