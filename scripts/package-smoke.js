import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const required = [
  "package/LICENSE",
  "package/README.md",
  "package/SKILL.md",
  "package/docs/PRD.md",
  "package/fixtures/action-plan.json",
  "package/fixtures/policy.json",
  "package/scripts/build-check.js",
  "package/scripts/package-smoke.js",
  "package/src/cli.js",
  "package/src/index.js"
];
const directory = mkdtempSync(join(tmpdir(), "connector-plan-sandbox-package-"));

try {
  const pack = JSON.parse(execFileSync("npm", ["pack", "--json", "--pack-destination", directory], {
    encoding: "utf8"
  }));
  const tarball = join(directory, pack[0].filename);
  const listing = execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" }).trim().split("\n");
  for (const path of required) {
    if (!listing.includes(path)) throw new Error(`packed artifact is missing ${path}`);
  }

  execFileSync("tar", ["-xzf", tarball, "-C", directory]);
  const packageDirectory = join(directory, "package");
  execFileSync("npm", ["run", "build"], { cwd: packageDirectory, stdio: "inherit" });
  const receipt = execFileSync(process.execPath, [
    "src/cli.js",
    "fixtures/action-plan.json",
    "--policy", "fixtures/policy.json",
    "--format", "json"
  ], { cwd: packageDirectory, encoding: "utf8" });
  const parsed = JSON.parse(receipt);
  if (parsed.actionCount !== 2) throw new Error("packed CLI smoke returned an unexpected receipt");
  const module = await import(join(packageDirectory, "src/index.js"));
  if (typeof module.evaluatePlan !== "function") throw new Error("packed library export is unavailable");
  if (!readFileSync(join(packageDirectory, "LICENSE"), "utf8").startsWith("MIT License")) {
    throw new Error("packed license is invalid");
  }
  console.log(`package-smoke: ${listing.length} files verified; build, CLI, and library passed`);
} finally {
  rmSync(directory, { recursive: true, force: true });
}
