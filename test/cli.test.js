import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

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
