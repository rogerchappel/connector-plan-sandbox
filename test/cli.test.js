import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("help states that action plans cannot be empty", () => {
  const result = spawnSync(process.execPath, ["src/cli.js", "--help"], { encoding: "utf8" });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /actions array must contain at least one action/);
  assert.equal(result.stderr, "");
});

test("reports option errors without exposing an internal stack trace", () => {
  const result = spawnSync(process.execPath, [
    "src/cli.js",
    "fixtures/action-plan.json",
    "--policy"
  ], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "connector-plan-sandbox: --policy requires a value.\n");
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test("rejects an empty action plan without producing a receipt", () => {
  const directory = mkdtempSync(join(tmpdir(), "connector-plan-sandbox-"));
  const planPath = join(directory, "plan.json");
  const policyPath = join(directory, "policy.json");
  writeFileSync(planPath, JSON.stringify({ connector: "crm", actions: [] }));
  writeFileSync(policyPath, JSON.stringify({ connector: "crm", resources: {} }));

  const result = spawnSync(process.execPath, [
    "src/cli.js",
    planPath,
    "--policy",
    policyPath,
    "--format",
    "json"
  ], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "connector-plan-sandbox: Plan actions must contain at least one action.\n");
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test("reports connector mismatches as concise domain errors", () => {
  const directory = mkdtempSync(join(tmpdir(), "connector-plan-sandbox-"));
  const planPath = join(directory, "plan.json");
  const policyPath = join(directory, "policy.json");
  writeFileSync(planPath, JSON.stringify({ connector: "crm", actions: [] }));
  writeFileSync(policyPath, JSON.stringify({ connector: "mail", resources: {} }));

  const result = spawnSync(process.execPath, [
    "src/cli.js",
    planPath,
    "--policy",
    policyPath
  ], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(
    result.stderr,
    "connector-plan-sandbox: Plan connector crm does not match policy connector mail.\n"
  );
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});

test("reports malformed blocked rules as concise domain errors", () => {
  const directory = mkdtempSync(join(tmpdir(), "connector-plan-sandbox-"));
  const planPath = join(directory, "plan.json");
  const policyPath = join(directory, "policy.json");
  writeFileSync(planPath, JSON.stringify({ connector: "crm", actions: [] }));
  writeFileSync(policyPath, JSON.stringify({
    connector: "crm",
    resources: {},
    blocked: ["not-a-rule"]
  }));

  const result = spawnSync(process.execPath, [
    "src/cli.js",
    planPath,
    "--policy",
    policyPath,
    "--format",
    "json"
  ], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "connector-plan-sandbox: Policy blocked rule 0 must be an object.\n");
  assert.doesNotMatch(result.stderr, /\n\s+at /);
});
