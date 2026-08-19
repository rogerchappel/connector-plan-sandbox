import { access } from "node:fs/promises";

const required = [
  "README.md",
  "LICENSE",
  "SKILL.md",
  "docs/PRD.md",
  "docs/TASKS.md",
  "docs/ORCHESTRATION.md",
  "src/index.js",
  "src/cli.js",
  "fixtures/action-plan.json",
  "fixtures/policy.json",
  "scripts/build-check.js"
];

for (const path of required) {
  await access(path);
}

console.log(`build-check: ${required.length} required files present`);
