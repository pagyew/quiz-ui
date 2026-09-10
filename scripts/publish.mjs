import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
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
execFileSync(
  "npm",
  [
    "publish",
    `work/pagyew-quiz-ui-${version}.tgz`,
    "--registry=" + registry,
    "--access=public",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: "1" },
  },
);
