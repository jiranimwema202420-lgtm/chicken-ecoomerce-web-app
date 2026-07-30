import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const allowed = new Set(["patch", "minor", "major"]);
const releaseType = process.argv[2];

if (!allowed.has(releaseType)) {
  console.error("Usage: node scripts/version/release.mjs <patch|minor|major>");
  process.exit(1);
}

const root = process.cwd();
const packagePath = path.join(root, "package.json");
const versionPath = path.join(root, "VERSION");
const changelogPath = path.join(root, "CHANGELOG.md");

function run(command, args) {
  return execFileSync(command, args, {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  }).trim();
}

try {
  const branch = run("git", ["branch", "--show-current"]);
  if (branch !== "main") {
    throw new Error(`Releases must be created from main. Current branch: ${branch}`);
  }

  const status = run("git", ["status", "--porcelain"]);
  if (status) {
    throw new Error("Working tree is not clean. Commit or stash changes first.");
  }

  run("git", ["fetch", "origin", "main"]);
  const local = run("git", ["rev-parse", "HEAD"]);
  const remote = run("git", ["rev-parse", "origin/main"]);

  if (local !== remote) {
    throw new Error("Local main is not synchronized with origin/main.");
  }

  execFileSync("npm", ["run", "validate"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  execFileSync("npm", ["version", releaseType, "--no-git-tag-version"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
  fs.writeFileSync(versionPath, `${packageJson.version}\n`, "utf8");

  const date = new Date().toISOString().slice(0, 10);
  const heading = `## [${packageJson.version}] - ${date}\n\n### Changed\n\n- Describe the release changes here.\n\n`;

  const existing = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, "utf8")
    : "# Changelog\n\nAll notable changes to Duka Ecommerce are documented here.\n\n";

  const marker = "# Changelog\n\n";
  const next = existing.startsWith(marker)
    ? marker + heading + existing.slice(marker.length)
    : marker + heading + existing;

  fs.writeFileSync(changelogPath, next, "utf8");

  console.log("");
  console.log(`Prepared release v${packageJson.version}.`);
  console.log("Review CHANGELOG.md, then run:");
  console.log(`  git add package.json package-lock.json VERSION CHANGELOG.md`);
  console.log(`  git commit -m "release: v${packageJson.version}"`);
  console.log(`  git tag -a v${packageJson.version} -m "Duka Ecommerce v${packageJson.version}"`);
  console.log("  git push origin main --follow-tags");
} catch (error) {
  console.error(`Release preparation failed: ${error.message}`);
  process.exit(1);
}