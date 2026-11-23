import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const mode = process.argv[2] ?? "build";
const tools = readdirSync(repositoryRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && !entry.name.startsWith(".") && !["scripts", "dist", "node_modules"].includes(entry.name))
  .filter((entry) => {
    const packagePath = join(repositoryRoot, entry.name, "package.json");
    if (!existsSync(packagePath)) return false;
    try {
      return Boolean(JSON.parse(readFileSync(packagePath, "utf8")).scripts?.build);
    } catch {
      return false;
    }
  })
  .map((entry) => entry.name)
  .sort();

if (tools.length === 0) {
  console.error("No tool projects found. Add a top-level folder with a package.json containing a build script.");
  process.exit(1);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
function run(args, cwd) {
  const result = spawnSync(npmCommand, args, { cwd, env: process.env, stdio: "inherit", shell: process.platform === "win32" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const toolName of tools) {
  const toolDirectory = join(repositoryRoot, toolName);
  console.log(`\n=== ${toolName}: install ===\n`);
  run(["install", "--no-audit", "--no-fund"], toolDirectory);
  const commands = mode === "verify" ? ["typecheck", "test", "build"] : [mode];
  for (const command of commands) {
    console.log(`\n=== ${toolName}: npm run ${command} ===\n`);
    run(["run", command], toolDirectory);
  }
}
console.log(`\nCompleted ${mode} for ${tools.length} tool project(s): ${tools.join(", ")}\n`);
