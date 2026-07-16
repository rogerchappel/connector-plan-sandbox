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

## Policy Shape

Policies define allowed resources, sensitive fields, approval modes, and blocked
operations. The sandbox never executes the action plan.

## CLI

```bash
connector-plan-sandbox plan.json --policy policy.json --format markdown --out receipt.md
connector-plan-sandbox plan.json --policy policy.json --format json
```

## Safety

The tool reads local files and writes only an explicit `--out` report. It does
not hold tokens, open OAuth flows, call connector APIs, or make external writes.

