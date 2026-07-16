#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import { evaluatePlan, loadJson, renderJson, renderMarkdown } from "./index.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.length === 0) {
  console.log(`Usage: connector-plan-sandbox <plan.json> --policy policy.json [--format markdown|json] [--out path]`);
  process.exit(args.length === 0 ? 1 : 0);
}

const planPath = args[0];
const options = parseOptions(args.slice(1));

try {
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
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token === "--policy") options.policy = readValue(tokens, ++index, token);
    else if (token === "--format") options.format = readValue(tokens, ++index, token);
    else if (token === "--out") options.out = readValue(tokens, ++index, token);
    else throw new Error(`Unknown option: ${token}`);
  }
  if (!options.policy) throw new Error("--policy is required.");
  if (!["markdown", "json"].includes(options.format)) throw new Error("--format must be markdown or json.");
  return options;
}

function readValue(tokens, index, flag) {
  if (!tokens[index]) throw new Error(`${flag} requires a value.`);
  return tokens[index];
}

