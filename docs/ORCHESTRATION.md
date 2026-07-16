# Orchestration

`connector-plan-sandbox` fits before any live connector call.

1. Convert the intended action into a JSON plan.
2. Pair it with a local policy fixture for the target connector.
3. Generate a receipt in Markdown or JSON.
4. Resolve blockers or ask for approval before using real tools.

The sandbox never executes, schedules, or retries connector actions.

