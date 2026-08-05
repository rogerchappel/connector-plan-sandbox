import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fixturePlan = "fixtures/action-plan.json";
const fixturePolicy = "fixtures/policy.json";

function runCli(...args) {
  return spawnSync(process.execPath, ["src/cli.js", ...args], { encoding: "utf8" });
}

function assertOptionError(result, message) {
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, `connector-plan-sandbox: ${message}\n`);
  assert.doesNotMatch(result.stderr, /\n\s+at /);
}

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

test("rejects duplicate value options", () => {
  for (const [flag, value] of [
    ["--policy", fixturePolicy],
    ["--format", "json"],
    ["--out", "receipt.md"]
  ]) {
    const result = runCli(
      fixturePlan,
      "--policy", fixturePolicy,
      flag, value,
      flag, value
    );

    assertOptionError(result, `${flag} may only be specified once.`);
  }
});

test("rejects option tokens used as values", () => {
  for (const flag of ["--policy", "--format", "--out"]) {
    const result = runCli(fixturePlan, flag, "--format", "json");
    assertOptionError(result, `${flag} requires a value.`);
  }
});

test("rejects unknown options without producing a receipt", () => {
  const result = runCli(fixturePlan, "--policy", fixturePolicy, "--verbose");
  assertOptionError(result, "Unknown option: --verbose");
});

test("accepts value options in any order", () => {
  const result = runCli(
    fixturePlan,
    "--format", "json",
    "--out", "/dev/null",
    "--policy", fixturePolicy
  );

  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "");
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

test("rejects malformed plan shapes without writing output", () => {
  const policy = { resources: { contact: { operations: ["read"] } } };
  for (const [plan, message] of [
    [null, "Plan must be an object."],
    [[], "Plan must be an object."],
    [{ actions: ["read contact"] }, "Action 0 must be an object."],
    [{ actions: [{ operation: 42, resource: "contact" }] }, "Action 0 operation must be a non-empty string."],
    [{ actions: [{ operation: "read", resource: "contact", fields: [null] }] }, "Action 0 fields must contain only strings."]
  ]) {
    const directory = mkdtempSync(join(tmpdir(), "connector-plan-sandbox-"));
    const planPath = join(directory, "plan.json");
    const policyPath = join(directory, "policy.json");
    const outputPath = join(directory, "receipt.json");
    writeFileSync(planPath, JSON.stringify(plan));
    writeFileSync(policyPath, JSON.stringify(policy));

    const result = spawnSync(process.execPath, [
      "src/cli.js",
      planPath,
      "--policy",
      policyPath,
      "--format",
      "json",
      "--out",
      outputPath
    ], { encoding: "utf8" });

    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.equal(result.stderr, `connector-plan-sandbox: ${message}\n`);
    assert.doesNotMatch(result.stderr, /\n\s+at /);
    assert.equal(existsSync(outputPath), false);
  }
});
