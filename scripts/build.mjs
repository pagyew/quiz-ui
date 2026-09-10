import { cp, mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
await rm(new URL("../dist/", import.meta.url), {
  recursive: true,
  force: true,
});
execFileSync(
  process.execPath,
  [
    fileURLToPath(
      new URL("../node_modules/typescript/bin/tsc", import.meta.url),
    ),
  ],
  { cwd: root, stdio: "inherit" },
);
await mkdir(new URL("../dist/themes/", import.meta.url), { recursive: true });
await cp(
  new URL("../src/styles.css", import.meta.url),
  new URL("../dist/styles.css", import.meta.url),
);
await cp(
  new URL("../src/themes/", import.meta.url),
  new URL("../dist/themes/", import.meta.url),
  { recursive: true },
);
