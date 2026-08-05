#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { evaluatePlan, loadJson, renderJson, renderMarkdown } from "./index.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.length === 0) {
  console.log(`Usage: connector-plan-sandbox <plan.json> --policy policy.json [--format markdown|json] [--out path]

The plan's actions array must contain at least one action.`);
  process.exit(args.length === 0 ? 1 : 0);
}

const planPath = args[0];

try {
  const options = parseOptions(args.slice(1));
  const plan = await loadJson(planPath);
  const policy = await loadJson(options.policy);
  const receipt = evaluatePlan(plan, policy);
  const output = options.format === "json" ? renderJson(receipt) : renderMarkdown(receipt);
  if (options.out) await writeFile(options.out, output);
  else process.stdout.write(output);
} catch (error) {
  console.error(`connector-plan-sandbox: ${error.message}`);
  process.exit(1);
}

function parseOptions(tokens) {
  const options = { format: "markdown", out: null, policy: null };
  const seen = new Set();
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!["--policy", "--format", "--out"].includes(token)) {
      throw new Error(`Unknown option: ${token}`);
    }
    if (seen.has(token)) throw new Error(`${token} may only be specified once.`);
    seen.add(token);

    const value = readValue(tokens, ++index, token);
    if (token === "--policy") options.policy = value;
    else if (token === "--format") options.format = value;
    else options.out = value;
  }
  if (!options.policy) throw new Error("--policy is required.");
  if (!["markdown", "json"].includes(options.format)) throw new Error("--format must be markdown or json.");
  return options;
}

function readValue(tokens, index, flag) {
  if (!tokens[index] || tokens[index].startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return tokens[index];
}
