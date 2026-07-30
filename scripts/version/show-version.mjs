import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packagePath = path.join(root, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));

console.log(`Duka Ecommerce v${packageJson.version}`);
console.log(`Node ${process.version}`);
console.log(`Environment: ${process.env.NODE_ENV ?? "development"}`);
console.log(`Commit: ${process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? "local"}`);