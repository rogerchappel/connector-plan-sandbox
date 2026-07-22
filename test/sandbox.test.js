import test from "node:test";
import assert from "node:assert/strict";
import { evaluatePlan, loadJson, renderMarkdown } from "../src/index.js";

test("evaluates fixture plan against policy", async () => {
  const plan = await loadJson("fixtures/action-plan.json");
  const policy = await loadJson("fixtures/policy.json");
  const receipt = evaluatePlan(plan, policy);

  assert.equal(receipt.connector, "crm");
  assert.equal(receipt.actionCount, 2);
  assert.equal(receipt.approval, "explicit");
  assert.deepEqual(receipt.sensitiveFields, ["email"]);
  assert.equal(receipt.blocked, false);
});

test("blocks unknown resources and disallowed operations", async () => {
  const policy = await loadJson("fixtures/policy.json");
  const receipt = evaluatePlan({
    connector: "crm",
    actions: [
      { id: "bad-delete", operation: "delete", resource: "contact", fields: [] },
      { id: "unknown", operation: "read", resource: "deal", fields: [] }
    ]
  }, policy);

  assert.equal(receipt.approval, "blocked");
  assert.equal(receipt.blockers.length, 3);
  assert.match(receipt.summary, /blocker/);
});

test("rejects unsupported approval modes before issuing a receipt", () => {
  const plan = { actions: [{ operation: "write", resource: "contact" }] };

  assert.throws(
    () => evaluatePlan(plan, {
      defaultApproval: "typo",
      resources: { contact: { operations: ["write"], approval: "ask" } }
    }),
    /Policy defaultApproval must be one of: none, ask, explicit, blocked/
  );
  assert.throws(
    () => evaluatePlan(plan, {
      resources: {
        contact: { operations: ["write"], approval: "ask" },
        unused: { operations: ["read"], approval: "typo" }
      }
    }),
    /Policy approval for resource unused must be one of: none, ask, explicit, blocked/
  );
});

test("accepts every supported approval mode", () => {
  for (const approval of ["none", "ask", "explicit", "blocked"]) {
    const receipt = evaluatePlan(
      { actions: [{ operation: "write", resource: "contact" }] },
      { resources: { contact: { operations: ["write"], approval } } }
    );

    assert.equal(receipt.actions[0].approval, approval);
    assert.equal(receipt.approval, approval);
    assert.equal(receipt.blocked, false);
  }
});

test("renders markdown receipt", async () => {
  const receipt = evaluatePlan(await loadJson("fixtures/action-plan.json"), await loadJson("fixtures/policy.json"));
  const markdown = renderMarkdown(receipt);

  assert.match(markdown, /Connector Dry-Run Receipt/);
  assert.match(markdown, /lookup-contact/);
  assert.match(markdown, /Sensitive fields: email/);
});
