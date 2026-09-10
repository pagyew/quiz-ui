import { access, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
const { name, version, publishConfig } = JSON.parse(
  await readFile("package.json", "utf8"),
);
const registry = "https://registry.npmjs.org/";
if (
  name !== "@pagyew/quiz-ui" ||
  publishConfig.registry !== registry ||
  publishConfig.access !== "public"
)
  throw new Error("Unexpected publication destination");
const archive = resolve(`work/pagyew-quiz-ui-${version}.tgz`);
await access(archive);
const flags = process.argv.includes("--dry-run") ? ["--dry-run"] : [];
execFileSync(
  "npm",
  ["publish", archive, "--registry=" + registry, "--access=public", ...flags],
  {
    stdio: "inherit",
    env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "1" },
  },
);
