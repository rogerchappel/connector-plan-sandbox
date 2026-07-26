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

test("accepts every supported non-blocking approval mode", () => {
  for (const approval of ["none", "ask", "explicit"]) {
    const receipt = evaluatePlan(
      { actions: [{ operation: "write", resource: "contact" }] },
      { resources: { contact: { operations: ["write"], approval } } }
    );

    assert.equal(receipt.actions[0].approval, approval);
    assert.equal(receipt.approval, approval);
    assert.equal(receipt.blocked, false);
  }
});

test("rejects malformed action fields instead of discarding them", () => {
  assert.throws(
    () => evaluatePlan({
      actions: [{ id: "read-contact", operation: "read", resource: "contact", fields: "email" }]
    }, {
      resources: { contact: { operations: ["read"], sensitiveFields: ["email"] } }
    }),
    /Action 0 fields must be an array/
  );
});

test("rejects mismatched plan and policy connectors", () => {
  assert.throws(
    () => evaluatePlan({
      connector: "crm",
      actions: [{ operation: "read", resource: "contact" }]
    }, {
      connector: "mail",
      resources: { contact: { operations: ["read"] } }
    }),
    /Plan connector crm does not match policy connector mail/
  );
});

test("rejects malformed policy resources", () => {
  for (const resources of [null, [], "contact"]) {
    assert.throws(
      () => evaluatePlan({ actions: [] }, { resources }),
      /Policy resources must be an object/
    );
  }
});

test("rejects string policy operations instead of using substring matches", () => {
  assert.throws(
    () => evaluatePlan({
      actions: [{ operation: "read", resource: "contact" }]
    }, {
      resources: { contact: { operations: "bread" } }
    }),
    /Policy operations for resource contact must be an array/
  );
});

test("rejects malformed sensitive field collections and entries", () => {
  const plan = { actions: [{ operation: "read", resource: "contact", fields: ["email"] }] };

  assert.throws(
    () => evaluatePlan(plan, {
      resources: { contact: { operations: ["read"], sensitiveFields: "name,email-address" } }
    }),
    /Policy sensitiveFields for resource contact must be an array/
  );
  assert.throws(
    () => evaluatePlan(plan, {
      resources: { contact: { operations: ["read"], sensitiveFields: ["email", 42] } }
    }),
    /Policy sensitiveFields for resource contact must contain only strings/
  );
});

test("rejects malformed blocked rules with a domain error", () => {
  assert.throws(
    () => evaluatePlan({
      actions: [{ operation: "read", resource: "contact" }]
    }, {
      resources: { contact: { operations: ["read"] } },
      blocked: {}
    }),
    /Policy blocked must be an array/
  );

  assert.throws(
    () => evaluatePlan({ actions: [] }, { resources: {}, blocked: ["not-a-rule"] }),
    /Policy blocked rule 0 must be an object/
  );

  for (const [blocked, message] of [
    [[{ operation: "", resource: "contact" }], /Policy blocked rule 0 operation must be a non-empty string/],
    [[{ operation: "read", resource: 42 }], /Policy blocked rule 0 resource must be a non-empty string/]
  ]) {
    assert.throws(
      () => evaluatePlan({ actions: [] }, { resources: {}, blocked }),
      message
    );
  }
});

test("blocks actions when a resource approval policy is blocked", () => {
  const receipt = evaluatePlan({
    actions: [{ id: "write-contact", operation: "write", resource: "contact" }]
  }, {
    resources: {
      contact: { operations: ["write"], approval: "blocked" }
    },
    defaultApproval: "ask"
  });

  assert.equal(receipt.approval, "blocked");
  assert.equal(receipt.blocked, true);
  assert.deepEqual(receipt.blockers, [{
    actionId: "write-contact",
    reason: "Approval policy blocks all actions for contact."
  }]);
  assert.match(receipt.summary, /1 blocker/);
});

test("blocks actions when the default approval policy is blocked", () => {
  const receipt = evaluatePlan({
    actions: [{ id: "read-contact", operation: "read", resource: "contact" }]
  }, {
    resources: {
      contact: { operations: ["read"] }
    },
    defaultApproval: "blocked"
  });

  assert.equal(receipt.approval, "blocked");
  assert.equal(receipt.blocked, true);
  assert.match(receipt.blockers[0].reason, /default approval policy/);
});

test("aggregates policy-blocked and permitted actions coherently", () => {
  const receipt = evaluatePlan({
    actions: [
      { id: "read-contact", operation: "read", resource: "contact" },
      { id: "write-note", operation: "write", resource: "note" }
    ]
  }, {
    resources: {
      contact: { operations: ["read"], approval: "none" },
      note: { operations: ["write"], approval: "blocked" }
    }
  });

  assert.equal(receipt.actions[0].approval, "none");
  assert.equal(receipt.actions[0].blockers.length, 0);
  assert.equal(receipt.actions[1].approval, "blocked");
  assert.equal(receipt.blocked, true);
  assert.equal(receipt.blockers.length, 1);
  assert.match(renderMarkdown(receipt), /Blocked: yes[\s\S]*Blocker: Approval policy blocks all actions for note/);
});

test("renders markdown receipt", async () => {
  const receipt = evaluatePlan(await loadJson("fixtures/action-plan.json"), await loadJson("fixtures/policy.json"));
  const markdown = renderMarkdown(receipt);

  assert.match(markdown, /Connector Dry-Run Receipt/);
  assert.match(markdown, /lookup-contact/);
  assert.match(markdown, /Sensitive fields: email/);
});
